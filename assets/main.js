(function () {
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;
  const SNOW_AT = 0.82; // must match the shader's snow line

  // ------------------------------------------------------------------ content
  document.title = `${D.name} — ${D.role}`;
  $$("[data-bind]").forEach((el) => (el.textContent = D[el.dataset.bind] || ""));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $("[data-initials]").textContent = D.name.split(/\s+/).map((w) => w[0]).join("");
  $$("[data-github]").forEach((a) => (a.href = D.links.github));

  const contact = $("[data-contact]");
  contact.href = D.links.email ? `mailto:${D.links.email}` : D.links.github;
  if (!D.links.email) contact.target = "_blank";

  // hero name → lines of letters (layout + accessibility; the shader paints the visible glyphs)
  const nameEl = $("[data-name]");
  nameEl.setAttribute("aria-label", D.name);
  const nameLines = D.name.split(/\s+/).map((word, wi) => {
    const line = document.createElement("span");
    line.className = "name-line" + (wi % 2 ? " is-offset" : "");
    line.setAttribute("aria-hidden", "true");
    [...word].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = ch;
      line.append(s);
    });
    nameEl.append(line);
    return { el: line, word };
  });

  // manifesto → words
  const man = $("[data-manifesto]");
  D.manifesto.split(/\s+/).forEach((w) => {
    const s = document.createElement("span");
    s.className = "w";
    s.textContent = w;
    man.append(s, " ");
  });

  // projects
  const track = $(".work-track");
  const outro = $(".work-outro");
  const STATUS = { finished: "Complete", "in-progress": "In progress" };
  $("[data-count]").textContent = String(D.projects.length).padStart(2, "0");
  const cards = D.projects.map((p, i) => {
    const el = document.createElement("article");
    el.className = "proj";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Open ${p.title}`);
    el.dataset.cursor = "Open";
    el.innerHTML = `
      <div class="proj-media">
        <canvas></canvas>
        <span class="proj-idx mono">${String(i + 1).padStart(2, "0")}</span>
        <span class="proj-status mono ${p.status}">${STATUS[p.status] || p.status}</span>
      </div>
      <div class="proj-body">
        <h3 class="proj-title"></h3>
        <p class="proj-desc"></p>
        <div class="proj-meta mono"><span class="proj-tags"></span><span>${p.year || ""}</span></div>
      </div>`;
    $(".proj-title", el).textContent = p.title;
    $(".proj-desc", el).textContent = p.description;
    $(".proj-tags", el).textContent = (p.tags || []).join(" · ");
    track.insertBefore(el, outro);
    return { el, p, i };
  });

  // capabilities marquee (duplicated for seamless loop)
  const mq = $("[data-marquee]");
  const chunk = D.capabilities.map((c) => `<span>${c}</span><i>✦</i>`).join("");
  mq.innerHTML = chunk.repeat(4);

  // ------------------------------------------------------------------ terrain
  const field = { mouse: [innerWidth / 2, innerHeight / 2], scroll: 0, vel: 0, reveal: reduce ? 1 : 0, frozen: reduce, textY: 0 };
  const glOk = window.Terrain && Terrain.startField($("#terrain"), field);
  root.classList.add(glOk ? "gl" : "no-gl");

  // the hero name as a texture: drawn exactly where the DOM lines sit, so layout stays in sync
  const textCanvas = document.createElement("canvas");
  function paintName() {
    if (!glOk) return;
    const k = Math.min(window.devicePixelRatio || 1, 2);
    textCanvas.width = Math.floor(innerWidth * k);
    textCanvas.height = Math.floor(innerHeight * k);
    const ctx = textCanvas.getContext("2d");
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    const cs = getComputedStyle(nameEl);
    ctx.font = `300 condensed ${cs.fontSize} "Bricolage Grotesque", system-ui, sans-serif`;
    ctx.letterSpacing = cs.letterSpacing;
    const y0 = scrollY;
    nameLines.forEach(({ el, word }) => {
      const first = el.firstElementChild.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      // baseline ≈ line box bottom minus descent; the font's descender is ~0.2em
      const size = parseFloat(cs.fontSize);
      const baseline = r.top + y0 + (r.height + size * 0.72) / 2 - size * 0.02;
      ctx.fillText(word.toUpperCase(), first.left, baseline);
    });
    field.textCanvas = textCanvas;
    field.textDirty = true;
  }
  const fontsReady = document.fonts ? document.fonts.load('300 100px "Bricolage Grotesque"').then(() => document.fonts.ready) : Promise.resolve();
  fontsReady.then(paintName);
  addEventListener("resize", paintName);

  cards.forEach(({ el, p }) => {
    const art = Terrain.ridges($("canvas", el), p.seed || 1, { frozen: reduce });
    el.addEventListener("pointerenter", () => art.hover(true));
    el.addEventListener("pointerleave", () => { art.hover(false); art.reset(); });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      art.point((e.clientX - r.left) / r.width);
    });
  });

  // ------------------------------------------------------------------ pointer + HUD
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const hx = $("[data-x]"), hy = $("[data-y]"), he = $("[data-elev]");
  function setPointer(x, y) {
    mouse.x = x; mouse.y = y;
    field.mouse[0] = x; field.mouse[1] = y;
    hx.textContent = (x / innerWidth).toFixed(3);
    hy.textContent = (1 - y / innerHeight).toFixed(3);
    if (reduce && field.redraw) field.redraw();
  }
  addEventListener("pointermove", (e) => setPointer(e.clientX, e.clientY));

  // touch: a finger moves the peak + readouts; gyroscope tilt can drive it too
  if (!fine) {
    $("[data-hint]").textContent = "Swipe";
    addEventListener("touchmove", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    const tiltBtn = $("[data-tilt]");
    const onTilt = (e) => {
      if (e.gamma == null) return;
      setPointer(clamp(0.5 + e.gamma / 60, 0, 1) * innerWidth, clamp(0.5 + (e.beta - 45) / 90, 0, 1) * innerHeight);
    };
    if (typeof DeviceOrientationEvent !== "undefined") {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        tiltBtn.hidden = false;
        tiltBtn.addEventListener("click", async () => {
          try {
            if ((await DeviceOrientationEvent.requestPermission()) === "granted") addEventListener("deviceorientation", onTilt);
          } catch (_) {}
          tiltBtn.hidden = true;
        });
      } else {
        addEventListener("deviceorientation", onTilt);
      }
    }
  }

  // tap anywhere: survey ripple through the terrain + a persistent survey point pinned to the page
  const pinsLayer = $("#pins");
  field.pins = [];
  let pinCount = 0;
  addEventListener("pointerdown", (e) => {
    field.click = [e.clientX, e.clientY, performance.now()];
    if (field.redraw) field.redraw();
    if (e.target.closest("a, button, [role=button], .exp, .hud")) return;
    const docY = e.clientY + scrollY;
    field.pins.push({ x: e.clientX, docY, t: performance.now() });
    const pin = document.createElement("div");
    pin.className = "pin";
    pin.style.left = `${e.clientX}px`; pin.style.top = `${docY}px`;
    pin.innerHTML = `<span>SP-${String(++pinCount).padStart(2, "0")} · ${(e.clientX / innerWidth).toFixed(3)}, ${(1 - e.clientY / innerHeight).toFixed(3)}</span>`;
    pinsLayer.append(pin);
    if (pinsLayer.childElementCount > 12) pinsLayer.firstElementChild.remove();
    log(`Survey point ${String(pinCount).padStart(2, "0")} placed`, true);
  });

  // instruments: local clock, night palette, idle expedition log
  const clockEl = $("[data-clock]"), tzEl = $("[data-tz]"), logEl = $("[data-log]");
  try { tzEl.textContent = new Intl.DateTimeFormat("en", { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName").value; } catch (_) {}
  function tickClock() {
    const d = new Date();
    clockEl.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
    const h = d.getHours() + d.getMinutes() / 60;
    field.night = h < 6 || h > 19.5 ? 1 : h < 7.5 ? (7.5 - h) / 1.5 : h > 18 ? (h - 18) / 1.5 : 0;
  }
  tickClock(); setInterval(tickClock, 1000);

  let logTimer = 0, logIdx = 0, logHide = 0;
  const LOG = ["Weather clear · awaiting input", "Tap anywhere to place a survey point", "The cursor raises the terrain", "Scroll to gain elevation", "Sound on for the wind"];
  function log(msg, brief) {
    logEl.textContent = msg; logEl.classList.add("on");
    clearTimeout(logHide);
    logHide = setTimeout(() => logEl.classList.remove("on"), brief ? 2200 : 5000);
  }
  function idle() { log(LOG[logIdx++ % LOG.length]); logTimer = setTimeout(idle, 6500); }
  function armIdle() { clearTimeout(logTimer); logTimer = setTimeout(idle, 7000); }
  ["pointermove", "pointerdown", "scroll", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, armIdle, { passive: true }));
  armIdle();

  // decoding text: letters scramble and resolve left to right
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&";
  $$("[data-scramble]").forEach((el) => {
    const final = el.textContent;
    let raf = 0;
    el.addEventListener("pointerenter", () => {
      const t0 = performance.now(); cancelAnimationFrame(raf);
      (function step(now) {
        const k = Math.min(1, (now - t0) / 550);
        el.textContent = [...final].map((ch, i) => (ch === " " ? " " : i / final.length < k ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
        if (k < 1) raf = requestAnimationFrame(step); else el.textContent = final;
      })(t0);
    });
  });

  // 3D card tilt follows the pointer
  if (fine && !reduce) {
    cards.forEach(({ el }) => {
      const media = $(".proj-media", el);
      el.addEventListener("pointermove", (e) => {
        const r = media.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -8, ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
        media.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(.985)`;
      });
      el.addEventListener("pointerleave", () => (media.style.transform = ""));
    });
  }

  // elevation profile rail: a seeded mountain profile, marker climbs with scroll
  const rail = $(".rail");
  const CAMPS = [[0, "Base camp"], [0.22, "Survey"], [0.42, "Ridge"], [0.66, "Traverse"], [0.9, "Summit"]];
  (function buildRail() {
    const pts = []; let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      const x = 60 - (8 + p * 40 + Math.sin(p * 9) * 6 + rnd() * 5); // higher = further left
      pts.push([x, 400 - p * 400]);
    }
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    $(".rail-line").setAttribute("d", d);
    $(".rail-fill").setAttribute("d", `${d} L60 0 L60 400 Z`);
    const ul = $(".rail-camps");
    CAMPS.forEach(([p, name]) => { const li = document.createElement("li"); li.textContent = name; li.style.top = `${(1 - p) * 100}%`; ul.append(li); });
  })();
  const railMarker = $(".rail-marker"), railLabel = $("[data-rail-label]");
  function updateRail(p) {
    railMarker.style.top = `${(1 - p) * 100}%`;
    const camp = [...CAMPS].reverse().find(([at]) => p >= at - 0.02);
    if (camp && railLabel.textContent !== camp[1]) railLabel.textContent = camp[1];
  }
  updateRail(0);

  // ambient sound: synthesized in Web Audio, no files. Drone pitch follows elevation, wind follows velocity.
  const soundBtn = $("[data-sound]");
  let audio = null;
  soundBtn.addEventListener("click", () => {
    if (!audio) {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      const base = [55, 82.4, 110];
      const drone = base.map((f, i) => {
        const o = ac.createOscillator(); o.type = i ? "triangle" : "sine"; o.frequency.value = f;
        const g = ac.createGain(); g.gain.value = 0.12 / (i + 1);
        o.connect(g).connect(master); o.start(); return o;
      });
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const wind = ac.createBufferSource(); wind.buffer = buf; wind.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300;
      const wg = ac.createGain(); wg.gain.value = 0.015;
      wind.connect(lp).connect(wg).connect(master); wind.start();
      audio = { ac, master, on: false };
      setInterval(() => {
        if (!audio.on) return;
        const p = field.scroll, v = Math.abs(field.vel);
        drone.forEach((o, i) => o.frequency.setTargetAtTime(base[i] * (1 + p * 0.5), ac.currentTime, 0.4));
        lp.frequency.setTargetAtTime(300 + v * 60, ac.currentTime, 0.2);
        wg.gain.setTargetAtTime(0.015 + v * 0.002, ac.currentTime, 0.2);
      }, 120);
    }
    audio.on = !audio.on;
    audio.ac.resume();
    audio.master.gain.setTargetAtTime(audio.on ? 0.6 : 0, audio.ac.currentTime, 0.5);
    soundBtn.classList.toggle("on", audio.on);
    soundBtn.setAttribute("aria-pressed", String(audio.on));
    $("[data-sound-label]").textContent = audio.on ? "Mute" : "Sound";
  });

  // custom cursor: the dot is the real click point; the ring is decoration and stays tight
  if (fine && !reduce) {
    root.classList.add("has-cursor");
    const ring = $(".cursor-ring"), dot = $(".cursor-dot"), label = $(".cursor-label");
    const c = { x: mouse.x, y: mouse.y };
    (function loop() {
      c.x += (mouse.x - c.x) * 0.35;
      c.y += (mouse.y - c.y) * 0.35;
      ring.style.transform = `translate3d(${c.x}px,${c.y}px,0)`;
      dot.style.transform = `translate3d(${mouse.x}px,${mouse.y}px,0)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor]");
      const link = e.target.closest("a, button, [role=button]");
      ring.classList.toggle("is-label", !!t);
      ring.classList.toggle("is-link", !t && !!link);
      dot.classList.toggle("is-link", !!link);
      label.textContent = t ? t.dataset.cursor : "";
    });
    document.addEventListener("pointerdown", () => ring.classList.add("is-down"));
    document.addEventListener("pointerup", () => ring.classList.remove("is-down"));
    document.addEventListener("pointerleave", () => root.classList.add("cursor-out"));
    document.addEventListener("pointerenter", () => root.classList.remove("cursor-out"));
  }

  // magnetic elements
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach((el) => {
      const strength = el.classList.contains("blob") ? 0.35 : 0.2;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  // ------------------------------------------------------------------ scroll + motion
  let lenis = null;
  const scrollState = { vel: 0 };
  function onScroll(y, vel) {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = clamp(y / max, 0, 1);
    field.scroll = p;
    field.textY = y / innerHeight;
    field.vel += (clamp(vel, -60, 60) - field.vel) * 0.2;
    scrollState.vel = vel;
    he.textContent = String(Math.round(p * 8848)).padStart(4, "0");
    root.classList.toggle("snow", p > SNOW_AT);
    // the plane tips into perspective between the survey and the traverse
    const s1 = clamp((p - 0.06) / 0.16, 0, 1), s2 = 1 - clamp((p - 0.62) / 0.16, 0, 1);
    field.tilt = s1 * s1 * (3 - 2 * s1) * s2;
    updateRail(p);
    if (reduce && field.redraw) field.redraw();
  }

  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", (l) => onScroll(l.scroll, l.velocity));
  }
  let lastY = scrollY;
  addEventListener("scroll", () => {
    if (!lenis) { onScroll(scrollY, scrollY - lastY); lastY = scrollY; }
  }, { passive: true });

  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const target = $(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    })
  );

  // marquee: drifts on its own, speeds up and skews with scroll velocity
  let mqX = 0, mqSkew = 0, mqDir = -1;
  (function marquee() {
    const v = scrollState.vel || 0;
    if (Math.abs(v) > 0.5) mqDir = v > 0 ? -1 : 1;
    if (!reduce) mqX += mqDir * (0.6 + Math.min(Math.abs(v), 40) * 0.35);
    const half = mq.scrollWidth / 2;
    if (half) { if (mqX <= -half) mqX += half; if (mqX > 0) mqX -= half; }
    mqSkew += (clamp(-v * 0.4, -12, 12) - mqSkew) * 0.1;
    mq.style.transform = `translate3d(${mqX}px,0,0) skewX(${mqSkew}deg)`;
    if (!lenis) scrollState.vel *= 0.9;
    requestAnimationFrame(marquee);
  })();

  // ------------------------------------------------------------------ expedition (project takeover)
  const exp = $("#expedition");
  let expArt = null, expIndex = -1, expOpen = false;
  function fillExpedition(i) {
    const p = D.projects[i];
    expIndex = i;
    $("[data-exp-idx]", exp).textContent = `${String(i + 1).padStart(2, "0")} / ${String(D.projects.length).padStart(2, "0")}`;
    $("[data-exp-status]", exp).textContent = STATUS[p.status] || p.status;
    $("[data-exp-year]", exp).textContent = p.year || "";
    $("[data-exp-title]", exp).textContent = p.title;
    $("[data-exp-desc]", exp).textContent = p.description;
    const tags = $("[data-exp-tags]", exp); tags.replaceChildren();
    (p.tags || []).forEach((t) => { const li = document.createElement("li"); li.textContent = t; tags.append(li); });
    const links = $("[data-exp-links]", exp); links.replaceChildren();
    if (p.demo) { const a = document.createElement("a"); a.href = p.demo; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Visit site ↗"; links.append(a); }
    if (p.repo) { const a = document.createElement("a"); a.href = p.repo; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Source ↗"; links.append(a); }
    if (!p.demo && !p.repo) { const s = document.createElement("span"); s.textContent = "Links coming soon"; links.append(s); }
    // fresh ridgeline art for this project
    if (expArt) expArt.destroy();
    const old = $("canvas", exp); const cv = document.createElement("canvas"); old.replaceWith(cv);
    expArt = Terrain.ridges(cv, (p.seed || 1) + 0.5, { frozen: reduce, lines: 48 });
    expArt.hover(true);
    cv.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); expArt.point((e.clientX - r.left) / r.width); });
  }
  function openExpedition(i, x, y) {
    fillExpedition(i);
    exp.hidden = false;
    exp.style.setProperty("--cx", `${x}px`); exp.style.setProperty("--cy", `${y}px`);
    expOpen = true;
    if (lenis) lenis.stop();
    root.classList.add("exp-open");
    const items = [".exp-meta", ".exp-title", ".exp-desc", ".exp-tags", ".exp-links"].map((s) => $(s, exp));
    if (hasGsap && !reduce) {
      gsap.killTweensOf([exp, ...items]);
      gsap.to(exp, { clipPath: `circle(150% at ${x}px ${y}px)`, duration: 1.1, ease: "expo.inOut" });
      gsap.fromTo(items, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.07, ease: "expo.out", delay: 0.45 });
    } else {
      exp.style.clipPath = "none";
    }
    $("[data-exp-close]", exp).focus();
    requestAnimationFrame(() => expArt && expArt.resize());
  }
  function closeExpedition() {
    if (!expOpen) return;
    expOpen = false;
    root.classList.remove("exp-open");
    const done = () => { exp.hidden = true; if (expArt) { expArt.destroy(); expArt = null; } if (lenis) lenis.start(); cards[expIndex] && cards[expIndex].el.focus(); };
    if (hasGsap && !reduce) {
      gsap.to(exp, { clipPath: `circle(0 at ${exp.style.getPropertyValue("--cx")} ${exp.style.getPropertyValue("--cy")})`, duration: 0.8, ease: "expo.inOut", onComplete: done });
    } else done();
  }
  cards.forEach(({ el, i }) => {
    el.addEventListener("click", (e) => openExpedition(i, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const r = el.getBoundingClientRect(); openExpedition(i, r.left + r.width / 2, r.top + r.height / 2); } });
  });
  $("[data-exp-close]", exp).addEventListener("click", closeExpedition);
  $("[data-exp-prev]", exp).addEventListener("click", () => fillExpedition((expIndex - 1 + D.projects.length) % D.projects.length));
  $("[data-exp-next]", exp).addEventListener("click", () => fillExpedition((expIndex + 1) % D.projects.length));
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeExpedition(); });

  // ------------------------------------------------------------------ GSAP choreography
  const loader = $(".loader");
  if (!hasGsap || reduce) {
    loader.remove();
    field.reveal = 1;
    if (field.redraw) field.redraw();
    $$(".w").forEach((w) => (w.style.opacity = 1));
    return;
  }

  root.classList.add("anim");
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // preloader
  const count = { v: 0 };
  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  intro
    .to(count, {
      v: 100, duration: 1.6, ease: "power2.inOut",
      onUpdate: () => {
        $(".loader-count").textContent = String(Math.round(count.v)).padStart(3, "0");
        $(".loader-bar span").style.transform = `scaleX(${count.v / 100})`;
      },
    })
    .to(".loader-inner", { yPercent: -120, opacity: 0, duration: 0.6, ease: "power3.in" })
    .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "-=0.2")
    .to(field, { reveal: 1, duration: 2.6, ease: "power2.out" }, "-=0.9")
    .from(".hero .line > span", { yPercent: 110, duration: 1.1, stagger: 0.08 }, "-=1.6")
    .from(".hud", { opacity: 0, duration: 1 }, "-=1")
    .add(() => { loader.remove(); lenis && lenis.start(); });

  gsap.to(".hero-foot", {
    opacity: 0, y: -60, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "20% top", end: "70% top", scrub: true },
  });

  // manifesto: words light up as you read
  gsap.fromTo(".manifesto .w", { opacity: 0.12 }, {
    opacity: 1, stagger: 0.08, ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top 75%", end: "bottom 60%", scrub: true },
  });

  // generic reveals
  $$(".label, .contact-title .line > span, .contact-row").forEach((el) =>
    gsap.from(el, {
      yPercent: el.matches(".line > span") ? 110 : 0, y: el.matches(".line > span") ? 0 : 40, opacity: el.matches(".line > span") ? 1 : 0,
      duration: 1.2, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    })
  );

  // work: pinned horizontal expedition on wide screens
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: ".work", start: "top top", end: () => "+=" + dist(),
        pin: ".work-pin", scrub: 1, invalidateOnRefresh: true,
        onUpdate: (s) => ($(".work-progress span").style.transform = `scaleX(${s.progress})`),
      },
    });
    cards.forEach(({ el }) =>
      gsap.from(el, {
        rotate: 4, yPercent: 12, opacity: 0.2, ease: "none",
        scrollTrigger: { trigger: el, containerAnimation: tween, start: "left 100%", end: "left 55%", scrub: true },
      })
    );
    return () => {};
  });
  mm.add("(max-width: 899px)", () => {
    cards.forEach(({ el }) =>
      gsap.from(el, { y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } })
    );
  });

  addEventListener("load", () => { ScrollTrigger.refresh(); paintName(); });
  fontsReady.then(() => ScrollTrigger.refresh());
})();
