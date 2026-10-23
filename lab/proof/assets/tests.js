// The claims. Each one is a test that runs in the visitor's browser against the real thing.
// Keep them honest: a claim that can't be checked yet says pending, not pass.
(() => {
  const C = window.CONTENT, { describe, it, ago, fmtMs, fmtBytes } = window.PROOF;
  const errors = []; addEventListener("error", (e) => errors.push(e.message)); // for "has no console errors"
  const t0 = performance.now();

  // --- things several tests share, started early so the run isn't waiting on the network
  const GH = "https://api.github.com";
  const gh = (path) => fetch(`${GH}${path}`, { headers: { Accept: "application/vnd.github+json" } }).then(async (r) => ({ ok: r.ok, status: r.status, remaining: r.headers.get("x-ratelimit-remaining"), reset: r.headers.get("x-ratelimit-reset"), json: r.ok ? await r.json() : null })).catch((e) => ({ ok: false, status: 0, error: e.message }));
  const events = C.github ? gh(`/users/${C.github}/events/public?per_page=100`) : Promise.resolve({ ok: false, status: 0 });
  const repos = C.github ? gh(`/users/${C.github}/repos?per_page=100&sort=pushed`) : Promise.resolve({ ok: false, status: 0 });
  const vitals = fetch(`${C.machine.url}${C.machine.url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" }).then(async (r) => ({ ok: r.ok, status: r.status, json: r.ok ? await r.json() : null })).catch((e) => ({ ok: false, status: 0, error: e.message }));
  const ghProblem = (r) => (r.status === 403 && r.remaining === "0" ? `GitHub rate-limited this browser · resets ${new Date(+r.reset * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : r.status === 0 ? `couldn't reach api.github.com from here (${r.error || "network"})` : r.status === 404 ? `no GitHub user "${C.github}"` : `GitHub answered ${r.status}`);
  const day = 86400000;

  // ------------------------------------------------------------------ 1. me
  describe(C.name, { title: "The person", sub: "claims about me, checked against the real thing" }, () => {
    it("keeps a server alive, myself", async ({ pass, pending, fail }) => {
      const r = await vitals;
      if (!r.ok || !r.json) return fail(`the machine didn't answer (${r.status || r.error})`, { url: C.machine.url });
      const v = r.json, ageH = (Date.now() - +new Date(v.at)) / 3600000;
      const ev = { host: v.host, platform: v.platform, "up for": `${Math.floor(v.uptime_s / 86400)}d ${Math.floor((v.uptime_s % 86400) / 3600)}h`, load: `${v.load1} on ${v.cpus} cpus`, memory: `${(v.mem_used_mb / 1024).toFixed(1)} of ${(v.mem_total_mb / 1024).toFixed(0)} GB`, disk: `${v.disk_pct}% full`, "reported at": `${new Date(v.at).toLocaleString()} (${ago(v.at)})` };
      if (ageH > C.machine.maxAgeHours) return pending(`the box last reported ${ago(v.at)}. it's meant to report every minute`, ev);
      return pass(`${v.host} is up, heard from it ${ago(v.at)}`, ev);
    });
    it("ships code", async ({ pass, pending, skip }) => {
      const r = await events;
      if (!r.ok) return skip(ghProblem(r));
      const pushes = r.json.filter((e) => e.type === "PushEvent" && Date.now() - +new Date(e.created_at) < 30 * day);
      const commits = pushes.reduce((n, e) => n + (e.payload.size || (e.payload.commits || []).length || 1), 0);
      const reposTouched = [...new Set(pushes.map((e) => e.repo.name))];
      const ev = pushes.slice(0, 12).map((e) => `${e.created_at.slice(0, 16).replace("T", " ")}  ${e.repo.name}  ${(e.payload.commits || []).map((c) => c.message.split("\n")[0]).join(" · ").slice(0, 90)}`);
      if (!pushes.length) return pending("no public pushes in the last 30 days. the work is in private repos, which this test can't see", { "public events seen": r.json.length });
      return pass(`${commits} commits to ${reposTouched.length} public ${reposTouched.length === 1 ? "repo" : "repos"} in the last 30 days`, ev);
    });
    it("works at hours a bot wouldn't", async ({ pass, pending, skip }) => {
      const r = await events;
      if (!r.ok) return skip(ghProblem(r));
      const hours = new Array(24).fill(0);
      r.json.forEach((e) => hours[new Date(e.created_at).getHours()]++);
      const late = hours.slice(0, 5).reduce((a, b) => a + b, 0), total = r.json.length;
      if (!total) return pending("no public activity to look at");
      const bar = hours.map((n) => "▁▂▃▄▅▆▇█"[Math.min(7, Math.round((n / Math.max(...hours)) * 7))]).join("");
      return pass(`${late} of ${total} recent actions between midnight and 5am (your time)`, { "activity by hour": bar, "0h → 23h": "" });
    });
    it("has public code", async ({ pass, pending, skip }) => {
      const r = await repos;
      if (!r.ok) return skip(ghProblem(r));
      const own = r.json.filter((x) => !x.fork);
      if (!own.length) return pending("nothing public yet");
      const langs = {}; own.forEach((x) => { if (x.language) langs[x.language] = (langs[x.language] || 0) + 1; });
      return pass(`${own.length} public ${own.length === 1 ? "repository" : "repositories"}, last push ${ago(own[0].pushed_at)}`, own.slice(0, 10).map((x) => `${x.name.padEnd(24)} ${(x.language || "").padEnd(12)} pushed ${ago(x.pushed_at)}`).concat(["", "languages: " + Object.entries(langs).map(([k, v]) => `${k} ×${v}`).join(", ")]));
    });
    it("finishes things", ({ pass, pending }) => {
      const done = C.projects.filter((p) => p.status === "finished"), open = C.projects.filter((p) => p.status !== "finished");
      const ev = C.projects.map((p) => `${p.status === "finished" ? "done   " : "open   "} ${p.title} (${p.year})`);
      if (!done.length) return pending("nothing finished yet. see below", ev);
      return pass(`${done.length} finished, ${open.length} in progress. the open ones are listed below, with their own tests`, ev);
    });
    it("builds without a framework", ({ pass, fail }) => {
      const scripts = [...document.scripts].map((s) => s.src.split("/").pop() || "(inline)");
      const frameworks = ["React", "Vue", "angular", "__NEXT_DATA__", "__NUXT__", "Svelte", "jQuery", "$"].filter((k) => k in window);
      if (frameworks.length) return fail(`found ${frameworks.join(", ")} on this page`, { scripts });
      return pass(`this page: ${scripts.length} scripts, all mine, 0 dependencies`, { scripts, "node_modules": "none" });
    });
    it("can be reached", ({ pass, pending }) => {
      if (C.email) return pass(`${C.email}`, { email: C.email, github: `github.com/${C.github}` });
      return pending("no email on this page yet. GitHub works", { github: `github.com/${C.github}` });
    });
  });

  // ------------------------------------------------------------------ 2. this page
  describe("this page", { title: "This page", sub: "measured on your device, this visit" }, () => {
    it("loaded in under a second", ({ pass, fail, skip }) => {
      const n = performance.getEntriesByType("navigation")[0];
      if (!n) return skip("your browser doesn't expose navigation timing");
      const ms = n.domContentLoadedEventEnd, ev = { "time to first byte": fmtMs(n.responseStart), "html received": fmtMs(n.responseEnd), "DOM ready": fmtMs(n.domContentLoadedEventEnd), "fully loaded": n.loadEventEnd ? fmtMs(n.loadEventEnd) : "still loading", transfer: n.transferSize ? fmtBytes(n.transferSize) : "cached" };
      return ms < 1000 ? pass(`DOM ready in ${fmtMs(ms)}`, ev) : fail(`DOM ready took ${fmtMs(ms)} on your connection`, ev);
    });
    it("weighs less than 300 KB", ({ pass, fail }) => {
      const res = performance.getEntriesByType("resource").filter((r) => !/api\.github\.com/.test(r.name));
      const nav = performance.getEntriesByType("navigation")[0];
      const total = res.reduce((n, r) => n + (r.transferSize || r.encodedBodySize || 0), 0) + ((nav && nav.transferSize) || 0);
      const ev = res.map((r) => `${fmtBytes(r.transferSize || r.encodedBodySize || 0).padStart(9)}  ${r.name.split("/").slice(-2).join("/")}`);
      if (!total) return pass("everything came from your cache this time", ev);
      return total < 300 * 1024 ? pass(`${fmtBytes(total)} for the whole page, fonts included`, ev) : fail(`${fmtBytes(total)}`, ev);
    });
    it("made no third-party requests", ({ pass, fail }) => {
      const res = performance.getEntriesByType("resource");
      const third = res.filter((r) => new URL(r.name).origin !== location.origin);
      const tests = third.filter((r) => /api\.github\.com/.test(r.name)), other = third.filter((r) => !/api\.github\.com/.test(r.name));
      if (other.length) return fail(`${other.length} requests left this site`, other.map((r) => r.name));
      return pass(`0 trackers, 0 CDNs, 0 analytics. ${tests.length ? `the only outside calls are the ${tests.length} this page made to GitHub, above, to check on me` : "nothing left this site"}`, { "requests": res.length, "third-party": other.length, "to api.github.com (the tests)": tests.length });
    });
    it("runs at 60 frames a second", async ({ pass, fail }) => {
      const times = []; let last = performance.now();
      await new Promise((res) => { (function f() { const n = performance.now(); times.push(n - last); last = n; if (times.length < 40) requestAnimationFrame(f); else res(); })(); });
      const sorted = times.slice(3).sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * 0.95)], avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const ev = { "frames sampled": times.length, "average frame": fmtMs(avg), "95th percentile": fmtMs(p95), "worst": fmtMs(sorted[sorted.length - 1]) };
      const median = sorted[Math.floor(sorted.length / 2)];
      return median <= 18 && p95 <= 34 ? pass(`${Math.min(60, Math.round(1000 / median))} fps while it stamped this`, ev) : fail(`frames up to ${fmtMs(p95)}; something on your machine is busy, or this page is. re-run to see which`, ev);
    });
    it("has text you can actually read", ({ pass, fail }) => {
      const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const bg = getComputedStyle(document.body).backgroundColor, lb = lum(bg);
      const samples = [["claim", document.querySelector(".claim")], ["small print", document.querySelector(".test-meta")], ["muted", document.querySelector(".muted")], ["evidence", document.querySelector(".ev-data")]].filter((x) => x[1]);
      const rows = samples.map(([n, el]) => { const lc = lum(getComputedStyle(el).color); const ratio = (Math.max(lc, lb) + 0.05) / (Math.min(lc, lb) + 0.05); return [n, ratio]; });
      const worst = Math.min(...rows.map((r) => r[1]));
      const ev = rows.map(([n, r]) => `${n.padEnd(12)} ${r.toFixed(1)}:1`).concat([`background ${bg}`]);
      return worst >= 7 ? pass(`contrast ${worst.toFixed(1)}:1 at worst (AAA is 7:1). no dark mode, on purpose`, ev) : worst >= 4.5 ? pass(`contrast ${worst.toFixed(1)}:1 at worst (AA)`, ev) : fail(`contrast ${worst.toFixed(1)}:1`, ev);
    });
    it("fits your screen without sideways scrolling", ({ pass, fail }) => {
      const w = document.documentElement.scrollWidth, v = document.documentElement.clientWidth;
      return w <= v + 1 ? pass(`${v}px wide, nothing sticking out`, { viewport: `${innerWidth}×${innerHeight}`, "page width": w, "pixel ratio": devicePixelRatio }) : fail(`the page is ${w}px wide on a ${v}px screen`);
    });
    it("works from the keyboard", ({ pass, fail }) => {
      const f = [...document.querySelectorAll("a[href], button, input, [tabindex]:not([tabindex='-1']), summary")].filter((el) => !el.hidden && el.offsetParent !== null);
      const first = f[0];
      const ev = { "focusable things": f.length, "first Tab lands on": first ? `${first.tagName.toLowerCase()} "${(first.textContent || "").trim().slice(0, 40)}"` : "nothing", "focus ring": getComputedStyle(document.documentElement).getPropertyValue("--focus").trim() || "2px solid" };
      return f.length > 10 && first && first.classList.contains("skip") ? pass(`${f.length} things reachable with Tab. the first one skips to the tests`, ev) : fail("the tab order is off", ev);
    });
    it("respects reduced motion", ({ pass }) => {
      const wants = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dur = getComputedStyle(document.querySelector(".stamp")).transitionDuration;
      if (wants) return pass(`you asked for less motion; the stamps stopped slamming (transition ${dur})`, { "prefers-reduced-motion": "reduce", "stamp transition": dur });
      return pass("you haven't asked for less motion; if you do, the stamps stop slamming", { "prefers-reduced-motion": "no-preference", "stamp transition": dur });
    });
    it("threw no errors", ({ pass, fail }) => (errors.length ? fail(`${errors.length} error${errors.length > 1 ? "s" : ""} in the console`, errors) : pass("the console is clean", { "window.onerror calls": 0, "time since load": fmtMs(performance.now() - t0) })));
    it("was built in the open", ({ pass, pending }) => {
      const H = window.HISTORY;
      if (!H || !H.commits.length) return pending("no commit history shipped with this build");
      const c = H.commits, last = c[c.length - 1];
      return pass(`${c.length} commits to this site, the last on ${last.date}`, c.slice(-8).map((x) => `${x.h}  ${x.date}  ${x.msg}`).concat(["", `repo: github.com/${C.github}/Portfolio`]));
    });
    it("admits when something isn't done", ({ pass, fail }) => {
      const all = window.PROOF.suites.flatMap((s) => s.tests).filter((t) => t.result);
      const notPass = all.filter((t) => t.result.status !== "pass");
      // if every test above passed, this one can't: a page where everything passes isn't telling you everything
      return notPass.length ? pass(`${notPass.length} of ${all.length} so far didn't pass. they're on the page anyway`, notPass.map((t) => `${t.result.status.padEnd(8)} ${t.claim}`)) : fail("everything passed. suspicious. re-run and look closer");
    });
  });

  // ------------------------------------------------------------------ 3. you
  describe("you", { title: "You", sub: "it only seems fair" }, () => {
    it("are online", ({ pass, fail }) => {
      const c = navigator.connection || {};
      return navigator.onLine ? pass(c.effectiveType ? `on a ${c.effectiveType} connection${c.rtt ? `, ~${c.rtt}ms round trip` : ""}` : "yes", { "navigator.onLine": true, type: c.effectiveType || "unknown (your browser keeps it private)", "save-data": c.saveData ? "on" : "off" }) : fail("you're offline, and this page still works");
    });
    it("are on a screen this was designed for", ({ pass }) => {
      const touch = matchMedia("(pointer: coarse)").matches;
      return pass(`${innerWidth}×${innerHeight} at ${devicePixelRatio}×, ${touch ? "touch" : "a mouse or trackpad"}. it's designed for exactly that`, { viewport: `${innerWidth}×${innerHeight}`, screen: `${screen.width}×${screen.height}`, "pixel ratio": devicePixelRatio, pointer: touch ? "coarse" : "fine", orientation: innerWidth > innerHeight ? "landscape" : "portrait" });
    });
    it("are awake", ({ pass }) => {
      const h = new Date().getHours(), t = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const line = h < 5 ? `it's ${t}. go to sleep, this will still be here` : h < 9 ? `it's ${t}. early` : h < 18 ? `it's ${t}. hello` : h < 23 ? `it's ${t}. evening` : `it's ${t}. late one`;
      return pass(line, { "your time": t, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language });
    });
    it("prefer light", ({ pass }) => {
      const dark = matchMedia("(prefers-color-scheme: dark)").matches;
      return pass(dark ? "you prefer dark. this page has no dark mode, on purpose: it's a printout" : "you prefer light. so does this page", { "prefers-color-scheme": dark ? "dark" : "light" });
    });
    it("have some battery left", async ({ pass, skip }) => {
      if (!navigator.getBattery) return skip("your browser keeps your battery private. good");
      const b = await navigator.getBattery();
      return pass(`${Math.round(b.level * 100)}%${b.charging ? ", charging" : ""}`, { level: `${Math.round(b.level * 100)}%`, charging: b.charging });
    });
    it("have been here before", ({ pass, pending }) => {
      let m = {}; try { m = JSON.parse(localStorage.getItem("proof.v1") || "{}"); } catch (_) {}
      const visits = (m.visits || 0) + 1; try { localStorage.setItem("proof.v1", JSON.stringify({ visits, last: Date.now(), first: m.first || Date.now() })); } catch (_) {}
      if (visits === 1) return pending("first time. welcome. this one passes next time", { visits: 1 });
      return pass(`visit ${visits}. last time was ${ago(m.last)}`, { visits, "first visit": new Date(m.first).toLocaleDateString() });
    });
  });

  // ------------------------------------------------------------------ 4. the projects
  C.projects.forEach((p, i) => {
    describe(p.title, { title: p.title, sub: `${p.status === "finished" ? "finished" : "in progress"} · ${p.year}${p.tags && p.tags.length ? " · " + p.tags.join(", ") : ""}` }, () => {
      it("exists", ({ pass, pending }) => (p.description ? pass(p.description, { status: p.status, year: p.year, tags: (p.tags || []).join(", ") }) : pending("no description yet. it's being built, not written about", { status: p.status, year: p.year })));
      it("has its code on GitHub", async ({ pass, pending, skip }) => {
        if (!p.repo) return pending("private, for now");
        const r = await gh(`/repos/${p.repo}`);
        if (!r.ok) return skip(ghProblem(r));
        const x = r.json;
        return pass(`github.com/${p.repo}, last push ${ago(x.pushed_at)}`, { description: x.description || "", language: x.language || "", size: `${x.size} KB`, stars: x.stargazers_count, "default branch": x.default_branch, "last push": new Date(x.pushed_at).toLocaleString() });
      }, { id: "has its code on github" });
      it("is live", async ({ pass, pending, fail }) => {
        if (!p.demo) return pending(p.status === "finished" ? "no public URL for this one" : "not launched yet");
        const t0 = performance.now();
        try { await fetch(p.demo, { mode: "no-cors", cache: "no-store" }); return pass(`${p.demo} answered in ${fmtMs(performance.now() - t0)}`, { url: p.demo }); }
        catch (e) { return fail(`${p.demo} didn't answer (${e.message})`); }
      });
      it("is finished", ({ pass, pending }) => (p.status === "finished" ? pass("done. it's the kind of thing you'd stop noticing, which was the point") : pending("in progress. this test is here so you can hold me to it")));
    });
  });

  // ------------------------------------------------------------------ 5. contact
  describe("contact", { title: "Contact", sub: "one test only you can run" }, () => {
    it("replies within a day", ({ pass, pending }) => {
      let m = {}; try { m = JSON.parse(localStorage.getItem("proof.contact") || "{}"); } catch (_) {}
      if (m.replied) return pass(`you said I replied. ${ago(m.sent)} after you wrote`, { sent: new Date(m.sent).toLocaleString(), replied: new Date(m.replied).toLocaleString() });
      if (m.sent) return pending(`you wrote ${ago(m.sent)}. waiting on me. mark it below when I answer`, { sent: new Date(m.sent).toLocaleString() });
      return pending(C.email ? "write to me and start the clock. it's below" : "there's no address on this page yet, so this one can't start. GitHub is below", { email: C.email || "(none yet)", github: `github.com/${C.github}` });
    });
  });
})();
