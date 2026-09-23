// Host: a second cursor on the page that gives the tour. It moves in document coordinates,
// draws hand-drawn strokes on the ink layer, speaks in short bubbles and runs a script of beats.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const NS = "http://www.w3.org/2000/svg";

  function Host(opts) {
    const el = $("#host"), say = $("[data-host-say]", el), ink = $("#ink");
    const pos = { x: innerWidth * 0.7, y: -80 }; // document coords
    let busy = false, parked = false, lastMove = 0, sayT = 0, dodgeT = 0;
    const sizeInk = () => { ink.setAttribute("width", document.documentElement.scrollWidth); ink.setAttribute("height", document.documentElement.scrollHeight); ink.style.height = document.documentElement.scrollHeight + "px"; };
    sizeInk(); addEventListener("resize", sizeInk);

    function render() {
      el.style.transform = `translate3d(${pos.x}px,${pos.y - scrollY}px,0)`;
      el.classList.toggle("flip", pos.x > innerWidth * 0.6);
    }
    addEventListener("scroll", render, { passive: true });

    // --- movement: eased, slightly curved, with a tiny hand tremor
    function moveTo(x, y, ms) {
      const d = Math.hypot(x - pos.x, y - pos.y);
      const dur = ms != null ? ms / 1000 : clamp(d / 900, 0.35, 1.4);
      const cx = (pos.x + x) / 2 + rnd(-d * 0.15, d * 0.15), cy = (pos.y + y) / 2 + rnd(-d * 0.1, d * 0.1);
      const from = { x: pos.x, y: pos.y };
      const o = { t: 0 };
      return new Promise((res) => {
        gsap.to(o, {
          t: 1, duration: dur, ease: "power2.inOut",
          onUpdate() {
            const t = o.t, u = 1 - t;
            pos.x = u * u * from.x + 2 * u * t * cx + t * t * x + Math.sin(t * 40) * 0.6;
            pos.y = u * u * from.y + 2 * u * t * cy + t * t * y;
            render();
          },
          onComplete: res,
        });
      });
    }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // --- speech
    function speak(text, hold = 2200) {
      clearTimeout(sayT);
      say.hidden = false; say.textContent = "";
      let i = 0;
      return new Promise((res) => {
        (function type() {
          say.textContent = text.slice(0, ++i);
          if (i < text.length) setTimeout(type, 28 + Math.random() * 30);
          else { sayT = setTimeout(() => { say.hidden = true; res(); }, hold); }
        })();
      });
    }
    function quip(text) { clearTimeout(sayT); say.hidden = false; say.textContent = text; sayT = setTimeout(() => (say.hidden = true), 1600); }

    // --- hand-drawn strokes
    function stroke(d, { color, width = 2.2, ms = 700 } = {}) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", "stroke");
      if (color) p.style.stroke = color;
      p.style.strokeWidth = width;
      ink.append(p);
      const len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      gsap.to(p, { strokeDashoffset: 0, duration: ms / 1000, ease: "power1.inOut" });
      return p;
    }
    const jitter = (v, a = 3) => v + rnd(-a, a);
    function circlePath(cx, cy, rx, ry) {
      // two slightly-off laps, like a real pen circling something
      const pts = [];
      for (let i = 0; i <= 26; i++) {
        const a = -0.6 + (i / 26) * Math.PI * 2.3;
        const k = 1 + i * 0.006;
        pts.push([cx + Math.cos(a) * rx * k + rnd(-2, 2), cy + Math.sin(a) * ry * k + rnd(-2, 2)]);
      }
      return "M" + pts.map((p) => p.map((n) => n.toFixed(1)).join(" ")).join(" L");
    }
    function underlinePath(x1, x2, y) {
      const mid = (x1 + x2) / 2;
      return `M${x1} ${jitter(y)} Q${mid} ${y + rnd(4, 9)} ${x2} ${jitter(y)} M${x2 - 8} ${y + 7} Q${mid} ${y + 12} ${x1 + 12} ${y + 8}`;
    }
    function arrowPath(x1, y1, x2, y2) {
      const ang = Math.atan2(y2 - y1, x2 - x1), h = 14;
      const cx = (x1 + x2) / 2 + Math.cos(ang + Math.PI / 2) * 30;
      const cy = (y1 + y2) / 2 + Math.sin(ang + Math.PI / 2) * 30;
      return `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2} M${x2} ${y2} L${x2 - Math.cos(ang - 0.5) * h} ${y2 - Math.sin(ang - 0.5) * h} M${x2} ${y2} L${x2 - Math.cos(ang + 0.5) * h} ${y2 - Math.sin(ang + 0.5) * h}`;
    }

    // handwritten note placed in the document
    function note(text, x, y, { rotate = rnd(-4, 3), size } = {}) {
      const n = document.createElement("span");
      n.className = "hand note";
      n.style.left = x + "px"; n.style.top = y + "px"; n.style.transform = `rotate(${rotate}deg)`;
      if (size) n.style.fontSize = size;
      document.body.append(n);
      // measure the finished note and keep it inside the page
      n.textContent = text;
      const maxW = Math.min(innerWidth * 0.6, 420);
      n.style.maxWidth = maxW + "px";
      const nw = n.getBoundingClientRect().width;
      if (x + nw > document.documentElement.clientWidth - 12) n.style.left = Math.max(12, document.documentElement.clientWidth - nw - 12) + "px";
      n.textContent = "";
      let i = 0;
      return new Promise((res) => {
        (function type() {
          n.textContent = text.slice(0, ++i);
          if (i < text.length) setTimeout(type, 34 + Math.random() * 40); else res(n);
        })();
      });
    }

    // --- higher-level gestures, all in document coords
    const rectOf = (target) => { const r = target.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + scrollY + r.height / 2 }; };

    async function circle(target) {
      const r = rectOf(target);
      await moveTo(r.x + r.w + 14, r.cy - r.h * 0.1);
      const path = circlePath(r.cx, r.cy, r.w / 2 + 16, r.h / 2 + 12);
      stroke(path, { ms: 850 });
      await traceAlong(path, 850);
    }
    async function underline(target) {
      const r = rectOf(target);
      await moveTo(r.x - 6, r.y + r.h + 4);
      const path = underlinePath(r.x, r.x + r.w, r.y + r.h + 2);
      stroke(path, { ms: 600 });
      await traceAlong(path, 600);
    }
    async function arrow(fromX, fromY, target) {
      const r = rectOf(target);
      const path = arrowPath(fromX, fromY, r.x - 14, r.cy);
      await moveTo(fromX, fromY, 300);
      stroke(path, { ms: 550 });
      await traceAlong(path, 550);
    }
    async function click(target) {
      const r = rectOf(target);
      await moveTo(r.cx + rnd(-r.w * 0.2, r.w * 0.2), r.cy + rnd(-r.h * 0.2, r.h * 0.2));
      el.classList.add("is-click"); await wait(140); el.classList.remove("is-click");
      const ring = document.createElement("span"); ring.className = "click-ring";
      ring.style.left = pos.x + "px"; ring.style.top = pos.y + "px"; document.body.append(ring);
      setTimeout(() => ring.remove(), 700);
      target.click();
    }
    async function writeNear(target, text, side = "right") {
      const r = rectOf(target);
      const x = side === "right" ? r.x + r.w + 24 : r.x, y = side === "right" ? r.cy - 14 : r.y + r.h + 10;
      await moveTo(x, y);
      await note(text, x, y);
    }
    // move the cursor along a path while it draws
    function traceAlong(d, ms) {
      const tmp = document.createElementNS(NS, "path"); tmp.setAttribute("d", d);
      const len = tmp.getTotalLength();
      const o = { t: 0 };
      return new Promise((res) => gsap.to(o, { t: 1, duration: ms / 1000, ease: "power1.inOut", onUpdate() { const p = tmp.getPointAtLength(o.t * len); pos.x = p.x + 6; pos.y = p.y + 4; render(); }, onComplete: res }));
    }
    async function wave() {
      for (let i = 0; i < 3; i++) { await moveTo(pos.x + 14, pos.y - 8, 110); await moveTo(pos.x - 14, pos.y + 8, 110); }
    }
    async function dodge(fromX, fromY) {
      const now = performance.now(); if (now - dodgeT < 1400 || busy) return; dodgeT = now;
      const ang = Math.atan2(pos.y - fromY, pos.x - fromX) + rnd(-0.6, 0.6);
      const x = clamp(pos.x + Math.cos(ang) * 220, 40, innerWidth - 80), y = clamp(pos.y + Math.sin(ang) * 160, scrollY + 90, scrollY + innerHeight - 80);
      moveTo(x, y, 260);
      if (opts.dodge && Math.random() < 0.5) quip(opts.dodge[(Math.random() * opts.dodge.length) | 0]);
    }
    async function park() {
      parked = true;
      await moveTo(innerWidth - 60, scrollY + innerHeight - 70, 500);
    }

    // beats queue up and run one at a time
    let chain = Promise.resolve(), pending = 0;
    function run(fn) {
      pending++; busy = true;
      chain = chain.then(() => fn()).catch((e) => console.warn("host beat failed", e)).then(() => { if (--pending === 0) busy = false; });
      return chain;
    }

    render();
    return {
      pos, el, moveTo, speak, quip, circle, underline, arrow, click, writeNear, note, stroke, wave, dodge, park, run, wait,
      get busy() { return busy; }, get parked() { return parked; }, set parked(v) { parked = v; },
      keepOnScreen() {
        // when the user scrolls away, the host follows so it is always somewhere on screen
        const top = scrollY + 90, bottom = scrollY + innerHeight - 80;
        if (pos.y < top || pos.y > bottom) { pos.y = clamp(pos.y, top, bottom); render(); }
      },
    };
  }
  window.Host = Host;
})();
