// The object: one glossy, iridescent mass that breathes, follows the pointer
// and changes shape and colour as you move through the page.
import * as THREE from "./vendor/three.module.min.js";

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERT = /* glsl */ `
uniform float uTime, uAmp, uFreq, uTwist, uPulse;
uniform vec2 uMouse;
varying vec3 vN; varying vec3 vV; varying float vD; varying vec3 vP;
${NOISE}
vec3 twist(vec3 p, float k){ float c=cos(k*p.y), s=sin(k*p.y); return vec3(c*p.x - s*p.z, p.y, s*p.x + c*p.z); }
float field(vec3 p){
  float t = uTime*.18;
  float n = snoise(p*uFreq + vec3(t, t*.7, -t*.5));
  n += .22*snoise(p*uFreq*2.3 - vec3(t*.9, 0., t*1.3));
  // the pointer presses a dent into the surface
  vec3 m = normalize(vec3(uMouse, .9));
  n -= .55*uPulse*smoothstep(.55, 1., dot(normalize(p), m));
  return n;
}
vec3 displace(vec3 p){ vec3 q = twist(p, uTwist); return q + normalize(q) * field(q) * uAmp; }
void main(){
  vec3 p = position;
  vec3 tA = normalize(cross(normal, vec3(0.,1.,.001)));
  vec3 tB = normalize(cross(normal, tA));
  float e = .012;
  vec3 d0 = displace(p), d1 = displace(normalize(p + tA*e)), d2 = displace(normalize(p + tB*e));
  vec3 n = normalize(cross(d1 - d0, d2 - d0));
  if (dot(n, d0) < 0.) n = -n;
  vD = field(twist(p, uTwist));
  vec4 wp = modelMatrix * vec4(d0, 1.);
  vP = wp.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
uniform float uHue, uFilm, uTime, uDark;
varying vec3 vN; varying vec3 vV; varying float vD; varying vec3 vP;
vec3 film(float t){ return .5 + .5*cos(6.28318*(vec3(0., .33, .67) + t)); }
void main(){
  vec3 n = normalize(vN), v = normalize(vV);
  float ndv = clamp(dot(n, v), 0., 1.);
  float fres = pow(1. - ndv, 3.);
  vec3 r = reflect(-v, n);
  // studio: a large overhead softbox, a tall strip on the right, a soft dark floor
  float top = smoothstep(.0, .9, r.y);
  float strip = smoothstep(.75, .97, r.x) * smoothstep(-.3, .6, r.y);
  float strip2 = smoothstep(.8, .98, -r.x) * smoothstep(.1, .7, r.y) * .5;
  float floorB = smoothstep(.05, -.8, r.y);
  vec3 env = vec3(.86, .86, .88) + top*vec3(.16) + (strip + strip2)*vec3(.22) - floorB*vec3(.13, .13, .15);
  // pearl body, thin-film colour that blooms toward the rims
  vec3 iri = film(uHue + fres*1.1 + vD*.18 + r.y*.12);
  float w = uFilm * (.2 + .8*smoothstep(.0, .9, fres + .25*(1.-ndv)));
  vec3 col = mix(env, env * (.55 + .7*iri), w);
  col += iri * fres * .12 * uFilm;
  float spec = pow(max(dot(r, normalize(vec3(.3, .95, .4))), 0.), 90.) + .5*pow(max(dot(r, normalize(vec3(-.7, .35, .6))), 0.), 50.);
  col += spec * .9;
  col *= .9 + .1*smoothstep(-.6, .6, vD);
  // black chrome for the dark section: the studio goes dark, only the rims and glints stay lit
  vec3 dark = vec3(.03, .03, .035) + top*vec3(.05) + (strip + strip2)*vec3(.28) + iri*pow(fres, .8)*.9*uFilm + spec*1.1;
  col = mix(col, dark, uDark);
  gl_FragColor = vec4(col, 1.);
}`;

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 6.2);

  const uniforms = {
    uTime: { value: 0 }, uAmp: { value: 0.28 }, uFreq: { value: 0.9 }, uTwist: { value: 0 },
    uPulse: { value: 0 }, uMouse: { value: new THREE.Vector2() }, uHue: { value: 0.55 },
    uFilm: { value: 0.75 }, uDark: { value: 0 },
  };
  const geo = new THREE.IcosahedronGeometry(1, lite ? 40 : 96);
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // the state the object eases toward; main.js sets it from the scroll position
  const target = { x: 0, y: 0, s: 1, amp: 0.28, freq: 0.9, twist: 0, hue: 0.55, film: 0.75, dark: 0, spin: 1 };
  const cur = { ...target };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, v: 0 };
  let w = 1, h = 1, last = performance.now(), running = true, rotY = 0, rotX = 0, intro = 0;

  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the object a similar size on tall phone screens
    camera.position.z = w / h < 0.8 ? 8.6 : 6.2;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => {
    const nx = (e.clientX / innerWidth) * 2 - 1, ny = -((e.clientY / innerHeight) * 2 - 1);
    mouse.v = Math.min(1, mouse.v + Math.hypot(nx - mouse.tx, ny - mouse.ty) * 2.5);
    mouse.tx = nx; mouse.ty = ny;
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { last = performance.now(); loop(); } });

  const ease = (a, b, k) => a + (b - a) * k;
  function loop() {
    if (!running) return;
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = 1 - Math.pow(0.0025, dt);
    for (const key in target) cur[key] = ease(cur[key], target[key], key === "hue" ? k * 0.6 : k);
    intro = ease(intro, 1, 1 - Math.pow(0.08, dt));
    mouse.x = ease(mouse.x, mouse.tx, 1 - Math.pow(0.002, dt));
    mouse.y = ease(mouse.y, mouse.ty, 1 - Math.pow(0.002, dt));
    mouse.v *= Math.pow(0.15, dt);

    uniforms.uTime.value += dt * (1 + mouse.v * 2.5);
    uniforms.uAmp.value = cur.amp * (0.4 + 0.6 * intro) + mouse.v * 0.06;
    uniforms.uFreq.value = cur.freq;
    uniforms.uTwist.value = cur.twist;
    uniforms.uHue.value = cur.hue;
    uniforms.uFilm.value = cur.film;
    uniforms.uDark.value = cur.dark;
    uniforms.uPulse.value = ease(uniforms.uPulse.value, mouse.v, 0.1);
    uniforms.uMouse.value.set(mouse.x, mouse.y);

    rotY += dt * 0.12 * cur.spin;
    rotX = ease(rotX, mouse.y * 0.35, 0.05);
    mesh.rotation.set(rotX, rotY + mouse.x * 0.5, 0);
    const aspect = w / h, spanX = aspect < 0.8 ? 1.2 : 2.2;
    mesh.position.set(cur.x * spanX * Math.min(aspect, 1.6) + mouse.x * 0.08, cur.y + mouse.y * 0.06, 0);
    mesh.scale.setScalar(cur.s * (0.6 + 0.4 * intro));
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return { target, set(o) { Object.assign(target, o); }, renderer, get fps() { return 0; } };
}
