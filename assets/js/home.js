// The homepage director. Scroll position, in viewport heights (p), decides everything.
// The page is the A, read floor by floor: the hero shows the whole A, the contents explode it, then every floor
// rises into its section, compiles (guides, glass, picture, words) and, once read, flies into the small A on the left.
// At the bottom the A rebuilds itself and lands as the first letter of the name.
import { lettersIn, split } from './ui.js';
import { MARK } from './mark.js';
import { Toy } from './toy.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const ramp = (p, a, b) => smooth(clamp((p - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;
const lerpRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), h: lerp(a.h, b.h, t) });
const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
// a box the whole A sits in: centre and px per mark unit
const boxOf = (el, square = false) => { const r = rectOf(el); return { x: r.x, y: r.y, u: (square ? Math.min(r.w, r.h) : r.w) / 100 }; };

export class Home {
  constructor({ main, gl, lenis, sound, narrow }) {
    this.main = main; this.gl = gl; this.lenis = lenis; this.sound = sound; this.narrow = narrow;
    this.on = {}; this.flags = {}; this.read = [];
    this.secs = [...main.querySelectorAll('.sec')].map((el) => ({ el, name: el.dataset.sec, floor: el.dataset.floor != null ? +el.dataset.floor : null, pin: el.querySelector('.pin') }));
    this.byName = Object.fromEntries(this.secs.map((s) => [s.name, s]));
    this.videos = [...main.querySelectorAll('.cap-video')];
    this.otMark = main.querySelector('.ot-mark');
    this.ground = main.querySelector('.ot-ground');
    this.otText = [...main.querySelectorAll('.ot-rest, .ot-line')];
    this.dock = document.querySelector('.dock');
    this.dockRects = [...document.querySelectorAll('.dock-a rect')];
    this.dockItems = [...document.querySelectorAll('.dock-list li')];
    main.querySelectorAll('[data-split]').forEach((el) => split(el));

    // what each slab carries inside its glass
    const slug = (i) => main.querySelector(`.slot[data-slab="${i}"] [data-shatter]`)?.getAttribute('href')?.match(/work\/([^/]+)\//)?.[1];
    const setTextures = () => {
      for (const sl of gl.slabs) { const s = slug(sl.i); if (s && gl.projectTex?.[s]) gl.setContent(sl.i, { texture: gl.projectTex[s] }); }
    };
    gl.ready.then(setTextures); setTextures();
    const capSlot = main.querySelector('.fl-caps .slot');
    if (capSlot && this.videos.length) gl.setContent(+capSlot.dataset.slab, { videos: this.videos });

    // hovering a project lifts its slab
    this.cleanup = [];
    main.querySelectorAll('.fl-projects .slot, .fl-projects .under').forEach((el) => {
      const i = el.classList.contains('slot') ? +el.dataset.slab : +el.querySelector('[data-shatter]').dataset.shatter;
      const on = () => { gl.setSlab(i, { hover: 1 }); el.closest('.pin').classList.add('is-hover'); sound.note(i, 0.5); };
      const off = () => { gl.setSlab(i, { hover: 0 }); el.closest('.pin').classList.remove('is-hover'); };
      el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
    });
    // every floor plays its notes under the pointer: in the dock and in the contents
    const play = (e) => { const b = e.target.closest?.('[data-to]'); if (b && !b.contains(e.relatedTarget)) MARK.extent(+b.dataset.to).slabs.forEach((sl, k) => sound.note(sl.i, k ? 0.4 : 0.6)); };
    document.addEventListener('pointerover', play); this.cleanup.push(() => document.removeEventListener('pointerover', play));
    const jump = (e) => { const b = e.target.closest('[data-to]'); if (b) this.goTo(+b.dataset.to); };
    document.addEventListener('click', jump); this.cleanup.push(() => document.removeEventListener('click', jump));
    // copy the email address
    main.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch (e) { b.textContent = b.dataset.copy; }
      setTimeout(() => { b.textContent = 'Copy'; }, 1800);
    }));

    // the toy at the landing: mouse and trackpad only
    if (matchMedia('(pointer: fine)').matches) this.toy = new Toy({ gl, sound });
    this.last = performance.now();

    this.layout();
    if (document.fonts?.ready) document.fonts.ready.then(() => this.layout());
  }

  layout() {
    this.vh = window.innerHeight;
    const len = matchMedia('(pointer: fine)').matches ? 1 : 1.3;
    for (const s of this.secs) s.el.style.setProperty('--len', s.name === 'outro' ? 1.4 : len);
    for (const s of this.secs) s.p = s.el.offsetTop / this.vh;
    const B = this.byName;
    this.P = { hero: B.hero.p, toc: B.toc.p, outro: B.outro.p, f: [B.hero.p, ...[1, 2, 3, 4, 5, 6].map((f) => B['f' + f].p)] };
    this.P.land = this.P.f[6] + 0.74;                 // the A rebuilt, standing on the ground
    this.snaps = [this.P.hero, this.P.toc, ...this.P.f.slice(1), this.P.land, this.P.outro];

    // every place a slab can be, in CSS px
    this.slot = []; this.dockAt = [];
    for (const sl of MARK.slabs) {
      const el = this.main.querySelector(`.fl .slot[data-slab="${sl.i}"]`);
      this.slot[sl.i] = el ? rectOf(el) : { x: window.innerWidth / 2, y: this.vh / 2, h: 10 };
      const d = this.dockRects[sl.i];
      this.dockAt[sl.i] = d ? rectOf(d) : { x: 0, y: this.vh / 2, h: 2 };
    }
    this.gl.setPanes(this.slot.map((r) => r.h));
    const toc = this.main.querySelector('.toc-a');
    this.box = { hero: boxOf(this.main.querySelector('.hero-a')), toc: boxOf(toc), spread: +toc.dataset.spread || 1.9 };
    this.box.outro = this.otMark ? boxOf(this.otMark, true) : this.box.hero;
    const lu = Math.min(this.vh * 0.0056, window.innerWidth * 0.0104);
    this.box.land = { x: window.innerWidth / 2, y: this.vh * 0.5, u: lu };
    if (this.ground) this.ground.style.top = `${this.vh * 0.5 + 50 * lu + 10}px`;   // just under the A's feet
  }

  goTo(floor) {
    const p = floor === 0 ? this.P.hero : this.P.f[floor];
    if (p != null) this.lenis.scrollTo(p * this.vh, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 3) });
  }

  // after the wheel stops, glide to the nearest resting frame (desktop only)
  maybeSnap(scroll) {
    const p = scroll / this.vh;
    const last = this.snaps[this.snaps.length - 1];
    if (p > last + 0.3) return;                      // footer: free scroll
    let best = this.snaps[0];
    for (const s of this.snaps) if (Math.abs(s - p) < Math.abs(best - p)) best = s;
    if (Math.abs(best - p) < 0.01) return;
    this.lenis.scrollTo(best * this.vh, { duration: 1, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  }

  // fires once when a layer comes up
  activate(pin) {
    pin.querySelectorAll(':scope [data-split]').forEach((el, i) => lettersIn(el, { delay: 0.1 + i * 0.06, onLetter: () => this.sound.tick() }));
    const lines = pin.querySelectorAll('.hl-line');
    if (lines.length && window.gsap && !pin.querySelector('.st-in')) {
      window.gsap.fromTo(lines, { '--hl': 0, '--hlt': 0 }, { '--hl': 1, duration: 0.6, ease: 'power3.out', stagger: 0.12, delay: 0.15 });
      window.gsap.to(lines, { '--hlt': 1, duration: 0.4, ease: 'power2.out', stagger: 0.12, delay: 0.5, onStart: () => this.sound.tick() });
    }
    const fade = pin.querySelectorAll('.eyebrow, .hero-intro, .toc-text, .st-sub, .st-in .hl-line, .pr-meta, .pr-line, .pr-kind, .cap-count, .cap-text, .cap-list, .slot-in > *, .base-mid, .ot-line');
    if (fade.length && window.gsap) window.gsap.fromTo(fade, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', delay: 0.25, stagger: 0.05 });
  }

  update(scroll) {
    const p = scroll / this.vh; this.p = p;
    const edgeOnce = (key, v) => { const was = this.flags[key]; this.flags[key] = v; return v && !was; };
    const { P, gl } = this, F = P.f, vh = this.vh;

    // ---------- the A as one object: hero box → exploded contents → the wordmark ----------
    const toToc = ramp(p, P.hero + 0.1, P.toc - 0.05);
    const toOut = p > F[6] + 0.05 ? 1 : 0;
    const bh = this.box.hero, bt = this.box.toc;
    // the outro: the A lands big in the middle of the screen, then settles into the wordmark
    const settle = ramp(p, P.outro - 0.24, P.outro - 0.03);
    const bl = this.box.land, bw = this.box.outro;
    const bo = { x: lerp(bl.x, bw.x, settle), y: lerp(bl.y, bw.y, settle), u: lerp(bl.u, bw.u, settle) };
    const gx = toOut ? bo.x : lerp(bh.x, bt.x, toToc), gy = toOut ? bo.y : lerp(bh.y, bt.y, toToc), gu = toOut ? bo.u : lerp(bh.u, bt.u, toToc);
    const spread = toOut ? 1 : lerp(1, this.box.spread, toToc);
    const flat = ramp(p, P.outro - 0.18, P.outro - 0.01);

    // ---------- each slab ----------
    const outroStart = F[6] + 0.08;
    for (const sl of MARK.slabs) {
      const f = sl.floor, i = sl.i;
      const side = MARK.extent(f).slabs.length > 1 && MARK.extent(f).slabs[1].i === i ? 0.06 : 0;   // split floors: right slab a beat later
      const S = this.slot[i], D = this.dockAt[i];
      // waiting below the screen at the size it has in the exploded A; it grows as it rises into its floor
      const W = { x: S.x, y: vh * 1.18 + S.h * 0.2, h: MARK.h * this.box.toc.u };
      let free = W, g = 1, z = 0, dockT = 0, inT = 0;
      if (f === 0) {
        const t = ramp(p, P.toc + 0.05, F[1] - 0.1);
        g = 1 - t; free = D; dockT = t; z = Math.sin(Math.PI * t) * 0.4;
      } else {
        const leave = f === 1 ? 0 : ramp(p, P.toc + 0.1, P.toc + 0.7);        // the rest of the A drops below the screen
        const prev = f === 1 ? P.toc : F[f - 1];
        inT = ramp(p, prev + 0.12 + side, F[f] - 0.18 + side);
        const outT = f === 6 ? 0 : ramp(p, F[f] + 0.12 + side, F[f + 1] - 0.15 + side);
        free = f === 1 ? S : lerpRect(W, S, inT);
        if (outT > 0) {
          // to the dock along a curve: across first, then up
          const tx = smooth(clamp(outT * 1.25)), ty = smooth(clamp(outT * 1.25 - 0.25));
          free = { x: lerp(S.x, D.x, tx), y: lerp(S.y, D.y, ty), h: lerp(S.h, D.h, smooth(outT)) };
          z = Math.sin(Math.PI * outT) * 0.5;
        }
        dockT = outT;
        g = f === 1 ? 1 - inT : 1 - Math.max(leave, inT > 0 ? 1 : 0);
        if (inT > 0 && inT < 1) z = -(1 - inT) * 0.6;
      }
      // the outro: everything flies back into the A, bottom floor first
      const back = ramp(p, outroStart + (6 - f) * 0.05, outroStart + 0.34 + (6 - f) * 0.05);
      if (back > 0) { g = back; z = Math.sin(Math.PI * back) * 0.35; }
      const develop = ramp(p, F[f] - 0.42, F[f] - 0.02) * (1 - ramp(p, F[f] + 0.15, F[f] + 0.6));
      const hide = dockT > 0.995 && back === 0 ? 1 : 0;
      gl.setSlab(i, { g, x: free.x, y: free.y, h: free.h, z, develop: f >= 2 && f <= 4 ? develop : 0, hide, frost: f === 6 ? 0.42 : -1 });
      // the dock shows what has been read
      const r = this.dockRects[i];
      if (r) {
        const was = this.read[i], now = dockT > 0.97 && back < 0.5;
        if (was !== now) {
          this.read[i] = now; r.classList.toggle('is-read', now);
          this.sound.hold(i, now);                         // the floor joins the chord
          if (now && was === false) this.sound.note(i, 0.8);
        }
      }
    }

    // ---------- the canvas ----------
    const after = p > F[2];
    gl.set({
      gx, gy, gu, spread, gz: 0,
      spin: 1 - toToc, mrx: 0, mry: 0,
      frost: lerp(0.14, 0.32, toToc) * (1 - toOut) + 0.12 * toOut,
      wall: lerp(1, 0.45, toToc) * (1 - ramp(p, P.toc + 0.2, F[1])) + 0.05,
      curtain: after ? 0 : ramp(p, P.toc + 0.3, F[1] - 0.1),
      dissolve: after ? 0 : ramp(p, F[1] + 0.25, F[2] - 0.3),
      signal: ramp(p, F[5] - 0.35, F[5] - 0.05) * (1 - ramp(p, F[5] + 0.2, F[5] + 0.6)),
      flat, sub: 0, grid: 1, camZ: 7,
    });
    if (this.otMark) this.otMark.style.setProperty('--ot-flat', flat.toFixed(3));
    const ground = ramp(p, P.land - 0.2, P.land - 0.02) * (1 - ramp(p, P.land + 0.04, P.outro - 0.1));
    for (const el of this.otText) el.style.opacity = ramp(p, P.outro - 0.16, P.outro - 0.02).toFixed(3);
    if (this.ground) { this.ground.style.opacity = ground.toFixed(3); this.ground.classList.toggle('is-on', ground > 0.5); }
    if (edgeOnce('land', ground > 0.6)) this.sound.chord();
    if (this.toy) {
      const now = performance.now(), dt = (now - this.last) / 1000; this.last = now;
      const on = Math.abs(p - P.land) < 0.06;
      if (on) { this.toy.box = this.box.land; this.toy.active = true; this.toy.step(dt); }
      else if (this.toy.active) { this.toy.active = false; this.toy.reset(); }
    }

    // ---------- text layers ----------
    const win = (c, a = 0.3, b = 0.47) => 1 - ramp(Math.abs(p - c), a, b);
    for (const s of this.secs) {
      let o;
      if (s.name === 'hero') o = 1 - ramp(p, 0.12, 0.42);
      else if (s.name === 'outro') o = ramp(p, P.land - 0.25, P.land - 0.05);
      else if (s.name === 'toc') o = win(P.toc, 0.22, 0.42);
      else o = win(s.p);
      s.pin.style.opacity = o.toFixed(3);
      s.pin.classList.toggle('is-on', o > 0.02);
      const up = s.name === 'outro' ? settle > 0.6 : o > 0.6;
      if (up && !this.on[s.name]) this.activate(s.pin);
      this.on[s.name] = up;
      if (s.floor >= 1) {
        // compile: guides draw before the glass lands; the ink floor fills once it has
        s.pin.style.setProperty('--g', ramp(p, s.p - 0.75, s.p - 0.3).toFixed(3));
        s.pin.style.setProperty('--fill', ramp(p, s.p - 0.22, s.p - 0.02).toFixed(3));
      }
    }

    // ---------- sound cues ----------
    const edge = (key, v) => { const was = this.flags[key]; this.flags[key] = v; return v && !was; };
    const lightAmt = after ? 0 : ramp(p, P.toc + 0.3, F[1] - 0.1);
    if (edge('wipe', lightAmt > 0.04 && lightAmt < 0.9)) this.sound.play('wipe', { gain: 0.55 });
    if (edge('toc', toToc > 0.4 && toToc < 0.9)) this.sound.play('work-in', { gain: 0.45 });

    // videos only run while the capabilities floor is near
    const vids = Math.abs(p - F[2]) < 0.9;
    if (vids !== this.vidsOn) { this.vidsOn = vids; this.videos.forEach((v) => (vids ? v.play().catch(() => {}) : v.pause())); }

    // ---------- chrome ----------
    const light = (after ? 0 : ramp(p, P.toc + 0.3, F[1] - 0.1)) * (1 - (after ? 0 : ramp(p, F[1] + 0.25, F[2] - 0.3)));
    document.body.classList.toggle('is-light', light > 0.5);
    document.body.classList.toggle('is-end', p > P.outro - 0.3);
    document.body.classList.toggle('is-top', p < 0.4);
    if (this.dock) this.dock.style.setProperty('--dock', (ramp(p, P.toc - 0.3, P.toc + 0.1) * (1 - ramp(p, F[6] + 0.3, P.outro - 0.3))).toFixed(3));
    let here = 0; for (let f = 1; f <= 6; f++) if (p > F[f] - 0.5) here = f;
    if (here !== this.here) {
      this.here = here;
      this.dockRects.forEach((r, i) => r.classList.toggle('is-here', p > P.toc - 0.3 && MARK.slabs[i].floor === here));
      this.dockItems.forEach((li, f) => li.classList.toggle('is-here', f === here));
    }
  }

  destroy() {
    this.videos.forEach((v) => v.pause());
    this.cleanup.forEach((f) => f());
    this.toy?.destroy();
    this.gl.resetSlabs();
    this.dockRects.forEach((r) => r.classList.remove('is-read', 'is-here'));
    MARK.slabs.forEach((sl) => this.sound.hold(sl.i, false));
    document.body.classList.remove('is-light', 'is-end', 'is-top');
  }
}
