// Small pieces of interface: split letters, the construction-line loader, the developer panel.
import { MARK } from './mark.js';

const gsap = () => window.gsap;

// ---------- split text: each letter becomes a span the timeline can move ----------
export function split(el) {
  if (el.dataset.splitDone) return el._chars;
  const chars = [];
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((word) => {
          if (!word) return;
          if (/^\s+$/.test(word)) { frag.append(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'wd';
          for (const ch of word) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; w.append(s); chars.push(s); }
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    }
  };
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
  walk(el);
  [...el.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
  el.dataset.splitDone = '1'; el._chars = chars;
  return chars;
}

// motion spec: letters rise 10px and fade in, 0.7s power4, 0.04s apart (capped so long titles stay quick)
export function lettersIn(el, { delay = 0, onLetter } = {}) {
  const chars = split(el); const g = gsap(); if (!g || !chars.length) return;
  g.killTweensOf(chars);
  const stagger = Math.min(0.04, 0.7 / Math.max(1, chars.length));
  return g.fromTo(chars, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power4.out', stagger, delay,
    onStart: () => onLetter && chars.forEach((_, i) => setTimeout(() => i % 2 === 0 && onLetter(), (delay + i * stagger) * 1000)) });
}
export function lettersOut(el) {
  const chars = split(el); const g = gsap(); if (!g || !chars.length) return;
  g.killTweensOf(chars);
  return g.to(chars, { y: -10, opacity: 0, duration: 0.4, ease: 'power2.in', stagger: 0.02 });
}

// ---------- loader: construction lines, then the mark is built floor by floor from the bottom up ----------
export function buildLoader(root) {
  const svg = root.querySelector('.loader-lines');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, cls) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (cls) e.setAttribute('class', cls); svg.append(e); return e; };
  const B = MARK.body;
  const line = (p, q, cls) => {
    // extend the segment p→q across the drawing so it reads as a guide, not an edge
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, ext = 46;
    return el('line', { x1: p[0] - ux * ext, y1: p[1] - uy * ext, x2: q[0] + ux * ext, y2: q[1] + uy * ext }, cls);
  };
  const levels = [...new Set(MARK.slabs.map((s) => s.y))];
  const guides = [
    ...levels.map((y) => el('line', { x1: -60, y1: y, x2: 160, y2: y }, 'g')),
    el('line', { x1: -60, y1: 100, x2: 160, y2: 100 }, 'g'),
    line(B[0], B[6], 'g'), line(B[1], B[2], 'g'),
  ];
  const dashed = [
    el('line', { x1: 50, y1: -40, x2: 50, y2: 140 }, 'd'),
    el('circle', { cx: 50, cy: 60, r: 58 }, 'd'),
    el('circle', { cx: 50, cy: 60, r: 30 }, 'd'),
    line(B[4], B[5], 'd'), line(B[4], B[3], 'd'),
  ];
  // bottom floor first: the order the A is built in
  const order = [...MARK.slabs].sort((a, b) => b.y - a.y || a.x - b.x);
  const rect = (s, cls) => el('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: MARK.radius }, cls);
  const fills = order.map((s) => rect(s, s.amber ? 'fillbar' : 'fill'));
  const outlines = order.map((s) => rect(s, s.amber ? 'mb' : 'm'));
  return { svg, guides, dashed, outlines, fills, bar: fills.find((f) => f.classList.contains('fillbar')) };
}

export function playLoader(root, parts, { fast = false } = {}) {
  const g = gsap();
  const text = root.querySelector('.loader-text');
  const full = text.textContent; text.textContent = '';
  const tl = g.timeline({ defaults: { ease: 'power2.out' } });
  const draw = (els, dur, stagger, at) => {
    // pathLength=1 normalises every stroke, so no element has to be measured
    els.forEach((e) => { e.setAttribute('pathLength', '1'); e.style.strokeDasharray = '1'; e.style.strokeDashoffset = '1'; });
    tl.to(els, { strokeDashoffset: 0, duration: dur, stagger }, at);
  };
  g.set(parts.dashed, { opacity: 0 });
  draw(parts.guides, 0.9, 0.05, 0);
  tl.to(parts.dashed, { opacity: 1, duration: 0.8, stagger: 0.1 }, 0.25);
  draw(parts.outlines, 0.5, 0.07, 0.55);
  // each floor drops into place on the one below
  tl.fromTo(parts.fills, { opacity: 0, y: -7 }, { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out', stagger: 0.08 }, 1.05);
  tl.to(parts.bar, { keyframes: [{ opacity: 0.15, duration: 0.01, delay: 0.2 }, { opacity: 1, duration: 0.01, delay: 0.22 }, { opacity: 0.15, duration: 0.01, delay: 0.22 }, { opacity: 1, duration: 0.01, delay: 0.22 }] }, '>');
  tl.to({ n: 0 }, { n: full.length, duration: full.length * 0.035, ease: 'none', onUpdate() { text.textContent = full.slice(0, Math.round(this.targets()[0].n)); } }, 1.1);
  if (fast) tl.timeScale(2.6);
  return tl;
}

export function hideLoader(root, parts) {
  const g = gsap();
  return g.timeline()
    .to([...parts.guides, ...parts.dashed], { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
    .to([root.querySelector('.loader-line'), root.querySelector('.loader-count')], { opacity: 0, duration: 0.4 }, 0)
    .to(parts.svg, { scale: 1.06, opacity: 0, duration: 0.7, ease: 'power2.in', transformOrigin: '50% 50%' }, 0.2)
    .to(root, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.55)
    .set(root, { display: 'none' });
}

// ---------- developer panel: quaternion readout, a draggable axis gizmo, two material sliders ----------
export function devPanel(el, gl, THREE) {
  const out = [...el.querySelectorAll('.dev-q span')];
  const cv = el.querySelector('.dev-gizmo');
  const cx = cv.getContext('2d');
  const body = el.querySelector('.dev-body');
  el.querySelector('.dev-fold').addEventListener('click', (e) => {
    const open = body.hidden; body.hidden = !open; e.currentTarget.setAttribute('aria-expanded', String(open)); e.currentTarget.textContent = open ? '–' : '+';
  });
  el.querySelector('[data-dev="frost"]').addEventListener('input', (e) => { gl.frostOverride = +e.target.value; });
  el.querySelector('[data-dev="dispersion"]').addEventListener('input', (e) => { gl.glass.dispersion = +e.target.value; });
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    gl.userQ.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.02))
      .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.02));
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  el.querySelector('.dev-reset').addEventListener('click', () => {
    const from = gl.userQ.clone(), to = new THREE.Quaternion();
    window.gsap.to({ t: 0 }, { t: 1, duration: 1, ease: 'power2.inOut', onUpdate() { gl.userQ.copy(from).slerp(to, this.targets()[0].t); } });
  });
  const axes = [[1, 0, 0, '#ff5a5a', 'X'], [0, 1, 0, '#6fe08a', 'Y'], [0, 0, 1, '#6aa8ff', 'Z']];
  return function update() {
    const q = gl.getQuaternion();
    [q.x, q.y, q.z, q.w].forEach((v, i) => { out[i].textContent = (v >= 0 ? ' ' : '') + v.toFixed(2); });
    const W = cv.width, R = W * 0.36;
    cx.clearRect(0, 0, W, W);
    cx.strokeStyle = getComputedStyle(el).color; cx.globalAlpha = 0.35; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(W / 2, W / 2, R + 8, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1;
    // each axis rotated by the mark's quaternion, projected straight on, nearest drawn last
    const pts = axes.map(([x, y, z, c, n]) => { const v = new THREE.Vector3(x, y, z).applyQuaternion(q); return { x: v.x, y: v.y, z: v.z, c, n }; })
      .sort((a, b) => a.z - b.z);
    for (const p of pts) {
      const X = W / 2 + p.x * R, Y = W / 2 - p.y * R;
      cx.strokeStyle = p.c; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(W / 2, W / 2); cx.lineTo(X, Y); cx.stroke();
      cx.fillStyle = p.c; cx.beginPath(); cx.arc(X, Y, 11, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#050607'; cx.font = '600 13px IBM Plex Mono, monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(p.n, X, Y + 1);
    }
  };
}
