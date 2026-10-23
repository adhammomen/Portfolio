// The homepage director. Scroll position, in viewport heights (p), decides everything: where the mark is,
// what the canvas shows, which text layer is up, when the light passage wipes in, where scrolling comes to rest.
import { lettersIn, split } from './ui.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const ramp = (p, a, b) => smooth(clamp((p - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;
// opacity window: fades in over [a - f, a], out over [b, b + f]
const win = (p, a, b, f = 0.3) => ramp(p, a - f, a) * (1 - ramp(p, b, b + f));

export class Home {
  constructor({ main, gl, lenis, sound, narrow }) {
    this.main = main; this.gl = gl; this.lenis = lenis; this.sound = sound; this.narrow = narrow;
    this.secs = {}; this.on = {}; this.flags = {};
    this.workIdx = -1; this.capIdx = -1;
    for (const el of main.querySelectorAll('.sec')) {
      const name = el.dataset.sec;
      el.style.setProperty('--len', el.dataset.len);
      this.secs[name] = { el, pin: el.querySelector('.pin'), len: +el.dataset.len };
    }
    this.workItems = [...main.querySelectorAll('.wk-item')];
    this.capItems = [...main.querySelectorAll('.cap-item')];
    this.videos = [...main.querySelectorAll('.cap-video')];
    this.otMark = main.querySelector('.ot-mark');
    gl.setVideos(this.videos);
    main.querySelectorAll('[data-split]').forEach((el) => split(el));
    this.ruler = [...document.querySelectorAll('.ruler li')];
    this.ruler.forEach((li) => li.querySelector('button').onclick = () => this.goTo(li.dataset.to));
    this.layout();
  }

  layout() {
    this.vh = window.innerHeight;
    for (const k in this.secs) {
      const s = this.secs[k];
      s.s = s.el.offsetTop / this.vh; s.e = s.s + s.len;
    }
    const S = this.secs;
    const nW = this.workItems.length, nC = this.capItems.length;
    const maxP = (document.documentElement.scrollHeight - this.vh) / this.vh;
    this.snaps = [0, S.workintro.s + 0.5, ...Array.from({ length: nW }, (_, i) => S.work.s + 0.3 + i), S.statement.s + 0.55, S.signal.s + 0.75,
      ...Array.from({ length: nC }, (_, i) => S.capabilities.s + 0.4 + i), S.flagship.s + 0.55, S.outro.s + 1.0].map((v) => Math.min(v, maxP));
    this.anchor = { hero: 0, work: S.work.s + 0.3, statement: S.statement.s + 0.55, signal: S.signal.s + 0.75, capabilities: S.capabilities.s + 0.4, flagship: S.flagship.s + 0.55 };
    this.buildTracks();
  }

  // camera + mark keyframes. Each property interpolates (smoothstep) between the keyframes that mention it.
  buildTracks() {
    const S = this.secs, n = this.narrow;
    const K = [
      [0, n ? { mx: 0, my: 0.55, mz: 0, ms: 0.85, spin: 1, frost: 0.14, wall: 1, mry: 0, camZ: 7 } : { mx: 1.05, my: 0.08, mz: 0, ms: 1.22, spin: 1, frost: 0.14, wall: 1, mry: 0, camZ: 7 }],
      [S.workintro.s + 0.2, { mx: 0, my: n ? 0.3 : 0.05, ms: n ? 0.8 : 1.0, wall: 0.75 }],
      [S.work.s + 0.1, n ? { mx: 0.78, my: 2.05, ms: 0.2, wall: 0.38, frost: 0.1 } : { mx: 2.75, my: 1.32, ms: 0.3, wall: 0.38, frost: 0.1 }],
      [S.work.e - 0.9, n ? { mx: 0.78, my: 2.05, ms: 0.2, wall: 0.38 } : { mx: 2.75, my: 1.32, ms: 0.3, wall: 0.38 }],
      [S.workout.s + 0.25, { mx: 0, my: 0, ms: n ? 0.9 : 1.1, wall: 0.9, frost: 0.14 }],
      [S.workout.e, { ms: 4.2, frost: 0.42, wall: 1 }],
      [S.statement.s + 0.1, { ms: n ? 0.95 : 1.3, frost: 0.14, my: n ? 0.6 : 0.05, mx: 0, wall: 0.6, spin: 0.5 }],
      [S.signal.s + 0.1, { spin: 0, mry: 0, ms: n ? 0.95 : 1.3, my: n ? 0.8 : 0.05 }],
      [S.signalout.e - 0.2, { spin: 0, ms: n ? 0.9 : 1.15, my: n ? 0.6 : 0 }],
      [S.capabilities.s + 0.1, n ? { mx: 0, my: 0, ms: 0.001, wall: 0.22, spin: 1 } : { mx: 2.9, my: 1.35, ms: 0.26, wall: 0.22, spin: 1 }],
      [S.capabilities.e - 0.6, n ? { mx: 0, my: 0, ms: 0.001, wall: 0.22 } : { mx: 2.9, my: 1.35, ms: 0.26, wall: 0.22 }],
      [S.flagship.s + 0.3, { mx: 0, my: n ? 0.4 : 0, mz: -1.2, ms: n ? 1.1 : 1.7, frost: 0.55, wall: 0.5 }],
      [S.flagship.e - 0.3, { mx: 0, my: n ? 0.4 : 0, mz: -1.2, ms: n ? 1.1 : 1.7, frost: 0.55, wall: 0.5 }],
      [S.outro.s + 0.55, { mx: 0, my: 0, mz: 0, ms: 0.5, frost: 0.12, wall: 0.12, spin: 0, mry: 0 }],   // patched each frame to land on the wordmark
    ];
    this.outroKey = K[K.length - 1][1];
    const tracks = {};
    for (const [at, st] of K) for (const k in st) (tracks[k] ||= []).push([at, st[k], st]);
    this.tracks = tracks;
  }

  sample(p) {
    const out = {};
    for (const k in this.tracks) {
      const tr = this.tracks[k];
      const val = (i) => (tr[i][2] === this.outroKey ? this.outroKey[k] : tr[i][1]);
      if (p <= tr[0][0]) { out[k] = val(0); continue; }
      if (p >= tr[tr.length - 1][0]) { out[k] = val(tr.length - 1); continue; }
      for (let i = 0; i < tr.length - 1; i++) {
        if (p >= tr[i][0] && p <= tr[i + 1][0]) { out[k] = lerp(val(i), val(i + 1), smooth((p - tr[i][0]) / (tr[i + 1][0] - tr[i][0]))); break; }
      }
    }
    return out;
  }

  goTo(name) { const p = this.anchor[name]; if (p != null) this.lenis.scrollTo(p * this.vh, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 3) }); }

  // after the wheel stops, glide to the nearest resting frame (desktop only)
  maybeSnap(scroll) {
    const p = scroll / this.vh;
    const last = this.snaps[this.snaps.length - 1];
    if (p > last + 0.35) return;                      // footer: free scroll
    let best = this.snaps[0];
    for (const s of this.snaps) if (Math.abs(s - p) < Math.abs(best - p)) best = s;
    if (Math.abs(best - p) < 0.01) return;
    this.lenis.scrollTo(best * this.vh, { duration: 1, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  }

  // fires once when a layer comes up
  activate(name, pin) {
    pin.querySelectorAll(':scope [data-split]').forEach((el) => {
      if (el.closest('.wk-item, .cap-item')) return;
      lettersIn(el, { delay: 0.1, onLetter: () => this.sound.tick() });
    });
    const lines = pin.querySelectorAll('.hl-line');
    if (lines.length && window.gsap) {
      window.gsap.fromTo(lines, { '--hl': 0, '--hlt': 0 }, { '--hl': 1, duration: 0.6, ease: 'power3.out', stagger: 0.12, delay: 0.15 });
      window.gsap.to(lines, { '--hlt': 1, duration: 0.4, ease: 'power2.out', stagger: 0.12, delay: 0.5, onStart: () => this.sound.tick() });
    }
    const fade = pin.querySelectorAll('.eyebrow, .hero-intro, .st-sub, .fl-text, .fl-spec, .fl-link, .ot-line, .wi-label');
    if (fade.length && window.gsap) window.gsap.fromTo(fade, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.3, stagger: 0.06 });
  }

  setItem(items, idx, key) {
    if (this[key] === idx) return;
    this[key] = idx;
    items.forEach((el, i) => el.classList.toggle('is-active', i === idx));
    const el = items[idx]; if (!el) return;
    const title = el.querySelector('[data-split]');
    if (title) lettersIn(title, { onLetter: () => this.sound.tick() });
    const rest = [...el.children].filter((c) => !c.matches('[data-split], picture, video'));
    if (window.gsap) window.gsap.fromTo(rest, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.25, stagger: 0.05 });
  }

  update(scroll) {
    const p = scroll / this.vh; this.p = p;
    const S = this.secs, gl = this.gl;
    const nW = this.workItems.length, nC = this.capItems.length;

    // land the mark on the A of the outro wordmark
    if (this.otMark && p > S.flagship.s) {
      const w = gl.rectToWorld(this.otMark.getBoundingClientRect(), gl.camZFor(7));
      Object.assign(this.outroKey, { mx: w.x, my: w.y, ms: w.s });
    }

    const t = this.sample(p);
    const after = p > S.signalout.e;
    const target = {
      ...t,
      word: win(p, S.workintro.s, S.work.s - 0.1, 0.45),
      wordX: lerp(this.narrow ? 2.5 : 6, this.narrow ? -2.5 : -6, clamp((p - (S.workintro.s - 0.6)) / (S.workintro.len + 1))),
      car: win(p, S.work.s - 0.05, S.workout.s - 0.1, 0.4),
      carIdx: clamp(p - (S.work.s + 0.3), 0, nW - 1),
      curtain: after ? 0 : ramp(p, S.statement.s - 0.7, S.statement.s + 0.2),
      dissolve: after ? 0 : ramp(p, S.signalout.s - 0.15, S.signalout.e - 0.15),
      bar: ramp(p, S.signal.s - 0.25, S.signal.s + 0.5) * (1 - ramp(p, S.signalout.s + 0.05, S.signalout.e - 0.1)),
      cap: win(p, S.capabilities.s - 0.05, S.capabilities.e - 0.55, 0.4),
      capIdx: clamp(p - (S.capabilities.s + 0.4), 0, nC - 1),
      flat: ramp(p, S.outro.s + 0.6, S.outro.s + 0.95),
      sub: 0, grid: 1, camX: 0, camY: 0, mz: t.mz ?? 0, mrx: 0,
    };
    gl.set(target);
    if (this.otMark) this.otMark.style.setProperty('--ot-flat', target.flat.toFixed(3));

    // text layers
    const layers = {
      hero: win(p, -1, S.hero.e - 0.6, 0.35),
      workintro: win(p, S.workintro.s - 0.15, S.workintro.e - 0.45),
      work: win(p, S.work.s - 0.05, S.work.e - 0.55),
      statement: win(p, S.statement.s - 0.05, S.statement.e - 0.4),
      signal: win(p, S.signal.s - 0.05, S.signal.e - 0.35),
      capabilities: win(p, S.capabilities.s - 0.1, S.capabilities.e - 0.55),
      flagship: win(p, S.flagship.s - 0.1, S.flagship.e - 0.4),
      outro: win(p, S.outro.s + 0.45, 1e9, 0.35),
    };
    for (const k in layers) {
      const pin = S[k].pin, o = layers[k];
      pin.style.opacity = o.toFixed(3);
      const on = o > 0.02; pin.classList.toggle('is-on', on);
      const up = o > 0.5;
      if (up && !this.on[k]) this.activate(k, pin);
      this.on[k] = up;
    }
    if (layers.work > 0.02) this.setItem(this.workItems, Math.round(target.carIdx), 'workIdx'); else this.workIdx = -1;
    if (layers.capabilities > 0.02) this.setItem(this.capItems, Math.round(target.capIdx), 'capIdx'); else this.capIdx = -1;

    // sound cues
    const edge = (key, v) => { const was = this.flags[key]; this.flags[key] = v; return v && !was; };
    if (edge('work', target.car > 0.5)) this.sound.play('work-in', { gain: 0.5 });
    if (edge('wipe', target.curtain > 0.04 && target.curtain < 0.9)) this.sound.play('wipe', { gain: 0.55 });
    if (edge('dissolve', target.dissolve > 0.04 && target.dissolve < 0.9)) this.sound.play('work-in', { gain: 0.4, rate: 0.8 });

    // videos only run while the capabilities are near
    const vids = p > S.capabilities.s - 1 && p < S.capabilities.e + 0.2;
    if (vids !== this.vidsOn) { this.vidsOn = vids; this.videos.forEach((v) => (vids ? v.play().catch(() => {}) : v.pause())); }

    // chrome
    const light = target.curtain * (1 - target.dissolve);
    document.body.classList.toggle('is-light', light > 0.5);
    document.body.classList.toggle('is-end', p > S.outro.s + 0.3);
    const group = p < S.workintro.s - 0.3 ? 'hero' : p < S.workout.e - 0.3 ? 'work' : p < S.signal.s - 0.3 ? 'statement' : p < S.signalout.e - 0.3 ? 'signal' : p < S.flagship.s - 0.3 ? 'capabilities' : 'flagship';
    this.ruler.forEach((li) => li.classList.toggle('is-on', li.dataset.to === group));
  }

  destroy() {
    this.videos.forEach((v) => v.pause());
    document.body.classList.remove('is-light', 'is-end');
  }
}
