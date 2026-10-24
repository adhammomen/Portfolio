// The mark: an A built floor by floor. Seven slabs follow the silhouette of an open A; the sixth floor
// spans both legs and is the amber one (the crossbar, and later the Signal bar).
// Units: a 100 x 100 box, y pointing down. The loader, header, footer, favicon and the 3D glass all read this.
const BODY = [[43, 0], [57, 0], [92, 100], [73, 100], [50, 34], [27, 100], [8, 100]];   // the silhouette the floors are cut from
const FLOORS = 7, H = 11, STEP = (100 - H) / (FLOORS - 1), CROSS = 5, RADIUS = 1.6;
const r1 = (v) => Math.round(v * 10) / 10;

function floors() {
  const slabs = [];
  for (let i = 0; i < FLOORS; i++) {
    const y = r1(i * STEP), yc = y + H / 2;
    const lo = 43 - 0.35 * yc, ro = 57 + 0.35 * yc;                   // outer edges of the A at this height
    if (yc < 36 || i === CROSS) {
      slabs.push({ x: r1(lo), y, w: r1(ro - lo), h: H, floor: i, amber: i === CROSS });
    } else {
      const li = 50 - (yc - 34) * 23 / 66, ri = 50 + (yc - 34) * 23 / 66;   // inner edges: the counter of the A
      slabs.push({ x: r1(lo), y, w: r1(li - lo), h: H, floor: i, amber: false });
      slabs.push({ x: r1(ri), y, w: r1(ro - ri), h: H, floor: i, amber: false });
    }
  }
  return slabs;
}

const SLABS = floors();
export const MARK = { body: BODY, slabs: SLABS, bar: SLABS.find((s) => s.amber), radius: RADIUS, floors: FLOORS };

export const slabRects = (cls = (s) => (s.amber ? 'mark-bar' : 'mark-body')) =>
  SLABS.map((s) => `<rect class="${cls(s)}" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${RADIUS}"/>`).join('');

export const markSVG = (cls = '') => `<svg class="mark ${cls}" viewBox="0 0 100 100" aria-hidden="true">${slabRects()}</svg>`;
