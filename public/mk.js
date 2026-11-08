/* ConstructReality Studio - modelling helpers: rounded boxes with tidy UVs, lathe turnings, tapered legs, shared plain materials. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { plain } from './materials.js';

/* box-projected UVs in metres (so wood grain, tiles etc. keep their real size on rounded shapes) */
export function boxUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i), p.getY(i)); else if (ay >= az) uv.setXY(i, p.getX(i), p.getZ(i)); else uv.setXY(i, p.getX(i), p.getY(i)); }
  uv.needsUpdate = true; return geo;
}
const cache = new Map();
function rgeo(w, h, d, r, seg) {
  const key = [w, h, d, r, seg].map(v => Math.round(v * 10000)).join(',');
  let g = cache.get(key); if (!g) { g = boxUV(new RoundedBoxGeometry(w, h, d, seg, r)); cache.set(key, g); } return g;
}
/* a rounded box standing on y with its centre at x, z. r = edge radius */
export function rbx(g, mt, w, h, d, x, y, z, r, seg, rx, ry, rz) {
  const rr = Math.max(0.0005, Math.min(r === undefined ? 0.01 : r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  const o = new THREE.Mesh(rgeo(w, h, d, rr, seg || 1), mt); o.position.set(x, y + h / 2, z); if (rx) o.rotation.x = rx; if (ry) o.rotation.y = ry; if (rz) o.rotation.z = rz; g.add(o); return o;
}
export const bx = (g, mt, w, h, d, x, y, z, rx) => rbx(g, mt, w, h, d, x, y, z, Math.min(0.008, Math.min(w, h, d) * 0.4), 1, rx);
export const cy = (g, mt, rt, rb, h, x, y, z, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), mt); o.position.set(x, y + h / 2, z); g.add(o); return o; };
export const sp = (g, mt, r, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mt); o.position.set(x, y, z); o.scale.set(sx || 1, sy || 1, sz || 1); g.add(o); return o; };
/* turned shape: profile = [[radius, height], ...] from the bottom up */
export function lathe(g, mt, profile, x, y, z, seg) {
  const o = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg || 24), mt); o.position.set(x, y, z); g.add(o); return o;
}
/* four tapered turned legs */
export function leg4(g, mt, w, d, h, inset, r) {
  const rr = r || 0.025, i = inset || 0.08;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lathe(g, mt, [[rr * 0.55, 0], [rr * 0.7, h * 0.25], [rr * 0.9, h * 0.8], [rr, h]], sx * (w / 2 - i), 0, sz * (d / 2 - i), 12);
}
export const tube = (g, mt, a, b, r, seg) => {      // a rod from point a to point b
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), mt);
  o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.add(o); return o;
};
export const SOIL = plain(0x3a2a1c, 1, 0);
export const WHITE = plain(0xf4f4f2, 0.45, 0), BLACK = plain(0x0c0c0c, 0.5, 0.2), BRASS = plain(0xb08d45, 0.3, 0.85), CHROME = plain(0xcfd2d6, 0.18, 0.95), GLASS = plain(0xcfe6ee, 0.05, 0.1, { t: 0.28 }), SCREEN = plain(0x07080a, 0.12, 0.3);
export const SHADE = plain(0xf2e9d6, 0.9, 0), PAPER = plain(0xece8de, 0.9, 0), LINEN = plain(0xf6f3ec, 0.95, 0), WATER = plain(0x6fc3d8, 0.05, 0.1, { t: 0.7 });
export const acc = (c) => plain(c, 0.9, 0);                    // accent fabric colours (cushions, books...)
