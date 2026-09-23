(function () {
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;
  const STATUS = { finished: "Complete", "in-progress": "In progress" };
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  // ------------------------------------------------------------------ content
  const [first, ...rest] = D.name.split(/\s+/);
  document.title = `${D.name} — ${D.role}`;
  $$("[data-bind]").forEach((el) => (el.textContent = D[el.dataset.bind] || ""));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $("[data-initials]").textContent = D.name.split(/\s+/).map((w) => w[0]).join("");
  $("[data-first]").textContent = first;
  $("[data-last]").textContent = rest.join(" ");
  $("[data-host-name]").textContent = first;
  $("[data-presence]").textContent = `${first} is here`;
  $$("[data-github]").forEach((a) => (a.href = D.links.github));
  const contact = $("[data-contact]");
  contact.href = D.links.email ? `mailto:${D.links.email}` : D.links.github;
  $("[data-contact-text]").textContent = D.links.email || D.links.github.replace(/^https?:\/\//, "");
  if (!D.links.email) contact.target = "_blank";

  const man = $("[data-manifesto]");
  D.manifesto.split(/\s+/).forEach((w) => { const s = document.createElement("span"); s.className = "w"; s.textContent = w; man.append(s, " "); });
  const caps = $("[data-caps]");
  D.capabilities.forEach((c) => { const li = document.createElement("li"); li.textContent = c; caps.append(li); });

  $("[data-count]").textContent = String(D.projects.length).padStart(2, "0");
  const plates = $(".plates");
  const plateEls = D.projects.map((p, i) => {
    const b = document.createElement("button");
    b.className = "plate"; b.type = "button";
    b.innerHTML = `<span class="plate-idx mono">${String(i + 1).padStart(2, "0")}</span>
      <h3 class="plate-title"><span></span></h3>
      <span class="plate-side mono"><span class="status ${p.status}">${STATUS[p.status] || p.status}</span><span>${p.year || ""}</span></span>
      <p class="plate-desc"></p>`;
    $(".plate-title span", b).textContent = p.title;
    $(".plate-desc", b).textContent = p.description;
    plates.append(b);
    return b;
  });

  // ------------------------------------------------------------------ sheet
  const sheet = $("#sheet");
  let sheetIdx = -1, sheetOpen = false;
  function fillSheet(i) {
    const p = D.projects[i]; sheetIdx = i;
    $("[data-sheet-idx]", sheet).textContent = `${String(i + 1).padStart(2, "0")} / ${String(D.projects.length).padStart(2, "0")}`;
    $("[data-sheet-status]", sheet).textContent = STATUS[p.status] || p.status;
    $("[data-sheet-year]", sheet).textContent = p.year || "";
    $("[data-sheet-title]", sheet).textContent = p.title;
    $("[data-sheet-note]", sheet).textContent = p.note ? `“${p.note}”` : "";
    $("[data-sheet-desc]", sheet).textContent = p.description;
    const tags = $("[data-sheet-tags]", sheet); tags.replaceChildren();
    (p.tags || []).forEach((t) => { const li = document.createElement("li"); li.textContent = t; tags.append(li); });
    const links = $("[data-sheet-links]", sheet); links.replaceChildren();
    if (p.demo) { const a = document.createElement("a"); a.href = p.demo; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Visit ↗"; links.append(a); }
    if (p.repo) { const a = document.createElement("a"); a.href = p.repo; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Source ↗"; links.append(a); }
    if (!p.demo && !p.repo) { const s = document.createElement("span"); s.textContent = "Links coming soon"; links.append(s); }
    if (hasGsap && !reduce) gsap.from([".sheet-title", ".sheet-note", ".sheet-desc", ".sheet-tags", ".sheet-links"].map((s) => $(s, sheet)), { y: 24, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.07 });
  }
  function openSheet(i) {
    fillSheet(i); sheet.hidden = false; sheetOpen = true;
    if (lenis) lenis.stop();
    if (hasGsap && !reduce) {
      gsap.fromTo(".sheet-scrim", { opacity: 0 }, { opacity: 1, duration: 0.5 });
      gsap.fromTo(".sheet-panel", innerWidth >= 900 ? { xPercent: 100 } : { yPercent: 100 }, { xPercent: 0, yPercent: 0, duration: 0.9, ease: "expo.out" });
    }
    $("button[data-sheet-close]", sheet).focus();
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

  // ------------------------------------------------------------------ scroll
  let lenis = null;
  if (!reduce && window.Lenis) lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href")); if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { duration: 1.4 }); else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    })
  );

  // ------------------------------------------------------------------ the host
  if (!hasGsap) { $("#host").remove(); return; }
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }

  const host = Host(D.host);
  let tourOn = true;
  const tourBtn = $("[data-tour]");
  const words = $$(".w", man);

  // beats: each fires once, when its section comes into view, unless the host is parked
  const done = new Set();
  function beat(key, trigger, start, fn) {
    ScrollTrigger.create({
      trigger, start,
      onEnter: () => {
        if (done.has(key) || !tourOn) return; done.add(key);
        host.run(async () => {
          const r = (typeof trigger === "string" ? $(trigger) : trigger).getBoundingClientRect();
          if (r.bottom < -innerHeight * 0.5 || r.top > innerHeight * 1.5) return; // the visitor moved on
          await fn();
        });
      },
    });
  }

  // intro: the host arrives, waves, introduces itself, underlines the tagline
  async function intro() {
    await host.wait(reduce ? 200 : 900);
    await host.moveTo(innerWidth * 0.62, scrollY + innerHeight * 0.38, 900);
    await host.wave();
    await host.speak(D.host.intro[0], 1400);
    await host.speak(D.host.intro[1], 1200);
    const tag = $(".hero-tag");
    await host.underline(tag);
    await host.wait(400);
    // point down: there's more
    const r = tag.getBoundingClientRect();
    await host.moveTo(r.left + r.width + 60, r.top + scrollY);
    host.stroke(`M${host.pos.x} ${host.pos.y + 20} q10 40 -6 80 M${host.pos.x - 6} ${host.pos.y + 100} l-10 -16 M${host.pos.x - 6} ${host.pos.y + 100} l14 -12`, { ms: 500 });
    await host.wait(500);
  }
  host.run(intro);

  // about: circle a phrase in the manifesto, then note next to the caps
  beat("about", ".manifesto", "top 70%", async () => {
    const target = words.find((w) => /workshop/i.test(w.textContent)) || words[Math.min(6, words.length - 1)];
    await host.circle(target);
    await host.wait(300);
    const capsEl = $(".caps");
    await host.writeNear(capsEl.lastElementChild, "the stuff I do", "right");
  });

  // work: walk the plates, write a margin note for each, open the first one
  D.projects.forEach((p, i) => {
    beat(`plate${i}`, plateEls[i], "top 72%", async () => {
      const title = $(".plate-title span", plateEls[i]);
      if (i === 0) { await host.underline(title); }
      if (p.note) await host.writeNear(innerWidth >= 900 ? title : $(".plate-desc", plateEls[i]), p.note, innerWidth >= 900 ? "right" : "below");
      if (i === 0) {
        await host.wait(600);
        const r = plateEls[i].getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0 && !sheetOpen) { await host.speak("here, look.", 900); await host.click(plateEls[i]); }
      }
    });
  });

  // contact: circle the email, say goodbye
  beat("contact", ".contact-title", "top 70%", async () => {
    await host.speak(D.host.contact, 1400);
    await host.circle($(".contact-link"));
    await host.wait(300);
    await host.moveTo(host.pos.x + 40, host.pos.y + 60, 400);
    await host.wave();
    await host.speak("thanks for coming by.", 2500);
  });

  // reactions: dodge the visitor, nudge them when idle, follow the scroll
  const mouse = { x: -1, y: -1 };
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY + scrollY;
    if (!fine || host.parked) return;
    if (Math.hypot(mouse.x - host.pos.x, mouse.y - host.pos.y) < 70) host.dodge(mouse.x, mouse.y);
  });
  let idleT = 0;
  function armIdle() {
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (tourOn && !host.busy && !sheetOpen) host.run(async () => { await host.wave(); host.quip(pick(D.host.idle)); }); armIdle(); }, 9000);
  }
  ["pointermove", "pointerdown", "scroll", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, armIdle, { passive: true }));
  armIdle();
  addEventListener("scroll", () => { if (!host.busy) host.keepOnScreen(); }, { passive: true });

  // tour toggle: park the host, or bring it back
  tourBtn.addEventListener("click", async () => {
    tourOn = !tourOn;
    tourBtn.setAttribute("aria-pressed", String(tourOn));
    $("[data-tour-label]").textContent = tourOn ? "Tour on" : "Tour off";
    root.classList.toggle("host-solo", !tourOn);
    if (!tourOn) { host.quip(D.host.solo); await host.park(); }
    else { host.parked = false; host.run(async () => { await host.moveTo(innerWidth * 0.5, scrollY + innerHeight * 0.5); await host.wave(); await host.speak("back.", 900); }); }
  });

  // ------------------------------------------------------------------ choreography
  gsap.from(".hero .line > span", { yPercent: 110, duration: 1.1, stagger: 0.08, ease: "expo.out", delay: 0.2 });
  gsap.from(".hud", { y: -20, opacity: 0, duration: 0.8, delay: 0.6 });
  gsap.fromTo(".manifesto .w", { opacity: 0.15 }, { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: ".manifesto", start: "top 80%", end: "bottom 55%", scrub: true } });
  $$(".label, .plate, .contact-title .line > span, .contact-line").forEach((el) => gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } }));
  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
