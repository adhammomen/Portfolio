// Opt-in sound: an ambient loop and three short effects, played through Web Audio.
// The choice is remembered per browser; nothing plays until the visitor turns it on.
const url = (n) => new URL(`../sound/${n}.mp3`, import.meta.url).href;
const KEY = 'am-sound';

export class Sound {
  constructor() {
    this.on = false; this.ctx = null; this.buffers = {}; this.lastTick = 0;
    this.toggles = [];
  }

  get choice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  remember(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: ask again next time */ } }

  async load(name) {
    if (this.buffers[name]) return this.buffers[name];
    const res = await fetch(url(name));
    const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
    this.buffers[name] = buf; return buf;
  }

  async enable() {
    this.remember('on');
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination);
    }
    await this.ctx.resume();
    this.on = true; this.sync();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now); this.master.gain.setTargetAtTime(1, now, 0.6);
    if (!this.ambient) {
      const buf = await this.load('ambient').catch(() => null); if (!buf || !this.on) return;
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      // MP3 encoders pad both ends; loop inside the padding so the seam stays silent
      src.loopStart = 0.06; src.loopEnd = buf.duration - 0.06;
      const g = this.ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.42, this.ctx.currentTime, 1.2);
      src.connect(g).connect(this.master); src.start(0, 0.06);
      this.ambient = { src, g };
    }
    ['work-in', 'wipe', 'tick'].forEach((n) => this.load(n).catch(() => {}));
  }

  disable() {
    this.remember('off');
    this.on = false; this.sync();
    if (this.ctx) { const now = this.ctx.currentTime; this.master.gain.cancelScheduledValues(now); this.master.gain.setTargetAtTime(0, now, 0.25); }
  }

  toggle() { return this.on ? this.disable() : this.enable(); }

  play(name, { gain = 0.6, rate = 1 } = {}) {
    if (!this.on || !this.ctx || !this.buffers[name]) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.buffers[name]; src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(g).connect(this.master); src.start();
  }

  tick() {
    const t = performance.now(); if (t - this.lastTick < 38) return; this.lastTick = t;
    this.play('tick', { gain: 0.16, rate: 0.9 + Math.random() * 0.3 });
  }

  // pause with the tab, resume when it comes back
  visibility(hidden) { if (!this.ctx) return; if (hidden) this.ctx.suspend(); else if (this.on) this.ctx.resume(); }

  bind(btn) { this.toggles.push(btn); btn.addEventListener('click', () => this.toggle()); this.sync(); }
  sync() { this.toggles.forEach((b) => { b.setAttribute('aria-pressed', String(this.on)); const l = b.querySelector('.hd-sound-label'); if (l) l.textContent = this.on ? 'Sound on' : 'Sound'; }); }
}
