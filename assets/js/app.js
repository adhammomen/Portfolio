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
// inner pages: gradient, grid, and the A small and off to one side
const SUB = { sub: 1, wall: 0, curtain: 0, dissolve: 0, signal: 0, flat: 0, grid: 1, spread: 1, gz: -2.5, frost: 0.4, spin: 0.6, mrx: 0, mry: 0, camZ: 7 };
const subGroup = () => { const w = window.innerWidth, h = window.innerHeight; return isNarrow() ? { gx: w * 0.62, gy: h * 0.86, gu: h * 0.0032 } : { gx: w * 0.95, gy: h * 0.86, gu: h * 0.0058 }; };
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
    if (gl) { gl.resetSlabs(); gl.set({ ...SUB, ...subGroup() }); }
    page = { update: () => {}, destroy: un };
  }
}

// ---------- page transitions: fade out, fetch, swap, fade in; the canvas stays ----------
// A project opened from its floor shatters instead: its pane breaks into pieces that land on the project page's
// first image. Going back from that page runs it in reverse, into the slab on the floor you came from.
let busy = false;
let shattered = null;   // { i, slug, path } of the last project opened that way
const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
const clean = (p) => p.replace(/index\.html$/, '');
const isHome = (url) => { const h = document.querySelector('.hd-logo'); return !!h && clean(new URL(h.href).pathname) === clean(url.pathname); };
const tween = (vars) => new Promise((res) => { window.gsap.killTweensOf(gl, 'shatterT'); window.gsap.to(gl, { ...vars, onComplete: res }); });

async function navigate(href, push, fx = {}) {
  if (busy) return; busy = true;
  closeMenu();
  const url = new URL(href, location.href);
  // remember where the homepage was, so coming back lands on the same floor
  if (page?.home && push) history.replaceState({ y: lenis ? lenis.scroll : window.scrollY }, '');
  const restoreY = !push ? history.state?.y : null;

  let out = null, back = null;
  if (gl && fx.shatter != null && page?.home) {
    const i = fx.shatter, slug = url.pathname.match(/work\/([^/]+)\/?$/)?.[1], tex = gl.projectTex?.[slug];
    if (tex) {
      out = { i, slug };
      gl.shatter(tex, page.home.slot[i]); gl.hideSlab(i, true);
      sound.play('work-in', { gain: 0.5, rate: 1.1 });
      tween({ shatterT: 0.4, duration: 0.65, ease: 'power2.out' });
    }
  } else if (gl && !push && shattered && isHome(url) && document.querySelector('.dt-fig img')) {
    const fig = document.querySelector('.dt-fig img'), tex = gl.projectTex?.[shattered.slug];
    if (tex) { back = { ...shattered }; gl.shatter(tex, rectOf(fig)); fig.style.opacity = 0; tween({ shatterT: 0.4, duration: 0.65, ease: 'power2.out' }); }
  }
  document.body.dataset.phase = 'out';
  if (gl && !out && !back) window.gsap.to(gl, { fade: 0.25, duration: 0.5, ease: 'power2.in' });

  let html = null;
  try { [html] = await Promise.all([fetch(href).then((r) => (r.ok ? r.text() : Promise.reject(r.status))), wait(out || back ? 560 : 500)]); }
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
  // the homepage only has its full height once mounted, so a remembered position is restored after
  const y = restoreY != null ? restoreY : 0;
  if (y) { lenis?.resize(); if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }
  page?.update(y);
  document.body.dataset.phase = 'in';
  if (gl && !out && !back) window.gsap.to(gl, { fade: 1, duration: 0.9, ease: 'power2.out' });
  setTimeout(() => { document.body.dataset.phase = 'ready'; }, 900);
  document.getElementById('main')?.focus?.({ preventScroll: true });
  busy = false;

  if (out) {
    // land on the project page's first image, then hand over to the real one
    const img = document.querySelector('.dt-fig img');
    shattered = { ...out };
    if (img) {
      img.style.opacity = 0;
      gl.shatterTo(rectOf(img));
      await tween({ shatterT: 1, duration: 1.15, ease: 'power3.inOut' });
      img.style.transition = 'opacity .45s ease'; img.style.opacity = 1;
      await wait(380);
    }
    gl.shatterEnd(); gl.hideSlab(out.i, false);
  } else if (back) {
    gl.hideSlab(back.i, true);
    if (page?.home) gl.shatterTo(page.home.slot[back.i]);
    await tween({ shatterT: 1, duration: 1.15, ease: 'power3.inOut' });
    gl.shatterEnd(); gl.hideSlab(back.i, false);
    shattered = null;
  }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  if (url.pathname === location.pathname) { closeMenu(); lenis ? lenis.scrollTo(0, { duration: 1.2 }) : window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  navigate(url.href, true, { shatter: a.dataset.shatter != null ? +a.dataset.shatter : null });
});
window.addEventListener('popstate', () => navigate(location.href, false));

// ---------- input ----------
window.addEventListener('pointermove', (e) => gl?.setPointer(e.clientX, e.clientY), { passive: true });
let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    gl?.resize();
    if (page?.home) { page.home.narrow = isNarrow(); page.home.layout(); } else if (gl) gl.set(subGroup());
    lenis?.resize();
  }, 120);
});
document.addEventListener('visibilitychange', () => sound.visibility(document.hidden));

// snap to the nearest resting frame once the wheel stops (mouse and trackpad only)
if (lenis && gl && fine && !new URLSearchParams(location.search).has('nosnap')) {
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
    window.gsap.fromTo(gl, { assemble: 0 }, { assemble: 1, duration: 2, ease: 'none', delay: 0.45 });   // the floors stack into place as the scene appears
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
// ?debug exposes the internals and lets tweens run in real time even when frames are slow (software rendering)
if (new URLSearchParams(location.search).has('debug')) { window.__am = { gl, lenis, get page() { return page; } }; window.addEventListener('load', () => { window.gsap?.ticker.lagSmoothing(0); const k = +new URLSearchParams(location.search).get('slow'); if (k) window.gsap.globalTimeline.timeScale(k); }); }
