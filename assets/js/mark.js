// The mark: an open A (two legs under a flat apex) and a floating crossbar that is also a cursor.
// Units: a 100 x 100 box, y pointing down. Everything that draws the mark (SVG, loader, 3D) reads this.
export const MARK = {
  body: [[43, 0], [57, 0], [92, 100], [73, 100], [50, 34], [27, 100], [8, 100]],
  bar: { x: 29, y: 66, w: 42, h: 10 },
};

export const bodyPath = () => 'M' + MARK.body.map((p) => p.join(' ')).join('L') + 'Z';
export const barPath = () => { const b = MARK.bar; return `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`; };

// inline SVG of the mark; the bar takes its own class so it can be coloured or animated separately
export const markSVG = (cls = '') =>
  `<svg class="mark ${cls}" viewBox="0 0 100 100" aria-hidden="true"><path class="mark-body" d="${bodyPath()}"/><path class="mark-bar" d="${barPath()}"/></svg>`;
