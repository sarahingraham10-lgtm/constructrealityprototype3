/* ConstructReality Studio - roofs, doors, windows, shutters, fences, driveway and landscaping. Everything is generated from the client's choices. */
import * as THREE from 'three';
import { makeTree } from './flora.js';
import { material, plain, metricUV } from './materials.js';

const DS = THREE.DoubleSide;
const dbl = (m) => { if (!m._dbl) { m._dbl = m.clone(); m._dbl.side = DS; } return m._dbl; };
const bx = (g, mt, w, h, d, x, y, z) => { const o = new THREE.Mesh(metricUV(new THREE.BoxGeometry(w, h, d), w, h, d), mt); o.position.set(x, y + h / 2, z); g.add(o); return o; };
const cyl = (g, mt, rt, rb, h, x, y, z, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), mt); o.position.set(x, y + h / 2, z); g.add(o); return o; };
const sph = (g, mt, r, x, y, z, sy) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mt); o.position.set(x, y, z); o.scale.y = sy || 1; g.add(o); return o; };
const GLASS = (tint) => plain(tint || 0xcfe6ee, 0.05, 0.1, { t: tint === 0x111111 ? 0.6 : 0.3 });
const BLACK = plain(0x0c0c0c, 0.5, 0.3);

/* a mesh from planar faces (quads or triangles) with metric UVs so tile, brick and roofing keep their real size */
function faceMesh(faces, mt) {
  const pos = [], uv = [];
  for (const f of faces) {
    const p0 = new THREE.Vector3(...f[0]), p1 = new THREE.Vector3(...f[1]), p2 = new THREE.Vector3(...f[2]);
    const e1 = p1.clone().sub(p0).normalize(), nrm = p1.clone().sub(p0).cross(p2.clone().sub(p0)).normalize(), e2 = nrm.clone().cross(e1);
    const tri = (a, b, c) => { [a, b, c].forEach(q => { pos.push(q.x, q.y, q.z); const r = q.clone().sub(p0); uv.push(r.dot(e1), r.dot(e2)); }); };
    const P = f.map(q => new THREE.Vector3(...q));
    tri(P[0], P[1], P[2]); if (P.length === 4) tri(P[0], P[2], P[3]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return new THREE.Mesh(g, mt);
}

/* ---------------------------------------------------------------- roof ---------------------------------------------------------------- */
/* levels: [{rooms}], elev(i) = floor level height, H = wall height. ext.roof = {style, k, c, fc, solar} */
export function buildRoof(levels, elev, H, ext, wallOutMat) {
  const g = new THREE.Group(), R = ext.roof, top = levels.length - 1, rooms = levels[top].rooms;
  if (!rooms.length) return g;
  const rm = dbl(material(R.k, R.c)), fasc = material('paint', R.fc === undefined ? 0xffffff : R.fc);
  const baseY = elev(top) + H, ov = 0.6;
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; rooms.forEach(r => { x0 = Math.min(x0, r.x); z0 = Math.min(z0, r.z); x1 = Math.max(x1, r.x + r.w); z1 = Math.max(z1, r.z + r.d); });
  const bw = x1 - x0, bd = z1 - z0, alongX = bw >= bd, style = R.style;
  /* flat roofs, and any floor not covered by the floor above it, get a concrete slab with a parapet */
  const cell = 0.5, covered = (li) => { const s = new Set(); levels[li].rooms.forEach(r => { for (let i = Math.round(r.x / cell); i < Math.round((r.x + r.w) / cell); i++) for (let j = Math.round(r.z / cell); j < Math.round((r.z + r.d) / cell); j++) s.add(i + ',' + j); }); return s; };
  const slabMat = material('exconcrete', 0xdcdcdc);
  const flatFor = (li, all) => {
    const occ = covered(li), above = (!all && li < top) ? covered(li + 1) : new Set(), y = elev(li) + H;
    const mine = [...occ].filter(k => !above.has(k)).map(k => k.split(',').map(Number)); if (!mine.length) return;
    const has = new Set(mine.map(c => c.join(',')));
    const rows = {}; mine.forEach(([i, j]) => { (rows[j] = rows[j] || []).push(i); });
    for (const j of Object.keys(rows)) { const is = rows[j].sort((a, b) => a - b); let s = is[0], p = is[0]; for (let q = 1; q <= is.length; q++) { if (q === is.length || is[q] !== p + 1) { bx(g, slabMat, (p - s + 1) * cell, 0.25, cell, (s + (p - s + 1) / 2) * cell, y, (+j + 0.5) * cell); s = is[q]; } p = is[q]; } }
    const edges = {}; const put = (key, pos) => { (edges[key] = edges[key] || []).push(pos); };
    mine.forEach(([i, j]) => { if (!occ.has(i + ',' + (j - 1))) put('h:' + j + ':-1', i); if (!occ.has(i + ',' + (j + 1))) put('h:' + (j + 1) + ':1', i); if (!occ.has((i - 1) + ',' + j)) put('v:' + i + ':-1', j); if (!occ.has((i + 1) + ',' + j)) put('v:' + (i + 1) + ':1', j); });
    const par = 0.45, t = 0.18;
    for (const key of Object.keys(edges)) {
      const [o, fix, side] = key.split(':'), pos = edges[key].sort((a, b) => a - b); let s = pos[0], p = pos[0];
      for (let q = 1; q <= pos.length; q++) { if (q === pos.length || pos[q] !== p + 1) { const len = (p - s + 1) * cell, c = (s + (p - s + 1) / 2) * cell, f = +fix * cell + (+side) * t / 2; if (o === 'h') bx(g, wallOutMat, len + t, par, t, c, y + 0.25, f); else bx(g, wallOutMat, t, par, len + t, f, y + 0.25, c); s = pos[q]; } p = pos[q]; }
    }
  };
  for (let li = 0; li < top; li++) flatFor(li, false);
  if (style === 'flat') {
    flatFor(top, true);
    if (R.solar) { const pm = plain(0x14233f, 0.25, 0.6), fm = plain(0xaeb4bd, 0.4, 0.8); for (let x = x0 + 0.8; x + 1.0 <= x1 - 0.8; x += 1.1) for (let z = z0 + 0.8; z + 1.6 <= z1 - 0.8; z += 1.7) { bx(g, fm, 1.0, 0.05, 1.6, x + 0.5, baseY + 0.3, z + 0.8); bx(g, pm, 0.94, 0.01, 1.54, x + 0.5, baseY + 0.35, z + 0.8); } }
    return g;
  }
  /* pitched roofs run along the longer side of the top floor */
  const tanp = style === 'mono' ? 0.22 : style === 'hip' ? 0.5 : 0.52;
  const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, b0 = alongX ? z0 : x0, b1 = alongX ? z1 : x1, span = b1 - b0;
  const P = (a, y, b) => alongX ? [a, y, b] : [b, y, a];
  const yW = baseY + 0.05, ye = yW - ov * tanp, ea0 = a0 - 0.4, ea1 = a1 + 0.4, eb0 = b0 - ov, eb1 = b1 + ov, mid = (b0 + b1) / 2, yr = yW + tanp * span / 2;
  const yAt = (b) => style === 'mono' ? yW + tanp * (b1 - b) : yr - tanp * Math.abs(b - mid);        // roof height over the front slope at position b
  const faces = [];
  if (style === 'gable') {
    faces.push([P(ea0, ye, eb1), P(ea1, ye, eb1), P(ea1, yr, mid), P(ea0, yr, mid)]); faces.push([P(ea1, ye, eb0), P(ea0, ye, eb0), P(ea0, yr, mid), P(ea1, yr, mid)]);
    for (const a of [a0, a1]) g.add(faceMesh([[P(a, baseY, b0), P(a, baseY, b1), P(a, yr, mid)]], dbl(wallOutMat)));
  } else if (style === 'hip') {
    const inset = (eb1 - eb0) / 2, r1 = ea0 + inset, r2 = ea1 - inset;
    if (r2 > r1 + 0.01) {
      faces.push([P(ea0, ye, eb1), P(ea1, ye, eb1), P(r2, yr, mid), P(r1, yr, mid)]); faces.push([P(ea1, ye, eb0), P(ea0, ye, eb0), P(r1, yr, mid), P(r2, yr, mid)]);
      faces.push([P(ea0, ye, eb0), P(ea0, ye, eb1), P(r1, yr, mid)]); faces.push([P(ea1, ye, eb1), P(ea1, ye, eb0), P(r2, yr, mid)]);
    } else { const c = (ea0 + ea1) / 2; faces.push([P(ea0, ye, eb1), P(ea1, ye, eb1), P(c, yr, mid)]); faces.push([P(ea1, ye, eb0), P(ea0, ye, eb0), P(c, yr, mid)]); faces.push([P(ea0, ye, eb0), P(ea0, ye, eb1), P(c, yr, mid)]); faces.push([P(ea1, ye, eb1), P(ea1, ye, eb0), P(c, yr, mid)]); }
  } else {
    const yh = yW + tanp * span;
    faces.push([P(ea0, ye, eb1), P(ea1, ye, eb1), P(ea1, yh + ov * tanp, eb0), P(ea0, yh + ov * tanp, eb0)]);
    for (const a of [a0, a1]) g.add(faceMesh([[P(a, baseY, b0), P(a, baseY, b1), P(a, yh, b0)]], dbl(wallOutMat)));
  }
  g.add(faceMesh(faces, rm));
  if (style !== 'mono') for (const bb of [eb0, eb1]) { const f = bx(g, fasc, ea1 - ea0, 0.16, 0.05, alongX ? (ea0 + ea1) / 2 : bb, ye - 0.1, alongX ? bb : (ea0 + ea1) / 2); if (!alongX) f.rotation.y = Math.PI / 2; }
  if (R.solar) {                                                    // panels on the street-facing slope
    const pm = plain(0x14233f, 0.25, 0.6), fm = plain(0xaeb4bd, 0.4, 0.8), ang = Math.atan(tanp), pw = 1.0, ph = 1.6, step = ph * Math.cos(ang) + 0.1;
    const cols = Math.max(1, Math.min(6, Math.floor((a1 - a0 - 2) / (pw + 0.1))));
    for (let c = 0; c < cols; c++) for (let r = 0; r < 2; r++) {
      const a = (a0 + a1) / 2 + (c - (cols - 1) / 2) * (pw + 0.1), b = b1 - 0.9 - (r + 0.5) * step, panel = new THREE.Group();
      bx(panel, fm, pw, 0.05, ph, 0, 0, 0); bx(panel, pm, pw - 0.06, 0.01, ph - 0.06, 0, 0.05, 0); panel.rotation.x = ang;
      const wr = new THREE.Group(); wr.position.set(...P(a, yAt(b) + 0.05, b)); wr.rotation.y = alongX ? 0 : Math.PI / 2; wr.add(panel); g.add(wr);
    }
  }
  return g;
}

/* ---------------------------------------------------------------- doors ---------------------------------------------------------------- */
export const DOOR_STYLES = [['panel', 'Panel'], ['flush', 'Flat'], ['glazed', 'Glass panel'], ['louvre', 'Louvre'], ['steel', 'Steel']];
/* a door leaf: hinge at x = 0, extends to x = w, from y = 0 to h */
export function buildDoor(style, w, h, fin, garage) {
  const g = new THREE.Group(), t = 0.045;
  if (garage) { const m = material('metalroof', fin.c); for (let i = 0; i < 6; i++) bx(g, m, w, h / 6 - 0.012, 0.06, w / 2, i * h / 6, 0); bx(g, BLACK, 0.4, 0.04, 0.02, w / 2, h * 0.5, 0.04); return g; }
  const base = style === 'panel' ? material('doorpanel', fin.c) : style === 'steel' ? material('steel', fin.c) : material(fin.k === 'doorpanel' ? 'paint' : fin.k, fin.c);
  if (style === 'panel' || style === 'flush' || style === 'steel') { bx(g, base, w, h, t, w / 2, 0, 0); }
  else if (style === 'glazed') { const fr = 0.12; bx(g, base, fr, h, t, fr / 2, 0, 0); bx(g, base, fr, h, t, w - fr / 2, 0, 0); bx(g, base, w, fr, t, w / 2, 0, 0); bx(g, base, w, fr * 1.5, t, w / 2, h - fr * 1.5, 0); bx(g, base, w - 2 * fr, 0.4, t, w / 2, h * 0.38, 0); bx(g, GLASS(), w - 2 * fr, h * 0.45, 0.01, w / 2, h * 0.38 + 0.4, 0); }
  else { const n = Math.floor(h / 0.1), fr = 0.1; bx(g, base, fr, h, t, fr / 2, 0, 0); bx(g, base, fr, h, t, w - fr / 2, 0, 0); for (let i = 0; i < n; i++) { const s = bx(g, base, w - 2 * fr, 0.012, 0.11, w / 2, 0.05 + i * (h - 0.1) / n, 0); s.rotation.x = 0.7; } }
  const hm = plain(0xb08d45, 0.3, 0.8); bx(g, hm, 0.13, 0.025, 0.04, w - 0.12, h * 0.46, 0.04); bx(g, hm, 0.025, 0.025, 0.04, w - 0.06, h * 0.46, 0.025);
  return g;
}
/* ---------------------------------------------------------------- windows ---------------------------------------------------------------- */
export const WINDOW_STYLES = [['sliding', 'Sliding'], ['casement', 'Casement'], ['louvre', 'Louvre'], ['fixed', 'Fixed']];
export const SHUTTERS = [['none', 'None'], ['bahama', 'Bahama'], ['colonial', 'Colonial'], ['roll', 'Roller']];
/* a window centred on x = 0, from y = 0 to h, glass in the middle of the wall thickness */
export function buildWindow(w, h, W, wallT) {
  const g = new THREE.Group(), fm = material('paint', W.fc), fr = 0.055, gm = GLASS(W.glass === 'dark' ? 0x111111 : W.glass === 'bronze' ? 0xc9a77a : W.glass === 'blue' ? 0x8cc3e6 : W.glass === 'frost' ? 0xeeeeee : undefined);
  const dp = 0.09; bx(g, fm, w, fr, dp, 0, 0, 0); bx(g, fm, w, fr, dp, 0, h - fr, 0); bx(g, fm, fr, h, dp, -w / 2 + fr / 2, 0, 0); bx(g, fm, fr, h, dp, w / 2 - fr / 2, 0, 0);
  bx(g, plain(0xf0f0ee, 0.7, 0), w + 0.16, 0.04, wallT + 0.12, 0, -0.03, 0);               // sill
  if (W.style === 'louvre') { const n = Math.floor((h - 2 * fr) / 0.085); for (let i = 0; i < n; i++) { const s = bx(g, gm, w - 2 * fr, 0.075, 0.012, 0, fr + i * (h - 2 * fr) / n, 0); s.rotation.x = -0.55; } }
  else { bx(g, gm, w - 2 * fr, h - 2 * fr, 0.01, 0, fr, 0); if (W.style === 'sliding') { bx(g, fm, 0.05, h - 2 * fr, dp, 0, fr, 0); bx(g, fm, w / 2 - fr, 0.03, 0.03, -w / 4, fr, 0.04); } if (W.style === 'casement') { bx(g, fm, 0.05, h - 2 * fr, dp * 0.8, 0, fr, 0); bx(g, fm, w - 2 * fr, 0.05, dp * 0.8, 0, h * 0.62, 0); for (const s of [-1, 1]) bx(g, plain(0xb08d45, 0.3, 0.8), 0.02, 0.1, 0.03, s * 0.08, h * 0.5, 0.05); } }
  if (W.grille && W.grille !== 'none') { const bm = plain(W.grille === 'white' ? 0xf4f4f2 : 0x1a1a1a, 0.5, 0.5); const n = Math.floor(w / 0.12); for (let i = 1; i < n; i++) bx(g, bm, 0.014, h, 0.014, -w / 2 + i * w / n, 0, wallT / 2 + 0.07); for (const y of [0.02, h * 0.5, h - 0.03]) bx(g, bm, w, 0.02, 0.02, 0, y, wallT / 2 + 0.07); }
  const sm = material('paint', W.sc === undefined ? 0x25405e : W.sc);
  if (W.shutters === 'bahama') { const p = new THREE.Group(); const n = 8; for (let i = 0; i < n; i++) bx(p, sm, w + 0.2, 0.7 / n - 0.012, 0.025, 0, i * 0.7 / n, 0); p.position.set(0, h + 0.06, wallT / 2 + 0.05); p.rotation.x = -0.75; g.add(p); }
  if (W.shutters === 'colonial') for (const s of [-1, 1]) { const p = new THREE.Group(); bx(p, sm, w / 2 + 0.04, h, 0.03, 0, 0, 0); const n = Math.floor(h / 0.09); for (let i = 0; i < n; i++) bx(p, sm, w / 2 - 0.06, 0.008, 0.045, 0, 0.05 + i * (h - 0.1) / n, 0.01).rotation.x = -0.5; p.position.set(s * (w / 2 + w / 4 + 0.06), 0, wallT / 2 + 0.04); g.add(p); }
  if (W.shutters === 'roll') { bx(g, sm, w + 0.14, 0.18, 0.18, 0, h, wallT / 2 + 0.04); const n = Math.floor(h * 0.35 / 0.05); for (let i = 0; i < n; i++) bx(g, sm, w + 0.1, 0.045, 0.015, 0, h - 0.1 - i * 0.05 - 0.05, wallT / 2 + 0.05); }
  return g;
}

/* ---------------------------------------------------------------- yard ---------------------------------------------------------------- */
export const FENCES = [['none', 'None'], ['wall', 'Block wall'], ['railing', 'Iron railings'], ['chain', 'Chain link'], ['timber', 'Timber'], ['hedge', 'Hedge']];
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
let treeN = 0;
function tree(kind) { return makeTree(kind, Math.round(seed * 7919) + (++treeN) * 31); }
/* info: {plot, ground:{rooms}, frontDoor:{x,z}, garageDoor:{x,z,w}|null, wallOut} ; E = exterior choices */

export const VERANDA_DEFAULT = { on: true, style: 'door', w: 3.4, d: 2.0, rail: 'balusters', col: 'round', fret: true, fan: true, steps: true, back: false, fk: 'tile', fc: 0xffffff, cc: 0xffffff, rc: 0xffffff };
export const veranda = (v) => Object.assign({}, VERANDA_DEFAULT, v || {});
function buildVeranda(g, V, E, fd, H, plot) {
  const fm = material(V.fk, V.fc), cm = material('paint', V.cc), rm = material('paint', V.rc), roofM = material(E.roof.k, E.roof.c), lamp = plain(0xfff2c8, 0.4, 0);
  const dp = Math.max(1.2, Math.min(4, V.d)), cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), FH = 0.3, CH = 2.85;
  const zf = H.z1 + 0.0, rects = [];
  const push = (xa, xb, za, zb, open) => { xa = cl(xa, 0.3, plot.w - 0.3); xb = cl(xb, 0.3, plot.w - 0.3); za = cl(za, 0.3, plot.d + 0.6); zb = cl(zb, 0.3, plot.d + 0.6); if (xb - xa > 0.8 && zb - za > 0.8) rects.push({ xa, xb, za, zb, open }); };
  if (V.style === 'door') push(fd.x - V.w / 2, fd.x + V.w / 2, fd.z, fd.z + dp, ['f', 'l', 'r']);
  else { push(H.x0 - 0.3, H.x1 + 0.3, zf, zf + dp, V.style === 'wrap' ? ['f'] : ['f', 'l', 'r']); if (V.style === 'wrap') { push(H.x0 - dp, H.x0 - 0.3, H.z0 + 0.6, zf + dp, ['l', 'b']); push(H.x1 + 0.3, H.x1 + dp, H.z0 + 0.6, zf + dp, ['r', 'b']); } }
  if (V.back) push(H.x0 - 0.3, H.x1 + 0.3, H.z0 - dp, H.z0, ['b', 'l', 'r']);
  const col = (x, z) => {
    if (V.col === 'square') { bx(g, cm, 0.16, CH - FH, 0.16, x, FH, z); bx(g, cm, 0.26, 0.12, 0.26, x, FH, z); }
    else if (V.col === 'turned') { cyl(g, cm, 0.07, 0.09, CH - FH, x, FH, z, 14); sph(g, cm, 0.12, x, FH + 0.5, z, 0.7); sph(g, cm, 0.12, x, CH - 0.45, z, 0.7); bx(g, cm, 0.26, 0.1, 0.26, x, FH, z); }
    else { cyl(g, cm, 0.09, 0.09, CH - FH, x, FH, z, 14); bx(g, cm, 0.3, 0.12, 0.3, x, FH, z); }
  };
  const rail = (ax, az, bx_, bz, skip) => {
    const L = Math.hypot(bx_ - ax, bz - az), ang = Math.atan2(bz - az, bx_ - ax), c = new THREE.Group(); c.position.set(ax, FH, az); c.rotation.y = -ang; g.add(c);
    const segs = skip ? [[0, Math.max(0, skip[0])], [Math.min(L, skip[1]), L]] : [[0, L]];
    for (const [s, e] of segs) { const len = e - s; if (len < 0.1) continue;
      if (V.rail === 'none') continue;
      bx(c, rm, len, 0.06, 0.08, (s + e) / 2, 0.9, 0); bx(c, rm, len, 0.05, 0.06, (s + e) / 2, 0.08, 0);
      if (V.rail === 'balusters') for (let p = s + 0.1; p < e - 0.05; p += 0.13) cyl(c, rm, 0.022, 0.022, 0.84, p, 0.08, 0, 8);
      else if (V.rail === 'iron') for (let p = s + 0.1; p < e - 0.05; p += 0.11) bx(c, plain(0x1a1a1a, 0.5, 0.4), 0.014, 0.82, 0.014, p, 0.1, 0);
      else for (let p = s + 0.08; p < e - 0.05; p += 0.2) bx(c, rm, 0.1, 0.8, 0.03, p, 0.1, 0);
    }
    if (V.fret) for (let p = 0.2; p < L - 0.1; p += 0.22) { const k = bx(c, cm, 0.09, 0.09, 0.03, p, CH - 0.34, 0); k.rotation.z = Math.PI / 4; }
  };
  for (const R of rects) {
    const w = R.xb - R.xa, d = R.zb - R.za, cx = (R.xa + R.xb) / 2, cz = (R.za + R.zb) / 2, has = (s) => R.open.includes(s);
    bx(g, fm, w, FH, d, cx, 0, cz);
    if (R.zb - H.z1 > 0.5 && has('f')) bx(g, fm, w - 0.4, 0.15, 0.4, cx, 0, R.zb + 0.2);
    const sk = V.steps ? [fd.x - R.xa - 0.8, fd.x - R.xa + 0.8] : null, fr = R.zb - 0.2;
    const edges = [];
    if (has('f')) edges.push([R.xa + 0.2, fr, R.xb - 0.2, fr, sk]);
    if (has('l')) edges.push([R.xa + 0.2, fr, R.xa + 0.2, R.za + 0.2]);
    if (has('r')) edges.push([R.xb - 0.2, fr, R.xb - 0.2, R.za + 0.2]);
    if (has('b')) edges.push([R.xa + 0.2, R.za + 0.2, R.xb - 0.2, R.za + 0.2]);
    const seen = new Set();
    for (const [ax, az, bx_, bz, skip] of edges) {
      const L = Math.hypot(bx_ - ax, bz - az), n = Math.max(1, Math.ceil(L / 2.4));
      for (let i = 0; i <= n; i++) { const x = ax + (bx_ - ax) * i / n, z = az + (bz - az) * i / n, key = x.toFixed(2) + ',' + z.toFixed(2); if (seen.has(key)) continue; seen.add(key); col(x, z); }
      rail(ax, az, bx_, bz, skip);
    }
    if (V.steps && has('f')) { for (let i = 0; i < 2; i++) bx(g, fm, 1.6 - i * 0.2, 0.1 + 0.1 * (1 - i), 0.3, fd.x, 0, R.zb + 0.2 + 0.3 * (1 - i) + 0.15 * i); }
    const canopy = new THREE.Group(); bx(canopy, cm, w + 0.2, 0.14, d + 0.3, 0, 0, 0); bx(canopy, dbl(roofM), w + 0.3, 0.05, d + 0.4, 0, 0.14, 0); canopy.position.set(cx, CH, cz + 0.05); g.add(canopy);
    sph(g, lamp, 0.09, cx, CH - 0.1, cz, 0.6);
    if (V.fan && w > 2 && d > 1.4) { const fy = CH - 0.35; cyl(g, plain(0x222222, 0.5, 0.3), 0.012, 0.012, 0.3, cx, fy, cz, 6); cyl(g, plain(0x222222, 0.5, 0.3), 0.08, 0.08, 0.08, cx, fy - 0.06, cz, 12); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, b = bx(g, plain(0x6b4b2c, 0.7, 0), 0.5, 0.012, 0.13, cx + Math.cos(a) * 0.35, fy - 0.04, cz + Math.sin(a) * 0.35); b.rotation.y = -a; } }
  }
}

export function buildYard(info, E) {
  const g = new THREE.Group(), { plot, rooms } = info; seed = Math.round(plot.w * 131 + plot.d * 17 + 7);
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; rooms.forEach(r => { x0 = Math.min(x0, r.x); z0 = Math.min(z0, r.z); x1 = Math.max(x1, r.x + r.w); z1 = Math.max(z1, r.z + r.d); });
  /* ground, road and pavement */
  const ex = info.wide ? 40 : 3, lawn = material(E.lawn.k, E.lawn.c), gz0 = -ex / 2, gz1 = plot.d + (info.wide ? 3.2 : 1.5), gnd = new THREE.Mesh(metricUV(new THREE.BoxGeometry(plot.w + ex, 0.1, gz1 - gz0), plot.w + ex, 0.1, gz1 - gz0), lawn); gnd.position.set(plot.w / 2, -0.06, (gz0 + gz1) / 2); g.add(gnd);
  if (info.wide) bx(g, lawn, plot.w + ex, 0.1, 30, plot.w / 2, -0.06, plot.d + 11.5 + 15);
  const rw = plot.w + (info.wide ? 40 : 3);
  const road = bx(g, material('asphalt', 0xffffff), rw, 0.08, 7, plot.w / 2, -0.1, plot.d + 7.8); const kerb = bx(g, material('exconcrete', 0xdddddd), rw, 0.14, 0.25, plot.w / 2, -0.06, plot.d + 4.4);
  for (let x = plot.w / 2 - rw / 2 + 1; x < plot.w / 2 + rw / 2 - 1; x += 3) bx(g, plain(0xf2f2f2, 0.8, 0), 1.4, 0.01, 0.14, x, -0.015, plot.d + 8.2);
  bx(g, material('pavers', 0xffffff), rw, 0.06, 1.6, plot.w / 2, -0.05, plot.d + 3.6);
  const gateX = info.garageDoor ? info.garageDoor.x : (info.frontDoor ? info.frontDoor.x : plot.w / 2), gateW = info.garageDoor ? Math.max(3.2, info.garageDoor.w + 0.8) : 1.3;
  /* driveway and path */
  const dm = material(E.drive.k, E.drive.c);
  if (info.garageDoor) bx(g, dm, gateW, 0.04, plot.d - info.garageDoor.z + 0.2, gateX, 0, (info.garageDoor.z + plot.d + 0.2) / 2);
  const fd = info.frontDoor; if (fd) {
    const pm = material(E.path.k, E.path.c), pz0 = fd.z + 0.1, pz1 = plot.d; const px = fd.x;
    bx(g, pm, 1.1, 0.04, pz1 - pz0 + 0.2, px, 0, (pz0 + pz1) / 2); if (Math.abs(px - gateX) > 0.6) bx(g, pm, Math.abs(px - gateX) + 1.1, 0.04, 1.1, (px + gateX) / 2, 0, pz1 - 0.6 + 0.0);
    for (const sx of [-1, 1]) { const lx = px + sx * 0.9; if (E.gardenLights) { cyl(g, plain(0x1a1a1a, 0.5, 0.5), 0.03, 0.03, 0.7, lx, 0, pz0 + 1.2, 8); sph(g, plain(0xfff2c8, 0.4, 0), 0.07, lx, 0.76, pz0 + 1.2, 1); } }
  }
  /* veranda: over the front door, across the whole front, or wrapped around the sides; every part can be changed */
  const V = veranda(E.veranda);
  if (V.on && fd) buildVeranda(g, V, E, fd, { x0, x1, z0, z1 }, plot);
  /* fence and gate */
  const F = E.fence;
  if (F.style !== 'none') {
    const fm = material(F.k, F.c), pm = material('paint', F.pc), inset = 0.1, hgt = F.style === 'wall' ? 1.8 : F.style === 'hedge' ? 1.3 : F.style === 'chain' ? 1.5 : F.style === 'timber' ? 1.7 : 1.5;
    const run = (ax, az, bxx, bz, gate) => {
      const L = Math.hypot(bxx - ax, bz - az), ang = Math.atan2(bz - az, bxx - ax); const c = new THREE.Group(); c.position.set(ax, 0, az); c.rotation.y = -ang; g.add(c);
      const segs = gate ? [[0, gate.at - gate.w / 2], [gate.at + gate.w / 2, L]] : [[0, L]];
      for (const [s, e] of segs) { const len = e - s; if (len < 0.05) continue;
        if (F.style === 'wall') { bx(c, fm, len, hgt, 0.2, (s + e) / 2, 0, 0); bx(c, pm, len + 0.04, 0.1, 0.28, (s + e) / 2, hgt, 0); for (let p = s; p <= e + 0.01; p += 2.4) bx(c, fm, 0.34, hgt + 0.18, 0.34, Math.min(p, e), 0, 0); }
        else if (F.style === 'railing') { bx(c, pm, len, 0.05, 0.05, (s + e) / 2, hgt - 0.05, 0); bx(c, pm, len, 0.05, 0.05, (s + e) / 2, 0.15, 0); bx(c, material('exconcrete', 0xcfcfcf), len, 0.3, 0.2, (s + e) / 2, 0, 0); for (let p = s; p <= e + 0.01; p += 0.14) bx(c, pm, 0.018, hgt - 0.3, 0.018, Math.min(p, e), 0.3, 0); for (let p = s; p <= e + 0.01; p += 2.4) bx(c, pm, 0.12, hgt + 0.05, 0.12, Math.min(p, e), 0, 0); }
        else if (F.style === 'chain') { bx(c, plain(0xbfc3c8, 0.5, 0.6, { t: 0.35 }), len, hgt - 0.1, 0.01, (s + e) / 2, 0.05, 0); for (let p = s; p <= e + 0.01; p += 2.5) cyl(c, plain(0x8a8e94, 0.4, 0.8), 0.04, 0.04, hgt, Math.min(p, e), 0, 0, 8); bx(c, plain(0x8a8e94, 0.4, 0.8), len, 0.04, 0.04, (s + e) / 2, hgt, 0); }
        else if (F.style === 'timber') { for (let p = s; p <= e + 0.01; p += 0.17) bx(c, fm, 0.14, hgt, 0.03, Math.min(p, e) + 0.07, 0, 0); for (let p = s; p <= e + 0.01; p += 2.2) bx(c, pm, 0.1, hgt + 0.1, 0.1, Math.min(p, e), 0, 0); }
        else { for (let p = s; p <= e; p += 0.6) sph(c, plain([0x2f7a3a, 0x3f9a45, 0x1f5a30][Math.floor(p * 2) % 3], 0.9, 0), 0.5, p, 0.65, 0, 1.2); }
      }
      if (gate) { const gm = F.style === 'wall' || F.style === 'timber' ? fm : pm, gg = new THREE.Group(); if (F.style === 'hedge') return; bx(gg, gm, gate.w - 0.1, hgt - 0.3, 0.05, 0, 0.1, 0); for (let p = -gate.w / 2 + 0.1; p < gate.w / 2 - 0.05; p += 0.12) bx(gg, pm, 0.02, hgt - 0.3, 0.02, p, 0.1, 0.03); gg.position.set(gate.at, 0, 0); c.add(gg); for (const sg of [-1, 1]) bx(c, pm, 0.25, hgt + 0.25, 0.25, gate.at + sg * (gate.w / 2 + 0.02), 0, 0); }
    };
    const W = plot.w - inset, D = plot.d - inset;
    run(inset, inset, W, inset); run(W, inset, W, D); run(inset, D, inset, inset);
    run(W, D, inset, D, { at: W - gateX, w: gateW });                         // front, running right to left, so the gate position is mirrored
  }
  /* plants: trees and shrubs on free ground */
  const kinds = E.garden === 'lush' ? ['coconut', 'mango', 'banana', 'hibiscus', 'bougainvillea', 'royal', 'breadfruit', 'ixora', 'croton', 'poinciana', 'coconut', 'ackee'] : E.garden === 'tropical' ? ['coconut', 'mango', 'hibiscus', 'ixora', 'banana', 'ackee', 'croton', 'bougainvillea'] : E.garden === 'minimal' ? ['coconut', 'shrub', 'croton'] : [];
  const nTarget = E.garden === 'lush' ? Math.round(plot.w * plot.d / 18) : E.garden === 'tropical' ? Math.round(plot.w * plot.d / 28) : E.garden === 'minimal' ? Math.round(plot.w * plot.d / 70) : 0;
  const blocked = (x, z) => { if (x > x0 - 1.6 && x < x1 + 1.6 && z > z0 - 1.6 && z < z1 + (E.veranda.on ? (E.veranda.d || 2.0) + 1.4 : 1.6)) return true; if (fd && Math.abs(x - fd.x) < 1.2 && z > fd.z - 0.5) return true; if (info.garageDoor && Math.abs(x - gateX) < gateW / 2 + 0.8 && z > info.garageDoor.z - 1) return true; if (Math.abs(x - gateX) < 1.2 && z > plot.d - 3) return true; return false; };
  let placed = 0; for (let tries = 0; tries < nTarget * 20 && placed < nTarget; tries++) {
    const x = 0.8 + rnd() * (plot.w - 1.6), z = 0.8 + rnd() * (plot.d - 1.6); if (blocked(x, z)) continue;
    const k = kinds[Math.floor(rnd() * kinds.length)]; const t = tree(k); t.position.set(x, 0, z); t.rotation.y = rnd() * 6.28; const sc = 0.85 + rnd() * 0.4; t.scale.setScalar(sc); g.add(t); placed++;
  }
  /* extras */
  if (E.mailbox) { cyl(g, plain(0x1a1a1a, 0.5, 0.5), 0.03, 0.03, 1.0, gateX + gateW / 2 + 0.6, 0, plot.d - 0.2, 8); bx(g, plain(0xc2603c, 0.6, 0.2), 0.3, 0.25, 0.22, gateX + gateW / 2 + 0.6, 1.0, plot.d - 0.2); }
  if (E.tank && rooms.length) { const tx = x1 - 1.0, tz = z0 + 0.9; const leg = plain(0x777777, 0.5, 0.6); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, leg, 0.05, 0.05, 1.8, tx + sx * 0.55, 0, tz + sz * 0.55 - 0.9, 8); cyl(g, plain(0x1b3a5c, 0.5, 0.1), 0.8, 0.8, 1.3, tx, 1.8, tz - 0.9, 24); cyl(g, plain(0x1b3a5c, 0.5, 0.1), 0.78, 0.5, 0.2, tx, 3.1, tz - 0.9, 24); }
  return g;
}
