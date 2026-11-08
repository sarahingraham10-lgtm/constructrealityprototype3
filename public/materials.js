/* ConstructReality Studio - realistic materials.
   Every texture is drawn in code (no image files), so it works offline and loads instantly.
   Each kind has: a drawn texture, the real-world size of one texture tile (metres), roughness, and a bump map
   so grout lines, brick joints and concrete pores catch the light. */
import * as THREE from 'three';

const SZ = 512;
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + rnd() * (b - a);
const mk = () => { const c = document.createElement('canvas'); c.width = c.height = SZ; return c; };
const hex = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const clamp = (v) => Math.max(0, Math.min(255, v));
/* draw a shape at 9 offsets so it wraps and the texture tiles without seams */
function wrap(fn) { for (const dx of [-SZ, 0, SZ]) for (const dy of [-SZ, 0, SZ]) fn(dx, dy); }
function speckle(g, n, dark, light, size) {
  for (let i = 0; i < n; i++) { g.fillStyle = rnd() < 0.5 ? `rgba(${dark},${R(0.04, 0.2)})` : `rgba(${light},${R(0.04, 0.2)})`; const s = R(0.6, size || 1.8); g.fillRect(rnd() * SZ, rnd() * SZ, s, s); }
}
function blotches(g, n, rgb, aMax, rMin, rMax) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * SZ, y = rnd() * SZ, r = R(rMin, rMax), a = R(0.02, aMax);
    wrap((dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); });
  }
}

/* ---------- painters: each returns a canvas ---------- */
function paintWood(opts) {
  const { base, dark, planks = 6, vertical = false, grain = 1 } = opts; const c = mk(), g = c.getContext('2d'); const ph = SZ / planks;
  for (let p = 0; p < planks; p++) {
    const k = R(-14, 14), y0 = p * ph;
    g.fillStyle = hex(base[0] + k, base[1] + k * 0.9, base[2] + k * 0.8); g.fillRect(0, y0, SZ, ph);
    const f1 = 1 + Math.floor(rnd() * 3), f2 = 2 + Math.floor(rnd() * 4), p1 = rnd() * 6.28, p2 = rnd() * 6.28, amp = R(2, 7);
    for (let i = 0; i < 46 * grain; i++) {
      const yy = y0 + 3 + (i / (46 * grain)) * (ph - 6) + R(-1, 1); g.beginPath();
      for (let x = 0; x <= SZ; x += 8) { const w = Math.sin(x / SZ * 6.283 * f1 + p1 + i * 0.07) * amp * 0.5 + Math.sin(x / SZ * 6.283 * f2 + p2) * amp * 0.3; x ? g.lineTo(x, yy + w) : g.moveTo(x, yy + w); }
      g.strokeStyle = rnd() < 0.7 ? `rgba(${dark[0]},${dark[1]},${dark[2]},${R(0.05, 0.22)})` : `rgba(255,235,200,${R(0.03, 0.1)})`; g.lineWidth = R(0.5, 1.6); g.stroke();
    }
    if (rnd() < 0.55) { const kx = rnd() * SZ, ky = y0 + ph * R(0.3, 0.7); for (let r = 7; r > 1; r -= 2) { g.beginPath(); g.ellipse(kx, ky, r * 1.9, r * 0.8, 0, 0, 6.283); g.strokeStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},${0.35 - r * 0.03})`; g.lineWidth = 1.2; g.stroke(); } }
    const jx = rnd() * SZ; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(jx, y0, 2, ph);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y0, SZ, 2); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, y0 + 2, SZ, 1);
  }
  if (!vertical) return c;
  const v = mk(), vg = v.getContext('2d'); vg.translate(SZ, 0); vg.rotate(Math.PI / 2); vg.drawImage(c, 0, 0); return v;
}
function paintTile(opts) {
  const { base, grout = [196, 194, 188], n = 4, vary = 8, speck = false } = opts; const c = mk(), g = c.getContext('2d'), s = SZ / n;
  g.fillStyle = hex(...grout); g.fillRect(0, 0, SZ, SZ);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = R(-vary, vary); g.fillStyle = hex(base[0] + k, base[1] + k, base[2] + k); g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.07)'); g.fillStyle = gr; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
  }
  if (speck) speckle(g, 2600, '60,60,60', '255,255,255', 2.4);
  return c;
}
function paintConcrete(opts) {
  const { base = [150, 150, 148], formwork = false, pores = 260 } = opts || {}; const c = mk(), g = c.getContext('2d');
  g.fillStyle = hex(...base); g.fillRect(0, 0, SZ, SZ);
  blotches(g, 90, '255,255,255', 0.1, 40, 150); blotches(g, 90, '40,40,40', 0.12, 30, 120);
  speckle(g, 9000, '30,30,30', '255,255,255', 1.6);
  for (let i = 0; i < pores; i++) { const x = rnd() * SZ, y = rnd() * SZ, r = R(0.6, 2.4); g.fillStyle = `rgba(30,30,30,${R(0.25, 0.6)})`; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
  if (formwork) {
    g.fillStyle = 'rgba(30,30,30,0.35)'; g.fillRect(0, 0, SZ, 2); g.fillRect(0, SZ / 2, SZ, 2); g.fillRect(0, 0, 2, SZ);
    for (const [x, y] of [[SZ * .25, SZ * .25], [SZ * .75, SZ * .25], [SZ * .25, SZ * .75], [SZ * .75, SZ * .75]]) { g.fillStyle = 'rgba(25,25,25,0.7)'; g.beginPath(); g.arc(x, y, 5, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.5; g.stroke(); }
  } else { g.fillStyle = 'rgba(30,30,30,0.22)'; g.fillRect(0, 0, SZ, 1.5); g.fillRect(0, 0, 1.5, SZ); }
  return c;
}
function paintBlock() {
  const c = mk(), g = c.getContext('2d'), rows = 8, cols = 4, bh = SZ / rows, bw = SZ / cols;
  g.fillStyle = 'rgb(168,166,160)'; g.fillRect(0, 0, SZ, SZ);
  for (let r = 0; r < rows; r++) for (let i = -1; i < cols; i++) {
    const x = i * bw + (r % 2 ? bw / 2 : 0), k = R(-16, 16); g.fillStyle = hex(142 + k, 141 + k, 137 + k); g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 3, r * bh + 3, bw - 6, 5); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 3, r * bh + bh - 9, bw - 6, 6);
  }
  speckle(g, 8000, '30,30,30', '255,255,255', 1.8); blotches(g, 50, '30,30,30', 0.1, 30, 90); return c;
}
function paintBrick() {
  const c = mk(), g = c.getContext('2d'), rows = 8, cols = 4, bh = SZ / rows, bw = SZ / cols;
  g.fillStyle = 'rgb(188,182,170)'; g.fillRect(0, 0, SZ, SZ);
  for (let r = 0; r < rows; r++) for (let i = -1; i < cols; i++) {
    const x = i * bw + (r % 2 ? bw / 2 : 0), k = R(-24, 24); g.fillStyle = hex(158 + k, 78 + k * 0.6, 58 + k * 0.5); g.fillRect(x + 4, r * bh + 4, bw - 8, bh - 8);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 4, r * bh + bh - 10, bw - 8, 6);
  }
  speckle(g, 7000, '40,20,10', '255,230,200', 2); blotches(g, 40, '60,25,15', 0.15, 20, 70); return c;
}
function paintStoneWall() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = 'rgb(120,116,108)'; g.fillRect(0, 0, SZ, SZ);
  const rows = 8, rh = SZ / rows;
  for (let r = 0; r < rows; r++) { let x = R(0, 40); const y = r * rh; while (x < SZ + 60) { const w = R(70, 150), k = R(-26, 26), warm = R(-6, 10); g.fillStyle = hex(158 + k + warm, 150 + k, 136 + k - warm); wrap((dx) => { g.fillRect(x + dx + 3, y + 3, w - 6, rh - 6); }); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 3, y + 3, w - 6, 6); x += w; } }
  speckle(g, 7000, '30,30,30', '255,255,255', 2); blotches(g, 50, '40,36,30', 0.13, 20, 80); return c;
}
function paintMarble(opts) {
  const { base = [236, 234, 230], vein = [110, 110, 118] } = opts || {}; const c = mk(), g = c.getContext('2d');
  g.fillStyle = hex(...base); g.fillRect(0, 0, SZ, SZ); blotches(g, 60, '170,170,176', 0.1, 40, 150);
  for (let v = 0; v < 9; v++) {
    let x = rnd() * SZ, y = rnd() * SZ, a = rnd() * 6.283; const pts = [[x, y]];
    for (let i = 0; i < 70; i++) { a += R(-0.5, 0.5); x += Math.cos(a) * 9; y += Math.sin(a) * 9; pts.push([x, y]); }
    const w0 = R(0.6, 2.2), al = R(0.15, 0.5);
    wrap((dx, dy) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0] + dx, p[1] + dy) : g.moveTo(p[0] + dx, p[1] + dy)); g.strokeStyle = `rgba(${vein[0]},${vein[1]},${vein[2]},${al})`; g.lineWidth = w0; g.stroke(); g.strokeStyle = `rgba(${vein[0]},${vein[1]},${vein[2]},${al * 0.3})`; g.lineWidth = w0 * 4; g.stroke(); });
  }
  return c;
}
function paintGranite(opts) {
  const { base = [48, 48, 50] } = opts || {}; const c = mk(), g = c.getContext('2d'); g.fillStyle = hex(...base); g.fillRect(0, 0, SZ, SZ);
  speckle(g, 9000, '10,10,10', '200,200,205', 2.6); speckle(g, 1500, '255,255,255', '220,190,150', 2.2); blotches(g, 40, '255,255,255', 0.05, 30, 90); return c;
}
function paintTerrazzo() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = 'rgb(226,222,214)'; g.fillRect(0, 0, SZ, SZ);
  const cols = [[60, 60, 62], [150, 140, 128], [190, 80, 60], [40, 90, 100], [236, 236, 232], [90, 86, 80], [210, 170, 90]];
  for (let i = 0; i < 520; i++) {
    const x = rnd() * SZ, y = rnd() * SZ, r = R(3, 11), col = cols[Math.floor(rnd() * cols.length)], n = 5 + Math.floor(rnd() * 3), rot = rnd() * 6.283;
    wrap((dx, dy) => { g.beginPath(); for (let k = 0; k < n; k++) { const a = rot + k / n * 6.283, rr = r * R(0.6, 1.1); const px = x + dx + Math.cos(a) * rr, py = y + dy + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fillStyle = hex(...col); g.fill(); });
  }
  speckle(g, 3000, '60,60,60', '255,255,255', 1.6); return c;
}
function paintPlaster(strength) {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = '#ececea'; g.fillRect(0, 0, SZ, SZ);
  blotches(g, 120, '120,120,120', 0.1 * strength, 20, 90); blotches(g, 120, '255,255,255', 0.14 * strength, 20, 90);
  speckle(g, 12000 * strength, '90,90,90', '255,255,255', 1.8); return c;
}
function paintSmooth() { const c = mk(), g = c.getContext('2d'); g.fillStyle = '#f2f2f0'; g.fillRect(0, 0, SZ, SZ); blotches(g, 40, '120,120,120', 0.04, 60, 200); speckle(g, 2500, '120,120,120', '255,255,255', 1.2); return c; }
function paintFabric() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = '#e8e8e6'; g.fillRect(0, 0, SZ, SZ);
  for (let i = 0; i < SZ; i += 3) { g.fillStyle = `rgba(0,0,0,${R(0.04, 0.12)})`; g.fillRect(i, 0, 1.4, SZ); g.fillStyle = `rgba(0,0,0,${R(0.03, 0.1)})`; g.fillRect(0, i, SZ, 1.4); }
  speckle(g, 6000, '60,60,60', '255,255,255', 1.5); return c;
}
function paintSteel() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = 'rgb(196,198,202)'; g.fillRect(0, 0, SZ, SZ);
  for (let i = 0; i < 900; i++) { g.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${R(0.05, 0.25)})` : `rgba(60,64,70,${R(0.05, 0.2)})`; g.fillRect(0, rnd() * SZ, SZ, R(0.5, 1.6)); }
  return c;
}
function paintCeramic() { const c = mk(), g = c.getContext('2d'); g.fillStyle = '#fbfbfa'; g.fillRect(0, 0, SZ, SZ); blotches(g, 30, '200,200,205', 0.05, 80, 220); return c; }


/* ---- more painters: roofs, ground, floors, walls, decor ---- */
function paintHerring() {
  const c = mk(), g = c.getContext('2d'), n = 8, pw = SZ / n, pl = pw * 4; g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, SZ, SZ);
  for (let i = -2; i < n * 2 + 2; i++) for (let j = -2; j < n + 2; j++) {
    const horiz = (i + j) % 2 === 0, k = R(-16, 16), x = i * pw / 1, y = j * pw;
    g.save(); g.beginPath(); g.rect(0, 0, SZ, SZ); g.clip(); g.translate(x, y);
    g.fillStyle = hex(190 + k, 142 + k * 0.8, 92 + k * 0.6);
    if (horiz) g.fillRect(1, 1, pl - 2, pw - 2); else g.fillRect(1, 1, pw - 2, pl - 2);
    g.fillStyle = 'rgba(80,45,15,0.18)'; for (let q = 0; q < 6; q++) { if (horiz) g.fillRect(2, 3 + q * 5, pl - 4, 1); else g.fillRect(3 + q * 5, 2, 1, pl - 4); }
    g.restore();
  }
  speckle(g, 2500, '60,30,10', '255,225,180', 1.4); return c;
}
function paintChecker() {
  const c = mk(), g = c.getContext('2d'), n = 8, s = SZ / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = R(-5, 5), d = (i + j) % 2; g.fillStyle = d ? hex(28 + k, 28 + k, 30 + k) : hex(236 + k, 234 + k, 228 + k); g.fillRect(i * s, j * s, s, s); }
  g.fillStyle = 'rgba(120,120,120,0.55)'; for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, SZ); g.fillRect(0, i * s - 1, SZ, 2); }
  return c;
}
function paintSubway() {
  const c = mk(), g = c.getContext('2d'), cols = 4, rows = 12, bw = SZ / cols, bh = SZ / rows;
  g.fillStyle = 'rgb(200,200,196)'; g.fillRect(0, 0, SZ, SZ);
  for (let r = 0; r < rows; r++) for (let i = -1; i < cols; i++) { const x = i * bw + (r % 2 ? bw / 2 : 0), k = R(-5, 5); g.fillStyle = hex(244 + k, 244 + k, 242 + k); g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 2, r * bh + 2, bw - 4, 3); }
  return c;
}
function paintSlateFloor() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = 'rgb(60,62,64)'; g.fillRect(0, 0, SZ, SZ);
  const rows = 4, rh = SZ / rows; for (let r = 0; r < rows; r++) { let x = R(0, 60); const y = r * rh; while (x < SZ + 100) { const w = R(110, 190), k = R(-22, 22); g.fillStyle = hex(86 + k, 90 + k, 94 + k); wrap((dx) => g.fillRect(x + dx + 3, y + 3, w - 6, rh - 6)); x += w; } }
  speckle(g, 7000, '10,10,10', '210,214,220', 2); blotches(g, 40, '255,255,255', 0.05, 30, 90); return c;
}
function paintWallpaper() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = '#f0efec'; g.fillRect(0, 0, SZ, SZ);
  for (let x = 0; x < SZ; x += 64) { g.fillStyle = 'rgba(0,0,0,0.09)'; g.fillRect(x, 0, 14, SZ); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 14, 0, 3, SZ); }
  for (let y = 16; y < SZ; y += 64) for (let x = 32; x < SZ; x += 64) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(x, y, 8, 12, 0, 0, 6.283); g.fill(); }
  speckle(g, 3000, '90,90,90', '255,255,255', 1.2); return c;
}
function paintClayTile() {
  const c = mk(), g = c.getContext('2d'), cols = 8, rows = 10, tw = SZ / cols, th = SZ / rows;
  g.fillStyle = 'rgb(70,30,18)'; g.fillRect(0, 0, SZ, SZ);
  for (let r = 0; r < rows; r++) for (let i = -1; i <= cols; i++) {
    const x = i * tw + (r % 2 ? tw / 2 : 0), y = r * th, k = R(-20, 20);
    const gr = g.createLinearGradient(x, 0, x + tw, 0); gr.addColorStop(0, hex(150 + k, 62 + k * .5, 36)); gr.addColorStop(0.5, hex(204 + k, 98 + k * .6, 60 + k * .3)); gr.addColorStop(1, hex(136 + k, 54 + k * .5, 32));
    g.fillStyle = gr; g.fillRect(x + 1, y + 1, tw - 2, th + 4); g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(x + 1, y + th - 3, tw - 2, 4);
  }
  speckle(g, 5000, '50,20,10', '255,200,160', 1.8); blotches(g, 30, '40,20,10', 0.15, 20, 60); return c;
}
function paintMetalRoof() {
  const c = mk(), g = c.getContext('2d'), ribs = 16, rw = SZ / ribs;
  for (let i = 0; i < ribs; i++) { const gr = g.createLinearGradient(i * rw, 0, (i + 1) * rw, 0); gr.addColorStop(0, '#a9acb0'); gr.addColorStop(0.45, '#f0f2f4'); gr.addColorStop(0.55, '#e4e6e8'); gr.addColorStop(1, '#8a8d92'); g.fillStyle = gr; g.fillRect(i * rw, 0, rw, SZ); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${R(0.01, 0.05)})`; g.fillRect(rnd() * SZ, rnd() * SZ, R(1, 6), R(10, 60)); }
  g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 40; y < SZ; y += 128) for (let i = 0; i < ribs; i += 2) g.fillRect(i * rw + rw / 2 - 2, y, 4, 4); return c;
}
function paintShingle() {
  const c = mk(), g = c.getContext('2d'), rows = 16, rh = SZ / rows, cols = 8, cw = SZ / cols; g.fillStyle = '#1c1c1e'; g.fillRect(0, 0, SZ, SZ);
  for (let r = 0; r < rows; r++) for (let i = -1; i <= cols; i++) { const x = i * cw + (r % 2 ? cw / 2 : 0), k = R(-14, 14); g.fillStyle = hex(86 + k, 84 + k, 86 + k); g.fillRect(x + 1, r * rh + 1, cw - 2, rh - 1); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 1, r * rh + rh - 4, cw - 2, 4); }
  speckle(g, 9000, '10,10,10', '200,200,205', 1.8); return c;
}
function paintGrass() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = 'rgb(84,128,52)'; g.fillRect(0, 0, SZ, SZ);
  blotches(g, 120, '40,80,30', 0.22, 20, 80); blotches(g, 90, '140,180,80', 0.16, 20, 70);
  for (let i = 0; i < 9000; i++) { const x = rnd() * SZ, y = rnd() * SZ, l = R(4, 11), a = R(-0.6, 0.6) - 1.57; g.strokeStyle = rnd() < 0.5 ? `rgba(40,90,30,${R(.2,.6)})` : `rgba(170,210,100,${R(.15,.5)})`; g.lineWidth = R(0.6, 1.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return c;
}
function paintPavers() {
  const c = mk(), g = c.getContext('2d'), cols = 8, rows = 16, bw = SZ / cols, bh = SZ / rows; g.fillStyle = 'rgb(120,116,110)'; g.fillRect(0, 0, SZ, SZ);
  for (let r = 0; r < rows; r++) for (let i = -1; i < cols; i++) { const x = i * bw + (r % 2 ? bw / 2 : 0), k = R(-18, 18); g.fillStyle = hex(168 + k, 150 + k * .8, 128 + k * .6); g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); }
  speckle(g, 6000, '40,36,30', '255,245,225', 1.8); return c;
}
function paintAsphalt() { const c = mk(), g = c.getContext('2d'); g.fillStyle = 'rgb(58,58,60)'; g.fillRect(0, 0, SZ, SZ); blotches(g, 70, '120,120,120', 0.07, 30, 120); speckle(g, 14000, '10,10,10', '170,170,175', 2.2); return c; }
function paintGravel() { const c = mk(), g = c.getContext('2d'); g.fillStyle = 'rgb(150,144,134)'; g.fillRect(0, 0, SZ, SZ); for (let i = 0; i < 2600; i++) { const k = R(-45, 45), r = R(2, 6); wrap((dx, dy) => { g.fillStyle = hex(160 + k, 152 + k, 140 + k * .8); g.beginPath(); g.ellipse(((i * 37) % SZ) + dx + rnd() * 6, rnd() * SZ + dy, r, r * R(.6, 1), rnd() * 3, 0, 6.283); g.fill(); }); } speckle(g, 5000, '40,36,30', '255,255,255', 2); return c; }
function paintDoorPanel() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = '#e6e2da'; g.fillRect(0, 0, SZ, SZ);
  const pane = (x, y, w, h) => { g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = 3; g.strokeRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, w - 6, h - 6); };
  const mx = 60, gx = 30; const w = (SZ - mx * 2 - gx) / 2; pane(mx, 56, w, 180); pane(mx + w + gx, 56, w, 180); pane(mx, 270, w, 190); pane(mx + w + gx, 270, w, 190);
  for (let y = 0; y < SZ; y += 3) { g.fillStyle = `rgba(0,0,0,${R(0, 0.035)})`; g.fillRect(0, y, SZ, 1); }
  return c;
}
function paintWicker() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = 'rgb(172,134,88)'; g.fillRect(0, 0, SZ, SZ); const s = 16;
  for (let y = 0; y < SZ; y += s) for (let x = 0; x < SZ; x += s) { const hz = ((x + y) / s) % 2 === 0, k = R(-14, 14); g.fillStyle = hex(190 + k, 150 + k, 100 + k * .7); if (hz) g.fillRect(x + 1, y + 2, s - 2, s - 4); else g.fillRect(x + 2, y + 1, s - 4, s - 2); g.fillStyle = 'rgba(0,0,0,0.22)'; if (hz) g.fillRect(x + 1, y + s - 3, s - 2, 2); else g.fillRect(x + s - 3, y + 1, 2, s - 2); }
  return c;
}
function paintRug() {
  const c = mk(), g = c.getContext('2d'); g.fillStyle = '#e9e7e2'; g.fillRect(0, 0, SZ, SZ);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 12; g.strokeRect(24, 24, SZ - 48, SZ - 48); g.lineWidth = 4; g.strokeRect(52, 52, SZ - 104, SZ - 104);
  g.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 5; k++) { const s = 200 - k * 36; g.save(); g.translate(SZ / 2, SZ / 2); g.rotate(Math.PI / 4); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 4; g.strokeRect(-s / 2, -s / 2, s, s); g.restore(); }
  for (let i = 0; i < SZ; i += 2) { g.fillStyle = `rgba(0,0,0,${R(0, 0.06)})`; g.fillRect(i, 0, 1, SZ); }
  speckle(g, 9000, '60,60,60', '255,255,255', 1.4); return c;
}
function paintLeather() { const c = mk(), g = c.getContext('2d'); g.fillStyle = '#d6d2cc'; g.fillRect(0, 0, SZ, SZ); blotches(g, 140, '0,0,0', 0.1, 6, 24); blotches(g, 140, '255,255,255', 0.1, 6, 24); speckle(g, 7000, '0,0,0', '255,255,255', 1.4); return c; }

/* ---------- catalogue ---------- */
/* tile = metres per texture tile;  bump = how strongly the surface catches light;  tintOk = colour choice applies */
export const KINDS = {
  oak:        { n: 'Oak planks',        paint: () => paintWood({ base: [196, 150, 98], dark: [110, 70, 35], planks: 6 }), tile: 1.2, rough: 0.55, bump: 0.35 },
  walnut:     { n: 'Dark timber',       paint: () => paintWood({ base: [96, 62, 40], dark: [30, 16, 8], planks: 6 }), tile: 1.2, rough: 0.5, bump: 0.35 },
  mahogany:   { n: 'Mahogany',          paint: () => paintWood({ base: [138, 66, 40], dark: [58, 22, 10], planks: 6 }), tile: 1.2, rough: 0.5, bump: 0.35 },
  pine:       { n: 'Pine',              paint: () => paintWood({ base: [222, 184, 126], dark: [150, 100, 50], planks: 6 }), tile: 1.2, rough: 0.6, bump: 0.3 },
  woodv:      { n: 'Wood panelling',    paint: () => paintWood({ base: [182, 132, 84], dark: [96, 58, 28], planks: 6, vertical: true }), tile: 1.2, rough: 0.6, bump: 0.35 },
  tile:       { n: 'Ceramic tile',      paint: () => paintTile({ base: [226, 223, 214], n: 4 }), tile: 1.2, rough: 0.28, bump: 0.5 },
  tilegrey:   { n: 'Grey porcelain',    paint: () => paintTile({ base: [150, 152, 154], n: 4, speck: true }), tile: 1.2, rough: 0.3, bump: 0.5 },
  tilewhite:  { n: 'White gloss tile',  paint: () => paintTile({ base: [246, 246, 244], grout: [205, 205, 200], n: 8, vary: 3 }), tile: 1.2, rough: 0.12, bump: 0.4 },
  concrete:   { n: 'Polished concrete', paint: () => paintConcrete({ base: [160, 160, 158] }), tile: 2.0, rough: 0.4, bump: 0.15 },
  exconcrete: { n: 'Exposed concrete',  paint: () => paintConcrete({ base: [142, 142, 140], formwork: true, pores: 420 }), tile: 2.4, rough: 0.9, bump: 0.5 },
  block:      { n: 'Concrete block',    paint: paintBlock, tile: 1.6, rough: 0.95, bump: 0.7 },
  brick:      { n: 'Red brick',         paint: paintBrick, tile: 1.1, rough: 0.9, bump: 0.7 },
  stone:      { n: 'Stone cladding',    paint: paintStoneWall, tile: 1.6, rough: 0.9, bump: 0.8 },
  marble:     { n: 'White marble',      paint: () => paintMarble({}), tile: 2.0, rough: 0.12, bump: 0.05 },
  marbledark: { n: 'Dark marble',       paint: () => paintMarble({ base: [48, 48, 52], vein: [220, 220, 224] }), tile: 2.0, rough: 0.12, bump: 0.05 },
  terrazzo:   { n: 'Terrazzo',          paint: paintTerrazzo, tile: 1.4, rough: 0.3, bump: 0.1 },
  granite:    { n: 'Black granite',     paint: () => paintGranite({}), tile: 1.0, rough: 0.2, bump: 0.05 },
  quartz:     { n: 'White quartz',      paint: () => paintGranite({ base: [236, 234, 230] }), tile: 1.0, rough: 0.2, bump: 0.05 },
  paint:      { n: 'Smooth paint',      paint: paintSmooth, tile: 2.0, rough: 0.9, bump: 0.0, tint: true },
  plaster:    { n: 'Textured plaster',  paint: () => paintPlaster(1), tile: 1.2, rough: 0.95, bump: 0.5, tint: true },
  render:     { n: 'Rough render',      paint: () => paintPlaster(1.6), tile: 1.0, rough: 1.0, bump: 0.9, tint: true },
  fabric:     { n: 'Fabric',            paint: paintFabric, tile: 0.5, rough: 1.0, bump: 0.3, tint: true },
  steel:      { n: 'Stainless steel',   paint: paintSteel, tile: 1.0, rough: 0.35, metal: 0.8, bump: 0 },
  ceramic:    { n: 'White ceramic',     paint: paintCeramic, tile: 1.0, rough: 0.1, bump: 0 },
  herring:    { n: 'Herringbone oak',   paint: paintHerring, tile: 1.0, rough: 0.5, bump: 0.3 },
  checker:    { n: 'Black and white',   paint: paintChecker, tile: 1.6, rough: 0.2, bump: 0.3 },
  slatefloor: { n: 'Slate',             paint: paintSlateFloor, tile: 1.6, rough: 0.7, bump: 0.6 },
  subway:     { n: 'Subway tile',       paint: paintSubway, tile: 0.9, rough: 0.15, bump: 0.5 },
  wallpaper:  { n: 'Wallpaper',         paint: paintWallpaper, tile: 1.0, rough: 0.8, bump: 0.15, tint: true },
  cltile:     { n: 'Clay roof tile',    paint: paintClayTile, tile: 1.4, rough: 0.8, bump: 0.8, tint: true },
  metalroof:  { n: 'Metal roofing',     paint: paintMetalRoof, tile: 1.2, rough: 0.35, metal: 0.4, bump: 0.5, tint: true },
  shingle:    { n: 'Shingles',          paint: paintShingle, tile: 1.2, rough: 0.9, bump: 0.6, tint: true },
  grass:      { n: 'Grass',             paint: paintGrass, tile: 2.0, rough: 1.0, bump: 0.3, tint: true },
  pavers:     { n: 'Paving stones',    paint: paintPavers, tile: 1.6, rough: 0.9, bump: 0.5 },
  asphalt:    { n: 'Asphalt',           paint: paintAsphalt, tile: 2.0, rough: 0.95, bump: 0.3 },
  gravel:     { n: 'Gravel',            paint: paintGravel, tile: 1.6, rough: 1.0, bump: 0.8 },
  doorpanel:  { n: 'Panel door',        paint: paintDoorPanel, tile: 1.0, rough: 0.55, bump: 0.5, tint: true },
  wicker:     { n: 'Wicker',            paint: paintWicker, tile: 0.6, rough: 0.9, bump: 0.5 },
  rug:        { n: 'Rug',               paint: paintRug, tile: 1.0, rough: 1.0, bump: 0.2, tint: true },
  leather:    { n: 'Leather',           paint: paintLeather, tile: 0.5, rough: 0.55, bump: 0.2, tint: true }
};

const canvases = {}, textures = {}, bumps = {}, mats = {};
function canvasFor(kind) {
  if (!canvases[kind]) { seed = 7 + kind.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0); canvases[kind] = KINDS[kind].paint(); }
  return canvases[kind];
}
/* a small preview image for the picker buttons */
export function thumb(kind, tintHex) {
  const c = canvasFor(kind), t = document.createElement('canvas'); t.width = t.height = 128; const g = t.getContext('2d');
  g.drawImage(c, 0, 0, SZ, SZ, 0, 0, 256, 256);
  if (tintHex && tintHex !== 0xffffff) { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#' + tintHex.toString(16).padStart(6, '0'); g.fillRect(0, 0, 128, 128); }
  return t;
}
function texFor(kind) {
  if (!textures[kind]) { const t = new THREE.CanvasTexture(canvasFor(kind)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; const k = 1 / KINDS[kind].tile; t.repeat.set(k, k); textures[kind] = t; }
  return textures[kind];
}
function bumpFor(kind) {
  if (!bumps[kind]) {
    const src = canvasFor(kind), c = mk(), g = c.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, SZ, SZ), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const l = a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11; const v = clamp(l); a[i] = a[i + 1] = a[i + 2] = v; }
    g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; const k = 1 / KINDS[kind].tile; t.repeat.set(k, k); bumps[kind] = t;
  }
  return bumps[kind];
}
/* one material per (kind, colour). Clones for the "selected room" glow are made by the caller. */
export function material(kind, tint, opts) {
  const key = kind + '|' + (tint || 0xffffff) + '|' + (opts && opts.glow ? 'g' : '');
  if (mats[key]) return mats[key];
  const K = KINDS[kind] || KINDS.paint;
  const m = new THREE.MeshStandardMaterial({ map: texFor(kind), color: tint === undefined ? 0xffffff : tint, roughness: K.rough, metalness: K.metal || 0 });
  if (K.bump > 0) { m.bumpMap = bumpFor(kind); m.bumpScale = K.bump * 2.2; }
  if (opts && opts.glow) m.emissive = new THREE.Color(0x303030);
  return (mats[key] = m);
}
/* plain (untextured) materials: metal, glass, painted trim */
const plains = {};
export function plain(color, rough, metal, opts) {
  const key = [color, rough, metal, opts && opts.t].join('|'); if (plains[key]) return plains[key];
  const o = { color, roughness: rough === undefined ? 0.6 : rough, metalness: metal || 0 };
  if (opts && opts.t) { o.transparent = true; o.opacity = opts.t; o.depthWrite = false; }
  return (plains[key] = new THREE.MeshStandardMaterial(o));
}
/* scale a box's UVs to metres so textures keep their real-world size on any wall or floor */
export function metricUV(geo, w, h, d) {
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
  uv.needsUpdate = true; return geo;
}

/* ---------- what the client can choose ---------- */
export const SURFACES = {
  floor:   { n: 'Floors',      room: true,  kinds: ['oak', 'herring', 'walnut', 'pine', 'tile', 'tilegrey', 'checker', 'concrete', 'marble', 'terrazzo', 'slatefloor', 'tilewhite'], dflt: 'tile' },
  wallIn:  { n: 'Inside walls', room: true, kinds: ['paint', 'plaster', 'wallpaper', 'exconcrete', 'brick', 'woodv', 'stone', 'subway', 'tilewhite', 'marble'], dflt: 'paint' },
  wallOut: { n: 'Outside walls', room: false, kinds: ['render', 'block', 'brick', 'stone', 'exconcrete', 'woodv', 'plaster', 'paint'], dflt: 'render' },
  ceil:    { n: 'Ceilings',    room: false, kinds: ['paint', 'plaster', 'pine', 'oak', 'walnut', 'exconcrete'], dflt: 'paint' },
  counter: { n: 'Counters',    room: false, kinds: ['granite', 'quartz', 'marble', 'marbledark', 'oak', 'concrete', 'terrazzo', 'steel'], dflt: 'granite' }
};
export const COLOURS = [
  ['Natural', 0xffffff], ['Warm white', 0xf3ead8], ['Cream', 0xecd9a8], ['Sand', 0xd8b98a], ['Sunshine', 0xf2c230], ['Coral', 0xee6f57],
  ['Terracotta', 0xc2603c], ['Sage', 0x9fb59a], ['Seafoam', 0x86d1be], ['Sky blue', 0x8cc3e6], ['Navy', 0x25405e], ['Charcoal', 0x4a4a4c]
];
/* sensible starting finishes so nothing ever looks bare */
export function defaultFloor(type) { return ({ bedroom: 'oak', office: 'oak', bathroom: 'tilewhite', kitchen: 'tilegrey', laundry: 'tilegrey', living: 'tile', dining: 'tile', hall: 'tile' })[type] || 'tile'; }
