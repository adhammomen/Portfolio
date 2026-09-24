// Glue: render the suites, run them, keep the header, tab title and report in step.
(() => {
  const C = window.CONTENT, P = window.PROOF, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  document.title = `${C.name} — proof`;
  $$("[data-name]").forEach((el) => (el.textContent = C.name));
  $$("[data-role]").forEach((el) => (el.textContent = C.role));
  $$("[data-premise]").forEach((el) => (el.textContent = C.premise));
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  $$("[data-github]").forEach((a) => { a.href = `https://github.com/${C.github}`; a.textContent = `github.com/${C.github}`; });
  const [first, ...rest] = C.name.split(/\s+/); $("[data-first]").textContent = first; $("[data-last]").textContent = rest.join(" ");
  const mail = $("[data-mail]");
  if (C.email) { mail.href = `mailto:${C.email}?subject=${encodeURIComponent("Hi Adham — starting the clock")}`; mail.textContent = C.email; } else { mail.hidden = true; $("[data-no-mail]").hidden = false; }

  P.render($("#suites"));
  $$("[data-total]").forEach((el) => (el.textContent = P.counts().total));

  // --- the header and tab title follow the run
  const base = document.title;
  const rail = $(".rail-fill"), verdict = $("[data-verdict]");
  P.onChange((c, running) => {
    $$("[data-pass]").forEach((el) => (el.textContent = c.pass));
    $$("[data-pending]").forEach((el) => (el.textContent = c.pending));
    $$("[data-fail]").forEach((el) => (el.textContent = c.fail));
    $$("[data-skip]").forEach((el) => (el.textContent = c.skip));
    $$("[data-done]").forEach((el) => (el.textContent = c.done));
    rail.style.transform = `scaleX(${c.total ? c.done / c.total : 0})`;
    document.title = running ? `${c.done}/${c.total} · ${base}` : c.done ? `${c.pass} passed · ${base}` : base;
    document.documentElement.classList.toggle("running", running);
    if (!running && c.done) {
      const r = P.report();
      verdict.textContent = `${c.pass} passed · ${c.pending} pending · ${c.fail} failed · ${c.skip} skipped`;
      $("[data-report]").value = r.text;
      $("[data-ran]").textContent = `run ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} on your ${matchMedia("(pointer: coarse)").matches ? "phone" : "machine"}`;
    }
  });
  $$("[data-run]").forEach((b) => b.addEventListener("click", () => { if (!P.running) { P.run(); $("#suites").scrollIntoView({ behavior: "smooth", block: "start" }); } }));
  $("[data-copy]").addEventListener("click", async (e) => { const t = P.report().text; try { await navigator.clipboard.writeText(t); e.currentTarget.textContent = "copied"; setTimeout(() => (e.currentTarget.textContent = "copy the report"), 1600); } catch (_) { $("[data-report]").hidden = false; $("[data-report]").select(); } });
  const snd = $("[data-sound]");
  snd.addEventListener("click", () => { P.sound = !P.sound; snd.setAttribute("aria-pressed", String(P.sound)); snd.textContent = P.sound ? "sound on" : "sound"; });

  // --- the contact test: the visitor runs it
  const CK = "proof.contact";
  const cstate = () => { try { return JSON.parse(localStorage.getItem(CK) || "{}"); } catch (_) { return {}; } };
  const csave = (m) => { try { localStorage.setItem(CK, JSON.stringify(m)); } catch (_) {} };
  function contactUI() {
    const m = cstate();
    $("[data-c-start]").hidden = !!m.sent || !C.email;
    $("[data-c-replied]").hidden = !m.sent || !!m.replied;
    $("[data-c-reset]").hidden = !m.sent;
    $("[data-c-line]").textContent = m.replied ? `replied. thank you for running it.` : m.sent ? `clock started ${P.ago(m.sent)}.` : "";
  }
  $("[data-c-start]").addEventListener("click", () => { csave({ sent: Date.now() }); contactUI(); rerunContact(); });
  $("[data-c-replied]").addEventListener("click", () => { csave({ ...cstate(), replied: Date.now() }); contactUI(); rerunContact(); });
  $("[data-c-reset]").addEventListener("click", () => { csave({}); contactUI(); rerunContact(); });
  mail.addEventListener("click", () => { if (!cstate().sent) { csave({ sent: Date.now() }); contactUI(); rerunContact(); } });
  function rerunContact() { const s = P.suites[P.suites.length - 1]; const t = s.tests[0]; if (!P.running) { t.result = null; P.run.one ? P.run.one(t) : null; } }
  contactUI();

  // --- go
  const go = () => setTimeout(() => P.run(), 500);
  if (document.readyState === "complete") go(); else addEventListener("load", go);
})();
