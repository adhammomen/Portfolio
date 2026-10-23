import { CONTENT as C } from "./content.js";
import { createScene } from "./scene.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const fine = matchMedia("(pointer: fine)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n, l = 2) => String(n).padStart(l, "0");
root.classList.add("is-loading");

// ------------------------------------------------------------------ content
$$("[data-name]").forEach((el) => (el.textContent = C.name));
$$("[data-role]").forEach((el) => (el.textContent = C.role));
$$("[data-location]").forEach((el) => (el.textContent = C.location));
$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
$("[data-hero-a]").textContent = C.hero.a; $("[data-hero-b]").textContent = C.hero.b; $("[data-hero-c]").textContent = C.hero.c;
$$("[data-github]").forEach((a) => (a.href = C.github));
const contact = $("[data-contact]");
contact.href = C.email ? `mailto:${C.email}` : C.github;
if (!C.email) { contact.target = "_blank"; contact.rel = "noopener"; }
$("[data-contact-text]").textContent = C.email || C.github.replace(/^https?:\/\//, "");

// the statement, one word per span so it can light up as you read
const st = $("[data-statement]");
C.statement.split(/\s+/).forEach((w, i, all) => { const s = document.createElement("span"); s.className = "w"; s.textContent = w; st.append(s, i < all.length - 1 ? " " : ""); });

// works
const list = $("[data-works]");
$("[data-count-works]").textContent = pad(C.projects.length);
const rows = C.projects.map((p, i) => {
  const li = document.createElement("li"); li.className = "work";
  li.innerHTML = `<button class="work-btn" type="button"><span class="mono work-idx">${pad(i + 1)}</span><span class="work-title"></span><span class="mono work-kind"></span><span class="mono work-year"></span></button>`;
  $(".work-title", li).textContent = p.title; $(".work-kind", li).textContent = p.kind; $(".work-year", li).textContent = p.year;
  list.append(li);
  return li;
});

// capabilities
const caps = $("[data-caps]");
C.capabilities.forEach((c) => { const d = document.createElement("div"); d.className = "cap"; d.innerHTML = `<h3></h3><ul></ul>`; $("h3", d).textContent = c.title; c.items.forEach((t) => { const li = document.createElement("li"); li.textContent = t; $("ul", d).append(li); }); caps.append(d); });

// clock: the visitor's own time
const clock = $("[data-clock]");
const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
tick(); setInterval(tick, 15000);

// ------------------------------------------------------------------ the object
let gl = null;
try { gl = createScene($(".gl"), { lite: !fine || innerWidth < 820 }); } catch (e) { console.warn("WebGL unavailable", e); $(".gl").remove(); }
const STATES = {
  hero:    { x: 0.42, y: 0.08, s: 1.08, amp: 0.19, freq: 0.75, twist: 0.0, film: 0.85, dark: 0, spin: 1 },
  about:   { x: 0.66, y: -0.15, s: 0.74, amp: 0.13, freq: 1.2, twist: 0.8, film: 0.95, dark: 0, spin: 0.6 },
  works:   { x: 0.94, y: -0.05, s: 0.46, amp: 0.22, freq: 0.95, twist: 0.2, film: 1.0, dark: 0, spin: 1.4 },
  caps:    { x: -0.72, y: 0.15, s: 0.46, amp: 0.11, freq: 1.6, twist: 1.4, film: 0.8, dark: 0, spin: 0.8 },
  contact: { x: 0.36, y: 0.02, s: 1.15, amp: 0.26, freq: 0.7, twist: 0.0, film: 1.0, dark: 1, spin: 1.2 },
  detail:  { x: 0.62, y: 0.0, s: 0.95, amp: 0.24, freq: 0.85, twist: 0.3, film: 1.0, dark: 0, spin: 1 },
};
const mobileX = { hero: 0.2, about: 0.35, works: 0.55, caps: -0.4, contact: 0.15, detail: 0.1 };
const mobileY = { hero: 0.75, about: -1.0, works: -1.25, caps: 1.0, contact: -0.6, detail: 0.95 };
const HUE = 0.55;
let section = "hero", hoverHue = null, detailOpen = -1;
function applyState() {
  if (!gl) return;
  const key = detailOpen > -1 ? "detail" : section;
  const s = { ...STATES[key] };
  if (innerWidth < 820) { s.x = mobileX[key]; s.y = mobileY[key]; s.s *= 0.85; }
  s.hue = detailOpen > -1 ? C.projects[detailOpen].hue : hoverHue != null ? hoverHue : HUE + (key === "about" ? 0.12 : key === "caps" ? 0.3 : key === "contact" ? -0.1 : 0);
  if (hoverHue != null && key === "works" && innerWidth >= 820) { s.x = 0.8; s.s = 0.62; s.amp = 0.28; s.film = 1.15; }
  gl.set(s);
}
applyState();

// ------------------------------------------------------------------ smooth scroll + section tracking
let lenis = null;
if (!reduce && window.Lenis) { lenis = new Lenis({ lerp: 0.085, smoothWheel: true }); }
const hasGsap = !!(window.gsap && window.ScrollTrigger);
if (hasGsap) gsap.registerPlugin(ScrollTrigger);
if (lenis) { if (hasGsap) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); } else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); } }
const scrollTo = (target) => { const el = typeof target === "string" ? $(target) : target; if (!el) return; if (lenis) lenis.scrollTo(el, { duration: 1.6 }); else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); };
$$("[data-link]").forEach((a) => a.addEventListener("click", (e) => { const h = a.getAttribute("href"); if (!h || !h.startsWith("#")) return; e.preventDefault(); if (detailOpen > -1) closeDetail(); scrollTo(h); }));

const sections = $$("[data-state]");
function track() {
  const mid = innerHeight * 0.5;
  let cur = section;
  for (const s of sections) { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { cur = s.dataset.state; break; } }
  if (cur !== section) { section = cur; root.classList.toggle("dark", section === "contact"); applyState(); }
  // light up the statement word by word as it passes the reading line
  const words = st.children, r = st.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.35)));
  const lit = Math.floor(p * words.length * 1.05);
  for (let i = 0; i < words.length; i++) words[i].style.opacity = i < lit ? 1 : 0.14;
}
addEventListener("scroll", track, { passive: true });
track();

// ------------------------------------------------------------------ cursor + preview
const cursor = $(".cursor");
const preview = document.createElement("div"); preview.className = "preview"; preview.innerHTML = `<div class="preview-inner"></div><p class="preview-name serif"></p><p class="mono preview-cap"><span></span><span></span></p>`;
document.body.append(preview);
const pv = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
const cu = { x: -100, y: -100, tx: -100, ty: -100 };
if (fine) {
  root.classList.add("has-cursor");
  addEventListener("pointermove", (e) => { cu.tx = e.clientX; cu.ty = e.clientY; pv.tx = e.clientX + Math.min(260, innerWidth * 0.18); pv.ty = e.clientY; }, { passive: true });
  (function follow() {
    cu.x += (cu.tx - cu.x) * 0.35; cu.y += (cu.ty - cu.y) * 0.35;
    pv.x += (pv.tx - pv.x) * 0.12; pv.y += (pv.ty - pv.y) * 0.12;
    cursor.style.transform = `translate3d(${cu.x}px,${cu.y}px,0)`;
    const tilt = Math.max(-8, Math.min(8, (pv.tx - pv.x) * 0.06));
    preview.style.left = pv.x + "px"; preview.style.top = pv.y + "px"; preview.style.rotate = tilt + "deg";
    requestAnimationFrame(follow);
  })();
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("a, button");
    cursor.classList.toggle("is-link", !!t && !t.closest(".work"));
  });
}
const hsl = (h, s, l) => `hsl(${Math.round(((h % 1) + 1) % 1 * 360)} ${s}% ${l}%)`;
rows.forEach((li, i) => {
  const p = C.projects[i];
  const btn = $(".work-btn", li);
  const enter = () => {
    hoverHue = p.hue; applyState();
    $(".preview-inner", preview).style.background = `radial-gradient(120% 80% at 30% 20%, ${hsl(p.hue, 70, 88)}, ${hsl(p.hue + 0.08, 55, 62)} 45%, ${hsl(p.hue + 0.2, 45, 22)})`;
    const [a, b] = $$(".preview-cap span", preview); a.textContent = p.status; b.textContent = p.year; $(".preview-name", preview).textContent = p.title;
    preview.classList.add("on"); cursor.classList.add("is-view");
  };
  const leave = () => { hoverHue = null; applyState(); preview.classList.remove("on"); cursor.classList.remove("is-view"); };
  li.addEventListener("pointerenter", enter); li.addEventListener("pointerleave", leave);
  btn.addEventListener("focus", () => { hoverHue = p.hue; applyState(); });
  btn.addEventListener("blur", () => { hoverHue = null; applyState(); });
  btn.addEventListener("click", () => { leave(); openDetail(i); });
});

// ------------------------------------------------------------------ project detail
const detail = $(".detail");
let lastFocus = null;
function fillDetail(i) {
  const p = C.projects[i];
  $("[data-d-idx]").textContent = `${pad(i + 1)} / ${pad(C.projects.length)}`;
  $("[data-d-title]").textContent = p.title;
  $("[data-d-year]").textContent = p.year; $("[data-d-kind]").textContent = p.kind; $("[data-d-status]").textContent = p.status;
  $("[data-d-text]").textContent = p.text;
  const links = $("[data-d-links]"); links.replaceChildren();
  if (p.link) { const a = document.createElement("a"); a.href = p.link; a.target = "_blank"; a.rel = "noopener"; a.textContent = "View source ↗"; links.append(a); }
  else { const s = document.createElement("span"); s.className = "label"; s.textContent = "Link coming soon"; links.append(s); }
  if (hasGsap && !reduce) gsap.fromTo($(".detail-title .line > span"), { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: "expo.out", delay: 0.15 });
}
function openDetail(i) {
  lastFocus = document.activeElement;
  detailOpen = i; fillDetail(i);
  root.classList.remove("dark"); root.classList.add("detail-open");
  detail.hidden = false; requestAnimationFrame(() => detail.classList.add("on"));
  if (lenis) lenis.stop();
  applyState();
  $("[data-close]").focus({ preventScroll: true });
}
function closeDetail() {
  if (detailOpen < 0) return;
  detailOpen = -1; detail.classList.remove("on"); root.classList.remove("detail-open");
  setTimeout(() => { if (detailOpen < 0) detail.hidden = true; }, 700);
  if (lenis) lenis.start();
  root.classList.toggle("dark", section === "contact");
  applyState();
  if (lastFocus) lastFocus.focus({ preventScroll: true });
}
$("[data-close]").addEventListener("click", closeDetail);
$("[data-prev]").addEventListener("click", () => { detailOpen = (detailOpen - 1 + C.projects.length) % C.projects.length; fillDetail(detailOpen); applyState(); });
$("[data-next]").addEventListener("click", () => { detailOpen = (detailOpen + 1) % C.projects.length; fillDetail(detailOpen); applyState(); });
addEventListener("keydown", (e) => {
  if (detailOpen < 0) return;
  if (e.key === "Escape") closeDetail();
  if (e.key === "ArrowRight") $("[data-next]").click();
  if (e.key === "ArrowLeft") $("[data-prev]").click();
});

// ------------------------------------------------------------------ loader + intro
const count = $("[data-count]"), bar = $(".loader-bar span"), loader = $(".loader");
const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
const minTime = new Promise((r) => setTimeout(r, reduce ? 200 : 1400));
const prog = { v: 0 };
let done = false;
Promise.all([fontsReady, minTime]).then(() => (done = true));
(function loadTick() {
  prog.v += ((done ? 100 : 86) - prog.v) * (done ? 0.18 : 0.05);
  const v = Math.round(prog.v);
  count.textContent = pad(v, 3); bar.style.transform = `scaleX(${v / 100})`;
  if (v >= 100) return reveal();
  requestAnimationFrame(loadTick);
})();
function reveal() {
  root.classList.remove("is-loading");
  if (!hasGsap || reduce) { loader.remove(); return; }
  const tl = gsap.timeline();
  tl.to(loader, { yPercent: -100, duration: 1.1, ease: "expo.inOut", onComplete: () => loader.remove() })
    .from(".hero-title .line > span", { yPercent: 115, duration: 1.4, ease: "expo.out", stagger: 0.09 }, "-=0.45")
    .from(".hero-meta > *, .hero-foot > *, .top > *", { y: 16, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.05 }, "-=1.1");
}

// ------------------------------------------------------------------ scroll choreography
if (hasGsap && !reduce) {
  $$(".works .work, .cap, .label").forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 92%" } }));
  gsap.from(".contact-title .line > span", { yPercent: 115, duration: 1.4, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".contact-title", start: "top 80%" } });
  gsap.to(".hero-title", { yPercent: -18, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  addEventListener("load", () => ScrollTrigger.refresh());
}
addEventListener("resize", () => { applyState(); track(); });
