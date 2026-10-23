// Boot: decide between the WebGL site and the plain one, run the loader, own the frame loop and page transitions.
import * as THREE from '../vendor/three.module.min.js';
import { GL } from './gl.js';
import { Home } from './home.js';
import { mountPage } from './pages.js';
import { Sound } from './sound.js';
import { buildLoader, playLoader, hideLoader, devPanel } from './ui.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const isNarrow = () => window.innerWidth / window.innerHeight < 0.9 || window.innerWidth < 820;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } } };

function hasWebGL2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } }

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const sound = new Sound();
const lenis = !reduced && window.Lenis ? new window.Lenis({ lerp: 0.1, smoothWheel: true }) : null;

let gl = null;
if (!reduced && hasWebGL2() && !new URLSearchParams(location.search).has('static')) {
  root.classList.add('gl');
  try { gl = new GL(document.querySelector('canvas.canvas-gl'), { mobile: !fine }); }
  catch (e) { console.warn('WebGL unavailable, using the plain site', e); gl = null; root.classList.remove('gl'); }
}
if (!gl) root.classList.add('static');

// ---------- chrome that can be swapped between pages ----------
function bindChrome() {
  document.querySelectorAll('[data-sound-toggle]').forEach((b) => { if (!b.dataset.bound) { b.dataset.bound = '1'; sound.bind(b); } });
  const btn = document.querySelector('.hd-menu'), menu = document.getElementById('menu');
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); open ? lenis?.stop() : lenis?.start(); });
  }
}
function closeMenu() {
  const btn = document.querySelector('.hd-menu'), menu = document.getElementById('menu');
  if (menu && !menu.hidden) { menu.hidden = true; btn?.setAttribute('aria-expanded', 'false'); lenis?.start(); }
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// ---------- pages ----------
let page = null;
// inner pages: gradient, grid, and the mark small and far off to one side
const SUB = { sub: 1, wall: 0, word: 0, car: 0, cap: 0, curtain: 0, dissolve: 0, bar: 0, flat: 0, grid: 1, mx: 4.2, my: -1.9, mz: -4, ms: 0.62, frost: 0.4, spin: 0.6, mrx: 0, mry: 0, camX: 0, camY: 0, camZ: 7 };
function mount() {
  const main = document.getElementById('main');
  const kind = main.dataset.page;
  document.body.dataset.page = kind;
  const navKey = kind === 'detail' ? 'work' : kind;
  document.querySelectorAll('[data-nav]').forEach((a) => (a.dataset.nav === navKey ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  if (kind === 'home' && gl) {
    const home = new Home({ main, gl, lenis: lenis || { scrollTo: (y) => window.scrollTo({ top: y, behavior: 'smooth' }), on: () => () => {} }, sound, narrow: isNarrow() });
    page = { home, update: (y) => home.update(y), destroy: () => home.destroy() };
  } else {
    const un = mountPage(main, { sound, lenis });
    if (gl) gl.set(isNarrow() ? { ...SUB, mx: 1.5, my: -3.2, ms: 0.5 } : SUB);
    page = { update: () => {}, destroy: un };
  }
}

// ---------- page transitions: fade out, fetch, swap, fade in; the canvas stays ----------
let busy = false;
async function navigate(href, push) {
  if (busy) return; busy = true;
  closeMenu();
  document.body.dataset.phase = 'out';
  if (gl) window.gsap.to(gl, { fade: 0.25, duration: 0.5, ease: 'power2.in' });
  let html = null;
  try { [html] = await Promise.all([fetch(href).then((r) => (r.ok ? r.text() : Promise.reject(r.status))), wait(500)]); }
  catch (e) { location.href = href; return; }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  page?.destroy();
  if (push) history.pushState({}, '', href);
  // header, menu and footer carry relative links, so they are swapped too
  for (const sel of ['#main', '.hd', '#menu', '.ft']) { const next = doc.querySelector(sel), cur = document.querySelector(sel); if (next && cur) cur.replaceWith(document.adoptNode(next)); }
  document.title = doc.title;
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); else window.scrollTo(0, 0);
  bindChrome();
  mount();
  document.body.dataset.phase = 'in';
  if (gl) window.gsap.to(gl, { fade: 1, duration: 0.9, ease: 'power2.out' });
  setTimeout(() => { document.body.dataset.phase = 'ready'; }, 900);
  document.getElementById('main')?.focus?.({ preventScroll: true });
  busy = false;
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  if (url.pathname === location.pathname) { closeMenu(); lenis ? lenis.scrollTo(0, { duration: 1.2 }) : window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  navigate(url.href, true);
});
window.addEventListener('popstate', () => navigate(location.href, false));

// ---------- input ----------
window.addEventListener('pointermove', (e) => gl?.setPointer(e.clientX, e.clientY), { passive: true });
let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    gl?.resize();
    if (page?.home) { page.home.narrow = isNarrow(); page.home.layout(); }
    lenis?.resize();
  }, 120);
});
document.addEventListener('visibilitychange', () => sound.visibility(document.hidden));

// snap to the nearest resting frame once the wheel stops (mouse and trackpad only)
if (lenis && gl && fine) {
  let snapT;
  lenis.on('scroll', () => { clearTimeout(snapT); snapT = setTimeout(() => { if (!lenis.isSmooth) page?.home?.maybeSnap(lenis.scroll); }, 170); });
}

// ---------- frame loop ----------
let devUpdate = null;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  lenis?.raf(now);
  const y = lenis ? lenis.scroll : window.scrollY;
  page?.update(y);
  if (gl && !document.hidden) {
    gl.velocity = lenis ? lenis.velocity : 0;
    gl.render(dt);
    devUpdate?.();
  }
  requestAnimationFrame(frame);
}

// ---------- boot ----------
async function boot() {
  bindChrome();
  mount();
  requestAnimationFrame(frame);
  const loader = document.querySelector('.loader');
  const count = loader.querySelector('.loader-count span');
  if (gl) {
    lenis?.stop();
    devUpdate = devPanel(document.querySelector('.dev'), gl, THREE);
    const parts = buildLoader(loader);
    const seen = !!store.get('am-seen');
    let shown = 0;
    gl.onProgress = (v) => { shown = Math.max(shown, Math.round(v * 100)); count.textContent = shown; };
    const tl = playLoader(loader, parts, { fast: seen });
    await Promise.all([gl.ready, new Promise((r) => tl.eventCallback('onComplete', r)), wait(seen ? 600 : 2400)]);
    count.textContent = '100';
    store.set('am-seen', '1');
    hideLoader(loader, parts);
    window.gsap.to(gl, { reveal: 1, duration: 1.8, ease: 'power2.out', delay: 0.35 });
    await wait(900);
    lenis?.start();
    if (page?.home) page.home.on = {};   // replay the hero's entrance now that it can be seen
  } else {
    window.gsap ? window.gsap.to(loader, { opacity: 0, duration: 0.5, onComplete: () => { loader.style.display = 'none'; } }) : (loader.style.display = 'none');
  }
  root.classList.add('loaded');
  offerSound();
}

// sound is opt-in; a returning visitor who chose it gets it back on their first click or key
function offerSound() {
  const bar = document.querySelector('.soundbar');
  const choice = sound.choice;
  if (choice === 'on') {
    const go = () => { sound.enable(); window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
    window.addEventListener('pointerdown', go); window.addEventListener('keydown', go);
    return;
  }
  if (choice === 'off' || !bar) return;
  bar.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('is-in')));
  const close = () => { bar.classList.remove('is-in'); setTimeout(() => { bar.hidden = true; }, 800); };
  bar.querySelector('[data-sound="on"]').addEventListener('click', () => { sound.enable(); close(); });
  bar.querySelector('[data-sound="off"]').addEventListener('click', () => { sound.disable(); close(); });
}

boot();
