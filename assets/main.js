(function () {
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;
  const STATUS = { finished: "Complete", "in-progress": "In progress" };

  // ------------------------------------------------------------------ content
  document.title = `${D.name} — ${D.role}`;
  $$("[data-bind]").forEach((el) => (el.textContent = D[el.dataset.bind] || ""));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $("[data-initials]").textContent = D.name.split(/\s+/).map((w) => w[0]).join("");
  $$("[data-github]").forEach((a) => (a.href = D.links.github));
  const contact = $("[data-contact]");
  contact.href = D.links.email ? `mailto:${D.links.email}` : D.links.github;
  if (!D.links.email) contact.target = "_blank";
  if (!fine) $("[data-hint]").textContent = "Drag or tilt";

  const man = $("[data-manifesto]");
  D.manifesto.split(/\s+/).forEach((w) => { const s = document.createElement("span"); s.className = "w"; s.textContent = w; man.append(s, " "); });

  $("[data-count]").textContent = String(D.projects.length).padStart(2, "0");
  const plates = $(".plates");
  const plateEls = D.projects.map((p, i) => {
    const b = document.createElement("button");
    b.className = "plate"; b.type = "button";
    b.innerHTML = `<span class="plate-fill"></span><span class="plate-idx mono">${String(i + 1).padStart(2, "0")}</span>
      <h3 class="plate-title"></h3>
      <span class="plate-side mono"><span class="status ${p.status}">${STATUS[p.status] || p.status}</span><span>${p.year || ""}</span></span>
      <p class="plate-desc"></p>`;
    $(".plate-title", b).textContent = p.title;
    $(".plate-desc", b).textContent = p.description;
    plates.append(b);
    return b;
  });

  // ------------------------------------------------------------------ mass from ink
  // A glyph's mass is proportional to how much ink it has, measured once on a small canvas.
  const inkCache = {};
  function inkArea(ch, font) {
    const key = ch + font;
    if (inkCache[key]) return inkCache[key];
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const x = c.getContext("2d");
    x.font = font; x.textBaseline = "middle"; x.textAlign = "center"; x.fillStyle = "#000";
    x.fillText(ch, 32, 34);
    const d = x.getImageData(0, 0, 64, 64).data; let n = 0;
    for (let i = 3; i < d.length; i += 4) n += d[i];
    return (inkCache[key] = n / 255 / 4096);
  }

  // ------------------------------------------------------------------ stages
  const stages = [];
  const STORE = "weight.v1";
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (_) {}

  function letterStage(el, text, { accentIndex = -1, restitution } = {}) {
    const stage = Stage(el, { restitution });
    const { w, h } = stage.size;
    const words = text.split(/\s+/);
    const glyphs = [];
    words.forEach((word, wi) => [...word].forEach((ch) => glyphs.push({ ch, wi })));
    const cols = glyphs.length;
    // size the glyphs from the stage: the longest word fits one row, two rows fit the height
    const maxLen = Math.max(...words.map((x) => x.length));
    const size = Math.floor(Math.min((w * 0.9) / (maxLen * 0.62), (h - 24) / 2.15, 420));
    el.style.setProperty("--letter", `${size}px`);
    const font = "500 condensed 40px 'Bricolage Grotesque'";
    const maxInk = Math.max(...glyphs.map((g) => inkArea(g.ch, font)));
    const remembered = saved[el.dataset.stage];
    glyphs.forEach((g, i) => {
      const span = document.createElement("span");
      span.className = "letter" + (i === accentIndex ? " accent" : "");
      span.textContent = g.ch;
      span.dataset.weight = (inkArea(g.ch, font) / maxInk * 4.8 + 0.6).toFixed(1);
      el.append(span);
      const slot = w / (cols + 1) * (i + 1);
      const from = remembered && remembered[i];
      const item = stage.add(span, {
        x: from ? clamp(from.x, 40, w - 40) : slot + (Math.random() - 0.5) * 20,
        y: from ? clamp(from.y, -h, h - 40) : -h * (0.4 + Math.random() * 0.9) - i * 30,
        angle: from ? from.a : (Math.random() - 0.5) * 0.6,
        mass: 2 + (inkArea(g.ch, font) / maxInk) * 12,
      });
      item.el.addEventListener("pointerenter", () => hud(`${g.ch} · ${span.dataset.weight} kg`));
    });
    stages.push(stage);
    return stage;
  }

  function pillStage(el) {
    const stage = Stage(el, { restitution: 0.35, probe: 36 });
    const { w, h } = stage.size;
    D.capabilities.forEach((c, i) => {
      const span = document.createElement("span");
      span.className = "pill" + (i % 4 === 1 ? " accent" : i % 4 === 3 ? " ink" : "");
      span.textContent = c;
      el.append(span);
      stage.add(span, { x: 60 + Math.random() * (w - 120), y: -h * (0.3 + Math.random()) - i * 40, angle: (Math.random() - 0.5) * 0.8, mass: 3 + c.length * 0.4, shape: "pill" });
    });
    stages.push(stage);
    return stage;
  }

  // stages are built once the display font is in, so glyph boxes and stage heights are final
  const fontsReady = document.fonts ? document.fonts.load('500 100px "Bricolage Grotesque"').then(() => document.fonts.ready).catch(() => {}) : Promise.resolve();
  let heroStage, capsStage, ctaStage;
  function buildStages() {
  heroStage = letterStage($('[data-stage="hero"]'), D.name, { accentIndex: D.name.replace(/\s/g, "").length - 1 });
  // assemble targets: the name laid out as a clean line (wraps to two lines if it must)
  function nameTargets(stage) {
    const { w, h } = stage.size, gap = 10;
    const words = D.name.split(/\s+/);
    let i = 0; const rows = [];
    words.forEach((word) => {
      const ws = stage.items.slice(i, i + word.length); i += word.length;
      rows.push(ws);
    });
    const widths = rows.map((r) => r.reduce((a, it) => a + it.w + gap, 0));
    const rowH = stage.items[0].h;
    const oneLine = widths.reduce((a, b) => a + b, 0) + 40 < w && !(rows.length > 1 && h >= rows.length * (rowH + 6) + 16);
    const targets = [];
    if (oneLine) {
      let x = (w - widths.reduce((a, b) => a + b, 0) - 40) / 2;
      rows.forEach((r, ri) => { r.forEach((it) => { targets.push({ x: x + it.w / 2, y: h - it.h / 2 - 8 }); x += it.w + gap; }); x += 40; });
    } else {
      // stacked wordmark: rows share a left edge so the upper row rests on the lower one
      const x0 = Math.max(16, (w - Math.max(...widths)) / 2);
      rows.forEach((r, ri) => {
        let x = x0;
        const y = h - (rows.length - ri - 1) * rowH - rowH / 2 - 4;
        r.forEach((it) => { targets.push({ x: x + it.w / 2, y }); x += it.w + gap; });
      });
    }
    return targets;
  }
  $("[data-assemble]").addEventListener("click", () => { heroStage.assemble(nameTargets(heroStage)); hud("Assembled"); });
  if (!saved.hero) setTimeout(() => heroStage.assemble(nameTargets(heroStage), 1200), 2600);
  capsStage = pillStage($('[data-stage="caps"]'));
  ctaStage = letterStage($('[data-stage="cta"]'), "Say hello", { restitution: 0.4 });
  for (const s of stages) s.start();
  stages.forEach((s) => s.onCollide((sp, pair) => tick(sp, Math.max(pair.bodyA.mass, pair.bodyB.mass) || 4)));
  }

  // remember where the hero pile settled
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const out = {};
      [["hero", heroStage], ["cta", ctaStage]].forEach(([k, s]) => (out[k] = s.items.map(({ body }) => ({ x: Math.round(body.position.x), y: Math.round(body.position.y), a: +body.angle.toFixed(2) }))));
      try { localStorage.setItem(STORE, JSON.stringify(out)); } catch (_) {}
    }, 800);
  }
  addEventListener("pointerup", save);
  addEventListener("scroll", save, { passive: true });

  // the pointer is a body in every stage; keyboard/space and the button scatter the pile
  const probeEl = $(".probe");
  addEventListener("pointermove", (e) => {
    stages.forEach((s) => s.probeTo(e.clientX, e.clientY));
    if (fine) {
      const over = !!e.target.closest(".stage");
      probeEl.classList.toggle("on", over);
      if (over) probeEl.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
    }
  });
  addEventListener("touchmove", (e) => stages.forEach((s) => s.probeTo(e.touches[0].clientX, e.touches[0].clientY)), { passive: true });
  $("[data-scatter]").addEventListener("click", () => { stages.forEach((s) => s.scatter(1)); hud("Scattered"); });
  addEventListener("keydown", (e) => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); stages.forEach((s) => s.scatter(0.8)); } });

  // gravity follows the phone; a shake scatters
  const tiltBtn = $("[data-tilt]");
  function onTilt(e) {
    if (e.gamma == null) return;
    const gx = clamp(e.gamma / 45, -1, 1), gy = clamp((e.beta - 40) / 45, -1, 1);
    stages.forEach((s) => s.gravity(gx * 1.4, 0.5 + gy * 1.2));
  }
  let lastShake = 0;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity; if (!a) return;
    const g = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (g > 22 && performance.now() - lastShake > 1200) { lastShake = performance.now(); stages.forEach((s) => s.scatter(1.2)); hud("Shaken"); }
  }
  if (!fine && typeof DeviceOrientationEvent !== "undefined") {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      tiltBtn.hidden = false;
      tiltBtn.addEventListener("click", async () => {
        try {
          if ((await DeviceOrientationEvent.requestPermission()) === "granted") { addEventListener("deviceorientation", onTilt); addEventListener("devicemotion", onMotion); }
        } catch (_) {}
        tiltBtn.hidden = true;
      });
    } else {
      addEventListener("deviceorientation", onTilt);
      addEventListener("devicemotion", onMotion);
    }
  }

  // ------------------------------------------------------------------ HUD line + clock
  const hint = $("[data-hint]");
  let hudT = 0; const hintDefault = hint.textContent;
  function hud(msg) { hint.textContent = msg; clearTimeout(hudT); hudT = setTimeout(() => (hint.textContent = hintDefault), 1600); }
  const clockEl = $("[data-clock]");
  setInterval(() => { const d = new Date(); clockEl.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":"); }, 1000);

  // ------------------------------------------------------------------ sound: collisions as percussion
  const soundBtn = $("[data-sound]");
  let ac = null, soundOn = false;
  function tick(speed, mass) {
    if (!soundOn || !ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    const base = 90 + 600 / Math.max(1, mass);
    o.type = "triangle"; o.frequency.setValueAtTime(base * 2, t); o.frequency.exponentialRampToValueAtTime(base, t + 0.06);
    f.type = "lowpass"; f.frequency.value = 1800;
    const v = clamp(speed / 25, 0.05, 0.5);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12 + Math.min(0.2, mass * 0.01));
    o.connect(f).connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.4);
  }
  soundBtn.addEventListener("click", () => {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    ac.resume();
    soundOn = !soundOn;
    soundBtn.classList.toggle("on", soundOn);
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    $("[data-sound-label]").textContent = soundOn ? "Mute" : "Sound";
    if (soundOn) tick(12, 6);
  });

  // ------------------------------------------------------------------ scroll: inertia on every body
  let lenis = null;
  let lastVel = 0;
  function onScroll(vel) {
    const dv = vel - lastVel; lastVel = vel;
    if (Math.abs(dv) > 2) stages.forEach((s) => s.impulse(0, -clamp(dv, -40, 40) * 0.05));
  }
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", (l) => onScroll(l.velocity));
  }
  let lastY = scrollY;
  addEventListener("scroll", () => { if (!lenis) { onScroll(scrollY - lastY); lastY = scrollY; } }, { passive: true });
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href")); if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { duration: 1.4 }); else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    })
  );

  // ------------------------------------------------------------------ project sheet
  const sheet = $("#sheet");
  let sheetIdx = -1, sheetOpen = false, titleStage = null;
  function fillSheet(i) {
    const p = D.projects[i]; sheetIdx = i;
    $("[data-sheet-idx]", sheet).textContent = `${String(i + 1).padStart(2, "0")} / ${String(D.projects.length).padStart(2, "0")}`;
    $("[data-sheet-status]", sheet).textContent = STATUS[p.status] || p.status;
    $("[data-sheet-year]", sheet).textContent = p.year || "";
    const title = $("[data-sheet-title]", sheet);
    title.textContent = p.title;
    $("[data-sheet-desc]", sheet).textContent = p.description;
    const tags = $("[data-sheet-tags]", sheet); tags.replaceChildren();
    (p.tags || []).forEach((t) => { const li = document.createElement("li"); li.textContent = t; tags.append(li); });
    const links = $("[data-sheet-links]", sheet); links.replaceChildren();
    if (p.demo) { const a = document.createElement("a"); a.href = p.demo; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Visit ↗"; links.append(a); }
    if (p.repo) { const a = document.createElement("a"); a.href = p.repo; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Source ↗"; links.append(a); }
    if (!p.demo && !p.repo) { const s = document.createElement("span"); s.textContent = "Links coming soon"; links.append(s); }
    // title letters drop in
    if (hasGsap && !reduce) {
      const chars = [...p.title].map((ch) => `<span class="ch" style="display:inline-block">${ch}</span>`).join("");
      title.innerHTML = chars;
      gsap.from($$(".ch", title), { y: -140, rotate: () => (Math.random() - 0.5) * 40, opacity: 0, duration: 0.9, ease: "bounce.out", stagger: 0.04 });
      gsap.from([".sheet-desc", ".sheet-tags", ".sheet-links"].map((s) => $(s, sheet)), { y: 24, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.08, delay: 0.25 });
    }
  }
  function openSheet(i) {
    fillSheet(i); sheet.hidden = false; sheetOpen = true;
    if (lenis) lenis.stop();
    if (hasGsap && !reduce) {
      gsap.fromTo(".sheet-scrim", { opacity: 0 }, { opacity: 1, duration: 0.5 });
      gsap.fromTo(".sheet-panel", innerWidth >= 900 ? { xPercent: 100 } : { yPercent: 100 }, { xPercent: 0, yPercent: 0, duration: 0.9, ease: "expo.out" });
    }
    $("[data-sheet-close]:not(.sheet-scrim)", sheet).focus();
  }
  function closeSheet() {
    if (!sheetOpen) return; sheetOpen = false;
    const done = () => { sheet.hidden = true; if (lenis) lenis.start(); plateEls[sheetIdx] && plateEls[sheetIdx].focus(); };
    if (hasGsap && !reduce) {
      gsap.to(".sheet-scrim", { opacity: 0, duration: 0.4 });
      gsap.to(".sheet-panel", innerWidth >= 900 ? { xPercent: 100 } : { yPercent: 100 }, { duration: 0.6, ease: "expo.in", onComplete: done });
    } else done();
  }
  plateEls.forEach((el, i) => el.addEventListener("click", () => openSheet(i)));
  $$("[data-sheet-close]", sheet).forEach((b) => b.addEventListener("click", closeSheet));
  $("[data-sheet-prev]", sheet).addEventListener("click", () => fillSheet((sheetIdx - 1 + D.projects.length) % D.projects.length));
  $("[data-sheet-next]", sheet).addEventListener("click", () => fillSheet((sheetIdx + 1) % D.projects.length));
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  fontsReady.then(buildStages);

  // ------------------------------------------------------------------ choreography
  const loader = $(".loader");
  if (!hasGsap || reduce) { loader.remove(); $$(".w").forEach((w) => (w.style.opacity = 1)); return; }
  root.classList.add("anim");
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }

  gsap.timeline()
    .to(loader, { yPercent: -100, duration: 0.9, ease: "expo.inOut", delay: 0.5 })
    .from(".hero .line > span", { yPercent: 110, duration: 1, stagger: 0.08, ease: "expo.out" }, "-=0.4")
    .from(".hud", { y: -20, opacity: 0, duration: 0.8 }, "-=0.8")
    .add(() => loader.remove());

  gsap.fromTo(".manifesto .w", { opacity: 0.15 }, { opacity: 1, stagger: 0.06, ease: "none", scrollTrigger: { trigger: ".manifesto", start: "top 80%", end: "bottom 55%", scrub: true } });
  $$(".label, .plate, .contact-row").forEach((el) => gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } }));
  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
