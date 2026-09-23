// Host: a second cursor on the page that gives the tour. It moves in document coordinates,
// draws hand-drawn strokes on the ink layer, speaks in short bubbles and runs a queue of beats.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const NS = "http://www.w3.org/2000/svg";

  function Host(opts) {
    const el = $("#host"), say = $("[data-host-say]", el), ink = $("#ink"), status = $("[data-host-status]", el);
    const pos = { x: innerWidth * 0.7, y: -80 }; // document coords
    let busy = false, parked = false, sayT = 0, dodgeT = 0, lastX = pos.x, lastY = pos.y, trailT = 0;
    const sizeInk = () => { ink.setAttribute("width", document.documentElement.scrollWidth); ink.setAttribute("height", document.documentElement.scrollHeight); ink.style.height = document.documentElement.scrollHeight + "px"; };
    sizeInk(); addEventListener("resize", sizeInk);
    let pen = null; // pen-scratch sound, opt-in

    function setStatus(s) { if (status) status.textContent = s || ""; el.dataset.status = s || ""; opts.onStatus && opts.onStatus(s); }

    function render() {
      el.style.transform = `translate3d(${pos.x}px,${pos.y - scrollY}px,0)`;
      el.classList.toggle("flip", pos.x > innerWidth * 0.6);
      // a faint ink trail when moving fast
      const d = Math.hypot(pos.x - lastX, pos.y - lastY);
      const now = performance.now();
      if (d > 6 && now - trailT > 24) {
        trailT = now;
        const t = document.createElementNS(NS, "line");
        t.setAttribute("x1", lastX + 3); t.setAttribute("y1", lastY + 3); t.setAttribute("x2", pos.x + 3); t.setAttribute("y2", pos.y + 3);
        t.setAttribute("class", "trail");
        ink.append(t);
        setTimeout(() => t.remove(), 700);
      }
      lastX = pos.x; lastY = pos.y;
    }
    addEventListener("scroll", () => { lastX = pos.x; lastY = pos.y; el.style.transform = `translate3d(${pos.x}px,${pos.y - scrollY}px,0)`; }, { passive: true });

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

    // --- speech, with a "typing…" beat before the words
    function speak(text, hold = 2200, { think = true } = {}) {
      clearTimeout(sayT);
      say.hidden = false;
      return new Promise(async (res) => {
        if (think) { say.textContent = ""; say.classList.add("thinking"); setStatus("typing…"); await wait(clamp(text.length * 12, 250, 700)); say.classList.remove("thinking"); }
        setStatus("");
        let i = 0;
        (function type() {
          say.textContent = text.slice(0, ++i);
          if (i < text.length) setTimeout(type, 24 + Math.random() * 28);
          else { sayT = setTimeout(() => { say.hidden = true; res(); }, hold); }
        })();
      });
    }
    function quip(text, hold = 1600) { clearTimeout(sayT); say.classList.remove("thinking"); say.hidden = false; say.textContent = text; sayT = setTimeout(() => (say.hidden = true), hold); }
    function hush() { clearTimeout(sayT); say.hidden = true; }

    // --- hand-drawn strokes
    function stroke(d, { width = 2.2, ms = 700 } = {}) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", "stroke");
      p.style.strokeWidth = width;
      ink.append(p);
      const len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      gsap.to(p, { strokeDashoffset: 0, duration: ms / 1000, ease: "power1.inOut" });
      scratch(ms);
      return p;
    }
    const jitter = (v, a = 3) => v + rnd(-a, a);
    function circlePath(cx, cy, rx, ry) {
      const pts = [];
      for (let i = 0; i <= 26; i++) {
        const a = -0.6 + (i / 26) * Math.PI * 2.3, k = 1 + i * 0.006;
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
      const cx = (x1 + x2) / 2 + Math.cos(ang + Math.PI / 2) * 30, cy = (y1 + y2) / 2 + Math.sin(ang + Math.PI / 2) * 30;
      return `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2} M${x2} ${y2} L${x2 - Math.cos(ang - 0.5) * h} ${y2 - Math.sin(ang - 0.5) * h} M${x2} ${y2} L${x2 - Math.cos(ang + 0.5) * h} ${y2 - Math.sin(ang + 0.5) * h}`;
    }
    // small doodles, all ~30px, drawn at (x, y)
    const DOODLE = {
      star(x, y, s = 16) { let d = ""; for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 4 / 5); d += (i ? "L" : "M") + (x + Math.cos(a) * s + rnd(-1.5, 1.5)).toFixed(1) + " " + (y + Math.sin(a) * s + rnd(-1.5, 1.5)).toFixed(1) + " "; } return d; },
      bang(x, y, s = 16) { return `M${x} ${y - s} Q${x + 2} ${y} ${x + 1} ${y + s * 0.4} M${x} ${y + s * 0.8} l1 3 M${x + 12} ${y - s} Q${x + 14} ${y} ${x + 13} ${y + s * 0.4} M${x + 12} ${y + s * 0.8} l1 3`; },
      check(x, y, s = 16) { return `M${x - s} ${y} Q${x - s * 0.4} ${y + s * 0.5} ${x - s * 0.3} ${y + s * 0.7} L${x + s} ${y - s * 0.9}`; },
      smile(x, y, s = 16) { return `${circlePath(x, y, s, s)} M${x - s * 0.4} ${y - s * 0.25} l0 3 M${x + s * 0.4} ${y - s * 0.25} l0 3 M${x - s * 0.5} ${y + s * 0.25} Q${x} ${y + s * 0.7} ${x + s * 0.5} ${y + s * 0.25}`; },
      heart(x, y, s = 14) { return `M${x} ${y + s} C${x - s * 1.6} ${y - s * 0.2} ${x - s * 0.6} ${y - s * 1.2} ${x} ${y - s * 0.3} C${x + s * 0.6} ${y - s * 1.2} ${x + s * 1.6} ${y - s * 0.2} ${x} ${y + s}`; },
      question(x, y, s = 16) { return `M${x - s * 0.5} ${y - s * 0.6} Q${x} ${y - s * 1.4} ${x + s * 0.5} ${y - s * 0.6} Q${x + s * 0.5} ${y} ${x} ${y + s * 0.1} L${x} ${y + s * 0.4} M${x} ${y + s * 0.8} l0 3`; },
    };
    async function doodle(kind, x, y, size) {
      const d = DOODLE[kind](x, y, size);
      await moveTo(x, y - 20, 260);
      stroke(d, { ms: 420 });
      await traceAlong(d, 420);
    }

    // handwritten note placed in the document, kept inside the page
    function note(text, x, y, { rotate = rnd(-4, 3), size, cls = "" } = {}) {
      const n = document.createElement("span");
      n.className = "hand note " + cls;
      n.style.left = x + "px"; n.style.top = y + "px"; n.style.transform = `rotate(${rotate}deg)`;
      if (size) n.style.fontSize = size;
      document.body.append(n);
      n.textContent = text;
      n.style.maxWidth = Math.min(innerWidth * 0.6, 420) + "px";
      const nw = n.getBoundingClientRect().width;
      if (x + nw > document.documentElement.clientWidth - 12) n.style.left = Math.max(12, document.documentElement.clientWidth - nw - 12) + "px";
      n.textContent = "";
      setStatus("writing…");
      let i = 0;
      return new Promise((res) => {
        (function type() {
          n.textContent = text.slice(0, ++i);
          scratch(40);
          if (i < text.length) setTimeout(type, 34 + Math.random() * 40); else { setStatus(""); res(n); }
        })();
      });
    }

    // --- gestures, all in document coords
    const rectOf = (target) => { const r = target.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + scrollY + r.height / 2 }; };
    async function circle(target) {
      const r = rectOf(target);
      if (r.w > innerWidth * 0.8) return underline(target); // too wide to ring on a phone
      await moveTo(r.x + r.w + 14, r.cy - r.h * 0.1);
      const path = circlePath(r.cx, r.cy, r.w / 2 + 16, r.h / 2 + 12);
      stroke(path, { ms: 850 }); await traceAlong(path, 850);
    }
    async function underline(target) {
      const r = rectOf(target);
      await moveTo(r.x - 6, r.y + r.h + 4);
      const path = underlinePath(r.x, r.x + r.w, r.y + r.h + 2);
      stroke(path, { ms: 600 }); await traceAlong(path, 600);
    }
    async function arrow(fromX, fromY, target) {
      const r = rectOf(target);
      const path = arrowPath(fromX, fromY, r.x - 14, r.cy);
      await moveTo(fromX, fromY, 300);
      stroke(path, { ms: 550 }); await traceAlong(path, 550);
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
    async function writeNear(target, text, side = "right", stack = 0) {
      const r = rectOf(target);
      const x = side === "right" ? r.x + r.w + 24 : r.x, y = (side === "right" ? r.cy - 14 : r.y + r.h + 10) + stack * 34;
      await moveTo(x, y);
      return note(text, x, y);
    }
    async function pointAt(target) {
      const r = rectOf(target);
      await moveTo(r.x + r.w + 26, r.cy);
      const d = arrowPath(pos.x + 40, pos.y + 30, r.x + r.w + 8, r.cy);
      stroke(d, { ms: 450 }); await traceAlong(d, 450);
    }
    function traceAlong(d, ms) {
      const tmp = document.createElementNS(NS, "path"); tmp.setAttribute("d", d);
      const len = tmp.getTotalLength(); const o = { t: 0 };
      return new Promise((res) => gsap.to(o, { t: 1, duration: ms / 1000, ease: "power1.inOut", onUpdate() { const p = tmp.getPointAtLength(o.t * len); pos.x = p.x + 6; pos.y = p.y + 4; render(); }, onComplete: res }));
    }
    async function wave() { for (let i = 0; i < 3; i++) { await moveTo(pos.x + 14, pos.y - 8, 110); await moveTo(pos.x - 14, pos.y + 8, 110); } }
    async function nod() { for (let i = 0; i < 2; i++) { await moveTo(pos.x, pos.y + 10, 120); await moveTo(pos.x, pos.y - 10, 120); } }
    async function dodge(fromX, fromY) {
      const now = performance.now(); if (now - dodgeT < 1400 || busy) return; dodgeT = now;
      const ang = Math.atan2(pos.y - fromY, pos.x - fromX) + rnd(-0.6, 0.6);
      const x = clamp(pos.x + Math.cos(ang) * 220, 40, innerWidth - 80), y = clamp(pos.y + Math.sin(ang) * 160, scrollY + 90, scrollY + innerHeight - 80);
      moveTo(x, y, 260);
      if (opts.dodge && Math.random() < 0.5) quip(opts.dodge[(Math.random() * opts.dodge.length) | 0]);
    }
    async function park() { parked = true; await moveTo(innerWidth - 60, scrollY + innerHeight - 70, 500); }
    async function scrollTo(target, offset = 0.3) {
      // the host walks there and the page follows it
      const r = rectOf(target);
      const y = Math.max(0, r.y - innerHeight * offset);
      if (opts.scroller) opts.scroller(y); else window.scrollTo({ top: y, behavior: "smooth" });
      await moveTo(r.x + r.w * 0.5, r.y + r.h * 0.5, 900);
    }

    // --- pen-scratch sound (opt-in): short bursts of filtered noise while drawing or writing
    function enableSound() {
      if (pen) return pen;
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      pen = { ac, buf, on: true };
      ac.resume();
      return pen;
    }
    function scratch(ms) {
      if (!pen || !pen.on) return;
      const { ac, buf } = pen, t = ac.currentTime;
      const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800 + Math.random() * 1200; f.Q.value = 1.2;
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.03); g.gain.linearRampToValueAtTime(0, t + Math.min(0.5, ms / 1000));
      s.connect(f).connect(g).connect(ac.destination); s.start(t); s.stop(t + Math.min(0.5, ms / 1000) + 0.05);
    }

    // beats queue up and run one at a time
    let chain = Promise.resolve(), pending = 0;
    function run(fn) {
      pending++; busy = true;
      chain = chain.then(() => fn()).catch((e) => console.warn("host beat failed", e)).then(() => { if (--pending === 0) { busy = false; setStatus(""); } });
      return chain;
    }

    render();
    return {
      pos, el, moveTo, speak, quip, hush, circle, underline, arrow, pointAt, click, writeNear, note, stroke, doodle, wave, nod, dodge, park, scrollTo, run, wait, setStatus,
      enableSound, get sound() { return !!(pen && pen.on); }, set sound(v) { if (v) enableSound(); if (pen) pen.on = !!v; },
      get busy() { return busy; }, get parked() { return parked; }, set parked(v) { parked = v; },
      keepOnScreen() {
        const top = scrollY + 90, bottom = scrollY + innerHeight - 80;
        if (pos.y < top || pos.y > bottom) { pos.y = clamp(pos.y, top, bottom); lastX = pos.x; lastY = pos.y; render(); }
      },
    };
  }
  window.Host = Host;
})();
