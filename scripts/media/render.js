// Renders the shader loops and stills in scripts/media/shaders.html to numbered JPEG frames with headless Chromium.
// node scripts/media/render.js <shader> <frames> <outdir>   (W/H env set the size; 240 frames = an 8 s loop at 30 fps)
// Videos: ffmpeg -framerate 30 -i f%04d.jpg -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart x.mp4 (and libvpx-vp9 -crf 38 for .webm)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [, , name, frames, out] = process.argv;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +(process.env.W||1280), height: +(process.env.H||720) } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('file://' + path.join(__dirname, 'shaders.html'));
  await p.evaluate(([n,w,h]) => { window.W=w; window.H=h; const c=document.getElementById('c'); c.width=w; c.height=h; return window.use(n); }, [name, +(process.env.W||1280), +(process.env.H||720)]);
  const N = +frames;
  for (let i = 0; i < N; i++) {
    const data = await p.evaluate((u) => window.frame(u), i / N);
    fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
  }
  await b.close(); console.log('done', name, N);
})().catch((e) => { console.error(e); process.exit(1); });
