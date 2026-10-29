// Procedural 3D dishes for the "Signature Table" section.
// Each dish is built from code so the site works today; drop a Blender export at
// assets/models/<id>.glb (e.g. assets/models/manti.glb) and it replaces the procedural one.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DISHES = [
  {
    id: 'manti',
    name: 'Steamed Manti',
    native: 'Манты',
    desc: 'Six hand-pinched pouches of thin dough around chopped lamb and onion, steamed until the broth inside turns to gold. Served with our house chili.',
    build: buildManti,
  },
  {
    id: 'plov',
    name: 'Pilaf',
    native: 'Палоо',
    desc: 'The heart of every Kyrgyz celebration: long-grain rice slow-cooked in the kazan with beef, carrots, garlic and spice, finished with a boiled egg.',
    build: buildPlov,
  },
  {
    id: 'lagman',
    name: 'Boso Lagman',
    native: 'Босо лагман',
    desc: 'Homemade noodles thrown into a roaring wok with beef, bell peppers, celery and green beans. The guest favourite.',
    build: buildLagman,
  },
  {
    id: 'shashlik',
    name: 'Lamb Shish Kebab',
    native: 'Шашлык',
    desc: 'Marinated lamb on flat steel skewers, grilled over charcoal on Fridays and Saturdays, laid on warm nan with pickled red onion.',
    build: buildShashlik,
  },
];

/* ---------------------------------------------------------
   Small helpers
   --------------------------------------------------------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  ) * 2 - 1;
}
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function displace(geo, amp, freq, seed = 0) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise3(v.x * freq + seed, v.y * freq, v.z * freq) + 0.5 * noise3(v.x * freq * 2.3, v.y * freq * 2.3 + seed, v.z * freq * 2.3);
    v.addScaledVector(v.clone().normalize(), n * amp);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function mat(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, metalness: 0, ...opts });
}

function shadowed(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

/* ---------------------------------------------------------
   Tableware
   --------------------------------------------------------- */
function plate(radius = 1.35, color = 0x1f3a5f) {
  const r = radius;
  const pts = [
    [0, 0], [r * 0.62, 0], [r * 0.66, 0.025], [r * 0.7, 0.03],
    [r * 0.94, 0.12], [r, 0.16], [r * 0.985, 0.175],
    [r * 0.9, 0.12], [r * 0.7, 0.065], [0, 0.06],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 128);
  const m = mat(color, { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, m);
  // pale glaze rim, like the speckled plates in the restaurant
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.992, 0.012, 8, 128),
    mat(0xd9d2c3, { roughness: 0.4 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.172;
  const g = new THREE.Group();
  g.add(mesh, rim);
  return g;
}

function bowl(radius = 1.05, height = 0.62, color = 0xf4f1ea) {
  const r = radius, h = height;
  const pts = [
    [0, 0], [r * 0.42, 0], [r * 0.45, 0.04], [r * 0.5, 0.06],
    [r * 0.8, h * 0.45], [r * 0.97, h * 0.92], [r, h], [r * 0.975, h + 0.012],
    [r * 0.94, h * 0.92], [r * 0.76, h * 0.45], [r * 0.45, h * 0.16], [0, h * 0.15],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.Mesh(
    new THREE.LatheGeometry(pts, 128),
    mat(color, { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide }),
  );
}

/* ---------------------------------------------------------
   MANTI
   --------------------------------------------------------- */
function mantiGeometry(seed) {
  const geo = new THREE.SphereGeometry(0.3, 96, 64);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  const twist = seed * 0.7;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let h = v.y / 0.3; // -1..1
    const theta = Math.atan2(v.z, v.x) + twist;
    let r = Math.hypot(v.x, v.z);

    // four folded ridges that meet in a pinched cross on top
    const ridge = Math.pow(Math.abs(Math.cos(2 * theta)), 5);
    const t = smooth(0.05, 0.98, h);
    r *= (1 - t) + (0.16 + 0.62 * ridge) * t;
    r *= 1 + 0.07 * Math.pow(Math.abs(Math.sin(theta * 13)), 0.6) * t * (1 - ridge); // pleats
    r *= 1 + 0.1 * Math.cos(4 * theta) * smooth(-0.6, 0.3, h) * (1 - t); // square-ish belly
    r *= 1.12;

    // flat steamed base
    let y = v.y;
    if (h < -0.45) y = -0.135 + (y + 0.135) * 0.18;
    y *= 0.82;
    y += 0.05 * ridge * t; // peaks of the folds

    const n = noise3(v.x * 9 + seed, v.y * 9, v.z * 9) * 0.008;
    const k = Math.hypot(v.x, v.z) || 1;
    p.setXYZ(i, (v.x / k) * (r + n), y + n, (v.z / k) * (r + n));
  }
  geo.computeVertexNormals();
  return geo;
}

function buildManti() {
  const g = new THREE.Group();
  g.add(plate());
  const dough = mat(0xeedbb8, {
    roughness: 0.52, sheen: 0.6, sheenColor: new THREE.Color(0xfff3dc), sheenRoughness: 0.5,
    clearcoat: 0.25, clearcoatRoughness: 0.5,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const m = new THREE.Mesh(mantiGeometry(i * 3.1), dough);
    m.position.set(Math.cos(a) * 0.74, 0.19, Math.sin(a) * 0.74);
    m.rotation.y = -a + 0.3;
    m.scale.setScalar(0.95 + (i % 3) * 0.04);
    g.add(m);
  }
  // chili ramekin in the centre
  const cup = bowl(0.24, 0.16, 0x1b3150);
  cup.position.y = 0.06;
  const chili = new THREE.Mesh(
    displace(new THREE.CylinderGeometry(0.205, 0.205, 0.02, 48, 4), 0.006, 14),
    mat(0x8e1a0e, { roughness: 0.3, clearcoat: 0.8 }),
  );
  chili.position.y = 0.2;
  g.add(cup, chili);
  // chili flakes
  const flake = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.012), mat(0x4a0a05), 40);
  const r = rng(7), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.18;
    q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
    m4.compose(new THREE.Vector3(Math.cos(a) * d, 0.212, Math.sin(a) * d), q, new THREE.Vector3(1, 1, 1));
    flake.setMatrixAt(i, m4);
  }
  g.add(flake);
  return shadowed(g);
}

/* ---------------------------------------------------------
   PLOV
   --------------------------------------------------------- */
function moundHeight(rad) {
  return 0.52 - 0.34 * rad * rad;
}

function scatterOnMound(count, maxR, seed, fn) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * maxR;
    fn(Math.cos(a) * d, moundHeight(d), Math.sin(a) * d, r, i);
  }
}

function buildPlov() {
  const g = new THREE.Group();
  g.add(plate(1.4, 0x1f3a5f));

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  const color = new THREE.Color();

  // rice base so there are no gaps under the grains
  const base = new THREE.Mesh(
    displace(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), 0.015, 6),
    mat(0xb8782f, { roughness: 0.8 }),
  );
  base.scale.set(0.96, 0.4, 0.96);
  base.position.y = 0.06;
  g.add(base);

  // rice grains
  const RICE = 5200;
  const rice = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.011, 0.045, 2, 6), mat(0xffffff, { roughness: 0.45, clearcoat: 0.4 }), RICE);
  const palette = [0xe0aa5a, 0xd39340, 0xebc07c, 0xc77f33, 0xf0d199];
  scatterOnMound(RICE, 0.97, 11, (x, y, z, r, i) => {
    q.setFromEuler(new THREE.Euler(r() * Math.PI, r() * Math.PI, r() * Math.PI));
    m4.compose(new THREE.Vector3(x, y + 0.005 + r() * 0.03, z), q, s);
    rice.setMatrixAt(i, m4);
    rice.setColorAt(i, color.setHex(palette[(r() * palette.length) | 0]));
  });
  g.add(rice);

  // julienned carrots
  const CAR = 160;
  const carrots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.018, 0.2), mat(0xe2621c, { roughness: 0.45, clearcoat: 0.5 }), CAR);
  scatterOnMound(CAR, 0.9, 23, (x, y, z, r, i) => {
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * Math.PI, (r() - 0.5) * 0.6));
    m4.compose(new THREE.Vector3(x, y + 0.005, z), q, new THREE.Vector3(1, 1, 0.6 + r() * 0.7));
    carrots.setMatrixAt(i, m4);
  });
  g.add(carrots);

  // beef chunks piled in the middle
  const beefMat = mat(0x4b2414, { roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.4 });
  const r = rng(5);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.32;
    const m = new THREE.Mesh(displace(new THREE.IcosahedronGeometry(0.11, 4), 0.035, 9, i * 4), beefMat);
    m.scale.set(1.2, 0.75, 0.9);
    m.position.set(Math.cos(a) * d, moundHeight(d) + 0.05, Math.sin(a) * d);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    g.add(m);
  }

  // boiled egg halves
  const white = mat(0xfbf8f2, { roughness: 0.35, clearcoat: 0.3 });
  const yolk = mat(0xf3b21f, { roughness: 0.7 });
  [[0.72, -0.35, 0.4], [0.5, -0.68, 1.3]].forEach(([x, z, ry]) => {
    const e = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), white);
    shell.rotation.x = Math.PI;
    shell.scale.set(1, 1, 1.3);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.155, 48), white);
    cap.rotation.x = -Math.PI / 2;
    cap.scale.set(1, 1.3, 1);
    const y = new THREE.Mesh(new THREE.SphereGeometry(0.085, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), yolk);
    y.scale.set(1, 0.35, 1.15);
    e.add(shell, cap, y);
    e.position.set(x, moundHeight(Math.hypot(x, z)) + 0.1, z);
    e.rotation.set(-0.35, ry, 0.15);
    g.add(e);
  });

  // chives
  const CH = 90;
  const chives = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6), mat(0x3f8a2a, { roughness: 0.5 }), CH);
  scatterOnMound(CH, 0.45, 31, (x, y, z, r, i) => {
    q.setFromEuler(new THREE.Euler(Math.PI / 2, r() * Math.PI, 0));
    m4.compose(new THREE.Vector3(x, y + 0.11, z), q, s);
    chives.setMatrixAt(i, m4);
  });
  g.add(chives);

  return shadowed(g);
}

/* ---------------------------------------------------------
   BOSO LAGMAN
   --------------------------------------------------------- */
function buildLagman() {
  const g = new THREE.Group();
  const b = bowl(1.25, 0.6);
  g.add(b);

  const r = rng(42);
  const surface = (d) => 0.48 - 0.1 * d * d; // noodle pile height

  // noodles: tubes along wandering curves, merged into one mesh
  const tubes = [];
  for (let n = 0; n < 120; n++) {
    const pts = [];
    let a = r() * Math.PI * 2, d = r() * 0.75;
    for (let k = 0; k < 9; k++) {
      a += (r() - 0.5) * 1.4;
      d = THREE.MathUtils.clamp(d + (r() - 0.5) * 0.35, 0, 0.82);
      const y = surface(d) - 0.12 + r() * 0.15;
      pts.push(new THREE.Vector3(Math.cos(a) * d, y, Math.sin(a) * d));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 80, 0.026 + r() * 0.006, 8, false);
    const col = new THREE.Color().setHSL(0.05 + r() * 0.03, 0.75, 0.3 + r() * 0.1);
    const cols = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < cols.length; i += 3) { cols[i] = col.r; cols[i + 1] = col.g; cols[i + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    tubes.push(geo);
  }
  const noodles = new THREE.Mesh(mergeGeometries(tubes), mat(0xffffff, { vertexColors: true, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.3 }));
  g.add(noodles);

  // sauce pooled underneath
  const sauce = new THREE.Mesh(
    displace(new THREE.CircleGeometry(0.9, 64).rotateX(-Math.PI / 2), 0.004, 12),
    mat(0xa8371a, { roughness: 0.2, clearcoat: 1 }),
  );
  sauce.position.y = 0.26;
  g.add(sauce);

  const place = (mesh, count, seed, spread, lift, scl = [1, 1]) => {
    const rr = rng(seed);
    for (let i = 0; i < count; i++) {
      const m = mesh.clone();
      const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * spread;
      m.position.set(Math.cos(a) * d, surface(d) + lift, Math.sin(a) * d);
      m.rotation.set(rr() * 3, rr() * 3, rr() * 3);
      m.scale.setScalar(scl[0] + rr() * (scl[1] - scl[0]));
      g.add(m);
    }
  };

  // beef strips, bell peppers, green beans, celery
  place(new THREE.Mesh(displace(new THREE.BoxGeometry(0.2, 0.05, 0.08, 6, 2, 3), 0.012, 10), mat(0x5a2a16, { roughness: 0.45, clearcoat: 0.6 })), 16, 1, 0.75, 0.06);
  place(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.07), mat(0xc81e12, { roughness: 0.25, clearcoat: 1 })), 14, 2, 0.8, 0.07);
  place(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.06), mat(0x2f7d1f, { roughness: 0.3, clearcoat: 1 })), 10, 3, 0.8, 0.07);
  place(new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.16, 4, 8), mat(0x3d8f2a, { roughness: 0.35, clearcoat: 0.6 })), 10, 4, 0.7, 0.06);

  // cilantro sprigs on top
  const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.05, 7), mat(0x2d7a1e, { side: THREE.DoubleSide, roughness: 0.5 }));
  leaf.scale.set(1, 0.7, 1);
  place(leaf, 26, 5, 0.3, 0.14, [0.8, 1.3]);

  // sesame
  const SES = 140;
  const sesame = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), mat(0xf3e6c2), SES);
  const rr = rng(9), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < SES; i++) {
    const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * 0.85;
    q.setFromEuler(new THREE.Euler(rr() * 3, rr() * 3, 0));
    m4.compose(new THREE.Vector3(Math.cos(a) * d, surface(d) + 0.06, Math.sin(a) * d), q, new THREE.Vector3(1, 0.5, 1.6));
    sesame.setMatrixAt(i, m4);
  }
  g.add(sesame);

  return shadowed(g);
}

/* ---------------------------------------------------------
   SHASHLIK on nan
   --------------------------------------------------------- */
function nanBread() {
  const geo = new THREE.CylinderGeometry(1.15, 1.12, 0.14, 128, 1, false);
  // ring geometry gives us concentric rows we can sculpt into a rim
  const ringGeo = new THREE.RingGeometry(0, 1.15, 128, 40);
  const rp = ringGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) {
    v.fromBufferAttribute(rp, i);
    const d = Math.hypot(v.x, v.y);
    // thick puffy rim, flat stamped centre with chekich dots
    let h = 0.03 + 0.11 * smooth(0.68, 0.92, d) * (1 - smooth(1.02, 1.15, d));
    const ang = Math.atan2(v.y, v.x);
    const dots = d < 0.62 ? Math.max(0, Math.cos(d * 32) * Math.cos(ang * Math.max(4, Math.round(d * 30)))) : 0;
    h -= dots * 0.012;
    h += noise3(v.x * 6, v.y * 6, 1) * 0.01;
    rp.setZ(i, h);
  }
  ringGeo.computeVertexNormals();
  ringGeo.rotateX(-Math.PI / 2);
  // vertex colours: toasted rim, paler centre
  const cols = new Float32Array(rp.count * 3);
  const c1 = new THREE.Color(0xe8b971), c2 = new THREE.Color(0xa8591f), c = new THREE.Color();
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), z = rp.getZ(i);
    const d = Math.hypot(x, z);
    c.copy(c1).lerp(c2, smooth(0.65, 1.0, d) * 0.8 + Math.max(0, noise3(x * 5, z * 5, 3)) * 0.4);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  ringGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.translate(0, -0.07, 0);

  const g = new THREE.Group();
  const breadMat = mat(0xffffff, { vertexColors: true, roughness: 0.75, sheen: 0.4, sheenColor: new THREE.Color(0xffd9a0) });
  g.add(new THREE.Mesh(ringGeo, breadMat), new THREE.Mesh(geo, mat(0xb46a2c, { roughness: 0.8 })));
  return g;
}

function meatChunk(seed) {
  const geo = new THREE.BoxGeometry(0.22, 0.18, 0.19, 8, 8, 8);
  const bp = geo.attributes.position, bv = new THREE.Vector3();
  for (let i = 0; i < bp.count; i++) {
    bv.fromBufferAttribute(bp, i);
    bv.lerp(bv.clone().normalize().multiplyScalar(0.12), 0.35);
    bp.setXYZ(i, bv.x, bv.y, bv.z);
  }
  displace(geo, 0.03, 7, seed);
  const p = geo.attributes.position;
  const cols = new Float32Array(p.count * 3);
  const raw = new THREE.Color(0x7a3418), char = new THREE.Color(0x1c0d07), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const n = noise3(p.getX(i) * 22 + seed, p.getY(i) * 22, p.getZ(i) * 22);
    c.copy(raw).lerp(char, smooth(-0.1, 0.6, n));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

function skewer(seed) {
  const g = new THREE.Group();
  const steel = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.012, 0.05), mat(0xc9ccd1, { metalness: 1, roughness: 0.3 }));
  steel.position.x = 0.1;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.07), mat(0xe2741e, { roughness: 0.5, clearcoat: 0.3 }));
  handle.position.x = 1.38;
  const meatMat = mat(0xffffff, { vertexColors: true, roughness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.35 });
  const fatMat = mat(0xd9b38a, { roughness: 0.4, clearcoat: 0.5 });
  g.add(steel, handle);
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(meatChunk(seed + i * 7), meatMat);
    m.position.x = -0.85 + i * 0.3;
    m.scale.set(1.05, 0.9, 1);
    m.rotation.set(i, i * 2, 0);
    g.add(m);
    if (i < 5) {
      const f = new THREE.Mesh(displace(new THREE.IcosahedronGeometry(0.06, 3), 0.015, 9, seed + i), fatMat);
      f.position.x = -0.7 + i * 0.3;
      g.add(f);
    }
  }
  return g;
}

function buildShashlik() {
  const g = new THREE.Group();
  g.add(plate(1.5, 0x1b2f4a));
  const bread = nanBread();
  bread.position.y = 0.13;
  g.add(bread);

  const s1 = skewer(3);
  s1.position.set(-0.05, 0.36, -0.2);
  s1.rotation.y = 0.35;
  const s2 = skewer(19);
  s2.position.set(0.05, 0.36, 0.22);
  s2.rotation.y = 0.15;
  g.add(s1, s2);

  // pickled red onion rings
  const onionMat = mat(0xd9a3c4, { roughness: 0.25, clearcoat: 1, transmission: 0.25, thickness: 0.05 });
  const r = rng(77);
  for (let i = 0; i < 16; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07 + r() * 0.06, 0.01, 8, 40), onionMat);
    const a = r() * Math.PI * 2, d = 0.3 + r() * 0.5;
    ring.position.set(Math.cos(a) * d, 0.48 + r() * 0.06, Math.sin(a) * d - 0.05);
    ring.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.6, 0, r() * 3);
    g.add(ring);
  }
  // dill sprigs
  const dill = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 5), mat(0x3b8a2c));
  for (let i = 0; i < 12; i++) {
    const m = dill.clone();
    const a = r() * Math.PI * 2, d = 0.5 + r() * 0.4;
    m.position.set(Math.cos(a) * d, 0.3, Math.sin(a) * d);
    m.rotation.set(Math.PI / 2 + r(), r() * 3, r());
    g.add(m);
  }
  return shadowed(g);
}

/* ---------------------------------------------------------
   Optional Blender override
   --------------------------------------------------------- */
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader().setDRACOLoader(draco);
async function tryLoadGLB(id) {
  const url = `assets/models/${id}.glb`;
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return null;
    const gltf = await loader.loadAsync(url);
    const root = gltf.scene;
    // normalise: centre on the table and fit inside ~2.8 units wide
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const scale = 2.8 / Math.max(size.x, size.z, size.y * 1.6);
    root.scale.setScalar(scale);
    box.setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
    const g = new THREE.Group();
    g.add(root);
    return shadowed(g);
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------
   Scene
   --------------------------------------------------------- */
export function initDishes({ canvas, ui, reduceMotion, start = 0 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 3.1, 4.6);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.2, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.25;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.9;

  // warm key light like a yurt's fire, cool rim from the tunduk opening
  const key = new THREE.DirectionalLight(0xffdcae, 2.6);
  key.position.set(3, 5, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -2.5;
  key.shadow.camera.right = key.shadow.camera.top = 2.5;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  const rim = new THREE.DirectionalLight(0x9fc2ff, 1.1);
  rim.position.set(-4, 3, -3);
  scene.add(key, rim, new THREE.HemisphereLight(0xffe9c8, 0x2a0b08, 0.5));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const holder = new THREE.Group();
  scene.add(holder);

  const cache = new Map();
  async function getDish(i) {
    if (!cache.has(i)) {
      const d = DISHES[i];
      cache.set(i, tryLoadGLB(d.id).then((glb) => glb || d.build()));
    }
    return cache.get(i);
  }

  let current = 0;
  let active = null;
  let switching = false;
  ui.total.textContent = String(DISHES.length).padStart(2, '0');

  function writeUI(i) {
    const d = DISHES[i];
    ui.index.textContent = String(i + 1).padStart(2, '0');
    ui.name.textContent = d.name;
    ui.native.textContent = d.native;
    ui.desc.textContent = d.desc;
  }

  // simple tween so we don't depend on GSAP inside the module
  function tween(dur, fn) {
    return new Promise((res) => {
      if (reduceMotion) { fn(1); res(); return; }
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        fn(1 - Math.pow(1 - t, 4));
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  async function show(i) {
    if (switching) return;
    switching = true;
    current = (i + DISHES.length) % DISHES.length;
    writeUI(current);
    const next = await getDish(current);
    if (active) {
      const old = active;
      await tween(380, (t) => {
        old.scale.setScalar(1 - t * 0.6);
        old.position.y = -t * 0.4;
        old.rotation.y += 0.04;
      });
      holder.remove(old);
    }
    next.scale.setScalar(0.4);
    next.position.y = 0.6;
    next.rotation.y = -0.8;
    holder.add(next);
    active = next;
    await tween(900, (t) => {
      next.scale.setScalar(0.4 + 0.6 * t);
      next.position.y = 0.6 * (1 - t);
      next.rotation.y = -0.8 * (1 - t);
    });
    switching = false;
    // warm the next dish in the background
    getDish(current + 1 < DISHES.length ? current + 1 : 0);
  }

  ui.prev.addEventListener('click', () => show(current - 1));
  ui.next.addEventListener('click', () => show(current + 1));
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // only render while visible
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  });

  show(start);
}
