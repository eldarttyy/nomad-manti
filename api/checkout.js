// Payment backend for order.html — a Vercel Function that turns an order into a Clover Hosted Checkout page.
//
//   POST /api/checkout   body: the order JSON built by js/order.js (contract in README.md)
//   → 200 { orderId, checkoutUrl }     the page then sends the guest to checkoutUrl
//
// Nothing the browser says about money is trusted: prices, tax and tip are recomputed here from
// the same menu and settings files the site uses, so editing js/menu-data.js changes both.
//
// Environment variables (set in Vercel, never in this repo):
//   CLOVER_MERCHANT_ID  the 13-character merchant ID                                  (required)
//   CLOVER_PRIVATE_KEY  the Ecommerce API private token from the Clover dashboard     (required)
//   CLOVER_ENV          'sandbox' (default) or 'production'
//   CLOVER_API_BASE     production API host outside North America, e.g. https://api.eu.clover.com
//   SITE_URL            where guests return after paying; default https://www.nomadmanti.com
//   ALLOWED_ORIGINS     extra comma-separated origins allowed to call this, e.g. a test server

import { randomBytes } from 'node:crypto';
import { MENU, OPTION_GROUPS } from '../js/menu-data.js';
import { ORDER } from '../js/site-config.js';

const SITE_URL = (process.env.SITE_URL || 'https://www.nomadmanti.com').replace(/\/$/, '');
const ORIGINS = new Set([
  SITE_URL,
  'https://nomadmanti.com',
  'capacitor://localhost', // the iPhone app
  'https://localhost',     // the Android app
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
]);
const ITEMS = new Map(MENU.flatMap((cat) => cat.items).map((item) => [item.id, item]));
const CLOVER_API = process.env.CLOVER_ENV === 'production'
  ? (process.env.CLOVER_API_BASE || 'https://api.clover.com') // North America; EU is https://api.eu.clover.com
  : 'https://apisandbox.dev.clover.com';
const GRACE_MINUTES = 10; // a guest may sit on the form for a while before pressing pay

const cents = (price) => Math.round(price * 100);
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmtTime = (min) => {
  const h = Math.floor(min / 60);
  return `${h % 12 || 12}:${String(min % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function restaurantNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: ORDER.timezone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

class Refused extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

// Rebuilds the order from our own price list. Throws Refused for anything that doesn't add up.
function price(order) {
  if (!Array.isArray(order?.items) || !order.items.length) throw new Refused('empty', 'The order has no items.');
  if (order.items.length > 60) throw new Refused('too_large', 'Too many lines in one order.');
  const now = restaurantNow();
  const weekend = ORDER.weekendDays.includes(now.dow);

  const lines = order.items.map((line) => {
    const item = ITEMS.get(line?.id);
    const qty = Number(line?.qty);
    if (!item) throw new Refused('unknown_item', `Unknown item "${text(line?.id, 40)}".`);
    if (!Number.isInteger(qty) || qty < 1 || qty > ORDER.maxQty) throw new Refused('bad_qty', `Bad quantity for ${item.name}.`);
    if (item.tags?.includes('weekend') && !weekend) throw new Refused('not_today', `${item.name} isn't cooked today.`, 409);
    const opts = (item.options ?? []).map((group) => {
      const choice = line.options?.[group];
      if (!OPTION_GROUPS[group].choices.includes(choice)) throw new Refused('bad_option', `Pick a ${group} for ${item.name}.`);
      return choice;
    });
    return { name: opts.length ? `${item.name} (${opts.join(', ')})` : item.name, qty, unit: cents(item.price) };
  });

  const time = /^\d\d:\d\d$/.test(order.pickup?.time ?? '') ? toMin(order.pickup.time) : NaN;
  const earliest = Math.max(now.minutes, toMin(ORDER.open)) + ORDER.prepMinutes - GRACE_MINUTES;
  if (order.pickup?.date !== now.date || !(time >= earliest && time <= toMin(ORDER.lastPickup))) {
    throw new Refused('bad_pickup', 'That pickup time is no longer available.', 409);
  }

  const name = text(order.customer?.name, 80);
  const phone = text(order.customer?.phone, 30);
  if (!name || phone.replace(/\D/g, '').length < 7) throw new Refused('bad_customer', 'A name and phone number are required.');
  const email = text(order.customer?.email, 120);

  const tipPct = Number(order.amounts?.tipPercent ?? 0);
  if (tipPct !== 0 && !ORDER.tips.includes(tipPct)) throw new Refused('bad_tip', 'Unknown tip choice.');
  const subtotal = lines.reduce((sum, l) => sum + l.unit * l.qty, 0);
  const tax = Math.round(subtotal * ORDER.taxRate);
  const tip = Math.round(subtotal * tipPct / 100);

  return {
    lines, subtotal, tax, tip, total: subtotal + tax + tip,
    pickup: `${order.pickup.type === 'asap' ? 'ASAP, about ' : ''}${fmtTime(time)}`,
    name, phone, notes: text(order.notes, 450),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
    lang: order.lang,
  };
}

// The kitchen sees this as a normal order in Clover (Orders app and devices), with the pickup time,
// order number and notes on the first line and the guest's name and phone on the customer.
function cloverBody(o, orderId, returnTo) {
  const taxRates = o.tax ? [{ name: 'Sales tax', rate: Math.round(ORDER.taxRate * 1e7) }] : []; // Clover: 100% = 10,000,000
  const header = [`Order ${orderId}`, `Pickup ${o.pickup}`, `${o.name}, ${o.phone}`, o.notes].filter(Boolean).join(' · ');
  const lineItems = o.lines.map((l, i) => ({
    name: l.name.slice(0, 127),
    price: l.unit,
    unitQty: l.qty,
    ...(i === 0 ? { note: header.slice(0, 255) } : {}),
    ...(taxRates.length ? { taxRates } : {}),
  }));
  if (o.tip) lineItems.push({ name: 'Tip', price: o.tip, unitQty: 1 }); // untaxed
  const [firstName, ...rest] = o.name.split(' ');
  return {
    customer: {
      firstName: firstName.slice(0, 40),
      ...(rest.length ? { lastName: rest.join(' ').slice(0, 40) } : {}),
      phoneNumber: o.phone,
      ...(o.email ? { email: o.email } : {}),
    },
    shoppingCart: { lineItems },
    redirectUrls: {
      success: `${returnTo}?status=success&order=${orderId}`,
      failure: `${returnTo}?status=cancelled`,
      cancel: `${returnTo}?status=cancelled`,
    },
  };
}

// Our own domains and apps, plus the page's own host (so Vercel preview deployments work too).
function allowed(request) {
  const origin = request.headers.get('origin');
  return ORIGINS.has(origin) || origin === new URL(request.url).origin;
}

function cors(request) {
  const origin = request.headers.get('origin');
  return {
    ...(allowed(request) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (request, status, body) => Response.json(body, { status, headers: cors(request) });

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function POST(request) {
  const origin = request.headers.get('origin');
  if (!allowed(request)) return json(request, 403, { error: 'origin_not_allowed' });
  if (!process.env.CLOVER_PRIVATE_KEY || !process.env.CLOVER_MERCHANT_ID) {
    console.error('CLOVER_PRIVATE_KEY or CLOVER_MERCHANT_ID is not set');
    return json(request, 500, { error: 'not_configured' });
  }

  let priced;
  try {
    const raw = await request.text();
    if (raw.length > 20000) throw new Refused('too_large', 'Order too large.');
    priced = price(JSON.parse(raw));
  } catch (err) {
    if (err instanceof Refused) return json(request, err.status, { error: err.code, message: err.message });
    return json(request, 400, { error: 'bad_request' });
  }

  // The apps can't be returned to from Clover's page, so their guests land on the website instead.
  const returnTo = `${origin.startsWith('http') && !origin.endsWith('//localhost') ? origin : SITE_URL}/order.html`;
  const orderId = `NM-${randomBytes(4).toString('hex').toUpperCase()}`;

  const key = process.env.CLOVER_PRIVATE_KEY.trim();
  const merchant = process.env.CLOVER_MERCHANT_ID.trim();
  // A key pasted with extra text (spaces, line breaks, icon labels) would otherwise crash fetch
  // with an error message that contains the key itself — never let it reach the logs.
  if (!/^[\w-]+$/.test(key) || !/^[A-Z0-9]+$/i.test(merchant)) {
    console.error('CLOVER_PRIVATE_KEY or CLOVER_MERCHANT_ID has unexpected characters; re-paste only the value');
    return json(request, 500, { error: 'not_configured' });
  }

  let res;
  try {
    res = await fetch(`${CLOVER_API}/invoicingcheckoutservice/v1/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'X-Clover-Merchant-Id': merchant,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(cloverBody(priced, orderId, returnTo)),
    });
  } catch (err) {
    console.error('Could not reach Clover:', err.name, err.cause?.code ?? '');
    return json(request, 502, { error: 'payment_unavailable' });
  }
  const session = await res.json().catch(() => ({}));
  if (!res.ok || !session.href) {
    console.error('Clover refused the checkout', res.status, JSON.stringify(session).slice(0, 500));
    return json(request, 502, { error: 'payment_unavailable' });
  }
  console.log('Clover checkout opened', orderId, session.checkoutSessionId);
  return json(request, 200, { orderId, checkoutUrl: session.href });
}
