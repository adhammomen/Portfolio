// Host: a second cursor on the page that gives the tour. It moves in document coordinates,
// draws hand-drawn strokes on the ink layer, speaks in short bubbles and runs a queue of beats.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const NS = "http://www.w3.org/2000/svg";

  function Host(opts) {
    const el = $("#host"), say = $("[data-host-say]", el), ink = $("#ink"), status = $("[data-host-status]", el);
    const pos = { x: innerWidth * 0.7, y: -80 }; // page coords
    let busy = false, parked = false, sayT = 0, dodgeT = 0, lastX = pos.x, lastY = pos.y, trailT = 0;
    // windows: page x = client x + the window's offset on the monitor (0 with one window)
    const OX = () => (window.SCREEN ? window.SCREEN.vx : 0);
    const page = () => document.getElementById("page") || document.body;
    const mirror = !!opts.mirror; // a second window: this host only repeats what the leader's does
    const live = () => !mirror && window.SCREEN && window.SCREEN.multi;
    const post = (m) => { if (live()) window.SCREEN.post(m); };
    let sid = 0; const mirrored = new Map(); // stroke id -> path, so the other window can trace the same line
    const sizeInk = () => { const pg = page(); ink.setAttribute("width", pg.clientWidth || innerWidth); ink.setAttribute("height", pg.scrollHeight); ink.style.height = pg.scrollHeight + "px"; };
    sizeInk(); addEventListener("resize", sizeInk); setInterval(sizeInk, 1500);
    let pen = null; // pen-scratch sound, opt-in
    // interruption: when the visitor acts, whatever the host is doing stops at once
    let aborting = false; const waiters = new Set();
    function abortAll() { aborting = true; waiters.forEach((fn) => fn()); waiters.clear(); if (activeTween) { activeTween.kill(); activeTween = null; } if (activeResolve) { const r = activeResolve; activeResolve = null; r(); } hush(); }

    function setStatus(s) { if (status) status.textContent = s || ""; el.dataset.status = s || ""; opts.onStatus && opts.onStatus(s); post({ t: "status", s }); }

    let posT = 0;
    function render() {
      const S = window.SCREEN, cx = S ? S.cx(pos.x) : pos.x, cy = S ? S.cy(pos.y) : pos.y - scrollY;
      el.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      el.classList.toggle("flip", cx > innerWidth * 0.6);
      if (!mirror && performance.now() - posT > 16) { posT = performance.now(); post({ t: "pos", x: pos.x, y: pos.y }); }
      if (pen && pen.pan) { const S = window.SCREEN, sw = S && S.multi ? S.sw : innerWidth, cx = S && S.multi ? pos.x : pos.x - OX(); pen.pan.pan.value = clamp((cx - sw / 2) / (sw / 2), -1, 1) * 0.8; }
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
    const reposition = () => { lastX = pos.x; lastY = pos.y; const S = window.SCREEN; el.style.transform = `translate3d(${S ? S.cx(pos.x) : pos.x}px,${S ? S.cy(pos.y) : pos.y - scrollY}px,0)`; };
    addEventListener("scroll", reposition, { passive: true });
    if (window.SCREEN) window.SCREEN.listen("move", reposition);

    // --- movement: eased, slightly curved, with a tiny hand tremor
    let activeTween = null, activeResolve = null;
    function moveTo(x, y, ms) {
      if (aborting) return Promise.resolve();
      if (activeTween) { activeTween.kill(); activeTween = null; }
      if (activeResolve) { const r = activeResolve; activeResolve = null; r(); } // the move we cut short still settles
      const d = Math.hypot(x - pos.x, y - pos.y);
      const dur = ms != null ? ms / 1000 : clamp(d / 900, 0.35, 1.4);
      const cx = (pos.x + x) / 2 + rnd(-d * 0.15, d * 0.15), cy = (pos.y + y) / 2 + rnd(-d * 0.1, d * 0.1);
      const from = { x: pos.x, y: pos.y };
      const o = { t: 0 };
      return new Promise((res) => {
        activeResolve = res;
        activeTween = gsap.to(o, {
          t: 1, duration: dur, ease: "power2.inOut",
          onUpdate() {
            const t = o.t, u = 1 - t;
            pos.x = u * u * from.x + 2 * u * t * cx + t * t * x + Math.sin(t * 40) * 0.6;
            pos.y = u * u * from.y + 2 * u * t * cy + t * t * y;
            render();
          },
          onComplete: () => { activeTween = null; activeResolve = null; res(); },
        });
      });
    }
    const wait = (ms) => aborting ? Promise.resolve() : new Promise((r) => { const id = setTimeout(() => { waiters.delete(done); r(); }, ms); const done = () => { clearTimeout(id); r(); }; waiters.add(done); });

    // --- speech, with a "typing…" beat before the words
    function speak(text, hold = 2200, { think = true } = {}) {
      if (aborting) return Promise.resolve();
      clearTimeout(sayT);
      say.hidden = false;
      return new Promise(async (res) => {
        const bail = () => { say.hidden = true; post({ t: "say", hidden: true }); res(); }; waiters.add(bail);
        if (think) { say.textContent = ""; say.classList.add("thinking"); post({ t: "say", text: "", thinking: true }); setStatus("typing…"); await wait(clamp(text.length * 12, 250, 700)); say.classList.remove("thinking"); }
        setStatus("");
        // plan the keystrokes: sometimes a wrong letter, a pause, then backspace
        const ops = [];
        const typoAt = text.length > 8 && Math.random() < 0.3 ? 3 + Math.floor(Math.random() * (text.length - 6)) : -1;
        for (let i = 0; i < text.length; i++) {
          if (i === typoAt) {
            const wrong = "qwertyuiopasdfghjklzxcvbnm"[(Math.random() * 26) | 0];
            ops.push({ ch: wrong, dt: 30 }, { ch: text[i + 1] || "", dt: 220 }, { back: 2, dt: 90 }, { back: 0, dt: 160 });
          }
          ops.push({ ch: text[i], dt: 24 + Math.random() * 28 });
        }
        let shown = "", k = 0;
        (function step() {
          if (aborting) return;
          const op = ops[k++];
          if (!op) { sayT = setTimeout(() => { waiters.delete(bail); say.hidden = true; post({ t: "say", hidden: true }); res(); }, hold); return; }
          if (op.back) shown = shown.slice(0, -op.back); else if (op.ch) { shown += op.ch; blip(op.ch); }
          say.textContent = shown; post({ t: "say", text: shown });
          setTimeout(step, op.dt);
        })();
      });
    }
    function quip(text, hold = 1600) { clearTimeout(sayT); say.classList.remove("thinking"); say.hidden = false; say.textContent = text; post({ t: "say", text }); sayT = setTimeout(() => { say.hidden = true; post({ t: "say", hidden: true }); }, hold); }
    function hush() { clearTimeout(sayT); say.hidden = true; post({ t: "say", hidden: true }); }

    // --- hand-drawn strokes
    // liquid ink: a mark remembers what it was drawn around (and that thing's rect at the time),
    // so when the desk changes size the mark moves and stretches with it
    const anchored = new Set();
    function anchor(el, target, r0) {
      if (!el || !target) return el;
      el.__a = { t: target, r: r0 || rectOf(target) };
      anchored.add(el);
      return el;
    }
    function reflow() {
      for (const el of anchored) {
        const a = el.__a; if (!a || !el.isConnected || !a.t.isConnected) { anchored.delete(el); continue; }
        const r = rectOf(a.t), sx = a.r.w ? r.w / a.r.w : 1, sy = a.r.h ? r.h / a.r.h : 1;
        if (el instanceof SVGElement) el.setAttribute("transform", `translate(${r.x} ${r.y}) scale(${sx} ${sy}) translate(${-a.r.x} ${-a.r.y})`);
        else {
          const x0 = parseFloat(el.dataset.ax || el.style.left), y0 = parseFloat(el.dataset.ay || el.style.top);
          if (!el.dataset.ax) { el.dataset.ax = x0; el.dataset.ay = y0; }
          el.style.left = r.x + (x0 - a.r.x) * sx + "px"; el.style.top = r.y + (y0 - a.r.y) * sy + "px";
        }
      }
      sizeInk();
      if (pos.y > 0) { lastX = pos.x; lastY = pos.y; render(); }
    }
    const intoName = (into) => (into === ink ? "ink" : into && into.hasAttribute && into.hasAttribute("data-sheet-sketch") ? "sketch" : into && into.id ? "#" + into.id : null);
    const intoEl = (name) => (name === "ink" ? ink : name === "sketch" ? sketchSvg() : name && name[0] === "#" ? document.getElementById(name.slice(1)) : null);
    function stroke(d, { width = 2.2, ms = 700, into = ink, id } = {}) {
      if (aborting) return null;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", "stroke wet");
      p.style.strokeWidth = width;
      p.dataset.sid = id || ++sid;
      into.append(p);
      const where = intoName(into);
      if (where) post({ t: "stroke", sid: p.dataset.sid, d, width, ms, into: where });
      marks.push({ el: p, kind: "stroke" });
      const len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      gsap.to(p, { strokeDashoffset: 0, duration: ms / 1000, ease: "power1.inOut", onComplete: () => setTimeout(() => p.classList.remove("wet"), 1400) });
      scratch(ms);
      return p;
    }
    // draw on an existing path (a glyph outline, a sketch line) and trace it with the cursor, whatever SVG it lives in
    const glyphIndex = (p) => [...document.querySelectorAll(".name-svg path")].indexOf(p);
    function drawPath(pathEl, ms) {
      if (aborting) return Promise.resolve();
      const len = pathEl.getTotalLength();
      post({ t: "draw", sid: pathEl.dataset.sid || null, glyph: glyphIndex(pathEl), ms });
      if (glyphIndex(pathEl) > -1) marks.push({ el: pathEl, kind: "glyph" });
      pathEl.style.strokeDasharray = len; pathEl.style.strokeDashoffset = len;
      gsap.to(pathEl, { strokeDashoffset: 0, duration: ms / 1000, ease: "none" });
      scratch(ms);
      const o = { t: 0 };
      if (activeTween) { activeTween.kill(); activeTween = null; }
      if (activeResolve) { const r = activeResolve; activeResolve = null; r(); }
      return new Promise((res) => {
        activeResolve = res;
        activeTween = gsap.to(o, {
          t: 1, duration: ms / 1000, ease: "none",
          onUpdate() {
            const m = pathEl.getScreenCTM(); if (!m) return;
            const pt = pathEl.getPointAtLength(o.t * len);
            const sx = m.a * pt.x + m.c * pt.y + m.e, sy = m.b * pt.x + m.d * pt.y + m.f; // to screen
            pos.x = sx + OX() + 4; pos.y = sy + scrollY + 3; render();
          },
          onComplete: () => { activeTween = null; activeResolve = null; res(); },
        });
      });
    }
    // a napkin sketch: rough boxes with labels, arrows between them, drawn inside an <svg viewBox="0 0 640 360">.
    // `svg` is a local element, or {remote: true, x, y, w, h}: the sheet is open in the other window,
    // so the lines are sent there and the cursor walks over to trace them.
    async function sketch(svg, spec) {
      if (aborting || !spec) return;
      const local = svg instanceof Element;
      const W = 640, H = 360, boxes = [];
      const line = async (d, ms) => {
        if (local) { const p = stroke(d, { ms, into: svg, width: 2 }); if (!p) return false; await drawPath(p, ms); }
        else { if (aborting) return false; post({ t: "stroke", sid: ++sid, d, width: 2, ms, into: "sketch" }); scratch(ms); await traceRemote(d, ms, svg); }
        return true;
      };
      const label = (x, y, size) => {
        const id = ++sid; let t = null;
        if (local) { t = document.createElementNS(NS, "text"); t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("text-anchor", "middle"); if (size) t.style.fontSize = size; svg.append(t); }
        post({ t: "stext", id, x, y, size: size || "", into: local ? intoName(svg) : "sketch" });
        return { set(v) { if (t) t.textContent = v; post({ t: "stextSet", id, text: v }); } };
      };
      for (const n of spec.nodes) {
        const w = Math.max(90, n.label.length * 13 + 40), h = 52;
        const x = n.x * W - w / 2, y = n.y * H - h / 2;
        boxes.push({ ...n, x, y, w, h });
        const d = `M${jitter(x)} ${jitter(y)} L${jitter(x + w)} ${jitter(y)} L${jitter(x + w)} ${jitter(y + h)} L${jitter(x)} ${jitter(y + h)} L${jitter(x)} ${jitter(y - 2)}`;
        if (!(await line(d, 420))) return;
        const t = label(x + w / 2, y + h / 2 + 8);
        for (let i = 1; i <= n.label.length; i++) { if (aborting) return; t.set(n.label.slice(0, i)); scratch(40); await wait(38); }
        await wait(120);
      }
      for (const [a, b, text] of spec.edges || []) {
        const A = boxes[a], B = boxes[b]; if (!A || !B) continue;
        const ax = A.x + A.w / 2, ay = A.y + A.h / 2, bx = B.x + B.w / 2, by = B.y + B.h / 2;
        const ang = Math.atan2(by - ay, bx - ax);
        // leave the boxes at their edges
        const sx = ax + Math.cos(ang) * (Math.abs(Math.cos(ang)) > 0.7 ? A.w / 2 + 6 : A.h / 2 + 6), sy = ay + Math.sin(ang) * (Math.abs(Math.cos(ang)) > 0.7 ? A.w / 2 * Math.abs(Math.tan(ang)) + 6 : A.h / 2 + 6);
        const ex = bx - Math.cos(ang) * (Math.abs(Math.cos(ang)) > 0.7 ? B.w / 2 + 8 : B.h / 2 + 8), ey = by - Math.sin(ang) * (Math.abs(Math.cos(ang)) > 0.7 ? B.w / 2 * Math.abs(Math.tan(ang)) + 8 : B.h / 2 + 8);
        if (!(await line(arrowPath(sx, sy, ex, ey), 380))) return;
        if (text) { const t = label((sx + ex) / 2, (sy + ey) / 2 - 10, "18px"); t.set(text); await wait(150); }
      }
    }
    // trace a napkin line that lives in the other window: map viewBox coords onto where that sheet sits on the desk
    function traceRemote(d, ms, box) {
      if (aborting) return Promise.resolve();
      const tmp = document.createElementNS(NS, "path"); tmp.setAttribute("d", d);
      const len = tmp.getTotalLength(); const o = { t: 0 };
      if (activeTween) { activeTween.kill(); activeTween = null; }
      if (activeResolve) { const r = activeResolve; activeResolve = null; r(); }
      return new Promise((res) => { activeResolve = res; activeTween = gsap.to(o, { t: 1, duration: ms / 1000, ease: "none", onUpdate() { const p = tmp.getPointAtLength(o.t * len); pos.x = box.x + p.x * (box.w / 640) + 4; pos.y = box.y + p.y * (box.h / 360) + 3; render(); }, onComplete: () => { activeTween = null; activeResolve = null; res(); } }); });
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
    async function doodle(kind, x, y, size, near) {
      if (aborting) return;
      const d = DOODLE[kind](x, y, size);
      await moveTo(x, y - 20, 260);
      anchor(stroke(d, { ms: 420 }), near);
      await traceAlong(d, 420);
    }

    // handwritten note placed in the document, kept inside the page
    function placeNote(text, x, y, { rotate = rnd(-4, 3), size, cls = "", id } = {}) {
      const n = document.createElement("span");
      n.className = "hand note " + cls;
      n.dataset.nid = id || ++sid;
      n.style.left = x + "px"; n.style.top = y + "px"; n.style.transform = `rotate(${rotate}deg)`;
      if (size) n.style.fontSize = size;
      page().append(n);
      n.textContent = text;
      n.style.maxWidth = Math.min(innerWidth * 0.6, 420) + "px";
      const nw = n.getBoundingClientRect().width, pw = page().clientWidth || innerWidth;
      if (x + nw > pw - 12) n.style.left = Math.max(12, pw - nw - 12) + "px";
      return { n, rotate, left: n.style.left };
    }
    function note(text, x, y, opts2 = {}) {
      if (aborting) return Promise.resolve(document.createElement("span"));
      const { n, rotate, left } = placeNote(text, x, y, opts2);
      if (opts2.anchor) anchor(n, opts2.anchor);
      post({ t: "note", id: n.dataset.nid, text, x: parseFloat(left), y, rotate, size: opts2.size || "", cls: opts2.cls || "" });
      n.textContent = "";
      setStatus("writing…");
      let i = 0;
      return new Promise((res) => {
        (function type() {
          if (aborting) { n.remove(); post({ t: "noteRm", id: n.dataset.nid }); setStatus(""); res(n); return; }
          n.textContent = text.slice(0, ++i); post({ t: "noteText", id: n.dataset.nid, n: i });
          scratch(40);
          if (i < text.length) setTimeout(type, 34 + Math.random() * 40); else { setStatus(""); marks.push({ el: n, kind: "note", text }); res(n); }
        })();
      });
    }
    // --- rewind: v = 1 is now, 0 is a blank page. every mark un-draws in reverse order, then draws back
    const marks = [];
    function rewind(v) {
      v = clamp(v, 0, 1);
      const live = marks.filter((m) => m.el.isConnected); const n = live.length; if (!n) return;
      live.forEach((m, i) => {
        const p = clamp(v * n - i, 0, 1);
        if (m.kind === "note") { m.el.textContent = m.text.slice(0, Math.round(m.text.length * p)); return; }
        const el = m.el;
        if (m.len == null) { try { m.len = el.getTotalLength(); } catch (_) { m.len = 0; } }
        el.classList.remove("wet");
        el.style.strokeDasharray = m.len; el.style.strokeDashoffset = m.len * (1 - p);
        if (m.kind === "glyph") { el.classList.toggle("inked", p >= 1); el.classList.toggle("pen", p < 1); if (p < 1) document.documentElement.classList.remove("no-write"); }
        if (p >= 1 && m.kind === "stroke") { el.style.strokeDashoffset = 0; }
      });
      if (v >= 1) { const g = live.some((m) => m.kind === "glyph"); if (g) document.documentElement.classList.add("no-write"); }
    }

    // --- gestures, all in document coords
    const rectOf = (target) => { const r = target.getBoundingClientRect(), ox = OX(); return { x: r.left + ox, y: r.top + scrollY, w: r.width, h: r.height, cx: r.left + ox + r.width / 2, cy: r.top + scrollY + r.height / 2 }; };
    async function circle(target) {
      const r = rectOf(target);
      if (r.w > innerWidth * 0.8) return underline(target); // too wide to ring on a phone
      await moveTo(r.x + r.w + 14, r.cy - r.h * 0.1);
      const path = circlePath(r.cx, r.cy, r.w / 2 + 16, r.h / 2 + 12);
      anchor(stroke(path, { ms: 850 }), target); await traceAlong(path, 850);
    }
    async function underline(target) {
      const r = rectOf(target);
      await moveTo(r.x - 6, r.y + r.h + 4);
      const path = underlinePath(r.x, r.x + r.w, r.y + r.h + 2);
      anchor(stroke(path, { ms: 600 }), target); await traceAlong(path, 600);
    }
    async function arrow(fromX, fromY, target) {
      const r = rectOf(target);
      const path = arrowPath(fromX, fromY, r.x - 14, r.cy);
      await moveTo(fromX, fromY, 300);
      anchor(stroke(path, { ms: 550 }), target); await traceAlong(path, 550);
    }
    async function click(target) {
      if (aborting) return;
      const r = rectOf(target);
      await moveTo(r.cx + rnd(-r.w * 0.2, r.w * 0.2), r.cy + rnd(-r.h * 0.2, r.h * 0.2));
      el.classList.add("is-click"); post({ t: "click" }); await wait(140); el.classList.remove("is-click");
      ringAt(pos.x, pos.y); post({ t: "ring", x: pos.x, y: pos.y });
      target.click();
    }
    const carryEl = document.createElement("span"); carryEl.className = "host-carry mono"; carryEl.hidden = true; el.append(carryEl);
    function carry(text) { carryEl.textContent = text; carryEl.hidden = !text; el.classList.toggle("is-carry", !!text); post({ t: "carry", text: text || "" }); }
    function jump(x, y) { pos.x = x; pos.y = y; lastX = x; lastY = y; render(); }
    function grab(on) { el.classList.toggle("is-grab", !!on); post({ t: "grab", on: !!on }); }
    function ringAt(x, y) { const ring = document.createElement("span"); ring.className = "click-ring"; ring.style.left = x + "px"; ring.style.top = y + "px"; page().append(ring); setTimeout(() => ring.remove(), 700); }
    async function writeNear(target, text, side = "right", stack = 0) {
      const r = rectOf(target);
      const x = side === "right" ? r.x + r.w + 24 : r.x, y = (side === "right" ? r.cy - 14 : r.y + r.h + 10) + stack * 34;
      await moveTo(x, y);
      return note(text, x, y, { anchor: target });
    }
    async function strike(target) {
      const r = rectOf(target);
      await moveTo(r.x - 8, r.cy + 2, 300);
      const d = `M${r.x - 4} ${jitter(r.cy + 2, 2)} Q${r.cx} ${r.cy + rnd(-4, 4)} ${r.x + r.w + 4} ${jitter(r.cy - 1, 2)}`;
      anchor(stroke(d, { ms: 380, width: 2.6 }), target); await traceAlong(d, 380);
    }
    async function pointAt(target) {
      const r = rectOf(target);
      await moveTo(r.x + r.w + 26, r.cy);
      const d = arrowPath(pos.x + 40, pos.y + 30, r.x + r.w + 8, r.cy);
      anchor(stroke(d, { ms: 450 }), target); await traceAlong(d, 450);
    }
    function traceAlong(d, ms) {
      if (aborting) return Promise.resolve();
      const tmp = document.createElementNS(NS, "path"); tmp.setAttribute("d", d);
      const len = tmp.getTotalLength(); const o = { t: 0 };
      if (activeTween) { activeTween.kill(); activeTween = null; }
      if (activeResolve) { const r = activeResolve; activeResolve = null; r(); }
      return new Promise((res) => { activeResolve = res; activeTween = gsap.to(o, { t: 1, duration: ms / 1000, ease: "power1.inOut", onUpdate() { const p = tmp.getPointAtLength(o.t * len); pos.x = p.x + 6; pos.y = p.y + 4; render(); }, onComplete: () => { activeTween = null; activeResolve = null; res(); } }); });
    }
    async function wave() { for (let i = 0; i < 3; i++) { await moveTo(pos.x + 14, pos.y - 8, 110); await moveTo(pos.x - 14, pos.y + 8, 110); } }
    async function nod() { for (let i = 0; i < 2; i++) { await moveTo(pos.x, pos.y + 10, 120); await moveTo(pos.x, pos.y - 10, 120); } }
    async function dodge(fromX, fromY) {
      const now = performance.now(); if (now - dodgeT < 1400 || busy) return; dodgeT = now;
      const ang = Math.atan2(pos.y - fromY, pos.x - fromX) + rnd(-0.6, 0.6);
      const x = clamp(pos.x + Math.cos(ang) * 220, OX() + 40, OX() + innerWidth - 80), y = clamp(pos.y + Math.sin(ang) * 160, scrollY + 90, scrollY + innerHeight - 80);
      moveTo(x, y, 260);
      if (opts.dodge && Math.random() < 0.5) quip(opts.dodge[(Math.random() * opts.dodge.length) | 0]);
    }
    async function park() { parked = true; await moveTo(OX() + innerWidth - 60, scrollY + innerHeight - 70, 500); }
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
      const out = ac.createStereoPanner ? ac.createStereoPanner() : null;
      if (out) out.connect(ac.destination);
      pen = { ac, buf, on: true, out: out || ac.destination, pan: out };
      ac.resume();
      ambience();
      return pen;
    }
    // room tone: filtered noise, barely there
    function ambience() {
      if (!pen || pen.room) return;
      const { ac, buf } = pen;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220;
      const g = ac.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.018, ac.currentTime + 2);
      src.connect(lp).connect(g).connect(ac.destination); src.start();
      pen.room = g;
    }
    // a sheet of paper sliding
    function paper() {
      if (!pen || !pen.on) return;
      const { ac, buf } = pen, t = ac.currentTime;
      const s = ac.createBufferSource(); s.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.35); f.Q.value = 0.8;
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      s.connect(f).connect(g).connect(pen.out); s.start(t); s.stop(t + 0.55);
    }
    // two soft notes when someone joins
    function chime() {
      if (!pen || !pen.on) return;
      const { ac } = pen, t = ac.currentTime;
      [523.25, 783.99].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * 0.12); g.gain.linearRampToValueAtTime(0.08, t + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.7);
        o.connect(g).connect(pen.out); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.8);
      });
    }
    // a tiny voice: one pitched blip per letter, like a creature in a video game
    function blip(ch) {
      if (!pen || !pen.on || !/[a-z0-9]/i.test(ch)) return;
      const { ac } = pen, t = ac.currentTime;
      const o = ac.createOscillator(), g = ac.createGain();
      const semis = (ch.toLowerCase().charCodeAt(0) * 7) % 12;
      o.type = "triangle"; o.frequency.value = 330 * Math.pow(2, semis / 12) * (opts.voicePitch || 1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(g).connect(pen.out); o.start(t); o.stop(t + 0.08);
    }
    function scratch(ms) {
      if (!pen || !pen.on) return;
      const { ac, buf } = pen, t = ac.currentTime;
      const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800 + Math.random() * 1200; f.Q.value = 1.2;
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.03); g.gain.linearRampToValueAtTime(0, t + Math.min(0.5, ms / 1000));
      s.connect(f).connect(g).connect(pen.out); s.start(t); s.stop(t + Math.min(0.5, ms / 1000) + 0.05);
    }

    // --- body language: never quite still. drifts, glances at what you look at, re-reads its notes
    let attention = null; // {x, y} in document coords, where the visitor is looking
    function setAttention(x, y) { attention = { x, y }; }
    async function fidget() {
      if (busy || parked || document.hidden) return;
      const r = Math.random();
      if (r < 0.45) {
        await moveTo(pos.x + rnd(-18, 18), pos.y + rnd(-12, 12), 500);
      } else if (r < 0.8 && attention && Math.hypot(attention.x - pos.x, attention.y - pos.y) > 120) {
        // glance: lean toward what the visitor is on, then settle back
        const gx = pos.x + (attention.x - pos.x) * 0.35, gy = pos.y + (attention.y - pos.y) * 0.35;
        const back = { x: pos.x, y: pos.y };
        await moveTo(gx, gy, 420); await wait(500);
        if (!busy) await moveTo(back.x + rnd(-8, 8), back.y + rnd(-8, 8), 520);
      } else {
        const notes = document.querySelectorAll(".note:not(.guest-note)");
        if (!notes.length) return;
        const n = notes[(Math.random() * notes.length) | 0].getBoundingClientRect();
        if (n.top < 0 || n.bottom > innerHeight) return;
        await moveTo(n.left + OX() + n.width * rnd(0.2, 0.9), n.top + scrollY + n.height + 6, 600);
      }
    }
    if (!mirror) (function fidgetLoop() { setTimeout(async () => { try { await fidget(); } catch (_) {} fidgetLoop(); }, 1800 + Math.random() * 3200); })();

    // beats queue up and run one at a time; what the visitor asks for goes to the front
    const queue = []; let running = false;
    function pump() {
      if (running || !queue.length) return;
      running = true;
      const fn = queue.shift();
      Promise.resolve().then(fn).catch((e) => console.warn("host beat failed", e)).then(() => {
        running = false; aborting = false;
        if (!queue.length) { busy = false; setStatus(""); }
        pump();
      });
    }
    function run(fn, { priority = false, interrupt = false } = {}) {
      if (priority) queue.unshift(fn); else queue.push(fn);
      if (interrupt && running) abortAll();
      busy = true; pump();
    }

    // --- the other window: repeat what the leader's host does, in this window's slice of the page
    const texts = new Map(), notes = new Map();
    function sketchSvg() { return document.querySelector("[data-sheet-sketch]"); }
    function dash(p, ms, glyph) {
      const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      if (glyph) p.classList.add("pen");
      gsap.to(p, { strokeDashoffset: 0, duration: ms / 1000, ease: "none", onComplete: () => { if (glyph) { p.classList.remove("pen"); p.classList.add("inked"); } } });
      scratch(ms);
    }
    function apply(m) {
      switch (m.t) {
        case "pos": pos.x = m.x; pos.y = m.y; render(); break;
        case "status": setStatus(m.s); break;
        case "click": el.classList.add("is-click"); setTimeout(() => el.classList.remove("is-click"), 140); break;
        case "ring": ringAt(m.x, m.y); break;
        case "carry": carryEl.textContent = m.text; carryEl.hidden = !m.text; el.classList.toggle("is-carry", !!m.text); break;
        case "grab": el.classList.toggle("is-grab", !!m.on); break;
        case "say":
          clearTimeout(sayT);
          if (m.hidden) { say.hidden = true; break; }
          say.hidden = false; say.classList.toggle("thinking", !!m.thinking); say.textContent = m.text || "";
          if (m.text) { const last = m.text[m.text.length - 1]; if (!texts.has("say") || texts.get("say") !== m.text) blip(last); texts.set("say", m.text); }
          break;
        case "stroke": {
          const into = intoEl(m.into); if (!into) break;
          const p = stroke(m.d, { width: m.width, ms: m.ms, into, id: m.sid }); if (p) mirrored.set(m.sid, p);
          break;
        }
        case "draw": {
          const p = m.sid != null ? mirrored.get(m.sid) : document.querySelectorAll(".name-svg path")[m.glyph];
          if (p) { dash(p, m.ms, m.sid == null); if (m.sid == null) marks.push({ el: p, kind: "glyph" }); }
          break;
        }
        case "stext": { const svg = intoEl(m.into || "sketch"); if (!svg) break; const t = document.createElementNS(NS, "text"); t.setAttribute("x", m.x); t.setAttribute("y", m.y); t.setAttribute("text-anchor", "middle"); if (m.size) t.style.fontSize = m.size; svg.append(t); texts.set(m.id, t); break; }
        case "stextSet": { const t = texts.get(m.id); if (t) { t.textContent = m.text; scratch(40); } break; }
        case "note": { const { n } = placeNote(m.text, m.x, m.y, { rotate: m.rotate, size: m.size || undefined, cls: m.cls, id: m.id }); n.textContent = ""; n.dataset.full = m.text; notes.set(m.id, n); break; }
        case "noteText": { const n = notes.get(m.id); if (n) { n.textContent = n.dataset.full.slice(0, m.n); scratch(40); if (m.n >= n.dataset.full.length) marks.push({ el: n, kind: "note", text: n.dataset.full }); } break; }
        case "rewind": rewind(m.v); break;
        case "noteRm": { const n = notes.get(m.id); if (n) n.remove(); notes.delete(m.id); break; }
        case "clear": ink.querySelectorAll(".stroke").forEach((x) => x.remove()); document.querySelectorAll("#page .note").forEach((x) => x.remove()); break;
      }
    }
    function snapshot() {
      return {
        t: "snap",
        pos: { x: pos.x, y: pos.y },
        say: say.hidden ? null : say.textContent,
        strokes: [...ink.querySelectorAll("path.stroke")].map((p) => ({ d: p.getAttribute("d"), width: p.style.strokeWidth, cls: p.getAttribute("class").replace("wet", "").trim(), sid: p.dataset.sid || null, tf: p.getAttribute("transform") || "" })),
        notes: [...document.querySelectorAll("#page .note")].map((n) => ({ text: n.textContent, x: parseFloat(n.style.left), y: parseFloat(n.style.top), rotate: parseFloat((n.style.transform.match(/-?[\d.]+/) || [0])[0]), size: n.style.fontSize || "", cls: n.className.replace(/hand|note/g, "").trim(), id: n.dataset.nid || null })),
        written: [...document.querySelectorAll(".name-svg path")].map((p) => p.classList.contains("inked")),
        nowrite: document.documentElement.classList.contains("no-write"),
      };
    }
    function applySnapshot(sn) {
      ink.querySelectorAll("path.stroke").forEach((x) => x.remove()); document.querySelectorAll("#page .note").forEach((x) => x.remove());
      for (const st of sn.strokes) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", st.d); p.setAttribute("class", st.cls || "stroke"); if (st.width) p.style.strokeWidth = st.width; if (st.sid) { p.dataset.sid = st.sid; mirrored.set(st.sid, p); } if (st.tf) p.setAttribute("transform", st.tf); ink.append(p); }
      marks.length = 0;
      for (const nt of sn.notes) { const { n } = placeNote(nt.text, nt.x, nt.y, { rotate: nt.rotate, size: nt.size || undefined, cls: nt.cls, id: nt.id || undefined }); if (nt.id) notes.set(nt.id, n); marks.push({ el: n, kind: "note", text: nt.text }); }
      ink.querySelectorAll("path.stroke").forEach((p) => marks.push({ el: p, kind: "stroke" }));
      document.querySelectorAll(".name-svg path.inked").forEach((p) => marks.unshift({ el: p, kind: "glyph" }));
      document.querySelectorAll(".name-svg path").forEach((p, i) => { if (sn.written[i]) { p.classList.remove("pen"); p.classList.add("inked"); } });
      document.documentElement.classList.toggle("no-write", !!sn.nowrite);
      pos.x = sn.pos.x; pos.y = sn.pos.y; render();
      if (sn.say) { say.hidden = false; say.classList.remove("thinking"); say.textContent = sn.say; } else say.hidden = true;
    }

    render();
    return {
      pos, el, moveTo, speak, quip, hush, circle, underline, arrow, pointAt, strike, click, writeNear, note, stroke, doodle, wave, nod, dodge, park, scrollTo, run, wait, setStatus, setAttention, blip,
      drawPath, sketch, paper, chime, traceRemote,
      clear() { ink.querySelectorAll(".stroke").forEach((x) => x.remove()); document.querySelectorAll("#page .note").forEach((x) => x.remove()); post({ t: "clear" }); },
      enableSound, get sound() { return !!(pen && pen.on); }, set sound(v) { if (v) enableSound(); if (pen) { pen.on = !!v; if (pen.room) pen.room.gain.setTargetAtTime(v ? 0.018 : 0, pen.ac.currentTime, 0.4); } },
      get busy() { return busy; }, get parked() { return parked; }, set parked(v) { parked = v; },
      keepOnScreen() {
        const top = scrollY + 90, bottom = scrollY + innerHeight - 80, left = OX() + 30, right = OX() + innerWidth - 60;
        if (pos.y < top || pos.y > bottom || pos.x < left || pos.x > right) { pos.y = clamp(pos.y, top, bottom); pos.x = clamp(pos.x, left, right); lastX = pos.x; lastY = pos.y; render(); }
      },
      apply, snapshot, applySnapshot, ringAt, anchor, reflow, rewind, carry, grab, jump, traceAlong, get marks() { return marks; },
      rectOf,
    };
  }
  window.Host = Host;
})();
