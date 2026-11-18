// Catering page (catering.html): fills in prices/rules from CATERING in site-config.js and turns
// the inquiry form into a ready-made text message (or email) to the restaurant. Nothing is sent
// to a server; the guest sends it from their own phone or mail app.
import { CATERING, LINKS } from './site-config.js';
import { initI18n, onLangChange, t } from './i18n.js';
import { initApp } from './app.js';

const $ = (id) => document.getElementById(id);
document.getElementById('year').textContent = new Date().getFullYear();
initI18n();
initApp();
if (LINKS.onlineOrdering) {
  document.querySelectorAll('a[href="order.html"]').forEach((a) => { a.href = LINKS.onlineOrdering; });
}

/* ---------- Prices, servings and terms from the config ---------- */
function fillConfig() {
  document.querySelectorAll('[data-tray]').forEach((card) => {
    const info = CATERING.trays?.[card.dataset.tray];
    card.querySelector('[data-tray-meta]').textContent =
      info ? [info.serves, info.price].filter(Boolean).join(' · ') : '';
  });
  const terms = [
    CATERING.minNoticeDays ? t('c.terms.notice', CATERING.minNoticeDays) : '',
    CATERING.minGuests ? t('c.terms.guests', CATERING.minGuests) : '',
    CATERING.terms || '',
  ].filter(Boolean).join(' ');
  $('terms').textContent = terms;
  $('terms').hidden = !terms;
}
fillConfig();
onLangChange(fillConfig);

/* ---------- Form ---------- */
const form = $('cateringForm');
const date = $('cDate');
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const earliest = new Date();
earliest.setDate(earliest.getDate() + (CATERING.minNoticeDays || 1));
date.min = isoDay(earliest);
if (CATERING.minGuests) form.guests.min = CATERING.minGuests;

const addressField = form.querySelector('[data-address]');
form.addEventListener('change', (e) => {
  if (e.target.name === 'service') addressField.hidden = e.target.value !== 'Delivery';
});

function showError(msg) {
  $('cError').textContent = msg;
  $('cError').hidden = !msg;
}

// Written in English on purpose: the message is for the kitchen, whatever language the page is in.
function buildMessage(f) {
  const fmtDate = new Date(`${f.date}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = f.time ? new Date(`2000-01-01T${f.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const dishes = form.querySelectorAll('[name="dishes"]:checked');
  return [
    'CATERING REQUEST — nomadmanti.com',
    `Name: ${f.name}`,
    `Phone: ${f.phone}`,
    f.email && `Email: ${f.email}`,
    `Date: ${fmtDate}${fmtTime ? `, ${fmtTime}` : ''}`,
    `Guests: ${f.guests}`,
    `Occasion: ${f.occasion}`,
    `Service: ${f.service}${f.service === 'Delivery' && f.address ? ` to ${f.address}` : ''}`,
    dishes.length && `Dishes: ${[...dishes].map((d) => d.value).join(', ')}`,
    f.notes && `Notes: ${f.notes}`,
  ].filter(Boolean).join('\n');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    showError(t('c.err'));
    form.querySelector(':invalid')?.focus();
    return;
  }
  showError('');
  const f = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
  const msg = buildMessage(f);

  $('cMsg').textContent = msg;
  // "?&body=" is the form both iOS and Android accept (same as the order page)
  $('cSms').href = `sms:${CATERING.sms}?&body=${encodeURIComponent(msg)}`;
  $('cMail').hidden = !CATERING.email;
  if (CATERING.email) {
    $('cMail').href = `mailto:${CATERING.email}?subject=${encodeURIComponent(`Catering request — ${f.guests} guests, ${f.date}`)}&body=${encodeURIComponent(msg)}`;
  }
  $('cSend').hidden = false;
  $('cSend').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (matchMedia('(pointer: coarse)').matches) location.href = $('cSms').href;
});

$('cCopy').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const label = btn.textContent;
  try {
    await navigator.clipboard.writeText($('cMsg').textContent);
    btn.textContent = t('copy.done');
  } catch {
    btn.textContent = t('copy.failed');
  }
  setTimeout(() => { btn.textContent = label; }, 2200);
});
