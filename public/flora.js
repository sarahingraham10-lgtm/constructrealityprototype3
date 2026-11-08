/* ConstructReality Studio - realistic plants and trees.
   Leaves, palm fronds and banana leaves are bent, veined cut-out cards (painted textures with transparent edges) grown on tapered, curved,
   bark-textured limbs. Everything for one tree is merged into a few meshes so it stays cheap in the headset. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const rngOf = (seed) => { let s = ((seed || 1) * 2654435761) >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const TEX = {}, MATS = {};
function ctex(key, w, h, draw, repeat) {
  if (!TEX[key]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); } TEX[key] = t; }
  return TEX[key];
}
const hexs = (c) => '#' + c.toString(16).padStart(6, '0');
/* ---------- textures ---------- */
function leafTex(kind) {
  return ctex('leaf-' + kind, 128, 256, (g, w, h) => {
    const shape = () => { g.beginPath(); g.moveTo(64, 252); g.bezierCurveTo(8, 190, 10, 60, 64, 3); g.bezierCurveTo(118, 60, 120, 190, 64, 252); g.closePath(); };
    shape(); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7cc45c'); gr.addColorStop(1, '#3f8c3a'); g.fillStyle = gr; g.fill();
    g.save(); shape(); g.clip(); g.strokeStyle = 'rgba(210,235,170,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 252); g.lineTo(64, 6); g.stroke();
    g.lineWidth = 1.4; g.strokeStyle = 'rgba(190,225,150,0.35)'; for (let y = 235; y > 25; y -= 17) { g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(95, y - 18, 122, y - 44); g.moveTo(64, y); g.quadraticCurveTo(33, y - 18, 6, y - 44); g.stroke(); }
    if (kind === 'monstera') { g.globalCompositeOperation = 'destination-out'; for (let y = 50; y < 220; y += 34) for (const s of [-1, 1]) { g.beginPath(); g.ellipse(64 + s * 30, y, 7, 11, s * 0.5, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(64 + s * 56, y + 8); g.lineTo(64 + s * 24, y + 3); g.lineTo(64 + s * 58, y - 12); g.fill(); } }
    if (kind === 'croton') { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(230,170,30,0.55)'; g.fillRect(0, 0, 70, h); g.fillStyle = 'rgba(190,40,30,0.45)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(30 + i * 14, 40 + i * 33, 14, 10, 0.5, 0, 6.3); g.fill(); } }
    g.restore();
  });
}
function frondTex() {
  return ctex('frond', 256, 512, (g, w, h) => {
    g.lineCap = 'round'; g.strokeStyle = '#6a8a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 510); g.lineTo(128, 6); g.stroke();
    for (let i = 0; i < 56; i++) {
      const t = i / 56, y = 480 - t * 460, len = 118 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)), 0.7) + 6, ang = 0.75 - t * 0.25;
      for (const s of [-1, 1]) { const x1 = 128 + s * Math.cos(ang) * len, y1 = y - Math.sin(ang) * len * 0.25 + len * 0.28; g.strokeStyle = i % 2 ? '#4f9a3c' : '#66b04a'; g.lineWidth = 9 - t * 4; g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * len * 0.5, y - 6, x1, y1); g.stroke(); }
    }
  });
}
function bananaTex() {
  return ctex('banana', 128, 512, (g, w, h) => {
    g.beginPath(); g.moveTo(64, 510); g.bezierCurveTo(-30, 400, -20, 80, 64, 6); g.bezierCurveTo(150, 80, 160, 400, 64, 510); g.closePath();
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#4f9a3a'); gr.addColorStop(0.5, '#6bb347'); gr.addColorStop(1, '#4f9a3a'); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.strokeStyle = 'rgba(40,90,30,0.4)'; g.lineWidth = 1.2; for (let y = 0; y < 512; y += 9) { g.beginPath(); g.moveTo(64, y + 30); g.lineTo(0, y - 10); g.moveTo(64, y + 30); g.lineTo(128, y - 10); g.stroke(); }
    g.strokeStyle = '#a6c970'; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 510); g.lineTo(64, 6); g.stroke();
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = 2.5; for (const y of [120, 210, 300, 380]) { g.beginPath(); g.moveTo(64 + 4, y); g.lineTo(150, y - 34); g.moveTo(60, y + 22); g.lineTo(-20, y - 14); g.stroke(); } g.restore();
  });
}
function flowerTex(col) {
  return ctex('flower-' + col, 64, 64, (g) => {
    g.translate(32, 32); for (let i = 0; i < 5; i++) { g.save(); g.rotate(i / 5 * 6.283); const gr = g.createRadialGradient(0, -10, 2, 0, -14, 18); gr.addColorStop(0, '#fff3c0'); gr.addColorStop(0.35, hexs(col)); gr.addColorStop(1, hexs(col)); g.fillStyle = gr; g.beginPath(); g.ellipse(0, -14, 10, 17, 0, 0, 6.3); g.fill(); g.restore(); }
    g.fillStyle = '#f2c230'; g.beginPath(); g.arc(0, 0, 3.5, 0, 6.3); g.fill();
  });
}
function barkTex(kind) {
  return ctex('bark-' + kind, 256, 256, (g, w, h) => {
    const base = kind === 'palm' ? '#8a7a66' : kind === 'banana' ? '#7aa04a' : '#5d4631'; g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const x = Math.random() * w, y = Math.random() * h, l = 10 + Math.random() * 50; g.strokeStyle = `rgba(${Math.random() < 0.5 ? '20,14,8' : '210,190,160'},${0.05 + Math.random() * 0.12})`; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 4, y + l); g.stroke(); }
    if (kind === 'palm') { g.strokeStyle = 'rgba(40,30,20,0.55)'; g.lineWidth = 3; for (let y = 8; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 2); g.stroke(); g.strokeStyle = 'rgba(220,205,180,0.25)'; g.beginPath(); g.moveTo(0, y + 4); g.lineTo(w, y + 6); g.stroke(); g.strokeStyle = 'rgba(40,30,20,0.55)'; } }
  }, 1);
}
/* ---------- materials ---------- */
function leafMat(kind, tint) {
  const k = kind + '|' + tint; if (!MATS[k]) MATS[k] = new THREE.MeshStandardMaterial({ map: kind === 'frond' ? frondTex() : kind === 'banana' ? bananaTex() : leafTex(kind), color: tint, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.62, metalness: 0 });
  return MATS[k];
}
function barkMat(kind, tint) { const k = 'b|' + kind + '|' + tint; if (!MATS[k]) MATS[k] = new THREE.MeshStandardMaterial({ map: barkTex(kind), color: tint || 0xffffff, roughness: 0.95 }); return MATS[k]; }
const plainMat = (c, r) => { const k = 'p|' + c + '|' + r; if (!MATS[k]) MATS[k] = new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.7 : r }); return MATS[k]; };
/* ---------- geometry ---------- */
function leafGeo(len, wid, droop, fold, seg) {
  const pos = [], uv = [], idx = []; let y = 0, z = 0, a = 0; const ds = len / seg;
  for (let j = 0; j <= seg; j++) {
    const t = j / seg; if (j) { a += droop * (0.4 + t) / seg * 1.6; y += Math.cos(a) * ds; z -= Math.sin(a) * ds; }
    for (let i = 0; i < 2; i++) { const sx = i ? 1 : -1; pos.push(sx * wid / 2, y, z + Math.abs(sx * wid / 2) * fold); uv.push(i, t); }
    if (j) { const b = (j - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const geoCache = {};
const leafG = (len, wid, droop, fold, seg) => { const k = [len, wid, droop, fold, seg].map(v => Math.round(v * 1000)).join(','); return geoCache[k] || (geoCache[k] = leafGeo(len, wid, droop, fold, seg)); };
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _z = new THREE.Vector3(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function place(list, geo, pos, dir, roll, scale) {
  const d = _p.copy(dir).normalize(), up = Math.abs(d.y) > 0.97 ? _x.set(1, 0, 0) : _x.set(0, 1, 0);
  _z.copy(up).addScaledVector(d, -up.dot(d)).normalize(); const xx = new THREE.Vector3().crossVectors(d, _z);
  _m.makeBasis(xx, d, _z); _q.setFromRotationMatrix(_m); if (roll) _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), roll));
  _s.setScalar(scale || 1); const m = new THREE.Matrix4().compose(pos, _q, _s); list.push(geo.clone().applyMatrix4(m));
}
function taperTube(pts, r0, r1, radial, flare) {
  const n = pts.length, pos = [], uv = [], idx = [], nrm = new THREE.Vector3(), bn = new THREE.Vector3(); let cum = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), tan = (i < n - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
    nrm.crossVectors(tan, Math.abs(tan.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(); bn.crossVectors(tan, nrm).normalize();
    if (i) cum += pts[i].distanceTo(pts[i - 1]); const r = (r0 + (r1 - r0) * t) * (1 + (flare || 0) * Math.exp(-t * 14));
    for (let k = 0; k <= radial; k++) { const a = k / radial * 6.2832, c = Math.cos(a), s = Math.sin(a); pos.push(pts[i].x + (nrm.x * c + bn.x * s) * r, pts[i].y + (nrm.y * c + bn.y * s) * r, pts[i].z + (nrm.z * c + bn.z * s) * r); uv.push(k / radial * r0 * 12.5, cum * 2); }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) { const a = i * (radial + 1) + k, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const curve = (from, to, bend, n) => { const out = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push(new THREE.Vector3(from.x + (to.x - from.x) * t + bend.x * Math.sin(t * 3.14) * 0.5, from.y + (to.y - from.y) * t, from.z + (to.z - from.z) * t + bend.z * Math.sin(t * 3.14) * 0.5)); } return out; };
/* collect meshes: leaves by material, wood by material */
function pack(group, buckets) { buckets.forEach(b => { if (!b.list.length) return; const g = mergeGeometries(b.list, false); b.list.forEach(x => x.dispose()); if (g) { const m = new THREE.Mesh(g, b.mat); group.add(m); } }); }
const bucket = (mat) => ({ mat, list: [] });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- broad-leaf trees: mango, ackee, breadfruit, almond ---------- */
const CROWNS = {
  mango: { trunkH: 2.4, trunkR: 0.2, crown: 2.3, up: 1.7, leaf: [0.34, 0.11], tints: [0xb9d98a, 0x9cc66f, 0x7db35a, 0xcfe6a0], limbs: 6, per: 55, fruit: 0xe3a23a, bark: 0xffffff, kind: 'leaf' },
  ackee: { trunkH: 1.9, trunkR: 0.14, crown: 1.7, up: 1.4, leaf: [0.3, 0.1], tints: [0xa5cf7a, 0x8dbb62], limbs: 5, per: 45, fruit: 0xd8332a, bark: 0xd8cfc0, kind: 'leaf' },
  breadfruit: { trunkH: 2.2, trunkR: 0.17, crown: 2.0, up: 1.8, leaf: [0.5, 0.26], tints: [0x8fc26a, 0x6fa84c, 0xa9d58a], limbs: 5, per: 36, fruit: 0xa8c66a, bark: 0xcfc4b0, kind: 'leaf' },
  almond: { trunkH: 2.8, trunkR: 0.16, crown: 2.0, up: 1.4, leaf: [0.3, 0.17], tints: [0x9ccb73, 0xc4a85a, 0x7fb45b], limbs: 6, per: 40, fruit: 0, bark: 0xe3dccf, kind: 'leaf' },
  poinciana: { trunkH: 2.4, trunkR: 0.17, crown: 2.9, up: 1.0, leaf: [0.2, 0.07], tints: [0xb8dd8a, 0xa2cf74], limbs: 7, per: 60, fruit: 0, bark: 0xcfc2ae, kind: 'leaf', flower: 0xe0402a }
};
export function crownTree(kind, seed) {
  const P = CROWNS[kind] || CROWNS.mango, r = rngOf(seed), g = new THREE.Group();
  const wood = bucket(barkMat('tree', P.bark)), lb = P.tints.map(t => bucket(leafMat('simple', t))), fl = P.flower ? bucket(leafMat('flower', 0xffffff)) : null;
  const lean = V((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4), top = V(lean.x, P.trunkH, lean.z);
  wood.list.push(taperTube(curve(V(0, 0, 0), top, lean, 6), P.trunkR, P.trunkR * 0.72, 9, 0.7));
  const lg = leafG(P.leaf[0], P.leaf[1], 0.55, 0.18, 2), flw = P.flower ? flowerTex(P.flower) : null; let fm = null;
  for (let i = 0; i < P.limbs; i++) {
    const a = i / P.limbs * 6.283 + r() * 0.6, el = 0.45 + r() * 0.5, L = P.crown * (0.55 + r() * 0.4), dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const end = top.clone().addScaledVector(dir, L * 0.62).add(V(0, P.up * 0.45 * (0.5 + r()), 0)), mid = top.clone().lerp(end, 0.5).add(V(0, 0.1, 0));
    wood.list.push(taperTube([top.clone(), mid, end], P.trunkR * 0.45, P.trunkR * 0.12, 6, 0));
    const cc = end.clone().addScaledVector(dir, L * 0.25);
    for (let k = 0; k < P.per * 2.4; k++) {
      const cr = P.crown * 0.42, d = V(r() - 0.5, r() * 0.9 - 0.25, r() - 0.5).normalize(), at = cc.clone().addScaledVector(d, cr * Math.pow(r(), 0.6));
      const outward = d.clone().add(dir.clone().multiplyScalar(0.5)).normalize(); place(lb[k % lb.length].list, lg, at, outward, r() * 6.28, 1.2 + r() * 0.6);
    }
    if (P.fruit && r() < 0.8) { const fr = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), plainMat(P.fruit, 0.5)); fr.scale.set(1, 1.25, 0.9); fr.position.copy(cc).add(V((r() - 0.5) * 0.5, -0.35 - r() * 0.2, (r() - 0.5) * 0.5)); g.add(fr); }
    if (flw) for (let k = 0; k < 14; k++) { const d = V(r() - 0.5, 0.5 + r() * 0.5, r() - 0.5).normalize(), at = cc.clone().addScaledVector(d, P.crown * 0.38 * Math.pow(r(), 0.5)); const gg = new THREE.PlaneGeometry(0.2, 0.2); place(fl.list, leafG(0.2, 0.2, 0, 0, 1), at, d, r() * 6.28, 1); }
  }
  if (fl) fl.mat = new THREE.MeshStandardMaterial({ map: flw, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 });
  // inner shade leaves around the trunk top so the crown reads as dense
  for (let k = 0; k < 120; k++) { const d = V(r() - 0.5, r() * 0.7, r() - 0.5).normalize(); place(lb[k % lb.length].list, lg, top.clone().addScaledVector(d, 0.3 + r() * P.crown * 0.45), d, r() * 6.28, 1.3); }
  pack(g, [wood, ...lb, ...(fl ? [fl] : [])]); return g;
}
/* ---------- palms ---------- */
const PALMS = { coconut: { h: 6.2, r: 0.17, fronds: 16, len: 3.2, wid: 1.1, lean: 0.9, nuts: 8 }, royal: { h: 8, r: 0.26, fronds: 14, len: 3.6, wid: 1.1, lean: 0.1, nuts: 0, tint: 0xd8e8c0, pale: true }, queen: { h: 5, r: 0.15, fronds: 15, len: 2.8, wid: 1.0, lean: 0.3, nuts: 0 }, areca: { h: 2.6, r: 0.04, fronds: 14, len: 1.4, wid: 0.5, lean: 0.2, nuts: 0 }, fan: { h: 1.6, r: 0.06, fronds: 12, len: 1.0, wid: 0.5, lean: 0.1, nuts: 0 } };
export function palm(kind, seed) {
  const P = PALMS[kind] || PALMS.coconut, r = rngOf(seed), g = new THREE.Group();
  const wood = bucket(barkMat(kind === 'areca' ? 'banana' : 'palm', kind === 'royal' ? 0xdcd8d0 : 0xffffff)), fr = [bucket(leafMat('frond', 0xffffff)), bucket(leafMat('frond', 0xd9e8b0)), bucket(leafMat('frond', 0xb8d08a))];
  const a = r() * 6.283, top = V(Math.cos(a) * P.lean, P.h, Math.sin(a) * P.lean);
  const pts = []; for (let i = 0; i < 9; i++) { const t = i / 8; pts.push(V(top.x * t * t, P.h * t, top.z * t * t)); }
  wood.list.push(taperTube(pts, P.r * 1.15, P.r * 0.78, 10, 0.9));
  const fg = leafG(P.len, P.wid, 0.95, 0.12, 7);
  for (let i = 0; i < P.fronds; i++) {
    const az = i / P.fronds * 6.283 + r() * 0.3, el = (0.95 - (i % 5) * 0.28) + (r() - 0.5) * 0.15, d = V(Math.cos(az) * Math.cos(el), Math.sin(el) + 0.1, Math.sin(az) * Math.cos(el));
    place(fr[i % 3].list, fg, top.clone().add(V(0, 0.05, 0)), d, (r() - 0.5) * 0.4, 0.85 + r() * 0.3);
  }
  for (let k = 0; k < P.nuts; k++) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), plainMat(k % 3 ? 0x6b7a2f : 0x7a5a2e, 0.8)); const aa = k / P.nuts * 6.283; n.position.set(top.x + Math.cos(aa) * 0.17, top.y - 0.2 - (k % 2) * 0.08, top.z + Math.sin(aa) * 0.17); g.add(n); }
  pack(g, [wood, ...fr]); return g;
}
/* ---------- banana plant ---------- */
export function banana(seed) {
  const r = rngOf(seed), g = new THREE.Group(), wood = bucket(barkMat('banana', 0xffffff)), lb = [bucket(leafMat('banana', 0xffffff)), bucket(leafMat('banana', 0xcfe6a0))];
  const h = 2.3; wood.list.push(taperTube(curve(V(0, 0, 0), V(0.05, h, 0.05), V(0.08, 0, 0), 6), 0.12, 0.08, 9, 0.3));
  const lg = leafG(2.1, 0.7, 0.85, 0.15, 6), top = V(0.05, h, 0.05);
  for (let i = 0; i < 8; i++) { const az = i / 8 * 6.283 + r() * 0.4, el = 0.9 - (i % 4) * 0.3, d = V(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)); place(lb[i % 2].list, lg, top.clone().add(V(0, -0.1 * (i % 3), 0)), d, 0, 0.75 + r() * 0.3); }
  const bunch = new THREE.Group(); for (let k = 0; k < 4; k++) for (let j = 0; j < 7; j++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.1, 3, 6), plainMat(0x9cbf3c, 0.6)); const aa = j / 7 * 6.28; f.position.set(Math.cos(aa) * 0.04, -k * 0.075, Math.sin(aa) * 0.04); f.rotation.z = 0.2; bunch.add(f); }
  bunch.position.set(0.12, h - 0.55, 0.05); g.add(bunch);
  pack(g, [wood, ...lb]); return g;
}
/* ---------- bushes and flowering shrubs ---------- */
const BUSHES = { hibiscus: { n: 120, rad: 0.7, h: 1.3, leaf: [0.12, 0.07], tints: [0xa6d27c, 0x86bb5c], flower: 0xd9232d, nf: 14, fsz: 0.2 }, bougainvillea: { n: 140, rad: 0.9, h: 1.5, leaf: [0.1, 0.06], tints: [0xa6d27c, 0x86bb5c], flower: 0xc2278c, nf: 110, fsz: 0.12 }, ixora: { n: 100, rad: 0.6, h: 0.9, leaf: [0.12, 0.06], tints: [0x7db35a, 0x9ccb73], flower: 0xe8541c, nf: 24, fsz: 0.09 }, croton: { n: 80, rad: 0.55, h: 1.0, leaf: [0.22, 0.09], tints: [0xffffff, 0xffe9b0, 0xffc9a0], flower: 0, nf: 0, fsz: 0, kind: 'croton' }, hedge: { n: 220, rad: 0.75, h: 1.1, leaf: [0.1, 0.06], tints: [0x8dbb62, 0x6fa84c, 0xa5cf7a], flower: 0, nf: 0, fsz: 0, wide: 2.2 }, shrub: { n: 120, rad: 0.7, h: 0.9, leaf: [0.14, 0.07], tints: [0x7db35a, 0x9ccb73, 0x6fa84c], flower: 0, nf: 0, fsz: 0 } };
export function bush(kind, seed) {
  const P = BUSHES[kind] || BUSHES.shrub, r = rngOf(seed), g = new THREE.Group(), lb = P.tints.map(t => bucket(leafMat(P.kind || 'simple', t))), wood = bucket(barkMat('tree', 0xa89880));
  const lg = leafG(P.leaf[0], P.leaf[1], 0.5, 0.15, 2), W = P.wide || 1;
  for (let s = 0; s < 5; s++) { const a = s / 5 * 6.283; wood.list.push(taperTube([V(0, 0, 0), V(Math.cos(a) * P.rad * 0.25 * W, P.h * 0.55, Math.sin(a) * P.rad * 0.2)], 0.025, 0.012, 5, 0)); }
  for (let k = 0; k < P.n * 2.2; k++) { const d = V((r() - 0.5) * 2 * W, r(), (r() - 0.5) * 2).normalize(), at = V(d.x * P.rad * W * Math.pow(r(), 0.5), 0.15 + d.y * P.h * (0.5 + r() * 0.5), d.z * P.rad * Math.pow(r(), 0.5)); place(lb[k % lb.length].list, lg, at, d.clone().add(V(0, 0.3, 0)), r() * 6.28, 1.5 + r() * 0.7); }
  if (P.flower) {
    const fm = new THREE.MeshStandardMaterial({ map: flowerTex(P.flower), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }), fl = { mat: fm, list: [] }, fg = leafG(P.fsz, P.fsz, 0, 0, 1);
    for (let k = 0; k < P.nf; k++) { const d = V((r() - 0.5) * 2, 0.3 + r() * 0.8, (r() - 0.5) * 2).normalize(), at = V(d.x * P.rad * 0.95, 0.25 + d.y * P.h * 0.9, d.z * P.rad * 0.95); place(fl.list, fg, at.add(V(0, -P.fsz / 2, 0)), d, r() * 6.28, 1); }
    pack(g, [wood, ...lb, fl]);
  } else pack(g, [wood, ...lb]);
  return g;
}
/* ---------- indoor plants (grow out of a pot) ---------- */
export function houseplant(kind, h, seed) {
  const r = rngOf(seed), g = new THREE.Group(), wood = bucket(plainMat(0x4e6a34, 0.8)), lb = [bucket(leafMat(kind === 'monstera' ? 'monstera' : 'simple', kind === 'rubber' ? 0x4f8a3e : 0xffffff)), bucket(leafMat(kind === 'monstera' ? 'monstera' : 'simple', kind === 'rubber' ? 0x6aa04e : 0xcfe8b0))];
  if (kind === 'snake') { const lg = leafG(h * 0.9, 0.16, 0.15, 0.05, 3); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; place(lb[i % 2].list, lg, V(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04), V(Math.cos(a) * 0.12, 1, Math.sin(a) * 0.12), 0, 0.5 + r() * 0.5); } pack(g, lb); return g; }
  if (kind === 'areca') { const p = palm('areca', seed); p.scale.setScalar(h / 2.6); return p; }
  const n = kind === 'monstera' ? 13 : 34, lg = kind === 'monstera' ? leafG(0.72, 0.6, 0.7, 0.1, 3) : leafG(0.42, 0.24, 0.45, 0.12, 2);
  for (let i = 0; i < n; i++) { const t = i / n, a = i * 2.4 + r(), y = h * (0.18 + 0.78 * t), rad = 0.03 + (1 - t) * 0.04 + t * 0.12; wood.list.push(taperTube([V(0, 0, 0), V(Math.cos(a) * rad * 0.5, y * 0.5, Math.sin(a) * rad * 0.5), V(Math.cos(a) * rad, y, Math.sin(a) * rad)], 0.013, 0.007, 4, 0)); place(lb[i % 2].list, lg, V(Math.cos(a) * rad, y, Math.sin(a) * rad), V(Math.cos(a) * 0.75, 0.55 + t * 0.3, Math.sin(a) * 0.75), r() * 0.5, 0.75 + r() * 0.5); }
  pack(g, [wood, ...lb]); return g;
}
export const TREE_KINDS = { mango: () => 'crown', ackee: () => 'crown', breadfruit: () => 'crown', almond: () => 'crown', poinciana: () => 'crown' };
export function makeTree(kind, seed) {
  if (CROWNS[kind]) return crownTree(kind, seed); if (PALMS[kind]) return palm(kind, seed); if (kind === 'banana') return banana(seed); if (BUSHES[kind]) return bush(kind, seed); return bush('shrub', seed);
}
