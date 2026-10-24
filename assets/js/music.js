// The music, generated live: every slab of the A owns one note of D Lydian. A quiet drone holds D and A;
// each floor you read joins the chord as a soft voice; docking or hovering a floor plays its note;
// when the A lands, the whole chord rings out. The amber floor holds G#, the raised fourth that makes it a signal.
// Nothing here makes a sound until the visitor turns sound on (see sound.js).
import { MARK } from './mark.js';

// MIDI note per slab, in slab order (top floor first): E5, C#5, A4, E4 F#4, A3 C#4, G#3 (amber), D2 A2
export const NOTES = [76, 73, 69, 64, 66, 57, 61, 56, 38, 45];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Music {
  constructor(ctx, out) {
    this.ctx = ctx;
    // a shared room: a generated impulse response, a little darker than it is long
    this.bus = ctx.createGain(); this.bus.gain.value = 0.9;
    const verb = ctx.createConvolver(); verb.buffer = this.impulse(3.2);
    const wet = ctx.createGain(); wet.gain.value = 0.42;
    this.bus.connect(out); this.bus.connect(verb); verb.connect(wet); wet.connect(out);

    // the drone: D2 and A2, slowly breathing through a low-pass
    this.drone = this.voice([38, 45], 0.05, 420);
    // one held voice per slab, silent until its floor has been read
    this.pads = NOTES.map((m, i) => this.voice([m], 0, MARK.slabs[i].amber ? 2600 : 1500));
    this.lastPluck = new Map();
  }

  impulse(sec) {
    const n = Math.floor(this.ctx.sampleRate * sec), b = this.ctx.createBuffer(2, n, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) { lp += 0.35 * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - i / n, 2.6); }
    }
    return b;
  }

  // a held voice: two slightly detuned oscillators per note through a breathing filter
  voice(notes, level, cutoff) {
    const c = this.ctx, g = c.createGain(); g.gain.value = level;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.4;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.05 + Math.random() * 0.05; lg.gain.value = cutoff * 0.35;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    for (const m of notes) for (const [type, det, v] of [['triangle', -4, 0.5], ['sine', 3, 0.6]]) {
      const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = hz(m); o.detune.value = det; og.gain.value = v;
      o.connect(og); og.connect(f); o.start();
    }
    f.connect(g); g.connect(this.bus);
    return g;
  }

  // a floor has been read (or un-read, scrolling back up): its voice fades in or out of the chord
  hold(i, on) {
    const g = this.pads[i]; if (!g) return;
    const low = NOTES[i] < 50;
    g.gain.setTargetAtTime(on ? (low ? 0.05 : 0.022) : 0, this.ctx.currentTime, on ? 1.4 : 0.6);
  }

  // one struck note: a soft bell, an octave partial on top
  pluck(i, level = 1, when = 0) {
    const now = this.ctx.currentTime;
    if (!when && now - (this.lastPluck.get(i) || 0) < 0.12) return;   // hovering back and forth shouldn't machine-gun
    this.lastPluck.set(i, now);
    const t = now + when, c = this.ctx, f = hz(NOTES[i]), amber = MARK.slabs[i].amber;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((amber ? 0.2 : 0.14) * level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0005, t + (f < 150 ? 5 : 3.2));
    g.connect(this.bus);
    for (const [mul, type, v] of [[1, 'triangle', 1], [2, 'sine', amber ? 0.45 : 0.22], [3.01, 'sine', 0.06]]) {
      const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = f * mul; og.gain.value = v;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 5.2);
    }
  }

  // the A is whole: strum the chord from the ground up
  chord() { [8, 9, 7, 5, 6, 3, 4, 2, 1, 0].forEach((i, k) => this.pluck(i, 0.9, k * 0.075)); }
}
