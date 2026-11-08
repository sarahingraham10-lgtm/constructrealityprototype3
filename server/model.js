'use strict';
/*
 * ConstructReality Studio - design model, geometry and room layout.
 * Units are metres. The plan is a grid of 0.5 m cells. x runs left to right, z runs from the back (0) to the front (plot depth).
 * The street is at the front (largest z).
 */
const G = 0.5;
const TYPES = {
  living:   { name: 'Living room', min: [3.5, 3.5], def: [5, 4.5], habitable: true,  group: 'public' },
  dining:   { name: 'Dining',      min: [2.5, 2.5], def: [3.5, 3.5], habitable: true, group: 'public' },
  kitchen:  { name: 'Kitchen',     min: [2.5, 2.5], def: [3.5, 3.5], habitable: true, group: 'public', wet: true },
  bedroom:  { name: 'Bedroom',     min: [2.8, 2.8], def: [3.5, 3.5], habitable: true, group: 'private' },
  bathroom: { name: 'Bathroom',    min: [1.5, 2.0], def: [2.0, 2.5], wet: true, group: 'private' },
  laundry:  { name: 'Laundry',     min: [1.5, 1.5], def: [2.0, 2.0], wet: true, group: 'private' },
  office:   { name: 'Office',      min: [2.5, 2.5], def: [3.0, 3.0], habitable: true, group: 'private' },
  hall:     { name: 'Hallway',     min: [1.0, 1.0], def: [1.5, 3.0], group: 'private' },
  stairs:   { name: 'Staircase',   min: [1.5, 3.5], def: [1.5, 3.5], group: 'spine' },
  garage:   { name: 'Garage',      min: [3.0, 5.0], def: [3.5, 5.5], group: 'public' }
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const snap = v => Math.round((Number(v) || 0) / G) * G;
const r2 = v => Math.round(v * 100) / 100;

function overlap(a, b) {
  return a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.z < b.z + b.d - 1e-9 && b.z < a.z + a.d - 1e-9;
}

/* Clean up whatever the headset sends: snap to grid, keep inside the plot, give every room an id and a name. */
function normalize(input) {
  const issues = [];
  const plot = { w: clamp(snap(input && input.plot && input.plot.w || 16), 8, 30), d: clamp(snap(input && input.plot && input.plot.d || 12), 8, 30) };
  const rooms = [];
  const used = new Set();
  let counter = 0;
  const list = Array.isArray(input && input.rooms) ? input.rooms.slice(0, 24) : [];
  for (const r of list) {
    if (!r || !TYPES[r.type]) continue;
    const w = clamp(snap(r.w), 1, plot.w), d = clamp(snap(r.d), 1, plot.d);
    let id = typeof r.id === 'string' && /^R\d+$/.test(r.id) && !used.has(r.id) ? r.id : null;
    while (!id) { counter++; const c = 'R' + counter; if (!used.has(c)) id = c; }
    used.add(id);
    rooms.push({ id, type: r.type, name: r.name ? String(r.name).slice(0, 24) : '', x: clamp(snap(r.x), 0, plot.w - w), z: clamp(snap(r.z), 0, plot.d - d), w, d });
  }
  const total = {}, seen = {};
  rooms.forEach(r => { total[r.type] = (total[r.type] || 0) + 1; });
  rooms.forEach(r => { seen[r.type] = (seen[r.type] || 0) + 1; r.label = r.name || (TYPES[r.type].name + (total[r.type] > 1 ? ' ' + seen[r.type] : '')); r.area = r2(r.w * r.d); });
  for (let i = 0; i < rooms.length; i++) {
    const a = rooms[i];
    const t = TYPES[a.type];
    const dims = [a.w, a.d].sort((p, q) => p - q), mins = [...t.min].sort((p, q) => p - q);
    const small = dims[0] < mins[0] - 1e-9 || dims[1] < mins[1] - 1e-9;
    if (small) issues.push({ level: 'warn', room: a.id, text: `${a.label} is smaller than the usual minimum of ${t.min[0]} m x ${t.min[1]} m.` });
    for (let j = i + 1; j < rooms.length; j++) if (overlap(a, rooms[j])) issues.push({ level: 'error', room: a.id, text: `${a.label} overlaps ${rooms[j].label}.` });
  }
  return { design: { plot, rooms }, issues };
}

/* ---------- walls, doors, windows ---------- */
function analyzeGeometry(input, opts) {
  opts = opts || {}; const level = opts.level || 0, storeys = opts.storeys || 1;
  const { design, issues } = normalize(input);
  const D = design, rooms = D.rooms;
  const N = Math.round(D.plot.w / G), M = Math.round(D.plot.d / G);
  const own = Array.from({ length: N }, () => new Array(M).fill(-1));
  rooms.forEach((r, idx) => {
    for (let i = Math.round(r.x / G); i < Math.round((r.x + r.w) / G); i++)
      for (let j = Math.round(r.z / G); j < Math.round((r.z + r.d) / G); j++) if (own[i][j] === -1) own[i][j] = idx;
  });
  const runs = [];
  const cell = (i, j) => (i < 0 || j < 0 || i >= N || j >= M) ? -1 : own[i][j];
  for (let i = 0; i <= N; i++) {            // vertical boundaries at x = i * G
    const open = new Map();
    for (let j = 0; j < M; j++) {
      const a = cell(i - 1, j), b = cell(i, j);
      if (a === b) { continue; }
      const key = a + '|' + b;
      const prev = open.get(key);
      if (prev && prev.j1 === j - 1) { prev.j1 = j; } else { const run = { ori: 'v', a, b, i, j0: j, j1: j }; open.set(key, run); runs.push(run); }
    }
  }
  for (let j = 0; j <= M; j++) {            // horizontal boundaries at z = j * G
    const open = new Map();
    for (let i = 0; i < N; i++) {
      const a = cell(i, j - 1), b = cell(i, j);
      if (a === b) { continue; }
      const key = a + '|' + b;
      const prev = open.get(key);
      if (prev && prev.i1 === i - 1) { prev.i1 = i; } else { const run = { ori: 'h', a, b, j, i0: i, i1: i }; open.set(key, run); runs.push(run); }
    }
  }
  const walls = runs.map((r, n) => {
    const w = r.ori === 'v'
      ? { x1: r.i * G, z1: r.j0 * G, x2: r.i * G, z2: (r.j1 + 1) * G }
      : { x1: r.i0 * G, z1: r.j * G, x2: (r.i1 + 1) * G, z2: r.j * G };
    return { id: 'W' + (n + 1), ori: r.ori, a: r.a, b: r.b, ext: r.a < 0 || r.b < 0, ...w, len: r2(Math.abs(w.x2 - w.x1) + Math.abs(w.z2 - w.z1)) };
  });
  const mid = w => ({ x: (w.x1 + w.x2) / 2, z: (w.z1 + w.z2) / 2 });
  const roomOf = w => (w.a >= 0 ? w.a : w.b);

  /* doors */
  const doors = [];
  const sn = v => Math.round(v * 4) / 4;
  if (rooms.length) {
    let entry = rooms.findIndex(r => r.type === 'living'); if (entry < 0) entry = 0;
    if (level > 0) { const st = rooms.findIndex(r => r.type === 'stairs'); entry = st >= 0 ? st : 0; }
    const hasStairs = rooms.some(r => r.type === 'stairs');
    if (storeys > 1 && !hasStairs) issues.push({ level: 'error', room: rooms[entry].id, text: 'Add a staircase on this floor so people can reach the other floors.' });
    const ext = level > 0 ? [] : walls.filter(w => w.ext && roomOf(w) === entry && w.len >= 1.4);
    ext.sort((p, q) => ((q.ori === 'h' ? 1 : 0) - (p.ori === 'h' ? 1 : 0)) || (Math.max(q.z1, q.z2) - Math.max(p.z1, p.z2)) || (q.len - p.len));
    const front = ext[0];
    if (front) { const m = mid(front); doors.push({ id: 'D1', kind: 'door', ext: true, front: true, x: sn(m.x), z: sn(m.z), ori: front.ori, w: 1.0, rooms: [entry, -1], wall: front.id }); }
    else if (level === 0) issues.push({ level: 'error', room: rooms[entry].id, text: `${rooms[entry].label} has no outside wall long enough for a front door.` });
    const seen = new Set([entry]);
    const score = (from, to) => {
      const tf = rooms[from].type, tt = rooms[to].type;
      if (tt === 'stairs' || tf === 'stairs') return 4;
      if (tt === 'bathroom' || tt === 'laundry') return { bedroom: 3, hall: 3, living: 2, kitchen: tt === 'laundry' ? 3 : 1 }[tf] || 1;
      return { living: 3, hall: 3, dining: 2, kitchen: 2 }[tf] || 1;
    };
    for (;;) {
      let best = null;
      for (const w of walls) {
        if (w.ext || w.len < 1.0) continue;
        for (const [f, t] of [[w.a, w.b], [w.b, w.a]]) {
          if (seen.has(f) && !seen.has(t) && t >= 0) { const sc = score(f, t) * 10 + w.len; if (!best || sc > best.sc) best = { sc, w, f, t }; }
        }
      }
      if (!best) break;
      seen.add(best.t);
      const m = mid(best.w);
      doors.push({ id: 'D' + (doors.length + 1), kind: 'door', ext: false, x: sn(m.x), z: sn(m.z), ori: best.w.ori, w: 0.9, rooms: [best.f, best.t], wall: best.w.id });
    }
    rooms.forEach((r, i) => { if (!seen.has(i)) issues.push({ level: 'error', room: r.id, text: `${r.label} has no door yet. Place it so it shares a wall with another room (at least 1 m).` }); });
    rooms.forEach((r, gi) => {
      if (r.type !== 'garage' || level > 0) return;
      const gw = walls.filter(w => w.ext && roomOf(w) === gi && w.ori === 'h' && w.len >= 2.6).sort((p, q) => Math.max(q.z1, q.z2) - Math.max(p.z1, p.z2))[0];
      if (gw) { const m = mid(gw); doors.push({ id: 'D' + (doors.length + 1), kind: 'door', ext: true, garage: true, x: sn(m.x), z: sn(m.z), ori: gw.ori, w: 2.4, hgt: 2.2, rooms: [gi, -1], wall: gw.id }); }
      else issues.push({ level: 'warn', room: r.id, text: `${r.label} needs a long outside wall facing the street for the car door.` });
    });
    const k = level > 0 ? -1 : rooms.findIndex(r => r.type === 'kitchen');
    if (k >= 0) {
      const kw = walls.filter(w => w.ext && roomOf(w) === k && w.len >= 1.2 && !(front && w.id === front.id)).sort((p, q) => q.len - p.len)[0];
      if (kw) { const m = mid(kw); doors.push({ id: 'D' + (doors.length + 1), kind: 'door', ext: true, back: true, x: sn(m.x), z: sn(m.z), ori: kw.ori, w: 0.9, rooms: [k, -1], wall: kw.id }); }
    }
  }

  /* windows */
  const windows = [];
  for (const w of walls) {
    if (!w.ext) continue;
    const ri = roomOf(w), r = rooms[ri];
    if (r.type === 'hall' || r.type === 'garage') continue;
    const bath = r.type === 'bathroom' || r.type === 'laundry';
    const ww = bath ? 0.6 : r.type === 'living' ? 1.8 : r.type === 'bedroom' ? 1.2 : 1.2;
    if (w.len < ww + 0.8) continue;
    const n = Math.max(1, Math.floor(w.len / 3.2));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = w.x1 + (w.x2 - w.x1) * t, z = w.z1 + (w.z2 - w.z1) * t;
      const clash = doors.some(d => d.wall === w.id && Math.hypot(d.x - x, d.z - z) < d.w / 2 + ww / 2 + 0.2);
      if (clash) continue;
      windows.push({ id: 'N' + (windows.length + 1), kind: 'window', x: sn(x), z: sn(z), ori: w.ori, w: ww, sill: bath ? 1.5 : 0.9, head: 2.1, rooms: [ri, -1], wall: w.id });
    }
  }

  /* fixtures */
  const fixtures = [];
  rooms.forEach((r, ri) => placeFixtures(r, ri, doors, fixtures, issues));

  return { design: D, issues, walls, doors, windows, fixtures };
}

/* ---------- fixtures ---------- */
const KIND = {
  shower:  { code: 'SH', h: 0.1,  name: 'Shower',        wet: true, hot: true,  drain: 50 },
  toilet:  { code: 'WC', h: 0.42, name: 'Toilet',        wet: true, hot: false, drain: 100 },
  basin:   { code: 'WB', h: 0.85, name: 'Wash basin',    wet: true, hot: true,  drain: 50 },
  ksink:   { code: 'KS', h: 0.9,  name: 'Kitchen sink',  wet: true, hot: true,  drain: 50 },
  cooker:  { code: 'CK', h: 0.9,  name: 'Cooker' },
  fridge:  { code: 'RF', h: 1.8,  name: 'Refrigerator' },
  counter: { code: 'CT', h: 0.9,  name: 'Counter' },
  washer:  { code: 'WM', h: 0.85, name: 'Washing machine', wet: true, hot: false, drain: 50 },
  lsink:   { code: 'LS', h: 0.85, name: 'Laundry sink',  wet: true, hot: false, drain: 50 },
  bed:     { code: 'BD', h: 0.5,  name: 'Bed' },
  wardrobe:{ code: 'WD', h: 2.0,  name: 'Wardrobe' },
  sofa:    { code: 'SF', h: 0.8,  name: 'Sofa' },
  tv:      { code: 'TV', h: 0.5,  name: 'TV unit' },
  table:   { code: 'TB', h: 0.75, name: 'Dining table' },
  desk:    { code: 'DK', h: 0.75, name: 'Desk' }
};
const ITEMS = {                                    // only fixtures that carry plumbing or are fixed appliances; furniture is placed in the headset app
  bathroom: [['shower', .9, .9], ['toilet', .5, .7], ['basin', .5, .45]],
  kitchen:  [['fridge', .7, .7], ['ksink', 1.2, .6], ['cooker', .6, .6], ['counter', 1.0, .6]],
  laundry:  [['washer', .6, .6], ['lsink', .6, .5]]
};

function roomSides(r) {
  return [
    { side: 'top', ori: 'h', fix: r.z, a0: r.x, a1: r.x + r.w, nx: 0, nz: 1 },
    { side: 'bottom', ori: 'h', fix: r.z + r.d, a0: r.x, a1: r.x + r.w, nx: 0, nz: -1 },
    { side: 'left', ori: 'v', fix: r.x, a0: r.z, a1: r.z + r.d, nx: 1, nz: 0 },
    { side: 'right', ori: 'v', fix: r.x + r.w, a0: r.z, a1: r.z + r.d, nx: -1, nz: 0 }
  ];
}
/* stretches of wall in a room that are free of doors */
function freeIntervals(r, ri, doors) {
  const out = [];
  for (const s of roomSides(r)) {
    let ivs = [[s.a0, s.a1]];
    for (const d of doors) {
      if (!d.rooms.includes(ri) || d.ori !== s.ori) continue;
      const onLine = s.ori === 'h' ? Math.abs(d.z - s.fix) < 1e-6 : Math.abs(d.x - s.fix) < 1e-6;
      const along = s.ori === 'h' ? d.x : d.z;
      if (!onLine || along < s.a0 - 1e-6 || along > s.a1 + 1e-6) continue;
      const b0 = along - d.w / 2 - 0.45, b1 = along + d.w / 2 + 0.45;
      ivs = ivs.flatMap(([p, q]) => (b1 <= p || b0 >= q) ? [[p, q]] : [[p, Math.max(p, b0)], [Math.min(q, b1), q]]).filter(([p, q]) => q - p > 0.05);
    }
    ivs.forEach(([p, q]) => { if (q - p >= 0.5) out.push({ ...s, p, q, cursor: p }); });
  }
  return out.sort((a, b) => (b.q - b.p) - (a.q - a.p));
}

function placeFixtures(r, ri, doors, fixtures, issues) {
  const items = ITEMS[r.type]; if (!items) return;
  const placed = [];
  const ivs = freeIntervals(r, ri, doors);
  const add = (kind, x, z, w, d, side) => {
    const box = { x: x - w / 2, z: z - d / 2, w, d };
    if (placed.some(p => overlap(p, box))) return false;
    placed.push(box);
    const K = KIND[kind];
    let px = x, pz = z;
    if (side) { if (side.ori === 'h') pz = side.fix; else px = side.fix; }
    fixtures.push({ id: 'F' + (fixtures.length + 1), kind, code: K.code, name: K.name, room: ri, roomId: r.id, x: r2(x), z: r2(z), w, d, h: K.h, wet: !!K.wet, hot: !!K.hot, drain: K.drain || 0, px: r2(px), pz: r2(pz), nx: side ? side.nx : 0, nz: side ? side.nz : 0 });
    return true;
  };
  for (const [kind, len, dep, flag] of items) {
    if (flag === 'center') {
      const horiz = r.w >= r.d;
      add(kind, r.x + r.w / 2, r.z + r.d / 2, horiz ? len : dep, horiz ? dep : len, null);
      continue;
    }
    let ok = false;
    for (const iv of ivs) {
      const room = iv.q - iv.cursor;
      if (room < len + 0.02) continue;
      const start = flag === true ? iv.cursor + (room - len) / 2 : iv.cursor;
      const c = start + len / 2;
      let x, z, w, d;
      if (iv.ori === 'h') { x = c; z = iv.fix + iv.nz * dep / 2; w = len; d = dep; } else { x = iv.fix + iv.nx * dep / 2; z = c; w = dep; d = len; }
      if (add(kind, x, z, w, d, iv)) { iv.cursor = start + len + 0.05; ok = true; break; }
    }
    if (!ok) issues.push({ level: 'warn', room: r.id, text: `${r.label} is too tight for a ${KIND[kind].name.toLowerCase()}. Make it larger or move a door.` });
  }
}

/* ---------- automatic first draft from a brief ---------- */
function pack(spec, plotIn, opts) {
  const SP = opts && opts.spine ? 1.5 : 0;
  const plot = { w: clamp(snap(plotIn && plotIn.w || 16), 8, 30), d: clamp(snap(plotIn && plotIn.d || 12), 8, 30) };
  const BW = plot.w - 1 - SP;
  const list = (spec.rooms || []).filter(r => TYPES[r.type]).slice(0, 14).map(r => {
    const t = TYPES[r.type];
    return { type: r.type, w: clamp(snap(r.w || t.def[0]), t.min[0], 8), d: clamp(snap(r.d || t.def[1]), t.min[1], 8), min: Math.max(...t.min) };
  });
  const notes = [];
  const rows = [];                                   // rows of rooms, each flagged front or back
  const newRow = side => { const row = { side, rooms: [], w: 0 }; rows.push(row); return row; };
  const put = (row, r) => { row.rooms.push(r); row.w += r.w; };
  list.filter(r => TYPES[r.type].group === 'public').forEach(r => { const row = rows.find(x => x.side === 'front' && x.w + r.w <= BW + 1e-9) || newRow('front'); put(row, r); });
  list.filter(r => r.type === 'bedroom').forEach(r => { const row = rows.find(x => x.side === 'back' && x.w + r.w <= BW + 1e-9) || newRow('back'); put(row, r); });
  list.filter(r => TYPES[r.type].group === 'private' && r.type !== 'bedroom').forEach(r => {
    const fits = rows.filter(x => x.w + r.w <= BW + 1e-9).sort((p, q) => (BW - p.w - r.w) - (BW - q.w - r.w));
    put(fits[0] || newRow('back'), r);
  });
  const ordered = [...rows.filter(r => r.side === 'back'), ...rows.filter(r => r.side === 'front')];
  const depthOf = row => Math.max(...row.rooms.map(r => r.d));
  let total = ordered.reduce((s, row) => s + depthOf(row), 0);
  for (let guard = 0; total > plot.d - 2 + 1e-9 && guard < 40; guard++) {       // shrink the deepest row that can still shrink
    const row = ordered.filter(rw => rw.rooms.some(r => r.d > r.min + 1e-9)).sort((p, q) => depthOf(q) - depthOf(p))[0];
    if (!row) break;
    const dd = depthOf(row); row.rooms.forEach(r => { if (r.d >= dd - 1e-9 && r.d > r.min) r.d = Math.max(r.min, r.d - G); });
    total = ordered.reduce((s, rw) => s + depthOf(rw), 0);
  }
  if (total > plot.d - 2 + 1e-9) { plot.d = clamp(snap(total + 2), plot.d, 30); notes.push('The plot depth was increased so every room fits.'); }
  if (SP && ordered.length) { const t0 = ordered.reduce((s, rw) => s + depthOf(rw), 0); if (t0 < 3.5 - 1e-9) ordered[0].rooms.forEach(r => { r.d = Math.max(r.d, snap(3.5 - (t0 - depthOf(ordered[0])))); }); }
  const T = ordered.reduce((s, rw) => s + depthOf(rw), 0);
  let z = Math.max(1, plot.d - 1 - T);
  const out = [];
  for (const row of ordered) {
    const depth = depthOf(row);
    let extra = Math.max(0, BW - row.w), i = 0, guard = 0;
    const cap = new Map();
    while (extra >= G - 1e-9 && guard++ < 200) {
      const r = row.rooms[i % row.rooms.length]; i++;
      if ((cap.get(r) || 0) >= 2 && row.w < BW - 2) continue;
      r.w += G; extra -= G; row.w += G; cap.set(r, (cap.get(r) || 0) + G);
      if (row.rooms.every(q => (cap.get(q) || 0) >= 2) && extra > 0) break;
    }
    let x = 0.5 + SP;
    for (const r of row.rooms) { out.push({ type: r.type, x, z, w: r.w, d: depth }); x += r.w; }
    z += depth;
  }
  if (SP) {                                          // a stair-and-hall column down the left side, stairs always at the same spot on every floor
    const zf = plot.d - 1; out.push({ type: 'stairs', x: 0.5, z: zf - 3.5, w: 1.5, d: 3.5 });
    if (T - 3.5 >= 1 - 1e-9) out.push({ type: 'hall', x: 0.5, z: zf - T, w: 1.5, d: T - 3.5 });
  }
  return { design: normalize({ plot, rooms: out }).design, notes };
}

function templateSpec(brief) {
  const beds = clamp(parseInt(brief.bedrooms) || 2, 1, 6), baths = clamp(parseInt(brief.bathrooms) || 1, 1, 5);
  const rooms = [{ type: 'living', w: 5, d: 4.5 }, { type: 'kitchen', w: 3.5, d: 4.5 }];
  if (brief.dining) rooms.push({ type: 'dining', w: 3.5, d: 4.5 });
  for (let i = 0; i < beds; i++) rooms.push({ type: 'bedroom', w: i === 0 ? 4 : 3.5, d: 3.5 });
  for (let i = 0; i < baths; i++) rooms.push({ type: 'bathroom', w: 2, d: 3.5 });
  if (brief.laundry) rooms.push({ type: 'laundry', w: 2, d: 3.5 });
  if (brief.office) rooms.push({ type: 'office', w: 3, d: 3.5 });
  if (brief.garage) rooms.push({ type: 'garage', w: 3.5, d: 5.5 });
  return { rooms };
}
/* a home of two or three storeys: living areas below, bedrooms above, one staircase in the same place on every floor */
function packLevels(brief, plotIn) {
  const storeys = clamp(parseInt(brief.storeys) || 1, 1, 3);
  const beds = clamp(parseInt(brief.bedrooms) || 2, 1, 6), baths = clamp(parseInt(brief.bathrooms) || 1, 1, 5);
  if (storeys === 1) { const o = pack(templateSpec(brief), plotIn); return { plot: o.design.plot, levels: [{ rooms: o.design.rooms }], notes: o.notes }; }
  const ground = [{ type: 'living', w: 5, d: 4.5 }, { type: 'kitchen', w: 3.5, d: 4.5 }];
  if (brief.dining) ground.push({ type: 'dining', w: 3.5, d: 4.5 });
  if (brief.laundry) ground.push({ type: 'laundry', w: 2, d: 3.5 });
  if (brief.garage) ground.push({ type: 'garage', w: 3.5, d: 5.5 });
  const upper = storeys === 2 ? [[]] : [[], []];
  const bedsUp = storeys === 2 ? [beds] : [Math.ceil(beds / 2), beds - Math.ceil(beds / 2)];
  let bathsUp = baths; if (baths >= 2) { ground.push({ type: 'bathroom', w: 2, d: 3.5 }); bathsUp = baths - 1; }
  const bathSplit = storeys === 2 ? [bathsUp] : [Math.ceil(bathsUp / 2), Math.floor(bathsUp / 2)];
  if (brief.office) (storeys === 2 ? upper[0] : upper[1]).push({ type: 'office', w: 3, d: 3.5 });
  upper.forEach((u, li) => {
    for (let i = 0; i < bedsUp[li]; i++) u.push({ type: 'bedroom', w: (li === 0 && i === 0) ? 4 : 3.5, d: 3.5 });
    for (let i = 0; i < bathSplit[li]; i++) u.push({ type: 'bathroom', w: 2, d: 3.5 });
    if (!u.some(r => r.type === 'bedroom' || r.type === 'office')) u.push({ type: 'office', w: 3.5, d: 3.5 });
  });
  const specs = [{ rooms: ground }, ...upper.map(rooms => ({ rooms }))];
  let plot = { w: plotIn && plotIn.w || 16, d: plotIn && plotIn.d || 12 }, outs = specs.map(sp => pack(sp, plot, { spine: true }));
  const maxD = Math.max(...outs.map(o => o.design.plot.d));
  if (outs.some(o => o.design.plot.d !== maxD)) outs = specs.map(sp => pack(sp, { w: plot.w, d: maxD }, { spine: true }));
  const notes = [...new Set(outs.flatMap(o => o.notes))];
  return { plot: outs[0].design.plot, levels: outs.map(o => ({ rooms: o.design.rooms })), notes };
}

module.exports = { G, TYPES, KIND, clamp, snap, r2, overlap, normalize, analyzeGeometry, roomSides, freeIntervals, pack, templateSpec, packLevels };
