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

// mark units (0..100, y down) -> world units (height 2, centred)
const mx = (x) => (x - 50) / 50;
const my = (y) => (50 - y) / 50;

// ---------- the state the director animates ----------
export const DEFAULTS = {
  camZ: 7, camY: 0, camX: 0,
  mx: 0, my: 0, mz: 0, ms: 1, mrx: 0, mry: 0, spin: 1, frost: 0.14,
  bar: 0, wall: 1, word: 0, wordX: 0,
  car: 0, carIdx: 0, cap: 0, capIdx: 0,
  curtain: 0, dissolve: 0, sub: 0, grid: 1, flat: 0, light: 0.55,
};

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
  panel(10, 10, '#8fa6ff', 1.2, [0, 0, 22], [0, 0, 0]);    // soft front fill so the faces facing the camera are never black     // back floor bounce
  panel(4, 1.4, '#ffb43a', 6.0, [9, -5, 10], [0, 0, 0]);     // the amber status light, caught in the edges
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose(); scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return env;
}

// ---------- mark geometry: one rounded slab per floor ----------
function slabShape(sl) {
  const x0 = mx(sl.x), x1 = mx(sl.x + sl.w), y0 = my(sl.y + sl.h), y1 = my(sl.y);
  const r = Math.min(MARK.radius / 50, (x1 - x0) / 2, (y1 - y0) / 2);
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

// a big word drawn into a texture, cut out with alphaTest so the glass refracts it
function wordTexture(text) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  try { g.fontStretch = 'expanded'; } catch (e) { /* older browsers draw the normal width */ }
  g.font = '800 400px Archivo, Arial, sans-serif';
  g.fillText(text, 1024, 270);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function loadImage(src) {
  return new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}

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
    this.velocity = 0;              // scroll velocity, fed by the app
    this.pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false };
    this.outroTarget = null;

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
    this.buildWord();
    this.buildCarousel();
    this.buildCapPlane();
    this.buildLight();
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

    // each floor is its own glass slab, so the mark can be built, stacked and taken apart
    const ex = { depth: 0.34, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.035, bevelSegments: 5, curveSegments: 4 };
    this.mark = new THREE.Group();
    this.outline = new THREE.Group();
    this.outlineMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.7 });
    this.outlineBarMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#c27a10'), transparent: true, opacity: 0.9 });
    this.slabs = MARK.slabs.map((sl) => {
      const shape = slabShape(sl);
      const g = new THREE.ExtrudeGeometry(shape, ex); g.translate(0, 0, -0.17);
      const mesh = new THREE.Mesh(g, sl.amber ? this.barGlass : this.glass);
      this.mark.add(mesh);
      const flat = new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: false }); flat.translate(0, 0, -0.17);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(flat, 20), sl.amber ? this.outlineBarMat : this.outlineMat);
      this.outline.add(edges);
      return { mesh, edges, floor: sl.floor, amber: sl.amber };
    });
    this.markBar = this.slabs.find((s) => s.amber).mesh;
    this.outlineBar = this.slabs.find((s) => s.amber).edges;
    this.assemble = 1;   // 0 → 1 stacks the floors into place, bottom first (played after the loader)
    this.markPivot = new THREE.Group(); this.markPivot.add(this.mark);
    this.dark.add(this.markPivot);
    this.light.add(this.outline);

    // the signal bar: a long emissive bar that grows out of the amber floor (present in both scenes so the dissolve is seamless)
    const b = MARK.bar;
    this.barRest = { x: mx(b.x + b.w / 2), y: my(b.y + b.h / 2), w: (b.w / 50), h: (b.h / 50) };
    const barGeo = new THREE.BoxGeometry(1, 1, 0.3);
    this.signalMat = new THREE.MeshBasicMaterial({ color: AMBER.clone().multiplyScalar(2.4) });
    this.signalDark = new THREE.Mesh(barGeo, this.signalMat);
    this.signalLight = new THREE.Mesh(barGeo, this.signalMat);
    this.dark.add(this.signalDark); this.light.add(this.signalLight);
  }

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

  buildWord() {
    this.wordMat = new THREE.MeshBasicMaterial({ map: null, alphaTest: 0.5, color: 0x000000 });
    this.word = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), this.wordMat);
    this.word.position.set(0, 0, -3.2);
    this.word.visible = false;
    this.dark.add(this.word);
  }

  buildCarousel() {
    this.carousel = new THREE.Group();
    this.carR = 5.2; this.carStep = 0.66;
    this.carousel.position.set(0, 0.35, -this.carR - 1.6);
    this.panels = CONTENT.projects.map((p, i) => {
      const u = { uTex: { value: null }, uFocus: { value: 0 }, uAlpha: { value: 0 }, uVel: { value: 0 }, uTime: { value: 0 } };
      const mat = new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader: `uniform float uVel, uTime, uFocus; varying vec2 vUv; varying float vEdge;
          void main(){ vUv = uv; vec3 p = position;
            float bend = mix(.34, .08, uFocus);
            p.z += (cos(p.x/1.65*1.5708) - 1.)*bend;
            p.y += sin(p.x*2.1 + uTime*3.)*uVel*.06;
            vEdge = abs(uv.x-.5)*2.;
            gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
        fragmentShader: `uniform sampler2D uTex; uniform float uFocus, uAlpha, uVel, uTime; varying vec2 vUv; varying float vEdge;
          void main(){
            vec2 uv = vUv; float split = .004 + uVel*.012;
            vec3 c = vec3(texture2D(uTex, uv + vec2(split*vEdge,0.)).r, texture2D(uTex, uv).g, texture2D(uTex, uv - vec2(split*vEdge,0.)).b);
            c *= mix(.22, 1., uFocus);
            float e = pow(vEdge, 18.);
            vec3 irid = .5 + .5*cos(6.2832*(vUv.y*.8 + e*.6 + uTime*.05 + vec3(0.,.33,.67)));
            c += irid*e*(.08 + uVel*.8);
            float frame = step(.006, vUv.x)*step(vUv.x, .994)*step(.01, vUv.y)*step(vUv.y, .99);
            c = mix(vec3(.5,.55,.6)*.35, c, frame);
            gl_FragColor = vec4(c*uAlpha, 1.);
          }`,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3 * 9 / 16, 40, 1), mat);
      const a = i * this.carStep;
      m.position.set(Math.sin(a) * this.carR, 0, Math.cos(a) * this.carR);
      m.rotation.y = a;
      this.carousel.add(m);
      return { mesh: m, u, slug: p.slug };
    });
    this.carousel.visible = false;
    this.dark.add(this.carousel);
  }

  buildCapPlane() {
    this.capU = { uA: { value: null }, uB: { value: null }, uC: { value: null }, uIdx: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.capU,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += (cos(p.x/1.9*1.5708)-1.)*.22; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: NOISE + `uniform sampler2D uA, uB, uC; uniform float uIdx, uAlpha, uTime; varying vec2 vUv;
        vec3 pick(float i){ return i < .5 ? texture2D(uA, vUv).rgb : (i < 1.5 ? texture2D(uB, vUv).rgb : texture2D(uC, vUv).rgb); }
        void main(){
          float i0 = floor(uIdx), k = fract(uIdx);
          float n = noise(vUv*vec2(9.,5.)) *.8 + noise(vUv*40.)*.2;
          float w = smoothstep(n-.08, n+.08, k*1.2-.1);
          vec3 c = mix(pick(i0), pick(min(i0+1., 2.)), w);
          float edge = exp(-pow((n-(k*1.2-.1))*14.,2.))*step(.01,k)*step(k,.99);
          c += edge*vec3(1.,.75,.35)*.8;
          float frame = step(.004, vUv.x)*step(vUv.x, .996)*step(.007, vUv.y)*step(vUv.y, .993);
          c = mix(vec3(.25,.28,.3), c, frame);
          gl_FragColor = vec4(c*uAlpha, 1.);
        }`,
    });
    this.capPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8 * 9 / 16, 32, 1), mat);
    this.capPlane.visible = false;
    this.dark.add(this.capPlane);
  }

  buildLight() {
    // faint ink grid is drawn in post; the light scene holds only the outline mark and the signal bar
  }

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
      await document.fonts?.load('800 100px Archivo').catch(() => {});
      this.wordMat.map = wordTexture('WORK'); this.wordMat.needsUpdate = true;
      const atlas = document.createElement('canvas'); atlas.width = 2048; atlas.height = 576;
      const ag = atlas.getContext('2d'); ag.fillStyle = '#000'; ag.fillRect(0, 0, 2048, 576);
      const ims = await Promise.all(slots.map((s) => loadImage(asset(s))));
      ims.forEach((im, i) => { if (im) ag.drawImage(im, (i % 4) * 512, Math.floor(i / 4) * 288, 512, 288); this.onProgress?.((i + 1) / (slots.length + 4)); });
      const at = new THREE.CanvasTexture(atlas); at.colorSpace = THREE.SRGBColorSpace; at.flipY = false;
      this.wallU.uAtlas.value = at;
      const big = await Promise.all(CONTENT.projects.map((p) => loadImage(asset(`img/work/${p.slug}-1.jpg`))));
      big.forEach((im, i) => {
        const t = new THREE.Texture(im || undefined); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = !!im;
        this.panels[i].u.uTex.value = t;
        this.onProgress?.((slots.length + 1 + i * 0.75) / (slots.length + 4));
      });
      this.renderer.compile(this.dark, this.camera);
      this.renderer.compile(this.light, this.camera);
    })();
    await Promise.race([work, timeout]);
    this.onProgress?.(1);
  }

  // video elements from the page become textures for the capability plane
  setVideos(videos) {
    const keys = ['uA', 'uB', 'uC'];
    this.videos = videos;
    videos.slice(0, 3).forEach((v, i) => { const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; this.capU[keys[i]].value = t; });
    if (videos.length) for (let i = videos.length; i < 3; i++) this.capU[keys[i]].value = this.capU.uA.value;
  }

  // ---------- controls used by the page ----------
  set(target) { Object.assign(this.target, target); }
  setPointer(x, y) {
    const p = this.pointer;
    const nx = x / this.w, ny = 1 - y / this.h;
    p.dx += nx - p.x; p.dy += ny - p.y; p.x = nx; p.y = ny; p.moved = true;
  }
  // where a DOM rect sits in world space at z = 0 (used to land the mark in the outro wordmark)
  rectToWorld(rect, camZ) {
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * camZ;
    const halfW = halfH * this.camera.aspect;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    return { x: (cx / this.w * 2 - 1) * halfW, y: -(cy / this.h * 2 - 1) * halfH, s: (rect.height / this.h) * halfH };
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

    // camera
    const camZ = this.camZFor(S.camZ);
    this.camera.position.set(S.camX, S.camY, camZ);
    this.camera.lookAt(S.camX * 0.5, S.camY * 0.6, 0);

    // mark
    const idle = t * 0.35 * S.spin;
    this.markPivot.position.set(S.mx, S.my, S.mz);
    this.markPivot.scale.setScalar(Math.max(0.0001, S.ms));
    const e = new THREE.Euler(S.mrx + Math.sin(t * 0.5) * 0.06 * S.spin, S.mry + Math.sin(idle) * 0.55, Math.sin(t * 0.3) * 0.03 * S.spin);
    this.mark.quaternion.setFromEuler(e).premultiply(this.userQ);
    this.markPivot.visible = S.ms > 0.01;
    this.glass.roughness = this.frostOverride ?? S.frost;
    this.glass.opacity = 1 - S.flat;
    this.barGlass.opacity = 1 - S.flat;
    this.barGlass.emissiveIntensity = 0.08 + 0.3 * Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI), 3);   // the cursor breathes

    // signal bar: grows out of the crossbar across the whole screen
    const sb = S.bar;
    const shown = sb > 0.002;
    for (const m of [this.signalDark, this.signalLight]) {
      m.visible = shown;
      if (!shown) continue;
      const ease = sb * sb * (3 - 2 * sb);
      const r = this.barRest;
      const s = S.ms;
      m.position.set(S.mx + r.x * s * (1 - ease), S.my + r.y * s, S.mz + 0.25);
      m.scale.set(r.w * s * (1 + ease * 60), r.h * s * (1 - 0.35 * ease), 0.3 * s);
    }
    this.markBar.visible = sb < 0.05;

    // floors: stack into place from the bottom up, then breathe a little apart in depth so the layers read
    const top = MARK.floors - 1;
    for (const sl of this.slabs) {
      const k = Math.min(1, Math.max(0, this.assemble * 1.7 - (top - sl.floor) * 0.1));
      const e = 1 - Math.pow(1 - k, 3);
      const drift = Math.sin(t * 0.9 + sl.floor * 0.8) * 0.018 * S.spin;
      sl.mesh.position.set(0, (1 - e) * 0.9, (1 - e) * 0.6 + drift);
      sl.mesh.rotation.z = (1 - e) * (sl.floor % 2 ? 0.08 : -0.08);
      sl.mesh.scale.setScalar(0.001 + 0.999 * Math.min(1, k * 3));
      sl.edges.position.copy(sl.mesh.position); sl.edges.rotation.copy(sl.mesh.rotation); sl.edges.scale.copy(sl.mesh.scale);
    }

    // outline copy of the mark for the light scene
    this.outline.position.copy(this.markPivot.position);
    this.outline.scale.copy(this.markPivot.scale);
    this.outline.quaternion.copy(this.mark.quaternion);
    this.outline.visible = this.markPivot.visible;
    this.outlineMat.opacity = 0.7 - 0.35 * sb;
    this.outlineBar.visible = sb < 0.05;

    // wall
    this.wall.visible = S.wall > 0.01;
    this.wallU.uAmt.value = S.wall; this.wallU.uTime.value = t;
    this.wall.position.y = 0.3 + S.camY * 0.4;

    // giant word
    this.word.visible = S.word > 0.01;
    this.wordMat.color.setScalar(S.word * 0.9);
    this.word.position.x = S.wordX;

    // carousel
    this.carousel.visible = S.car > 0.01;
    if (this.carousel.visible) {
      this.carousel.scale.setScalar(this.w / this.h < 0.9 ? 0.82 : 1);
      this.carousel.rotation.y = -S.carIdx * this.carStep;
      const vel = Math.min(1, Math.abs(this.velocity) * 0.02);
      this.panels.forEach((p, i) => {
        const d = Math.abs(i - S.carIdx);
        p.u.uFocus.value = Math.max(0, 1 - d);
        p.u.uAlpha.value = S.car * Math.max(0, 1 - Math.max(0, d - 1.4));
        p.u.uVel.value += (vel - p.u.uVel.value) * 0.1;
        p.u.uTime.value = t;
      });
    }

    // capability plane
    this.capPlane.visible = S.cap > 0.01;
    if (this.capPlane.visible) {
      const narrow = this.w / this.h < 0.9;
      this.capU.uAlpha.value = S.cap; this.capU.uIdx.value = S.capIdx; this.capU.uTime.value = t;
      if (narrow) { this.capPlane.position.set(0, 0.95, 0); this.capPlane.rotation.set(0, 0, 0); this.capPlane.scale.setScalar(0.78); }
      else { this.capPlane.position.set(-1.35, 0.05, 0.2); this.capPlane.rotation.set(0, 0.32, 0); this.capPlane.scale.setScalar(1); }
      this.capPlane.position.y += Math.sin(t * 0.6) * 0.03;
    }

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

  getQuaternion() { return this.mark.quaternion; }
}
