(function () {
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;

  // ------------------------------------------------------------------ content
  document.title = `${D.name} — ${D.role}`;
  $$("[data-bind]").forEach((el) => (el.textContent = D[el.dataset.bind] || ""));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $("[data-initials]").textContent = D.name.split(/\s+/).map((w) => w[0]).join("");
  $$("[data-github]").forEach((a) => (a.href = D.links.github));

  const contact = $("[data-contact]");
  contact.href = D.links.email ? `mailto:${D.links.email}` : D.links.github;
  if (!D.links.email) contact.target = "_blank";

  // hero name → lines of letters
  const nameEl = $("[data-name]");
  nameEl.setAttribute("aria-label", D.name);
  D.name.split(/\s+/).forEach((word, wi) => {
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
  });

  // manifesto → words
  const man = $("[data-manifesto]");
  D.manifesto.split(/\s+/).forEach((w, i) => {
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
    const href = p.demo || p.repo;
    const el = document.createElement(href ? "a" : "article");
    el.className = "proj";
    if (href) { el.href = href; el.target = "_blank"; el.rel = "noopener"; }
    el.dataset.cursor = href ? "Explore" : "Soon";
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
    return { el, p };
  });

  // capabilities marquee (duplicated for seamless loop)
  const mq = $("[data-marquee]");
  const chunk = D.capabilities.map((c) => `<span>${c}</span><i>✦</i>`).join("");
  mq.innerHTML = chunk.repeat(4);

  // ------------------------------------------------------------------ terrain
  const field = { mouse: [innerWidth / 2, innerHeight / 2], scroll: 0, vel: 0, reveal: reduce ? 1 : 0, frozen: reduce };
  const glOk = window.Terrain && Terrain.startField($("#terrain"), field);
  if (!glOk) root.classList.add("no-gl");

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
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    field.mouse[0] = e.clientX; field.mouse[1] = e.clientY;
    hx.textContent = (e.clientX / innerWidth).toFixed(3);
    hy.textContent = (1 - e.clientY / innerHeight).toFixed(3);
    if (reduce && field.redraw) field.redraw();
  });

  // touch: a finger on the page moves the peak + readouts, cards react to a finger like a hover
  if (!fine) {
    $("[data-hint]").textContent = "Swipe";
    addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      field.mouse[0] = t.clientX; field.mouse[1] = t.clientY;
      hx.textContent = (t.clientX / innerWidth).toFixed(3);
      hy.textContent = (1 - t.clientY / innerHeight).toFixed(3);
    }, { passive: true });

    // gyroscope tilt drives the peak (iOS needs a tap to grant permission)
    const tiltBtn = $("[data-tilt]");
    const onTilt = (e) => {
      if (e.gamma == null) return;
      const x = clamp(0.5 + e.gamma / 60, 0, 1);
      const y = clamp(0.5 + (e.beta - 45) / 90, 0, 1);
      field.mouse[0] = x * innerWidth; field.mouse[1] = y * innerHeight;
      hx.textContent = x.toFixed(3); hy.textContent = (1 - y).toFixed(3);
    };
    if (typeof DeviceOrientationEvent !== "undefined") {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        tiltBtn.hidden = false;
        tiltBtn.addEventListener("click", async () => {
          try {
            if ((await DeviceOrientationEvent.requestPermission()) === "granted") {
              addEventListener("deviceorientation", onTilt);
              tiltBtn.hidden = true;
            }
          } catch (_) { tiltBtn.hidden = true; }
        });
      } else {
        addEventListener("deviceorientation", onTilt);
      }
    }
  }

  // ambient sound: synthesized in Web Audio, no files. Drone pitch follows elevation, wind follows velocity.
  const soundBtn = $("[data-sound]");
  let audio = null;
  soundBtn.addEventListener("click", () => {
    if (!audio) {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      const drone = [55, 82.4, 110].map((f, i) => {
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
      audio = { ac, master, drone, lp, wg, on: false };
      (function tick() {
        if (audio.on) {
          const p = field.scroll, v = Math.abs(field.vel);
          drone.forEach((o, i) => o.frequency.setTargetAtTime([55, 82.4, 110][i] * (1 + p * 0.5), ac.currentTime, 0.4));
          lp.frequency.setTargetAtTime(300 + v * 60, ac.currentTime, 0.2);
          wg.gain.setTargetAtTime(0.015 + v * 0.002, ac.currentTime, 0.2);
        }
        requestAnimationFrame(tick);
      })();
    }
    audio.on = !audio.on;
    audio.ac.resume();
    audio.master.gain.setTargetAtTime(audio.on ? 0.6 : 0, audio.ac.currentTime, 0.5);
    soundBtn.classList.toggle("on", audio.on);
    soundBtn.setAttribute("aria-pressed", String(audio.on));
    $("[data-sound-label]").textContent = audio.on ? "Mute" : "Sound";
  });

  // tap anywhere: survey ripple through the terrain; the page text goes pale at the snow line
  addEventListener("pointerdown", (e) => {
    field.click = [e.clientX, e.clientY, performance.now()];
    if (field.redraw) field.redraw();
  });

  // custom cursor
  if (fine && !reduce) {
    root.classList.add("has-cursor");
    const ring = $(".cursor-ring"), dot = $(".cursor-dot"), label = $(".cursor-label");
    const c = { x: mouse.x, y: mouse.y };
    (function loop() {
      c.x += (mouse.x - c.x) * 0.16;
      c.y += (mouse.y - c.y) * 0.16;
      ring.style.transform = `translate3d(${c.x}px,${c.y}px,0)`;
      dot.style.transform = `translate3d(${mouse.x}px,${mouse.y}px,0)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor]");
      const link = e.target.closest("a, button");
      ring.classList.toggle("is-label", !!t);
      ring.classList.toggle("is-link", !t && !!link);
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
      const strength = el.classList.contains("blob") ? 0.35 : 0.25;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  // hero letters swell toward the cursor (variable font: wght + wdth)
  const chars = $$(".hero .ch");
  let heroVisible = true;
  new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe($(".hero"));
  if (fine && !reduce) {
    const cur = chars.map(() => 0);
    (function swell() {
      if (heroVisible) {
        chars.forEach((c, i) => {
          const r = c.getBoundingClientRect();
          const d = Math.hypot(mouse.x - (r.left + r.width / 2), mouse.y - (r.top + r.height / 2));
          const k = clamp(1 - d / 420, 0, 1);
          cur[i] += (k * k - cur[i]) * 0.12;
          c.style.fontVariationSettings = `"wght" ${Math.round(250 + 550 * cur[i])}, "wdth" ${Math.round(75 + 25 * cur[i])}, "opsz" 96`;
        });
      }
      requestAnimationFrame(swell);
    })();
  }

  // ------------------------------------------------------------------ scroll + motion
  let lenis = null;
  const scrollState = { y: 0, vel: 0 };
  function onScroll(y, vel) {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = clamp(y / max, 0, 1);
    field.scroll = p;
    field.vel += (clamp(vel, -60, 60) - field.vel) * 0.2;
    scrollState.vel = vel;
    he.textContent = String(Math.round(p * 8848)).padStart(4, "0");
    root.classList.toggle("snow", p > 0.8);
    if (reduce && field.redraw) field.redraw();
  }

  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on("scroll", (l) => onScroll(l.scroll, l.velocity));
  }
  let lastY = scrollY;
  addEventListener("scroll", () => {
    if (!lenis) { onScroll(scrollY, scrollY - lastY); lastY = scrollY; }
  }, { passive: true });

  // anchor links go through the smooth scroller
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
  const mqInner = mq;
  let mqX = 0, mqSkew = 0, mqDir = -1;
  (function marquee() {
    const v = scrollState.vel || 0;
    if (Math.abs(v) > 0.5) mqDir = v > 0 ? -1 : 1;
    if (!reduce) mqX += mqDir * (0.6 + Math.min(Math.abs(v), 40) * 0.35);
    const half = mqInner.scrollWidth / 2;
    if (half) { if (mqX <= -half) mqX += half; if (mqX > 0) mqX -= half; }
    mqSkew += (clamp(-v * 0.4, -12, 12) - mqSkew) * 0.1;
    mqInner.style.transform = `translate3d(${mqX}px,0,0) skewX(${mqSkew}deg)`;
    if (!lenis) scrollState.vel *= 0.9;
    requestAnimationFrame(marquee);
  })();

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
      v: 100, duration: 1.8, ease: "power2.inOut",
      onUpdate: () => {
        $(".loader-count").textContent = String(Math.round(count.v)).padStart(3, "0");
        $(".loader-bar span").style.transform = `scaleX(${count.v / 100})`;
      },
    })
    .to(".loader-inner", { yPercent: -120, opacity: 0, duration: 0.6, ease: "power3.in" })
    .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "-=0.2")
    .to(field, { reveal: 1, duration: 2.4, ease: "power2.out" }, "-=0.9")
    .from(".hero .ch", { yPercent: 115, rotate: 8, duration: 1.4, stagger: 0.045 }, "-=2.0")
    .from(".hero .line > span", { yPercent: 110, duration: 1.1, stagger: 0.08 }, "-=1.2")
    .from(".hud", { opacity: 0, duration: 1 }, "-=1")
    .add(() => { loader.remove(); lenis && lenis.start(); });

  // hero drifts apart as you leave it
  gsap.to(".name-line", {
    xPercent: (i) => (i % 2 ? 18 : -18), ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
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
    // cards tilt in as they enter the viewport
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

  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
