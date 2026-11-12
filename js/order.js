// Order page: menu → cart → pickup details → hand-off.
// The hand-off depends on js/site-config.js:
//   ORDER.endpoint set  → POST the order as JSON, then follow the `checkoutUrl` the backend returns
//   else ORDER.sms set  → open a pre-written text to the restaurant (pay at pickup)
//   else                → "call to order"
// The backend contract is described in README.md ("Online ordering").
import { MENU, TAG_LABELS, OPTION_GROUPS } from './menu-data.js';
import { LINKS, ORDER } from './site-config.js';
import { initI18n, onLangChange, t, tr, lang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const MODE = ORDER.endpoint ? 'pay' : ORDER.sms ? 'sms' : 'call';
const ITEMS = new Map(MENU.flatMap((cat) => cat.items).map((item) => [item.id, item]));
const CART_KEY = 'nm-cart';
const PROFILE_KEY = 'nm-profile';
const LAST_KEY = 'nm-last-order';

const store = {
  get(area, key) { try { return JSON.parse(area.getItem(key)); } catch { return null; } },
  set(area, key, value) { try { area.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } },
  del(area, key) { try { area.removeItem(key); } catch { /* storage blocked */ } },
};
const local = () => { try { return window.localStorage; } catch { return null; } };
const session = () => { try { return window.sessionStorage; } catch { return null; } };

/* ---------------------------------------------------------
   Money (always whole cents) and time (always the restaurant's clock)
   --------------------------------------------------------- */
const cents = (price) => Math.round(price * 100);
const money = (c) => `$${(c / 100).toFixed(2)}`;

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
function fmtTime(min) {
  if (lang === 'ru' || lang === 'ky') return toHHMM(min);
  const h = Math.floor(min / 60);
  return `${h % 12 || 12}:${String(min % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

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

// What can be ordered right now: pickup is same-day only.
function schedule() {
  const now = restaurantNow();
  const open = toMin(ORDER.open);
  const last = toMin(ORDER.lastPickup);
  const earliest = Math.max(now.minutes, open) + ORDER.prepMinutes;
  const slots = [];
  for (let m = Math.ceil(earliest / ORDER.slotMinutes) * ORDER.slotMinutes; m <= last; m += ORDER.slotMinutes) slots.push(m);
  const asap = now.minutes >= open && earliest <= last ? earliest : null;
  const state = asap === null && !slots.length ? 'closed' : now.minutes < open ? 'early' : 'open';
  return { now, slots, asap, state, weekend: ORDER.weekendDays.includes(now.dow) };
}
let sched = schedule();

const available = (item) => sched.state !== 'closed' && (!item.tags?.includes('weekend') || sched.weekend);

/* ---------------------------------------------------------
   Cart
   --------------------------------------------------------- */
const lineKey = (line) => [line.id, ...(ITEMS.get(line.id).options ?? []).map((g) => line.opts[g])].join('|');

function cleanCart(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const line of raw) {
    const item = ITEMS.get(line?.id);
    const qty = Math.floor(Number(line?.qty));
    if (!item || !(qty >= 1)) continue;
    const opts = {};
    for (const g of item.options ?? []) {
      const choice = line.opts?.[g];
      opts[g] = OPTION_GROUPS[g].choices.includes(choice) ? choice : OPTION_GROUPS[g].choices[0];
    }
    out.push({ id: item.id, opts, qty: Math.min(qty, ORDER.maxQty) });
  }
  return out;
}

let cart = cleanCart(store.get(local(), CART_KEY));
let profile = null; // set in the Profile section below, once its helpers exist
let tipPct = ORDER.tips?.[0] ?? 0;

function saveCart() { store.set(local(), CART_KEY, cart); }

function addToCart(id, opts, qty) {
  const line = { id, opts, qty };
  const existing = cart.find((l) => lineKey(l) === lineKey(line));
  if (existing) existing.qty = Math.min(existing.qty + qty, ORDER.maxQty);
  else cart.push(line);
  saveCart();
  renderCart();
}

function totals() {
  const subtotal = cart.reduce((sum, l) => sum + cents(ITEMS.get(l.id).price) * l.qty, 0);
  const tax = Math.round(subtotal * ORDER.taxRate);
  const tip = MODE === 'pay' ? Math.round(subtotal * tipPct / 100) : 0;
  return { subtotal, tax, tip, total: subtotal + tax + tip };
}
const count = () => cart.reduce((n, l) => n + l.qty, 0);
const optsText = (line, translate = tr) => (ITEMS.get(line.id).options ?? []).map((g) => translate(line.opts[g])).join(' · ');

/* ---------------------------------------------------------
   Menu
   --------------------------------------------------------- */
const menuEl = $('orderMenu');
const catsEl = $('cats');
const portion = (p) => p.split(' ').map((w) => t('units')[w] ?? w).join(' ');

function itemCard(item) {
  const name = tr(item.name);
  const fav = Boolean(profile?.favorites.includes(item.id));
  return `
        <article class="o-item${item.photo ? ' has-photo' : ''}">
          ${item.photo ? `<img class="o-item__img" src="assets/photos/${item.photo}" alt="" loading="lazy" width="104" height="104">` : ''}
          <div>
            <div class="o-item__top">
              <h3 class="o-item__name">${name}</h3>
              <span class="o-item__price">${money(cents(item.price))}</span>
            </div>
            ${item.native && item.native !== name ? `<span class="o-item__native">${item.native}</span>` : ''}
            <p class="o-item__desc">${tr(item.desc)}${item.portion ? ` <small>· ${portion(item.portion)}</small>` : ''}</p>
            <div class="o-item__foot">
              <div class="o-item__tags">${(item.tags ?? []).map((tag) => `<span class="tag tag--${tag}">${tr(TAG_LABELS[tag])}</span>`).join('')}</div>
              <div class="o-item__actions">
                <button class="o-fav" type="button" data-fav="${item.id}" aria-pressed="${fav}" aria-label="${t(fav ? 'p.fav.remove' : 'p.fav.add')}: ${name}" title="${t(fav ? 'p.fav.remove' : 'p.fav.add')}">${fav ? '♥' : '♡'}</button>
                <button class="o-add" type="button" data-add="${item.id}"></button>
              </div>
            </div>
          </div>
        </article>`;
}

function renderMenu() {
  const favs = (profile?.favorites ?? []).map((id) => ITEMS.get(id)).filter(Boolean);
  const cats = [...(favs.length ? [{ id: 'favs', label: t('p.favs'), items: favs }] : []), ...MENU];
  catsEl.innerHTML = cats.map((cat) => `<a href="#cat-${cat.id}" data-cat="${cat.id}">${tr(cat.label)}</a>`).join('');
  menuEl.innerHTML = cats.map((cat) => `
    <section class="o-cat" id="cat-${cat.id}" aria-labelledby="h-${cat.id}">
      <h2 class="o-cat__title" id="h-${cat.id}">${tr(cat.label)}</h2>
      ${cat.items.map(itemCard).join('')}
    </section>`).join('');
  syncButtons();
  watchCategories();
}

function syncButtons() {
  menuEl.querySelectorAll('[data-add]').forEach((btn) => {
    const item = ITEMS.get(btn.dataset.add);
    const inCart = cart.filter((l) => l.id === item.id).reduce((n, l) => n + l.qty, 0);
    btn.disabled = !available(item);
    btn.innerHTML = btn.disabled
      ? (sched.state === 'closed' ? t('o.unavailable') : tr(TAG_LABELS.weekend))
      : `${t('o.add')}${inCart ? `<span class="o-add__n" aria-label="${t('o.inOrder', inCart)}">${inCart}</span>` : ''}`;
    btn.setAttribute('aria-label', `${t('o.add')}: ${tr(item.name)}`);
  });
}

menuEl.addEventListener('click', (e) => {
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    if (!profile) { openProfile('fav'); return; }
    const id = fav.dataset.fav;
    profile.favorites = profile.favorites.includes(id) ? profile.favorites.filter((f) => f !== id) : [...profile.favorites, id];
    saveProfile();
    renderMenu();
    menuEl.querySelector(`[data-fav="${id}"]`)?.focus({ preventScroll: true });
    return;
  }
  const btn = e.target.closest('[data-add]');
  if (!btn || btn.disabled) return;
  const item = ITEMS.get(btn.dataset.add);
  if (item.options?.length && typeof dialog.showModal === 'function') openItem(item);
  else addToCart(item.id, Object.fromEntries((item.options ?? []).map((g) => [g, preferred(g)])), 1);
});

// Highlight the category being read
let catObserver = null;
function watchCategories() {
  catObserver?.disconnect();
  if (!('IntersectionObserver' in window)) return;
  catObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      catsEl.querySelectorAll('a').forEach((a) => a.classList.toggle('is-current', `cat-${a.dataset.cat}` === en.target.id));
    });
  }, { rootMargin: '-80px 0px -70% 0px' });
  menuEl.querySelectorAll('.o-cat').forEach((s) => catObserver.observe(s));
}

/* ---------------------------------------------------------
   Item dialog (options + quantity)
   --------------------------------------------------------- */
const dialog = $('itemDialog');
let dlgItem = null;
let dlgQty = 1;

function openItem(item) {
  dlgItem = item;
  dlgQty = 1;
  $('dlgTitle').textContent = tr(item.name);
  $('dlgDesc').textContent = tr(item.desc);
  $('dlgOptions').innerHTML = item.options.map((g) => `
    <fieldset class="o-opt">
      <legend>${tr(OPTION_GROUPS[g].label)}</legend>
      ${OPTION_GROUPS[g].choices.map((choice, i) => `
        <label><input type="radio" name="opt-${g}" value="${choice}"${choice === preferred(g) ? ' checked' : ''}>${tr(choice)}</label>`).join('')}
    </fieldset>`).join('');
  syncDialog();
  dialog.showModal();
}
// The first choice, unless the profile names a usual drink
function preferred(group) {
  const choices = OPTION_GROUPS[group].choices;
  return group === 'drink' && choices.includes(profile?.drink) ? profile.drink : choices[0];
}
function syncDialog() {
  $('dlgQty').textContent = dlgQty;
  $('dlgLess').disabled = dlgQty <= 1;
  $('dlgMore').disabled = dlgQty >= ORDER.maxQty;
  $('dlgAdd').textContent = t('o.addTotal', money(cents(dlgItem.price) * dlgQty));
}
$('dlgLess').addEventListener('click', () => { dlgQty = Math.max(1, dlgQty - 1); syncDialog(); });
$('dlgMore').addEventListener('click', () => { dlgQty = Math.min(ORDER.maxQty, dlgQty + 1); syncDialog(); });
$('dlgClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // backdrop
$('dlgForm').addEventListener('submit', () => {
  const data = new FormData($('dlgForm'));
  addToCart(dlgItem.id, Object.fromEntries(dlgItem.options.map((g) => [g, data.get(`opt-${g}`)])), dlgQty);
});

/* ---------------------------------------------------------
   Cart panel
   --------------------------------------------------------- */
const linesEl = $('lines');
const form = $('orderForm');
const submitBtn = $('submit');
const bar = $('bar');
let cartInView = false;

function renderCart() {
  // Weekend-only dishes left over from another day can't be cooked today
  const kept = cart.filter((l) => available(ITEMS.get(l.id)) || sched.state === 'closed');
  if (kept.length !== cart.length) { cart = kept; saveCart(); }
  linesEl.innerHTML = cart.map((line, i) => {
    const item = ITEMS.get(line.id);
    const opts = optsText(line);
    return `
    <li class="o-line">
      <div><span class="o-line__name">${tr(item.name)}</span>${opts ? `<span class="o-line__opts">${opts}</span>` : ''}</div>
      <span class="o-line__price">${money(cents(item.price) * line.qty)}</span>
      <div class="o-line__row">
        <div class="o-step" role="group" aria-label="${t('o.qty')}">
          <button type="button" data-step="-1" data-i="${i}" aria-label="${t('o.less')}">−</button>
          <span>${line.qty}</span>
          <button type="button" data-step="1" data-i="${i}" aria-label="${t('o.more')}"${line.qty >= ORDER.maxQty ? ' disabled' : ''}>+</button>
        </div>
        <button class="o-line__remove" type="button" data-remove="${i}">${t('o.remove')}</button>
      </div>
    </li>`;
  }).join('');

  const has = cart.length > 0;
  const sums = totals();
  $('cartEmpty').hidden = has;
  $('checkout').hidden = !has;
  $('tSubtotal').textContent = money(sums.subtotal);
  $('tTax').textContent = money(sums.tax);
  $('tTip').textContent = money(sums.tip);
  $('tTipRow').hidden = !(MODE === 'pay' && sums.tip > 0);
  $('tTotal').textContent = money(sums.total);

  $('barCount').textContent = count();
  $('barTotal').textContent = money(sums.total);
  syncBar();
  syncButtons();
  syncSubmit();
}

linesEl.addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  const remove = e.target.closest('[data-remove]');
  if (step) {
    const line = cart[Number(step.dataset.i)];
    line.qty += Number(step.dataset.step);
    if (line.qty < 1) cart.splice(Number(step.dataset.i), 1);
  } else if (remove) {
    cart.splice(Number(remove.dataset.remove), 1);
  } else return;
  saveCart();
  renderCart();
});

function syncBar() {
  const show = cart.length > 0 && !cartInView && !$('shop').hidden;
  bar.hidden = !show;
  document.body.classList.toggle('has-bar', show);
}
bar.addEventListener('click', () => $('cart').scrollIntoView({ behavior: 'smooth', block: 'start' }));
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => { cartInView = en.isIntersecting; syncBar(); }, { threshold: 0.05 }).observe($('cart'));
}

/* ---------------------------------------------------------
   Tip (only once payments are on)
   --------------------------------------------------------- */
function renderTips() {
  const show = MODE === 'pay' && ORDER.tips?.length > 0;
  $('tips').hidden = !show;
  if (!show) return;
  $('tipChoices').innerHTML = ORDER.tips.map((pct) => `
    <label><input type="radio" name="tip" value="${pct}"${pct === tipPct ? ' checked' : ''}><span>${pct ? `${pct}%` : t('o.tip.none')}</span></label>`).join('');
}
$('tipChoices').addEventListener('change', (e) => { tipPct = Number(e.target.value); renderCart(); });

/* ---------------------------------------------------------
   Pickup time + opening status
   --------------------------------------------------------- */
const timeEl = $('fTime');
const statusEl = $('status');

function renderSchedule() {
  const previous = timeEl.value;
  const options = [];
  if (sched.asap !== null) options.push(`<option value="asap">${t('o.asap', ORDER.prepMinutes)}</option>`);
  sched.slots.forEach((m) => options.push(`<option value="${m}">${fmtTime(m)}</option>`));
  timeEl.innerHTML = options.join('');
  if ([...timeEl.options].some((o) => o.value === previous)) timeEl.value = previous;

  const firstTime = fmtTime(sched.asap ?? sched.slots[0] ?? 0);
  statusEl.className = `o-status is-${sched.state}`;
  statusEl.textContent = sched.state === 'closed'
    ? t('o.status.closed', fmtTime(toMin(ORDER.open)))
    : sched.state === 'early'
      ? t('o.status.early', fmtTime(toMin(ORDER.open)), firstTime)
      : t('o.status.open', firstTime);
}

function syncSubmit() {
  const callOnly = MODE === 'call';
  form.hidden = callOnly;
  $('callInstead').hidden = !callOnly;
  $('fEmailField').hidden = MODE !== 'pay';
  submitBtn.disabled = sched.state === 'closed' || !cart.length;
  submitBtn.textContent = MODE === 'pay' ? t('o.submit.pay') : t('o.submit.sms');
  $('fine').textContent = sched.state === 'closed'
    ? t('o.status.closed', fmtTime(toMin(ORDER.open)))
    : MODE === 'pay' ? t('o.fine.pay') : t('o.fine.sms');
}

// Keep the clock honest while the page stays open
setInterval(() => {
  const before = `${sched.state}|${sched.asap}|${sched.slots[0]}|${sched.weekend}`;
  sched = schedule();
  if (before === `${sched.state}|${sched.asap}|${sched.slots[0]}|${sched.weekend}`) return;
  renderSchedule();
  renderCart();
}, 30000);

/* ---------------------------------------------------------
   Checkout
   --------------------------------------------------------- */
const fields = { name: $('fName'), phone: $('fPhone'), email: $('fEmail'), notes: $('fNotes') };

store.del(local(), 'nm-order-contact'); // older versions remembered every guest's details; now only profiles do

function fillFromProfile() {
  if (!profile) return;
  fields.name.value = profile.name;
  fields.phone.value = profile.phone;
  fields.email.value = profile.email;
  if (!fields.notes.value.trim()) fields.notes.value = profile.note;
}

function buildOrder() {
  const sums = totals();
  const asap = timeEl.value === 'asap';
  const time = asap ? sched.asap : Number(timeEl.value);
  const page = `${location.origin}${location.pathname}`;
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    lang,
    items: cart.map((line) => {
      const item = ITEMS.get(line.id);
      return { id: item.id, name: item.name, qty: line.qty, unitPrice: cents(item.price), options: line.opts };
    }),
    // Cents. For display only — the backend must recompute these from its own price list.
    amounts: { currency: 'usd', taxRate: ORDER.taxRate, tipPercent: MODE === 'pay' ? tipPct : 0, ...sums },
    pickup: { type: asap ? 'asap' : 'scheduled', date: sched.now.date, time: toHHMM(time), timezone: ORDER.timezone },
    customer: { name: fields.name.value.trim(), phone: fields.phone.value.trim(), email: fields.email.value.trim() },
    notes: fields.notes.value.trim(),
    returnUrls: { success: `${page}?status=success`, cancel: `${page}?status=cancelled` },
  };
}

// Kitchen-facing, so always in English whatever language the guest is browsing in.
function orderText(order) {
  const same = (s) => s;
  const pickup = `${order.pickup.type === 'asap' ? 'ASAP, about ' : ''}${fmtTimeEn(toMin(order.pickup.time))}`;
  return [
    'NOMAD MANTI — online order (pickup)',
    `Pickup: ${pickup}`,
    `Name: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    '',
    ...cart.map((line) => {
      const item = ITEMS.get(line.id);
      const opts = optsText(line, same);
      return `${line.qty} x ${item.name}${opts ? ` (${opts})` : ''} — ${money(cents(item.price) * line.qty)}`;
    }),
    '',
    `Subtotal ${money(order.amounts.subtotal)} + tax ${money(order.amounts.tax)} = ${money(order.amounts.total)}`,
    ...(order.notes ? [`Notes: ${order.notes}`] : []),
    'Pay at pickup.',
  ].join('\n');
}
function fmtTimeEn(min) {
  const h = Math.floor(min / 60);
  return `${h % 12 || 12}:${String(min % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
// "?&body=" is the form both iOS and Android accept
const smsHref = (text) => `sms:${ORDER.sms}?&body=${encodeURIComponent(text)}`;

function showError(message) {
  $('formError').textContent = message;
  $('formError').hidden = !message;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  sched = schedule();
  renderSchedule();
  renderCart();
  if (submitBtn.disabled) return;
  form.classList.add('was-validated');
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const order = buildOrder();
  const lines = cart.map((l) => ({ id: l.id, opts: l.opts, qty: l.qty }));

  if (MODE === 'sms') {
    const text = orderText(order);
    recordOrder({ at: order.createdAt, items: lines, total: order.amounts.total });
    showDone('sms', { text });
    location.href = smsHref(text);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t('o.submit.sending');
  try {
    const res = await fetch(ORDER.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error(`Order endpoint answered ${res.status}`);
    const data = await res.json();
    store.set(session(), LAST_KEY, { pickup: order.pickup, orderId: data.orderId ?? null, at: order.createdAt, items: lines, total: order.amounts.total });
    if (data.checkoutUrl) {
      if (new URL(data.checkoutUrl).protocol !== 'https:') throw new Error('checkoutUrl must be https');
      location.assign(data.checkoutUrl);
      return;
    }
    finishPaid(data.orderId);
  } catch (err) {
    console.error(err);
    showError(t('o.error'));
    syncSubmit();
  }
});

/* ---------------------------------------------------------
   Confirmation
   --------------------------------------------------------- */
let doneState = null;

function finishPaid(orderId) {
  const last = store.get(session(), LAST_KEY) ?? {};
  store.del(session(), LAST_KEY);
  if (last.items) recordOrder({ at: last.at, items: last.items, total: last.total });
  cart = [];
  saveCart();
  renderCart();
  showDone('paid', { pickup: last.pickup, orderId: orderId ?? last.orderId });
}

function showDone(kind, info = {}) {
  doneState = { kind, info };
  $('shop').hidden = true;
  $('done').hidden = false;
  renderDone();
  syncBar();
  window.scrollTo(0, 0);
  $('done').focus({ preventScroll: true });
}
function backToShop() {
  doneState = null;
  $('done').hidden = true;
  $('shop').hidden = false;
  syncBar();
}

function renderDone() {
  if (!doneState) return;
  const { kind, info } = doneState;
  const summary = $('doneSummary');
  const actions = $('doneActions');
  if (kind === 'sms') {
    $('doneTitle').innerHTML = t('o.done.sms.title');
    $('doneText').textContent = t('o.done.sms.text');
    summary.textContent = info.text;
    summary.hidden = false;
    actions.innerHTML = `
      <a class="btn btn--solid" href="${smsHref(info.text)}">${t('o.done.sms.again')}</a>
      <button class="btn btn--ghost" type="button" data-do="copy">${t('o.done.copy')}</button>
      <a class="btn btn--ghost" href="${LINKS.phone}">${t('o.done.call')}</a>
      <button class="btn btn--ghost" type="button" data-do="edit">${t('o.done.edit')}</button>
      <button class="btn btn--ghost" type="button" data-do="new">${t('o.done.new')}</button>`;
  } else {
    const time = info.pickup ? fmtTime(toMin(info.pickup.time)) : null;
    $('doneTitle').innerHTML = t('o.done.paid.title');
    $('doneText').textContent = [
      time ? t('o.done.paid.time', time) : t('o.done.paid.text'),
      info.orderId ? t('o.done.paid.id', String(info.orderId)) : '',
    ].filter(Boolean).join(' ');
    summary.hidden = true;
    actions.innerHTML = `
      <a class="btn btn--solid" href="index.html">${t('o.back')}</a>
      <button class="btn btn--ghost" type="button" data-do="edit">${t('o.done.more')}</button>`;
  }
}

$('doneActions').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-do]');
  if (!btn) return;
  if (btn.dataset.do === 'copy') {
    try { await navigator.clipboard.writeText(doneState.info.text); btn.textContent = t('copy.done'); }
    catch { btn.textContent = t('copy.failed'); }
    setTimeout(() => { btn.textContent = t('o.done.copy'); }, 2200);
    return;
  }
  if (btn.dataset.do === 'new') {
    cart = [];
    saveCart();
    fields.notes.value = '';
    renderCart();
  }
  backToShop();
});

/* ---------------------------------------------------------
   Profile — optional, and kept in this browser only (localStorage). There is no
   password and nothing is sent anywhere: it saves the guest's details, usual drink,
   kitchen note, favourites and last orders on this device. Guests leave no trace.
   Real sign-in across devices needs a backend; keep this shape if one is added.
   --------------------------------------------------------- */
const profileDialog = $('profileDialog');
const pf = { name: $('pName'), phone: $('pPhone'), email: $('pEmail'), drink: $('pDrink'), note: $('pNote') };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let profileHint = null;

function cleanProfile(raw) {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return {
    name: str(raw.name, 60), phone: str(raw.phone, 24), email: str(raw.email, 120),
    drink: OPTION_GROUPS.drink.choices.includes(raw.drink) ? raw.drink : '',
    note: str(raw.note, 200),
    favorites: Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter((id) => ITEMS.has(id)))] : [],
    orders: (Array.isArray(raw.orders) ? raw.orders : [])
      .map((o) => ({ at: String(o?.at ?? ''), items: cleanCart(o?.items), total: Number(o?.total) || 0 }))
      .filter((o) => o.items.length).slice(0, 10),
  };
}
profile = cleanProfile(store.get(local(), PROFILE_KEY));

function saveProfile() {
  if (profile) store.set(local(), PROFILE_KEY, profile);
  else store.del(local(), PROFILE_KEY);
}
function recordOrder(entry) {
  if (!profile) return;
  profile.orders = [entry, ...profile.orders].slice(0, 10);
  saveProfile();
}

function renderProfile() {
  const btn = $('profileBtn');
  btn.textContent = profile ? profile.name.split(/\s+/)[0] : t('p.btn');
  btn.classList.toggle('is-on', Boolean(profile));
  btn.setAttribute('aria-label', profile ? `${t('p.title')}: ${profile.name}` : t('p.create'));

  $('who').innerHTML = profile
    ? `${esc(t('p.as', profile.name))} · <button type="button" data-profile>${t('p.edit')}</button>`
    : `${t('p.guest')} · <button type="button" data-profile>${t('p.create')}</button>`;

  $('pTitle').textContent = profile ? t('p.title') : t('p.create');
  $('pLede').textContent = profile ? t('p.lede') : `${profileHint === 'fav' ? `${t('p.lede.fav')} ` : ''}${t('p.lede.new')}`;
  $('pSave').textContent = profile ? t('p.save') : t('p.create');
  $('pGuest').hidden = Boolean(profile);
  const drink = pf.drink.value;
  pf.drink.innerHTML = `<option value="">${t('p.drink.none')}</option>${OPTION_GROUPS.drink.choices.map((c) => `<option value="${c}">${tr(c)}</option>`).join('')}`;
  pf.drink.value = drink;

  $('pOrders').hidden = !profile?.orders.length;
  $('pOrderList').innerHTML = (profile?.orders ?? []).map((o, i) => {
    const when = new Date(o.at);
    return `
    <li>
      <span class="o-history__when">${Number.isNaN(when.getTime()) ? '' : when.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })} · ${money(o.total)}</span>
      <span class="o-history__items">${o.items.map((l) => `${l.qty} × ${tr(ITEMS.get(l.id).name)}`).join(', ')}</span>
      <button class="o-history__again" type="button" data-again="${i}">${t('p.again')}</button>
    </li>`;
  }).join('');
  $('pDelete').hidden = !profile;
  $('pDelete').classList.remove('is-armed');
  $('pDelete').textContent = t('p.delete');
}

function openProfile(hint = null) {
  if (typeof profileDialog.showModal !== 'function') return;
  profileHint = hint;
  // A guest who already typed their details shouldn't have to type them twice
  pf.name.value = profile?.name ?? fields.name.value;
  pf.phone.value = profile?.phone ?? fields.phone.value;
  pf.email.value = profile?.email ?? fields.email.value;
  pf.note.value = profile?.note ?? '';
  renderProfile();
  pf.drink.value = profile?.drink ?? '';
  profileDialog.showModal();
}

$('profileBtn').addEventListener('click', () => openProfile());
$('who').addEventListener('click', (e) => { if (e.target.closest('[data-profile]')) openProfile(); });
$('pClose').addEventListener('click', () => profileDialog.close());
$('pGuest').addEventListener('click', () => profileDialog.close());
profileDialog.addEventListener('click', (e) => { if (e.target === profileDialog) profileDialog.close(); });

$('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  profile = cleanProfile({
    ...profile,
    name: pf.name.value, phone: pf.phone.value, email: pf.email.value, drink: pf.drink.value, note: pf.note.value,
  });
  saveProfile();
  fields.notes.value = '';
  fillFromProfile();
  profileDialog.close();
  renderProfile();
  renderMenu();
});

$('pOrderList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-again]');
  if (!btn) return;
  const lines = profile.orders[Number(btn.dataset.again)].items.filter((l) => available(ITEMS.get(l.id)));
  lines.forEach((l) => addToCart(l.id, { ...l.opts }, l.qty));
  profileDialog.close();
  if (doneState) backToShop();
  $('cart').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Two taps: the first arms the button, the second deletes
$('pDelete').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  if (!btn.classList.contains('is-armed')) {
    btn.classList.add('is-armed');
    btn.textContent = t('p.delete.confirm');
    return;
  }
  profile = null;
  saveProfile();
  ['name', 'phone', 'email', 'notes'].forEach((k) => { fields[k].value = ''; });
  profileDialog.close();
  renderProfile();
  renderMenu();
});

/* ---------------------------------------------------------
   Start
   --------------------------------------------------------- */
$('year').textContent = new Date().getFullYear();
$('callInstead').href = LINKS.phone;
initI18n();

function renderAll() {
  renderProfile();
  renderMenu();
  renderTips();
  renderSchedule();
  renderCart();
  renderDone();
}
fillFromProfile();
renderAll();
onLangChange(renderAll);

// Coming back from the payment page
const params = new URLSearchParams(location.search);
const status = params.get('status');
if (status) {
  if (status === 'success') finishPaid(params.get('order'));
  if (status === 'cancelled') {
    $('notice').textContent = t('o.cancelled');
    $('notice').hidden = false;
  }
  params.delete('status');
  params.delete('order');
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
}
