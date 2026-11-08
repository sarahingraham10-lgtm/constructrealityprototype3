'use strict';
/* 2D drawing sheets (SVG, A3 landscape) and a CAD file (DXF) for the architect. Black and white only. */
const fs = require('fs');
const path = require('path');
const { KIND } = require('./model');

let LOGO = '';
try { LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', 'public', 'logo_black.png')).toString('base64'); } catch (e) { LOGO = ''; }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f2 = v => (Math.round(v * 100) / 100).toString();

const SHEETS = [
  { no: 'A-101', title: 'Floor plan' },
  { no: 'P-101', title: 'Plumbing plan' },
  { no: 'E-101', title: 'Electrical power plan' },
  { no: 'E-102', title: 'Lighting plan' },
  { no: 'S-001', title: 'Schedules and notes' },
  { no: 'A-201', title: 'Finishes and furniture' },
  { no: 'S-101', title: 'Foundation layout' },
  { no: 'Q-001', title: 'Quantities for pricing' },
  { no: 'C-101', title: 'Site plan' },
  { no: 'A-301', title: 'Elevations' },
  { no: 'M-101', title: 'Air conditioning and ventilation' },
  { no: 'F-101', title: 'Fire safety and escape routes' },
  { no: 'S-102', title: 'Column and beam layout' },
  { no: 'G-001', title: 'Title sheet, index and notes' },
  { no: 'A-102', title: 'Roof plan' },
  { no: 'A-401', title: 'Sections' },
  { no: 'A-501', title: 'Door and window schedule' },
  { no: 'A-601', title: 'Typical details' },
  { no: 'C-102', title: 'Stormwater and septic' },
  { no: 'R-101', title: 'Riser diagrams' }
];

function frame(geo, mep, sch, meta, sheet, bodyFn, opts) {
  opts = opts || {};
  const D = geo.design;
  let minX = 1e9, minZ = 1e9, maxX = -1e9, maxZ = -1e9;
  D.rooms.forEach(r => { minX = Math.min(minX, r.x); minZ = Math.min(minZ, r.z); maxX = Math.max(maxX, r.x + r.w); maxZ = Math.max(maxZ, r.z + r.d); });
  if (!D.rooms.length) { minX = 0; minZ = 0; maxX = 10; maxZ = 8; }
  const bw = maxX - minX, bd = maxZ - minZ;
  const den = (bw * 20 <= 330 && bd * 20 <= 170) ? 50 : 100;
  const k = 1000 / den;                       // mm of paper per metre
  const ox = 20 + (380 - bw * k) / 2 - minX * k + 5, oz = 30 + (190 - bd * k) / 2 - minZ * k;
  const X = x => f2(ox + x * k), Z = z => f2(oz + z * k), L = v => f2(v * k);
  const ctx = { X, Z, L, k, den, minX, minZ, maxX, maxZ, bw, bd };
  const body = opts.noPlan ? bodyFn(ctx) : bodyFn(ctx);
  const date = new Date(meta.date || Date.now()).toISOString().slice(0, 10);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 297" width="420mm" height="297mm" font-family="Arial, Helvetica, sans-serif">
<rect width="420" height="297" fill="#fff"/>
<rect x="8" y="8" width="404" height="281" fill="none" stroke="#000" stroke-width="0.7"/>
${body}
<g id="titleblock">
<rect x="8" y="238" width="404" height="51" fill="#fff" stroke="#000" stroke-width="0.7"/>
${LOGO ? `<image href="${LOGO}" x="14" y="244" width="60" height="14.3"/>` : `<text x="14" y="254" font-size="8" font-weight="700">ConstructReality</text>`}
<text x="14" y="266" font-size="2.6" fill="#000">Experience it. Understand it. Build with confidence.</text>
<text x="14" y="271" font-size="2.6" fill="#000">Built in the Caribbean, for Caribbeans</text>
<line x1="90" y1="238" x2="90" y2="289" stroke="#000" stroke-width="0.3"/>
<text x="95" y="245" font-size="2.4" fill="#555">PROJECT</text><text x="95" y="251" font-size="4.2" font-weight="700">${esc((meta.project || 'Client home design') + (meta.levelName ? ' - ' + meta.levelName : ''))}</text>
<text x="95" y="258" font-size="2.4" fill="#555">CLIENT</text><text x="95" y="263" font-size="3.4">${esc(meta.client || 'Not yet named')}</text>
<text x="95" y="270" font-size="2.4" fill="#555">REFERENCE</text><text x="95" y="275" font-size="3.4">${esc(meta.ref || '')}</text>
<line x1="230" y1="238" x2="230" y2="289" stroke="#000" stroke-width="0.3"/>
<text x="235" y="245" font-size="2.4" fill="#555">SHEET</text><text x="235" y="253" font-size="${(sheet.no+sheet.title).length>26?(Math.max(3.2,86/((sheet.no+sheet.title).length+2)/0.56)).toFixed(1):6}" font-weight="700">${sheet.no}  ${esc(sheet.title)}</text>
<text x="235" y="261" font-size="2.4" fill="#555">SCALE</text><text x="235" y="266" font-size="3.4">${opts.noScale ? 'n/a' : '1:' + den + ' at A3'}</text>
<text x="235" y="273" font-size="2.4" fill="#555">DATE</text><text x="235" y="278" font-size="3.4">${date}</text>
<line x1="320" y1="238" x2="320" y2="289" stroke="#000" stroke-width="0.3"/>
<rect x="324" y="242" width="84" height="43" fill="#000"/>
<text x="328" y="250" font-size="3.2" font-weight="700" fill="#fff">DRAFT - NOT FOR CONSTRUCTION</text>
<text x="328" y="256" font-size="2.3" fill="#fff">Made from the client's VR design in</text>
<text x="328" y="260" font-size="2.3" fill="#fff">ConstructReality Studio. Concept layout.</text>
<text x="328" y="264" font-size="2.3" fill="#fff">A licensed architect, engineer and</text>
<text x="328" y="268" font-size="2.3" fill="#fff">surveyor must check sizes, structure,</text>
<text x="328" y="272" font-size="2.3" fill="#fff">services and code compliance first.</text>
</g>
</svg>`;
}

/* ---------- drawing parts ---------- */
function walls(geo, c) {
  let s = '<g id="walls">';
  for (const w of geo.walls) {
    const t = w.ext ? 0.2 : 0.1;
    s += `<line x1="${c.X(w.x1)}" y1="${c.Z(w.z1)}" x2="${c.X(w.x2)}" y2="${c.Z(w.z2)}" stroke="#000" stroke-width="${c.L(t)}" stroke-linecap="square"/>`;
  }
  /* openings are cut out with white, then symbols are added */
  for (const o of [...geo.doors, ...geo.windows]) {
    const horiz = o.ori === 'h';
    const x1 = horiz ? o.x - o.w / 2 : o.x, x2 = horiz ? o.x + o.w / 2 : o.x, z1 = horiz ? o.z : o.z - o.w / 2, z2 = horiz ? o.z : o.z + o.w / 2;
    s += `<line x1="${c.X(x1)}" y1="${c.Z(z1)}" x2="${c.X(x2)}" y2="${c.Z(z2)}" stroke="#fff" stroke-width="${c.L(0.26)}"/>`;
    if (o.kind === 'window') {
      for (const off of [-0.07, 0, 0.07]) s += `<line x1="${c.X(x1 + (horiz ? 0 : off))}" y1="${c.Z(z1 + (horiz ? off : 0))}" x2="${c.X(x2 + (horiz ? 0 : off))}" y2="${c.Z(z2 + (horiz ? off : 0))}" stroke="#000" stroke-width="0.25"/>`;
    } else {
      const r = o.w;
      const hx = horiz ? x1 : x1, hz = horiz ? z1 : z1;     // hinge at first end
      const tipx = horiz ? hx : hx + r, tipz = horiz ? hz + r : hz;  // leaf open 90 deg
      s += `<line x1="${c.X(hx)}" y1="${c.Z(hz)}" x2="${c.X(tipx)}" y2="${c.Z(tipz)}" stroke="#000" stroke-width="0.35"/>`;
      s += `<path d="M ${c.X(tipx)} ${c.Z(tipz)} A ${c.L(r)} ${c.L(r)} 0 0 ${horiz ? 0 : 1} ${c.X(horiz ? x2 : x1)} ${c.Z(horiz ? z1 : z2)}" fill="none" stroke="#000" stroke-width="0.2"/>`;
    }
  }
  return s + '</g>';
}
function labels(geo, c, dims) {
  let s = '<g id="labels" fill="#000">';
  geo.design.rooms.forEach(r => {
    const cx = r.x + r.w / 2, cz = r.z + r.d / 2;
    const fs = Math.min(c.den === 50 ? 3.2 : 2.6, (r.w * c.k * 0.9) / (r.label.length * 0.62));
    s += `<text x="${c.X(cx)}" y="${c.Z(cz) - 1}" font-size="${fs}" font-weight="700" text-anchor="middle">${esc(r.label.toUpperCase())}</text>`;
    s += `<text x="${c.X(cx)}" y="${f2(Number(c.Z(cz)) + fs)}" font-size="${fs * .8}" text-anchor="middle">${f2(r.w)} x ${f2(r.d)} m  |  ${f2(r.area)} m2</text>`;
  });
  if (dims) {
    const y = Number(c.Z(c.minZ)) - 9, x = Number(c.X(c.minX)) - 9;
    s += `<g stroke="#000" stroke-width="0.25"><line x1="${c.X(c.minX)}" y1="${y}" x2="${c.X(c.maxX)}" y2="${y}"/><line x1="${c.X(c.minX)}" y1="${y - 2}" x2="${c.X(c.minX)}" y2="${y + 2}"/><line x1="${c.X(c.maxX)}" y1="${y - 2}" x2="${c.X(c.maxX)}" y2="${y + 2}"/>
<line x1="${x}" y1="${c.Z(c.minZ)}" x2="${x}" y2="${c.Z(c.maxZ)}"/><line x1="${x - 2}" y1="${c.Z(c.minZ)}" x2="${x + 2}" y2="${c.Z(c.minZ)}"/><line x1="${x - 2}" y1="${c.Z(c.maxZ)}" x2="${x + 2}" y2="${c.Z(c.maxZ)}"/></g>`;
    s += `<text x="${(Number(c.X(c.minX)) + Number(c.X(c.maxX))) / 2}" y="${y - 2}" font-size="3" text-anchor="middle">${f2(c.bw)} m</text>`;
    s += `<text transform="translate(${x - 2.5} ${(Number(c.Z(c.minZ)) + Number(c.Z(c.maxZ))) / 2}) rotate(-90)" font-size="3" text-anchor="middle">${f2(c.bd)} m</text>`;
    /* north arrow and street note */
    s += `<g transform="translate(380 40)"><circle r="7" fill="none" stroke="#000" stroke-width="0.4"/><path d="M0 -6 L3 4 L0 2 L-3 4 Z" fill="#000"/><text y="-9" font-size="3.4" text-anchor="middle" font-weight="700">N</text></g>`;
    s += `<text x="${(Number(c.X(c.minX)) + Number(c.X(c.maxX))) / 2}" y="${Number(c.Z(c.maxZ)) + 9}" font-size="2.8" text-anchor="middle" fill="#555">STREET SIDE (front)</text>`;
    /* scale bar */
    const sx = 20, sy = 228;
    s += `<g><rect x="${sx}" y="${sy}" width="${c.L(1)}" height="1.4" fill="#000"/><rect x="${Number(sx) + Number(c.L(1))}" y="${sy}" width="${c.L(1)}" height="1.4" fill="#fff" stroke="#000" stroke-width="0.2"/><rect x="${Number(sx) + 2 * Number(c.L(1))}" y="${sy}" width="${c.L(1)}" height="1.4" fill="#000"/><text x="${sx}" y="${sy - 1}" font-size="2.4">0</text><text x="${Number(sx) + 3 * Number(c.L(1))}" y="${sy - 1}" font-size="2.4">3 m</text></g>`;
  }
  return s + '</g>';
}
function fixtureShapes(geo, c, opts) {
  opts = opts || {};
  let s = `<g id="fixtures" fill="none" stroke="#000" stroke-width="${opts.fade ? 0.15 : 0.3}" ${opts.fade ? 'opacity="0.45"' : ''}>`;
  for (const f of geo.fixtures) {
    const x = c.X(f.x - f.w / 2), z = c.Z(f.z - f.d / 2);
    s += `<rect x="${x}" y="${z}" width="${c.L(f.w)}" height="${c.L(f.d)}"/>`;
    if (f.kind === 'toilet') s += `<ellipse cx="${c.X(f.x + f.nx * 0.05)}" cy="${c.Z(f.z + f.nz * 0.05)}" rx="${c.L(Math.min(f.w, f.d) * 0.35)}" ry="${c.L(Math.max(f.w, f.d) * 0.3)}"/>`;
    if (f.kind === 'basin') s += `<ellipse cx="${c.X(f.x)}" cy="${c.Z(f.z)}" rx="${c.L(f.w * 0.3)}" ry="${c.L(f.d * 0.3)}"/>`;
    if (f.kind === 'shower') s += `<line x1="${x}" y1="${z}" x2="${Number(x) + Number(c.L(f.w))}" y2="${Number(z) + Number(c.L(f.d))}"/>`;
    if (f.kind === 'ksink') s += `<rect x="${c.X(f.x - f.w * 0.3)}" y="${c.Z(f.z - f.d * 0.3)}" width="${c.L(f.w * 0.6)}" height="${c.L(f.d * 0.6)}"/>`;
    if (f.kind === 'cooker') for (const [dx, dz] of [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]]) s += `<circle cx="${c.X(f.x + dx)}" cy="${c.Z(f.z + dz)}" r="${c.L(0.08)}"/>`;
  }
  s += '</g>';
  if (opts.codes) {
    s += '<g font-size="1.9" fill="#000" text-anchor="middle">';
    geo.fixtures.forEach(f => { s += `<text x="${c.X(f.x)}" y="${Number(c.Z(f.z)) + 0.7}">${f.code}</text>`; });
    s += '</g>';
  }
  return s;
}
const pl = (pts, c) => pts.map(p => `${c.X(p[0])},${c.Z(p[1])}`).join(' ');
function legend(items, x, y) {
  let s = `<g transform="translate(${x} ${y})"><rect x="-3" y="-6" width="64" height="${items.length * 6 + 8}" fill="#fff" stroke="#000" stroke-width="0.3"/><text y="-1.5" font-size="3" font-weight="700">LEGEND</text>`;
  items.forEach((it, i) => { s += `<g transform="translate(0 ${5 + i * 6})">${it.sym}<text x="14" y="1" font-size="2.6">${esc(it.text)}</text></g>`; });
  return s + '</g>';
}
const lineSym = (dash, w) => `<line x1="0" y1="0" x2="11" y2="0" stroke="#000" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const circ = (c, k, sw) => `<circle cx="6" cy="0" r="1.8" fill="${k ? '#000' : '#fff'}" stroke="#000" stroke-width="${sw || 0.3}"/>`;

/* ---------- the five sheets ---------- */
/* furniture from the client's design (light dashed outlines) and stair symbols */
function furnitureShapes(geo, meta, c) {
  let s = '<g id="furniture" fill="none" stroke="#000" stroke-width="0.12" stroke-dasharray="1.2 0.8" opacity="0.6" font-size="1.5" text-anchor="middle">';
  for (const it of (meta.furniture || [])) {
    const w = c.L(it.w), d = c.L(it.d), cx = c.X(it.x), cz = c.Z(it.z);
    s += `<g transform="translate(${cx} ${cz}) rotate(${Math.round(it.rot || 0)})"><rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}"/></g>`;
    if (it.w * it.d >= 0.5) s += `<text x="${cx}" y="${cz}" fill="#000" stroke="none">${esc(String(it.name || '').slice(0, 18))}</text>`;
  }
  s += '</g>';
  for (const r of geo.design.rooms.filter(q => q.type === 'stairs')) {
    s += '<g stroke="#000" stroke-width="0.2" fill="none">';
    for (let k = 0.5; k < r.d - 0.1; k += 0.3) { s += `<line x1="${c.X(r.x + 0.05)}" y1="${c.Z(r.z + k)}" x2="${c.X(r.x + r.w / 2 - 0.05)}" y2="${c.Z(r.z + k)}"/>`; }
    s += `<text x="${c.X(r.x + r.w * 0.75)}" y="${c.Z(r.z + r.d / 2)}" font-size="2" fill="#000" stroke="none" text-anchor="middle">${meta.levelIdx === 0 ? 'UP' : 'UP / DN'}</text></g>`;
  }
  return s;
}
function sheetFloor(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[0], c => walls(geo, c) + furnitureShapes(geo, meta, c) + fixtureShapes(geo, c, { codes: true }) + labels(geo, c, true) +
    legend([{ sym: lineSym('', 1.2), text: 'External wall 200 mm' }, { sym: lineSym('', 0.6), text: 'Internal wall 100 mm' }, { sym: '<path d="M0 0 H11" stroke="#000" stroke-width="0.35"/>', text: 'Door with swing' }, { sym: lineSym('', 0.3), text: 'Window' }], 345, 150));
}
function sheetPlumb(geo, mep, sch, meta) {
  const P = mep.plumbing;
  return frame(geo, mep, sch, meta, SHEETS[1], c => {
    let s = walls(geo, c).replace('id="walls"', 'id="walls" opacity="0.35"') + fixtureShapes(geo, c, { codes: true });
    const style = { cold: ['', 0.5], hot: ['3 1.5', 0.5], drain: ['6 1.5 1 1.5', 0.9] };
    for (const p of mep.pipes) { const [d, w] = style[p.kind]; s += `<polyline points="${pl(p.pts, c)}" fill="none" stroke="#000" stroke-width="${w}" ${d ? `stroke-dasharray="${d}"` : ''}/>`; }
    const sq = (pt, t) => pt ? `<g><rect x="${Number(c.X(pt.x)) - 2.5}" y="${Number(c.Z(pt.z)) - 2.5}" width="5" height="5" fill="#000"/><text x="${Number(c.X(pt.x)) + 4}" y="${Number(c.Z(pt.z)) + 1}" font-size="2.8" font-weight="700">${t}</text></g>` : '';
    s += sq(P.meter, 'WATER METER') + sq(P.heater, 'WATER HEATER') + sq(P.sewer, 'SEWER / SEPTIC CONNECTION');
    (mep.vents || []).forEach(v => { s += `<g><circle cx="${c.X(v.x)}" cy="${c.Z(v.z)}" r="1.6" fill="#fff" stroke="#000" stroke-width="0.4"/><text x="${c.X(v.x)}" y="${Number(c.Z(v.z)) + 0.9}" font-size="2.2" text-anchor="middle">V</text></g>`; });
    s += labels(geo, c, true);
    s += legend([{ sym: lineSym('', 0.5), text: 'Cold water (15 / 25 mm)' }, { sym: lineSym('3 1.5', 0.5), text: 'Hot water (15 / 20 mm)' }, { sym: lineSym('6 1.5 1 1.5', 0.9), text: 'Drain (50 / 100 mm)' }, { sym: '<circle cx="6" cy="0" r="1.6" fill="#fff" stroke="#000" stroke-width="0.4"/>', text: 'V = vent stack' }], 345, 150);
    s += `<text x="20" y="233" font-size="2.6" fill="#000">Pipe routes are indicative and straight. A plumber or engineer sets real routes, falls, sizes and venting.</text>`;
    return s;
  });
}
function sheetElec(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[2], c => {
    let s = walls(geo, c).replace('id="walls"', 'id="walls" opacity="0.35"') + fixtureShapes(geo, c, { fade: true });
    for (const r of mep.runs) s += `<polyline points="${pl(r.pts, c)}" fill="none" stroke="#000" stroke-width="0.5" stroke-dasharray="4 1.5"/>`;
    for (const r of (mep.spurs || []).filter(p => p.kind === 'power')) s += `<polyline points="${pl(r.pts, c)}" fill="none" stroke="#000" stroke-width="0.2"/>`;
    for (const j of mep.junctions) s += `<rect x="${Number(c.X(j.x)) - 1}" y="${Number(c.Z(j.z)) - 1}" width="2" height="2" fill="#fff" stroke="#000" stroke-width="0.35"/>`;
    for (const o of mep.outlets) s += `<g><circle cx="${c.X(o.x)}" cy="${c.Z(o.z)}" r="1.5" fill="#fff" stroke="#000" stroke-width="0.35"/><line x1="${Number(c.X(o.x)) - 1.1}" y1="${c.Z(o.z)}" x2="${Number(c.X(o.x)) + 1.1}" y2="${c.Z(o.z)}" stroke="#000" stroke-width="0.3"/>${o.kind === 'gfci' ? `<text x="${Number(c.X(o.x)) + 2}" y="${Number(c.Z(o.z)) - 1.4}" font-size="1.8">GFCI</text>` : ''}</g>`;
    for (const a of mep.acs) s += `<g><rect x="${Number(c.X(a.x)) - 3}" y="${Number(c.Z(a.z)) - 1.5}" width="6" height="3" fill="#fff" stroke="#000" stroke-width="0.35"/><text x="${c.X(a.x)}" y="${Number(c.Z(a.z)) + 0.8}" font-size="2" text-anchor="middle">AC</text></g>`;
    for (const d of (mep.dedicated || [])) s += `<g><polygon points="${Number(c.X(d.x))},${Number(c.Z(d.z)) - 2} ${Number(c.X(d.x)) + 2},${Number(c.Z(d.z)) + 1.5} ${Number(c.X(d.x)) - 2},${Number(c.Z(d.z)) + 1.5}" fill="#000"/><text x="${Number(c.X(d.x)) + 3}" y="${Number(c.Z(d.z)) + 1}" font-size="1.8">${esc(d.type.toUpperCase())}</text></g>`;
    if (mep.db) s += `<g><rect x="${Number(c.X(mep.db.x)) - 3}" y="${Number(c.Z(mep.db.z)) - 3}" width="6" height="6" fill="#000"/><text x="${Number(c.X(mep.db.x)) + 5}" y="${Number(c.Z(mep.db.z)) + 1}" font-size="3" font-weight="700">DB</text></g>`;
    s += labels(geo, c, true);
    s += legend([{ sym: circ(6, false), text: 'Power outlet' }, { sym: '<rect x="3" y="-1.5" width="6" height="3" fill="#fff" stroke="#000" stroke-width="0.35"/>', text: 'Air conditioner point' }, { sym: '<polygon points="6,-2 8,1.5 4,1.5" fill="#000"/>', text: 'Dedicated appliance point' }, { sym: lineSym('4 1.5', 0.5), text: 'Home run to room box' }, { sym: '<rect x="5" y="-1" width="2" height="2" fill="#fff" stroke="#000" stroke-width="0.35"/>', text: 'Room junction' }, { sym: '<rect x="3" y="-3" width="6" height="6" fill="#000"/>', text: 'DB = distribution board' }], 345, 140);
    s += `<text x="20" y="233" font-size="2.6" fill="#000">Routes and circuit sizes are indicative. A licensed electrician sets cable, breaker ratings, earthing and protection.</text>`;
    return s;
  });
}
function sheetLight(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[3], c => {
    let s = walls(geo, c).replace('id="walls"', 'id="walls" opacity="0.35"') + fixtureShapes(geo, c, { fade: true });
    for (const r of (mep.spurs || []).filter(p => p.kind === 'light')) s += `<polyline points="${pl(r.pts, c)}" fill="none" stroke="#000" stroke-width="0.25" stroke-dasharray="2 1"/>`;
    for (const l of mep.lights) s += `<g><circle cx="${c.X(l.x)}" cy="${c.Z(l.z)}" r="2.2" fill="#fff" stroke="#000" stroke-width="0.4"/><line x1="${Number(c.X(l.x)) - 1.5}" y1="${Number(c.Z(l.z)) - 1.5}" x2="${Number(c.X(l.x)) + 1.5}" y2="${Number(c.Z(l.z)) + 1.5}" stroke="#000" stroke-width="0.3"/><line x1="${Number(c.X(l.x)) - 1.5}" y1="${Number(c.Z(l.z)) + 1.5}" x2="${Number(c.X(l.x)) + 1.5}" y2="${Number(c.Z(l.z)) - 1.5}" stroke="#000" stroke-width="0.3"/></g>`;
    for (const w of mep.switches) s += `<g><circle cx="${c.X(w.x)}" cy="${c.Z(w.z)}" r="1.1" fill="#000"/><text x="${Number(c.X(w.x)) + 1.8}" y="${Number(c.Z(w.z)) - 1}" font-size="2">S</text></g>`;
    s += labels(geo, c, true);
    s += legend([{ sym: '<circle cx="6" cy="0" r="2.2" fill="#fff" stroke="#000" stroke-width="0.4"/><path d="M4.5 -1.5 L7.5 1.5 M4.5 1.5 L7.5 -1.5" stroke="#000" stroke-width="0.3"/>', text: 'Ceiling light (LED)' }, { sym: '<circle cx="6" cy="0" r="1.1" fill="#000"/>', text: 'S = light switch' }, { sym: lineSym('2 1', 0.25), text: 'Switch leg (indicative)' }], 345, 160);
    s += `<text x="20" y="233" font-size="2.6" fill="#000">One light per roughly 9 m2 of floor, switch beside each door. Lighting levels and fittings to be confirmed by the designer.</text>`;
    return s;
  });
}
function sheetSchedules(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[4], c => {
    let y = 22, s = '';
    const H = (t) => { s += `<text x="16" y="${y}" font-size="4" font-weight="700">${esc(t)}</text><line x1="16" y1="${y + 1.5}" x2="205" y2="${y + 1.5}" stroke="#000" stroke-width="0.4"/>`; y += 7; };
    const R = (cols, bold, xs) => { cols.forEach((t, i) => { s += `<text x="${xs[i]}" y="${y}" font-size="2.8" ${bold ? 'font-weight="700"' : ''}>${esc(t)}</text>`; }); y += 4.4; };
    H('Room schedule');
    const rx = [16, 70, 100, 130, 160];
    R(['Room', 'Width m', 'Depth m', 'Area m2'], true, rx);
    sch.rooms.slice(0, 14).forEach(r => R([r.name, f2(r.width), f2(r.depth), f2(r.area)], false, rx));
    R(['Total floor area', '', '', f2(sch.floorArea)], true, rx);
    y += 3;
    const y0 = y;
    H('Fixtures');
    Object.entries(sch.fixtures).forEach(([k, v]) => R([k, String(v)], false, [16, 70]));
    const fin = (o) => o ? `${o.material}, ${o.colour}` : '';
    if (sch.finishes) {
      y += 3; H('Finishes chosen by the client'); const fx = [16, 62, 122];
      R(['Room', 'Floor', 'Walls'], true, fx); sch.finishes.rooms.filter(r => (r.level || 0) === (meta.levelIdx || 0)).slice(0, 9).forEach(r => R([r.room.slice(0, 24), fin(r.floor), fin(r.walls)], false, fx));
    }
    const yEnd1 = y;
    y = 22; let x2 = 215;
    const H2 = (t) => { s += `<text x="${x2}" y="${y}" font-size="4" font-weight="700">${esc(t)}</text><line x1="${x2}" y1="${y + 1.5}" x2="404" y2="${y + 1.5}" stroke="#000" stroke-width="0.4"/>`; y += 7; };
    const R2 = (cols, bold, xs) => { cols.forEach((t, i) => { s += `<text x="${xs[i]}" y="${y}" font-size="2.8" ${bold ? 'font-weight="700"' : ''}>${esc(t)}</text>`; }); y += 4.4; };
    H2('Electrical circuit schedule (indicative)');
    const cx = [215, 232, 280, 300, 322];
    R2(['Ref', 'Type', 'Points', 'Load W', 'Rooms'], true, cx);
    sch.electrical.circuits.slice(0, 22).forEach(ci => R2([ci.id, ci.kind, String(ci.points), String(ci.watts), ci.rooms.slice(0, 34)], false, cx));
    R2(['', 'Total connected load', '', String(sch.electrical.connectedLoadW), ''], true, cx);
    y += 3;
    H2('Quantities for the architect');
    [['Exterior wall length', sch.exteriorWallLength + ' m'], ['Interior wall length', sch.interiorWallLength + ' m'], ['Doors', sch.doors.exterior + ' outside, ' + sch.doors.interior + ' inside'], ['Windows', String(sch.windows)], ['Lights / switches', sch.lighting.lights + ' / ' + sch.lighting.switches], ['Outlets / AC points', sch.electrical.outlets + ' / ' + sch.electrical.acPoints], ['Pipe length 15 mm', (sch.plumbing.pipeLengthByDiameterMm[15] || 0) + ' m'], ['Pipe length 20 and 25 mm', ((sch.plumbing.pipeLengthByDiameterMm[20] || 0) + (sch.plumbing.pipeLengthByDiameterMm[25] || 0)) + ' m'], ['Drain 50 mm / 100 mm', (sch.plumbing.pipeLengthByDiameterMm[50] || 0) + ' / ' + (sch.plumbing.pipeLengthByDiameterMm[100] || 0) + ' m']].forEach(r => R2(r, false, [215, 290]));
    if (sch.finishes) {
      const F = sch.finishes; y += 3; H2('Other finishes');
      [['Outside walls', fin(F.outsideWalls)], ['Roof', fin(F.roof)], ['Front door', fin(F.frontDoor)], ['Windows', fin(F.windows)], ['Fence', fin(F.fence)], ['Ceilings', fin(F.ceilings)], ['Counters', fin(F.counters)]].forEach(r => R2(r, false, [215, 262]));
    }
    y = Math.max(yEnd1, y) + 4;
    s += `<text x="16" y="${Math.min(y, 228)}" font-size="2.8">Notes: the layout was drawn by the client in VR. Walls are drawn on room boundaries. Services are placed by rule so the architect can edit rather than start from nothing.</text>`;
    return s;
  }, { noScale: true });
}


/* ---------- sheets for the other professionals ---------- */
const cell = (x, y, t, o) => `<text x="${x}" y="${y}" font-size="${(o && o.size) || 2.8}" ${(o && o.bold) ? 'font-weight="700"' : ''} ${(o && o.anchor) ? `text-anchor="${o.anchor}"` : ''}>${esc(t)}</text>`;
function table(x, y, cols, rows, widths, maxRows) {
  let s = '', cx = x; cols.forEach((t, i) => { s += cell(cx, y, t, { bold: true }); cx += widths[i]; }); s += `<line x1="${x}" y1="${y + 1.5}" x2="${x + widths.reduce((a, b) => a + b, 0)}" y2="${y + 1.5}" stroke="#000" stroke-width="0.3"/>`; y += 5.2;
  rows.slice(0, maxRows || 40).forEach(r => { cx = x; r.forEach((t, i) => { s += cell(cx, y, String(t)); cx += widths[i]; }); y += 4.3; });
  return { s, y };
}
function sheetFinishes(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[5], c => {
    const fin = (o) => o ? `${o.material}${o.colour ? ', ' + o.colour : ''}` : 'Default';
    let s = cell(16, 20, 'Finishes by room', { size: 4, bold: true });
    const rooms = sch.finishes ? sch.finishes.rooms.filter(r => (r.level || 0) === (meta.levelIdx || 0)) : [];
    s += table(16, 28, ['Room', 'Floor', 'Walls'], rooms.map(r => [r.room.slice(0, 26), fin(r.floor).slice(0, 34), fin(r.walls).slice(0, 34)]), [48, 70, 70], 24).s;
    if (sch.finishes) { const F = sch.finishes; const t = table(16, 28 + 5.2 + Math.min(rooms.length, 24) * 4.3 + 8, ['Outside and general', 'Choice'], [['Outside walls', fin(F.outsideWalls)], ['Roof', fin(F.roof)], ['Front door', fin(F.frontDoor)], ['Windows', fin(F.windows)], ['Fence', fin(F.fence)], ['Ceilings', fin(F.ceilings)], ['Counters', fin(F.counters)]], [48, 140], 10); s += t.s; }
    else s += cell(16, 40, 'The client did not choose finishes. Defaults are shown on the plans.', { size: 3 });
    s += cell(215, 20, 'Furniture and equipment shown to the client on this floor', { size: 4, bold: true });
    const furn = (meta.furniture || []), grouped = {}; furn.forEach(f => { const k = f.name || 'Item'; grouped[k] = (grouped[k] || 0) + 1; });
    const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k.slice(0, 34), v]);
    s += table(215, 28, ['Item', 'Number'], rows, [120, 30], 44).s;
    s += cell(16, 228, 'Furniture is shown for layout only and is not part of the building contract unless the client orders it.', { size: 2.6 });
    return s;
  }, { noScale: true });
}
function sheetStructure(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[6], c => {
    const rooms = geo.design.rooms; let s = '';
    const pts = new Map(); rooms.forEach(r => [[r.x, r.z], [r.x + r.w, r.z], [r.x, r.z + r.d], [r.x + r.w, r.z + r.d]].forEach(p => pts.set(p[0] + ',' + p[1], p)));
    s += '<g fill="none" stroke="#000" stroke-width="0.35" stroke-dasharray="3 1.5">' + geo.walls.map(w => `<line x1="${c.X(w.x1)}" y1="${c.Z(w.z1)}" x2="${c.X(w.x2)}" y2="${c.Z(w.z2)}"/>`).join('') + '</g>';
    s += rooms.map(r => `<rect x="${c.X(r.x)}" y="${c.Z(r.z)}" width="${c.L(r.w)}" height="${c.L(r.d)}" fill="none" stroke="#999" stroke-width="0.15"/>`).join('');
    const cs = c.L(0.23); [...pts.values()].forEach((p, i) => { s += `<rect x="${c.X(p[0]) - cs / 2}" y="${c.Z(p[1]) - cs / 2}" width="${cs}" height="${cs}" fill="#000"/><text x="${+c.X(p[0]) + cs}" y="${+c.Z(p[1]) - cs}" font-size="2" fill="#000">C${i + 1}</text>`; });
    rooms.forEach(r => { s += `<text x="${c.X(r.x + r.w / 2)}" y="${c.Z(r.z + r.d / 2)}" font-size="2.6" text-anchor="middle" fill="#555">${esc(r.label)}</text>`; if (r.w > 5 || r.d > 5) s += `<text x="${c.X(r.x + r.w / 2)}" y="${+c.Z(r.z + r.d / 2) + 4}" font-size="2.2" text-anchor="middle" fill="#b00020">Large span: engineer to check beam</text>`; });
    s += cell(16, 226, 'Dashed line = strip footing under a wall.   Black square = suggested column position.   Red text = large room the engineer must check.', { size: 2.8 }) + cell(16, 231, 'INDICATIVE ONLY. The engineer designs footings, columns, beams and slabs from soil tests and local wind and earthquake rules.', { size: 2.8, bold: true });
    return s;
  });
}
function sheetQuantities(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[7], c => {
    const H = 3.0, ext = sch.exteriorWallLength, int = sch.interiorWallLength, open = sch.doors.exterior * 2 + sch.doors.interior * 1.9 + sch.windows * 1.44, net = Math.max(0, (ext + int) * H - open);
    const rows = [['Floor area on this floor', f2(sch.floorArea), 'm2'], ['Outside wall length', f2(ext), 'm'], ['Inside wall length', f2(int), 'm'], ['Wall area less openings (3.0 m high)', f2(net), 'm2'], ['Hollow blocks (about 12.5 per m2)', Math.round(net * 12.5), 'no.'], ['Plaster and paint area, both faces', f2(ext * H + int * H * 2 - open * 1.5), 'm2'],
      ['Outside doors', sch.doors.exterior, 'no.'], ['Inside doors', sch.doors.interior, 'no.'], ['Windows', sch.windows, 'no.'], ['Lights', sch.lighting.lights, 'no.'], ['Switches', sch.lighting.switches, 'no.'], ['Sockets', sch.electrical.outlets, 'no.'], ['Air-conditioner points', sch.electrical.acPoints, 'no.'], ['Connected electrical load', f2(sch.electrical.connectedLoadW / 1000), 'kW']];
    Object.entries(sch.fixtures).forEach(([k, v]) => rows.push([k, v, 'no.'])); Object.entries(sch.plumbing.pipeLengthByDiameterMm || {}).forEach(([k, v]) => rows.push(['Pipe ' + k + ' mm', f2(v), 'm']));
    let s = cell(16, 20, 'Quantities for pricing (this floor)', { size: 4, bold: true }) + table(16, 28, ['Item', 'Amount', 'Unit'], rows, [90, 30, 20], 34).s;
    s += cell(215, 20, 'How to use this sheet', { size: 4, bold: true });
    ['These are rough quantities taken from the client\'s design.', 'Walls are assumed 3.0 m high. Doors 2.0 x 0.9 m, windows 1.2 x 1.2 m.', 'Foundations, steel and concrete are NOT priced here. They come from the', 'engineer\'s drawings.', 'Contractor: check every figure, then price. Add waste (5 to 10%).', 'Supplier: quote from the contractor\'s confirmed list, not from this sheet.'].forEach((t, i) => { s += cell(215, 28 + i * 5, t, { size: 3 }); });
    return s;
  }, { noScale: true });
}
function sheetSite(geo, mep, sch, meta) {
  const D = geo.design, P = D.plot || { w: 16, d: 20 }, k = Math.min(300 / P.w, 175 / P.d), ox = 40, oz = 30, den = Math.round(1000 / k / 50) * 50 || 100;
  const X = x => f2(ox + x * k), Z = z => f2(oz + z * k), L = v => f2(v * k);
  return frame(geo, mep, sch, meta, SHEETS[8], () => {
    let s = `<rect x="${X(0)}" y="${Z(0)}" width="${L(P.w)}" height="${L(P.d)}" fill="#f4f4f4" stroke="#000" stroke-width="0.8"/>`;
    const sb = { f: 3, s: 1.5, r: 1.5 };
    s += `<rect x="${X(sb.s)}" y="${Z(sb.r)}" width="${L(P.w - 2 * sb.s)}" height="${L(P.d - sb.f - sb.r)}" fill="none" stroke="#b00020" stroke-width="0.3" stroke-dasharray="3 2"/>`;
    s += geo.design.rooms.map(r => `<rect x="${X(r.x)}" y="${Z(r.z)}" width="${L(r.w)}" height="${L(r.d)}" fill="#fff" stroke="#000" stroke-width="0.5"/>`).join('');
    s += `<text x="${X(P.w / 2)}" y="${+Z(P.d) + 7}" font-size="3.4" text-anchor="middle">STREET / ROAD (front of plot)</text>`;
    s += `<text x="${X(P.w / 2)}" y="${+Z(0) - 3}" font-size="3" text-anchor="middle">${f2(P.w)} m</text><text x="${+X(0) - 4}" y="${Z(P.d / 2)}" font-size="3" text-anchor="middle" transform="rotate(-90 ${+X(0) - 4} ${Z(P.d / 2)})">${f2(P.d)} m</text>`;
    s += `<g transform="translate(385 40)"><circle r="8" fill="none" stroke="#000" stroke-width="0.5"/><path d="M0 -8 L3 3 L0 1 L-3 3 Z" fill="#000"/><text y="-11" font-size="4" font-weight="700" text-anchor="middle">N?</text></g><text x="370" y="58" font-size="2.4">North not yet surveyed.</text>`;
    s += cell(345, 90, 'Plot area ' + f2(P.w * P.d) + ' m2', { size: 3, bold: true }) + cell(345, 96, 'House footprint ' + f2(sch.floorArea) + ' m2', { size: 3 });
    s += legend([{ sym: lineSym('', 0.8), text: 'Plot boundary (assumed rectangle)' }, { sym: lineSym('3 2', 0.4), text: 'Assumed setbacks 3 m front, 1.5 m sides and rear' }], 345, 110);
    s += cell(345, 130, 'FOR THE SURVEYOR TO CONFIRM:', { size: 2.8, bold: true }) + ['Real boundary shape and size', 'North direction and ground levels', 'Setbacks required locally', 'Easements, drains and utilities'].map((t, i) => cell(345, 135 + i * 4.5, '- ' + t, { size: 2.6 })).join('');
    return s;
  }, { noScale: true });
}

function buildSheets(geo, mep, sch, meta) {
  return [sheetFloor(geo, mep, sch, meta), sheetPlumb(geo, mep, sch, meta), sheetElec(geo, mep, sch, meta), sheetLight(geo, mep, sch, meta), sheetSchedules(geo, mep, sch, meta),
    sheetFinishes(geo, mep, sch, meta), sheetStructure(geo, mep, sch, meta), sheetQuantities(geo, mep, sch, meta), (meta.levelIdx || 0) === 0 ? sheetSite(geo, mep, sch, meta) : null, null, sheetHVAC(geo, mep, sch, meta), sheetFire(geo, mep, sch, meta), sheetBeams(geo, mep, sch, meta)];
}

/* ---------- DXF (R12 ASCII, millimetres, layers per discipline) ---------- */
function buildDXF(geo, mep, part, levelIdx) {
  part = part || 'all'; levelIdx = levelIdx || 0;
  const ent = [];
  const mm = v => Math.round(v * 1000);
  const line = (layer, x1, z1, x2, z2) => ent.push(['0', 'LINE', '8', layer, '10', mm(x1), '20', -mm(z1), '30', 0, '11', mm(x2), '21', -mm(z2), '31', 0]);
  const circle = (layer, x, z, r) => ent.push(['0', 'CIRCLE', '8', layer, '10', mm(x), '20', -mm(z), '30', 0, '40', mm(r)]);
  const text = (layer, x, z, h, t) => ent.push(['0', 'TEXT', '8', layer, '10', mm(x), '20', -mm(z), '30', 0, '40', mm(h), '1', String(t).replace(/[\r\n]/g, ' ')]);
  const rect = (layer, x, z, w, d) => { line(layer, x, z, x + w, z); line(layer, x + w, z, x + w, z + d); line(layer, x + w, z + d, x, z + d); line(layer, x, z + d, x, z); };
  /* a closed polyline, so Civil 3D and AutoCAD can turn it into a parcel or an area */
  const poly = (layer, pts) => { ent.push(['0', 'POLYLINE', '8', layer, '66', 1, '70', 1]); pts.forEach(p => ent.push(['0', 'VERTEX', '8', layer, '10', mm(p[0]), '20', -mm(p[1]), '30', 0])); ent.push(['0', 'SEQEND', '8', layer]); };
  geo.walls.forEach(w => line(w.ext ? 'A-WALL-EXT' : 'A-WALL-INT', w.x1, w.z1, w.x2, w.z2));
  [...geo.doors, ...geo.windows].forEach(o => { const h = o.ori === 'h'; line(o.kind === 'door' ? 'A-DOOR' : 'A-GLAZ', h ? o.x - o.w / 2 : o.x, h ? o.z : o.z - o.w / 2, h ? o.x + o.w / 2 : o.x, h ? o.z : o.z + o.w / 2); });
  geo.fixtures.forEach(f => { rect('A-FIXT', f.x - f.w / 2, f.z - f.d / 2, f.w, f.d); text('A-ANNO', f.x - 0.15, f.z, 0.12, f.code); });
  geo.design.rooms.forEach(r => { rect('A-AREA', r.x, r.z, r.w, r.d); text('A-ANNO', r.x + 0.2, r.z + r.d / 2, 0.2, `${r.label} ${r.w}x${r.d} m ${r.area} m2`); });
  mep.pipes.forEach(p => { const layer = p.kind === 'cold' ? 'P-WATR-COLD' : p.kind === 'hot' ? 'P-WATR-HOT' : 'P-DRAN'; for (let i = 1; i < p.pts.length; i++) line(layer, p.pts[i - 1][0], p.pts[i - 1][1], p.pts[i][0], p.pts[i][1]); });
  mep.runs.forEach(p => { for (let i = 1; i < p.pts.length; i++) line('E-POWR-HOME', p.pts[i - 1][0], p.pts[i - 1][1], p.pts[i][0], p.pts[i][1]); });
  mep.outlets.forEach(o => circle('E-POWR-OUTL', o.x, o.z, 0.1));
  mep.acs.forEach(o => rect('E-POWR-AC', o.x - 0.3, o.z - 0.15, 0.6, 0.3));
  mep.lights.forEach(l => circle('E-LITE-FIXT', l.x, l.z, 0.18));
  mep.switches.forEach(s => circle('E-LITE-SWCH', s.x, s.z, 0.07));
  if (mep.db) rect('E-POWR-DB', mep.db.x - 0.25, mep.db.z - 0.25, 0.5, 0.5);
  /* site and structure (schematic, for the surveyor and engineer to develop) */
  const P = geo.design.plot || { w: 16, d: 20 };
  if (levelIdx === 0) {
    poly('C-PROP-BNDY', [[0, 0], [P.w, 0], [P.w, P.d], [0, P.d]]);
    poly('C-PROP-SETB', [[1.5, 1.5], [P.w - 1.5, 1.5], [P.w - 1.5, P.d - 3], [1.5, P.d - 3]]);
    text('C-ANNO', 0.3, P.d + 0.8, 0.3, 'STREET (front of plot). Boundary and setbacks are ASSUMED. Surveyor to replace with real survey.');
    text('C-ANNO', P.w / 2, -0.8, 0.3, 'NORTH ARROW NOT SET - surveyor to confirm');
    geo.walls.forEach(w => line('S-FNDN-STRP', w.x1, w.z1, w.x2, w.z2));
    const seen = new Set(); geo.walls.forEach(w => [[w.x1, w.z1], [w.x2, w.z2]].forEach(([x, z]) => { const k = x + ',' + z; if (!seen.has(k)) { seen.add(k); rect('S-COLS', x - 0.1, z - 0.1, 0.2, 0.2); } }));
    text('S-ANNO', 0.3, P.d + 1.4, 0.3, 'Schematic only. Strip footings and column positions to be designed by the engineer.');
  }
  const layerSet = { architect: /^A-/, electrical: /^E-/, plumbing: /^P-/, site: /^(C|S)-/, all: /./ }[part] || /./;
  const use = ent.filter(e => layerSet.test(e[3]));
  const layers = Array.from(new Set(use.map(e => e[3]))).sort();
  const colour = { 'C-PROP-BNDY': 1, 'C-PROP-SETB': 5, 'S-FNDN-STRP': 3, 'S-COLS': 2 };
  const out = [];
  const push = (...a) => { for (let i = 0; i < a.length; i += 2) { out.push(String(a[i])); out.push(String(a[i + 1])); } };
  push(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC');
  push(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, layers.length);
  layers.forEach(l => push(0, 'LAYER', 2, l, 70, 0, 62, colour[l] || 7, 6, 'CONTINUOUS'));
  push(0, 'ENDTAB', 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');
  use.forEach(e => push(...e));
  push(0, 'ENDSEC', 0, 'EOF');
  return out.join('\n') + '\n';
}

function buildSheetsHtml(sheets, meta) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(meta.ref || 'Plans')} - ConstructReality drawings</title>
<style>@page{size:A3 landscape;margin:0}body{margin:0;background:#eee}svg{display:block;width:420mm;height:297mm;background:#fff;margin:8px auto;page-break-after:always}@media print{body{background:#fff}svg{margin:0}}.bar{font:14px Arial;padding:10px 16px;background:#000;color:#fff}</style></head>
<body><div class="bar no-print">ConstructReality drawings for ${esc(meta.client || 'client')} (${esc(meta.ref || '')}). Use your browser's Print to save all sheets as one PDF (paper A3, landscape, margins none).</div>${sheets.join('\n')}</body></html>`;
}


/* ---------- elevations (front, rear, left, right) built from the same room and opening data as the plans ---------- */
const ELEV_SIDES = [['front', 'FRONT ELEVATION (street side)'], ['back', 'REAR ELEVATION'], ['left', 'LEFT ELEVATION (seen from the street)'], ['right', 'RIGHT ELEVATION (seen from the street)']];
/* returns shapes in metres: u = distance along the view, y = height above ground floor level */
function elevGeom(parts, side, roofStyle) {
  const U = side === 'front' ? (x, z) => x : side === 'back' ? (x, z) => -x : side === 'left' ? (x, z) => z : (x, z) => -z;
  const H = 2.7, FH = 3.0, OV = 0.6, items = [], datums = [];
  const box = (rs) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; rs.forEach(r => { x0 = Math.min(x0, r.x); z0 = Math.min(z0, r.z); x1 = Math.max(x1, r.x + r.w); z1 = Math.max(z1, r.z + r.d); }); return { x0, z0, x1, z1 }; };
  const poly = (layer, pts, fill, extra) => items.push(Object.assign({ layer, pts, fill: fill || '#fff' }, extra || {}));
  const rect = (layer, u0, y0, u1, y1, fill, extra) => poly(layer, [[Math.min(u0, u1), y0], [Math.max(u0, u1), y0], [Math.max(u0, u1), y1], [Math.min(u0, u1), y1]], fill, extra);
  const lvls = parts.map((p, li) => ({ li, p, rooms: p.geo.design.rooms })).filter(l => l.rooms.length);
  if (!lvls.length) return null;
  lvls.forEach(l => {
    const b = box(l.rooms), a = U(b.x0, b.z0), c = U(b.x1, b.z1), u0 = Math.min(a, c), u1 = Math.max(a, c), base = l.li * FH;
    if (l.li > 0) rect('A-ELEV-SLAB', u0 - 0.05, base - 0.3, u1 + 0.05, base, '#ddd');
    rect('A-ELEV-WALL', u0, base, u1, base + H, '#fff');
    datums.push({ y: base, label: (['Ground floor', 'First floor', 'Second floor'][l.li] || 'Floor') + ' level' });
  });
  lvls.forEach(l => {
    const g = l.p.geo, base = l.li * FH, near = (a, b) => Math.abs(a - b) < 0.07;
    [...g.doors.filter(d => d.ext), ...g.windows].forEach(o => {
      const r = g.design.rooms[o.rooms[0]]; if (!r) return;
      const sd = o.ori === 'h' ? (near(o.z, r.z + r.d) ? 'front' : near(o.z, r.z) ? 'back' : '') : (near(o.x, r.x + r.w) ? 'right' : near(o.x, r.x) ? 'left' : '');
      if (sd !== side) return;
      const u = U(o.x, o.z);
      if (o.kind === 'window') {
        rect('A-ELEV-GLAZ', u - o.w / 2, base + o.sill, u + o.w / 2, base + o.head, '#e6e6e6', { frame: true });
        items.push({ layer: 'A-ELEV-GLAZ', pts: [[u, base + o.sill], [u, base + o.head]], fill: 'none', open: true });
      } else {
        const h = o.hgt || 2.1; rect('A-ELEV-DOOR', u - o.w / 2, base, u + o.w / 2, base + h, o.garage ? '#d0d0d0' : '#bdbdbd', { frame: true });
        if (o.garage) for (let i = 1; i < 6; i++) items.push({ layer: 'A-ELEV-DOOR', pts: [[u - o.w / 2, base + h * i / 6], [u + o.w / 2, base + h * i / 6]], fill: 'none', open: true });
      }
    });
  });
  /* roof */
  const top = lvls[lvls.length - 1], tb = box(top.rooms), baseY = top.li * FH + H, yW = baseY + 0.05;
  const style = ['gable', 'hip', 'mono', 'flat'].includes(roofStyle) ? roofStyle : 'gable';
  const dimX = side === 'front' || side === 'back', rx = (tb.x1 - tb.x0) >= (tb.z1 - tb.z0);
  const span = rx ? tb.z1 - tb.z0 : tb.x1 - tb.x0, a0 = rx ? tb.x0 : tb.z0, a1 = rx ? tb.x1 : tb.z1, b0 = rx ? tb.z0 : tb.x0, b1 = rx ? tb.z1 : tb.x1, mid = (b0 + b1) / 2;
  const Ua = a => rx ? U(a, 0) : U(0, a), Ub = b => rx ? U(0, b) : U(b, 0);
  let ridge = baseY;
  if (style === 'flat') {
    const ua = U(tb.x0, tb.z0), ub = U(tb.x1, tb.z1);
    rect('A-ELEV-ROOF', Math.min(ua, ub) - 0.1, baseY, Math.max(ua, ub) + 0.1, baseY + 0.45, '#ddd'); ridge = baseY + 0.45;
  } else {
    const tanp = style === 'mono' ? 0.22 : style === 'hip' ? 0.5 : 0.52, ye = yW - OV * tanp, yr = yW + tanp * span / 2, yh = yW + tanp * span, ea0 = a0 - 0.4, ea1 = a1 + 0.4, eb0 = b0 - OV, eb1 = b1 + OV;
    const parallel = dimX === rx;
    if (parallel) {
      const p = (a, y) => [Ua(a), y];
      if (style === 'hip') { const inset = (eb1 - eb0) / 2, r1 = ea0 + inset, r2 = ea1 - inset; poly('A-ELEV-ROOF', r2 > r1 + 0.01 ? [p(ea0, ye), p(ea1, ye), p(r2, yr), p(r1, yr)] : [p(ea0, ye), p(ea1, ye), p((ea0 + ea1) / 2, yr)], '#ddd'); ridge = yr; }
      else if (style === 'mono') { poly('A-ELEV-ROOF', [p(ea0, ye), p(ea1, ye), p(ea1, yh + OV * tanp), p(ea0, yh + OV * tanp)], '#ddd'); ridge = yh + OV * tanp; }
      else { poly('A-ELEV-ROOF', [p(ea0, ye), p(ea1, ye), p(ea1, yr), p(ea0, yr)], '#ddd'); ridge = yr; }
    } else {
      const q = (b, y) => [Ub(b), y];
      if (style === 'gable') { poly('A-ELEV-WALL', [q(b0, baseY), q(b1, baseY), q(mid, yr)], '#fff'); poly('A-ELEV-ROOF', [q(eb0, ye), q(eb1, ye), q(mid, yr)], 'none'); ridge = yr; }
      else if (style === 'hip') { poly('A-ELEV-ROOF', [q(eb0, ye), q(eb1, ye), q(mid, yr)], '#ddd'); ridge = yr; }
      else { poly('A-ELEV-WALL', [q(b0, baseY), q(b1, baseY), q(b1, yW), q(b0, yh)], '#fff'); poly('A-ELEV-ROOF', [q(eb1, ye), q(eb0, yh + OV * tanp), q(eb0, yh + OV * tanp + 0.12), q(eb1, ye + 0.12)], '#ddd'); ridge = yh + OV * tanp; }
    }
  }
  datums.push({ y: ridge, label: style === 'flat' ? 'Top of parapet' : 'Top of roof' });
  let umin = 1e9, umax = -1e9, ymax = 0; items.forEach(i => i.pts.forEach(p => { umin = Math.min(umin, p[0]); umax = Math.max(umax, p[0]); ymax = Math.max(ymax, p[1]); }));
  return { items, datums, umin: umin - 0.5, umax: umax + 0.5, ymax, style };
}
function elevationFits(parts, roofStyle) {
  const gs = ELEV_SIDES.map(s => elevGeom(parts, s[0], roofStyle)).filter(Boolean); if (!gs.length) return null;
  const w = Math.max(...gs.map(g => g.umax - g.umin)), h = Math.max(...gs.map(g => g.ymax)) + 0.4;
  const den = [50, 75, 100, 150, 200, 250].find(d => w * 1000 / d <= 165 && h * 1000 / d <= 80) || 300;
  return { gs, den };
}
function buildElevationSheet(parts, meta, roofStyle, finishes) {
  const fit = elevationFits(parts, roofStyle); if (!fit) return null;
  const { gs, den } = fit, k = 1000 / den, geo = parts[0].geo;
  const body = () => {
    let s = '';
    gs.forEach((g, i) => {
      const cx = 8 + (i % 2) * 202, cy = 10 + Math.floor(i / 2) * 114, gy = cy + 104, ox = cx + 26 + ((165 - (g.umax - g.umin) * k) / 2);
      const X = u => f2(ox + (u - g.umin) * k), Y = y => f2(gy - y * k);
      s += `<text x="${cx + 4}" y="${cy + 6}" font-size="4" font-weight="700">${ELEV_SIDES[i][1]}</text><text x="${cx + 4}" y="${cy + 10}" font-size="2.4" fill="#555">Scale 1:${den} at A3</text>`;
      g.items.forEach(it => {
        const pts = it.pts.map(p => X(p[0]) + ',' + Y(p[1])).join(' ');
        if (it.open) s += `<polyline points="${pts}" fill="none" stroke="#000" stroke-width="0.2"/>`;
        else s += `<polygon points="${pts}" fill="${it.fill}" stroke="#000" stroke-width="${it.layer === 'A-ELEV-ROOF' ? 0.45 : it.frame ? 0.3 : 0.4}"/>`;
      });
      s += `<line x1="${X(g.umin) - 3}" y1="${Y(0)}" x2="${X(g.umax) + 3}" y2="${Y(0)}" stroke="#000" stroke-width="0.8"/>`;
      for (let t = g.umin; t < g.umax; t += 0.4) s += `<line x1="${X(t)}" y1="${Y(0)}" x2="${f2(+X(t) - 1.2)}" y2="${f2(+Y(0) + 1.6)}" stroke="#000" stroke-width="0.15"/>`;
      g.datums.forEach(d => { s += `<line x1="${cx + 8}" y1="${Y(d.y)}" x2="${X(g.umax)}" y2="${Y(d.y)}" stroke="#777" stroke-width="0.15" stroke-dasharray="1.5 1.5"/><text x="${cx + 8}" y="${+Y(d.y) - 0.8}" font-size="2.1">${d.y >= 0 ? '+' : ''}${d.y.toFixed(2)}  ${d.label}</text>`; });
    });
    const F = finishes || {}, m = (o) => o ? [o.material, o.colour].filter(Boolean).join(', ') : 'not chosen';
    s += `<text x="12" y="236" font-size="2.1" fill="#555">Levels in metres. Ground level is assumed to equal the ground floor level; the surveyor must confirm real ground levels. Roof shape is taken from the client's choice and drawn over the top floor outline.</text>`;
    s += `<text x="12" y="232.5" font-size="2.3">Walls: ${esc(m(F.outsideWalls))}    Roof: ${esc(m(F.roof))} (${esc(roofStyle || 'gable')})    Windows: ${esc(m(F.windows))}    Front door: ${esc(m(F.frontDoor))}</text>`;
    return s;
  };
  return frame(geo, null, null, meta, SHEETS[9], body, { noScale: true });
}
function buildElevationDXF(parts, roofStyle) {
  const fit = elevationFits(parts, roofStyle); if (!fit) return null;
  const mm = v => Math.round(v * 1000), ent = []; let off = 0;
  fit.gs.forEach((g, i) => {
    const sh = off - g.umin; off += (g.umax - g.umin) + 4;
    ent.push(['0', 'TEXT', '8', 'A-ANNO', '10', mm(g.umin + sh), '20', mm(g.ymax + 1), '30', 0, '40', 250, '1', ELEV_SIDES[i][1]]);
    g.items.forEach(it => { const p = it.pts, n = it.open ? p.length - 1 : p.length; for (let j = 0; j < n; j++) { const a = p[j], b = p[(j + 1) % p.length]; ent.push(['0', 'LINE', '8', it.layer, '10', mm(a[0] + sh), '20', mm(a[1]), '30', 0, '11', mm(b[0] + sh), '21', mm(b[1]), '31', 0]); } });
    ent.push(['0', 'LINE', '8', 'A-ELEV-GRND', '10', mm(g.umin + sh), '20', 0, '30', 0, '11', mm(g.umax + sh), '21', 0, '31', 0]);
    g.datums.forEach(d => ent.push(['0', 'TEXT', '8', 'A-ANNO', '10', mm(g.umin + sh), '20', mm(d.y) + 60, '30', 0, '40', 150, '1', (d.y >= 0 ? '+' : '') + d.y.toFixed(2) + ' ' + d.label]));
  });
  const layers = Array.from(new Set(ent.map(e => e[3]))).sort(), colour = { 'A-ELEV-ROOF': 6, 'A-ELEV-GLAZ': 4, 'A-ELEV-DOOR': 3, 'A-ELEV-GRND': 2 }, out = [];
  const push = (...a) => { for (let i = 0; i < a.length; i += 2) { out.push(String(a[i])); out.push(String(a[i + 1])); } };
  push(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC', 0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, layers.length);
  layers.forEach(l => push(0, 'LAYER', 2, l, 70, 0, 62, colour[l] || 7, 6, 'CONTINUOUS'));
  push(0, 'ENDTAB', 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES'); ent.forEach(e => push(...e)); push(0, 'ENDSEC', 0, 'EOF');
  return out.join('\n') + '\n';
}


/* =====================================================================================
   More sheets, produced behind the scenes with every design. All are concept drafts:
   sizes marked "indicative" or "assumed" are for pricing and discussion only, and the
   licensed professional named on each sheet must design and sign them.
   ===================================================================================== */
const ROOF_TAN = { gable: 0.52, hip: 0.5, mono: 0.22, flat: 0 };
const bboxOf = (rooms) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; rooms.forEach(r => { x0 = Math.min(x0, r.x); z0 = Math.min(z0, r.z); x1 = Math.max(x1, r.x + r.w); z1 = Math.max(z1, r.z + r.d); }); return { x0, z0, x1, z1 }; };
const NOTE = (lines, x, y, size) => lines.map((t, i) => cell(x, y + i * ((size || 2.8) + 1.9), t, { size: size || 2.8 })).join('');
const wide = (parts, meta, sheet, bodyFn) => frame(parts[0].geo, null, null, meta, sheet, bodyFn, { noScale: true });
const roomDoorIdx = (geo, ri) => geo.doors.filter(d => d.rooms.includes(ri));

/* ---- per floor: air conditioning and ventilation ---- */
function sheetHVAC(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[10], c => {
    const rooms = geo.design.rooms, B = bboxOf(rooms), rows = []; let s = walls(geo, c) + labels(geo, c, false), tot = 0;
    const sizes = [9000, 12000, 18000, 24000, 36000];
    rooms.forEach((r, i) => {
      const area = r.w * r.d, cx = r.x + r.w / 2, cz = r.z + r.d / 2;
      if (['bedroom', 'living', 'dining', 'office'].includes(r.type)) {
        const need = area * 700, size = sizes.find(v => v >= need) || 36000; tot += size; rows.push([r.label, f2(area), 'Split AC unit', size.toLocaleString('en-US')]);
        const dl = [[cx - B.x0, 'w'], [B.x1 - cx, 'e'], [cz - B.z0, 'n'], [B.z1 - cz, 's']].sort((a, b) => a[0] - b[0])[0][1];
        const ux = dl === 'w' ? r.x + 0.15 : dl === 'e' ? r.x + r.w - 0.15 : cx, uz = dl === 'n' ? r.z + 0.15 : dl === 's' ? r.z + r.d - 0.15 : cz;
        const ox = dl === 'w' ? B.x0 - 0.7 : dl === 'e' ? B.x1 + 0.7 : cx, oz = dl === 'n' ? B.z0 - 0.7 : dl === 's' ? B.z1 + 0.7 : cz;
        const hz = dl === 'w' || dl === 'e';
        s += `<rect x="${c.X(ux) - c.L(hz ? 0.12 : 0.45)}" y="${c.Z(uz) - c.L(hz ? 0.45 : 0.12)}" width="${c.L(hz ? 0.24 : 0.9)}" height="${c.L(hz ? 0.9 : 0.24)}" fill="#fff" stroke="#000" stroke-width="0.5"/>`;
        s += `<line x1="${c.X(ux)}" y1="${c.Z(uz)}" x2="${c.X(ox)}" y2="${c.Z(oz)}" stroke="#000" stroke-width="0.3" stroke-dasharray="1.5 1"/><rect x="${c.X(ox) - c.L(0.4)}" y="${c.Z(oz) - c.L(0.3)}" width="${c.L(0.8)}" height="${c.L(0.6)}" fill="#000"/><text x="${c.X(ox)}" y="${+c.Z(oz) - c.L(0.45)}" font-size="2" text-anchor="middle">OUTDOOR</text>`;
      }
      if (['bathroom', 'kitchen', 'laundry'].includes(r.type)) {
        rows.push([r.label, f2(area), 'Exhaust fan', 'vent']);
        s += `<g transform="translate(${c.X(cx)} ${c.Z(cz)})"><circle r="${c.L(0.28)}" fill="#fff" stroke="#000" stroke-width="0.5"/><path d="M${-c.L(0.2)} ${-c.L(0.2)}L${c.L(0.2)} ${c.L(0.2)}M${c.L(0.2)} ${-c.L(0.2)}L${-c.L(0.2)} ${c.L(0.2)}" stroke="#000" stroke-width="0.4"/></g>`;
      }
    });
    s += cell(318, 28, 'AIR CONDITIONING AND VENTILATION', { size: 3.2, bold: true });
    s += table(318, 36, ['Room', 'm2', 'Fitting', 'BTU/h'], rows, [30, 10, 24, 16], 20).s;
    s += cell(318, 40 + Math.min(rows.length, 20) * 4.3 + 12, 'Total cooling about ' + tot.toLocaleString('en-US') + ' BTU/h', { size: 2.9, bold: true });
    s += legend([{ sym: '<rect x="0" y="-1.5" width="9" height="3" fill="#fff" stroke="#000" stroke-width="0.4"/>', text: 'Indoor AC unit' }, { sym: '<rect x="1" y="-2" width="8" height="4" fill="#000"/>', text: 'Outdoor unit' }, { sym: '<circle cx="6" cy="0" r="2.2" fill="#fff" stroke="#000" stroke-width="0.4"/><path d="M4.4 -1.6L7.6 1.6M7.6 -1.6L4.4 1.6" stroke="#000" stroke-width="0.3"/>', text: 'Exhaust fan' }, { sym: lineSym('1.5 1', 0.3), text: 'Pipe and cable route' }], 318, 40 + Math.min(rows.length, 20) * 4.3 + 24);
    s += cell(16, 226, 'INDICATIVE ONLY. Sizes use a rough 700 BTU/h per m2 for Caribbean rooms with sun on the walls, rounded up to the next common unit. A mechanical engineer or AC supplier', { size: 2.6 }) + cell(16, 230.5, 'must confirm size, position and drainage. Allow roughly 1 kW of electricity for every 12,000 BTU/h; the electrician sizes the circuits.', { size: 2.6 });
    return s;
  });
}
/* ---- per floor: fire and escape ---- */
function sheetFire(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[11], c => {
    const rooms = geo.design.rooms; let s = walls(geo, c) + labels(geo, c, false), n = { smoke: 0, heat: 0, ext: 0, exit: 0 };
    const sym = (x, z, t, fill) => `<g transform="translate(${c.X(x)} ${c.Z(z)})"><circle r="${c.L(0.25)}" fill="${fill ? '#000' : '#fff'}" stroke="#000" stroke-width="0.5"/><text y="0.9" font-size="2.4" font-weight="700" text-anchor="middle" fill="${fill ? '#fff' : '#000'}">${t}</text></g>`;
    rooms.forEach((r, i) => {
      const cx = r.x + r.w / 2, cz = r.z + r.d / 2;
      if (['bedroom', 'hall', 'living', 'office'].includes(r.type)) { s += sym(cx + 0.5, cz - 0.5, 'S'); n.smoke++; }
      if (r.type === 'kitchen') { s += sym(cx + 0.5, cz - 0.5, 'H'); n.heat++; s += sym(r.x + 0.4, r.z + 0.4, 'E', true); n.ext++; }
      if (r.type === 'stairs') return;
      const ds = roomDoorIdx(geo, i), ext = ds.find(d => d.ext), tgt = ext || ds[0]; if (!tgt) return;
      const a = [c.X(cx), c.Z(cz)], b = [c.X(tgt.x), c.Z(tgt.z)];
      s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#000" stroke-width="0.6" stroke-dasharray="2.4 1.4" marker-end="url(#arr)"/>`;
    });
    geo.doors.filter(d => d.ext && !d.garage).forEach(d => { s += `<g transform="translate(${c.X(d.x)} ${c.Z(d.z)})"><rect x="-6" y="-2.6" width="12" height="5.2" fill="#000"/><text y="1.2" font-size="2.8" font-weight="700" text-anchor="middle" fill="#fff">EXIT</text></g>`; n.exit++; });
    s = `<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L9 5L1 9z" fill="#000"/></marker></defs>` + s;
    s += cell(345, 28, 'FIRE SAFETY AND ESCAPE', { size: 3.2, bold: true });
    s += legend([{ sym: '<circle cx="6" cy="0" r="2.2" fill="#fff" stroke="#000" stroke-width="0.5"/><text x="6" y="0.9" font-size="2.4" font-weight="700" text-anchor="middle">S</text>', text: 'Smoke alarm (' + n.smoke + ')' }, { sym: '<circle cx="6" cy="0" r="2.2" fill="#fff" stroke="#000" stroke-width="0.5"/><text x="6" y="0.9" font-size="2.4" font-weight="700" text-anchor="middle">H</text>', text: 'Heat alarm, kitchen (' + n.heat + ')' }, { sym: '<circle cx="6" cy="0" r="2.2" fill="#000"/><text x="6" y="0.9" font-size="2.4" font-weight="700" text-anchor="middle" fill="#fff">E</text>', text: 'Fire extinguisher (' + n.ext + ')' }, { sym: '<line x1="0" y1="0" x2="11" y2="0" stroke="#000" stroke-width="0.6" stroke-dasharray="2.4 1.4"/>', text: 'Way out of each room' }, { sym: '<rect x="0" y="-2" width="11" height="4" fill="#000"/>', text: 'Exit to outside' }], 345, 40);
    s += NOTE(['Every sleeping room has a smoke alarm. Fit alarms on the ceiling,', 'away from the kitchen. Keep exit routes clear of furniture.', meta.levelIdx > 0 ? 'On this floor the stairs are the way out. Keep them clear.' : 'Choose a meeting point on the street side of the plot.', 'Gas cylinders stay outside, with good air around them.'], 345, 92, 2.6);
    s += cell(16, 226, 'INDICATIVE ONLY. The Jamaica Fire Brigade and the local building authority set the rules for your building. Escape arrows show the way to each room\'s door;', { size: 2.6 }) + cell(16, 230.5, 'a licensed designer must confirm travel distances, door widths and alarm types before building.', { size: 2.6 });
    return s;
  });
}
/* ---- per floor: columns and beams ---- */
function sheetBeams(geo, mep, sch, meta) {
  return frame(geo, mep, sch, meta, SHEETS[12], c => {
    const rooms = geo.design.rooms; let s = rooms.map(r => `<rect x="${c.X(r.x)}" y="${c.Z(r.z)}" width="${c.L(r.w)}" height="${c.L(r.d)}" fill="none" stroke="#bbb" stroke-width="0.15"/>`).join('');
    s += geo.walls.map(w => `<line x1="${c.X(w.x1)}" y1="${c.Z(w.z1)}" x2="${c.X(w.x2)}" y2="${c.Z(w.z2)}" stroke="#000" stroke-width="${w.ext ? 1.3 : 0.8}"/>`).join('');
    const pts = new Map(); rooms.forEach(r => [[r.x, r.z], [r.x + r.w, r.z], [r.x, r.z + r.d], [r.x + r.w, r.z + r.d]].forEach(p => pts.set(p[0] + ',' + p[1], p)));
    const cs = c.L(0.23); [...pts.values()].forEach((p, i) => { s += `<rect x="${c.X(p[0]) - cs / 2}" y="${c.Z(p[1]) - cs / 2}" width="${cs}" height="${cs}" fill="#000"/><text x="${+c.X(p[0]) + cs}" y="${+c.Z(p[1]) - cs}" font-size="2">C${i + 1}</text>`; });
    let maxSpan = 0; rooms.forEach(r => { const sp = Math.min(r.w, r.d); maxSpan = Math.max(maxSpan, sp); s += `<text x="${c.X(r.x + r.w / 2)}" y="${c.Z(r.z + r.d / 2)}" font-size="2.4" text-anchor="middle" fill="#555">${esc(r.label)}</text><text x="${c.X(r.x + r.w / 2)}" y="${+c.Z(r.z + r.d / 2) + 3.4}" font-size="2" text-anchor="middle" fill="#555">slab spans ${f2(Math.min(r.w, r.d))} m</text>`; });
    s += cell(318, 28, 'COLUMN AND BEAM LAYOUT', { size: 3.2, bold: true });
    s += table(318, 36, ['Item', 'Assumed', 'Number'], [['Columns', '230 x 230 mm', pts.size], ['Beams on every wall line', '230 x 300 mm', geo.walls.length], ['Floor slab', '125 to 150 mm', f2(sch.floorArea) + ' m2'], ['Longest short span', f2(maxSpan) + ' m', '-']], [40, 28, 20], 6).s;
    s += legend([{ sym: '<rect x="3" y="-2" width="4" height="4" fill="#000"/>', text: 'Column at room corner' }, { sym: lineSym('', 1.2), text: 'Beam along outside wall' }, { sym: lineSym('', 0.8), text: 'Beam along inside wall' }], 318, 78);
    s += cell(16, 226, 'ASSUMED SIZES FOR PRICING ONLY. A structural engineer designs the real columns, beams, slab and steel, and checks wind, soil and spans. Do not build from this sheet.', { size: 2.6 });
    return s;
  });
}

/* ---- building wide sheets (written at the top of the project folder) ---- */
function sheetTitle(parts, meta, index, finishes, extra) {
  const total = parts.reduce((a, p) => a + (p.sch.floorArea || 0), 0), rooms = parts.reduce((a, p) => a + p.geo.design.rooms.length, 0);
  return wide(parts, meta, SHEETS[13], () => {
    let s = cell(16, 22, 'DRAWING INDEX', { size: 4, bold: true });
    const rows = index.map(r => [r[0], r[1], r[2] || 'All floors']); s += table(16, 30, ['Sheet', 'Title', 'Covers'], rows, [22, 72, 24], 44).s;
    s += cell(150, 22, 'PROJECT SUMMARY', { size: 4, bold: true });
    s += NOTE(['Client: ' + (meta.client || 'not yet named'), 'Reference: ' + (meta.ref || ''), 'Floors: ' + parts.length, 'Rooms: ' + rooms, 'Total floor area: ' + f2(total) + ' m2', 'Plot: ' + (parts[0].geo.design.plot ? f2(parts[0].geo.design.plot.w) + ' x ' + f2(parts[0].geo.design.plot.d) + ' m' : 'not set'), 'Roof shape: ' + ((extra && extra.roofStyle) || 'gable')], 150, 30, 3);
    s += cell(150, 66, 'PROFESSIONALS TO APPOINT', { size: 4, bold: true });
    s += table(150, 73, ['Role', 'Name and licence number'], [['Architect', '____________________'], ['Structural engineer', '____________________'], ['Land surveyor', '____________________'], ['Electrician / engineer', '____________________'], ['Plumber / engineer', '____________________'], ['Contractor', '____________________']], [40, 70], 8).s;
    s += cell(150, 118, 'GENERAL NOTES', { size: 4, bold: true });
    s += NOTE(['1. Every sheet is a concept draft made from the client\'s VR design. NOT FOR CONSTRUCTION.', '2. Sizes are in metres unless a sheet says millimetres. Walls assumed 2.7 m clear height.', '3. Sheets marked indicative or assumed are for pricing and discussion only.', '4. The architect, engineer and surveyor must check and sign before approval or building.', '5. Check the local building authority\'s rules, setbacks and hurricane requirements.', '6. Earthing, lightning protection and the power company connection are designed', '    by a licensed electrician or engineer.', '7. Dimensions and levels must be checked on site before any work starts.'], 150, 126, 2.6);
    s += cell(16, 126, 'SYMBOLS', { size: 4, bold: true });
    s += legend([{ sym: lineSym('', 1.2), text: 'External wall (200 mm)' }, { sym: lineSym('', 0.6), text: 'Internal wall (100 mm)' }, { sym: '<path d="M0 0 H11" stroke="#000" stroke-width="0.35"/>', text: 'Door with swing' }, { sym: lineSym('', 0.3), text: 'Window' }, { sym: lineSym('3 1.5', 0.35), text: 'Footing or hidden item' }, { sym: circ(0, 1), text: 'Light / alarm / outlet (see sheet)' }], 20, 140);
    s += cell(16, 190, 'Drawing numbers: A architecture, S structure, E electrical, P plumbing, M air conditioning, F fire,', { size: 2.6 }) + cell(16, 195, 'C site and civil, R risers, Q quantities, G general.', { size: 2.6 });
    return s;
  });
}
function roofGeom(parts, roofStyle) {
  const top = parts[parts.length - 1], rs = top.geo.design.rooms, B = bboxOf(rs), style = roofStyle || 'gable';
  const w = B.x1 - B.x0, d = B.z1 - B.z0, alongX = w >= d, span = alongX ? d : w;
  return { B, style, alongX, span, rise: (ROOF_TAN[style] || 0) * (style === 'mono' ? span : span / 2) };
}
function sheetRoof(parts, meta, roofStyle) {
  const R = roofGeom(parts, roofStyle), B = R.B, OV = 0.6, w = B.x1 - B.x0, d = B.z1 - B.z0;
  const k = Math.min(300 / (w + 2 * OV + 4), 165 / (d + 2 * OV + 4)), ox = 30 + (320 - (w + 2 * OV) * k) / 2 + OV * k, oz = 26 + OV * k + 4;
  const X = x => f2(ox + (x - B.x0) * k), Z = z => f2(oz + (z - B.z0) * k), L = v => f2(v * k);
  return wide(parts, meta, SHEETS[14], () => {
    let s = '';
    s += `<rect x="${X(B.x0 - OV)}" y="${Z(B.z0 - OV)}" width="${L(w + 2 * OV)}" height="${L(d + 2 * OV)}" fill="#f2f2f2" stroke="#000" stroke-width="0.7"/>`;
    s += `<rect x="${X(B.x0)}" y="${Z(B.z0)}" width="${L(w)}" height="${L(d)}" fill="none" stroke="#000" stroke-width="0.35" stroke-dasharray="3 1.5"/>`;
    const arrow = (x1, z1, x2, z2) => `<line x1="${X(x1)}" y1="${Z(z1)}" x2="${X(x2)}" y2="${Z(z2)}" stroke="#000" stroke-width="0.4" marker-end="url(#ra)"/>`;
    s = `<defs><marker id="ra" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L9 5L1 9z" fill="#000"/></marker></defs>` + s;
    const cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2, OB = { x0: B.x0 - OV, x1: B.x1 + OV, z0: B.z0 - OV, z1: B.z1 + OV };
    if (R.style === 'flat') {
      s += `<rect x="${X(B.x0 + 0.3)}" y="${Z(B.z0 + 0.3)}" width="${L(w - 0.6)}" height="${L(d - 0.6)}" fill="none" stroke="#000" stroke-width="0.4"/>` + arrow(cx, B.z0 + 0.6, cx, B.z1 - 0.6);
      s += cell(+X(cx) + 3, +Z(cz), 'Gentle fall (about 1 in 80) to the drain at the front edge', { size: 2.6 });
    } else if (R.style === 'mono') {
      for (let i = 1; i <= 4; i++) { const t = i / 5; s += R.alongX ? arrow(B.x0 + w * 0.15, B.z0 + d * t, B.x1 - w * 0.15, B.z0 + d * t) : arrow(B.x0 + w * t, B.z0 + d * 0.15, B.x0 + w * t, B.z1 - d * 0.15); }
      s += cell(+X(cx) - 10, +Z(B.z0) - 2, 'Single slope: arrows point down the slope', { size: 2.6 });
    } else {
      const inset = R.style === 'hip' ? R.span / 2 : 0;
      const r0 = R.alongX ? [B.x0 + inset, cz, B.x1 - inset, cz] : [cx, B.z0 + inset, cx, B.z1 - inset];
      s += `<line x1="${X(r0[0])}" y1="${Z(r0[1])}" x2="${X(r0[2])}" y2="${Z(r0[3])}" stroke="#000" stroke-width="1.1"/>` + cell(+X(r0[0]) + 2, +Z(r0[1]) - 2, 'RIDGE', { size: 2.6, bold: true });
      if (R.style === 'hip') [[B.x0, B.z0, r0[0], r0[1]], [B.x1, B.z0, r0[2], r0[1] === cz && R.alongX ? cz : r0[3]], [B.x0, B.z1, r0[0], R.alongX ? cz : r0[1]], [B.x1, B.z1, r0[2], R.alongX ? cz : r0[3]]].forEach(h => { s += `<line x1="${X(h[0])}" y1="${Z(h[1])}" x2="${X(h[2])}" y2="${Z(h[3])}" stroke="#000" stroke-width="0.6" stroke-dasharray="4 1.5"/>`; });
      for (let i = 1; i <= 3; i++) { const t = i / 4; if (R.alongX) { s += arrow(B.x0 + w * t, cz - 0.4, B.x0 + w * t, B.z0 + 0.5) + arrow(B.x0 + w * t, cz + 0.4, B.x0 + w * t, B.z1 - 0.5); } else { s += arrow(cx - 0.4, B.z0 + d * t, B.x0 + 0.5, B.z0 + d * t) + arrow(cx + 0.4, B.z0 + d * t, B.x1 - 0.5, B.z0 + d * t); } }
    }
    [[B.x0 - OV, B.z0 - OV], [B.x1 + OV, B.z0 - OV], [B.x0 - OV, B.z1 + OV], [B.x1 + OV, B.z1 + OV]].forEach((p, i) => { s += `<g transform="translate(${X(p[0])} ${Z(p[1])})"><circle r="1.6" fill="#fff" stroke="#000" stroke-width="0.5"/><text y="0.8" font-size="1.9" text-anchor="middle">DP</text></g>`; });
    s += cell(+X(B.x0 - OV), +Z(B.z0 - OV) - 3, 'Gutter around the edge, falling to the downpipes (DP) at the corners', { size: 2.5 });
    s += cell(340, 30, 'ROOF PLAN', { size: 4, bold: true });
    s += NOTE(['Shape: ' + R.style, R.style === 'flat' ? 'Parapet wall all round' : 'Pitch about ' + Math.round(Math.atan(ROOF_TAN[R.style]) * 180 / Math.PI) + ' degrees (assumed)', 'Overhang ' + OV + ' m all round (assumed)', 'Building: ' + f2(w) + ' x ' + f2(d) + ' m', 'Ridge height above top ceiling', 'about ' + f2(R.rise) + ' m'], 340, 38, 2.8);
    s += NOTE(['For hurricane areas ask the engineer about hip roofs,', 'roof straps and fixing details. Dashed lines are hips.', 'Downpipes should discharge away from the foundations.'], 340, 80, 2.5);
    s += cell(16, 226, 'INDICATIVE ONLY. Roof framing, fixings and drainage sizes are designed by the structural engineer.', { size: 2.6 });
    return s;
  });
}
function sheetSections(parts, meta, roofStyle) {
  const R = roofGeom(parts, roofStyle), gB = bboxOf(parts[0].geo.design.rooms), FH = 3.0, H = 2.7, SL = 0.3, FT = 0.6, nL = parts.length, ridgeTop = nL * FH + R.rise + 0.6;
  const cuts = [{ name: 'SECTION A-A  (cut through the middle, looking at the back)', axis: 'x', at: (gB.z0 + gB.z1) / 2 }, { name: 'SECTION B-B  (cut through the middle, looking right)', axis: 'z', at: (gB.x0 + gB.x1) / 2 }];
  const lenA = gB.x1 - gB.x0, lenB = gB.z1 - gB.z0, maxLen = Math.max(lenA, lenB) + 2;
  let den = [50, 75, 100, 150, 200, 250].find(v => maxLen * 1000 / v <= 330 && (ridgeTop + FT) * 1000 / v <= 92) || 250; const k = 1000 / den;
  return wide(parts, meta, SHEETS[15], () => {
    let s = '';
    cuts.forEach((cut, ci) => {
      const len = ci === 0 ? lenA : lenB, u0 = ci === 0 ? gB.x0 : gB.z0, gy = 118 + ci * 104 - 0 - (ci ? 0 : 6), gx = 30 + (330 - len * k) / 2;
      const gyv = ci === 0 ? 108 : 212 - 0; const base = ci === 0 ? 104 : 208;
      const U = u => f2(gx + (u - u0) * k), Y = y => f2(base - y * k);
      s += cell(14, base - (ridgeTop + FT) * k - 3 > 14 ? base - (ridgeTop) * k - 3 : 16 + ci * 104, cut.name + '   Scale 1:' + den + ' at A3', { size: 3, bold: true });
      parts.forEach((p, li) => {
        const y0 = li * FH;
        if (li > 0) s += `<rect x="${U(u0) - 0.5}" y="${Y(y0)}" width="${f2(len * k + 1)}" height="${f2(SL * k)}" fill="#bbb" stroke="#000" stroke-width="0.3"/>`;
        s += `<rect x="${U(u0)}" y="${Y(y0 + H)}" width="${f2(len * k)}" height="${f2(H * k)}" fill="none" stroke="#000" stroke-width="0.2" stroke-dasharray="1 1"/>`;
        p.geo.walls.forEach(w => {
          const vert = Math.abs(w.x1 - w.x2) < 1e-6, hor = Math.abs(w.z1 - w.z2) < 1e-6;
          const crosses = cut.axis === 'x' ? (vert && cut.at > Math.min(w.z1, w.z2) && cut.at < Math.max(w.z1, w.z2)) : (hor && cut.at > Math.min(w.x1, w.x2) && cut.at < Math.max(w.x1, w.x2));
          if (crosses) { const t = w.ext ? 0.2 : 0.1, pos = cut.axis === 'x' ? w.x1 : w.z1; s += `<rect x="${U(pos - t / 2)}" y="${Y(y0 + H)}" width="${f2(t * k)}" height="${f2(H * k)}" fill="#000"/>`; }
        });
        p.geo.design.rooms.forEach(r => { const a = cut.axis === 'x' ? [r.x, r.x + r.w, r.z, r.z + r.d] : [r.z, r.z + r.d, r.x, r.x + r.w]; if (cut.at > a[2] && cut.at < a[3]) s += `<text x="${U((a[0] + a[1]) / 2)}" y="${Y(y0 + H / 2)}" font-size="2.4" text-anchor="middle" fill="#555">${esc(r.label)}</text>`; });
        s += `<text x="${U(u0) - 3}" y="${+Y(y0) + 1}" font-size="2.2" text-anchor="end">+${f2(y0)}</text>`;
      });
      s += `<rect x="${U(u0) - 1}" y="${Y(0)}" width="${f2(len * k + 2)}" height="${f2(SL * k)}" fill="#bbb" stroke="#000" stroke-width="0.3"/>`;
      parts[0].geo.walls.forEach(w => { const vert = Math.abs(w.x1 - w.x2) < 1e-6, hor = Math.abs(w.z1 - w.z2) < 1e-6; const crosses = cut.axis === 'x' ? (vert && cut.at > Math.min(w.z1, w.z2) && cut.at < Math.max(w.z1, w.z2)) : (hor && cut.at > Math.min(w.x1, w.x2) && cut.at < Math.max(w.x1, w.x2)); if (crosses) { const pos = cut.axis === 'x' ? w.x1 : w.z1; s += `<rect x="${U(pos - 0.3)}" y="${+Y(0) + SL * k}" width="${f2(0.6 * k)}" height="${f2(FT * k)}" fill="#fff" stroke="#000" stroke-width="0.4" stroke-dasharray="1.5 1"/>`; } });
      s += `<line x1="${U(u0) - 6}" y1="${Y(0)}" x2="${+U(u0 + len) + 6}" y2="${Y(0)}" stroke="#000" stroke-width="0.9"/>`;
      const eaves = nL * FH - (FH - H), ov = 0.6, perp = (cut.axis === 'z') === R.alongX, ridgeAlong = R.alongX ? cut.axis === 'x' : cut.axis === 'z';
      const x0 = u0 - ov, x1 = u0 + len + ov, rr = R.rise;
      let pts;
      if (R.style === 'flat') pts = [[x0, eaves], [x1, eaves], [x1, eaves + 0.5], [x0, eaves + 0.5]];
      else if (R.style === 'mono') pts = ridgeAlong ? [[x0, eaves], [x1, eaves], [x1, eaves + rr * 0.5], [x0, eaves + rr * 0.5]] : [[x0, eaves], [x1, eaves], [x1, eaves + rr], [x0, eaves]];
      else if (perp) pts = R.style === 'hip' ? [[x0, eaves], [x1, eaves], [u0 + len * 0.7, eaves + rr], [u0 + len * 0.3, eaves + rr]] : [[x0, eaves], [x1, eaves], [u0 + len / 2, eaves + rr]];
      else pts = R.style === 'hip' ? [[x0, eaves], [x1, eaves], [u0 + len - R.span / 2, eaves + rr], [u0 + R.span / 2, eaves + rr]] : [[x0, eaves], [x1, eaves], [x1, eaves + rr * 0.92], [x0, eaves + rr * 0.92]];
      s += `<polygon points="${pts.map(p => U(p[0]) + ',' + Y(p[1])).join(' ')}" fill="#ddd" stroke="#000" stroke-width="0.5"/>`;
      s += `<text x="${+U(u0 + len) + 8}" y="${Y(eaves + rr)}" font-size="2.3">Ridge about +${f2(eaves + rr)}</text><text x="${+U(u0 + len) + 8}" y="${+Y(0) + 6}" font-size="2.3">Footing about -${FT}</text>`;
    });
    s += NOTE(['Walls 2.7 m clear, floor to floor 3.0 m, slabs 0.3 m (assumed).', 'Footings drawn dashed: the engineer sets their depth and size after the soil is checked.'], 14, 226, 2.5);
    return s;
  });
}
function sheetOpenings(parts, meta, finishes) {
  const F = finishes || {}, m = (o) => o ? [o.material, o.colour].filter(Boolean).join(', ') : 'not chosen';
  return wide(parts, meta, SHEETS[16], () => {
    const doors = [], wins = [];
    parts.forEach((p, li) => {
      const fl = ['Ground', 'First', 'Second'][li], rs = p.geo.design.rooms, nm = (i) => i >= 0 && rs[i] ? rs[i].label : 'Outside';
      p.geo.doors.forEach(d => doors.push([(li ? fl[0] : '') + d.id, fl, nm(d.rooms[0]) + ' / ' + nm(d.rooms[1]), d.front ? 'Front door' : d.garage ? 'Garage door (rolling)' : d.back ? 'Back door' : d.ext ? 'External door' : 'Internal door', Math.round(d.w * 1000) + ' x ' + Math.round((d.hgt || 2.1) * 1000), d.front ? m(F.frontDoor) : d.garage ? 'Metal' : d.ext ? 'To match front door' : 'Flush timber, painted']));
      p.geo.windows.forEach(w => wins.push([(li ? fl[0] : '') + w.id, fl, nm(w.rooms[0]), 'Window', Math.round(w.w * 1000) + ' x ' + Math.round((w.head - w.sill) * 1000), 'Sill ' + f2(w.sill) + ', head ' + f2(w.head) + '. ' + m(F.windows)]));
    });
    let s = cell(16, 20, 'DOOR SCHEDULE', { size: 4, bold: true }) + table(16, 28, ['Mark', 'Floor', 'Between', 'Type', 'W x H mm', 'Material / finish'], doors, [14, 16, 56, 38, 26, 56], 22).s;
    s += cell(16, 126, 'WINDOW SCHEDULE', { size: 4, bold: true }) + table(16, 134, ['Mark', 'Floor', 'Room', 'Type', 'W x H mm', 'Heights and finish'], wins, [14, 16, 56, 38, 26, 70], 18).s;
    s += cell(235, 20, 'HARDWARE AND NOTES', { size: 4, bold: true });
    s += NOTE(['Doors: three hinges, lock set to suit use (bathroom: privacy', 'latch; front door: deadbolt + keyed lock).', 'Windows: security grilles and hurricane shutters or', 'impact glass are an option. Ask your architect.', 'Frames: aluminium or timber to match the finish chosen.', 'All sizes are nominal and must be checked on site.'], 235, 28, 2.7);
    s += cell(16, 226, 'Sizes come from the client design. The supplier or contractor confirms real sizes, hardware and glass before ordering.', { size: 2.6 });
    return s;
  });
}
function sheetDetails(parts, meta) {
  const hasStairs = parts.some(p => p.geo.design.rooms.some(r => r.type === 'stairs'));
  return wide(parts, meta, SHEETS[17], () => {
    const k = 40; let s = '';
    const box = (x, y, w, h, t) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#000" stroke-width="0.4"/>` + cell(x + 3, y + 6, t, { size: 3.2, bold: true });
    s += box(14, 16, 195, 100, '1. TOILET CLEARANCES (plan)');
    s += `<rect x="30" y="34" width="60" height="4" fill="#000"/><rect x="48" y="40" width="24" height="30" rx="8" fill="#fff" stroke="#000" stroke-width="0.6"/>` + `<line x1="60" y1="34" x2="60" y2="72" stroke="#000" stroke-width="0.2" stroke-dasharray="2 1"/>` + `<rect x="30" y="74" width="60" height="30" fill="none" stroke="#000" stroke-width="0.3" stroke-dasharray="2 1.5"/>`;
    s += cell(96, 50, 'Centre line 400 mm from the side wall', { size: 2.6 }) + cell(96, 58, 'Clear space in front: 600 mm minimum', { size: 2.6 }) + cell(96, 66, '(750 mm is more comfortable)', { size: 2.6 }) + cell(96, 82, 'Door must not swing into the clear space.', { size: 2.6 }) + cell(96, 90, 'Floor slopes gently to the drain in a shower.', { size: 2.6 });
    s += box(215, 16, 191, 100, '2. KITCHEN COUNTER (section)');
    s += `<rect x="235" y="60" width="38" height="36" fill="none" stroke="#000" stroke-width="0.5"/><rect x="233" y="56" width="42" height="4" fill="#000"/><rect x="235" y="28" width="16" height="24" fill="none" stroke="#000" stroke-width="0.5"/>`;
    s += cell(282, 60, 'Counter height 900 mm, depth 600 mm', { size: 2.6 }) + cell(282, 40, 'Upper cabinets from 1450 mm (about 450 mm', { size: 2.6 }) + cell(282, 45, 'above the counter), depth 350 mm', { size: 2.6 }) + cell(282, 78, 'Walkway between counters: 1000 mm minimum.', { size: 2.6 }) + cell(282, 86, 'Keep sink, cooker and fridge close together.', { size: 2.6 });
    s += box(14, 122, 195, 100, '3. STAIR (section)' + (hasStairs ? '' : ' - only if you add stairs'));
    s += `<polyline points="30,205 50,205 50,195 70,195 70,185 90,185 90,175 110,175 110,165 130,165 130,155" fill="none" stroke="#000" stroke-width="0.7"/><line x1="30" y1="205" x2="130" y2="155" stroke="#000" stroke-width="0.2" stroke-dasharray="2 1"/>`;
    s += cell(140, 160, 'Rise (each step up): about 175 mm', { size: 2.6 }) + cell(140, 168, 'Going (tread depth): about 250 mm', { size: 2.6 }) + cell(140, 176, 'Headroom: 2000 mm minimum', { size: 2.6 }) + cell(140, 184, 'Handrail at about 900 mm, both sides if wide', { size: 2.6 }) + cell(140, 192, 'Keep every step the same size.', { size: 2.6 });
    s += box(215, 122, 191, 100, '4. WINDOW AND DOOR HEIGHTS (elevation)');
    s += `<rect x="240" y="150" width="40" height="34" fill="#fff" stroke="#000" stroke-width="0.6"/><rect x="310" y="144" width="26" height="46" fill="#fff" stroke="#000" stroke-width="0.6"/><line x1="225" y1="190" x2="360" y2="190" stroke="#000" stroke-width="0.8"/>`;
    s += cell(240, 198, 'Window sill about 900 mm', { size: 2.6 }) + cell(240, 203, '(1500 mm in bathrooms)', { size: 2.6 }) + cell(310, 198, 'Door 900 x 2100 mm', { size: 2.6 }) + cell(240, 212, 'Window head and door head line up at about 2100 mm.', { size: 2.6 });
    s += cell(16, 228, 'TYPICAL DIMENSIONS. Check local building rules and the manufacturer\'s sizes. The architect draws the real details for your project.', { size: 2.6 });
    return s;
  });
}
function sheetDrainage(parts, meta, extra) {
  const P = parts[0].geo.design.plot || { w: 16, d: 20 }, rs = parts[0].geo.design.rooms, B = bboxOf(rs), k = Math.min(300 / P.w, 175 / P.d), ox = 40, oz = 30;
  const X = x => f2(ox + x * k), Z = z => f2(oz + z * k), L = v => f2(v * k), tank = extra && extra.exterior && /yes|true/i.test(String(extra.exterior.tank));
  return wide(parts, meta, SHEETS[18], () => {
    let s = `<defs><marker id="da" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L9 5L1 9z" fill="#000"/></marker></defs><rect x="${X(0)}" y="${Z(0)}" width="${L(P.w)}" height="${L(P.d)}" fill="#f4f4f4" stroke="#000" stroke-width="0.8"/>`;
    s += rs.map(r => `<rect x="${X(r.x)}" y="${Z(r.z)}" width="${L(r.w)}" height="${L(r.d)}" fill="#fff" stroke="#000" stroke-width="0.5"/>`).join('');
    [[B.x0, B.z0], [B.x1, B.z0], [B.x0, B.z1], [B.x1, B.z1]].forEach(p => { s += `<g transform="translate(${X(p[0])} ${Z(p[1])})"><circle r="1.5" fill="#fff" stroke="#000" stroke-width="0.5"/><text y="0.7" font-size="1.8" text-anchor="middle">DP</text></g>`; });
    s += `<line x1="${X(B.x0 - 0.8)}" y1="${Z(B.z1 + 0.9)}" x2="${X(B.x1 + 0.8)}" y2="${Z(B.z1 + 0.9)}" stroke="#000" stroke-width="0.9" stroke-dasharray="5 1.5"/>` + cell(+X(B.x0), +Z(B.z1 + 0.9) - 1.5, 'Surface drain (channel) along the front, falling to the street drain', { size: 2.5 });
    for (let i = 1; i <= 4; i++) s += `<line x1="${X(P.w * i / 5)}" y1="${Z(Math.max(B.z1 + 1.4, P.d - 3))}" x2="${X(P.w * i / 5)}" y2="${Z(P.d - 0.4)}" stroke="#000" stroke-width="0.5" marker-end="url(#da)"/>`;
    const sx = P.w - 3.2, sz = Math.max(0.8, B.z0 / 2 - 0.6); s += `<rect x="${X(sx)}" y="${Z(sz)}" width="${L(2.4)}" height="${L(1.2)}" fill="#fff" stroke="#000" stroke-width="0.6"/>` + cell(+X(sx) + 1, +Z(sz) + L(0.75), 'SEPTIC TANK', { size: 2.3, bold: true });
    s += `<circle cx="${X(sx - 3.5)}" cy="${Z(sz + 0.6)}" r="${L(1.1)}" fill="none" stroke="#000" stroke-width="0.6" stroke-dasharray="2 1"/>` + cell(+X(sx - 5.6), +Z(sz + 0.6) - L(1.3), 'SOAKAWAY', { size: 2.3, bold: true }) + `<line x1="${X(sx)}" y1="${Z(sz + 0.6)}" x2="${X(sx - 2.4)}" y2="${Z(sz + 0.6)}" stroke="#000" stroke-width="0.5"/>` + `<line x1="${X((B.x0 + B.x1) / 2)}" y1="${Z(B.z0)}" x2="${X(sx + 1.2)}" y2="${Z(sz + 1.2)}" stroke="#000" stroke-width="0.5" stroke-dasharray="3 1.5"/>`;
    if (tank) s += `<circle cx="${X(0.9)}" cy="${Z(Math.max(B.z0 / 2, 1.2))}" r="${L(0.7)}" fill="#fff" stroke="#000" stroke-width="0.6"/>` + cell(+X(0.9) + L(0.9), +Z(Math.max(B.z0 / 2, 1.2)), 'WATER TANK', { size: 2.3, bold: true });
    s += `<text x="${X(P.w / 2)}" y="${+Z(P.d) + 7}" font-size="3.2" text-anchor="middle">STREET / ROAD</text>`;
    s += cell(345, 40, 'STORMWATER AND SITE DRAINAGE', { size: 3.4, bold: true });
    s += legend([{ sym: '<circle cx="6" cy="0" r="2" fill="#fff" stroke="#000" stroke-width="0.5"/>', text: 'Roof downpipe (DP)' }, { sym: lineSym('5 1.5', 0.9), text: 'Surface channel' }, { sym: '<path d="M0 0H10" stroke="#000" stroke-width="0.5" marker-end="url(#da)"/>', text: 'Ground falls this way' }, { sym: '<rect x="1" y="-2" width="9" height="4" fill="#fff" stroke="#000" stroke-width="0.6"/>', text: 'Septic tank (assumed)' }, { sym: '<circle cx="6" cy="0" r="2.4" fill="none" stroke="#000" stroke-width="0.6" stroke-dasharray="2 1"/>', text: 'Soakaway pit (assumed)' }], 345, 52);
    s += NOTE(['Water must run away from the house on every side.', 'Septic tank and soakaway positions are assumed;', 'the surveyor, plumber and health authority', 'decide the real place, size and distances.', 'Where there is a public sewer, connect to it instead.'], 345, 98, 2.6);
    s += cell(16, 226, 'INDICATIVE ONLY. Ground levels, drains and the sewage system must be designed by licensed professionals and approved locally.', { size: 2.6 });
    return s;
  }, { noScale: true });
}
function sheetRisers(parts, meta) {
  const n = parts.length, FHm = 22;
  return wide(parts, meta, SHEETS[19], () => {
    let s = cell(16, 20, 'RISER DIAGRAMS (how services go up through the floors)', { size: 4, bold: true });
    const cols = [['COLD WATER', 40], ['DRAIN AND VENT', 120], ['POWER', 200], ['AC PIPES', 280]], top = 36, bot = top + (n + 1) * FHm;
    for (let i = 0; i <= n; i++) { const y = bot - i * FHm; s += `<line x1="20" y1="${y}" x2="330" y2="${y}" stroke="#000" stroke-width="${i === 0 ? 0.9 : 0.4}"/>`; if (i < n) s += cell(22, y - FHm / 2, ['Ground floor', 'First floor', 'Second floor'][i], { size: 2.8 }); }
    cols.forEach(([t, x], ci) => {
      s += cell(x - 8, top - 5, t, { size: 3, bold: true }) + `<line x1="${x}" y1="${bot + 4}" x2="${x}" y2="${top + 4}" stroke="#000" stroke-width="${ci === 1 ? 1.4 : 0.8}" ${ci === 3 ? 'stroke-dasharray="4 1.5"' : ''}/>`;
      for (let i = 0; i < n; i++) { const y = bot - i * FHm - FHm / 2; s += `<circle cx="${x}" cy="${y}" r="2" fill="#fff" stroke="#000" stroke-width="0.5"/><line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#000" stroke-width="0.4"/>` + cell(x + 24, y + 1, ['to fixtures', 'from toilets, basins', 'to circuits', 'to rooms'][ci], { size: 2.4 }); }
    });
    s += cell(40, bot + 12, 'Tank / pump', { size: 2.5 }) + cell(120, bot + 12, 'to septic tank or sewer', { size: 2.5 }) + cell(200, bot + 12, 'from the main board', { size: 2.5 }) + cell(280, bot + 12, 'outdoor units', { size: 2.5 });
    s += NOTE(['Keep bathrooms and the kitchen stacked above each other so one drain riser serves them.', 'Riser positions are set by the plumber, electrician and AC supplier. This is a diagram, not a drawing to scale.'], 16, 226, 2.6);
    return s;
  });
}
function buildExtraSheets(parts, meta, roofStyle, finishes, extra, indexRows) {
  const out = [];
  try { out.push(['A-102', 'roof-plan', sheetRoof(parts, meta, roofStyle)]); } catch (e) { console.error('roof sheet', e); }
  try { out.push(['A-401', 'sections', sheetSections(parts, meta, roofStyle)]); } catch (e) { console.error('sections sheet', e); }
  try { out.push(['A-501', 'door-and-window-schedule', sheetOpenings(parts, meta, finishes)]); } catch (e) { console.error('openings sheet', e); }
  try { out.push(['A-601', 'typical-details', sheetDetails(parts, meta)]); } catch (e) { console.error('details sheet', e); }
  try { out.push(['C-102', 'stormwater-and-septic', sheetDrainage(parts, meta, extra)]); } catch (e) { console.error('drainage sheet', e); }
  if (parts.length > 1) try { out.push(['R-101', 'riser-diagrams', sheetRisers(parts, meta)]); } catch (e) { console.error('riser sheet', e); }
  const index = indexRows.concat(out.map(o => [o[0], (SHEETS.find(s => s.no === o[0]) || {}).title || o[1], 'Whole building'])); index.sort((a, b) => a[0].localeCompare(b[0]));
  try { out.unshift(['G-001', 'title-sheet-and-index', sheetTitle(parts, meta, index, finishes, { roofStyle })]); } catch (e) { console.error('title sheet', e); }
  return out;
}

module.exports = { buildExtraSheets, buildSheets, buildDXF, buildSheetsHtml, SHEETS, buildElevationSheet, buildElevationDXF };
