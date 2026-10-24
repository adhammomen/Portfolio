// The one canvas behind every page. Two scenes (dark world, light passage) render into textures; a small post chain
// mixes them with a curtain wipe and a noise dissolve, bends everything with a pointer-driven flow field, adds bloom,
// then draws the crosshair grid, grain and tone mapping on the way to the screen.
import * as THREE from '../vendor/three.module.min.js';
import { MARK } from './mark.js';
import { CONTENT } from './content.js';

const asset = (p) => new URL('../' + p, import.meta.url).href;
const AMBER = new THREE.Color('#ffb43a');
const PAPER = new THREE.Color('#e6e3dc');
const INK = new THREE.Color('#0c0e10');

// mark units (0..100) -> world units at scale 1 (the whole mark is 2 units tall)
const MU = 1 / 50;
const BEVEL = 0.035, DEPTH = 0.34, BEVEL_T = 0.06;
// out in its floor a slab morphs into a pane: same outline, but a thin edge and a small bevel at any size (CSS px)
const PANE = { bevel: 9, bevelT: 6, depth: 16, radius: 22 };

// ---------- the state the director animates ----------
// the group is the A as one object: its box on screen (centre in CSS px, px per mark unit), how far its floors are
// pushed apart, and how much it sways. Each slab is either in the group or out on its own (see setSlab).
export const DEFAULTS = {
  camZ: 7,
  gx: 0, gy: 0, gu: 4, gz: 0, spread: 1,
  mrx: 0, mry: 0, spin: 1, frost: 0.14,
  wall: 1, curtain: 0, dissolve: 0, sub: 0, grid: 1, flat: 0, signal: 0,
};
const SLAB_DEFAULT = { g: 1, x: 0, y: 0, h: 10, z: 0, develop: 0, hover: 0, hide: 0, frost: -1, dx: 0, dy: 0, rot: 0 };

const FS_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const NOISE = /* glsl */`
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }`;

function fsTriangle() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  return g;
}

class Pass {
  constructor(fragmentShader, uniforms) {
    this.material = new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    this.mesh = new THREE.Mesh(fsTriangle(), this.material);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.mesh);
    this.u = uniforms;
  }
  render(renderer, camera, target) { renderer.setRenderTarget(target); renderer.render(this.scene, camera); }
}

const rt = (w, h, opts = {}) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...opts });

// ---------- environment: a generated studio, no photographs ----------
function makeEnvironment(renderer) {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vD; void main(){ float y = vD.y;
      vec3 c = mix(vec3(.03,.035,.05), vec3(.22,.24,.3), smoothstep(-.25,.1,y)) * (1. - .6*smoothstep(.15,.9,y));
      c += vec3(.12,.14,.2)*exp(-abs(y)*7.);
      gl_FragColor = vec4(c, 1.); }`,
  }));
  scene.add(sky);
  const panel = (w, h, color, k, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); scene.add(m);
  };
  panel(30, 5, '#ffffff', 7, [-8, 14, 6], [0, 0, 0]);      // overhead strip
  panel(5, 26, '#dfe9ff', 5, [18, 2, -4], [0, 0, 0]);      // tall right softbox
  panel(4, 18, '#ffffff', 4, [-18, 0, -8], [0, 0, 0]);     // left rim
  panel(16, 3, '#b8c8ff', 2.5, [0, -6, -20], [0, 0, 0]);
  panel(60, 60, '#dfe4ea', 0.32, [0, 0, 24], [0, 0, 0]);   // soft, even front fill: camera-facing faces never go black, and flat panes show no hard reflection
  panel(4, 1.4, '#ffb43a', 6.0, [9, -5, 10], [0, 0, 0]);     // the amber status light, caught in the edges
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose(); scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return env;
}

// ---------- mark geometry: one rounded slab per floor, centred on itself ----------
// inset = bevel, so the bevelled slab's outer silhouette is exactly the slab in mark.js
function slabShape(w, h, inset = 0, radius = MARK.radius * MU) {
  const x0 = -w / 2 + inset, x1 = w / 2 - inset, y0 = -h / 2 + inset, y1 = h / 2 - inset;
  const r = Math.max(0.004, Math.min(radius - inset, (x1 - x0) / 2, (y1 - y0) / 2));
  const sh = new THREE.Shape();
  sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r);
  sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1);
  sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r);
  sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  return sh;
}

// a little noise texture for the frosted variation in the glass
function noiseTexture() {
  const s = 128, data = new Uint8Array(s * s * 4);
  for (let i = 0; i < s * s; i++) { const v = 150 + Math.random() * 105; data.set([v, v, v, 255], i * 4); }
  const t = new THREE.DataTexture(data, s, s); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.needsUpdate = true;
  return t;
}

function loadImage(src) {
  return new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}

// what a slab shows inside its glass: an image, or three videos side by side. It develops out of line art.
const CONTENT_FRAG = NOISE + /* glsl */`
  uniform sampler2D uA, uB, uC; uniform float uMode, uDev, uPlaneA, uTexA, uHover; uniform vec2 uHalf; uniform float uRad;
  varying vec2 vUv;
  vec2 cover(vec2 uv, float pa, float ta){ vec2 s = pa > ta ? vec2(1., ta/pa) : vec2(pa/ta, 1.); return (uv - .5)*s + .5; }
  vec3 pick(float i, vec2 uv){ return i < .5 ? texture2D(uA, uv).rgb : (i < 1.5 ? texture2D(uB, uv).rgb : texture2D(uC, uv).rgb); }
  void main(){
    vec2 p = (vUv - .5)*2.*uHalf; vec2 q = abs(p) - uHalf + uRad;
    if (length(max(q, 0.)) - uRad > 0.) discard;
    vec3 c; float frame = 1.;
    if (uMode < .5) { c = texture2D(uA, cover(vUv, uPlaneA, uTexA)).rgb; }
    else {
      float x = vUv.x*3.; float i = floor(min(x, 2.999)); vec2 l = vec2(fract(x), vUv.y);
      float gx = .012*uPlaneA;
      frame = step(gx, l.x)*step(l.x, 1. - gx);
      c = pick(i, cover(vec2((l.x - gx)/(1. - 2.*gx), l.y), uPlaneA/3., uTexA))*frame;
    }
    float lum = dot(c, vec3(.3, .55, .15));
    float e = clamp(fwidth(lum)*7., 0., 1.);
    float n = noise(vUv*vec2(uPlaneA, 1.)*3.5)*.72 + noise(vUv*vec2(uPlaneA, 1.)*28.)*.28;
    float th = uDev*1.3 - .15;
    float k = smoothstep(n - .07, n + .07, th);
    vec3 line = vec3(.5, .7, 1.)*e*smoothstep(0., .3, uDev)*1.5 + vec3(.008, .01, .014);
    vec3 col = mix(line, c*(1.04 + .12*uHover), k);
    col += exp(-pow((n - th)*18., 2.))*vec3(1., .78, .45)*.7*step(.01, uDev)*step(uDev, .99);
    gl_FragColor = vec4(col, 1.);
  }`;
const CONTENT_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`;

export class GL {
  constructor(canvas, { mobile = false } = {}) {
    this.canvas = canvas; this.mobile = mobile;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
    renderer.setClearColor(0x050607, 1);
    this.renderer = renderer;
    const forced = +new URLSearchParams(location.search).get('dpr');   // ?dpr=0.5 renders lighter, for slow machines and testing
    this.dpr = forced > 0 ? forced : Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    renderer.setPixelRatio(this.dpr);
    this.isWebGL2 = renderer.capabilities.isWebGL2;

    this.state = { ...DEFAULTS };
    this.target = { ...DEFAULTS };
    this.instant = true;           // first frame jumps to target
    this.time = 0; this.reveal = 0; this.fade = 1;
    this.userQ = new THREE.Quaternion();
    this.groupQ = new THREE.Quaternion();
    this.velocity = 0;              // scroll velocity, fed by the app
    this.pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false };

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 0, 7);
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.dark = new THREE.Scene();
    this.light = new THREE.Scene();
    this.light.background = PAPER.clone();

    this.env = makeEnvironment(renderer);
    this.dark.environment = this.env;

    this.buildBackground();
    this.buildMark();
    this.buildWall();
    this.buildShatter();
    this.buildPost();

    this.resize();
    this.ready = this.load();
  }

  // ---------- builders ----------
  buildBackground() {
    this.bgU = { uSub: { value: 0 }, uTime: { value: 0 } };
    const bg = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: this.bgU,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float uSub, uTime; varying vec3 vD;
        void main(){ float y = vD.y*.5+.5;
          vec3 home = vec3(.0016,.0019,.0024) + vec3(.003,.004,.006)*smoothstep(.2,.6,y);
          vec3 sub = mix(vec3(.010,.016,.026), vec3(.0012,.0016,.0024), smoothstep(.25,.85,y));
          sub += vec3(.03,.02,.006)*exp(-pow(length(vD.xy - vec2(.55,-.45))*2.2,2.));
          sub += vec3(.006,.014,.02)*exp(-pow(length(vD.xy - vec2(-.6,.3))*1.8,2.));
          gl_FragColor = vec4(mix(home, sub, uSub), 1.); }`,
    }));
    bg.renderOrder = -10;
    this.dark.add(bg);
  }

  buildMark() {
    this.frostMap = noiseTexture();
    this.glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.14, roughnessMap: this.frostMap,
      transmission: 1, thickness: 0.9, ior: 1.46, dispersion: 5,
      iridescence: 1, iridescenceIOR: 1.28, iridescenceThicknessRange: [140, 520],
      clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1, envMapIntensity: 1.7,
      attenuationColor: new THREE.Color('#d9e6ff'), attenuationDistance: 3, transparent: true,
    });
    this.barGlass = new THREE.MeshPhysicalMaterial({
      color: AMBER, metalness: 0, roughness: 0.08, transmission: 0.92, thickness: 0.6, ior: 1.45, dispersion: 3,
      iridescence: 0.4, iridescenceIOR: 1.3, attenuationColor: AMBER, attenuationDistance: 0.6,
      emissive: AMBER, emissiveIntensity: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6, transparent: true,
    });

    // each floor is its own glass slab with its own material, so one can be clear while the others are frosted
    this.ex = { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL_T, bevelSize: BEVEL, bevelSegments: 5, curveSegments: 6 };
    this.outlineMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.7 });
    this.outlineBarMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#c27a10'), transparent: true, opacity: 0.9 });
    this.slabs = MARK.slabs.map((sl) => {
      const w = sl.w * MU, h = sl.h * MU;
      const g = this.slabGeometry(w, h, 1);
      const mat = (sl.amber ? this.barGlass : this.glass).clone();
      const mesh = new THREE.Mesh(g, mat);
      mesh.morphTargetInfluences = [0];
      this.dark.add(mesh);
      const flat = new THREE.ExtrudeGeometry(slabShape(w, h), { depth: DEPTH, bevelEnabled: false, curveSegments: 6 }); flat.translate(0, 0, -DEPTH / 2);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(flat, 20), sl.amber ? this.outlineBarMat : this.outlineMat);
      this.light.add(edges);
      return {
        i: sl.i, floor: sl.floor, amber: sl.amber, w, h, mesh, edges, mat, content: null,
        home: { x: sl.x + sl.w / 2, y: sl.y + sl.h / 2, h: sl.h },
        t: { ...SLAB_DEFAULT }, hover: 0, pane: 1,
      };
    });
    this.assemble = 1;   // 0 → 1 stacks the floors into place, bottom first (played after the loader)
  }

  // the slab as built for the A, with the pane it becomes as a morph target. pane = the scale it will be shown at
  slabGeometry(w, h, pane, px = 1) {
    const g = new THREE.ExtrudeGeometry(slabShape(w, h, BEVEL), this.ex); g.translate(0, 0, -DEPTH / 2);
    const k = px / pane;                                     // CSS px → this slab's own units at that scale
    const pg = pane > 1
      ? new THREE.ExtrudeGeometry(slabShape(w, h, PANE.bevel * k, PANE.radius * k), { ...this.ex, depth: PANE.depth * k, bevelThickness: PANE.bevelT * k, bevelSize: PANE.bevel * k })
      : g.clone();
    if (pane > 1) pg.translate(0, 0, -PANE.depth * k / 2);
    g.morphAttributes.position = [pg.attributes.position];
    g.morphAttributes.normal = [pg.attributes.normal];
    return g;
  }

  // called after layout with each slab's height on its floor (CSS px)
  setPanes(heights) {
    const px = this.pxWorld();
    for (const sl of this.slabs) {
      const hp = heights[sl.i]; if (!hp) continue;
      const pane = (hp * px) / sl.h;
      if (Math.abs(pane - sl.pane) < 0.01) continue;
      const old = sl.mesh.geometry;
      sl.mesh.geometry = this.slabGeometry(sl.w, sl.h, pane, px);
      old.dispose();
      sl.pane = pane;
      if (sl.content) this.sizeContent(sl);
    }
  }

  pxWorld() { return 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z / this.h; }

  // the screen fills the pane's flat face
  sizeContent(sl) {
    const k = this.pxWorld() / sl.pane;
    const b = sl.pane > 1 ? PANE.bevel * k : BEVEL;
    const inner = { w: sl.w - 2 * b, h: sl.h - 2 * b };
    const c = sl.content;
    c.mesh.geometry.dispose();
    c.mesh.geometry = new THREE.PlaneGeometry(inner.w, inner.h);
    c.u.uPlaneA.value = inner.w / inner.h; c.u.uHalf.value.set(inner.w / 2, inner.h / 2);
    c.u.uRad.value = sl.pane > 1 ? Math.max(0.002, (PANE.radius - PANE.bevel) * k) : 0.01;
  }

  // a screen inside a slab: sits at the slab's middle, so the glass refracts its edges
  setContent(i, src) {
    const sl = this.slabs[i]; if (!sl) return;
    if (!sl.content) {
      const inner = { w: sl.w - 2 * BEVEL, h: sl.h - 2 * BEVEL };
      const u = { uA: { value: null }, uB: { value: null }, uC: { value: null }, uMode: { value: 0 }, uDev: { value: 0 }, uHover: { value: 0 },
        uPlaneA: { value: inner.w / inner.h }, uTexA: { value: 16 / 9 }, uHalf: { value: new THREE.Vector2(inner.w / 2, inner.h / 2) }, uRad: { value: 0.01 } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(inner.w, inner.h), new THREE.ShaderMaterial({ uniforms: u, vertexShader: CONTENT_VERT, fragmentShader: CONTENT_FRAG }));
      m.visible = false; sl.mesh.add(m); sl.content = { mesh: m, u };
      this.sizeContent(sl);
    }
    const u = sl.content.u;
    if (src.videos) {
      const keys = ['uA', 'uB', 'uC'];
      src.videos.slice(0, 3).forEach((v, k) => { const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; u[keys[k]].value = t; });
      u.uMode.value = 1;
    } else if (src.texture) { u.uA.value = src.texture; u.uMode.value = 0; }
  }

  // the director sets every slab each frame: g = 1 keeps it in the A; g = 0 puts it at (x, y) with height h, in CSS px
  setSlab(i, t) { Object.assign(this.slabs[i].t, t); }
  resetSlabs() { for (const sl of this.slabs) Object.assign(sl.t, SLAB_DEFAULT); }

  buildWall() {
    this.wallU = { uAtlas: { value: null }, uTime: { value: 0 }, uAmt: { value: 1 }, uSlots: { value: 8 } };
    const geo = new THREE.CylinderGeometry(8.5, 8.5, 10, 96, 1, true, Math.PI - 1.45, 2.9);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, uniforms: this.wallU,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: NOISE + `
        uniform sampler2D uAtlas; uniform float uTime, uAmt, uSlots; varying vec2 vUv;
        void main(){
          vec2 grid = vec2(20., 7.);
          vec2 g = vec2(1.-vUv.x, vUv.y)*grid; vec2 id = floor(g); vec2 f = fract(g);
          float gap = step(.05,f.x)*step(f.x,.95)*step(.07,f.y)*step(f.y,.93);
          float h = hash(id);
          float slot = floor(fract(h*7.13 + floor(uTime*.05 + h*9.)*.618) * uSlots);
          vec2 cell = vec2(mod(slot, 4.), floor(slot/4.));
          vec2 fu = (f - vec2(.05,.07))/vec2(.9,.86);
          vec3 tex = texture2D(uAtlas, (cell + vec2(fu.x, 1.-fu.y))/vec2(4., 2.)).rgb;
          float on = step(.16, hash(id+7.3));
          float lum = (.1 + .32*hash(id+3.1)) * on;
          tex = mix(vec3(dot(tex, vec3(.3,.55,.15))), tex, .65) * vec3(.72,.8,1.);   // cool and desaturate so the wall stays a backdrop
          float scan = .9 + .1*sin(f.y*220. + uTime*2.);
          float flick = .9 + .1*noise(vec2(uTime*3., h*50.));
          vec3 c = tex*lum*scan*flick*gap;
          c += (1.-gap)*vec3(.004,.005,.006);
          c *= smoothstep(0.,.3,vUv.y)*smoothstep(1.,.7,vUv.y);
          gl_FragColor = vec4(c*uAmt, 1.);
        }`,
    });
    this.wall = new THREE.Mesh(geo, mat);
    this.wall.position.set(0, 0.3, 2.5);
    this.dark.add(this.wall);
  }

  // ---------- shatter: a pane breaks into pieces that fly into a rect on the next page ----------
  // each piece carries its part of the picture; t: 0 → .4 bursts toward the camera, .4 → 1 lands on the target
  buildShatter() {
    const NX = 10, NY = 6;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = box.index; geo.attributes.position = box.attributes.position; geo.attributes.normal = box.attributes.normal; geo.attributes.uv = box.attributes.uv;
    const cell = [], rnd = [];
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) { cell.push(x, y); rnd.push(Math.random(), Math.random(), Math.random(), Math.random()); }
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(cell), 2));
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(new Float32Array(rnd), 4));
    geo.instanceCount = NX * NY;
    const u = this.shU = { uTex: { value: null }, uFrom: { value: new THREE.Vector4() }, uTo: { value: new THREE.Vector4() }, uT: { value: 0 }, uGrid: { value: new THREE.Vector2(NX, NY) }, uDepth: { value: 0.05 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: /* glsl */`
        attribute vec2 aCell; attribute vec4 aRand;
        uniform vec4 uFrom, uTo; uniform float uT, uDepth; uniform vec2 uGrid;
        varying vec2 vUv, vLocal; varying vec3 vN; varying float vFront, vLift;
        mat3 rot(vec3 a){ float cx=cos(a.x), sx=sin(a.x), cy=cos(a.y), sy=sin(a.y), cz=cos(a.z), sz=sin(a.z);
          return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy); }
        void main(){
          vec2 c = (aCell + .5)/uGrid;
          float t = clamp((uT - aRand.x*.18)/.82, 0., 1.);
          float land = smoothstep(.32, 1., t);
          float lift = sin(3.14159*min(t*1.15, 1.));
          vec3 a = vec3(uFrom.xy + (c - .5)*uFrom.zw, 0.);
          vec3 b = vec3(uTo.xy + (c - .5)*uTo.zw, 0.);
          vec3 scatter = vec3((c - .5)*vec2(2.6, 1.8) + (aRand.yz - .5)*1.6, .9 + aRand.w*1.6);
          vec3 p = mix(a, b, land) + scatter*lift;
          vec2 size = mix(uFrom.zw, uTo.zw, land)/uGrid*(1. - .08*lift);
          vec3 ang = (aRand.yzw - .5)*vec3(5., 5., 3.)*lift;
          vec3 lp = position*vec3(size, uDepth);
          vec3 w = rot(ang)*lp + p;
          vN = normalize(rot(ang)*normal);
          vFront = step(.5, normal.z);
          vUv = c + position.xy/uGrid;
          vLocal = position.xy; vLift = lift;
          gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uTex; varying vec2 vUv, vLocal; varying vec3 vN; varying float vFront, vLift;
        void main(){
          vec3 img = texture2D(uTex, vUv).rgb;
          float vEdge = max(abs(vLocal.x), abs(vLocal.y))*2.;
          vec3 side = vec3(.55, .62, .7)*(.25 + .6*max(0., dot(vN, normalize(vec3(.3, .8, .6)))));
          vec3 c = mix(side, img, vFront);
          c += vec3(.9, .95, 1.)*pow(vEdge, 18.)*.4*vFront*smoothstep(0., .25, vLift);   // a glass edge while it flies, gone once it lands
          c += vec3(1.)*pow(max(0., dot(vN, normalize(vec3(-.4, .6, .7)))), 24.)*.6*vLift; // a glint as it turns
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    this.shards = new THREE.Mesh(geo, mat);
    this.shards.frustumCulled = false; this.shards.visible = false;
    this.dark.add(this.shards);
    this.hidden = new Set();
  }

  // rects in CSS px: { x, y (centre), w, h }
  rectWorld(r) { const px = this.pxWorld(); return new THREE.Vector4((r.x - this.w / 2) * px, -(r.y - this.h / 2) * px, r.w * px, r.h * px); }
  shatter(tex, from) { this.shU.uTex.value = tex; this.shU.uFrom.value.copy(this.rectWorld(from)); this.shU.uTo.value.copy(this.shU.uFrom.value); this.shU.uT.value = 0; this.shards.visible = true; }
  shatterTo(to) { this.shU.uTo.value.copy(this.rectWorld(to)); }
  get shatterT() { return this.shU.uT.value; }
  set shatterT(v) { this.shU.uT.value = v; }
  shatterEnd() { this.shards.visible = false; }
  hideSlab(i, on) { if (on) this.hidden.add(i); else this.hidden.delete(i); }

  buildPost() {
    const r = this.renderer;
    this.fluidA = rt(8, 8); this.fluidB = rt(8, 8);
    this.fluid = new Pass(/* glsl */`
      uniform sampler2D tPrev; uniform vec2 uPt, uDelta, uTexel; uniform float uAspect, uDecay, uRadius;
      varying vec2 vUv;
      void main(){
        vec2 v = texture2D(tPrev, vUv).xy;
        vec2 adv = texture2D(tPrev, vUv - v*uTexel*5.).xy * uDecay;
        vec2 d = vUv - uPt; d.x *= uAspect;
        adv += uDelta * exp(-dot(d,d)/uRadius);
        gl_FragColor = vec4(clamp(adv, -1., 1.), 0., 1.);
      }`, { tPrev: { value: null }, uPt: { value: new THREE.Vector2(.5, .5) }, uDelta: { value: new THREE.Vector2() }, uTexel: { value: new THREE.Vector2() }, uAspect: { value: 1 }, uDecay: { value: 0.965 }, uRadius: { value: 0.006 } });

    const sOpts = { samples: this.isWebGL2 && !this.mobile ? 4 : 0, depthBuffer: true };
    this.rtDark = rt(8, 8, sOpts); this.rtLight = rt(8, 8, sOpts);
    this.rtMix = rt(8, 8);
    this.rtB1 = rt(8, 8); this.rtB2 = rt(8, 8);

    this.mix = new Pass(NOISE + /* glsl */`
      uniform sampler2D tDark, tLight, tFluid; uniform float uCurtain, uDissolve, uTime, uAspect; varying vec2 vUv;
      void main(){
        vec2 v = texture2D(tFluid, vUv).xy;
        vec2 uv = vUv - v*.018;
        vec3 dark = vec3(texture2D(tDark, uv + v*.007).r, texture2D(tDark, uv).g, texture2D(tDark, uv - v*.007).b);
        vec3 light = texture2D(tLight, uv).rgb;
        float arch = .2*(1. - pow(abs(vUv.x*2.-1.), 2.));
        float edge = mix(-.3, 1.32, uCurtain) + arch - .1;
        float m = smoothstep(edge + .003, edge - .003, vUv.y);
        float n = noise(vUv*vec2(uAspect,1.)*6. + vec2(0., uTime*.1))*.72 + noise(vUv*vec2(uAspect,1.)*42.)*.28;
        float th = uDissolve*1.2 - .1;
        m *= 1. - smoothstep(n - .05, n + .05, th);
        vec3 col = mix(dark, light, m);
        float moving = step(.002, uCurtain)*step(uCurtain, .998);
        col += exp(-pow((vUv.y - edge)*34., 2.)) * vec3(1., .9, .76) * 1.4 * moving;
        float band = exp(-pow((n - th)*20., 2.)) * step(.002, uDissolve)*step(uDissolve, .998);
        col += band * (.5 + .5*cos(6.2832*(n*3. + vec3(0.,.33,.67)))) * 1.3;
        gl_FragColor = vec4(col, m);
      }`, { tDark: { value: null }, tLight: { value: null }, tFluid: { value: null }, uCurtain: { value: 0 }, uDissolve: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 } });

    this.bright = new Pass(/* glsl */`
      uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
      void main(){
        vec3 c = (texture2D(tSrc, vUv + uTexel*vec2(-1.,-1.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(1.,-1.)).rgb +
                  texture2D(tSrc, vUv + uTexel*vec2(-1.,1.)).rgb + texture2D(tSrc, vUv + uTexel*vec2(1.,1.)).rgb)*.25;
        float l = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c * smoothstep(.9, 1.8, l), 1.);
      }`, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });

    this.blur = new Pass(/* glsl */`
      uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tSrc, vUv).rgb*.227;
        c += (texture2D(tSrc, vUv + uDir*1.385).rgb + texture2D(tSrc, vUv - uDir*1.385).rgb)*.316;
        c += (texture2D(tSrc, vUv + uDir*3.231).rgb + texture2D(tSrc, vUv - uDir*3.231).rgb)*.07;
        gl_FragColor = vec4(c, 1.);
      }`, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });

    this.final = new Pass(NOISE + /* glsl */`
      uniform sampler2D tMix, tBloom, tFluid; uniform vec2 uRes; uniform float uTime, uReveal, uGrid, uPx, uFade, uBloom;
      varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
      vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - .055, step(.0031308, c)); }
      void main(){
        vec4 m = texture2D(tMix, vUv);
        vec3 col = m.rgb + texture2D(tBloom, vUv).rgb*uBloom;
        float light = m.a;
        col = mix(aces(col*1.15), clamp(col, 0., 1.), light);
        // the crosshair grid, bent by the same flow field
        vec2 v = texture2D(tFluid, vUv).xy;
        vec2 p = (vUv - v*.018)*uRes;
        float cell = 120.*uPx;
        vec2 g = mod(p - uRes*.5 + cell*.5, cell) - cell*.5;
        float lx = 1. - smoothstep(0., uPx, abs(g.x)), ly = 1. - smoothstep(0., uPx, abs(g.y));
        float lines = max(lx, ly);
        float arm = 5.*uPx;
        float plus = max(lx*step(abs(g.y), arm), ly*step(abs(g.x), arm));
        vec3 gc = mix(vec3(1.), vec3(.05,.055,.06), light);
        col = mix(col, gc, (lines*mix(.035,.06,light) + plus*mix(.28,.35,light))*uGrid);
        // vignette + grain
        float vig = smoothstep(1.3, .35, length((vUv-.5)*vec2(uRes.x/uRes.y, 1.)*.9));
        col *= mix(1., mix(.72, 1., vig), 1. - light*.7);
        vec2 ar = vec2(uRes.x/uRes.y, 1.);
        float d = length((vUv - .5)*ar);
        float rr = uReveal*1.25;
        col *= 1. - smoothstep(rr - .18, rr, d);
        col += exp(-pow((d - rr + .09)*22., 2.))*vec3(1.,.85,.6)*.18*step(.001, uReveal)*step(uReveal, .999);
        col *= uFade;
        col = toSRGB(col);
        col += (hash(vUv*uRes + fract(uTime*7.)*100.) - .5)*.035;
        gl_FragColor = vec4(col, 1.);
      }`, { tMix: { value: null }, tBloom: { value: null }, tFluid: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uReveal: { value: 0 }, uGrid: { value: 1 }, uPx: { value: 1 }, uFade: { value: 1 }, uBloom: { value: 0.8 } });
  }

  // ---------- assets ----------
  async load() {
    const slots = [
      ...CONTENT.projects.map((p) => `img/work/${p.slug}-1-s.jpg`),
      ...CONTENT.capabilities.map((c) => `video/${c.video}.jpg`),
      `img/work/${CONTENT.projects[0].slug}-2-s.jpg`,
    ];
    const timeout = new Promise((res) => setTimeout(res, 9000, 'timeout'));
    const work = (async () => {
      const atlas = document.createElement('canvas'); atlas.width = 2048; atlas.height = 576;
      const ag = atlas.getContext('2d'); ag.fillStyle = '#000'; ag.fillRect(0, 0, 2048, 576);
      const ims = await Promise.all(slots.map((s) => loadImage(asset(s))));
      ims.forEach((im, i) => { if (im) ag.drawImage(im, (i % 4) * 512, Math.floor(i / 4) * 288, 512, 288); this.onProgress?.((i + 1) / (slots.length + 4)); });
      const at = new THREE.CanvasTexture(atlas); at.colorSpace = THREE.SRGBColorSpace; at.flipY = false;
      this.wallU.uAtlas.value = at;
      // the projects' first images, for the slabs that carry them
      const big = await Promise.all(CONTENT.projects.map((p) => loadImage(asset(`img/work/${p.slug}-1.jpg`))));
      this.projectTex = {};
      big.forEach((im, i) => {
        const t = new THREE.Texture(im || undefined); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = !!im;
        this.projectTex[CONTENT.projects[i].slug] = t;
        this.onProgress?.((slots.length + 1 + i * 0.75) / (slots.length + 4));
      });
      this.renderer.compile(this.dark, this.camera);
      this.renderer.compile(this.light, this.camera);
    })();
    await Promise.race([work, timeout]);
    this.onProgress?.(1);
  }

  // ---------- controls used by the page ----------
  set(target) { Object.assign(this.target, target); }
  setPointer(x, y) {
    const p = this.pointer;
    const nx = x / this.w, ny = 1 - y / this.h;
    p.dx += nx - p.x; p.dy += ny - p.y; p.x = nx; p.y = ny; p.moved = true;
  }
  camZFor(z) { const a = this.w / this.h; return z * Math.max(1, 0.62 / a); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    const W = Math.floor(w * this.dpr), H = Math.floor(h * this.dpr);
    this.rtDark.setSize(W, H); this.rtLight.setSize(W, H); this.rtMix.setSize(W, H);
    const bw = Math.max(1, W >> 2), bh = Math.max(1, H >> 2);
    this.rtB1.setSize(bw, bh); this.rtB2.setSize(bw, bh);
    const fw = Math.max(1, W >> 3), fh = Math.max(1, H >> 3);
    this.fluidA.setSize(fw, fh); this.fluidB.setSize(fw, fh);
    this.fluid.u.uTexel.value.set(1 / fw, 1 / fh); this.fluid.u.uAspect.value = w / h;
    this.bright.u.uTexel.value.set(1 / W, 1 / H);
    this.mix.u.uAspect.value = w / h;
    this.final.u.uRes.value.set(W, H); this.final.u.uPx.value = this.dpr;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ---------- slab poses ----------
  // every pose is a screen position in CSS px plus a height in px, mapped onto the z = 0 plane the camera looks at
  placeSlabs(t) {
    const S = this.state;
    const camDist = this.camera.position.z;
    const px = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * camDist / this.h;   // world units per CSS px
    const wx = (x) => (x - this.w / 2) * px, wy = (y) => -(y - this.h / 2) * px;

    // the group's orientation: a slow sway, the developer gizmo on top
    const idle = t * 0.35 * S.spin;
    const e = new THREE.Euler(S.mrx + Math.sin(t * 0.5) * 0.06 * S.spin, S.mry + Math.sin(idle) * 0.55 * S.spin, Math.sin(t * 0.3) * 0.03 * S.spin);
    this.groupQ.setFromEuler(e).premultiply(this.userQ);

    const top = MARK.floors - 1;
    const local = new THREE.Vector3(), gp = new THREE.Vector3(), fp = new THREE.Vector3(), q = new THREE.Quaternion(), fq = new THREE.Quaternion();
    const tilt = new THREE.Euler();
    const pt = this.pointer;
    for (const sl of this.slabs) {
      const T = sl.t;
      sl.hover += (T.hover - sl.hover) * 0.12;
      // in the group: where this floor sits in the A, floors pushed apart by spread, stacking in after the loader
      const k = Math.min(1, Math.max(0, this.assemble * 1.7 - (top - sl.floor) * 0.1));
      const ek = 1 - Math.pow(1 - k, 3);
      const drift = Math.sin(t * 0.9 + sl.floor * 0.8) * 0.018 * S.spin;
      const u = S.gu * px;                                     // world units per mark unit
      // dx, dy, rot: a nudge in mark units, used when someone pulls a floor out of the finished A
      local.set((sl.home.x - 50 + T.dx) * u, -((sl.home.y - 50) * S.spread + T.dy) * u + (1 - ek) * 0.9 * u * 50, (1 - ek) * 0.6 + drift);
      local.applyQuaternion(this.groupQ);
      gp.set(wx(S.gx), wy(S.gy), S.gz).add(local);
      const gs = (sl.home.h * u) / sl.h;
      // out on its own: flat to the camera, leaning a little toward the pointer, lifted when hovered
      fp.set(wx(T.x), wy(T.y), T.z + sl.hover * 0.22);
      const fs = (T.h * px) / sl.h;
      const lean = 0.05 + 0.1 * sl.hover;
      tilt.set(-(pt.y - 0.5) * lean, (pt.x - 0.5) * lean, 0);
      fq.setFromEuler(tilt);
      // blend
      const g = T.g;
      sl.mesh.position.lerpVectors(fp, gp, g);
      q.copy(fq).slerp(this.groupQ, g);
      sl.mesh.quaternion.copy(q);
      if (g > 0.999) sl.mesh.rotation.z += (1 - ek) * (sl.floor % 2 ? 0.08 : -0.08) + T.rot;
      const s = fs + (gs - fs) * g;
      const appear = 0.001 + 0.999 * Math.min(1, (g > 0.5 ? k : 1) * 3);
      sl.mesh.scale.setScalar(s * appear);
      sl.mesh.morphTargetInfluences[0] = 1 - g;              // chunky in the A, a thin pane on its own
      sl.mesh.visible = !(T.hide > 0.5) && s > 0.0005 && !this.hidden.has(sl.i);
      sl.edges.position.copy(sl.mesh.position); sl.edges.quaternion.copy(sl.mesh.quaternion); sl.edges.scale.copy(sl.mesh.scale);
      sl.edges.visible = sl.mesh.visible;

      // material: frosted in the A, clear once it carries something; thin glass refracts less
      const m = sl.mat;
      const eff = 1.1 + (0.1 - 1.1) * (1 - g);
      m.thickness = eff / Math.max(0.2, s);
      m.roughness = (this.frostOverride ?? S.frost) * g + (T.frost >= 0 ? T.frost : 0.015) * (1 - g);
      // a pane facing the camera would mirror the studio's fill light over its picture: keep reflections for the A
      if (!sl.amber) { m.iridescence = 0.12 + 0.88 * g; m.envMapIntensity = 0.45 + 1.25 * g; m.clearcoat = 0.25 + 0.75 * g; m.attenuationDistance = g > 0.5 ? 3 : 60; }
      m.opacity = 1 - S.flat * g;
      if (sl.amber) m.emissiveIntensity = 0.08 + 0.3 * Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI), 3) + S.signal * (1 - g) * 0.9;
      if (sl.content) {
        const c = sl.content;
        c.mesh.visible = T.develop > 0.002 && sl.mesh.visible;
        c.u.uDev.value = T.develop; c.u.uHover.value = sl.hover;
      }
    }
    this.outlineMat.opacity = 0.7; this.outlineBarMat.opacity = 0.9;
  }

  // ---------- frame ----------
  render(dt) {
    this.time += dt;
    const S = this.state, T = this.target;
    const k = this.instant ? 1 : 1 - Math.exp(-dt * 9);
    for (const key in T) S[key] += (T[key] - S[key]) * k;
    // the light passage must track scroll tightly or the wipe feels late
    const kk = this.instant ? 1 : 1 - Math.exp(-dt * 18);
    S.curtain += (T.curtain - S.curtain) * kk; S.dissolve += (T.dissolve - S.dissolve) * kk;
    this.instant = false;
    const t = this.time;

    // camera: fixed, so the page's layout maps straight onto the glass
    this.camera.position.set(0, 0, this.camZFor(S.camZ));
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();

    this.placeSlabs(t);

    // wall
    this.wall.visible = S.wall > 0.01;
    this.wallU.uAmt.value = S.wall; this.wallU.uTime.value = t;

    this.bgU.uSub.value = S.sub;

    // ---------- passes ----------
    const r = this.renderer;
    // flow field
    const p = this.pointer;
    const gain = 6;
    this.fluid.u.tPrev.value = this.fluidA.texture;
    this.fluid.u.uPt.value.set(p.x, p.y);
    this.fluid.u.uDelta.value.set(THREE.MathUtils.clamp(p.dx * gain, -0.6, 0.6), THREE.MathUtils.clamp(p.dy * gain, -0.6, 0.6));
    p.dx = 0; p.dy = 0;
    this.fluid.render(r, this.ortho, this.fluidB);
    [this.fluidA, this.fluidB] = [this.fluidB, this.fluidA];

    const lightAmt = S.curtain * (1 - S.dissolve);
    const needDark = lightAmt < 0.999 || S.dissolve > 0.001;
    const needLight = S.curtain > 0.001 && S.dissolve < 0.999;
    if (needDark) { r.setRenderTarget(this.rtDark); r.render(this.dark, this.camera); }
    if (needLight) { r.setRenderTarget(this.rtLight); r.render(this.light, this.camera); }

    const mu = this.mix.u;
    mu.tDark.value = this.rtDark.texture; mu.tLight.value = this.rtLight.texture; mu.tFluid.value = this.fluidA.texture;
    mu.uCurtain.value = needLight ? S.curtain : 0; mu.uDissolve.value = S.dissolve; mu.uTime.value = t;
    this.mix.render(r, this.ortho, this.rtMix);

    this.bright.u.tSrc.value = this.rtMix.texture; this.bright.render(r, this.ortho, this.rtB1);
    const bw = this.rtB1.width, bh = this.rtB1.height;
    this.blur.u.tSrc.value = this.rtB1.texture; this.blur.u.uDir.value.set(1 / bw, 0); this.blur.render(r, this.ortho, this.rtB2);
    this.blur.u.tSrc.value = this.rtB2.texture; this.blur.u.uDir.value.set(0, 1 / bh); this.blur.render(r, this.ortho, this.rtB1);

    const fu = this.final.u;
    fu.tMix.value = this.rtMix.texture; fu.tBloom.value = this.rtB1.texture; fu.tFluid.value = this.fluidA.texture;
    fu.uTime.value = t; fu.uReveal.value = this.reveal; fu.uGrid.value = S.grid; fu.uFade.value = this.fade;
    this.final.render(r, this.ortho, null);
  }

  getQuaternion() { return this.groupQ; }
}
