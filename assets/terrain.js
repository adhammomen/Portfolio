// Terrain: the live contour-map background (WebGL2) + generative ridgeline art for cards (2D canvas).
(function () {
  const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

  const FRAG = `#version 300 es
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // px, origin bottom-left
uniform float uScroll;  // 0..1 page progress
uniform float uVel;     // smoothed scroll velocity
uniform float uReveal;  // 0..1 intro
uniform vec3  uClick;   // px, px, seconds since click
out vec4 o;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5; mat2 m = mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){ v += a*noise(p); p = m*p; a *= .5; }
  return v;
}
float contour(float n, float w){ float d = abs(fract(n)-.5)/fwidth(n); return 1.-smoothstep(0., w, d); }

void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y;
  vec2 m  = (uMouse       - .5*uRes) / uRes.y;
  float t = uTime*.035;

  // travel across the map as the page scrolls
  vec2 travel = vec2(uScroll*.9, uScroll*2.2);
  vec2 P = uv*1.25 + travel;

  vec2 q = vec2(fbm(P + t), fbm(P - t + 5.2));
  float h = fbm(P + q*1.7 + vec2(t*.6, 0.));

  // the cursor pushes up a peak
  float d = length(uv - m);
  float peak = exp(-d*d*9.);
  h += .32*peak;

  // scroll velocity shears the field
  h += uVel*.015*sin(uv.y*6. + uTime);

  // survey ripple from the last tap
  vec2 c = (uClick.xy - .5*uRes) / uRes.y;
  float age = uClick.z;
  float ring = length(uv - c) - age*.55;
  float ripple = exp(-ring*ring*260.) * exp(-age*1.4) * step(0., age);
  h += ripple*.12;

  float n = h*22.;
  float minor = contour(n, 1.1);
  float major = contour(n/5., 1.4);

  vec3 ink   = vec3(.043,.043,.039);
  vec3 line  = vec3(.93,.92,.89);
  vec3 acid  = vec3(.83,1.,.25);

  float fade = smoothstep(1.35, .1, length(uv*vec2(.8,1.)));      // vignette
  float glow = smoothstep(.55, 0., d);

  vec3 col = ink;
  col += line * minor * .075 * fade;
  col += line * major * .17 * fade;
  col  = mix(col, col + acid*(minor*.55 + major*.9), glow*.85);
  col += acid * peak * .025;
  col += acid * ripple * .6 * fade;

  // snow line: the summit is pale
  float snow = smoothstep(.72, 1., uScroll);
  vec3 snowInk = vec3(.86,.86,.83);
  col = mix(col, mix(snowInk, vec3(.12,.12,.1), minor*.35 + major*.75), snow*.92);

  // intro: contours draw in from the center
  float r = smoothstep(uReveal*2.2, uReveal*2.2 - .4, length(uv));
  col = mix(ink, col, r);

  // grain
  col += (hash(gl_FragCoord.xy + fract(uTime)*100.) - .5) * .035;
  o = vec4(col, 1.);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  // state is a shared object mutated by main.js: { mouse:[x,y], scroll, vel, reveal, paused }
  function startField(canvas, state) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return false;
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) {
      console.warn("Terrain shader failed:", e);
      return false;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ["uRes", "uTime", "uMouse", "uScroll", "uVel", "uReveal", "uClick"].forEach((k) => (U[k] = gl.getUniformLocation(prog, k)));

    let dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    addEventListener("resize", resize);

    const sm = { x: innerWidth / 2, y: innerHeight / 2 };
    const t0 = performance.now();
    function frame(now) {
      sm.x += (state.mouse[0] - sm.x) * 0.08;
      sm.y += (state.mouse[1] - sm.y) * 0.08;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, state.frozen ? 12 : (now - t0) / 1000);
      gl.uniform2f(U.uMouse, sm.x * dpr, (innerHeight - sm.y) * dpr);
      gl.uniform1f(U.uScroll, state.scroll);
      gl.uniform1f(U.uVel, state.vel);
      gl.uniform1f(U.uReveal, state.reveal);
      const cl = state.click || [0, 0, -1e9];
      gl.uniform3f(U.uClick, cl[0] * dpr, (innerHeight - cl[1]) * dpr, cl[2] < 0 ? -1 : (now - cl[2]) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!state.frozen || state.reveal < 1 || (cl[2] > 0 && now - cl[2] < 3000)) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    state.redraw = () => requestAnimationFrame(frame);
    return true;
  }

  // ---------- ridgeline art (Joy Division style), one per project ----------
  function seeded(seed) {
    let s = seed * 9301 + 49297;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  }
  function makeNoise(seed) {
    const rnd = seeded(seed);
    const perm = new Float32Array(512).map(() => rnd());
    const h = (i, j) => perm[(i * 57 + j * 131) & 511];
    return (x, y) => {
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }

  function ridges(canvas, seed, opts = {}) {
    const ctx = canvas.getContext("2d");
    const noise = makeNoise(seed);
    const rnd = seeded(seed + 3);
    const peakX = 0.3 + rnd() * 0.4;
    let w = 0, h = 0, dpr = 1, t = rnd() * 100;
    let hover = 0, hoverTarget = 0, mx = peakX, mxTarget = peakX, visible = false, raf = 0;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      hover += (hoverTarget - hover) * 0.08;
      mx += (mxTarget - mx) * 0.06;
      ctx.fillStyle = "#0e0e0c";
      ctx.fillRect(0, 0, w, h);
      const lines = 34;
      for (let i = 0; i < lines; i++) {
        const k = i / (lines - 1);
        const y0 = h * (0.2 + 0.72 * k);
        ctx.beginPath();
        ctx.moveTo(-2, y0);
        for (let x = 0; x <= w + 4; x += 4) {
          const nx = x / w;
          const env = Math.exp(-Math.pow((nx - mx) * (3.2 - hover), 2) * 3);
          const n = noise(nx * 6 + seed, i * 0.35 + t);
          const n2 = noise(nx * 18 - t, i * 0.6);
          const amp = env * (n * 0.85 + n2 * 0.25) * h * (0.16 + hover * 0.1);
          ctx.lineTo(x, y0 - amp);
        }
        ctx.lineTo(w + 4, h + 4);
        ctx.lineTo(-2, h + 4);
        ctx.closePath();
        ctx.fillStyle = "#0e0e0c";
        ctx.fill();
        const a = 0.25 + 0.6 * k;
        ctx.strokeStyle = hover > 0.02 && i % 5 === 0
          ? `rgba(212,255,63,${0.5 + hover * 0.5})`
          : `rgba(236,235,228,${a * (0.6 + hover * 0.4)})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
      t += opts.frozen ? 0 : 0.004 + hover * 0.006;
      if (visible && !opts.frozen) raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    addEventListener("resize", () => { resize(); draw(); });

    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !opts.frozen) raf = requestAnimationFrame(draw);
    }).observe(canvas);

    return {
      hover(on) { hoverTarget = on ? 1 : 0; },
      point(nx) { mxTarget = Math.min(0.9, Math.max(0.1, nx)); },
      reset() { mxTarget = peakX; },
    };
  }

  window.Terrain = { startField, ridges };
})();
