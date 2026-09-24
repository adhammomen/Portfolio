// Proof: a tiny test runner that renders its suites as the page and runs them in front of the visitor.
// Tests are plain functions (see tests.js). Each returns pass / fail / pending / skip with a note and evidence.
window.PROOF = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const suites = [];
  let current = null, running = false, runs = 0, startedAt = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- defining
  function describe(name, meta, fn) { if (typeof meta === "function") { fn = meta; meta = {}; } current = { name, meta: meta || {}, tests: [], el: null }; suites.push(current); fn(); current = null; }
  function it(claim, fn, opts = {}) { if (!current) throw new Error("it() outside describe()"); current.tests.push({ claim, fn, opts, result: null, el: null }); }
  const pass = (note = "", evidence) => ({ status: "pass", note, evidence });
  const fail = (note = "", evidence) => ({ status: "fail", note, evidence });
  const pending = (note = "", evidence) => ({ status: "pending", note, evidence });
  const skip = (note = "", evidence) => ({ status: "skip", note, evidence });
  const LABEL = { pass: "PASS", fail: "FAIL", pending: "PENDING", skip: "SKIPPED", queued: "", running: "…" };

  // --- helpers tests can use
  const fmtMs = (ms) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`);
  const fmtBytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`);
  const ago = (date) => { const s = Math.max(0, (Date.now() - +new Date(date)) / 1000); if (s < 90) return `${Math.round(s)}s ago`; const m = s / 60; if (m < 90) return `${Math.round(m)} min ago`; const h = m / 60; if (h < 36) return `${Math.round(h)}h ago`; return `${Math.round(h / 24)} days ago`; };
  async function fetchJSON(url, opts = {}) {
    const t0 = performance.now();
    const r = await fetch(url, { cache: "no-store", ...opts });
    const ms = performance.now() - t0;
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch (_) {}
    return { ok: r.ok, status: r.status, headers: r.headers, json, text, ms, url };
  }
  const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what || "test"} took longer than ${fmtMs(ms)}`)), ms))]);

  // --- rendering
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  function dedent(src) {
    const lines = src.split("\n");
    const ind = lines.slice(1).filter((l) => l.trim()).reduce((m, l) => Math.min(m, l.match(/^\s*/)[0].length), 99);
    return [lines[0], ...lines.slice(1).map((l) => l.slice(Math.min(ind, l.match(/^\s*/)[0].length)))].join("\n");
  }
  function fmtEvidence(e) {
    if (e == null) return "";
    if (typeof e === "string") return e;
    if (Array.isArray(e)) return e.map((x) => (typeof x === "string" ? x : fmtEvidence(x))).join("\n");
    return Object.entries(e).map(([k, v]) => `${k}: ${typeof v === "object" && v !== null ? JSON.stringify(v) : v}`).join("\n");
  }
  function render(root) {
    root.replaceChildren();
    suites.forEach((s, si) => {
      const sec = document.createElement("section"); sec.className = "suite"; sec.id = "s-" + slug(s.name);
      sec.innerHTML = `<header class="suite-head"><p class="mono suite-idx">(${String(si + 1).padStart(2, "0")})</p><h2 class="suite-name">${s.meta.title || s.name}</h2><p class="mono suite-desc">describe(<span class="str">"${s.name}"</span>)${s.meta.sub ? ` <span class="muted">· ${s.meta.sub}</span>` : ""}</p>${s.meta.intro ? `<p class="suite-intro">${s.meta.intro}</p>` : ""}</header><ol class="tests"></ol>`;
      const ol = $(".tests", sec);
      s.tests.forEach((t, ti) => {
        const li = document.createElement("li"); li.className = "test"; li.dataset.status = "queued"; li.id = `t-${si + 1}-${ti + 1}`;
        li.innerHTML = `<div class="test-row"><p class="claim">${t.claim}</p><div class="stamp-slot"><span class="stamp" aria-live="polite"></span></div></div>
          <p class="test-meta mono"><span class="tid">it(<span class="str">"${t.opts.id || t.claim.toLowerCase()}"</span>)</span><span class="ms"></span><span class="note"></span><button class="ev-toggle" type="button" aria-expanded="false" hidden>evidence</button></p>
          <div class="evidence" hidden><pre class="ev-data mono"></pre><details class="ev-src"><summary class="mono">the test itself</summary><pre class="ev-code mono"></pre></details></div>`;
        $(".ev-code", li).textContent = dedent(t.fn.toString());
        $(".ev-toggle", li).addEventListener("click", (e) => { const ev = $(".evidence", li); ev.hidden = !ev.hidden; e.currentTarget.setAttribute("aria-expanded", String(!ev.hidden)); });
        ol.append(li); t.el = li;
      });
      root.append(sec); s.el = sec;
    });
  }
  function show(t, res, ms) {
    const li = t.el; li.dataset.status = res.status;
    $(".stamp", li).textContent = LABEL[res.status];
    $(".ms", li).textContent = ms != null ? fmtMs(ms) : "";
    $(".note", li).textContent = res.note || "";
    const data = fmtEvidence(res.evidence);
    $(".ev-data", li).textContent = data; $(".ev-data", li).hidden = !data;
    $(".ev-toggle", li).hidden = false;
    if (res.status !== "queued" && res.status !== "running") stampSound(res.status);
  }

  // --- the run
  const counts = () => { const c = { pass: 0, fail: 0, pending: 0, skip: 0, total: 0, done: 0 }; suites.forEach((s) => s.tests.forEach((t) => { c.total++; if (t.result) { c.done++; c[t.result.status]++; } })); return c; };
  const listeners = [];
  const onChange = (fn) => listeners.push(fn);
  const emit = () => { const c = counts(); listeners.forEach((fn) => fn(c, running)); };
  async function runOne(t) {
    t.el.dataset.status = "running"; $(".stamp", t.el).textContent = LABEL.running;
    const t0 = performance.now();
    let res;
    try { res = await withTimeout(Promise.resolve().then(() => t.fn({ pass, fail, pending, skip, fetchJSON, fmtMs, fmtBytes, ago })), t.opts.timeout || 9000, `"${t.claim}"`); }
    catch (e) { res = fail(e && e.message ? e.message : String(e)); }
    if (!res || !res.status) res = fail("the test returned nothing");
    const ms = performance.now() - t0;
    t.result = { ...res, ms };
    show(t, res, ms);
    emit();
    return res;
  }
  async function run({ pace = true } = {}) {
    if (running) return; running = true; runs++; startedAt = performance.now();
    suites.forEach((s) => s.tests.forEach((t) => { t.result = null; t.el.dataset.status = "queued"; $(".stamp", t.el).textContent = ""; $(".ms", t.el).textContent = ""; $(".note", t.el).textContent = ""; }));
    emit();
    for (const s of suites) for (const t of s.tests) {
      const t0 = performance.now();
      await runOne(t);
      // a little pacing so a run reads as a run, not a flash. network tests take what they take
      const min = reduce || !pace ? 0 : 200 + Math.random() * 140;
      const dt = performance.now() - t0; if (dt < min) await new Promise((r) => setTimeout(r, min - dt));
    }
    running = false; emit();
    try { console.table(report().rows); } catch (_) {}
    return counts();
  }
  function report() {
    const c = counts();
    const rows = []; suites.forEach((s) => s.tests.forEach((t) => rows.push({ suite: s.name, claim: t.claim, status: t.result ? t.result.status : "queued", note: t.result ? t.result.note : "", ms: t.result ? Math.round(t.result.ms) : "" })));
    const lines = [`${window.CONTENT.name} — proof, run ${runs} at ${new Date().toLocaleString()}`, `${c.pass} passed · ${c.pending} pending · ${c.fail} failed · ${c.skip} skipped · ${c.total} total · ${fmtMs(performance.now() - startedAt)}`, ""];
    suites.forEach((s) => { lines.push(`describe("${s.name}")`); s.tests.forEach((t) => lines.push(`  ${t.result ? LABEL[t.result.status].padEnd(8) : "        "} ${t.claim}${t.result && t.result.note ? " — " + t.result.note : ""}`)); lines.push(""); });
    lines.push(location.href);
    return { rows, text: lines.join("\n"), counts: c };
  }

  // --- a small stamp sound, opt-in
  let ac = null, soundOn = false;
  function stampSound(status) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume();
      const t = ac.currentTime, buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const s = ac.createBufferSource(); s.buffer = buf; const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = status === "pass" ? 900 : status === "fail" ? 400 : 650;
      const g = ac.createGain(); g.gain.value = 0.35; s.connect(f).connect(g).connect(ac.destination); s.start(t);
    } catch (_) {}
  }

  run.one = (t) => (running ? null : runOne(t));
  return { describe, it, run, render, report, counts, onChange, suites, fmtMs, fmtBytes, ago, get running() { return running; }, get sound() { return soundOn; }, set sound(v) { soundOn = !!v; if (v) stampSound("pass"); } };
})();
