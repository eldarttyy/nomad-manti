// "App mode": the site running from the home screen (Add to Home Screen) or inside the
// iOS app shell in app/. The inline script in <head> has already put .is-app on <html>;
// this adds the bottom tab bar and, on the web, the offline cache (sw.js).
import { t, onLangChange } from './i18n.js';

export const IS_APP = document.documentElement.classList.contains('is-app');
const onOrderPage = document.body.classList.contains('order-page');

const ICONS = {
  home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  order: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  visit: '<path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
  profile: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5"/>',
};
const TABS = [
  { id: 'home', href: onOrderPage ? 'index.html' : '#top' },
  { id: 'order', href: 'order.html' },
  { id: 'visit', href: onOrderPage ? 'index.html#visit' : '#visit' },
  { id: 'profile', href: onOrderPage ? '#profile' : 'order.html#profile' },
];

let bar = null;
export function setTab(id) {
  bar?.querySelectorAll('a').forEach((a) => {
    const on = a.dataset.tab === id;
    a.classList.toggle('is-current', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// Call once, right after initI18n() and before any link handlers are attached.
export function initApp() {
  if ('serviceWorker' in navigator && !window.Capacitor && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is optional */ });
  }
  if (!IS_APP) return;

  bar = document.createElement('nav');
  bar.className = 'tabbar';
  bar.innerHTML = TABS.map((tab) => `
    <a href="${tab.href}" data-tab="${tab.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[tab.id]}</svg>
      <span></span>
    </a>`).join('');
  document.body.appendChild(bar);

  const label = () => {
    bar.setAttribute('aria-label', t('app.tabs'));
    bar.querySelectorAll('a').forEach((a) => { a.querySelector('span').textContent = t(`app.${a.dataset.tab}`); });
  };
  label();
  onLangChange(label);

  setTab(onOrderPage ? 'order' : 'home');
  const visit = document.getElementById('visit');
  if (visit && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => setTab(en.isIntersecting ? 'visit' : 'home'), { rootMargin: '-45% 0px -45% 0px' }).observe(visit);
  }
}
