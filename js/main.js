import { MENU, TAG_LABELS } from './menu-data.js';
import { LINKS } from './site-config.js';

const { gsap, ScrollTrigger, Lenis } = window;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = Boolean(gsap && ScrollTrigger);

document.documentElement.classList.add('js');
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------------------------------------------------
   Smooth scroll
   --------------------------------------------------------- */
let lenis = null;
if (hasGsap) gsap.registerPlugin(ScrollTrigger);
if (Lenis && !reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  if (hasGsap) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { offset: -60, duration: 1.4 });
  else document.querySelector(target)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !document.querySelector(id)) return;
    e.preventDefault();
    closeDrawer();
    scrollToTarget(id === '#top' ? 0 : id);
  });
});

/* ---------------------------------------------------------
   Intro (tunduk sunrise) — shown once per session
   --------------------------------------------------------- */
const intro = document.getElementById('intro');

function seenIntro() {
  try { return sessionStorage.getItem('nm-intro') === '1'; } catch { return false; }
}
function markIntro() {
  try { sessionStorage.setItem('nm-intro', '1'); } catch { /* storage blocked */ }
}

function buildRays() {
  const g = intro.querySelector('.intro__rays');
  const ns = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', 100 + Math.cos(a) * 40);
    line.setAttribute('y1', 100 + Math.sin(a) * 40);
    line.setAttribute('x2', 100 + Math.cos(a) * (i % 2 ? 62 : 72));
    line.setAttribute('y2', 100 + Math.sin(a) * (i % 2 ? 62 : 72));
    g.appendChild(line);
  }
  return g.querySelectorAll('line');
}

function heroIn() {
  if (!hasGsap || reduceMotion) return;
  gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.12 });
  gsap.from(['.hero__eyebrow', '.hero__lede', '.hero__ctas', '.hero__meta'], {
    opacity: 0, y: 24, duration: 1.2, ease: 'expo.out', stagger: 0.1, delay: 0.25,
  });
}

function endIntro(fast = false) {
  markIntro();
  intro.classList.add('is-done');
  document.body.classList.remove('is-locked');
  lenis?.start();
  if (hasGsap && !fast) {
    gsap.to(intro, { yPercent: -100, duration: 1.1, ease: 'expo.inOut', onComplete: () => intro.remove() });
    gsap.delayedCall(0.45, heroIn);
  } else {
    intro.remove();
    heroIn();
  }
}

if (seenIntro() || reduceMotion || !hasGsap) {
  intro.remove();
  heroIn();
} else {
  document.body.classList.add('is-locked');
  lenis?.stop();
  const rays = buildRays();
  const tl = gsap.timeline({ onComplete: () => endIntro() });
  tl.from('.intro__tunduk', { scale: 0.4, opacity: 0, rotate: -90, transformOrigin: '50% 50%', duration: 1, ease: 'expo.out' })
    .from(rays, { opacity: 0, scale: 0.6, transformOrigin: '100px 100px', duration: 0.6, stagger: 0.012, ease: 'power2.out' }, '-=0.6')
    .from('.intro__word span', { y: 30, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out' }, '-=0.5')
    .to('.intro__sun', { rotate: 30, duration: 1.4, ease: 'power1.inOut' }, '-=0.8');
  intro.querySelector('.intro__skip').addEventListener('click', () => { tl.kill(); endIntro(true); });
}

/* ---------------------------------------------------------
   Nav: solid on scroll, hide on scroll down
   --------------------------------------------------------- */
const nav = document.getElementById('nav');
let lastY = 0;
function onScroll(y) {
  nav.classList.toggle('is-scrolled', y > 40);
  nav.classList.toggle('is-hidden', y > lastY && y > 400 && !drawerOpen());
  lastY = y;
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

/* ---------------------------------------------------------
   Mobile drawer
   --------------------------------------------------------- */
const burger = document.getElementById('burger');
const drawer = document.getElementById('drawer');
const drawerOpen = () => burger.getAttribute('aria-expanded') === 'true';

function openDrawer() {
  drawer.hidden = false;
  burger.setAttribute('aria-expanded', 'true');
  burger.setAttribute('aria-label', 'Close menu');
  document.body.classList.add('is-locked');
  lenis?.stop();
  if (hasGsap && !reduceMotion) {
    gsap.fromTo(drawer, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' });
    gsap.from('.drawer nav a', { y: 40, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'expo.out', delay: 0.25 });
  }
}
function closeDrawer() {
  if (!drawerOpen()) return;
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Open menu');
  document.body.classList.remove('is-locked');
  lenis?.start();
  drawer.hidden = true;
}
burger.addEventListener('click', () => (drawerOpen() ? closeDrawer() : openDrawer()));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

/* ---------------------------------------------------------
   Menu
   --------------------------------------------------------- */
const tabsEl = document.getElementById('menuTabs');
const panelEl = document.getElementById('menuPanel');
const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

function renderCategory(cat) {
  panelEl.setAttribute('aria-labelledby', `tab-${cat.id}`);
  panelEl.innerHTML = cat.items.map((item) => `
    <article class="menu-item">
      <div>
        <h3 class="menu-item__name">${item.name}</h3>
        ${item.native ? `<span class="menu-item__native">${item.native}</span>` : ''}
      </div>
      <span class="menu-item__price">${money(item.price)}</span>
      <p class="menu-item__desc">${item.desc}${item.portion ? ` <small>· ${item.portion}</small>` : ''}</p>
      ${item.tags?.length ? `<div class="menu-item__tags">${item.tags.map((t) => `<span class="tag tag--${t}">${TAG_LABELS[t]}</span>`).join('')}</div>` : ''}
    </article>`).join('');
  if (hasGsap && !reduceMotion) {
    gsap.from(panelEl.children, { y: 24, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out' });
  }
}

MENU.forEach((cat, i) => {
  const b = document.createElement('button');
  b.className = 'menu__tab';
  b.id = `tab-${cat.id}`;
  b.type = 'button';
  b.role = 'tab';
  b.textContent = cat.label;
  b.setAttribute('aria-selected', String(i === 0));
  b.tabIndex = i === 0 ? 0 : -1;
  b.addEventListener('click', () => selectTab(i));
  tabsEl.appendChild(b);
});

function selectTab(i) {
  [...tabsEl.children].forEach((b, j) => {
    b.setAttribute('aria-selected', String(i === j));
    b.tabIndex = i === j ? 0 : -1;
  });
  renderCategory(MENU[i]);
}
tabsEl.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  const tabs = [...tabsEl.children];
  const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  const next = (cur + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  selectTab(next);
  tabs[next].focus();
});
renderCategory(MENU[0]);

/* ---------------------------------------------------------
   Outbound links (DoorDash / Uber Eats show only once configured)
   --------------------------------------------------------- */
document.querySelectorAll('[data-link]').forEach((el) => {
  const url = LINKS[el.dataset.link];
  if (url) { el.href = url; el.hidden = false; }
  else el.hidden = true;
});

/* ---------------------------------------------------------
   Rate your visit — every rating goes to Google (no filtering)
   --------------------------------------------------------- */
const stars = [...document.querySelectorAll('#stars button')];
const starsHint = document.getElementById('starsHint');
const HINTS = ['', 'Thank you for telling us — we read every review.', 'Thank you — tell us what we can do better.', 'Thanks! What would make it a five next time?', 'Rakhmat! Tell others what you loved.', 'Rakhmat! Tell others what you loved.'];
let chosen = 0;
const paint = (n) => stars.forEach((b, i) => b.classList.toggle('is-on', i < n));
stars.forEach((b, i) => {
  b.addEventListener('mouseenter', () => paint(i + 1));
  b.addEventListener('focus', () => paint(i + 1));
  b.addEventListener('click', () => {
    chosen = i + 1;
    paint(chosen);
    stars.forEach((s2, j) => s2.setAttribute('aria-pressed', String(j === i)));
    starsHint.textContent = `${HINTS[chosen]} Opening Google — pick ${chosen} star${chosen > 1 ? 's' : ''} there too.`;
    window.open(LINKS.googleReview, '_blank', 'noopener');
  });
});
document.getElementById('stars').addEventListener('mouseleave', () => paint(chosen));

document.getElementById('copyReview').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText(LINKS.googleReview);
    btn.textContent = 'Link copied ✓';
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: LINKS.googleReview });
    document.body.appendChild(ta);
    ta.select();
    btn.textContent = document.execCommand('copy') ? 'Link copied ✓' : 'Copy failed';
    ta.remove();
  }
  setTimeout(() => { btn.textContent = 'Copy review link'; }, 2200);
});

/* ---------------------------------------------------------
   Reviews rotator
   --------------------------------------------------------- */
const voices = [...document.querySelectorAll('.voice')];
const voiceIndex = document.getElementById('voiceIndex');
let vi = 0;
setInterval(() => {
  voices[vi].classList.remove('is-active');
  vi = (vi + 1) % voices.length;
  voices[vi].classList.add('is-active');
  voiceIndex.textContent = vi + 1;
}, 5500);

/* ---------------------------------------------------------
   Lazy final video
   --------------------------------------------------------- */
const lazyVideo = document.querySelector('[data-lazy-video]');
new IntersectionObserver((entries, io) => {
  entries.forEach((en) => {
    if (en.isIntersecting) { lazyVideo.play().catch(() => {}); }
    else if (!lazyVideo.paused) lazyVideo.pause();
  });
}, { rootMargin: '200px' }).observe(lazyVideo);

/* ---------------------------------------------------------
   Scroll animations
   --------------------------------------------------------- */
if (hasGsap && !reduceMotion) {
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // Hero video drifts as you leave
  gsap.to('.hero__video', {
    yPercent: 12, scale: 1.18, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  gsap.utils.toArray('[data-parallax]').forEach((img) => {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  gsap.from('.story__inset', {
    y: 80, opacity: 0, duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.story__media', start: 'top 70%' },
  });

  // Shyrdak bands slide sideways like a felt being unrolled
  gsap.utils.toArray('.pattern-band svg').forEach((svg) => {
    gsap.fromTo(svg, { x: 0 }, {
      x: -120, ease: 'none',
      scrollTrigger: { trigger: svg, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Horizontal gallery (desktop only)
  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    const track = document.getElementById('galleryTrack');
    const distance = () => track.scrollWidth - window.innerWidth;
    gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: '.gallery', start: 'top top', end: () => `+=${distance()}`,
        pin: true, scrub: 0.6, invalidateOnRefresh: true,
      },
    });
  });

  gsap.from('.final__content > *', {
    y: 50, opacity: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out',
    scrollTrigger: { trigger: '.final', start: 'top 60%' },
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
} else {
  document.querySelectorAll('.reveal').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
}

/* ---------------------------------------------------------
   3D dishes — loaded lazily when the section approaches
   --------------------------------------------------------- */
const stage = document.getElementById('signature');
new IntersectionObserver(async (entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  try {
    const { initDishes } = await import('./dishes3d.js');
    initDishes({
      canvas: document.getElementById('dishCanvas'),
      ui: {
        index: document.getElementById('dishIndex'),
        total: document.getElementById('dishTotal'),
        name: document.getElementById('dishName'),
        native: document.getElementById('dishNative'),
        desc: document.getElementById('dishDesc'),
        prev: document.getElementById('dishPrev'),
        next: document.getElementById('dishNext'),
      },
      reduceMotion,
    });
  } catch (err) {
    console.error('[NomadManti] 3D failed', err);
    document.querySelector('.stage-fallback').hidden = false;
  }
}, { rootMargin: '600px' }).observe(stage);
