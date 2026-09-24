#!/usr/bin/env node
// The page's small back end, for the box the site lives on. No dependencies.
//   node server/host-server.js              serve /vitals and /handoff on port 8787
//   node server/host-server.js --once       print vitals JSON once (for a cron that writes assets/vitals.json)
// Point projects.js at it: machine.url = "https://your.box/vitals", handoff.url = "https://your.box/handoff".
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

const PORT = +process.env.PORT || 8787;
const STORE = process.env.HANDOFF_FILE || path.join(__dirname, "handoff.json");
const MAX_MARKS = 200, MAX_NOTE = 80, MAX_PATH = 6000;

function vitals() {
  const mem = os.totalmem(), free = os.freemem();
  let disk = null;
  try { const out = execSync("df -P / | tail -1", { encoding: "utf8" }).trim().split(/\s+/); disk = parseInt(out[4], 10); } catch (_) {}
  let temp = null;
  try { temp = Math.round(parseInt(fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8"), 10) / 1000); } catch (_) {}
  return {
    at: new Date().toISOString(),
    host: os.hostname(),
    uptime_s: Math.round(os.uptime()),
    load1: +os.loadavg()[0].toFixed(2),
    cpus: os.cpus().length,
    mem_used_mb: Math.round((mem - free) / 1048576),
    mem_total_mb: Math.round(mem / 1048576),
    disk_pct: disk,
    temp_c: temp,
    platform: `${os.type()} ${os.release()}`,
  };
}

if (process.argv.includes("--once")) { process.stdout.write(JSON.stringify(vitals(), null, 2) + "\n"); process.exit(0); }

function readMarks() { try { return JSON.parse(fs.readFileSync(STORE, "utf8")); } catch (_) { return { marks: [] }; } }
function writeMarks(m) { fs.writeFileSync(STORE, JSON.stringify(m)); }
const recent = new Map(); // ip -> timestamps, a soft rate limit
function allowed(ip) { const now = Date.now(), arr = (recent.get(ip) || []).filter((t) => now - t < 60000); arr.push(now); recent.set(ip, arr); return arr.length <= 30; }

http.createServer((req, res) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/vitals" && req.method === "GET") { res.writeHead(200, { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }); return res.end(JSON.stringify(vitals())); }
  if (url.pathname === "/handoff" && req.method === "GET") { res.writeHead(200, { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }); return res.end(JSON.stringify(readMarks())); }
  if (url.pathname === "/handoff" && req.method === "POST") {
    const ip = req.socket.remoteAddress || "?";
    if (!allowed(ip)) { res.writeHead(429, cors); return res.end(); }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on("end", () => {
      try {
        const m = JSON.parse(body);
        const mark = { kind: m.kind === "note" ? "note" : "stroke", near: String(m.near || "page").slice(0, 32), r: m.r && { x: +m.r.x, y: +m.r.y, w: +m.r.w, h: +m.r.h }, at: Date.now() };
        if (mark.kind === "note") mark.text = String(m.text || "").slice(0, MAX_NOTE).replace(/[<>]/g, ""); else mark.d = String(m.d || "").slice(0, MAX_PATH);
        if (mark.kind === "note") { mark.x = +m.x; mark.y = +m.y; }
        if (!mark.r || [mark.r.x, mark.r.y, mark.r.w, mark.r.h].some((n) => !isFinite(n))) throw new Error("bad rect");
        const all = readMarks(); all.marks.push(mark); all.marks = all.marks.slice(-MAX_MARKS); writeMarks(all);
        res.writeHead(200, { ...cors, "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: true, count: all.marks.length }));
      } catch (e) { res.writeHead(400, cors); res.end(); }
    });
    return;
  }
  res.writeHead(404, cors); res.end();
}).listen(PORT, () => console.log(`host-server on :${PORT}  (/vitals, /handoff → ${STORE})`));
