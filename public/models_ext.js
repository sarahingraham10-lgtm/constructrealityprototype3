/* ConstructReality Studio - detailed furniture, Caribbean pieces, outdoor and garden items.
   Same rules as models.js: centre on the floor, front toward +z, back at -z, sized by (w, d, h). m(slot) gives the client's chosen material. */
import * as THREE from 'three';
import { plain, material } from './materials.js';
import { rbx, bx, cy, sp, lathe, leg4, tube, SOIL, WHITE, BLACK, BRASS, CHROME, GLASS, SCREEN, SHADE, PAPER, LINEN, WATER, acc } from './mk.js';
import { houseplant, makeTree } from './flora.js';

const cushion = (g, mt, w, h, d, x, y, z, rx, ry, rz) => rbx(g, mt, w, h, d, x, y, z, Math.min(0.07, Math.min(w, h, d) * 0.42), 3, rx, ry, rz);
const pillow = (g, mt, w, h, d, x, y, z, rx, ry, rz) => rbx(g, mt, w, h, d, x, y, z, Math.min(w, h, d) * 0.46, 3, rx, ry, rz);
const arc = (g, mt, R, r, x, y, z, a0, a1, rot) => { const o = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, 40, a1 - a0), mt); o.position.set(x, y, z); o.rotation.z = a0; if (rot) { o.rotation.y = rot; } g.add(o); return o; };
const MATT = plain(0xf0eee8, 0.9, 0), TERRA = plain(0xb8643a, 0.85, 0), IRON = plain(0x1c1c1e, 0.6, 0.6), RATTAN = null;
const seeded = (v) => { let s = ((v || 1) * 9301 + 49297) % 233280; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

/* bed linen: mattress, sheet, duvet draped over the foot, turned-down fold, pillows, a throw across the foot */
function dress(g, w, d, y0, m, o) {
  o = o || {}; const bd = m('bedding'), th = m('throw'), top = y0, np = w > 1.3 ? 2 : 1, hz = -d / 2;
  cushion(g, MATT, w - 0.02, 0.24, d - 0.06, 0, top - 0.24, 0.0);
  cushion(g, LINEN, w - 0.0, 0.03, d - 0.05, 0, top - 0.015, 0, 0, 0, 0);
  const dl = d * 0.64, dz = hz + d * 0.34 + dl / 2 - 0.02;
  cushion(g, bd, w + 0.05, 0.1, dl, 0, top - 0.02, dz);
  for (const s of [-1, 1]) cushion(g, bd, 0.05, 0.3, dl - 0.04, s * (w / 2 + 0.02), top - 0.3, dz);
  cushion(g, bd, w + 0.05, 0.3, 0.05, 0, top - 0.3, dz + dl / 2 - 0.02);
  cushion(g, th || bd, w + 0.03, 0.075, 0.3, 0, top + 0.06, hz + d * 0.34 + 0.12, 0, 0, 0);          // turned-down fold
  const pw = np === 2 ? w / 2 - 0.08 : w - 0.22;
  for (let i = 0; i < np; i++) { const x = np === 2 ? (i ? 1 : -1) * (w / 4) : 0; pillow(g, LINEN, pw, 0.15, 0.46, x, top + 0.0, hz + 0.34, -0.18); if (o.euro !== false) pillow(g, acc(i ? 0xe4d6bd : 0xc9b79a), pw * 0.86, 0.5, 0.15, x, top + 0.12, hz + 0.1, -0.16); }
  if (w > 1.3) pillow(g, th || bd, 0.4, 0.28, 0.1, 0, top + 0.1, hz + 0.52, -0.5);
  cushion(g, th || bd, w + 0.04, 0.045, 0.42, 0, top + 0.08, d / 2 - 0.4 - 0.02);                    // throw
}
function bedFrame(g, w, d, h, fr, v) {
  const baseTop = 0.3; leg4(g, fr, w + 0.1, d + 0.06, 0.14, 0.05, 0.035);
  rbx(g, fr, w + 0.08, 0.2, d + 0.05, 0, 0.12, 0, 0.02, 2);
  const hb = h - 0.1;
  rbx(g, fr, w + 0.12, hb, 0.07, 0, 0.0, -d / 2 - 0.035, 0.025, 2);                                          // headboard
  if (v % 3 === 1) { for (let i = 0; i < Math.round(w / 0.12); i++) rbx(g, fr, 0.045, hb * 0.55, 0.04, -w / 2 + 0.07 + i * (w - 0.1) / Math.round(w / 0.12 - 1), baseTop + 0.15, -d / 2 + 0.01, 0.012, 1); }
  else { rbx(g, fr, w - 0.15, hb * 0.42, 0.03, 0, baseTop + 0.15, -d / 2 + 0.002, 0.015, 1); rbx(g, fr, w + 0.14, 0.07, 0.09, 0, hb - 0.05, -d / 2 - 0.035, 0.03, 2); }
  for (const s of [-1, 1]) { lathe(g, fr, [[0.001, 0], [0.04, 0.03], [0.025, 0.07], [0.03, 0.1], [0.001, 0.14]], s * (w / 2 + 0.05), hb - 0.04, -d / 2 - 0.035, 14); }
  rbx(g, fr, w + 0.08, 0.34, 0.06, 0, 0.0, d / 2 + 0.03, 0.02, 2);                                           // footboard
}
function wicker(g, mt, w, h, d, x, y, z) { return rbx(g, mt, w, h, d, x, y, z, 0.03, 2); }

export const EXT = {
  /* ---------------- seating ---------------- */
  sofa3(g, w, d, h, m) {
    const f = m('seat'), l = m('leg'), aw = 0.21, n = w > 2 ? 3 : 2, inner = w - 2 * aw, cw = inner / n;
    leg4(g, l, w - 0.04, d - 0.04, 0.13, 0.08, 0.03); rbx(g, f, w - 0.02, 0.18, d - 0.02, 0, 0.13, 0, 0.04, 2);
    for (const s of [-1, 1]) { rbx(g, f, aw, 0.4, d, s * (w / 2 - aw / 2), 0.2, 0, 0.07, 3); rbx(g, f, aw + 0.02, 0.1, d - 0.02, s * (w / 2 - aw / 2), 0.52, 0, 0.05, 3); }
    rbx(g, f, inner + 0.04, h - 0.3, 0.2, 0, 0.3, -d / 2 + 0.1, 0.07, 3);
    for (let i = 0; i < n; i++) { const x = -inner / 2 + cw * (i + 0.5); cushion(g, f, cw - 0.012, 0.17, d * 0.64, x, 0.31, d * 0.12); cushion(g, f, cw - 0.03, h - 0.5, 0.2, x, 0.42, -d / 2 + 0.31, -0.2); }
    pillow(g, acc(0xd9a441), 0.42, 0.42, 0.13, -inner / 2 + 0.2, 0.5, -d / 2 + 0.36, -0.28, 0.35); pillow(g, acc(0x2f7d78), 0.4, 0.4, 0.13, inner / 2 - 0.2, 0.5, -d / 2 + 0.36, -0.28, -0.3);
  },
  armchair(g, w, d, h, m) {
    const f = m('seat'), l = m('leg'), aw = 0.17; leg4(g, l, w - 0.04, d - 0.04, 0.14, 0.08, 0.03); rbx(g, f, w - 0.02, 0.17, d - 0.02, 0, 0.14, 0, 0.04, 2);
    for (const s of [-1, 1]) { rbx(g, f, aw, 0.36, d - 0.04, s * (w / 2 - aw / 2), 0.22, 0, 0.06, 3); rbx(g, f, aw + 0.02, 0.08, d - 0.06, s * (w / 2 - aw / 2), 0.54, 0, 0.04, 3); }
    rbx(g, f, w - 2 * aw + 0.04, h - 0.3, 0.18, 0, 0.3, -d / 2 + 0.09, 0.07, 3); cushion(g, f, w - 2 * aw - 0.01, 0.15, d * 0.68, 0, 0.31, d * 0.1); cushion(g, f, w - 2 * aw - 0.05, h - 0.5, 0.16, 0, 0.4, -d / 2 + 0.28, -0.22);
    pillow(g, acc(0xe9d9b6), 0.34, 0.34, 0.11, 0.1, 0.5, -d / 2 + 0.33, -0.3, 0.3);
  },
  dchair(g, w, d, h, m) {
    const wd = m('wood'), f = m('seat'), sy = 0.45;
    for (const sx of [-1, 1]) { lathe(g, wd, [[0.012, 0], [0.018, sy * 0.4], [0.024, sy]], sx * (w / 2 - 0.035), 0, d / 2 - 0.04, 10); rbx(g, wd, 0.035, h, 0.035, sx * (w / 2 - 0.035), 0, -d / 2 + 0.04, 0.012, 1, -0.06); }
    rbx(g, wd, w, 0.045, d, 0, sy - 0.045, 0, 0.018, 2); cushion(g, f, w - 0.04, 0.05, d - 0.05, 0, sy, 0.0);
    rbx(g, wd, w - 0.04, 0.08, 0.03, 0, h - 0.08, -d / 2 + 0.03, 0.02, 2); for (let i = 0; i < 3; i++) rbx(g, wd, 0.04, h - 0.62, 0.02, (i - 1) * (w / 3.2), sy + 0.06, -d / 2 + 0.035, 0.01, 1);
    rbx(g, wd, w - 0.05, 0.03, d - 0.08, 0, sy - 0.14, 0, 0.01, 1);
  },
  stool(g, w, d, h, m) { cushion(g, m('seat'), w, 0.08, d, 0, h - 0.08, 0); rbx(g, m('leg'), w * 0.92, 0.025, d * 0.92, 0, h - 0.1, 0, 0.01, 1); leg4(g, m('leg'), w * 0.9, d * 0.9, h - 0.1, 0.04, 0.022); for (const sx of [-1, 1]) tube(g, m('leg'), [sx * w * 0.4, h * 0.3, -d * 0.4], [sx * w * 0.4, h * 0.3, d * 0.4], 0.01); },
  bench(g, w, d, h, m) { cushion(g, m('seat'), w, 0.09, d, 0, h - 0.09, 0); rbx(g, m('leg'), w - 0.04, 0.04, d - 0.04, 0, h - 0.13, 0, 0.012, 1); leg4(g, m('leg'), w - 0.04, d - 0.04, h - 0.13, 0.05, 0.03); },
  officechair(g, w, d, h, m) {
    const f = m('seat'); cy(g, CHROME, 0.022, 0.03, 0.4, 0, 0.1, 0, 12); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; tube(g, BLACK, [0, 0.1, 0], [Math.cos(a) * 0.3, 0.07, Math.sin(a) * 0.3], 0.02); sp(g, BLACK, 0.03, Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3); }
    cushion(g, f, 0.5, 0.09, 0.5, 0, 0.5, 0.0); rbx(g, f, 0.46, 0.55, 0.09, 0, 0.58, -0.23, 0.05, 3, -0.12); for (const s of [-1, 1]) { rbx(g, BLACK, 0.05, 0.03, 0.3, s * 0.27, 0.72, 0.0, 0.012, 1); tube(g, BLACK, [s * 0.27, 0.55, 0], [s * 0.27, 0.72, 0], 0.012); }
  },
  /* ---------------- beds ---------------- */
  bed(g, w, d, h, m, v) { bedFrame(g, w, d, h, m('frame'), v || 0); dress(g, w, d, 0.56, m); },
  /* ---------------- tables ---------------- */
  dining(g, w, d, h, m) {
    const wd = m('top'), f = m('seat'), per = Math.max(2, Math.round(w / 0.62)), tw = w, td = d - 1.0, ty = 0.74;
    rbx(g, wd, tw, 0.045, td, 0, ty - 0.045, 0, 0.02, 2); rbx(g, wd, tw - 0.3, 0.07, td - 0.3, 0, ty - 0.115, 0, 0.015, 1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) lathe(g, wd, [[0.02, 0], [0.032, 0.2], [0.04, ty - 0.115]], sx * (tw / 2 - 0.12), 0, sz * (td / 2 - 0.12), 12);
    rbx(g, LINEN, tw * 0.5, 0.004, td * 0.25, 0, ty, 0, 0.002, 1); sp(g, acc(0xd9a441), 0.07, -0.1, ty + 0.07, 0, 1, 1, 1); sp(g, acc(0xc4492f), 0.06, 0.02, ty + 0.06, 0.03, 1, 1, 1); sp(g, acc(0x7a9a3a), 0.06, 0.1, ty + 0.06, -0.02, 1, 1, 1);
    const cw = 0.46;
    for (const side of [-1, 1]) for (let i = 0; i < per; i++) { const cx = -tw / 2 + (i + 0.5) * (tw / per), c = new THREE.Group(); EXT.dchair(c, cw, 0.5, 0.92, (s) => s === 'seat' ? f : wd); c.position.set(cx, 0, side * (td / 2 + 0.22)); if (side > 0) c.rotation.y = Math.PI; g.add(c); }
    for (const e of [-1, 1]) { const c = new THREE.Group(); EXT.dchair(c, cw, 0.5, 0.92, (s) => s === 'seat' ? f : wd); c.position.set(e * (tw / 2 + 0.22), 0, 0); c.rotation.y = e * Math.PI / 2 + Math.PI / 2 * 0; c.rotation.y = e > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(c); }
  },
  coffee(g, w, d, h, m) { rbx(g, m('top'), w, 0.045, d, 0, h - 0.045, 0, 0.02, 2); rbx(g, m('leg'), w - 0.14, 0.025, d - 0.14, 0, 0.14, 0, 0.01, 1); leg4(g, m('leg'), w - 0.06, d - 0.06, h - 0.045, 0.05, 0.022); },
  side(g, w, d, h, m) { cy(g, m('top'), w / 2, w / 2, 0.04, 0, h - 0.04, 0, 40); lathe(g, m('leg'), [[w * 0.28, 0], [w * 0.28, 0.02], [0.02, 0.05], [0.018, h - 0.05], [0.04, h - 0.04]], 0, 0, 0, 20); },
  console(g, w, d, h, m) { rbx(g, m('top'), w, 0.04, d, 0, h - 0.04, 0, 0.015, 2); rbx(g, m('top'), w - 0.1, 0.025, d - 0.06, 0, 0.22, 0, 0.01, 1); leg4(g, m('leg'), w - 0.06, d - 0.04, h - 0.04, 0.04, 0.026); },
  desk(g, w, d, h, m) {
    rbx(g, m('top'), w, 0.04, d, 0, h - 0.04, 0, 0.012, 2); rbx(g, m('leg'), 0.04, h - 0.04, d - 0.06, -w / 2 + 0.04, 0, 0, 0.01, 1); rbx(g, m('leg'), 0.42, h - 0.04, d - 0.08, w / 2 - 0.25, 0, 0, 0.01, 1);
    for (let i = 0; i < 3; i++) { rbx(g, m('top'), 0.38, 0.19, 0.012, w / 2 - 0.25, 0.08 + i * 0.22, d / 2 - 0.05, 0.008, 1); rbx(g, BRASS, 0.1, 0.012, 0.016, w / 2 - 0.25, 0.16 + i * 0.22, d / 2 - 0.035, 0.005, 1); }
    rbx(g, SCREEN, 0.62, 0.36, 0.025, -0.15, h + 0.14, -0.12, 0.01, 1); cy(g, BLACK, 0.02, 0.03, 0.14, -0.15, h, -0.12, 12); rbx(g, plain(0x2a2a2c, 0.5, 0.3), 0.44, 0.014, 0.15, -0.15, h, 0.1, 0.006, 1); rbx(g, WHITE, 0.06, 0.016, 0.1, 0.15, h, 0.1, 0.006, 1);
  },
  sideboard(g, w, d, h, m) {
    rbx(g, m('body'), w, h - 0.14, d, 0, 0.14, 0, 0.012, 2); leg4(g, m('leg'), w - 0.1, d - 0.1, 0.14, 0.06, 0.025); const n = w > 1.2 ? 3 : 2;
    for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; rbx(g, m('body'), w / n - 0.03, h - 0.24, 0.015, x, 0.19, d / 2 + 0.002, 0.008, 1); rbx(g, BRASS, 0.012, 0.12, 0.012, x + (i % 2 ? -0.1 : 0.1), 0.5, d / 2 + 0.018, 0.005, 1); }
  },
  tvunit(g, w, d, h, m) {
    const bh = 0.46; rbx(g, m('body'), w, bh - 0.12, d, 0, 0.12, 0, 0.012, 2); leg4(g, m('leg'), w - 0.1, d - 0.1, 0.12, 0.06, 0.022);
    for (const x of [-w / 4, w / 4]) { rbx(g, m('body'), w / 2 - 0.04, bh - 0.2, 0.015, x, 0.16, d / 2 + 0.002, 0.008, 1); rbx(g, BRASS, 0.1, 0.012, 0.012, x, 0.4, d / 2 + 0.015, 0.005, 1); }
    const tw = Math.min(1.3, w * 0.86), th = tw * 0.5625; rbx(g, SCREEN, tw, th, 0.045, 0, bh + 0.09, 0, 0.012, 1); rbx(g, plain(0x15161a, 0.2, 0.5), tw + 0.02, th + 0.02, 0.03, 0, bh + 0.08, -0.01, 0.01, 1); rbx(g, BLACK, 0.4, 0.025, 0.2, 0, bh, 0.0, 0.01, 1);
  },
  island(g, w, d, h, m) { rbx(g, m('body'), w - 0.08, h - 0.05, d - 0.08, 0, 0, 0, 0.012, 2); for (let i = 0; i < Math.round(w / 0.6); i++) rbx(g, m('body'), w / Math.round(w / 0.6) - 0.04, h - 0.18, 0.012, -w / 2 + (i + 0.5) * w / Math.round(w / 0.6), 0.08, d / 2 - 0.04, 0.006, 1); rbx(g, m('top'), w, 0.05, d, 0, h - 0.05, 0, 0.012, 2); rbx(g, m('top'), w - 0.06, 0.04, 0.25, 0, h - 0.09, d / 2 - 0.1, 0.01, 1); },
  /* ---------------- storage ---------------- */
  wardrobe(g, w, d, h, m) {
    const wd = m('body'), n = Math.max(2, Math.round(w / 0.55)); rbx(g, wd, w, h - 0.06, d, 0, 0.06, 0, 0.012, 2); rbx(g, wd, w + 0.04, 0.05, d + 0.03, 0, h - 0.05, 0, 0.012, 1); leg4(g, wd, w - 0.06, d - 0.06, 0.06, 0.03, 0.03);
    for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; rbx(g, wd, w / n - 0.02, h - 0.2, 0.02, x, 0.1, d / 2 + 0.002, 0.008, 1); rbx(g, wd, w / n - 0.14, h - 0.4, 0.012, x, 0.2, d / 2 + 0.014, 0.006, 1); rbx(g, BRASS, 0.014, 0.18, 0.014, x + (i % 2 ? -0.07 : 0.07), h * 0.5, d / 2 + 0.03, 0.006, 1); }
  },
  dresser(g, w, d, h, m) {
    rbx(g, m('body'), w, h - 0.12, d, 0, 0.12, 0, 0.012, 2); leg4(g, m('leg'), w - 0.08, d - 0.08, 0.12, 0.05, 0.026); rbx(g, m('body'), w + 0.04, 0.035, d + 0.03, 0, h - 0.035, 0, 0.012, 2);
    for (let r = 0; r < 3; r++) { rbx(g, m('body'), w - 0.06, (h - 0.2) / 3 - 0.02, 0.014, 0, 0.14 + r * (h - 0.2) / 3, d / 2 + 0.002, 0.008, 1); for (const s of [-1, 1]) sp(g, BRASS, 0.018, s * w * 0.25, 0.14 + r * (h - 0.2) / 3 + (h - 0.2) / 6, d / 2 + 0.025); }
  },
  bookcase(g, w, d, h, m) {
    const wd = m('body'), rows = Math.max(3, Math.round(h / 0.38)); rbx(g, wd, 0.03, h, d, -w / 2 + 0.015, 0, 0, 0.008, 1); rbx(g, wd, 0.03, h, d, w / 2 - 0.015, 0, 0, 0.008, 1); rbx(g, wd, w, h, 0.015, 0, 0, -d / 2 + 0.008, 0.005, 1);
    const cols = [0xb23a3a, 0x2f5d8a, 0xd9b44a, 0x3d7a4f, 0x7a4a2b, 0xe8e2d4, 0x222222, 0x8a4f7d, 0x2f7d78], rn = seeded(Math.round(w * 100 + h * 10));
    for (let r = 0; r <= rows; r++) {
      const y = r * (h - 0.03) / rows; rbx(g, wd, w, 0.03, d, 0, y, 0, 0.008, 1);
      if (r < rows) { let x = -w / 2 + 0.06; const top = (h - 0.03) / rows - 0.04; while (x < w / 2 - 0.1) { const bw = 0.025 + rn() * 0.03, bh = top * (0.6 + rn() * 0.36); if (rn() < 0.12) { x += 0.12; continue; } rbx(g, plain(cols[Math.floor(rn() * cols.length)], 0.8, 0), bw, bh, d * 0.7, x + bw / 2, y + 0.03, 0.02, 0.003, 1); x += bw + 0.002; } }
    }
  },
  /* ---------------- decor ---------------- */
  wallart(g, w, d, h, m) {
    rbx(g, m('frame'), w, h, d, 0, 0, 0, 0.01, 1); rbx(g, WHITE, w - 0.1, h - 0.1, d * 0.4, 0, 0.05, d * 0.35, 0.004, 1);
    const cs = [0x1f6f8b, 0xe9a23b, 0x3d7a4f, 0xc2603c, 0xf2d16b], r = seeded(Math.round(w * 977 + h * 311)); sp(g, acc(cs[Math.floor(r() * 5)]), Math.min(w, h) * 0.2, 0, h * 0.55, d * 0.6, 1, 1, 0.1); rbx(g, acc(cs[Math.floor(r() * 5)]), w * 0.5, h * 0.18, 0.004, 0, h * 0.22, d * 0.6, 0.002, 1); rbx(g, acc(cs[Math.floor(r() * 5)]), w * 0.2, h * 0.3, 0.004, w * 0.2, h * 0.35, d * 0.62, 0.002, 1);
  },
  mirror(g, w, d, h, m) { rbx(g, m('frame'), w, h, d, 0, 0, 0, 0.02, 2); rbx(g, plain(0xe4eef2, 0.04, 0.95), w - 0.08, h - 0.08, d * 0.5, 0, 0.04, d * 0.6, 0.004, 1); },
  vase(g, w, d, h, m) { const p = m('pot'); lathe(g, p, [[0.001, 0], [w * 0.22, 0.01], [w * 0.3, h * 0.25], [w * 0.38, h * 0.45], [w * 0.2, h * 0.75], [w * 0.14, h * 0.85], [w * 0.22, h]], 0, 0, 0, 24); for (let i = 0; i < 5; i++) { const a = i * 1.3; tube(g, plain(0x4e7a34, 0.8), [0, h * 0.8, 0], [Math.cos(a) * 0.1, h * 1.5, Math.sin(a) * 0.1], 0.004); sp(g, acc([0xe0402a, 0xf2c230, 0xffffff, 0xc2278c, 0xe8541c][i]), 0.035, Math.cos(a) * 0.1, h * 1.5, Math.sin(a) * 0.1); } },
  bowl(g, w, d, h, m) { const p = m('pot'); lathe(g, p, [[0.001, 0], [w * 0.2, 0.0], [w * 0.4, h * 0.5], [w * 0.5, h], [w * 0.47, h], [w * 0.37, h * 0.55], [w * 0.17, 0.012], [0.001, 0.012]], 0, 0, 0, 28); const cs = [0xe3a23a, 0xc4492f, 0x7a9a3a, 0xf2d16b]; for (let i = 0; i < 6; i++) sp(g, acc(cs[i % 4]), 0.05, Math.cos(i * 1.1) * 0.08, h * 0.7 + (i > 3 ? 0.06 : 0), Math.sin(i * 1.1) * 0.08); },
  /* ---------------- lighting ---------------- */
  floorlamp(g, w, d, h, m) { cy(g, BLACK, w * 0.3, w * 0.32, 0.025, 0, 0, 0, 28); cy(g, m('body'), 0.012, 0.012, h - 0.35, 0, 0.02, 0, 10); lathe(g, SHADE, [[w * 0.2, 0], [w * 0.36, 0.28], [w * 0.34, 0.28], [w * 0.18, 0.01]], 0, h - 0.32, 0, 28).material = SHADE; },
  tablelamp(g, w, d, h, m) { lathe(g, m('body'), [[0.001, 0], [w * 0.28, 0.01], [w * 0.3, h * 0.2], [w * 0.16, h * 0.4], [w * 0.05, h * 0.46]], 0, 0, 0, 24); lathe(g, SHADE, [[w * 0.26, 0], [w * 0.45, h * 0.5], [w * 0.43, h * 0.5], [w * 0.24, 0.01]], 0, h * 0.46, 0, 28); },
  ceilingfan(g, w, d, h, m) {
    cy(g, m('body'), 0.015, 0.015, 0.3, 0, h - 0.3, 0, 10); lathe(g, m('body'), [[0.001, 0], [0.09, 0.0], [0.1, 0.05], [0.07, 0.1], [0.001, 0.1]], 0, h - 0.4, 0, 20); cy(g, m('body'), 0.06, 0.06, 0.02, 0, h - 0.34, 0, 16);
    const blades = new THREE.Group(); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283, b = new THREE.Group(); tube(b, m('body'), [0.09, 0, 0], [0.2, 0, 0], 0.012); rbx(b, plain(0x8a5a35, 0.6, 0), 0.5, 0.012, 0.13, 0.46, 0, 0, 0.006, 1); b.rotation.y = a; b.rotation.z = 0.08; blades.add(b); }
    blades.position.y = h - 0.4; g.add(blades);
  },
  pendant(g, w, d, h, m) { cy(g, BLACK, 0.005, 0.005, h * 0.6, 0, h * 0.4, 0, 6); lathe(g, m('body'), [[0.03, 0], [w * 0.5, h * 0.22], [w * 0.5, h * 0.24], [0.03, 0.01]], 0, h * 0.3, 0, 32); sp(g, plain(0xfff0c8, 0.2, 0), w * 0.12, 0, h * 0.34, 0); },
  /* ---------------- plants (real leaves) ---------------- */
  plant_big(g, w, d, h, m, v) { pot(g, m('pot'), w, h * 0.26); const p = houseplant('monstera', h * 0.9, v || 1); p.position.y = h * 0.24; g.add(p); },
  plant_med(g, w, d, h, m, v) { pot(g, m('pot'), w, h * 0.3); const p = houseplant('rubber', h * 0.88, v || 2); p.position.y = h * 0.28; g.add(p); },
  plant_small(g, w, d, h, m, v) { pot(g, m('pot'), w, h * 0.38); const p = houseplant('snake', h * 0.9, v || 3); p.position.y = h * 0.36; g.add(p); },
  palm(g, w, d, h, m, v) { pot(g, m('pot'), w, h * 0.18); const p = houseplant('areca', h * 0.9, v || 4); p.position.y = h * 0.16; g.add(p); },
  /* ---------------- rugs and curtains ---------------- */
  rug(g, w, d, h, m, v) {
    const mt = m('rug'); rbx(g, mt, w, 0.016, d, 0, 0, 0, 0.007, 1); rbx(g, plain(0xf2ece0, 0.95, 0), w - 0.2, 0.004, d - 0.2, 0, 0.014, 0, 0.002, 1);
    const r = seeded(v || 7); for (let i = 0; i < 4; i++) rbx(g, acc([0x2f5d8a, 0xc2603c, 0x2f7d78, 0xd9a441][i]), w * (0.55 - i * 0.1), 0.004, d * (0.55 - i * 0.1), 0, 0.017 + i * 0.001, 0, 0.002, 1);
  },
  curtains(g, w, d, h, m) {
    const f = m('fabric'), pw = Math.min(0.55, w * 0.3); tube(g, BRASS, [-w / 2 - 0.12, h, 0], [w / 2 + 0.12, h, 0], 0.013); for (const s of [-1, 1]) sp(g, BRASS, 0.026, s * (w / 2 + 0.13), h, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const x = s * (w / 2 + 0.05 - pw / 2) + (i - 2) * pw / 5.5; rbx(g, f, pw / 4.2, h - 0.04, 0.035, x, 0.0, ((i % 2) ? 0.025 : -0.005), 0.014, 2); }
    rbx(g, plain(0xf2efe8, 0.95, 0, { t: 0.5 }), w - 2 * pw + 0.06, h * 0.78, 0.008, 0, h * 0.14, -0.035, 0.003, 1);
  },
  /* ---------------- kitchen ---------------- */
  kcab(g, w, d, h, m) {
    rbx(g, BLACK, w - 0.02, 0.1, d - 0.06, 0, 0, -0.01, 0.005, 1); rbx(g, m('body'), w - 0.005, h - 0.14, d - 0.04, 0, 0.1, 0, 0.01, 2); rbx(g, m('top'), w + 0.01, 0.04, d + 0.03, 0, h - 0.04, 0.01, 0.008, 1);
    const n = Math.max(1, Math.round(w / 0.5)); for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; rbx(g, m('body'), w / n - 0.02, h - 0.2, 0.02, x, 0.12, d / 2 - 0.02, 0.008, 1); rbx(g, m('body'), w / n - 0.12, h - 0.3, 0.01, x, 0.17, d / 2 - 0.008, 0.005, 1); rbx(g, CHROME, 0.012, 0.14, 0.014, x + (w / n) * 0.34, h - 0.32, d / 2 + 0.01, 0.005, 1); }
  },
  ucab(g, w, d, h, m) { rbx(g, m('body'), w - 0.005, h, d, 0, 0, 0, 0.01, 2); const n = Math.max(1, Math.round(w / 0.5)); for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; rbx(g, m('body'), w / n - 0.02, h - 0.06, 0.016, x, 0.03, d / 2 + 0.002, 0.008, 1); rbx(g, CHROME, 0.012, 0.12, 0.014, x + (w / n) * 0.34, 0.1, d / 2 + 0.014, 0.005, 1); } },
  /* ---------------- bath ---------------- */
  towelrail(g, w, d, h, m) { for (const s of [-1, 1]) tube(g, CHROME, [s * w / 2, h * 0.5, 0], [s * w / 2, h * 0.5, d], 0.012); for (let i = 0; i < 4; i++) tube(g, CHROME, [-w / 2, h * 0.5 + (i - 1.5) * 0.12, d], [w / 2, h * 0.5 + (i - 1.5) * 0.12, d], 0.011); cushion(g, acc(0x2f7d78), w * 0.6, 0.3, 0.04, -w * 0.15, h * 0.5 - 0.1, d + 0.03); },
  bathmat(g, w, d, h, m) { rbx(g, m('rug'), w, 0.02, d, 0, 0, 0, 0.009, 2); },
  /* ---------------- garage ---------------- */
  car(g, w, d, h, m) {
    const bo = m('body'), L = d, W = w, cl = 0.2;
    rbx(g, bo, W * 0.94, h * 0.34, L * 0.98, 0, cl, 0, 0.12, 3);                                       // lower body
    rbx(g, bo, W * 0.9, h * 0.1, L * 0.3, 0, cl + h * 0.3, L * 0.33, 0.06, 3, -0.08);                  // bonnet
    rbx(g, bo, W * 0.9, h * 0.1, L * 0.2, 0, cl + h * 0.3, -L * 0.4, 0.06, 3, 0.05);                  // boot
    rbx(g, GLASS, W * 0.84, h * 0.3, L * 0.5, 0, cl + h * 0.4, -L * 0.04, 0.1, 3);                      // glasshouse
    rbx(g, bo, W * 0.82, 0.04, L * 0.42, 0, cl + h * 0.7, -L * 0.04, 0.04, 2);                          // roof
    for (const sz of [-1, 1]) rbx(g, bo, W * 0.02, h * 0.3, 0.05, 0, cl + h * 0.4, sz * L * 0.06, 0.01, 1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const wl = new THREE.Group(); const t = cy(wl, BLACK, 0.32, 0.32, 0.22, 0, -0.11, 0, 28); const r = cy(wl, plain(0xc9ccd0, 0.3, 0.9), 0.19, 0.19, 0.225, 0, -0.1125, 0, 20); wl.rotation.z = Math.PI / 2; wl.position.set(sx * (W / 2 - 0.11) * 0.95, 0.32, sz * L * 0.31); g.add(wl); }
    for (const sx of [-1, 1]) { rbx(g, plain(0xfff4cc, 0.2, 0), 0.34, 0.1, 0.05, sx * W * 0.32, cl + h * 0.22, L / 2 - 0.02, 0.03, 2); rbx(g, plain(0xaa1111, 0.4, 0), 0.3, 0.09, 0.04, sx * W * 0.33, cl + h * 0.26, -L / 2 + 0.01, 0.03, 2); }
    rbx(g, BLACK, W * 0.5, 0.1, 0.05, 0, cl + 0.04, L / 2 - 0.01, 0.03, 2); rbx(g, plain(0xf0f0f0, 0.5, 0), 0.3, 0.08, 0.02, 0, cl + 0.06, -L / 2 - 0.0, 0.01, 1);
  },
  /* ---------------- fixtures ---------------- */
  toilet(g, w, d, h, m) {
    lathe(g, WHITE, [[0.001, 0], [0.1, 0.0], [0.15, 0.12], [0.18, h * 0.42], [0.2, h * 0.46], [0.15, h * 0.46], [0.001, h * 0.46]], 0, 0, d * 0.12, 28).scale.z = 1.35; rbx(g, WHITE, w * 0.7, h * 0.52, d * 0.26, 0, h * 0.4, -d / 2 + 0.1, 0.03, 2); lathe(g, plain(0xf6f6f4, 0.4, 0), [[0.14, 0], [0.19, 0.02], [0.14, 0.04]], 0, h * 0.46, d * 0.12, 24).scale.z = 1.35; cy(g, CHROME, 0.02, 0.02, 0.012, 0.0, h * 0.92, -d / 2 + 0.1, 12);
  }
};
function pot(g, mt, w, ph) { const r = w / 2; lathe(g, mt, [[r * 0.6, 0], [r * 0.85, ph * 0.1], [r, ph], [r * 1.02, ph], [r * 0.9, ph]], 0, 0, 0, 28); cy(g, SOIL, r * 0.92, r * 0.92, 0.02, 0, ph - 0.03, 0, 20); }

/* ---------------- Caribbean and local pieces ---------------- */
Object.assign(EXT, {
  bed_post(g, w, d, h, m, v) {                                      // four-poster mahogany bed
    const fr = m('frame'), ph = 1.9;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) lathe(g, fr, [[0.001, 0], [0.05, 0.0], [0.055, 0.12], [0.04, 0.2], [0.06, 0.3], [0.045, 0.42], [0.035, 0.55], [0.045, 0.62], [0.03, 0.75], [0.028, 1.25], [0.04, 1.35], [0.032, 1.5], [0.03, 1.6], [0.04, 1.7], [0.02, 1.85], [0.001, 1.92]], sx * (w / 2 + 0.04), 0, sz * (d / 2 + 0.02), 16);
    rbx(g, fr, w + 0.1, 0.22, d + 0.04, 0, 0.18, 0, 0.02, 2); rbx(g, fr, w + 0.14, 1.1, 0.07, 0, 0.1, -d / 2 - 0.04, 0.025, 2); rbx(g, fr, w - 0.2, 0.55, 0.035, 0, 0.55, -d / 2 + 0.004, 0.02, 2); rbx(g, fr, w + 0.14, 0.12, 0.09, 0, 1.2, -d / 2 - 0.04, 0.03, 2); rbx(g, fr, w + 0.1, 0.4, 0.06, 0, 0.1, d / 2 + 0.03, 0.02, 2);
    for (const sx of [-1, 1]) tube(g, fr, [sx * (w / 2 + 0.04), ph - 0.08, -d / 2 - 0.02], [sx * (w / 2 + 0.04), ph - 0.08, d / 2 + 0.02], 0.022); tube(g, fr, [-w / 2 - 0.04, ph - 0.08, -d / 2 - 0.02], [w / 2 + 0.04, ph - 0.08, -d / 2 - 0.02], 0.022); tube(g, fr, [-w / 2 - 0.04, ph - 0.08, d / 2 + 0.02], [w / 2 + 0.04, ph - 0.08, d / 2 + 0.02], 0.022);
    const net = plain(0xffffff, 0.95, 0, { t: 0.3 }); for (const s of [-1, 1]) rbx(g, net, 0.01, 1.2, d * 0.95, s * (w / 2 + 0.07), 0.7, 0, 0.004, 1); rbx(g, net, w + 0.1, 1.2, 0.01, 0, 0.7, d / 2 + 0.07, 0.004, 1);
    dress(g, w, d, 0.56, m);
  },
  bed_day(g, w, d, h, m) { const fr = m('frame'); leg4(g, fr, w, d, 0.16, 0.06, 0.035); rbx(g, fr, w + 0.06, 0.16, d + 0.06, 0, 0.14, 0, 0.025, 2); for (const s of [-1, 1]) for (let i = 0; i < 8; i++) rbx(g, fr, 0.04, 0.4, 0.03, s * (w / 2 + 0.01), 0.3, -d / 2 + 0.1 + i * (d - 0.2) / 7, 0.01, 1); rbx(g, fr, 0.05, 0.5, d, -w / 2 - 0.0, 0.3, 0, 0.02, 2); cushion(g, MATT, w - 0.05, 0.16, d - 0.08, 0, 0.3, 0); cushion(g, m('bedding'), w - 0.1, 0.07, d * 0.55, 0, 0.44, d * 0.15); pillow(g, m('throw'), 0.5, 0.25, 0.25, -w / 2 + 0.3, 0.46, -d / 2 + 0.2, 0, 0.2); pillow(g, LINEN, 0.5, 0.25, 0.25, w / 2 - 0.3, 0.46, -d / 2 + 0.2, 0, -0.2); },
  bed_bunk(g, w, d, h, m) {
    const fr = m('frame'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) rbx(g, fr, 0.06, h, 0.06, sx * (w / 2 + 0.03), 0, sz * (d / 2 - 0.03), 0.015, 1);
    for (const y of [0.3, 1.25]) { rbx(g, fr, w + 0.06, 0.06, d, 0, y, 0, 0.012, 1); cushion(g, MATT, w - 0.02, 0.16, d - 0.1, 0, y + 0.06, 0); cushion(g, m('bedding'), w, 0.06, d * 0.6, 0, y + 0.16, d * 0.15); pillow(g, LINEN, w - 0.2, 0.12, 0.34, 0, y + 0.2, -d / 2 + 0.28); for (const s of [-1, 1]) rbx(g, fr, 0.03, 0.22, d * 0.9, s * (w / 2 + 0.03), y + 0.06, 0, 0.008, 1); }
    for (let i = 0; i < 5; i++) tube(g, fr, [w / 2 + 0.08, 0.25 + i * 0.25, d / 2 - 0.35], [w / 2 + 0.08 + 0.0, 0.25 + i * 0.25, d / 2 - 0.35], 0.001); for (let i = 0; i < 5; i++) rbx(g, fr, 0.04, 0.035, 0.34, w / 2 + 0.08, 0.2 + i * 0.22, d / 2 - 0.2, 0.01, 1);
  },
  crib(g, w, d, h, m) { const fr = m('frame'); leg4(g, fr, w, d, 0.2, 0.04, 0.025); rbx(g, MATT, w - 0.06, 0.1, d - 0.06, 0, 0.3, 0, 0.03, 2); cushion(g, m('bedding'), w - 0.1, 0.04, d * 0.6, 0, 0.4, 0.1); for (const sx of [-1, 1]) for (let i = 0; i < 12; i++) rbx(g, fr, 0.02, h * 0.7, 0.02, sx * (w / 2 - 0.02), 0.3, -d / 2 + 0.05 + i * (d - 0.1) / 11, 0.006, 1); for (const sz of [-1, 1]) for (let i = 0; i < 7; i++) rbx(g, fr, 0.02, h * 0.7, 0.02, -w / 2 + 0.05 + i * (w - 0.1) / 6, 0.3, sz * (d / 2 - 0.02), 0.006, 1); for (const sx of [-1, 1]) for (const sz of [-1, 1]) rbx(g, fr, 0.05, h, 0.05, sx * (w / 2 - 0.02), 0, sz * (d / 2 - 0.02), 0.012, 1); for (const sz of [-1, 1]) rbx(g, fr, w, 0.04, 0.04, 0, h - 0.04, sz * (d / 2 - 0.02), 0.01, 1); for (const sx of [-1, 1]) rbx(g, fr, 0.04, 0.04, d, sx * (w / 2 - 0.02), h - 0.04, 0, 0.01, 1); },
  peacock_chair(g, w, d, h, m) {
    const rt = m('body'); cushion(g, acc(0xf0e6d2), 0.5, 0.1, 0.5, 0, 0.42, 0.05); lathe(g, rt, [[0.001, 0], [0.2, 0.05], [0.26, 0.2], [0.24, 0.4], [0.001, 0.4]], 0, 0.0, 0.05, 28); arc(g, rt, 0.6, 0.018, 0, 0.78, -0.18, -0.6, Math.PI + 0.6).rotation.x = -0.12;
    for (let i = 0; i <= 18; i++) { const a = -0.55 + i / 18 * (Math.PI + 1.1), x = Math.cos(a) * 0.6, y = 0.78 + Math.sin(a) * 0.6; tube(g, rt, [0, 0.42, -0.1], [x, y, -0.22], 0.008); }
    for (const R of [0.45, 0.3, 0.16]) arc(g, rt, R, 0.012, 0, 0.78, -0.2, -0.4, Math.PI + 0.4); for (const s of [-1, 1]) { tube(g, rt, [s * 0.28, 0.0, 0.2], [s * 0.2, 0.38, 0.08], 0.02); tube(g, rt, [s * 0.25, 0.0, -0.25], [s * 0.18, 0.4, -0.05], 0.02); }
    rbx(g, rt, 0.26, 0.02, 0.5, 0, 0.0, 0, 0.01, 1);
  },
  rocking_chair(g, w, d, h, m) {
    const wd = m('wood'); for (const s of [-1, 1]) { arc(g, wd, 0.8, 0.02, s * (w / 2 - 0.04), 0.78, 0, Math.PI * 1.35, Math.PI * 1.65).rotation.y = Math.PI / 2; for (const z of [-0.18, 0.2]) tube(g, wd, [s * (w / 2 - 0.04), 0.5, z], [s * (w / 2 - 0.04), 0.05, z * 1.2], 0.022); tube(g, wd, [s * (w / 2 - 0.04), 0.5, -0.18], [s * (w / 2 - 0.04), h, -0.28], 0.022); tube(g, wd, [s * (w / 2 - 0.04), 0.62, -0.1], [s * (w / 2 - 0.04), 0.62, 0.2], 0.02); }
    for (let i = 0; i < 6; i++) rbx(g, wd, w - 0.12, 0.025, 0.065, 0, 0.46 + 0.0, -0.16 + i * 0.075, 0.01, 1); for (let i = 0; i < 4; i++) rbx(g, wd, w - 0.14, 0.12, 0.022, 0, 0.55 + i * 0.14, -0.2 - i * 0.02, 0.008, 1, -0.1);
  },
  hammock(g, w, d, h, m) {
    const wd = m('frame'), cl = m('fabric'); for (const s of [-1, 1]) { tube(g, wd, [0, 0, s * (d / 2 - 0.05)], [0, 1.7, s * (d / 2 - 0.05)], 0.05); tube(g, wd, [-0.3, 0, s * (d / 2 - 0.05)], [0, 1.2, s * (d / 2 - 0.05)], 0.03); tube(g, wd, [0.3, 0, s * (d / 2 - 0.05)], [0, 1.2, s * (d / 2 - 0.05)], 0.03); }
    const pg = new THREE.PlaneGeometry(0.95, d - 0.3, 6, 26); pg.rotateX(-Math.PI / 2); const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getZ(i) / ((d - 0.3) / 2); p.setY(i, 1.2 - 0.85 * (1 - t * t) * 0.7 + Math.abs(p.getX(i)) * 0.22); } pg.computeVertexNormals();
    const cloth = new THREE.Mesh(pg, cl); cloth.material = cl.clone ? cl : cl; cloth.material.side = THREE.DoubleSide; g.add(cloth); for (const s of [-1, 1]) tube(g, plain(0xd9c9a4, 0.9, 0), [0, 1.6, s * (d / 2 - 0.05)], [0, 1.2, s * (d / 2 - 0.15)], 0.01);
  },
  china_cabinet(g, w, d, h, m) {
    const wd = m('body'); rbx(g, wd, w, h * 0.42, d, 0, 0.1, 0, 0.012, 2); leg4(g, wd, w - 0.1, d - 0.08, 0.1, 0.05, 0.03); rbx(g, wd, w + 0.04, 0.04, d + 0.04, 0, h * 0.42 + 0.1, 0, 0.012, 2); rbx(g, wd, w - 0.04, h * 0.5, d * 0.7, 0, h * 0.42 + 0.14, -d * 0.1, 0.01, 1);
    for (let i = 0; i < 2; i++) { rbx(g, wd, w / 2 - 0.05, h * 0.42 - 0.08, 0.015, (i ? 1 : -1) * w / 4, 0.14, d / 2 + 0.002, 0.008, 1); sp(g, BRASS, 0.02, (i ? -1 : 1) * 0.04 + (i ? 1 : -1) * w / 4 * 0.15, h * 0.28, d / 2 + 0.03); }
    for (let k = 0; k < 3; k++) { const y = h * 0.42 + 0.2 + k * (h * 0.46 / 3); rbx(g, plain(0xdbe7ec, 0.1, 0.2, { t: 0.35 }), w - 0.12, 0.012, d * 0.62, 0, y, -d * 0.1, 0.004, 1); for (let j = 0; j < 4; j++) { const x = -w / 2 + 0.16 + j * (w - 0.32) / 3; const pl = lathe(g, WHITE, [[0.001, 0], [0.05, 0.005], [0.1, 0.06], [0.095, 0.065], [0.04, 0.012]], x, y + 0.012, -d * 0.18, 20); pl.rotation.x = -1.1; pl.position.y += 0.1; } }
    for (const s of [-1, 1]) rbx(g, plain(0xdbe7ec, 0.1, 0.2, { t: 0.3 }), w / 2 - 0.04, h * 0.46, 0.012, s * w / 4, h * 0.42 + 0.17, d / 2 - 0.03, 0.004, 1); rbx(g, wd, w + 0.06, 0.07, d * 0.8, 0, h - 0.07, -d * 0.05, 0.02, 2);
  },
  whatnot(g, w, d, h, m) { const wd = m('body'); for (let i = 0; i < 4; i++) { const y = 0.1 + i * (h - 0.1) / 3.3; cy(g, wd, w * 0.5 * (1 - i * 0.12), w * 0.5 * (1 - i * 0.12), 0.025, 0, y, 0, 8); } for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5, r = w * 0.38; lathe(g, wd, [[0.012, 0], [0.025, (h - 0.1) * 0.15], [0.014, (h - 0.1) * 0.5], [0.02, (h - 0.1)]], Math.cos(a) * r * 0.9, 0.1, Math.sin(a) * r * 0.9, 10); } lathe(g, TERRA, [[0.001, 0], [0.04, 0.005], [0.06, 0.1], [0.04, 0.16], [0.035, 0.18]], 0, 0.1 + 0.025 + (h - 0.1) / 3.3, 0.0, 16); },
  rattan_sofa(g, w, d, h, m) {
    const rt = m('body'), f = m('seat'); for (const sx of [-1, 1]) { wicker(g, rt, 0.12, 0.62, d, sx * (w / 2 - 0.06), 0.1, 0); wicker(g, rt, 0.14, 0.06, d + 0.02, sx * (w / 2 - 0.06), 0.68, 0); } wicker(g, rt, w, 0.12, d, 0, 0.1, 0); wicker(g, rt, w, h - 0.2, 0.1, 0, 0.1, -d / 2 + 0.05);
    for (let i = 0; i < 18; i++) rbx(g, rt, 0.008, h - 0.28, 0.012, -w / 2 + 0.2 + i * (w - 0.4) / 17, 0.25, -d / 2 + 0.115, 0.003, 1);
    leg4(g, rt, w - 0.1, d - 0.1, 0.1, 0.06, 0.03); const n = w > 1.8 ? 3 : 2, cw = (w - 0.28) / n; for (let i = 0; i < n; i++) { const x = -(w - 0.28) / 2 + cw * (i + 0.5); cushion(g, f, cw - 0.015, 0.14, d * 0.7, x, 0.22, d * 0.1); cushion(g, f, cw - 0.04, 0.4, 0.14, x, 0.34, -d / 2 + 0.24, -0.16); } pillow(g, acc(0xd98f2a), 0.38, 0.38, 0.12, -w / 2 + 0.32, 0.45, -d / 2 + 0.32, -0.25, 0.3);
  },
  cane_chair(g, w, d, h, m) { const wd = m('wood'), sy = 0.45; leg4(g, wd, w - 0.04, d - 0.04, sy, 0.03, 0.022); rbx(g, wd, w, 0.05, d, 0, sy - 0.05, 0, 0.015, 2); rbx(g, plain(0xd9b878, 0.85, 0), w - 0.08, 0.02, d - 0.08, 0, sy, 0, 0.008, 1); for (const sx of [-1, 1]) rbx(g, wd, 0.035, h, 0.035, sx * (w / 2 - 0.03), 0, -d / 2 + 0.04, 0.012, 1, -0.07); rbx(g, wd, w - 0.04, 0.05, 0.035, 0, h - 0.05, -d / 2 + 0.03, 0.015, 2); rbx(g, wd, w - 0.04, 0.035, 0.03, 0, sy + 0.08, -d / 2 + 0.05, 0.012, 1); rbx(g, plain(0xd9b878, 0.85, 0), w - 0.1, h - sy - 0.2, 0.012, 0, sy + 0.12, -d / 2 + 0.05, 0.004, 1, -0.07); },
  settee(g, w, d, h, m) { const wd = m('wood'); for (let i = 0; i < 6; i++) rbx(g, wd, w, 0.025, 0.06, 0, 0.44, -d / 2 + 0.07 + i * (d - 0.1) / 5, 0.01, 1); for (const s of [-1, 1]) { rbx(g, wd, 0.06, h, d, s * (w / 2 - 0.03), 0, 0, 0.015, 1); rbx(g, wd, 0.07, 0.04, d + 0.02, s * (w / 2 - 0.03), 0.62, 0, 0.012, 1); } for (let i = 0; i < 4; i++) rbx(g, wd, w - 0.1, 0.1, 0.022, 0, 0.55 + i * 0.12, -d / 2 + 0.03, 0.008, 1, -0.1); rbx(g, wd, w - 0.1, 0.05, d - 0.06, 0, 0.3, 0, 0.01, 1); },
  jalousie_screen(g, w, d, h, m) { const wd = m('frame'); for (const s of [-1, 1]) rbx(g, wd, 0.05, h, 0.05, s * (w / 2 - 0.025), 0, 0, 0.012, 1); for (const y of [0.0, h - 0.05]) rbx(g, wd, w, 0.05, 0.05, 0, y, 0, 0.012, 1); const n = Math.round(h / 0.07); for (let i = 0; i < n; i++) rbx(g, wd, w - 0.08, 0.008, 0.08, 0, 0.06 + i * (h - 0.12) / n, 0, 0.004, 1, -0.7); for (const s of [-1, 1]) rbx(g, wd, 0.06, 0.04, 0.4, s * (w / 2 - 0.03), 0.0, 0, 0.01, 1); },
  coal_pot(g, w, d, h, m) { lathe(g, IRON, [[0.001, 0], [w * 0.2, 0.0], [w * 0.28, h * 0.25], [w * 0.5, h * 0.6], [w * 0.52, h * 0.65], [w * 0.38, h * 0.65], [w * 0.2, 0.1]], 0, 0, 0, 24); lathe(g, IRON, [[0.001, 0], [w * 0.4, 0.0], [w * 0.4, h * 0.34], [w * 0.5, h * 0.4]], 0, h * 0.62, 0, 24).scale.y = 0.45; for (const s of [-1, 1]) tube(g, IRON, [s * w * 0.32, h * 0.7, 0], [s * w * 0.5, h * 0.75, 0], 0.012); },
  yabba(g, w, d, h, m) { lathe(g, m('pot'), [[0.001, 0], [w * 0.25, 0.0], [w * 0.45, h * 0.25], [w * 0.5, h * 0.5], [w * 0.4, h * 0.78], [w * 0.28, h * 0.92], [w * 0.3, h], [w * 0.26, h]], 0, 0, 0, 28); },
  calabash(g, w, d, h, m) { lathe(g, m('pot'), [[0.001, 0], [w * 0.2, 0.0], [w * 0.42, h * 0.45], [w * 0.5, h], [w * 0.46, h], [w * 0.38, h * 0.5], [w * 0.15, 0.01]], 0, 0, 0, 28); for (let i = 0; i < 5; i++) { const a = i * 1.3; sp(g, acc([0xe3a23a, 0x7a9a3a, 0xc4492f, 0xf2d16b, 0x5a8a2a][i]), 0.055, Math.cos(a) * 0.08, h * 0.8, Math.sin(a) * 0.08); } },
  /* ---------------- more rooms: kids, office, fitness, bar, bath, appliances ---------------- */
  piano(g, w, d, h, m) { const wd = m('body'); rbx(g, wd, w, h - 0.28, d, 0, 0.12, 0, 0.015, 2); for (const s of [-1, 1]) rbx(g, wd, 0.06, 0.12, d - 0.06, s * (w / 2 - 0.1), 0, 0, 0.02, 1); rbx(g, wd, w + 0.02, 0.05, d + 0.02, 0, h - 0.17, 0, 0.012, 1); rbx(g, WHITE, w - 0.1, 0.03, 0.15, 0, h * 0.5, d / 2 + 0.03, 0.004, 1); for (let i = 0; i < 29; i++) rbx(g, BLACK, 0.012, 0.012, 0.09, -w / 2 + 0.2 + i * (w - 0.4) / 28 + 0.014, h * 0.5 + 0.03, d / 2 + 0.02, 0.003, 1); rbx(g, wd, w - 0.04, 0.4, 0.04, 0, h * 0.5 + 0.1, d / 2 - 0.12, 0.008, 1); rbx(g, plain(0xece8de, 0.5, 0), 0.4, 0.2, 0.01, 0, h * 0.72, d / 2 - 0.1, 0.004, 1); },
  toybox(g, w, d, h, m) { rbx(g, m('body'), w, h, d, 0, 0, 0, 0.02, 2); rbx(g, m('body'), w + 0.03, 0.05, d + 0.03, 0, h - 0.02, 0, 0.02, 2); const cs = [0xe0402a, 0x2f7de0, 0xf2c230, 0x3d9a4f]; for (let i = 0; i < 4; i++) rbx(g, acc(cs[i]), 0.1, 0.1, 0.1, -w * 0.3 + i * w * 0.2, h + 0.03, (i % 2 - 0.5) * 0.1, 0.01, 1, 0.3 * i, 0.5 * i); },
  gym_bench(g, w, d, h, m) { rbx(g, BLACK, 0.3, 0.1, d * 0.6, 0, 0.35, 0.0, 0.03, 2, -0.15); for (const s of [-1, 1]) tube(g, CHROME, [s * 0.12, 0.0, d * 0.38], [s * 0.12, 0.38, d * 0.18], 0.02); tube(g, CHROME, [-w / 2, 1.1, -d * 0.1], [w / 2, 1.1, -d * 0.1], 0.015); for (const s of [-1, 1]) { cy(g, BLACK, 0.2, 0.2, 0.05, s * (w / 2 - 0.1), 1.1 - 0.2, -d * 0.1, 24).rotation.z = Math.PI / 2; } },
  treadmill(g, w, d, h, m) { rbx(g, BLACK, w, 0.14, d, 0, 0.1, 0, 0.03, 2); rbx(g, plain(0x2a2a2e, 0.9, 0), w - 0.2, 0.01, d - 0.1, 0, 0.24, 0, 0.004, 1); for (const s of [-1, 1]) tube(g, CHROME, [s * (w / 2 - 0.06), 0.24, -d / 2 + 0.2], [s * (w / 2 - 0.06), 1.1, -d / 2 + 0.2], 0.022); rbx(g, BLACK, w - 0.08, 0.2, 0.1, 0, 1.0, -d / 2 + 0.2, 0.03, 2); rbx(g, SCREEN, 0.3, 0.12, 0.01, 0, 1.06, -d / 2 + 0.26, 0.006, 1); },
  bar_cart(g, w, d, h, m) { for (const y of [0.18, 0.6]) rbx(g, m('top'), w, 0.025, d, 0, y, 0, 0.01, 1); for (const sx of [-1, 1]) for (const sz of [-1, 1]) tube(g, BRASS, [sx * (w / 2 - 0.02), 0.1, sz * (d / 2 - 0.02)], [sx * (w / 2 - 0.02), h, sz * (d / 2 - 0.02)], 0.012); for (const sx of [-1, 1]) tube(g, BRASS, [sx * (w / 2 - 0.02), h * 0.92, -d / 2], [sx * (w / 2 - 0.02), h * 0.92, d / 2], 0.012); for (let i = 0; i < 4; i++) { cy(g, plain([0x6a8a3a, 0x8a4a2a, 0xd9c8a0, 0x2f5d8a][i], 0.1, 0.1, { t: 0.65 }), 0.03, 0.035, 0.26, -0.2 + i * 0.12, 0.62, 0, 14); } for (const sx of [-1, 1]) for (const sz of [-1, 1]) sp(g, BLACK, 0.035, sx * (w / 2 - 0.04), 0.05, sz * (d / 2 - 0.04)); },
  wine_rack(g, w, d, h, m) { rbx(g, m('body'), w, h, d, 0, 0, 0, 0.01, 1); const nx = Math.floor(w / 0.12), ny = Math.floor(h / 0.12); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i + j) % 2 === 0 || true) { const b = cy(g, plain([0x2a4a2a, 0x2a2a2a, 0x4a2a2a][(i + j) % 3], 0.15, 0.1, { t: 0.9 }), 0.035, 0.035, 0.22, -w / 2 + 0.07 + i * 0.12, 0.07 + j * 0.12, d * 0.1, 10); b.rotation.x = Math.PI / 2; b.position.y = 0.07 + j * 0.12 + 0.035; b.position.z = d * 0.18; } },
  vanity_double(g, w, d, h, m) { rbx(g, m('body'), w, h - 0.05, d, 0, 0.0, 0, 0.012, 2); rbx(g, m('top'), w + 0.02, 0.04, d + 0.02, 0, h - 0.04, 0, 0.01, 1); for (const s of [-1, 1]) { const b = lathe(g, WHITE, [[0.001, 0], [0.12, 0.0], [0.18, 0.06], [0.19, 0.06], [0.12, 0.02]], s * w * 0.25, h - 0.015, 0.0, 24); tube(g, CHROME, [s * w * 0.25, h, -d * 0.35], [s * w * 0.25, h + 0.2, -d * 0.35], 0.012); tube(g, CHROME, [s * w * 0.25, h + 0.2, -d * 0.35], [s * w * 0.25, h + 0.18, -d * 0.15], 0.012); rbx(g, m('body'), w / 2 - 0.05, h - 0.15, 0.014, s * w * 0.25, 0.07, d / 2 + 0.002, 0.008, 1); } },
  bathtub(g, w, d, h, m) { lathe(g, WHITE, [[0.001, 0], [0.3, 0.0], [0.42, 0.12], [0.46, h * 0.75], [0.48, h], [0.43, h], [0.38, h * 0.75], [0.001, 0.08]], 0, 0, 0, 40).scale.set(w / 0.96, 1, d / 0.96); const wt = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), WATER); wt.rotation.x = -Math.PI / 2; wt.scale.set(w / 0.96, d / 0.96, 1); wt.position.y = h * 0.62; g.add(wt); tube(g, CHROME, [0, h, -d * 0.4], [0, h + 0.25, -d * 0.4], 0.018); tube(g, CHROME, [0, h + 0.25, -d * 0.4], [0, h + 0.2, -d * 0.3], 0.015); },
  rice_cooker(g, w, d, h, m) { lathe(g, WHITE, [[0.001, 0], [w * 0.5, 0.0], [w * 0.52, h * 0.5], [w * 0.4, h * 0.88], [0.001, h]], 0, 0, 0, 24); rbx(g, BLACK, w * 0.3, h * 0.12, 0.02, 0, h * 0.35, w * 0.5, 0.008, 1); },
  blender(g, w, d, h, m) { cy(g, BLACK, w * 0.5, w * 0.55, h * 0.3, 0, 0, 0, 20); cy(g, GLASS, w * 0.4, w * 0.3, h * 0.6, 0, h * 0.3, 0, 20); cy(g, BLACK, w * 0.38, w * 0.4, h * 0.1, 0, h * 0.9, 0, 20); },
  toaster(g, w, d, h, m) { rbx(g, plain(0xcfd2d6, 0.25, 0.9), w, h, d, 0, 0, 0, 0.04, 2); for (const s of [-1, 1]) rbx(g, BLACK, w * 0.3, 0.012, d * 0.7, s * w * 0.22, h - 0.004, 0, 0.004, 1); },
  water_cooler(g, w, d, h, m) { rbx(g, WHITE, w, h * 0.62, d, 0, 0, 0, 0.03, 2); lathe(g, plain(0x9ad0e6, 0.05, 0.05, { t: 0.5 }), [[0.001, 0], [w * 0.4, 0.0], [w * 0.4, h * 0.3], [w * 0.2, h * 0.38], [w * 0.2, h * 0.4]], 0, h * 0.62, 0, 24); rbx(g, plain(0x2f7de0, 0.4, 0), 0.04, 0.03, 0.03, -0.05, h * 0.42, d / 2, 0.005, 1); rbx(g, plain(0xe0402a, 0.4, 0), 0.04, 0.03, 0.03, 0.05, h * 0.42, d / 2, 0.005, 1); },
  photoframes(g, w, d, h, m) { const cs = [0xe9a23b, 0x2f5d8a, 0xc2603c]; for (let i = 0; i < 3; i++) { const hh = h * (0.7 + (i % 2) * 0.3), x = -w / 2 + (i + 0.5) * w / 3; rbx(g, m('frame'), w / 3 - 0.02, hh, 0.02, x, 0, -0.02 + i * 0.01, 0.006, 1, -0.15); rbx(g, acc(cs[i]), w / 3 - 0.06, hh - 0.04, 0.004, x, 0.02, -0.005 + i * 0.01, 0.002, 1, -0.15); } },
  statue(g, w, d, h, m) { cy(g, m('body'), w * 0.5, w * 0.55, h * 0.08, 0, 0, 0, 20); lathe(g, m('body'), [[0.001, h * 0.08], [w * 0.22, h * 0.1], [w * 0.28, h * 0.32], [w * 0.16, h * 0.55], [w * 0.2, h * 0.7], [w * 0.1, h * 0.78], [w * 0.12, h * 0.88], [w * 0.1, h * 0.95], [0.001, h]], 0, 0, 0, 20); },
  lantern(g, w, d, h, m) { cy(g, BLACK, w * 0.4, w * 0.45, 0.03, 0, 0, 0, 16); cy(g, GLASS, w * 0.38, w * 0.38, h * 0.65, 0, 0.03, 0, 16); cy(g, BLACK, w * 0.1, w * 0.45, h * 0.12, 0, h * 0.68, 0, 16); sp(g, plain(0xffe8a8, 0.3, 0), w * 0.1, 0, h * 0.25, 0); tube(g, BLACK, [-w * 0.35, h * 0.8, 0], [w * 0.35, h * 0.8, 0], 0.01); },
  floorcushion(g, w, d, h, m) { pillow(g, m('seat'), w, h, d, 0, 0, 0); },
  basket_planter(g, w, d, h, m) { pot(g, m('pot'), w, h * 0.3); const p = houseplant('rubber', h * 0.8, 9); p.position.y = h * 0.28; g.add(p); },
  hamper2(g, w, d, h, m) { cy(g, m('body'), w / 2, w / 2 * 0.9, h, 0, 0, 0, 28); cy(g, plain(0xf2efe8, 0.9, 0), w / 2 * 0.95, w / 2 * 0.95, 0.03, 0, h - 0.02, 0, 24); }
});

/* ---------------- outdoor and garden ---------------- */
function chairOut(g, mt, x, z, rot) { const c = new THREE.Group(); EXT.dchair(c, 0.5, 0.52, 0.9, () => mt); c.position.set(x, 0, z); c.rotation.y = rot; g.add(c); }
Object.assign(EXT, {
  patio_set(g, w, d, h, m) {
    const mt = m('frame'), top = m('top'); lathe(g, mt, [[0.001, 0], [0.22, 0.0], [0.04, 0.05], [0.04, 0.7], [0.06, 0.72]], 0, 0, 0, 20); cy(g, top, 0.5, 0.5, 0.03, 0, 0.72, 0, 40); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.4; chairOut(g, m('seat'), Math.cos(a) * 0.82, Math.sin(a) * 0.82, -a - Math.PI / 2 + 0.0); }
    tube(g, plain(0x5a4a3a, 0.8, 0.2), [0, 0.72, 0], [0, 2.25, 0], 0.025); lathe(g, m('shade'), [[0.02, 2.4], [0.9, 2.1], [1.35, 2.0], [1.35, 1.98], [0.9, 2.08], [0.02, 2.38]], 0, 0, 0, 16);
  },
  lounger(g, w, d, h, m) { const fr = m('frame'), cu = m('seat'); for (const s of [-1, 1]) { tube(g, fr, [s * (w / 2 - 0.03), 0.0, -d / 2 + 0.1], [s * (w / 2 - 0.03), 0.3, -d * 0.1], 0.02); tube(g, fr, [s * (w / 2 - 0.03), 0.0, d / 2 - 0.1], [s * (w / 2 - 0.03), 0.3, d / 2 - 0.1], 0.02); } rbx(g, fr, w, 0.04, d * 0.62, 0, 0.3, d * 0.2, 0.012, 1); rbx(g, fr, w, 0.04, d * 0.42, 0, 0.42, -d * 0.28, 0.012, 1, 0.9); cushion(g, cu, w - 0.06, 0.07, d * 0.6, 0, 0.34, d * 0.2); cushion(g, cu, w - 0.06, 0.07, d * 0.4, 0, 0.5, -d * 0.3, 0.9); },
  grill(g, w, d, h, m) { const bo = m('body'); cy(g, bo, w * 0.46, w * 0.4, h * 0.14, 0, h * 0.5, 0, 28); const lid = new THREE.Mesh(new THREE.SphereGeometry(w * 0.47, 28, 12, 0, 6.283, 0, 1.45), bo); lid.position.y = h * 0.64; lid.scale.y = 0.7; g.add(lid); for (const s of [-1, 1]) { tube(g, BLACK, [s * w * 0.3, 0, -w * 0.2], [s * w * 0.3, h * 0.52, -w * 0.1], 0.015); tube(g, BLACK, [s * w * 0.3, 0, w * 0.2], [s * w * 0.3, h * 0.52, w * 0.1], 0.015); } tube(g, BLACK, [-w * 0.3, h * 0.84, w * 0.5], [w * 0.3, h * 0.84, w * 0.5], 0.015); tube(g, BLACK, [-w * 0.3, h * 0.84, w * 0.5], [-w * 0.2, h * 0.76, w * 0.3], 0.012); tube(g, BLACK, [w * 0.3, h * 0.84, w * 0.5], [w * 0.2, h * 0.76, w * 0.3], 0.012); rbx(g, plain(0x555555, 0.5, 0.6), w * 0.8, 0.02, w * 0.5, 0, h * 0.22, 0, 0.008, 1); },
  planter(g, w, d, h, m, v) { pot(g, m('pot'), w, h * 0.45); const kinds = ['croton', 'hibiscus', 'ixora', 'shrub']; const p = makeTree(kinds[(v || 0) % 4], (v || 1) + 5); p.scale.setScalar(Math.min(1, w / 0.9)); p.position.y = h * 0.42; g.add(p); },
  garden_bench(g, w, d, h, m) { const wd = m('wood'); for (let i = 0; i < 5; i++) rbx(g, wd, w, 0.03, 0.08, 0, 0.44, -d / 2 + 0.07 + i * (d - 0.1) / 4, 0.012, 1); for (let i = 0; i < 4; i++) rbx(g, wd, w, 0.09, 0.025, 0, 0.55 + i * 0.1, -d / 2 + 0.03 - i * 0.012, 0.01, 1, -0.12); for (const s of [-1, 1]) { rbx(g, BLACK, 0.04, 0.45, d - 0.02, s * (w / 2 - 0.05), 0, 0, 0.012, 1); rbx(g, wd, 0.07, 0.03, d, s * (w / 2 - 0.05), 0.62, 0, 0.012, 1); } },
  gazebo(g, w, d, h, m) {
    const wd = m('frame'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) lathe(g, wd, [[0.07, 0], [0.06, 0.1], [0.05, 0.2], [0.05, h - 0.3]], sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1), 12);
    for (const y of [h - 0.35, h - 0.2]) { for (const sz of [-1, 1]) rbx(g, wd, w - 0.1, 0.1, 0.07, 0, y, sz * (d / 2 - 0.1), 0.015, 1); for (const sx of [-1, 1]) rbx(g, wd, 0.07, 0.1, d - 0.1, sx * (w / 2 - 0.1), y, 0, 0.015, 1); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 * 0.9, 0.9, 4, 1, true), material('shingle', 0xffffff)); roof.rotation.y = Math.PI / 4; roof.position.y = h - 0.05 + 0.45; roof.material.side = THREE.DoubleSide; g.add(roof); sp(g, wd, 0.06, 0, h + 0.9, 0);
    rbx(g, wd, w - 0.4, 0.04, 0.4, 0, 0.45, d / 2 - 0.4, 0.012, 1); rbx(g, wd, w - 0.4, 0.04, 0.4, 0, 0.45, -d / 2 + 0.4, 0.012, 1); rbx(g, wd, 1.0, 0.04, 1.0, 0, 0.72, 0, 0.012, 1); cy(g, wd, 0.06, 0.06, 0.72, 0, 0, 0, 10);
  },
  pool(g, w, d, h, m) {
    const tile = m('tile'); rbx(g, tile, w + 0.6, 0.06, d + 0.6, 0, -0.02, 0, 0.02, 1); const wt = new THREE.Mesh(new THREE.PlaneGeometry(w, d), WATER); wt.rotation.x = -Math.PI / 2; wt.position.y = 0.03; g.add(wt);
    rbx(g, plain(0x58c2d6, 0.4, 0, {}), w, 0.02, d, 0, -0.01, 0, 0.005, 1); for (const s of [-1, 1]) { tube(g, CHROME, [s * 0.18, 0.04, d / 2 + 0.02], [s * 0.18, 0.5, d / 2 + 0.02], 0.014); tube(g, CHROME, [s * 0.18, 0.5, d / 2 + 0.02], [s * 0.18, 0.5, d / 2 - 0.35], 0.014); }
  },
  swing_chair(g, w, d, h, m) { const rt = m('body'); for (const s of [-1, 1]) tube(g, plain(0x4a4a4c, 0.6, 0.4), [s * 0.6, 0, 0], [0, 2.4, 0], 0.04); tube(g, plain(0x4a4a4c, 0.6, 0.4), [-0.6, 0, 0], [0.6, 0, 0], 0.03); const pod = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 14, 0, 6.283, 0, 2.4), rt); pod.scale.set(1, 0.95, 0.9); pod.rotation.x = 0.3; pod.position.set(0, 1.0, 0.0); pod.material.side = THREE.DoubleSide; g.add(pod); tube(g, plain(0x8a7a5a, 0.9, 0), [0, 2.4, 0], [0, 1.55, 0], 0.012); cushion(g, acc(0xf0e6d2), 0.55, 0.12, 0.5, 0, 0.62, 0.0); },
  fire_pit(g, w, d, h, m) { lathe(g, m('body'), [[0.001, 0], [w * 0.5, 0.0], [w * 0.5, h], [w * 0.42, h], [w * 0.4, 0.05]], 0, 0, 0, 24); for (let i = 0; i < 5; i++) { const a = i * 1.26; const lg = cy(g, plain(0x4a3020, 0.9, 0), 0.04, 0.04, 0.3, Math.cos(a) * 0.08, h * 0.5, Math.sin(a) * 0.08, 8); lg.rotation.z = 0.8; lg.rotation.y = a; } const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 8), plain(0xffa726, 0.3, 0, { t: 0.8 })); f.position.set(0, h + 0.15, 0); g.add(f); },
  outdoor_dining(g, w, d, h, m) { const wd = m('top'); rbx(g, wd, w, 0.05, d - 0.9, 0, 0.72, 0, 0.015, 1); for (const sx of [-1, 1]) for (const sz of [-1, 1]) tube(g, wd, [sx * (w / 2 - 0.15), 0.0, sz * ((d - 0.9) / 2 - 0.12)], [sx * (w / 2 - 0.15), 0.72, sz * ((d - 0.9) / 2 - 0.12)], 0.035); for (const s of [-1, 1]) { rbx(g, wd, w - 0.1, 0.05, 0.38, 0, 0.42, s * (d / 2 - 0.2), 0.012, 1); for (const sx of [-1, 1]) tube(g, wd, [sx * (w / 2 - 0.2), 0, s * (d / 2 - 0.2)], [sx * (w / 2 - 0.2), 0.42, s * (d / 2 - 0.2)], 0.03); } },
  shed(g, w, d, h, m) { const wd = m('body'); rbx(g, wd, w, h - 0.4, d, 0, 0, 0, 0.01, 1); for (let i = 0; i < Math.round(w / 0.15); i++) rbx(g, plain(0x00000, 0.9, 0, { t: 0.0001 }), 0.004, h - 0.4, 0.004, -w / 2 + i * 0.15, 0, d / 2 + 0.002, 0.001, 1); const rf = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.07, d + 0.3), material('metalroof', 0xffffff)); rf.position.y = h - 0.35; rf.rotation.x = 0.1; g.add(rf); rbx(g, plain(0x6a4a2a, 0.8, 0), 0.9, 1.8, 0.04, 0, 0.0, d / 2 + 0.01, 0.01, 1); },
  dog_house(g, w, d, h, m) { rbx(g, m('body'), w, h * 0.65, d, 0, 0, 0, 0.012, 1); const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.62, h * 0.4, 4), plain(0x6a4a2a, 0.8, 0)); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.9); rf.position.y = h * 0.65 + h * 0.2; g.add(rf); rbx(g, BLACK, w * 0.4, h * 0.45, 0.02, 0, 0.0, d / 2 + 0.005, 0.01, 1); },
  clothesline(g, w, d, h, m) { for (const s of [-1, 1]) tube(g, plain(0x777777, 0.5, 0.6), [s * w / 2, 0, 0], [s * w / 2, h, 0], 0.03); for (let i = 0; i < 4; i++) tube(g, plain(0xddd, 0.9, 0), [-w / 2, h - i * 0.12, 0], [w / 2, h - i * 0.12 - 0.05, 0], 0.004); const cs = [0xe0402a, 0xf2f2f0, 0x2f7de0, 0xf2c230, 0x3d9a4f]; for (let i = 0; i < 5; i++) rbx(g, acc(cs[i]), 0.35, 0.5, 0.01, -w / 2 + 0.5 + i * (w - 1) / 4, h - 0.62, 0, 0.005, 1); },
  fountain(g, w, d, h, m) { lathe(g, m('body'), [[0.001, 0], [w * 0.5, 0.0], [w * 0.5, h * 0.25], [w * 0.46, h * 0.25], [w * 0.44, 0.05]], 0, 0, 0, 32); const wt = new THREE.Mesh(new THREE.CircleGeometry(w * 0.45, 32), WATER); wt.rotation.x = -Math.PI / 2; wt.position.y = h * 0.2; g.add(wt); lathe(g, m('body'), [[0.001, 0], [0.1, 0.0], [0.06, h * 0.3], [0.06, h * 0.5], [0.22, h * 0.58], [0.2, h * 0.6], [0.001, h * 0.58]], 0, h * 0.2, 0, 24); const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, h * 0.3, 8), WATER); jet.position.y = h * 0.82; g.add(jet); },
  umbrella_stand(g, w, d, h, m) { cy(g, m('frame'), 0.03, 0.03, h, 0, 0, 0, 10); lathe(g, m('shade'), [[0.02, h + 0.1], [w * 0.4, h - 0.2], [w * 0.5, h - 0.28], [w * 0.5, h - 0.3], [w * 0.4, h - 0.22], [0.02, h + 0.08]], 0, 0, 0, 16); cy(g, plain(0x777777, 0.5, 0.6), 0.2, 0.25, 0.1, 0, 0, 0, 20); }
});
/* single trees and shrubs the client can place in the garden */
['coconut', 'royal', 'mango', 'ackee', 'breadfruit', 'poinciana', 'banana', 'hibiscus', 'bougainvillea', 'ixora', 'croton', 'hedge', 'queen', 'almond'].forEach((k) => { EXT['tree_' + k] = (g, w, d, h, m, v) => { const t = makeTree(k, (v || 1) * 13 + 5); g.add(t); }; });
