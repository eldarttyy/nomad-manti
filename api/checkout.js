// Payment backend for order.html — a Vercel Function that turns an order into a Stripe Checkout page.
//
//   POST /api/checkout   body: the order JSON built by js/order.js (contract in README.md)
//   → 200 { orderId, checkoutUrl }     the page then sends the guest to checkoutUrl
//
// Nothing the browser says about money is trusted: prices, tax and tip are recomputed here from
// the same menu and settings files the site uses, so editing js/menu-data.js changes both.
//
// Environment variables (set in Vercel, never in this repo):
//   STRIPE_SECRET_KEY   sk_test_… while testing, sk_live_… for real payments   (required)
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
const STRIPE_LOCALES = { en: 'en', ru: 'ru', es: 'es' }; // Stripe has no Kyrgyz; it falls back to the browser's language
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

// The kitchen reads this in the Stripe dashboard, the payment email and the Stripe phone app.
function stripeParams(o, orderId, returnTo) {
  const p = new URLSearchParams();
  const lineItems = [
    ...o.lines.map((l) => ({ name: l.name, amount: l.unit, qty: l.qty })),
    { name: `Sales tax (${+(ORDER.taxRate * 100).toFixed(3)}%)`, amount: o.tax, qty: 1 },
    ...(o.tip ? [{ name: 'Tip', amount: o.tip, qty: 1 }] : []),
  ].filter((l) => l.amount > 0);
  lineItems.forEach((l, i) => {
    p.set(`line_items[${i}][quantity]`, l.qty);
    p.set(`line_items[${i}][price_data][currency]`, 'usd');
    p.set(`line_items[${i}][price_data][unit_amount]`, l.amount);
    p.set(`line_items[${i}][price_data][product_data][name]`, l.name);
  });
  const meta = {
    order_id: orderId,
    pickup: o.pickup,
    customer_name: o.name,
    customer_phone: o.phone,
    items: o.lines.map((l) => `${l.qty} x ${l.name}`).join('; ').slice(0, 500),
    ...(o.notes ? { notes: o.notes } : {}),
  };
  p.set('mode', 'payment');
  p.set('client_reference_id', orderId);
  p.set('success_url', `${returnTo}?status=success&order=${orderId}`);
  p.set('cancel_url', `${returnTo}?status=cancelled`);
  p.set('expires_at', Math.floor(Date.now() / 1000) + 31 * 60); // Stripe's minimum is 30 minutes
  p.set('payment_intent_data[description]', `Pickup order ${orderId} — ${o.pickup} — ${o.name}, ${o.phone}`);
  for (const [k, v] of Object.entries(meta)) {
    p.set(`metadata[${k}]`, v);
    p.set(`payment_intent_data[metadata][${k}]`, v);
  }
  if (o.email) p.set('customer_email', o.email);
  if (STRIPE_LOCALES[o.lang]) p.set('locale', STRIPE_LOCALES[o.lang]);
  return p;
}

function cors(request) {
  const origin = request.headers.get('origin');
  return {
    ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
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
  if (!ORIGINS.has(origin)) return json(request, 403, { error: 'origin_not_allowed' });
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
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

  // The apps can't be returned to from Stripe's page, so their guests land on the website instead.
  const returnTo = `${origin.startsWith('http') && !origin.endsWith('//localhost') ? origin : SITE_URL}/order.html`;
  const orderId = `NM-${randomBytes(4).toString('hex').toUpperCase()}`;

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: stripeParams(priced, orderId, returnTo),
  });
  const session = await res.json().catch(() => ({}));
  if (!res.ok || !session.url) {
    console.error('Stripe refused the session', res.status, session.error?.message);
    return json(request, 502, { error: 'payment_unavailable' });
  }
  return json(request, 200, { orderId, checkoutUrl: session.url });
}
