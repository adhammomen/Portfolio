// Writes the site's HTML pages from assets/js/content.js: /, /work/, /work/<slug>/, /about/, /contact/.
// Every path is relative, so the site works from any base path (GitHub Pages serves it under /Portfolio/).
// Run after editing content: node scripts/gen-pages.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const load = (file, name) => new Function(fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/export const (\w+)/g, 'const $1').replace(/export const|export /g, '') + `\nreturn ${name};`)();
const C = load('assets/js/content.js', 'CONTENT');
const { MARK, slabRects } = load('assets/js/mark.js', '{ MARK, slabRects }');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mark = (cls = '') => `<svg class="mark ${cls}" viewBox="0 0 100 100" aria-hidden="true">${slabRects()}</svg>`;
// the favicon is the same seven floors on a dark tile
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#07090b"/><g transform="translate(5 5) scale(.22)">${MARK.slabs.map((sl) => `<rect x="${sl.x}" y="${sl.y}" width="${sl.w}" height="${sl.h}" rx="${MARK.radius}" fill="${sl.amber ? '#ffb43a' : '#eef1f3'}"/>`).join('')}</g></svg>\n`;
const arrow = '<span class="arr" aria-hidden="true">↗</span>';
const pad = (n) => String(n).padStart(2, '0');
const projectBySlug = Object.fromEntries(C.projects.map((p) => [p.slug, p]));

const picture = (r, slug, n, alt, cls = '', eager = false) =>
  `<picture class="${cls}"><source srcset="${r}assets/img/work/${slug}-${n}.avif" type="image/avif"><img src="${r}assets/img/work/${slug}-${n}.jpg" alt="${esc(alt)}" width="1600" height="900"${eager ? '' : ' loading="lazy"'} decoding="async"></picture>`;
const statusChip = (p) => `<span class="status ${p.status === 'Shipped' ? 'is-shipped' : 'is-progress'}"><i></i>${esc(p.status)}</span>`;
const tagList = (p) => `<ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

function shell({ r, page, title, desc, main }) {
  const nav = [['work/', 'Work', 'work'], ['about/', 'About', 'about']];
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#050607">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<link rel="icon" href="${r}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${r}assets/fonts/archivo-latin-standard-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${r}assets/fonts/ibm-plex-mono-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${r}assets/fonts.css">
<link rel="stylesheet" href="${r}assets/css/site.css">
<script>document.documentElement.className = 'js';</script>
<script src="${r}assets/vendor/gsap.min.js" defer></script>
<script src="${r}assets/vendor/lenis.min.js" defer></script>
<script type="module" src="${r}assets/js/app.js"></script>
</head>
<body data-page="${page}">
<a class="skip" href="#main">Skip to content</a>
<canvas class="canvas-gl" aria-hidden="true"></canvas>

<div class="loader" aria-hidden="true">
  <svg class="loader-lines" viewBox="-60 -40 220 180" preserveAspectRatio="xMidYMid meet"></svg>
  <p class="loader-line mono"><span class="loader-text">${esc(C.tagline)}</span><span class="loader-caret"></span></p>
  <p class="loader-count mono"><span>0</span>%</p>
</div>

<header class="hd">
  <a class="hd-logo" href="${r}" data-link aria-label="${esc(C.name)}, home">${mark('hd-mark')}<span class="hd-name">${esc(C.name)}</span></a>
  <nav class="hd-nav mono" aria-label="Primary">
    ${nav.map(([h, l, k]) => `<a href="${r}${h}" data-link data-nav="${k}">${l}</a>`).join('\n    ')}
    <span class="hd-lab">Lab: ${C.lab.map((l) => `<a href="${r}${l.href}">${esc(l.title)}</a>`).join(', ')}</span>
  </nav>
  <div class="hd-right">
    <button class="hd-sound mono" type="button" data-sound-toggle aria-pressed="false"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="hd-sound-label">Sound</span></button>
    <a class="pill mono" href="${r}contact/" data-link data-nav="contact">Contact</a>
    <button class="hd-menu" type="button" aria-expanded="false" aria-controls="menu" aria-label="Menu"><i></i><i></i></button>
  </div>
</header>

<div class="menu" id="menu" hidden>
  <nav class="menu-nav" aria-label="Menu">
    <a href="${r}" data-link>Home</a>
    <a href="${r}work/" data-link>Work</a>
    <a href="${r}about/" data-link>About</a>
    <a href="${r}contact/" data-link>Contact</a>
  </nav>
  <p class="menu-lab mono">Lab: ${C.lab.map((l) => `<a href="${r}${l.href}">${esc(l.title)}</a>`).join(' · ')}</p>
</div>

<nav class="ruler mono" aria-label="Sections">
  <ol>
    <li data-to="hero"><button type="button">Top</button></li>
    <li data-to="work"><button type="button">Work</button></li>
    <li data-to="statement"><button type="button">Statement</button></li>
    <li data-to="signal"><button type="button">Signal</button></li>
    <li data-to="capabilities"><button type="button">Capabilities</button></li>
    <li data-to="flagship"><button type="button">Ordium</button></li>
  </ol>
</nav>

<aside class="dev mono" aria-label="Developer panel">
  <div class="dev-head"><span>Mark.quaternion</span><button type="button" class="dev-fold" aria-expanded="true" aria-label="Fold panel">–</button></div>
  <div class="dev-body">
    <p class="dev-q"><span>0.00</span><span>0.00</span><span>0.00</span><span>1.00</span></p>
    <canvas class="dev-gizmo" width="160" height="160" aria-label="Drag to rotate the mark"></canvas>
    <label class="dev-row">frost<input type="range" min="0" max="1" step="0.01" value="0.18" data-dev="frost"></label>
    <label class="dev-row">dispersion<input type="range" min="0" max="10" step="0.1" value="5" data-dev="dispersion"></label>
    <button type="button" class="dev-reset">Reset quaternion</button>
  </div>
</aside>

<main id="main" data-page="${page}" data-title="${esc(title)}">
${main}
</main>

<footer class="ft">
  <div class="ft-top">
    <div class="ft-cols mono">
      <ul><li><a href="${r}" data-link>Top</a></li><li><a href="${r}work/" data-link>Work</a></li><li><a href="${r}about/" data-link>About</a></li><li><a href="${r}contact/" data-link>Contact</a></li></ul>
      <ul>${C.lab.map((l) => `<li><a href="${r}${l.href}">${esc(l.title)}</a></li>`).join('')}</ul>
      <ul><li><a href="${C.github}" rel="noopener">GitHub ${arrow}</a></li><li><a href="mailto:${C.email}">Email ${arrow}</a></li></ul>
    </div>
    <a class="ft-cta" href="${r}contact/" data-link><span class="ring" aria-hidden="true">↗</span><span class="mono">Contact</span></a>
  </div>
  <div class="ft-word" aria-hidden="true">${mark('ft-mark')}<span>DHAM MOMEN</span></div>
  <div class="ft-bottom mono"><span>© ${C.year} ${esc(C.name)}</span><span>Built by hand: three.js, GSAP, Lenis. Sound and video generated for this site.</span></div>
</footer>

<div class="soundbar mono" hidden>
  <p><span class="soundbar-tag">▲ sound</span><span>This site has sound. Turn it on?</span></p>
  <div class="soundbar-actions"><button type="button" class="pill" data-sound="on">Sound on</button><button type="button" class="link" data-sound="off">Continue without</button></div>
</div>
</body>
</html>
`;
}

// ---------- home ----------
function home() {
  const r = '';
  const flag = projectBySlug[C.flagship];
  const work = C.projects.map((p, i) => `
      <article class="wk-item" data-index="${i}">
        <p class="wk-meta"><span class="code">${p.year}</span>${statusChip(p)}<span class="code wk-count">${pad(i + 1)} / ${pad(C.projects.length)}</span></p>
        <h3 class="wk-title" data-split><a href="${r}work/${p.slug}/" data-link>${esc(p.title)}</a></h3>
        <p class="wk-line">${esc(p.line)}</p>
        <p class="wk-kind code">${esc(p.kind)}</p>
        ${picture(r, p.slug, 1, `${p.title}, ${p.kind}`, 'wk-pic')}
      </article>`).join('');
  const caps = C.capabilities.map((c, i) => `
      <article class="cap-item" data-index="${i}">
        <p class="cap-count code">${pad(i + 1)} / ${pad(C.capabilities.length)}</p>
        <h3 class="cap-title" data-split>${esc(c.title)}</h3>
        <p class="cap-text">${esc(c.text)}</p>
        <ul class="cap-list mono">${c.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <video class="cap-video" data-cap="${c.key}" muted loop playsinline preload="metadata" poster="${r}assets/video/${c.video}.jpg" aria-label="${esc(c.title)}, an abstract loop">
          <source src="${r}assets/video/${c.video}.webm" type="video/webm"><source src="${r}assets/video/${c.video}.mp4" type="video/mp4">
        </video>
      </article>`).join('');
  const main = `
  <section class="sec sec-hero" data-sec="hero" data-len="1.5">
    <div class="pin">
      <div class="hero-copy">
        <p class="eyebrow mono">${esc(C.role)} · ${esc(C.location)}</p>
        <h1 class="hero-title" data-split><span class="ln">Systems,</span> <span class="ln">made tangible.</span></h1>
        <p class="hero-intro">${esc(C.intro)}</p>
      </div>
      <p class="hero-cue mono"><span>Scroll to explore</span><i aria-hidden="true"></i></p>
    </div>
  </section>

  <section class="sec sec-workintro" data-sec="workintro" data-len="1.2">
    <div class="pin"><p class="wi-label mono"><span>Selected work</span><span>${pad(C.projects.length)} projects · ${C.year}</span></p></div>
  </section>

  <section class="sec sec-work" data-sec="work" data-len="${C.projects.length + 0.6}" aria-label="Work">
    <div class="pin">
      <h2 class="vh">Work</h2>
      <div class="wk-list">${work}
      </div>
      <a class="wk-all mono" href="${r}work/" data-link>All work ${arrow}</a>
    </div>
  </section>

  <section class="sec sec-workout" data-sec="workout" data-len="1.3"><div class="pin"></div></section>

  <section class="sec sec-statement" data-sec="statement" data-len="2.2">
    <div class="pin">
      <div class="st-copy">
        <p class="eyebrow mono">Statement</p>
        <h2 class="hl">${C.statement.map((l) => `<span class="hl-line"><span>${esc(l)}</span></span>`).join('')}</h2>
        <p class="st-sub">${esc(C.statementSub)}</p>
      </div>
    </div>
  </section>

  <section class="sec sec-signal" data-sec="signal" data-len="2.2">
    <div class="pin">
      <p class="sg-word" aria-hidden="true">SIGNAL</p>
      <div class="sg-copy">
        <h2 class="hl hl-right">${C.signal.map((l) => `<span class="hl-line"><span>${esc(l)}</span></span>`).join('')}</h2>
        <p class="st-sub">${esc(C.signalSub)}</p>
      </div>
    </div>
  </section>

  <section class="sec sec-signalout" data-sec="signalout" data-len="1.2"><div class="pin"></div></section>

  <section class="sec sec-caps" data-sec="capabilities" data-len="${C.capabilities.length + 0.8}" aria-label="Capabilities">
    <div class="pin">
      <h2 class="eyebrow mono cap-head">Capabilities</h2>
      <div class="cap-list-wrap">${caps}
      </div>
    </div>
  </section>

  <section class="sec sec-flag" data-sec="flagship" data-len="1.6">
    <div class="pin">
      <div class="fl-frame">
        <span class="fl-x tl"></span><span class="fl-x tr"></span><span class="fl-x bl"></span><span class="fl-x br"></span>
        <p class="eyebrow mono">Flagship · ${statusChip(flag)}</p>
        <h2 class="fl-title" data-split>${esc(flag.title)}</h2>
        <p class="fl-text">${esc(flag.summary)}</p>
        <dl class="fl-spec mono"><div><dt>Kind</dt><dd>${esc(flag.kind)}</dd></div><div><dt>Year</dt><dd>${flag.year}</dd></div><div><dt>Runs on</dt><dd>A server I keep alive myself</dd></div></dl>
        <a class="fl-link mono" href="${r}work/${flag.slug}/" data-link><span class="ring" aria-hidden="true">↗</span>About Ordium</a>
      </div>
    </div>
  </section>

  <section class="sec sec-outro" data-sec="outro" data-len="1.7">
    <div class="pin">
      <p class="ot-word" aria-label="${esc(C.name)}">${mark('ot-mark')}<span class="ot-rest" data-split>DHAM MOMEN</span></p>
      <p class="ot-line">${esc(C.tagline)} <a href="${r}contact/" data-link class="ot-cta">Write to me ${arrow}</a></p>
    </div>
  </section>`;
  return { file: 'index.html', html: shell({ r, page: 'home', title: `${C.name}: ${C.role}`, desc: C.intro, main }) };
}

// ---------- work index ----------
function workIndex() {
  const r = '../';
  const tags = ['All', ...new Set(C.projects.flatMap((p) => p.tags))];
  const count = (t) => (t === 'All' ? C.projects.length : C.projects.filter((p) => p.tags.includes(t)).length);
  const main = `
  <section class="pg">
    <header class="pg-head">
      <p class="eyebrow mono">Index · ${pad(C.projects.length)} projects</p>
      <h1 class="pg-title" data-split>Work</h1>
    </header>
    <div class="wx">
      <aside class="wx-filters mono" aria-label="Filter projects">
        ${tags.map((t, i) => `<button type="button" data-filter="${esc(t)}" aria-pressed="${i === 0}">${esc(t)}<sup>${count(t)}</sup></button>`).join('\n        ')}
      </aside>
      <ul class="wx-grid">
        ${C.projects.map((p) => `<li class="wx-card" data-tags="${esc(p.tags.join('|'))}">
          <a href="${r}work/${p.slug}/" data-link>
            ${picture(r, p.slug, 1, `${p.title}, ${p.kind}`, 'wx-pic')}
            <p class="wx-meta"><span class="code">${p.year}</span>${statusChip(p)}</p>
            <h2 class="wx-title">${esc(p.title)}</h2>
            <p class="wx-kind code">${esc(p.kind)}</p>
          </a>
        </li>`).join('\n        ')}
      </ul>
    </div>
  </section>`;
  return { file: 'work/index.html', html: shell({ r, page: 'work', title: `Work · ${C.name}`, desc: `Projects by ${C.name}: ${C.projects.map((p) => p.title).join(', ')}.`, main }) };
}

// ---------- work detail ----------
function workDetail(p, i) {
  const r = '../../';
  const next = C.projects[(i + 1) % C.projects.length];
  const links = p.links.map((l) => `<a class="dt-link" href="${l.local ? r + l.href : l.href}"${l.local ? '' : ' rel="noopener"'}><span class="ring" aria-hidden="true">↗</span>${esc(l.label)}</a>`).join('');
  const imgs = Array.from({ length: p.images }, (_, k) => `<figure class="dt-fig">${picture(r, p.slug, k + 1, `${p.title}, image ${k + 1}`, '', k === 0)}</figure>`).join('\n      ');
  const main = `
  <article class="pg dt">
    <p class="dt-ghost" aria-hidden="true">${esc(p.title)}</p>
    <header class="dt-head">
      <a class="dt-back mono" href="${r}work/" data-link>← Work</a>
      <h1 class="dt-title" data-split>${esc(p.title)}</h1>
      <p class="dt-lead">${esc(p.summary)}</p>
      <dl class="dt-spec mono">
        <div><dt>Year</dt><dd>${p.year}</dd></div>
        <div><dt>Kind</dt><dd>${esc(p.kind)}</dd></div>
        <div><dt>Status</dt><dd>${statusChip(p)}</dd></div>
      </dl>
      ${links ? `<p class="dt-links mono">${links}</p>` : ''}
    </header>
    <div class="dt-body">
      ${imgs.split('\n      ')[0]}
      <div class="dt-text">${p.body.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
      ${imgs.split('\n      ').slice(1).join('\n      ')}
    </div>
    <a class="dt-next" href="${r}work/${next.slug}/" data-link><span class="mono">Next project</span><span class="dt-next-title">${esc(next.title)} →</span></a>
  </article>`;
  return { file: `work/${p.slug}/index.html`, html: shell({ r, page: 'detail', title: `${p.title} · ${C.name}`, desc: p.summary, main }) };
}

// ---------- about ----------
function about() {
  const r = '../';
  const now = C.projects.filter((p) => p.status !== 'Shipped');
  const main = `
  <section class="pg ab">
    <header class="pg-head">
      <p class="eyebrow mono">About</p>
      <h1 class="pg-title" data-split>About</h1>
    </header>
    <div class="ab-grid">
      <p class="ab-label mono">Who</p>
      <div class="ab-lead"><p>${esc(C.name)}, ${esc(C.role.toLowerCase())}. ${esc(C.intro)}</p><p class="ab-quiet">${esc(C.signal.join(' '))}</p></div>

      <p class="ab-label mono">What I do</p>
      <div class="ab-caps">${C.capabilities.map((c) => `<div><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p><ul class="mono">${c.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>

      <p class="ab-label mono">Now</p>
      <ul class="ab-now">${now.map((p) => `<li><a href="${r}work/${p.slug}/" data-link><span class="ab-now-t">${esc(p.title)}</span><span class="code">${esc(p.kind)}</span>${statusChip(p)}</a></li>`).join('')}</ul>

      <p class="ab-label mono">This site</p>
      <div class="ab-colophon"><p>Hand-built with three.js, GSAP and Lenis, no framework. The glass mark is extruded from an SVG in the browser and lit by an environment that is generated, not photographed. The three capability videos are rendered from shaders, and the sound is synthesized by a script in the repository.</p><p>Type: Archivo, IBM Plex Sans, IBM Plex Mono, Google Sans Code and Libre Caslon Display, all under the Open Font License.</p></div>
    </div>
  </section>`;
  return { file: 'about/index.html', html: shell({ r, page: 'about', title: `About · ${C.name}`, desc: C.intro, main }) };
}

// ---------- contact ----------
function contact() {
  const r = '../';
  const main = `
  <section class="pg ct">
    <header class="pg-head">
      <p class="eyebrow mono">Contact</p>
      <h1 class="pg-title" data-split>Contact</h1>
    </header>
    <p class="ct-lead">For projects, collaborations, or a hello. I read everything.</p>
    <ul class="ct-rows">
      <li><a class="ct-row" href="mailto:${C.email}"><span class="ct-k mono">Email</span><span class="ct-v">${esc(C.email)}</span><span class="ring" aria-hidden="true">↗</span></a><button type="button" class="ct-copy mono" data-copy="${esc(C.email)}">Copy</button></li>
      <li><a class="ct-row" href="${C.github}" rel="noopener"><span class="ct-k mono">GitHub</span><span class="ct-v">${esc(C.github.replace('https://', ''))}</span><span class="ring" aria-hidden="true">↗</span></a></li>
    </ul>
  </section>`;
  return { file: 'contact/index.html', html: shell({ r, page: 'contact', title: `Contact · ${C.name}`, desc: `Write to ${C.name}.`, main }) };
}

const pages = [home(), workIndex(), ...C.projects.map(workDetail), about(), contact()];
fs.writeFileSync(path.join(ROOT, 'assets/favicon.svg'), favicon);
for (const p of pages) {
  const out = path.join(ROOT, p.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, p.html);
}
console.log(`gen-pages: ${pages.length} pages → ${pages.map((p) => p.file).join(', ')}`);
