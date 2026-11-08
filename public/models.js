/* ConstructReality Studio - furniture, decor and fixture models, built in code from boxes and cylinders.
   Every model sits with its centre on the floor, its front facing +z and its back at -z, and is sized by (w, d, h). */
import * as THREE from 'three';
import { material, plain } from './materials.js';
import { bx, cy, sp, leg4, SOIL, WHITE, BLACK, BRASS, CHROME, GLASS, SCREEN, SHADE, PAPER } from './mk.js';
import { EXT } from './models_ext.js';

export const GLOW = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xffd890, emissiveIntensity: 1.8, roughness: 0.4 });
const LEAF = plain(0x2f6b3a, 0.8, 0), LEAF2 = plain(0x3f8a45, 0.8, 0), LEAF3 = plain(0x1f5a30, 0.8, 0);

function plantBody(g, pot, w, d, h, kind) {
  const r = Math.min(w, d) / 2, ph = h * 0.28;
  cy(g, pot, r * 0.95, r * 0.7, ph, 0, 0, 0, 20); cy(g, SOIL, r * 0.85, r * 0.85, 0.02, 0, ph - 0.01, 0, 16);
  if (kind === 'palm') {
    cy(g, plain(0x6b4b2c, 1, 0), 0.025, 0.035, h * 0.55, 0, ph, 0, 8);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, f = new THREE.Mesh(new THREE.ConeGeometry(0.07, h * 0.5, 4), i % 2 ? LEAF : LEAF2); f.scale.z = 0.25; f.position.set(Math.cos(a) * h * 0.14, ph + h * 0.58, Math.sin(a) * h * 0.14); f.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15); g.add(f); }
    return;
  }
  const n = kind === 'big' ? 7 : 5;
  for (let i = 0; i < n; i++) { const a = i * 2.4, rr = r * 0.55 * ((i % 3) / 3 + 0.3), yy = ph + (h - ph) * (0.25 + 0.7 * (i / n)); sp(g, [LEAF, LEAF2, LEAF3][i % 3], r * (0.8 - i * 0.04) + 0.05, Math.cos(a) * rr, yy, Math.sin(a) * rr, 1, 0.8, 1); }
  cy(g, plain(0x5a4028, 1, 0), 0.015, 0.02, (h - ph) * 0.6, 0, ph, 0, 6);
}

export const B = {
  /* ---------------- seating ---------------- */
  sofa3(g, w, d, h, m) {
    const f = m('seat'), l = m('leg'), aw = 0.18, n = w > 1.9 ? 3 : 2;
    leg4(g, l, w, d, 0.12, 0.1); bx(g, f, w, 0.22, d, 0, 0.12, 0);
    for (const s of [-1, 1]) bx(g, f, aw, 0.32, d, s * (w / 2 - aw / 2), 0.34, 0);
    const cw = (w - 2 * aw) / n; for (let i = 0; i < n; i++) { bx(g, f, cw - 0.01, 0.13, d * 0.72, -((w - 2 * aw) / 2) + cw * (i + 0.5), 0.34, d * 0.12); bx(g, f, cw - 0.04, h - 0.46, 0.17, -((w - 2 * aw) / 2) + cw * (i + 0.5), 0.47, -d / 2 + 0.27, -0.18); }
    bx(g, f, w, h - 0.34, 0.12, 0, 0.34, -d / 2 + 0.06);
  },
  armchair(g, w, d, h, m) {
    const f = m('seat'), l = m('leg'), aw = 0.14; leg4(g, l, w, d, 0.14, 0.09); bx(g, f, w, 0.2, d, 0, 0.14, 0);
    for (const s of [-1, 1]) bx(g, f, aw, 0.3, d, s * (w / 2 - aw / 2), 0.34, 0); bx(g, f, w - 2 * aw, 0.13, d * 0.72, 0, 0.34, d * 0.1); bx(g, f, w - 2 * aw, h - 0.3, 0.14, 0, 0.34, -d / 2 + 0.1, -0.15); bx(g, f, w, h - 0.34, 0.1, 0, 0.34, -d / 2 + 0.05);
  },
  dchair(g, w, d, h, m) { const wd = m('wood'), f = m('seat'); leg4(g, wd, w, d, 0.45, 0.03, 0.02); bx(g, f, w, 0.06, d, 0, 0.45, 0); bx(g, wd, w, h - 0.51, 0.04, 0, 0.51, -d / 2 + 0.03); bx(g, f, w - 0.08, 0.2, 0.02, 0, 0.62, -d / 2 + 0.06); },
  stool(g, w, d, h, m) { cy(g, m('seat'), w / 2, w / 2, 0.08, 0, h - 0.08, 0, 18); leg4(g, m('leg'), w, d, h - 0.08, 0.05, 0.018); },
  bench(g, w, d, h, m) { bx(g, m('seat'), w, 0.1, d, 0, h - 0.1, 0); leg4(g, m('leg'), w, d, h - 0.1, 0.05, 0.025); },
  officechair(g, w, d, h, m) { const f = m('seat'); cy(g, CHROME, 0.02, 0.02, 0.4, 0, 0.05, 0, 8); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; bx(g, BLACK, 0.3, 0.03, 0.04, Math.cos(a) * 0.15, 0.04, Math.sin(a) * 0.15).rotation.y = -a; } bx(g, f, w * 0.85, 0.1, d * 0.8, 0, 0.45, 0.02); bx(g, f, w * 0.8, h - 0.58, 0.08, 0, 0.55, -d * 0.36); },
  /* ---------------- beds ---------------- */
  bed(g, w, d, h, m) {
    const fr = m('frame'), bd = m('bedding'); bx(g, fr, w + 0.06, 0.28, d + 0.04, 0, 0.08, 0); bx(g, bd, w, 0.2, d - 0.08, 0, 0.36, 0.03);
    bx(g, fr, w + 0.08, h - 0.08, 0.07, 0, 0.08, -d / 2 - 0.02);
    const pw = w > 1.3 ? w / 2 - 0.1 : w - 0.2; for (let i = 0; i < (w > 1.3 ? 2 : 1); i++) bx(g, plain(0xf6f4ef, 0.9, 0), pw, 0.12, 0.38, (w > 1.3 ? (i ? 1 : -1) * (w / 4) : 0), 0.56, -d / 2 + 0.34);
    bx(g, bd, w + 0.02, 0.05, d * 0.5, 0, 0.55, d * 0.2); bx(g, m('throw'), w + 0.03, 0.04, 0.42, 0, 0.56, d * 0.28);
  },
  /* ---------------- tables ---------------- */
  dining(g, w, d, h, m) {
    const wd = m('top'), f = m('seat'), per = Math.max(2, Math.round(w / 0.6)), tw = w, td = d - 1.0;
    bx(g, wd, tw, 0.05, td, 0, 0.7, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, wd, 0.06, 0.7, 0.06, sx * (tw / 2 - 0.1), 0, sz * (td / 2 - 0.1));
    const cw = 0.44; for (const side of [-1, 1]) for (let i = 0; i < per; i++) { const cx = -tw / 2 + (i + 0.5) * (tw / per), c = new THREE.Group(); B.dchair(c, cw, 0.46, 0.9, (s) => s === 'seat' ? f : wd); c.position.set(cx, 0, side * (td / 2 + 0.3)); c.rotation.y = side > 0 ? Math.PI : 0; g.add(c); }
  },
  coffee(g, w, d, h, m) { bx(g, m('top'), w, 0.05, d, 0, h - 0.05, 0); bx(g, m('top'), w - 0.1, 0.03, d - 0.1, 0, 0.14, 0); leg4(g, m('leg'), w, d, h - 0.05, 0.05, 0.02); },
  side(g, w, d, h, m) { cy(g, m('top'), w / 2, w / 2, 0.04, 0, h - 0.04, 0, 20); cy(g, m('leg'), 0.02, 0.02, h - 0.04, 0, 0, 0, 8); cy(g, m('leg'), w / 2.4, w / 2.4, 0.02, 0, 0, 0, 20); },
  console(g, w, d, h, m) { bx(g, m('top'), w, 0.04, d, 0, h - 0.04, 0); bx(g, m('top'), w - 0.06, 0.03, d - 0.06, 0, 0.25, 0); leg4(g, m('leg'), w, d, h - 0.04, 0.04, 0.02); },
  desk(g, w, d, h, m) {
    bx(g, m('top'), w, 0.04, d, 0, h - 0.04, 0); bx(g, m('leg'), 0.04, h - 0.04, d - 0.06, -w / 2 + 0.04, 0, 0); bx(g, m('top'), 0.4, h - 0.04, d - 0.06, w / 2 - 0.22, 0, 0);
    for (let i = 0; i < 3; i++) bx(g, BRASS, 0.12, 0.012, 0.012, w / 2 - 0.22, 0.12 + i * 0.22, d / 2 - 0.02);
    bx(g, SCREEN, 0.6, 0.34, 0.02, -0.1, h + 0.12, -0.1); cy(g, BLACK, 0.02, 0.02, 0.12, -0.1, h, -0.1, 8); bx(g, BLACK, 0.42, 0.012, 0.14, -0.1, h, 0.15);
  },
  sideboard(g, w, d, h, m) { bx(g, m('body'), w, h - 0.12, d, 0, 0.12, 0); leg4(g, m('leg'), w, d, 0.12, 0.06, 0.02); for (let i = 1; i < 3; i++) bx(g, BLACK, 0.012, h - 0.2, 0.005, -w / 2 + i * w / 3, 0.16, d / 2 + 0.002); for (let i = 0; i < 3; i++) bx(g, BRASS, 0.1, 0.014, 0.014, -w / 3 + i * w / 3, h * 0.55, d / 2 + 0.01); },
  tvunit(g, w, d, h, m) {
    const bh = 0.45; bx(g, m('body'), w, bh - 0.1, d, 0, 0.1, 0); leg4(g, m('leg'), w, d, 0.1, 0.06, 0.02); bx(g, BLACK, 0.012, bh - 0.16, 0.005, 0, 0.13, d / 2 + 0.002);
    const tw = Math.min(1.25, w * 0.85), th = tw * 0.5625; bx(g, SCREEN, tw, th, 0.04, 0, bh + 0.08, 0); cy(g, BLACK, 0.01, 0.01, 0.08, 0, bh, 0, 6); bx(g, BLACK, 0.3, 0.015, 0.12, 0, bh, 0);
  },
  island(g, w, d, h, m) { bx(g, m('body'), w - 0.1, h - 0.04, d - 0.1, 0, 0, 0); bx(g, m('top'), w, 0.05, d, 0, h - 0.05, 0); bx(g, m('top'), w, 0.04, 0.24, 0, h - 0.04, d / 2 + 0.05); },
  /* ---------------- storage ---------------- */
  wardrobe(g, w, d, h, m) {
    const wd = m('body'), n = Math.max(2, Math.round(w / 0.6)); bx(g, wd, w, h, d, 0, 0, 0); for (let i = 1; i < n; i++) bx(g, BLACK, 0.008, h - 0.1, 0.004, -w / 2 + i * w / n, 0.05, d / 2 + 0.002);
    for (let i = 0; i < n; i++) bx(g, BRASS, 0.012, 0.22, 0.02, -w / 2 + (i + 0.5) * w / n + (i % 2 ? -0.05 : 0.05), h * 0.5, d / 2 + 0.01); bx(g, BLACK, w, 0.06, d, 0, 0, 0.0);
  },
  dresser(g, w, d, h, m) { bx(g, m('body'), w, h - 0.1, d, 0, 0.1, 0); leg4(g, m('leg'), w, d, 0.1, 0.05, 0.02); for (let r = 0; r < 3; r++) { bx(g, BLACK, w - 0.06, 0.006, 0.004, 0, 0.2 + r * 0.22, d / 2 + 0.002); bx(g, BRASS, 0.12, 0.014, 0.02, 0, 0.3 + r * 0.22, d / 2 + 0.01); } },
  bookcase(g, w, d, h, m) {
    const wd = m('body'); bx(g, wd, 0.03, h, d, -w / 2 + 0.015, 0, 0); bx(g, wd, 0.03, h, d, w / 2 - 0.015, 0, 0); bx(g, wd, w, h, 0.02, 0, 0, -d / 2 + 0.01); const rows = Math.max(3, Math.round(h / 0.38));
    const cols = [0xb23a3a, 0x2f5d8a, 0xd9b44a, 0x3d7a4f, 0x7a4a2b, 0xe8e2d4, 0x222222];
    for (let r = 0; r <= rows; r++) { const y = r * (h - 0.03) / rows; bx(g, wd, w, 0.03, d, 0, y, 0); if (r < rows) { let x = -w / 2 + 0.06; let k = r * 3; while (x < w / 2 - 0.1 && r % 3 !== 2) { const bw = 0.025 + ((k * 7) % 4) * 0.01, bh = 0.2 + ((k * 5) % 4) * 0.03; bx(g, plain(cols[k % cols.length], 0.8, 0), bw, bh, d * 0.7, x + bw / 2, y + 0.03, 0); x += bw + 0.004; k++; } } }
  },
  shoerack(g, w, d, h, m) { for (let i = 0; i < 3; i++) bx(g, m('body'), w, 0.025, d, 0, 0.1 + i * 0.17, 0); bx(g, m('body'), 0.025, h, d, -w / 2, 0, 0); bx(g, m('body'), 0.025, h, d, w / 2, 0, 0); for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) bx(g, BLACK, 0.12, 0.07, 0.26, -0.18 + k * 0.36, 0.125 + i * 0.17, 0); },
  filing(g, w, d, h, m) { bx(g, m('body'), w, h, d, 0, 0, 0); for (let i = 0; i < 3; i++) { bx(g, BLACK, w - 0.04, 0.006, 0.004, 0, 0.1 + i * 0.22, d / 2 + 0.002); bx(g, CHROME, 0.14, 0.02, 0.02, 0, 0.18 + i * 0.22, d / 2 + 0.01); } },
  shelf(g, w, d, h, m) { bx(g, m('body'), w, 0.035, d, 0, 0, 0); for (const s of [-1, 1]) bx(g, BLACK, 0.02, 0.18, d * 0.8, s * (w / 2 - 0.1), -0.18, 0); bx(g, plain(0x7a6a52, 0.9, 0), 0.2, 0.18, 0.15, -0.2, 0.035, 0); sp(g, WHITE, 0.07, 0.15, 0.1, 0, 1, 1.4, 1); },
  hamper(g, w, d, h, m) { cy(g, m('body'), w / 2, w / 2 * 0.9, h, 0, 0, 0, 18); cy(g, plain(0xe8e4dc, 0.9, 0), w / 2 * 0.96, w / 2 * 0.96, 0.03, 0, h - 0.02, 0, 18); },
  /* ---------------- decor ---------------- */
  wallart(g, w, d, h, m) { bx(g, m('frame'), w, h, d, 0, 0, 0); const cs = [0x2f5d8a, 0xe9a23b, 0x3d7a4f, 0xc2603c]; bx(g, PAPER, w - 0.1, h - 0.1, d * 0.5, 0, 0.05, d * 0.3); bx(g, plain(cs[(w * 10 | 0) % 4], 0.9, 0), (w - 0.1) * 0.8, (h - 0.1) * 0.45, d * 0.5, 0, 0.07 + (h - 0.1) * 0.35, d * 0.32); sp(g, plain(cs[((w * 10 | 0) + 2) % 4], 0.9, 0), (h - 0.1) * 0.2, (w - 0.1) * 0.2, h * 0.34, d * 0.6, 1, 1, 0.1); },
  mirror(g, w, d, h, m) { bx(g, m('frame'), w, h, d, 0, 0, 0); bx(g, plain(0xdde8ec, 0.04, 0.9), w - 0.08, h - 0.08, d * 0.5, 0, 0.04, d * 0.6); },
  clock(g, w, d, h, m) { cy(g, m('frame'), w / 2, w / 2, d, 0, 0, 0, 24).rotation.x = Math.PI / 2; g.children[g.children.length - 1].position.set(0, h / 2, 0); const f = new THREE.Mesh(new THREE.CircleGeometry(w / 2 - 0.02, 24), PAPER); f.position.set(0, h / 2, d / 2 + 0.002); g.add(f); bx(g, BLACK, 0.012, w * 0.3, 0.004, 0, h / 2, d / 2 + 0.006); bx(g, BLACK, w * 0.22, 0.012, 0.004, w * 0.08, h / 2, d / 2 + 0.006); },
  vase(g, w, d, h, m) { const p = m('pot'); cy(g, p, w * 0.28, w * 0.2, h * 0.5, 0, 0, 0, 14); sp(g, p, w * 0.32, 0, h * 0.4, 0, 1, 1.1, 1); cy(g, p, w * 0.14, w * 0.2, h * 0.22, 0, h * 0.58, 0, 14); for (let i = 0; i < 3; i++) { cy(g, LEAF, 0.004, 0.004, h * 0.5, (i - 1) * 0.03, h * 0.78, 0, 5).rotation.z = (i - 1) * 0.3; sp(g, [plain(0xe8556a, 0.8, 0), plain(0xf2c230, 0.8, 0), plain(0xffffff, 0.8, 0)][i], 0.035, (i - 1) * 0.1, h * 1.0 + 0.04, 0, 1, 0.7, 1); } },
  bowl(g, w, d, h, m) { const p = m('pot'); const b = new THREE.Mesh(new THREE.SphereGeometry(w / 2, 16, 8, 0, 6.283, 0, 1.57), p); b.rotation.x = Math.PI; b.position.y = h; b.scale.y = h / (w / 2); g.add(b); for (let i = 0; i < 4; i++) sp(g, [plain(0xe8553a, .7, 0), plain(0xf2c230, .7, 0), plain(0x7fb04a, .7, 0), plain(0xe8553a, .7, 0)][i], 0.045, (i % 2 - 0.5) * 0.1, h * 0.8, (i > 1 ? 0.05 : -0.05)); },
  books(g, w, d, h, m) { const cs = [0x2f5d8a, 0xe9a23b, 0xb23a3a]; for (let i = 0; i < 3; i++) bx(g, plain(cs[i], 0.85, 0), w * (0.9 - i * 0.12), h / 3, d * (0.9 - i * 0.1), (i % 2) * 0.02, i * h / 3, 0).rotation.y = i * 0.15; },
  candles(g, w, d, h, m) { for (let i = 0; i < 3; i++) { cy(g, WHITE, 0.025, 0.025, h * (0.5 + i * 0.25), (i - 1) * 0.08, 0, (i % 2) * 0.03, 10); sp(g, plain(0xffd27a, 0.5, 0), 0.012, (i - 1) * 0.08, h * (0.5 + i * 0.25) + 0.02, (i % 2) * 0.03, 1, 1.6, 1); } },
  basket(g, w, d, h, m) { cy(g, m('body'), w / 2, w / 2 * 0.85, h, 0, 0, 0, 20); cy(g, plain(0xe8e4dc, 0.95, 0), w / 2 * 0.9, w / 2 * 0.9, 0.04, 0, h - 0.05, 0, 20); },
  /* ---------------- lighting ---------------- */
  ceilingfan(g, w, d, h, m) { cy(g, m('body'), 0.02, 0.02, 0.35, 0, h - 0.35, 0, 8); cy(g, m('body'), 0.09, 0.09, 0.1, 0, h - 0.45, 0, 16); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, b = bx(g, m('blade'), 0.5, 0.012, 0.16, Math.cos(a) * 0.38, h - 0.43, Math.sin(a) * 0.38); b.rotation.y = -a; } cy(g, SHADE, 0.1, 0.1, 0.07, 0, h - 0.54, 0, 16); },
  pendant(g, w, d, h, m) { cy(g, BLACK, 0.006, 0.006, h * 0.6, 0, h * 0.4, 0, 6); const s = new THREE.Mesh(new THREE.ConeGeometry(w / 2, h * 0.3, 20, 1, true), m('shade')); s.material = m('shade'); s.position.y = h * 0.28; s.rotation.x = Math.PI; g.add(s); sp(g, plain(0xfff2c8, 0.5, 0), 0.07, 0, h * 0.28, 0); },
  chandelier(g, w, d, h, m) { cy(g, BRASS, 0.008, 0.008, h * 0.5, 0, h * 0.5, 0, 6); cy(g, BRASS, w * 0.06, w * 0.06, 0.1, 0, h * 0.42, 0, 10); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; bx(g, BRASS, w * 0.45, 0.012, 0.012, Math.cos(a) * w * 0.22, h * 0.42, Math.sin(a) * w * 0.22).rotation.y = -a; sp(g, plain(0xfff2c8, 0.5, 0), 0.04, Math.cos(a) * w * 0.45, h * 0.46, Math.sin(a) * w * 0.45); } },
  chand_crystal(g, w, d, h, m) { const f = m('frame'); cy(g, f, 0.008, 0.008, h * 0.45, 0, h * 0.55, 0, 6); cy(g, f, w * 0.07, w * 0.12, 0.14, 0, h * 0.42, 0, 12); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, x = Math.cos(a) * w * 0.34, z = Math.sin(a) * w * 0.34; bx(g, f, w * 0.34, 0.012, 0.012, x / 2, h * 0.4, z / 2).rotation.y = -a; cy(g, f, 0.01, 0.01, 0.1, x, h * 0.4, z, 6); sp(g, GLOW, 0.032, x, h * 0.52, z, 1, 1.5, 1); for (let k = 0; k < 4; k++) cy(g, m('glass'), 0.004, 0.012, 0.12 + k * 0.03, x * (0.5 + k * 0.15), h * 0.4 - 0.12 - k * 0.03, z * (0.5 + k * 0.15), 6); } sp(g, m('glass'), w * 0.1, 0, h * 0.28, 0, 1, 1.4, 1); },
  chand_modern(g, w, d, h, m) { const f = m('frame'); for (const s of [-1, 1]) cy(g, f, 0.004, 0.004, h * 0.55, s * w * 0.2, h * 0.45, 0, 4); const r = new THREE.Mesh(new THREE.TorusGeometry(w * 0.45, 0.012, 8, 40), f); r.rotation.x = Math.PI / 2; r.position.y = h * 0.42; g.add(r); const r2 = new THREE.Mesh(new THREE.TorusGeometry(w * 0.3, 0.012, 8, 32), GLOW); r2.rotation.x = Math.PI / 2; r2.position.y = h * 0.4; g.add(r2); },
  chand_rustic(g, w, d, h, m) { for (const s of [-1, 1]) cy(g, m('iron'), 0.005, 0.005, h * 0.5, s * w * 0.15, h * 0.5, 0, 4); const r = new THREE.Mesh(new THREE.TorusGeometry(w * 0.42, 0.035, 8, 36), m('wood')); r.rotation.x = Math.PI / 2; r.position.y = h * 0.4; g.add(r); bx(g, m('wood'), w * 0.84, 0.04, 0.04, 0, h * 0.4, 0); bx(g, m('wood'), 0.04, 0.04, w * 0.84, 0, h * 0.4, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, x = Math.cos(a) * w * 0.42, z = Math.sin(a) * w * 0.42; cy(g, m('iron'), 0.012, 0.012, 0.1, x, h * 0.4 + 0.03, z, 6); sp(g, GLOW, 0.03, x, h * 0.4 + 0.17, z, 1, 1.4, 1); } },
  pendant_cluster(g, w, d, h, m) { cy(g, BLACK, 0.05, 0.05, 0.03, 0, h - 0.03, 0, 14); [[-0.22, 0.45], [0.2, 0.3], [0, 0.6]].forEach(([x, k], i) => { const z = i === 2 ? 0.14 : -0.06; cy(g, BLACK, 0.004, 0.004, h * k, x * w, h - h * k - 0.03, z, 4); const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), m('shade')); s.position.set(x * w, h - h * k - 0.1, z); g.add(s); sp(g, GLOW, 0.04, x * w, h - h * k - 0.1, z, 1, 1, 1); }); },
  downlight(g, w, d, h, m) { cy(g, m('trim'), w / 2, w / 2, 0.012, 0, h - 0.012, 0, 20); cy(g, GLOW, w * 0.36, w * 0.36, 0.006, 0, h - 0.018, 0, 20); },
  domelight(g, w, d, h, m) { const s = new THREE.Mesh(new THREE.SphereGeometry(w / 2, 24, 10, 0, 6.283, 0, 1.57), m('shell')); s.rotation.x = Math.PI; s.position.y = h - 0.02; s.scale.y = 0.5; g.add(s); cy(g, GLOW, w * 0.3, w * 0.3, 0.01, 0, h - 0.045, 0, 16); },
  tracklight(g, w, d, h, m) { bx(g, m('track'), w, 0.025, 0.03, 0, h - 0.025, 0); for (let i = 0; i < 3; i++) { const x = (i - 1) * w * 0.32; cy(g, m('track'), 0.005, 0.005, 0.08, x, h - 0.1, 0, 4); const c = cy(g, m('track'), 0.035, 0.045, 0.11, x, h - 0.2, 0.02, 10); c.rotation.x = 0.4; cy(g, GLOW, 0.03, 0.03, 0.005, x, h - 0.26, 0.04, 10).rotation.x = 0.4; } },
  sconce(g, w, d, h, m) { bx(g, m('body'), 0.08, 0.14, 0.015, 0, h * 0.2, -d / 2 + 0.01); const arm = bx(g, m('body'), 0.02, 0.02, 0.09, 0, h * 0.28, -d / 2 + 0.06); const s = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.17, 16, 1, true), SHADE); s.position.set(0, h * 0.52, -d / 2 + 0.09); g.add(s); sp(g, GLOW, 0.032, 0, h * 0.5, -d / 2 + 0.09, 1, 1, 1); },
  inwall(g, w, d, h, m) { bx(g, m('trim'), w, h, 0.012, 0, 0, -d / 2 + 0.006); bx(g, GLOW, w * 0.7, h * 0.28, 0.006, 0, h * 0.36, -d / 2 + 0.014); },
  picturelight(g, w, d, h, m) { bx(g, m('body'), w, 0.025, 0.03, 0, h * 0.5, -d / 2 + 0.1); bx(g, m('body'), 0.025, 0.025, 0.1, 0, h * 0.5, -d / 2 + 0.05); bx(g, GLOW, w * 0.9, 0.008, 0.04, 0, h * 0.5 - 0.016, -d / 2 + 0.11); },
  bollard(g, w, d, h, m) { cy(g, m('body'), w * 0.4, w * 0.5, h * 0.85, 0, 0, 0, 14); cy(g, GLOW, w * 0.42, w * 0.42, h * 0.1, 0, h * 0.6, 0, 14); cy(g, m('body'), w * 0.5, w * 0.5, h * 0.06, 0, h * 0.94, 0, 14); },
  postlamp(g, w, d, h, m) { cy(g, m('body'), 0.04, 0.06, h * 0.85, 0, 0, 0, 10); bx(g, GLOW, 0.2, 0.28, 0.2, 0, h * 0.84, 0); bx(g, m('body'), 0.26, 0.04, 0.26, 0, h * 0.84 + 0.28, 0); const t = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.12, 4), m('body')); t.position.y = h * 0.84 + 0.36; t.rotation.y = Math.PI / 4; g.add(t); },
  floodlight(g, w, d, h, m) { cy(g, m('body'), 0.04, 0.05, h, 0, 0, 0, 8); const hd = bx(g, m('body'), 0.3, 0.18, 0.1, 0, h - 0.1, 0.06); hd.rotation.x = 0.35; bx(g, GLOW, 0.26, 0.14, 0.01, 0, h - 0.09, 0.12).rotation.x = 0.35; },
  stringlights(g, w, d, h, m) { for (const s of [-1, 1]) cy(g, m('body'), 0.03, 0.04, h, s * w / 2, 0, 0, 8); for (let i = 0; i <= 10; i++) { const t = i / 10, x = (t - 0.5) * w, y = h - 0.12 - Math.sin(t * Math.PI) * -0.0 - (4 * t * (1 - t)) * 0.3; sp(g, GLOW, 0.04, x, y, 0, 1, 1, 1); } bx(g, BLACK, w, 0.01, 0.01, 0, h - 0.06, 0); },
  lantern(g, w, d, h, m) { cy(g, m('body'), 0.015, 0.02, h, 0, 0, 0, 6); bx(g, m('body'), 0.3, 0.012, 0.012, 0.13, h - 0.02, 0); cy(g, m('body'), 0.004, 0.004, 0.1, 0.26, h - 0.12, 0, 4); bx(g, GLOW, 0.1, 0.16, 0.1, 0.26, h - 0.28, 0); bx(g, m('body'), 0.13, 0.02, 0.13, 0.26, h - 0.12, 0); },
  floorlamp(g, w, d, h, m) { cy(g, BLACK, w * 0.3, w * 0.3, 0.025, 0, 0, 0, 16); cy(g, m('body'), 0.012, 0.012, h - 0.3, 0, 0.02, 0, 6); cy(g, SHADE, w * 0.35, w * 0.5, 0.3, 0, h - 0.32, 0, 20); },
  tablelamp(g, w, d, h, m) { cy(g, m('body'), w * 0.22, w * 0.3, h * 0.45, 0, 0, 0, 14); cy(g, SHADE, w * 0.3, w * 0.48, h * 0.5, 0, h * 0.48, 0, 18); },
  /* ---------------- plants ---------------- */
  plant_big(g, w, d, h, m) { plantBody(g, m('pot'), w, d, h, 'big'); },
  plant_med(g, w, d, h, m) { plantBody(g, m('pot'), w, d, h, 'med'); },
  plant_small(g, w, d, h, m) { plantBody(g, m('pot'), w, d, h, 'med'); },
  palm(g, w, d, h, m) { plantBody(g, m('pot'), w, d, h, 'palm'); },
  /* ---------------- rugs and curtains ---------------- */
  rug(g, w, d, h, m) { const o = bx(g, m('rug'), w, 0.015, d, 0, 0, 0); bx(g, m('rug'), w - 0.1, 0.004, d - 0.1, 0, 0.015, 0); },
  curtains(g, w, d, h, m) {
    const f = m('fabric'), pw = Math.min(0.45, w * 0.28); bx(g, BLACK, w + 0.1, 0.02, 0.02, 0, h, 0); for (const s of [-1, 1]) for (let i = 0; i < 5; i++) bx(g, f, pw / 5 * 0.85, h - 0.02, 0.05 + (i % 2) * 0.025, s * (w / 2 - pw / 2) + (i - 2) * pw / 5, 0, 0);
    bx(g, plain(0xf2efe8, 0.95, 0, { t: 0.55 }), w - 2 * pw + 0.04, h * 0.7, 0.01, 0, h * 0.2, -0.02);
  },
  /* ---------------- kitchen ---------------- */
  kcab(g, w, d, h, m) { bx(g, m('body'), w - 0.01, h - 0.05, d, 0, 0.08, 0); bx(g, BLACK, w, 0.08, d - 0.05, 0, 0, -0.02); bx(g, m('top'), w + 0.01, 0.04, d + 0.03, 0, h - 0.04, 0.01); bx(g, BLACK, w - 0.06, 0.006, 0.004, 0, 0.45, d / 2 + 0.002); bx(g, CHROME, 0.14, 0.014, 0.02, 0, h - 0.18, d / 2 + 0.012); },
  ucab(g, w, d, h, m) { bx(g, m('body'), w - 0.01, h, d, 0, 0, 0); bx(g, BLACK, 0.006, h - 0.1, 0.004, 0, 0.05, d / 2 + 0.002); bx(g, CHROME, 0.014, 0.12, 0.02, 0.06, h * 0.2, d / 2 + 0.012); },
  hood(g, w, d, h, m) { const c = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w * 0.5, h * 0.4, 4, 1), m('body')); c.rotation.y = Math.PI / 4; c.scale.set(1, 1, d / w); c.position.y = h * 0.2; g.add(c); bx(g, m('body'), w * 0.25, h * 0.6, d * 0.25, 0, h * 0.4, -d * 0.25); },
  microwave(g, w, d, h, m) { bx(g, plain(0xd8dadd, 0.3, 0.7), w, h, d, 0, 0, 0); bx(g, SCREEN, w * 0.62, h * 0.7, 0.01, -w * 0.12, h * 0.15, d / 2 + 0.003); bx(g, BLACK, w * 0.18, h * 0.7, 0.01, w * 0.34, h * 0.15, d / 2 + 0.003); },
  kettle(g, w, d, h, m) { cy(g, plain(0xd8dadd, 0.2, 0.8), w / 2, w / 2 * 1.1, h * 0.7, 0, 0, 0, 16); cy(g, BLACK, w * 0.3, w * 0.4, h * 0.3, 0, h * 0.7, 0, 12); bx(g, BLACK, 0.02, h * 0.5, 0.06, w * 0.55, h * 0.3, 0); },
  /* ---------------- bath ---------------- */
  towelrail(g, w, d, h, m) { for (const s of [-1, 1]) bx(g, CHROME, 0.02, 0.03, d, s * w / 2, h * 0.5, 0); for (let i = 0; i < 3; i++) bx(g, CHROME, w, 0.014, 0.014, 0, h * 0.5 + i * 0.12 - 0.12, d); bx(g, [WHITE, plain(0x8cc3e6, 0.9, 0), plain(0xe8d9b0, .9, 0)][1], w * 0.8, 0.5, 0.025, 0, h * 0.5 - 0.35, d + 0.02); },
  bathmat(g, w, d, h, m) { bx(g, m('rug'), w, 0.015, d, 0, 0, 0); },
  /* ---------------- garage ---------------- */
  car(g, w, d, h, m) {
    const bo = m('body'); const L = d, W = w;     // model built long along z (front of car at +z)
    bx(g, bo, W, h * 0.36, L, 0, 0.18, 0); bx(g, bo, W * 0.92, h * 0.34, L * 0.5, 0, 0.18 + h * 0.36, -L * 0.04); bx(g, GLASS, W * 0.9, h * 0.26, L * 0.46, 0, 0.18 + h * 0.4, -L * 0.04);
    bx(g, bo, W * 0.9, h * 0.04, L * 0.46, 0, 0.18 + h * 0.7, -L * 0.04);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const wl = cy(g, BLACK, 0.31, 0.31, 0.22, sx * (W / 2 - 0.08), 0.0, sz * L * 0.31, 20); wl.rotation.z = Math.PI / 2; wl.position.y = 0.31; }
    for (const sx of [-1, 1]) { bx(g, plain(0xfff4cc, 0.2, 0), 0.3, 0.1, 0.03, sx * W * 0.34, 0.5, L / 2 + 0.005); bx(g, plain(0xaa1111, 0.4, 0), 0.3, 0.1, 0.03, sx * W * 0.34, 0.5, -L / 2 - 0.005); }
    bx(g, BLACK, W * 0.6, 0.08, 0.03, 0, 0.3, L / 2 + 0.005);
  },
  bike(g, w, d, h, m) { for (const s of [-1, 1]) { const wl = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 8, 22), BLACK); wl.rotation.y = Math.PI / 2; wl.position.set(0, 0.35, s * 0.55); g.add(wl); } bx(g, m('body'), 0.03, 0.03, 1.0, 0, 0.55, 0).rotation.x = 0.0; bx(g, m('body'), 0.03, 0.45, 0.03, 0, 0.4, 0.2); bx(g, BLACK, 0.4, 0.03, 0.03, 0, 0.95, 0.5); bx(g, BLACK, 0.1, 0.04, 0.2, 0, 0.9, -0.2); },
  shelving(g, w, d, h, m) { for (const s of [-1, 1]) bx(g, m('body'), 0.04, h, d, s * (w / 2 - 0.02), 0, 0); for (let i = 0; i < 4; i++) { bx(g, m('body'), w, 0.03, d, 0, 0.1 + i * (h - 0.15) / 3, 0); bx(g, plain([0x2f5d8a, 0xb23a3a, 0x666666, 0xc79b4a][i], 0.8, 0), 0.4, 0.25, 0.28, -0.3 + (i % 2) * 0.5, 0.13 + i * (h - 0.15) / 3, 0); } },
  workbench(g, w, d, h, m) { bx(g, m('top'), w, 0.06, d, 0, h - 0.06, 0); leg4(g, m('body'), w, d, h - 0.06, 0.05, 0.04); bx(g, m('body'), w - 0.1, 0.03, d - 0.1, 0, 0.25, 0); bx(g, plain(0xaa2222, 0.5, 0), 0.3, 0.14, 0.18, -w / 4, h, 0); },
  /* ---------------- fixtures (appliances and sanitaryware) ---------------- */
  toilet(g, w, d, h, m) { cy(g, WHITE, 0.15, 0.12, h * 0.9, 0, 0, d * 0.12, 18).scale.z = 1.3; bx(g, WHITE, w * 0.7, h * 0.95, d * 0.28, 0, 0, -d / 2 + 0.14); bx(g, WHITE, w * 0.72, 0.04, d * 0.3, 0, h * 0.95, -d / 2 + 0.14); bx(g, CHROME, 0.04, 0.015, 0.04, 0, h * 0.99 + 0.04, -d / 2 + 0.14); },
  basin(g, w, d, h, m) { bx(g, m('body'), w, h - 0.12, d, 0, 0, 0); bx(g, m('top'), w + 0.02, 0.04, d + 0.02, 0, h - 0.12, 0); const b = new THREE.Mesh(new THREE.SphereGeometry(w * 0.34, 16, 8, 0, 6.283, 0, 1.57), WHITE); b.scale.set(1, 0.35, 0.9); b.position.set(0, h - 0.07, 0.02); b.rotation.x = Math.PI; b.position.y = h - 0.075 + 0.07 * 0; g.add(b); cy(g, CHROME, 0.012, 0.012, 0.16, 0, h - 0.08, -d * 0.32, 8); bx(g, CHROME, 0.02, 0.012, 0.1, 0, h + 0.07, -d * 0.28); },
  shower(g, w, d, h, m) { bx(g, WHITE, w, 0.08, d, 0, 0, 0); bx(g, plain(0xb8b8b4, 0.5, 0), w - 0.14, 0.01, d - 0.14, 0, 0.08, 0); bx(g, GLASS, 0.015, 1.95, d, w / 2 - 0.01, 0, 0); bx(g, GLASS, w, 1.95, 0.015, 0, 0, d / 2 - 0.01); bx(g, CHROME, 0.02, 0.04, d, w / 2 - 0.01, 1.95, 0); bx(g, CHROME, w, 0.04, 0.02, 0, 1.95, d / 2 - 0.01); cy(g, CHROME, 0.01, 0.01, 0.9, -w / 2 + 0.08, 1.2, -d / 2 + 0.08, 6); cy(g, CHROME, 0.08, 0.08, 0.02, -w / 2 + 0.08, 2.1, -d / 2 + 0.2, 14); },
  ksink(g, w, d, h, m) { bx(g, m('body'), w, h - 0.05, d, 0, 0, 0); bx(g, m('top'), w + 0.02, 0.04, d + 0.03, 0, h - 0.04, 0.01); bx(g, plain(0xb4b7ba, 0.25, 0.9), w * 0.5, 0.01, d * 0.7, -w * 0.12, h, 0); bx(g, CHROME, 0.03, 0.2, 0.03, w * 0.22, h, -d * 0.3); bx(g, CHROME, 0.02, 0.02, 0.16, w * 0.22, h + 0.18, -d * 0.22); },
  cooker(g, w, d, h, m) { bx(g, plain(0xdcdee1, 0.3, 0.7), w, h, d, 0, 0, 0); bx(g, SCREEN, w * 0.86, h * 0.45, 0.01, 0, h * 0.12, d / 2 + 0.004); bx(g, BLACK, w, 0.015, d, 0, h, 0); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cy(g, plain(0x222222, 0.4, 0.6), 0.075, 0.075, 0.015, x * w * 0.24, h + 0.01, z * d * 0.22, 14); for (let i = 0; i < 4; i++) cy(g, BLACK, 0.015, 0.015, 0.02, -w * 0.3 + i * w * 0.2, h * 0.82, d / 2 + 0.012, 8).rotation.x = Math.PI / 2; },
  fridge(g, w, d, h, m) { const s = plain(0xd4d7da, 0.28, 0.7); bx(g, s, w, h, d, 0, 0, 0); bx(g, BLACK, w, 0.006, 0.004, 0, h * 0.66, d / 2 + 0.002); bx(g, CHROME, 0.02, h * 0.18, 0.03, -w * 0.38, h * 0.74, d / 2 + 0.02); bx(g, CHROME, 0.02, h * 0.3, 0.03, -w * 0.38, h * 0.3, d / 2 + 0.02); },
  counter(g, w, d, h, m) { B.kcab(g, w, d, h, m); },
  washer(g, w, d, h, m) { bx(g, WHITE, w, h, d, 0, 0, 0); cy(g, plain(0x30343a, 0.15, 0.4), w * 0.3, w * 0.3, 0.02, 0, h * 0.45, d / 2 + 0.005, 24).rotation.x = Math.PI / 2; bx(g, CHROME, w * 0.7, 0.006, 0.01, 0, h * 0.88, d / 2 + 0.004); },
  lsink(g, w, d, h, m) { B.ksink(g, w, d, h, m); },
  cabinet_wall: null
};

/* build one model. dims = {w,d,h}; slots = {slotName: {k, c}} */
export function aliasModel(key, tpl) { ALIAS[key] = ALIAS[tpl] || tpl; }
const ALIAS = { sofa2: 'sofa3', bed_q: 'bed', bed_k: 'bed', bed_s: 'bed', dining4: 'dining', dining6: 'dining', dining8: 'dining', rug_l: 'rug', rug_m: 'rug', rug_s: 'rug', runner: 'rug' };
const GLB = {};                                   // type -> loaded glTF scene template (see library/)
export function registerGlb(type, scene) { GLB[type] = scene; }
export function buildModel(type, dims, slots, variant) {
  const g = new THREE.Group(), key = ALIAS[type] || type, fn = EXT[key] || B[key];
  if (GLB[type]) { const o = GLB[type].clone(true); const bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new THREE.Vector3()); const k = Math.min(dims.w / (sz.x || 1), dims.h / (sz.y || 1), dims.d / (sz.z || 1)); o.scale.setScalar(k); bb.setFromObject(o); o.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); g.add(o); return g; }
  const m = (name) => { const s = slots && slots[name]; if (!s) return plain(0x888888, 0.8, 0); return material(s.k, s.c); };
  if (fn) fn(g, dims.w, dims.d, dims.h, m, variant || 0); else { bx(g, plain(0x999999, 0.8, 0), dims.w, dims.h, dims.d, 0, 0, 0); }
  return g;
}
