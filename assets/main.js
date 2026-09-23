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
  const STORE = "host.v1";
  let memory = {}; try { memory = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (_) {}
  const remember = (patch) => { Object.assign(memory, patch); try { localStorage.setItem(STORE, JSON.stringify(memory)); } catch (_) {} };

  // ------------------------------------------------------------------ content
  const [first, ...rest] = D.name.split(/\s+/);
  document.title = `${D.name} — ${D.role}`;
  $$("[data-bind]").forEach((el) => (el.textContent = D[el.dataset.bind] || ""));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $("[data-initials]").textContent = D.name.split(/\s+/).map((w) => w[0]).join("");
  $("[data-first]").textContent = first;
  $("[data-last]").textContent = rest.join(" ");
  $("[data-host-name]").textContent = first;
  $("[data-host-first]").textContent = first;
  $("[data-presence]").textContent = `${first} is here`;
  $$("[data-github]").forEach((a) => (a.href = D.links.github));
  const contact = $("[data-contact]");
  contact.href = D.links.email ? `mailto:${D.links.email}` : D.links.github;
  $("[data-contact-text]").textContent = D.links.email || D.links.github.replace(/^https?:\/\//, "");
  if (!D.links.email) contact.target = "_blank";

  const man = $("[data-manifesto]");
  D.manifesto.split(/\s+/).forEach((w) => { const s = document.createElement("span"); s.className = "w"; s.textContent = w; man.append(s, " "); });
  const capsEl = $("[data-caps]");
  const capEls = D.capabilities.map((c) => { const li = document.createElement("li"); li.textContent = typeof c === "string" ? c : c.name; capsEl.append(li); return li; });

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
    const note = (p.notes && p.notes[0]) || p.note;
    $("[data-sheet-note]", sheet).textContent = note ? `“${note}”` : "";
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
    remember({ opened: [...new Set([...(memory.opened || []), i])] });
  }
  let userClosedSheet = false;
  function closeSheet() {
    if (!sheetOpen) return; sheetOpen = false; userClosedSheet = true;
    const done = () => { sheet.hidden = true; if (lenis) lenis.start(); plateEls[sheetIdx] && plateEls[sheetIdx].focus(); };
    if (hasGsap && !reduce) {
      gsap.to(".sheet-scrim", { opacity: 0, duration: 0.4 });
      gsap.to(".sheet-panel", { ...(innerWidth >= 900 ? { xPercent: 100 } : { yPercent: 100 }), duration: 0.6, ease: "expo.in", onComplete: done });
    } else done();
  }
  plateEls.forEach((el, i) => el.addEventListener("click", () => openSheet(i)));
  $$("[data-sheet-close]", sheet).forEach((b) => b.addEventListener("click", closeSheet));
  $("[data-sheet-prev]", sheet).addEventListener("click", () => fillSheet((sheetIdx - 1 + D.projects.length) % D.projects.length));
  $("[data-sheet-next]", sheet).addEventListener("click", () => fillSheet((sheetIdx + 1) % D.projects.length));
  addEventListener("keydown", (e) => { if (e.key === "Escape") { closeSheet(); closeAsk(); } });

  // ------------------------------------------------------------------ scroll
  let lenis = null;
  if (!reduce && window.Lenis) lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  const scrollPage = (y) => { if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" }); };
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href")); if (!t) return;
      e.preventDefault();
      scrollPage(t.getBoundingClientRect().top + scrollY - 80);
    })
  );

  // ------------------------------------------------------------------ the host
  const askEl = $("#ask");
  function closeAsk() { askEl.hidden = true; }
  if (!hasGsap) { $("#host").remove(); askEl.remove(); return; }
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }

  const host = Host({ ...D.host, scroller: scrollPage, onStatus: (st) => { $("[data-presence]").textContent = `${first} is here${st ? " · " + st : ""}`; } });
  const toasts = $("#toasts");
  function toast(who, text, cls) {
    const t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `<span class="avatar ${cls || ""}">${who[0]}</span><span>${who} ${text}</span>`;
    toasts.append(t); setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 450); }, 2600);
  }
  setTimeout(() => toast("you", D.host.joined, "you"), 300);
  setTimeout(() => toast(first, D.host.joined), 1100);
  try { console.log(`%c${D.host.console}`, "font: 600 16px 'Caveat', cursive; color: #1d4ed8"); } catch (_) {}
  let tourOn = true;
  const tourBtn = $("[data-tour]");
  const words = $$(".w", man);
  const visits = (memory.visits || 0) + 1;
  const returning = visits > 1 && memory.reached;
  remember({ visits, lastAt: Date.now() });

  const hour = new Date().getHours();
  const greeting = hour < 5 || hour >= 22 ? D.host.greetings.night : hour < 12 ? D.host.greetings.morning : hour < 18 ? D.host.greetings.afternoon : D.host.greetings.evening;
  // where the host actually is
  let hereLine = "";
  if (D.host.timezone) {
    try {
      const t = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: D.host.timezone }).format(new Date());
      const h = +new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: D.host.timezone }).format(new Date());
      hereLine = (h >= 23 || h < 6 ? D.host.lateHere : D.host.timeHere).replace("{time}", t.toLowerCase());
    } catch (_) {}
  }

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

  // intro
  async function intro() {
    await host.wait(reduce ? 200 : 900);
    await host.moveTo(innerWidth * 0.62, scrollY + innerHeight * 0.38, 900);
    await host.wave();
    if (returning) {
      await host.speak(D.host.returning[0], 1200);
      const reached = D.projects[memory.reached - 1];
      if (reached) await host.speak(`you got as far as ${reached.title} last time.`, 1800);
      await host.speak(D.host.returning[1], 1600);
    } else {
      await host.speak(D.host.intro[0], 1100);
      if (greeting) await host.speak(greeting, 900);
      if (hereLine) await host.speak(hereLine, 1300);
      await host.speak(D.host.intro[1], 1000);
      const tag = $(".hero-tag");
      await host.underline(tag);
      await host.wait(300);
      const r = tag.getBoundingClientRect();
      await host.moveTo(r.left + r.width + 60, r.top + scrollY);
      host.stroke(`M${host.pos.x} ${host.pos.y + 20} q10 40 -6 80 M${host.pos.x - 6} ${host.pos.y + 100} l-10 -16 M${host.pos.x - 6} ${host.pos.y + 100} l14 -12`, { ms: 500 });
      await host.wait(400);
    }
  }
  host.run(intro);

  // about: circle a phrase, note next to the caps
  beat("about", ".manifesto", "top 70%", async () => {
    const target = words.find((w) => /workshop/i.test(w.textContent)) || words[Math.min(6, words.length - 1)];
    await host.circle(target);
    await host.wait(300);
    await host.writeNear(capEls[capEls.length - 1], "the stuff I do", innerWidth >= 900 ? "right" : "below");
  });

  // the typo: the host notices its own mistake and fixes it in front of you
  if (D.typo) {
    const wrong = words.find((w) => w.textContent.replace(/[^\w]/g, "") === D.typo.wrong);
    if (wrong) beat("typo", wrong, "top 88%", async () => {
      await host.moveTo(wrong.getBoundingClientRect().right + 30, wrong.getBoundingClientRect().top + scrollY - 10, 500);
      await host.wait(400);
      await host.speak(D.host.typoLines[0], 700);
      await host.strike(wrong);
      const r = wrong.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(wrong).fontSize);
      await host.note(D.typo.right, r.left + 4, r.top + scrollY - fs * 0.62, { rotate: -3, size: fs * 0.55 + "px" });
      wrong.setAttribute("aria-label", D.typo.right); wrong.classList.add("fixed");
      await host.speak(D.host.typoLines[1], 900);
      if (D.host.status) { await host.wait(200); await host.speak(D.host.status, 1800); }
    });
  }

  // work: walk the plates, a margin note + doodle each, open the first one
  D.projects.forEach((p, i) => {
    beat(`plate${i}`, plateEls[i], "top 72%", async () => {
      remember({ reached: Math.max(memory.reached || 0, i + 1) });
      const title = $(".plate-title span", plateEls[i]);
      if (i === 0) await host.underline(title);
      const note0 = (p.notes && p.notes[0]) || p.note;
      if (note0) await host.writeNear(innerWidth >= 900 ? title : $(".plate-desc", plateEls[i]), note0, innerWidth >= 900 ? "right" : "below");
      if (p.doodle) { const r = title.getBoundingClientRect(); await host.doodle(p.doodle, r.left - 40, r.top + scrollY + r.height / 2 - 6); }
      if (i === 0 && !returning) {
        await host.wait(600);
        const r = plateEls[i].getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0 && !sheetOpen && !userClosedSheet) { await host.speak("here, look.", 900); await host.click(plateEls[i]); }
      }
    });
  });

  // contact: circle the line, ask for a note, say goodbye
  const guest = $("[data-guest]");
  beat("contact", ".contact-title", "top 70%", async () => {
    await host.speak(D.host.contact, 1400);
    await host.circle($(".contact-link"));
    await host.wait(300);
    await host.speak(D.host.askNote, 2000);
    await host.pointAt($("#guest-input"));
    await host.wait(200);
    await host.wave();
    await host.speak(D.host.bye, 2500);
    remember({ finished: true });
  });

  // ------------------------------------------------------------------ attention: the host watches what you look at
  const lingerNotes = new Map(); // plate index -> how many notes written
  D.projects.forEach((_, i) => lingerNotes.set(i, 1));
  function watch(el, onLinger, ms) {
    let t = 0;
    const start = () => { clearTimeout(t); t = setTimeout(onLinger, ms); };
    const stop = () => clearTimeout(t);
    el.addEventListener("pointerenter", start); el.addEventListener("pointerleave", stop);
    el.addEventListener("focus", start); el.addEventListener("blur", stop);
    if (!fine) new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.8 }).observe(el);
  }
  plateEls.forEach((el, i) => watch(el, () => {
    if (!tourOn || host.busy || sheetOpen) return;
    const p = D.projects[i], n = lingerNotes.get(i);
    const notes = p.notes || [];
    if (n >= notes.length) return;
    lingerNotes.set(i, n + 1);
    host.run(async () => {
      el.classList.add("is-watched");
      await host.speak(pick(D.host.linger), 1200);
      await host.writeNear(innerWidth >= 900 ? $(".plate-title span", el) : $(".plate-desc", el), notes[n], innerWidth >= 900 ? "right" : "below", n);
      el.classList.remove("is-watched");
    });
  }, fine ? 2600 : 3500));
  const capNoted = new Set();
  capEls.forEach((el, i) => watch(el, () => {
    const c = D.capabilities[i];
    if (!tourOn || host.busy || capNoted.has(i) || !c.note) return;
    capNoted.add(i);
    host.run(async () => { await host.writeNear(el, c.note, "below"); });
  }, fine ? 1200 : 2500));

  // fast skims past the work get called back
  let lastY = scrollY, lastT = performance.now(), skipped = false, backUp = false;
  addEventListener("scroll", () => {
    const now = performance.now(), dy = scrollY - lastY, dt = now - lastT; lastY = scrollY; lastT = now;
    if (!tourOn || host.busy) return;
    const work = $("#work").getBoundingClientRect();
    if (!skipped && dy / Math.max(1, dt) > 2.2 && work.bottom < 0 && !memory.finished) {
      skipped = true;
      host.run(async () => { await host.speak(D.host.skipped, 1600); await host.arrow(host.pos.x, host.pos.y + 40, $("#work .label")); });
    }
    if (!backUp && done.size > 2 && scrollY < 40) { backUp = true; host.run(async () => { await host.nod(); host.quip(D.host.backUp); }); }
    if (!host.busy) host.keepOnScreen();
  }, { passive: true });

  // dodge, idle
  const mouse = { x: -1, y: -1 };
  const you = $("#you");
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY + scrollY;
    host.setAttention(mouse.x, mouse.y);
    if (fine) { you.classList.add("on"); you.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`; }
    if (!fine || host.parked) return;
    if (Math.hypot(mouse.x - host.pos.x, mouse.y - host.pos.y) < 70) host.dodge(mouse.x, mouse.y);
  });
  document.addEventListener("pointerleave", () => you.classList.remove("on"));
  let idleT = 0, idleCount = 0;
  function armIdle() {
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      if (tourOn && !host.busy && !sheetOpen && idleCount < 6) {
        idleCount++;
        host.run(async () => {
          await host.wave();
          const line = idleCount === 2 && fine ? D.host.typeHint : idleCount === 4 ? D.host.penHint : pick(D.host.idle);
          host.quip(line, 2200);
          if (idleCount === 3) await host.doodle("question", host.pos.x + 40, host.pos.y);
        });
      }
      armIdle();
    }, 9000);
  }
  ["pointermove", "pointerdown", "scroll", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, armIdle, { passive: true }));
  armIdle();

  // away and back: the host notices, and doodles while you're gone
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = performance.now(); return; }
    const away = performance.now() - hiddenAt;
    if (away < 6000 || !tourOn) return;
    host.run(async () => {
      if (away > 15000) await host.doodle("smile", host.pos.x + 46, host.pos.y + 10);
      await host.speak(pick(D.host.away), 1600);
    });
  });
  // small reactions to what the visitor does with the page
  const once = new Set();
  const react = (key, fn) => { if (once.has(key) || !tourOn || host.busy) return; once.add(key); fn(); };
  document.addEventListener("copy", () => react("copy", () => host.quip(D.host.copied, 2200)));
  document.addEventListener("contextmenu", () => react("ctx", () => host.quip(D.host.rightClick, 2000)));
  addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") react("all", () => host.quip(D.host.selectAll, 2000)); });
  addEventListener("beforeprint", () => react("print", () => host.quip(D.host.printed, 2400)));
  let rs = 0; addEventListener("resize", () => { clearTimeout(rs); rs = setTimeout(() => react("resize", () => host.quip(D.host.resized, 1600)), 600); });

  // ------------------------------------------------------------------ talk to the host
  const chips = $("[data-ask-chips]"), askForm = $("[data-ask-form]"), askInput = $("[data-ask-input]");
  function openAsk() { askEl.hidden = false; askInput.focus(); }
  $("[data-ask-open]").addEventListener("click", () => (askEl.hidden ? openAsk() : closeAsk()));
  document.addEventListener("click", (e) => { if (!askEl.hidden && !e.target.closest("#ask, [data-ask-open]")) closeAsk(); });
  async function act(action) {
    if (!action) return;
    if (action === "hero") { await host.scrollTo($(".hero-name"), 0.15); await host.circle($("[data-first]")); return; }
    if (action === "about") { await host.scrollTo($(".manifesto"), 0.2); await host.underline(words[0]); await host.writeNear(capEls[0], "all of these.", "below"); return; }
    if (action === "contact") { await host.scrollTo($(".contact-title"), 0.15); await host.circle($(".contact-link")); return; }
    if (action === "best") {
      const i = Math.max(0, D.projects.findIndex((p) => p.best));
      await host.scrollTo(plateEls[i], 0.25);
      const r = plateEls[i].getBoundingClientRect();
      await host.doodle("star", r.left + 30, r.top + scrollY + 40);
      await host.click(plateEls[i]); return;
    }
    const m = /^project:(\d+)$/.exec(action);
    if (m) { const i = +m[1]; await host.scrollTo(plateEls[i], 0.25); await host.click(plateEls[i]); }
  }
  D.host.asks.forEach((a) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = a.label;
    b.addEventListener("click", () => { closeAsk(); host.run(async () => { await host.speak(a.say, 1200); await act(a.action); }, { priority: true, interrupt: true }); });
    chips.append(b);
  });
  askForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = askInput.value.trim().toLowerCase(); if (!q) return;
    askInput.value = ""; closeAsk();
    const hit = D.host.replies.find(([keys]) => keys.some((k) => q.includes(k)));
    host.run(async () => {
      if (hit) { await host.speak(hit[1], 1600); await act(hit[2]); }
      else { await host.doodle("question", host.pos.x + 40, host.pos.y); await host.speak(pick(D.host.fallback), 2200); }
    }, { priority: true, interrupt: true });
  });
  // cursor chat: on desktop, just start typing — the words appear beside your cursor
  const youSay = $("[data-you-say]");
  let draft = "", draftT = 0, typeHinted = false;
  function sendDraft() {
    const q = draft.trim().toLowerCase(); draft = ""; youSay.hidden = true; youSay.textContent = "";
    if (!q) return;
    const hit = D.host.replies.find(([keys]) => keys.some((k) => q.includes(k)));
    host.run(async () => {
      if (hit) { await host.speak(hit[1], 1600); await act(hit[2]); }
      else { await host.doodle("question", host.pos.x + 40, host.pos.y); await host.speak(pick(D.host.fallback), 2200); }
    }, { priority: true, interrupt: true });
  }
  if (fine) addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") { if (draft) { e.preventDefault(); sendDraft(); } return; }
    if (e.key === "Escape") { draft = ""; youSay.hidden = true; return; }
    if (e.key === "Backspace") { draft = draft.slice(0, -1); youSay.textContent = draft; if (!draft) youSay.hidden = true; return; }
    if (e.key.length !== 1) return;
    if (e.key === " " && !draft) return;
    e.preventDefault();
    draft = (draft + e.key).slice(0, 80);
    youSay.hidden = false; youSay.textContent = draft; you.classList.add("on");
    clearTimeout(draftT); draftT = setTimeout(() => { if (draft) sendDraft(); }, 6000);
  });

  // tap the host itself to talk to it
  document.addEventListener("pointerdown", (e) => {
    if (Math.hypot(e.clientX - host.pos.x, e.clientY + scrollY - host.pos.y) < 40 && !host.busy) { openAsk(); host.quip("yeah?"); }
  });

  // the visitor's pen: draw on the page. circle a project and the host opens it.
  const penBtn = $("[data-pen]");
  let penOn = false, drawing = null;
  const inkLayer = $("#ink");
  penBtn.addEventListener("click", () => {
    penOn = !penOn;
    penBtn.setAttribute("aria-pressed", String(penOn));
    $("[data-pen-label]").textContent = penOn ? "Pen on" : "Pen";
    root.classList.toggle("pen", penOn); root.classList.toggle("pen-touch", penOn && !fine);
    if (penOn && lenis && !fine) lenis.stop(); else if (lenis && !fine) lenis.start();
  });
  let justDrew = false;
  document.addEventListener("click", (e) => { if (justDrew && !e.target.closest(".hud, #ask, #sheet")) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("pointerdown", (e) => {
    if (!penOn || e.target.closest("a, input, .hud, #ask, #sheet, .guest")) return;
    e.preventDefault();
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "stroke you-stroke");
    inkLayer.append(path);
    drawing = { path, pts: [[e.clientX, e.clientY + scrollY]] };
    path.setAttribute("d", `M${e.clientX} ${e.clientY + scrollY}`);
  });
  document.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    drawing.pts.push([e.clientX, e.clientY + scrollY]);
    drawing.path.setAttribute("d", drawing.path.getAttribute("d") + ` L${e.clientX} ${e.clientY + scrollY}`);
  });
  function endDraw() {
    if (!drawing) return;
    const { pts } = drawing; drawing = null;
    justDrew = true; setTimeout(() => (justDrew = false), 300);
    if (pts.length < 8) return;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const box = { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
    const diag = Math.hypot(box.r - box.l, box.b - box.t);
    const closed = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < diag * 0.35 && diag > 60;
    const overlap = (el) => { const r = el.getBoundingClientRect(); const R = { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY }; const w = Math.max(0, Math.min(box.r, R.r) - Math.max(box.l, R.l)), h = Math.max(0, Math.min(box.b, R.b) - Math.max(box.t, R.t)); return (w * h) / Math.max(1, (R.r - R.l) * (R.b - R.t)); };
    let plate = -1, best = 0.5;
    plateEls.forEach((el, i) => { const o = overlap($(".plate-title", el)); if (o > best) { best = o; plate = i; } });
    if (closed && plate > -1) { host.run(async () => { await host.speak(pick(D.host.circled), 900); await host.click(plateEls[plate]); }, { priority: true, interrupt: true }); return; }
    const hostNote = $$(".note:not(.guest-note)").find((n) => overlap(n) > 0.4);
    if (hostNote) { host.run(async () => { await host.moveTo(box.r + 20, box.t, 400); await host.speak(pick(D.host.scribbled), 1500); }, { priority: true, interrupt: true }); return; }
    if (Math.random() < 0.5) host.run(async () => { await host.moveTo(box.r + 24, box.b + 10, 500); await host.speak(pick(D.host.drew), 1300); }, { priority: true, interrupt: true });
  }
  document.addEventListener("pointerup", endDraw); document.addEventListener("pointercancel", endDraw);

  // guest note: the visitor writes on the page in their own hand
  guest.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = $("#guest-input").value.trim(); if (!text) return;
    $("#guest-input").value = "";
    const r = guest.getBoundingClientRect();
    const count = $$(".guest-note").length;
    const pending = host.note(text, r.left + 20, r.top + scrollY + r.height + 24 + count * 36, { cls: "guest-note", rotate: -2 });
    host.run(async () => {
      const n = await pending;
      const nr = n.getBoundingClientRect();
      await host.doodle("heart", nr.right + 22, nr.top + scrollY + nr.height / 2);
      await host.speak(pick(D.host.thanks), 1800);
      const notes = [...(memory.notes || []), text].slice(-5); remember({ notes });
    }, { priority: true, interrupt: true });
  });
  // notes from earlier visits come back
  if (memory.notes && memory.notes.length) {
    const r = guest.getBoundingClientRect();
    memory.notes.slice(-3).forEach((t, i) => {
      const n = document.createElement("span"); n.className = "hand note guest-note"; n.textContent = t;
      n.style.left = r.left + 20 + "px"; n.style.top = r.top + scrollY + r.height + 24 + i * 36 + "px"; n.style.transform = "rotate(-2deg)";
      document.body.append(n);
    });
  }

  // sound + tour toggles
  const soundBtn = $("[data-sound]");
  soundBtn.addEventListener("click", () => {
    host.sound = !host.sound;
    soundBtn.setAttribute("aria-pressed", String(host.sound));
    $("[data-sound-label]").textContent = host.sound ? "Sound on" : "Sound";
  });
  tourBtn.addEventListener("click", async () => {
    tourOn = !tourOn;
    tourBtn.setAttribute("aria-pressed", String(tourOn));
    $("[data-tour-label]").textContent = tourOn ? "Tour on" : "Tour off";
    root.classList.toggle("host-solo", !tourOn);
    if (!tourOn) { host.quip(D.host.solo, 3000); await host.park(); }
    else { host.parked = false; host.run(async () => { await host.moveTo(innerWidth * 0.5, scrollY + innerHeight * 0.5); await host.wave(); await host.speak(D.host.back, 900); }); }
  });

  // ------------------------------------------------------------------ choreography
  gsap.from(".hero .line > span", { yPercent: 110, duration: 1.1, stagger: 0.08, ease: "expo.out", delay: 0.2 });
  gsap.from(".hud", { y: -20, opacity: 0, duration: 0.8, delay: 0.6 });
  gsap.fromTo(".manifesto .w", { opacity: 0.15 }, { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: ".manifesto", start: "top 80%", end: "bottom 55%", scrub: true } });
  $$(".label, .plate, .contact-title .line > span, .contact-line").forEach((el) => gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } }));
  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
