'use strict';
/*
 * Automatic lighting, electrical and plumbing layout.
 * Everything here is an indicative first draft for a licensed architect and engineers to review.
 */
const { r2, freeIntervals, roomSides } = require('./model');

const manh = (a, b) => {
  const p = [[a[0], a[1]]];
  if (Math.abs(a[0] - b[0]) > 1e-6 && Math.abs(a[1] - b[1]) > 1e-6) {
    if (Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1])) p.push([b[0], a[1]]); else p.push([a[0], b[1]]);
  }
  p.push([b[0], b[1]]);
  return p.map(q => [r2(q[0]), r2(q[1])]);
};
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const plen = pts => pts.reduce((s, p, i) => i ? s + dist(pts[i - 1], p) : 0, 0);

/* connect nodes into a tree (nearest-first) starting from a root point */
function tree(root, nodes) {
  const connected = [root], edges = [], left = nodes.slice();
  while (left.length) {
    let best = null;
    left.forEach((n, i) => connected.forEach(c => { const d = dist(c.p, n.p); if (!best || d < best.d) best = { d, i, c }; }));
    const n = left.splice(best.i, 1)[0];
    edges.push({ from: best.c, to: n, pts: manh(best.c.p, n.p) });
    connected.push(n);
  }
  return edges;
}

function buildMEP(geo) {
  const { design, walls, doors, fixtures } = geo;
  const rooms = design.rooms;
  const out = { lights: [], switches: [], outlets: [], acs: [], db: null, junctions: [], circuits: [], runs: [], pipes: [], plumbing: {}, notes: [] };
  if (!rooms.length) return out;
  const center = r => [r.x + r.w / 2, r.z + r.d / 2];

  /* ---- lighting ---- */
  rooms.forEach((r, ri) => {
    const nx = Math.max(1, Math.round(r.w / 3)), nz = Math.max(1, Math.round(r.d / 3));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.lights.push({ id: 'LT' + (out.lights.length + 1), room: ri, x: r2(r.x + (i + 0.5) * r.w / nx), z: r2(r.z + (j + 0.5) * r.d / nz) });
  });
  /* switches: one beside each door, on the room side */
  const sw = (d, ri) => {
    const r = rooms[ri];
    const along = d.ori === 'h' ? d.x : d.z;
    const lo = d.ori === 'h' ? r.x : r.z, hi = d.ori === 'h' ? r.x + r.w : r.z + r.d;
    let pos = along + d.w / 2 + 0.25; if (pos > hi - 0.2) pos = along - d.w / 2 - 0.25; pos = Math.min(hi - 0.2, Math.max(lo + 0.2, pos));
    const s = roomSides(r).find(s => s.ori === d.ori && (d.ori === 'h' ? Math.abs(s.fix - d.z) < 1e-6 : Math.abs(s.fix - d.x) < 1e-6));
    if (!s) return;
    out.switches.push({ id: 'SW' + (out.switches.length + 1), room: ri, x: d.ori === 'h' ? pos : r2(s.fix + s.nx * 0.08), z: d.ori === 'h' ? r2(s.fix + s.nz * 0.08) : pos });
  };
  doors.forEach(d => d.rooms.forEach(ri => { if (ri >= 0) sw(d, ri); }));
  rooms.forEach((r, ri) => { if (!out.switches.some(s => s.room === ri)) out.notes.push(`${r.label} has no door yet, so no light switch was placed.`); });

  /* ---- outlets and dedicated points ---- */
  rooms.forEach((r, ri) => {
    const ivs = freeIntervals(r, ri, doors);
    const per = 2 * (r.w + r.d);
    let n = r.type === 'bathroom' ? 1 : r.type === 'laundry' ? 1 : r.type === 'kitchen' ? Math.max(3, Math.ceil(per / 5)) : r.type === 'hall' ? 1 : Math.max(2, Math.ceil(per / 6));
    const dedic = fixtures.filter(f => f.room === ri && (f.kind === 'basin'));
    if (r.type === 'bathroom' && dedic.length) { const f = dedic[0]; out.outlets.push({ id: 'OT' + (out.outlets.length + 1), room: ri, x: r2(f.px + f.nx * 0.5 - f.nz * 0.6), z: r2(f.pz + f.nz * 0.5 - f.nx * 0.6), kind: 'gfci' }); n = 0; }
    for (let k = 0; k < n && ivs.length; k++) {
      const iv = ivs[k % ivs.length]; const share = Math.floor(k / ivs.length);
      const cnt = Math.ceil(n / ivs.length) || 1;
      const t = (share + 0.5) / cnt; const p = iv.p + (iv.q - iv.p) * Math.min(0.9, Math.max(0.1, t));
      out.outlets.push({ id: 'OT' + (out.outlets.length + 1), room: ri, x: r2(iv.ori === 'h' ? p : iv.fix + iv.nx * 0.08), z: r2(iv.ori === 'h' ? iv.fix + iv.nz * 0.08 : p), kind: r.type === 'kitchen' ? 'counter' : 'general' });
    }
    if (['bedroom', 'living', 'office'].includes(r.type) && ivs.length) {
      const iv = ivs[0], p = (iv.p + iv.q) / 2;
      out.acs.push({ id: 'AC' + (out.acs.length + 1), room: ri, x: r2(iv.ori === 'h' ? p : iv.fix + iv.nx * 0.1), z: r2(iv.ori === 'h' ? iv.fix + iv.nz * 0.1 : p) });
    }
  });
  /* dedicated points at fixtures */
  const dedicated = [];
  fixtures.forEach(f => {
    if (f.kind === 'cooker') dedicated.push({ type: 'cooker', f, w: 3000 });
    if (f.kind === 'fridge') dedicated.push({ type: 'fridge', f, w: 150 });
    if (f.kind === 'washer') dedicated.push({ type: 'washer', f, w: 500 });
    if (f.kind === 'shower') dedicated.push({ type: 'shower heater', f, w: 3500 });
  });

  /* ---- distribution board next to the front door ---- */
  const fd = doors.find(d => d.front) || doors[0];
  if (fd) {
    const r = rooms[fd.rooms[0]];
    const along = fd.ori === 'h' ? fd.x : fd.z, lo = fd.ori === 'h' ? r.x : r.z, hi = fd.ori === 'h' ? r.x + r.w : r.z + r.d;
    let pos = along - fd.w / 2 - 0.5; if (pos < lo + 0.3) pos = along + fd.w / 2 + 0.5; pos = Math.min(hi - 0.3, pos);
    const s = roomSides(r).find(s => s.ori === fd.ori && (fd.ori === 'h' ? Math.abs(s.fix - fd.z) < 1e-6 : Math.abs(s.fix - fd.x) < 1e-6));
    out.db = { x: r2(fd.ori === 'h' ? pos : (s ? s.fix + s.nx * 0.1 : fd.x)), z: r2(fd.ori === 'h' ? (s ? s.fix + s.nz * 0.1 : fd.z) : pos), room: fd.rooms[0] };
  } else out.db = { x: r2(center(rooms[0])[0]), z: r2(center(rooms[0])[1]), room: 0 };

  /* junction per room (centre), runs from the board */
  const jnodes = rooms.map((r, ri) => ({ ri, p: center(r) }));
  out.junctions = jnodes.map(j => ({ room: j.ri, x: r2(j.p[0]), z: r2(j.p[1]) }));
  const jedges = tree({ p: [out.db.x, out.db.z], root: true }, jnodes.map(j => ({ ri: j.ri, p: j.p })));
  jedges.forEach(e => out.runs.push({ kind: 'home', room: e.to.ri, pts: e.pts }));
  /* spurs: junction to each outlet / ac (power), switch to lights chain (lighting) */
  const spurs = [];
  const J = ri => jnodes[ri].p;
  out.outlets.forEach(o => spurs.push({ kind: 'power', room: o.room, pts: manh(J(o.room), [o.x, o.z]) }));
  out.acs.forEach(o => spurs.push({ kind: 'power', room: o.room, pts: manh(J(o.room), [o.x, o.z]) }));
  dedicated.forEach(d => spurs.push({ kind: 'power', room: d.f.room, pts: manh(J(d.f.room), [d.f.px, d.f.pz]) }));
  rooms.forEach((r, ri) => {
    const ls = out.lights.filter(l => l.room === ri), ss = out.switches.filter(s => s.room === ri);
    let prev = ss[0] ? [ss[0].x, ss[0].z] : null;
    ls.forEach(l => { if (prev) spurs.push({ kind: 'light', room: ri, pts: manh(prev, [l.x, l.z]) }); prev = [l.x, l.z]; });
    ss.slice(1).forEach(s => { if (ls[0]) spurs.push({ kind: 'light', room: ri, pts: manh([s.x, s.z], [ls[0].x, ls[0].z]) }); });
  });
  out.spurs = spurs;

  /* ---- circuits (indicative) ---- */
  const circ = [];
  const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
  chunk(out.lights, 8).forEach((g, i) => circ.push({ id: 'L' + (i + 1), kind: 'Lighting', points: g.length, watts: g.length * 12, rooms: [...new Set(g.map(l => rooms[l.room].label))].join(', ') }));
  const gen = out.outlets.filter(o => o.kind !== 'counter');
  chunk(gen, 8).forEach((g, i) => circ.push({ id: 'P' + (i + 1), kind: 'Power outlets', points: g.length, watts: g.length * 200, rooms: [...new Set(g.map(l => rooms[l.room].label))].join(', ') }));
  const counters = out.outlets.filter(o => o.kind === 'counter');
  chunk(counters, 4).forEach((g, i) => circ.push({ id: 'K' + (i + 1), kind: 'Kitchen counter outlets', points: g.length, watts: g.length * 400, rooms: 'Kitchen' }));
  out.acs.forEach((a, i) => circ.push({ id: 'A' + (i + 1), kind: 'Air conditioner', points: 1, watts: 1100, rooms: rooms[a.room].label }));
  const cnt = {};
  dedicated.forEach(d => { cnt[d.type] = (cnt[d.type] || 0) + 1; circ.push({ id: (d.type === 'cooker' ? 'C' : d.type === 'fridge' ? 'F' : d.type === 'washer' ? 'W' : 'H') + cnt[d.type], kind: d.type[0].toUpperCase() + d.type.slice(1), points: 1, watts: d.w, rooms: rooms[d.f.room].label }); });
  out.circuits = circ;
  out.totalWatts = circ.reduce((s, c) => s + c.watts, 0);
  out.dedicated = dedicated.map(d => ({ type: d.type, x: d.f.px, z: d.f.pz, room: d.f.room }));

  /* ---- plumbing ---- */
  const wet = fixtures.filter(f => f.wet);
  const P = { meter: null, sewer: null, heater: null };
  if (wet.length) {
    const cx = wet.reduce((s, f) => s + f.px, 0) / wet.length, cz = wet.reduce((s, f) => s + f.pz, 0) / wet.length;
    const extW = walls.filter(w => w.ext && w.len >= 1.0);
    const pt = w => [(w.x1 + w.x2) / 2, (w.z1 + w.z2) / 2];
    const nearest = (excl) => extW.filter(w => !excl || dist(pt(w), excl) > 2.5).sort((a, b) => dist(pt(a), [cx, cz]) - dist(pt(b), [cx, cz]))[0];
    const mw = nearest(null);
    if (mw) {
      const mp = pt(mw); P.meter = { x: r2(mp[0]), z: r2(mp[1]) };
      const sw2 = nearest(mp) || mw; const sp = pt(sw2);
      P.sewer = { x: r2(sp[0]), z: r2(sp[1]) };
    }
    const byRoom = {};
    wet.forEach(f => { (byRoom[f.room] = byRoom[f.room] || []).push(f); });
    const wroom = Object.keys(byRoom).map(k => {
      const fs = byRoom[k]; const p = [fs.reduce((s, f) => s + f.px, 0) / fs.length, fs.reduce((s, f) => s + f.pz, 0) / fs.length];
      return { ri: +k, p, fs };
    });
    /* hot water heater: in the wet room nearest the middle of all wet fixtures */
    const hr = wroom.slice().sort((a, b) => dist(a.p, [cx, cz]) - dist(b.p, [cx, cz]))[0];
    P.heater = { x: r2(hr.p[0]), z: r2(hr.p[1]), room: hr.ri };
    const dia = (kind, d) => d;
    if (P.meter) {
      /* cold: meter to each wet room, then fixtures */
      const cedges = tree({ p: [P.meter.x, P.meter.z], root: true }, wroom.map(w => ({ ri: w.ri, p: w.p, fs: w.fs })));
      cedges.forEach(e => out.pipes.push({ kind: 'cold', dia: 25, pts: e.pts, label: 'Cold main' }));
      wroom.forEach(w => w.fs.forEach(f => out.pipes.push({ kind: 'cold', dia: 15, pts: manh(w.p, [f.px, f.pz]), label: f.name })));
      /* hot: heater to rooms with hot fixtures */
      const hot = wroom.filter(w => w.fs.some(f => f.hot) && w.ri !== hr.ri);
      const hedges = tree({ p: [P.heater.x, P.heater.z], root: true }, hot.map(w => ({ ri: w.ri, p: w.p })));
      hedges.forEach(e => out.pipes.push({ kind: 'hot', dia: 20, pts: e.pts, label: 'Hot supply' }));
      wroom.forEach(w => w.fs.filter(f => f.hot).forEach(f => out.pipes.push({ kind: 'hot', dia: 15, pts: manh(w.p, [f.px, f.pz]), label: f.name })));
      /* drains */
      const dedges = tree({ p: [P.sewer.x, P.sewer.z], root: true }, wroom.map(w => ({ ri: w.ri, p: w.p })));
      dedges.forEach(e => out.pipes.push({ kind: 'drain', dia: 100, pts: e.pts, label: 'Main drain' }));
      wroom.forEach(w => w.fs.forEach(f => out.pipes.push({ kind: 'drain', dia: f.drain, pts: manh([f.px, f.pz], w.p), label: f.name })));
      out.vents = wroom.map(w => ({ room: w.ri, x: r2(w.p[0]), z: r2(w.p[1]) }));
    }
  }
  out.plumbing = P;
  const L = { 15: 0, 20: 0, 25: 0, 50: 0, 100: 0 };
  out.pipes.forEach(p => { const k = p.kind === 'drain' ? p.dia : p.dia; L[k] = (L[k] || 0) + plen(p.pts); });
  out.pipeLengths = Object.fromEntries(Object.entries(L).map(([k, v]) => [k, r2(v)]));
  return out;
}

function schedules(geo, mep) {
  const rooms = geo.design.rooms;
  const extLen = r2(geo.walls.filter(w => w.ext).reduce((s, w) => s + w.len, 0));
  const intLen = r2(geo.walls.filter(w => !w.ext).reduce((s, w) => s + w.len, 0));
  const count = {}; geo.fixtures.forEach(f => { count[f.name] = (count[f.name] || 0) + 1; });
  return {
    plot: geo.design.plot,
    rooms: rooms.map(r => ({ id: r.id, name: r.label, type: r.type, width: r.w, depth: r.d, area: r.area })),
    floorArea: r2(rooms.reduce((s, r) => s + r.area, 0)),
    exteriorWallLength: extLen, interiorWallLength: intLen,
    doors: { exterior: geo.doors.filter(d => d.ext).length, interior: geo.doors.filter(d => !d.ext).length },
    windows: geo.windows.length,
    fixtures: count,
    lighting: { lights: mep.lights.length, switches: mep.switches.length },
    electrical: { outlets: mep.outlets.length, acPoints: mep.acs.length, dedicatedPoints: (mep.dedicated || []).length, circuits: mep.circuits, connectedLoadW: mep.totalWatts },
    plumbing: { meter: mep.plumbing.meter, sewer: mep.plumbing.sewer, heater: mep.plumbing.heater, pipeLengthByDiameterMm: mep.pipeLengths }
  };
}

module.exports = { buildMEP, schedules, manh };
