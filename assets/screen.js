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
  };
  try { S.bus = new BroadcastChannel("host-windows"); } catch (_) { S.bus = null; }
  const root = document.documentElement;
  const emit = (k, d) => (S.on[k] || []).forEach((fn) => { try { fn(d); } catch (e) { console.warn(e); } });
  S.listen = (k, fn) => ((S.on[k] = S.on[k] || []).push(fn));
  S.post = (msg) => { if (S.bus) S.bus.postMessage({ ...msg, from: S.id }); };
  const base = () => location.href.split("#")[0];

  // page-space helpers: what the host and the pen use instead of raw client coords
  S.px = (clientX) => clientX + S.vx;
  S.py = (clientY) => clientY + scrollY;

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
    (function tick() { measure(); requestAnimationFrame(tick); })();
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
  function announce() { S.post({ t: "here", leader: S.leader, born: S.born, vx: S.vx, vy: S.vy, w: innerWidth, h: innerHeight, sy: S.sharedY }); }
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
      S.peers.set(m.from, { vx: m.vx, vy: m.vy, w: m.w, h: m.h, sy: m.sy, leader: m.leader, born: m.born, at: Date.now() });
      if (fresh) { peersChanged(); announce(); emit("hello", { id: m.from, ...S.peers.get(m.from) }); } else emit("peers", S.peers);
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

  // --- the other window: where it is on the monitor, in page coords
  S.other = () => { for (const p of S.peers.values()) return { x: p.vx, y: S.sharedY + p.vy, w: p.w, h: p.h, vx: p.vx, vy: p.vy }; return null; };
  S.leaderPeer = () => { for (const p of S.peers.values()) if (p.leader) return p; return null; };

  // --- open a second window next to this one (must run from a click)
  S.openSecond = () => {
    const room = screen.availWidth - (screenX + outerWidth);
    const w = Math.round(room > 480 ? Math.min(760, room - 24) : Math.max(420, Math.min(720, screen.availWidth * 0.42)));
    const left = room > 480 ? screenX + outerWidth + 8 : Math.max(0, screen.availWidth - w - 8);
    const feat = `popup=yes,width=${w},height=${Math.max(600, outerHeight - 60)},left=${left},top=${Math.max(0, screenY)}`;
    let win = null;
    try { win = window.open(base() + "#w2", "host-window-2", feat); } catch (_) {}
    return !!win;
  };

  window.SCREEN = S;
})();
