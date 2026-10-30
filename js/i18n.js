// Language detection and switching.
// The page is written in SOURCE; other languages come from translations.js (page text)
// and menu-translations.js (menu text, keyed by the original wording in menu-data.js).
// The inline script in <head> has already picked the language and set <html lang>:
// ?lang= in the URL → the visitor's saved choice → the browser's languages → SOURCE.
//
// Markup:  data-i18n="key"                  → replaces the element's inner HTML
//          data-i18n-attr="alt:key, title:key" → replaces attributes
//          data-lang-picker                  → a <label> holding a <select>; filled here
import { SOURCE, LANGS, STRINGS } from './translations.js';
import { CONTENT } from './menu-translations.js';

const STORE_KEY = 'nm-lang';
const root = document.documentElement;
export let lang = LANGS[root.lang] ? root.lang : SOURCE;

const originalHtml = new Map();
const originalAttr = new Map();
const listeners = [];

export function t(key, ...args) {
  const v = STRINGS[lang]?.[key] ?? STRINGS[SOURCE]?.[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

// Translate a piece of content (menu item, label…) by its original text.
export const tr = (text) => (text && CONTENT[lang]?.[text]) || text;

export const onLangChange = (fn) => listeners.push(fn);

function apply() {
  root.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    if (!originalHtml.has(el)) originalHtml.set(el, el.innerHTML);
    el.innerHTML = STRINGS[lang]?.[el.dataset.i18n] ?? originalHtml.get(el);
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    if (!originalAttr.has(el)) originalAttr.set(el, {});
    const saved = originalAttr.get(el);
    el.dataset.i18nAttr.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (!(attr in saved)) saved[attr] = el.getAttribute(attr);
      el.setAttribute(attr, STRINGS[lang]?.[key] ?? saved[attr]);
    });
  });
  document.querySelectorAll('[data-lang-picker]').forEach((picker) => {
    picker.querySelector('.lang__code').textContent = LANGS[lang].code;
    picker.querySelector('select').value = lang;
  });
  listeners.forEach((fn) => fn(lang));
}

export function setLang(next) {
  if (!LANGS[next] || next === lang) return;
  lang = next;
  try { localStorage.setItem(STORE_KEY, next); } catch { /* storage blocked */ }
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.delete('lang');
    history.replaceState(null, '', url);
  }
  apply();
}

export function initI18n() {
  document.querySelectorAll('[data-lang-picker]').forEach((picker) => {
    const select = picker.querySelector('select');
    select.innerHTML = Object.entries(LANGS)
      .map(([id, l]) => `<option value="${id}" lang="${id}">${l.name}</option>`).join('');
    select.addEventListener('change', () => setLang(select.value));
  });
  apply();
  root.classList.remove('i18n-wait');
}
