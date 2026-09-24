// Screen: with two windows open, the page stops belonging to a window and pins itself to the
// monitor. Each window is a hole onto the same page, at the place where it sits on the desk.
// Windows of this site talk over a BroadcastChannel; the first one is the leader (it runs the
// host), the others mirror it. With one window (and on phones) this is inert.
(function () {
  const fine = matchMedia("(pointer: fine)").matches;
  const isPopup = /(^|[#&])w2\b/.test(location.hash);
  const S = {
    id: Math.random().toString(36).slice(2, 8),
    born: Date.now(),
    leader: !isPopup,
    fine,
    vx: 0, vy: 0,                 // where this window's viewport sits on the monitor
    sw: Math.max(screen.width || innerWidth, innerWidth),
    sh: Math.max(600, screen.availHeight || innerHeight),
    multi: false,                 // more than one window open: the page is pinned to the monitor
    peers: new Map(),             // id -> { vx, vy, w, h, sy, leader, born, at }
    bus: null, page: null, on: {},
    sharedY: 0,                   // the page's scroll, shared by every window
    applyScroll: null,            // main.js sets this (it knows about the smooth scroller)
    second: null,                 // the popup this window opened, if any: the host can move it
    instrument: "desk",           // what this window is: "desk" (a slice of the page) or "xray" (it sits over the leader)
    seam: false,                  // two windows lined up edge to edge
  };
  try { S.bus = new BroadcastChannel("host-windows"); } catch (_) { S.bus = null; }
  const root = document.documentElement;
  const emit = (k, d) => (S.on[k] || []).forEach((fn) => { try { fn(d); } catch (e) { console.warn(e); } });
  S.listen = (k, fn) => ((S.on[k] = S.on[k] || []).push(fn));
  S.post = (msg) => { if (S.bus) S.bus.postMessage({ ...msg, from: S.id }); };
  const base = () => location.href.split("#")[0];

  // page-space helpers: what the host and the pen use instead of raw client coords
  S.zoom = () => (S.instrument === "lens" ? 2 : 1);
  S.px = (clientX) => (S.zoom() === 1 ? clientX + S.vx : S.vx + innerWidth / 2 + (clientX - innerWidth / 2) / 2);
  S.py = (clientY) => (S.zoom() === 1 ? clientY + scrollY : scrollY + innerHeight / 2 + (clientY - innerHeight / 2) / 2);
  // page -> client, for things drawn outside #page (the host)
  S.cx = (pageX) => (S.zoom() === 1 ? pageX - S.vx : innerWidth / 2 + (pageX - S.vx - innerWidth / 2) * 2);
  S.cy = (pageY) => (S.zoom() === 1 ? pageY - scrollY : innerHeight / 2 + (pageY - scrollY - innerHeight / 2) * 2);

  // --- geometry: where this window is on the monitor
  function measure() {
    if (!S.multi) return;
    const chromeW = Math.max(0, (outerWidth - innerWidth) / 2);
    const chromeH = Math.max(0, outerHeight - innerHeight);
    const vx = Math.min(Math.max(0, Math.round(screenX + chromeW)), Math.max(0, S.sw - innerWidth));
    const vy = Math.max(0, Math.round(screenY + chromeH));
    if (vx !== S.vx || vy !== S.vy) {
      S.vx = vx; S.vy = vy;
      place();
      emit("move", S);
    }
  }
  let placing = false;
  function place() {
    if (!S.page) return;
    S.page.style.marginLeft = S.multi ? -S.vx + "px" : "";
    placing = true;
    try { if (S.applyScroll) S.applyScroll(S.sharedY + (S.multi ? S.vy : 0)); else window.scrollTo(0, S.sharedY + (S.multi ? S.vy : 0)); } finally { placing = false; }
  }
  // --- mode: one window = a normal page. two = the page reflows to the size of the monitor
  function setMulti(on) {
    on = !!on && fine;
    if (on === S.multi) return;
    S.multi = on;
    root.classList.toggle("screen-space", on);
    root.style.setProperty("--pw", on ? S.sw + "px" : "100vw");
    root.style.setProperty("--ph", on ? S.sh + "px" : "100svh");
    if (S.page) S.page.style.width = on ? S.sw + "px" : "";
    S.vx = 0; S.vy = 0;
    if (on) measure(); else place();
    emit("mode", on);
  }
  S.setMulti = setMulti;
  function init() {
    S.page = document.getElementById("page");
    (function tick() { measure(); if (S.instrument === "lens" && S.page) S.page.style.transformOrigin = `${S.vx + innerWidth / 2}px ${scrollY + innerHeight / 2}px`; requestAnimationFrame(tick); })();
    addEventListener("resize", measure);
    addEventListener("scroll", () => {
      if (placing || applying) return;
      const y = Math.max(0, scrollY - (S.multi ? S.vy : 0));
      if (Math.abs(y - S.sharedY) < 1) return;
      S.sharedY = y;
      if (S.multi) S.post({ t: "scroll", y });
    }, { passive: true });
    announce();
    // a popup with nobody to follow becomes the leader
    if (!S.leader) setTimeout(() => { if (![...S.peers.values()].some((p) => p.leader)) location.replace(base()); }, 2500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  // --- presence: every window announces itself and its viewport, a few times a second
  function announce() { S.post({ t: "here", leader: S.leader, born: S.born, vx: S.vx, vy: S.vy, w: innerWidth, h: innerHeight, sy: S.sharedY, sx: screenX, syy: screenY, ow: outerWidth, oh: outerHeight }); }
  setInterval(announce, 350);
  addEventListener("pagehide", () => S.post({ t: "bye" }));
  addEventListener("beforeunload", () => S.post({ t: "bye" }));
  let applying = false;
  function peersChanged() {
    const n = S.peers.size;
    setMulti(n > 0);
    emit("peers", S.peers);
  }
  if (S.bus) S.bus.onmessage = (e) => {
    const m = e.data; if (!m || m.from === S.id) return;
    if (m.t === "here") {
      // two leaders: the elder keeps the room, the other reloads as a second window
      if (m.leader && S.leader && (m.born < S.born || (m.born === S.born && m.from < S.id))) { location.replace(base() + "#w2"); return; }
      const fresh = !S.peers.has(m.from);
      S.peers.set(m.from, { vx: m.vx, vy: m.vy, w: m.w, h: m.h, sy: m.sy, leader: m.leader, born: m.born, sx: m.sx, syy: m.syy, ow: m.ow, oh: m.oh, at: Date.now() });
      if (fresh) { peersChanged(); announce(); emit("hello", { id: m.from, ...S.peers.get(m.from) }); } else emit("peers", S.peers);
      relate();
    } else if (m.t === "bye") {
      drop(m.from);
    } else if (m.t === "scroll") {
      if (!S.multi) return;
      applying = true; S.sharedY = m.y;
      try { if (S.applyScroll) S.applyScroll(m.y + S.vy); else window.scrollTo(0, m.y + S.vy); } finally { applying = false; }
    } else {
      emit("op", m);
    }
  };
  function drop(id) {
    const p = S.peers.get(id); if (!p) return;
    S.peers.delete(id);
    peersChanged();
    emit("bye", { id, ...p });
    // the leader left: this window takes over the page, fresh
    if (p.leader && !S.leader && ![...S.peers.values()].some((q) => q.leader)) { emit("leader-lost", p); setTimeout(() => location.replace(base()), 900); }
  }
  // windows that went quiet (closed without saying bye)
  setInterval(() => { const now = Date.now(); for (const [id, p] of S.peers) if (now - p.at > 1500) drop(id); }, 500);

  // --- instruments: a window that sits over the first one is an x-ray of it; two windows edge to edge are one page
  const rect = (p) => ({ l: p.vx, t: p.vy, r: p.vx + p.w, b: p.vy + p.h });
  const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  function relate() {
    if (!S.multi) return;
    const me = { l: S.vx, t: S.vy, r: S.vx + innerWidth, b: S.vy + innerHeight };
    const others = [...S.peers.values()];
    // x-ray: a follower mostly on top of the leader
    if (!S.leader) {
      const L = others.find((p) => p.leader);
      // over the leader: a small window is a loupe (the page at 2x), a big one an x-ray of it
      const over = L && overlap(me, rect(L)) / Math.max(1, innerWidth * innerHeight) > 0.55;
      const inst = !over ? "desk" : innerWidth < 640 && innerHeight < 560 ? "lens" : "xray";
      if (inst !== S.instrument) { S.instrument = inst; root.classList.toggle("xray", inst === "xray"); root.classList.toggle("lens", inst === "lens"); if (inst !== "lens" && S.page) S.page.style.transformOrigin = ""; emit("instrument", inst); S.post({ t: "instrument", inst }); }
    }
    // seam: an edge-to-edge neighbour, roughly level
    const seam = others.some((p) => { const o = rect(p); const level = Math.abs(o.t - me.t) < 80; const gapR = o.l - me.r, gapL = me.l - o.r; return level && ((gapR >= -8 && gapR < 40) || (gapL >= -8 && gapL < 40)); });
    if (seam !== S.seam) { S.seam = seam; root.classList.toggle("seam", seam); emit("seam", seam); }
  }
  S.listen("move", relate);

  // --- the other window: where it is on the monitor, in page coords
  S.other = () => { for (const p of S.peers.values()) return { x: p.vx, y: S.sharedY + p.vy, w: p.w, h: p.h, vx: p.vx, vy: p.vy, sx: p.sx, syy: p.syy, ow: p.ow, oh: p.oh }; return null; };
  S.leaderPeer = () => { for (const p of S.peers.values()) if (p.leader) return p; return null; };

  // --- open a second window next to this one (must run from a click)
  S.openSecond = () => {
    let saved = null; try { saved = JSON.parse(localStorage.getItem("host.win2") || "null"); } catch (_) {}
    const room = screen.availWidth - (screenX + outerWidth);
    const w = saved ? saved.w : Math.round(room > 480 ? Math.min(760, room - 24) : Math.max(420, Math.min(720, screen.availWidth * 0.42)));
    const h = saved ? saved.h : Math.max(600, outerHeight - 60);
    const left = saved ? saved.x : room > 480 ? screenX + outerWidth + 8 : Math.max(0, screen.availWidth - w - 8);
    const top = saved ? saved.y : Math.max(0, screenY);
    const feat = `popup=yes,width=${w},height=${h},left=${left},top=${top}`;
    let win = null;
    try { win = window.open(base() + "#w2", "host-window-2", feat); } catch (_) {}
    S.second = win || null;
    return !!win;
  };
  // remember where the second window sits (the leader learns it from the announcements)
  setInterval(() => { if (!S.leader) return; for (const p of S.peers.values()) if (!p.leader && p.ow) { try { localStorage.setItem("host.win2", JSON.stringify({ x: p.sx, y: p.syy, w: p.ow, h: p.oh })); } catch (_) {} break; } }, 2000);
  // the host moves the second window: only works on a popup this window opened. resolves false if the browser refused
  S.moveSecond = (x, y, w, h, ms = 900) => new Promise((res) => {
    const win = S.second; if (!win || win.closed) return res(false);
    const p = S.other(); if (!p || p.sx == null) return res(false);
    const from = { x: p.sx, y: p.syy, w: p.ow, h: p.oh }, t0 = performance.now();
    x = Math.round(x); y = Math.round(y); w = w ? Math.round(w) : from.w; h = h ? Math.round(h) : from.h;
    let moved = false;
    (function step() {
      const k = Math.min(1, (performance.now() - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      try {
        if (w !== from.w || h !== from.h) win.resizeTo(Math.round(from.w + (w - from.w) * e), Math.round(from.h + (h - from.h) * e));
        win.moveTo(Math.round(from.x + (x - from.x) * e), Math.round(from.y + (y - from.y) * e));
      } catch (_) { return res(false); }
      const q = S.other(); if (q && Math.abs(q.sx - from.x) > 2) moved = true;
      if (k < 1) requestAnimationFrame(step); else setTimeout(() => { const q2 = S.other(); res(moved || (q2 && Math.abs(q2.sx - x) < 30)); }, 250);
    })();
  });

  window.SCREEN = S;
})();
