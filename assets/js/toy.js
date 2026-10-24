// The toy at the bottom of the homepage: once the A stands rebuilt on the ground, pull a floor out.
// Throw it and it flies off; the floors above drop into the gap, each sounding the note of the floor it lands on;
// a few seconds later the missing floor slides back in and the A plays its chord. Mouse and trackpad only.
import { MARK } from './mark.js';

const STEP = MARK.slabs.find((s) => s.floor === 1).y - MARK.slabs[0].y;   // one floor, in mark units
const GRAVITY = 520;                                                         // mark units / s²

export class Toy {
  constructor({ gl, sound }) {
    this.gl = gl; this.sound = sound;
    this.s = MARK.slabs.map(() => ({ dx: 0, dy: 0, vx: 0, vy: 0, rot: 0, vr: 0, ty: 0, fly: false, landed: true }));
    this.active = false; this.box = null; this.drag = null; this.rebuildAt = 0; this.doneAt = 0; this.busy = false;
    this.onDown = (e) => this.down(e); this.onMove = (e) => this.move(e); this.onUp = (e) => this.up(e);
    window.addEventListener('pointerdown', this.onDown); window.addEventListener('pointermove', this.onMove); window.addEventListener('pointerup', this.onUp);
  }

  // which slab is under the pointer, in the A standing at box (centre px, px per mark unit)
  hit(x, y) {
    if (!this.box) return -1;
    const { x: cx, y: cy, u } = this.box;
    for (const sl of MARK.slabs) {
      const st = this.s[sl.i];
      const l = cx + (sl.x - 50 + st.dx) * u, t = cy + (sl.y - 50 + st.dy) * u;
      if (x >= l && x <= l + sl.w * u && y >= t && y <= t + sl.h * u) return sl.i;
    }
    return -1;
  }

  down(e) {
    if (!this.active || this.busy || e.button !== 0) return;
    const i = this.hit(e.clientX, e.clientY); if (i < 0) return;
    e.preventDefault();
    const st = this.s[i];
    this.drag = { i, x0: e.clientX, y0: e.clientY, dx0: st.dx, dy0: st.dy, last: [e.clientX, e.clientY, performance.now()], v: [0, 0] };
    document.body.classList.add('is-grabbing');
    this.sound.note(i, 0.5);
  }

  move(e) {
    if (!this.active) { document.body.classList.remove('is-grab'); return; }
    const d = this.drag;
    if (!d) { document.body.classList.toggle('is-grab', !this.busy && this.hit(e.clientX, e.clientY) >= 0); return; }
    const st = this.s[d.i], u = this.box.u, now = performance.now();
    st.dx = d.dx0 + (e.clientX - d.x0) / u; st.dy = d.dy0 + (e.clientY - d.y0) / u;
    const dt = Math.max(0.008, (now - d.last[2]) / 1000);
    d.v = [((e.clientX - d.last[0]) / u) / dt * 0.5 + d.v[0] * 0.5, ((e.clientY - d.last[1]) / u) / dt * 0.5 + d.v[1] * 0.5];
    d.last = [e.clientX, e.clientY, now];
    st.rot = -st.dx * 0.004;
  }

  up() {
    const d = this.drag; if (!d) return;
    this.drag = null; document.body.classList.remove('is-grabbing');
    const sl = MARK.slabs[d.i], st = this.s[d.i];
    const pulled = Math.abs(st.dx) > sl.w * 0.55 || Math.abs(st.dy) > STEP * 0.9;
    if (!pulled) return;                                    // not far enough: it springs back
    st.fly = true; st.vx = d.v[0]; st.vy = Math.min(d.v[1], -40); st.vr = (Math.random() - 0.5) * 9;
    // what it held up drops one floor. Pull a wide floor and everything above falls; pull one side of a split
    // floor and only that side falls, up to the first wide floor, which the other side still holds
    const split = MARK.extent(sl.floor).slabs.length > 1;
    for (let f = sl.floor - 1; f >= 0; f--) {
      const above = MARK.extent(f).slabs;
      if (split && above.length < 2) break;
      for (const o of above) if (!split || (o.x < 50) === (sl.x < 50)) { this.s[o.i].ty = STEP; this.s[o.i].landed = false; }
    }
    this.busy = true;
    this.rebuildAt = performance.now() + 2600;
    this.thrown = d.i;
  }

  rebuild() {
    const st = this.s[this.thrown];
    // it slides back in from the side it was thrown to, while the floors it held rise back up
    Object.assign(st, { fly: false, dx: st.dx < 0 ? -120 : 120, dy: 0, vx: 0, vy: 0, rot: 0, vr: 0, landed: true });
    for (const o of this.s) { o.ty = 0; }
    this.doneAt = performance.now() + 1600;
  }

  step(dt) {
    dt = Math.min(dt, 0.033);
    const now = performance.now();
    if (this.rebuildAt && now > this.rebuildAt) { this.rebuildAt = 0; this.rebuild(); }
    if (this.doneAt && now > this.doneAt) { this.doneAt = 0; this.busy = false; this.sound.chord(); }
    MARK.slabs.forEach((sl) => {
      const st = this.s[sl.i];
      if (this.drag?.i === sl.i) { /* held: it goes where the pointer says */ }
      else if (st.fly) {
        st.vy += GRAVITY * dt; st.dx += st.vx * dt; st.dy += st.vy * dt; st.rot += st.vr * dt;
      } else {
        // springs: home in x and rotation; a bouncy fall onto ty
        const was = st.dy;
        st.vx += (-st.dx * 140 - st.vx * 14) * dt; st.dx += st.vx * dt;
        st.vy += ((st.ty - st.dy) * 170 - st.vy * 9) * dt; st.dy += st.vy * dt;
        st.vr += (-st.rot * 120 - st.vr * 12) * dt; st.rot += st.vr * dt;
        if (!st.landed && was < st.ty && st.dy >= st.ty && st.vy > 0) {
          st.landed = true;
          // it sounds the floor it landed on: the note of the slab that sat there
          const below = MARK.slabs.find((o) => o.floor === Math.min(6, sl.floor + Math.round(st.ty / STEP)) && (o.x < 50) === (sl.x < 50)) || sl;
          this.sound.note(below.i, 0.55);
        }
      }
      this.gl.setSlab(sl.i, { dx: st.dx, dy: st.dy, rot: st.rot });
    });
  }

  reset() {
    this.s.forEach((st) => Object.assign(st, { dx: 0, dy: 0, vx: 0, vy: 0, rot: 0, vr: 0, ty: 0, fly: false, landed: true }));
    this.busy = false; this.rebuildAt = 0; this.doneAt = 0; this.drag = null;
    MARK.slabs.forEach((sl) => this.gl.setSlab(sl.i, { dx: 0, dy: 0, rot: 0 }));
    document.body.classList.remove('is-grab', 'is-grabbing');
  }

  destroy() {
    this.reset();
    window.removeEventListener('pointerdown', this.onDown); window.removeEventListener('pointermove', this.onMove); window.removeEventListener('pointerup', this.onUp);
  }
}
