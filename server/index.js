'use strict';
/* ConstructReality Studio server: serves the VR app and builds the plans. Start with: npm start */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { analyzeGeometry, packLevels } = require('./model');
const { buildMEP, schedules } = require('./mep');
const { buildSheets, buildDXF, buildSheetsHtml, SHEETS, buildElevationSheet, buildElevationDXF, buildExtraSheets } = require('./drawings');
const ai = require('./ai');

const PORT = process.env.PORT || 3000;
const STAFF_PIN = process.env.STAFF_PIN || '2468';
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA, 'projects'), { recursive: true });
if (STAFF_PIN === '2468' || ADMIN_KEY === 'change-me') console.warn('WARNING: set STAFF_PIN and ADMIN_KEY environment variables before real use.');

const app = express(); app.set('trust proxy', 1);
const jsonSmall = express.json({ limit: '300kb' }), jsonBig = express.json({ limit: '5mb' });
app.use((req, res, next) => (req.path.startsWith('/api/team/files/') || /\/renders$/.test(req.path) ? jsonBig : jsonSmall)(req, res, next));
app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });

/* tiny rate limiter */
const hits = new Map();
const limit = (n, ms) => (req, res, next) => {
  const k = req.ip + req.path; const now = Date.now(); const a = (hits.get(k) || []).filter(t => now - t < ms);
  if (a.length >= n) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  a.push(now); hits.set(k, a); next();
};
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const needAdmin = (req, res, next) => { const k = req.get('x-admin-key') || req.query.key || ''; if (!same(k, ADMIN_KEY)) return res.status(401).json({ error: 'Staff key needed.' }); next(); };

/* ---------- sessions (in memory; a session is one client wearing the headset) ---------- */
const sessions = new Map();
const newCode = () => { let c; do { c = String(Math.floor(1000 + Math.random() * 9000)); } while (sessions.has(c)); return c; };
app.post('/api/session', limit(30, 60000), (req, res) => {
  const id = newCode(); sessions.set(id, { id, created: Date.now(), updated: Date.now(), client: '', design: null, notes: [], project: null });
  for (const [k, s] of sessions) if (Date.now() - s.updated > 12 * 3600 * 1000) sessions.delete(k);
  res.json({ id });
});
app.post('/api/session/:id/draft', limit(120, 60000), (req, res) => {
  const s = sessions.get(req.params.id); if (!s) return res.status(404).json({ error: 'Unknown session' });
  s.design = analyzeGeometry(req.body.design).design; s.updated = Date.now(); res.json({ ok: true });
});
app.get('/api/session/:id/notes', limit(120, 60000), (req, res) => {
  const s = sessions.get(req.params.id); if (!s) return res.status(404).json({ error: 'Unknown session' });
  const since = parseInt(req.query.since) || 0; res.json({ notes: s.notes.slice(since), total: s.notes.length });
});

/* ---------- live analysis for the headset ---------- */
function fullAnalysis(design, opts) {
  const geo = analyzeGeometry(design, opts);
  const mep = buildMEP(geo);
  const sch = schedules(geo, mep);
  return { geo, mep, sch };
}
app.post('/api/analyze', limit(240, 60000), (req, res) => {
  const lv = Math.max(0, Math.min(2, parseInt(req.body.level) || 0)), st = Math.max(1, Math.min(3, parseInt(req.body.storeys) || 1));
  const { geo, mep, sch } = fullAnalysis(req.body.design, { level: lv, storeys: st });
  res.json({ design: geo.design, issues: geo.issues, notes: mep.notes, walls: geo.walls, doors: geo.doors, windows: geo.windows, fixtures: geo.fixtures,
    mep: { lights: mep.lights, switches: mep.switches, outlets: mep.outlets, acs: mep.acs, db: mep.db, pipes: mep.pipes, plumbing: mep.plumbing, dedicated: mep.dedicated, vents: mep.vents || [] }, summary: sch });
});

/* a first draft with several floors (the single-floor draft below can use the AI) */
app.post('/api/draft', limit(20, 60000), (req, res) => {
  const b = req.body || {};
  const out = packLevels({ bedrooms: b.bedrooms, bathrooms: b.bathrooms, dining: !!b.dining, laundry: !!b.laundry, office: !!b.office, garage: !!b.garage, storeys: b.storeys }, b.plot);
  res.json({ ...out, source: 'template', explanation: out.levels.length > 1 ? 'Living areas are on the ground floor and bedrooms upstairs. The staircase sits in the same place on every floor. Move or resize anything.' : 'Here is a starting layout built from your answers.' });
});

/* ---------- AI ---------- */
app.post('/api/ai/suggest', limit(10, 60000), async (req, res) => {
  const b = req.body || {};
  const out = await ai.suggest({ bedrooms: b.bedrooms, bathrooms: b.bathrooms, dining: !!b.dining, laundry: !!b.laundry, office: !!b.office, budget: String(b.budget || 'standard').slice(0, 20), notes: b.notes, plot: b.plot });
  res.json(out);
});
app.post('/api/ai/item', limit(20, 60000), async (req, res) => { const b = req.body || {}; res.json(await ai.designItem(b.prompt, b.templates)); });
app.post('/api/ai/ask', limit(15, 60000), async (req, res) => {
  const b = req.body || {}; const g = analyzeGeometry(b.design);
  res.json(await ai.ask(b.question, g.design, g.issues, String(b.chip || '')));
});

/* ---------- staff ---------- */
app.post('/api/staff/verify', limit(10, 60000), (req, res) => { res.json({ ok: same(String(req.body.pin || ''), STAFF_PIN) }); });
app.get('/api/admin/sessions', needAdmin, (req, res) => {
  res.json({ sessions: [...sessions.values()].sort((a, b) => b.updated - a.updated).map(s => ({ id: s.id, client: s.client, updated: s.updated, rooms: s.design ? s.design.rooms.length : 0, sent: !!s.project })) });
});
app.post('/api/admin/sessions/:id', needAdmin, (req, res) => {
  const s = sessions.get(req.params.id); if (!s) return res.status(404).json({ error: 'Unknown session' });
  if (typeof req.body.client === 'string') s.client = req.body.client.slice(0, 80);
  if (typeof req.body.note === 'string' && req.body.note.trim()) s.notes.push({ t: Date.now(), text: req.body.note.trim().slice(0, 240) });
  res.json({ ok: true });
});
app.get('/api/admin/sessions/:id/plan.svg', needAdmin, (req, res) => {
  const s = sessions.get(req.params.id); if (!s || !s.design) return res.status(404).send('No design yet');
  const { geo, mep, sch } = fullAnalysis(s.design);
  res.type('image/svg+xml').send(buildSheets(geo, mep, sch, { project: 'Live preview', client: s.client, ref: 'Session ' + s.id })[0]);
});

/* ---------- save a finished design and generate the package ---------- */
/* keep only plain strings from the finishes list the headset sends (it is shown to the architect) */
function cleanFinishes(f) {
  const s = (v) => String(v == null ? '' : v).replace(/[^\w #.,&/()+-]/g, '').slice(0, 60);
  const one = (o) => o ? { material: s(o.material), colour: s(o.colour) } : null;
  if (!f || typeof f !== 'object') return null;
  const out = { rooms: (Array.isArray(f.rooms) ? f.rooms : []).slice(0, 30).map(r => ({ room: s(r.room), level: Math.max(0, Math.min(2, parseInt(r.level) || 0)), floor: one(r.floor), walls: one(r.walls) })) };
  ['outsideWalls', 'ceilings', 'counters', 'roof', 'frontDoor', 'windows', 'fence'].forEach(k => { out[k] = one(f[k]); });
  return out;
}
/* clean the furniture list the headset sends (it is drawn on the floor plans) */
function cleanFurniture(list) {
  const n = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  return (Array.isArray(list) ? list : []).slice(0, 400).map(it => ({ level: n(it.level, 0, 2) | 0, name: String(it.name || '').replace(/[^\w #.,&/()+-]/g, '').slice(0, 40), x: n(it.x, -5, 60), z: n(it.z, -5, 60), w: n(it.w, 0.05, 8), d: n(it.d, 0.05, 8), rot: n(it.rot, -360, 360), h: n(it.h, 0, 6), store: String(it.store || '').replace(/[^\w .&'-]/g, '').slice(0, 40), link: /^https?:\/\/[^\s<>"']{4,200}$/.test(String(it.link || '')) ? String(it.link) : '', price: n(it.price, 0, 100000000) }));
}
function cleanExterior(x) {
  const s = (v) => String(v == null ? '' : v).replace(/[^\w #.,&/()+-]/g, '').slice(0, 60);
  if (!x || typeof x !== 'object') return null; const out = {};
  Object.keys(x).slice(0, 40).forEach(k => { const v = x[k]; out[s(k)] = (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).slice(0, 8).map(([a, b]) => [s(a), s(b)])) : s(v); });
  return out;
}
const LEVEL_NAMES = ['Ground floor', 'First floor', 'Second floor'];
function writeProject(id, design, meta, finishes, extra) {
  extra = extra || {};
  const levels = Array.isArray(design && design.levels) && design.levels.length ? design.levels.slice(0, 3) : [{ rooms: design && design.rooms }];
  const plot = design && design.plot, storeys = levels.length;
  const dir = path.join(DATA, 'projects', id); fs.mkdirSync(dir, { recursive: true });
  const allSheets = [], parts = [];
  levels.forEach((lv, li) => {
    const { geo, mep, sch } = fullAnalysis({ plot, rooms: lv.rooms }, { level: li, storeys });
    if (finishes) sch.finishes = finishes;
    const sub = storeys > 1 ? path.join(dir, 'level-' + (li + 1)) : dir; fs.mkdirSync(sub, { recursive: true });
    const lm = { ...meta, levelName: storeys > 1 ? LEVEL_NAMES[li] : '', levelIdx: li, furniture: (extra.furniture || []).filter(f => f.level === li) };
    const sheets = buildSheets(geo, mep, sch, lm); allSheets.push(...sheets.filter(Boolean));
    sheets.forEach((sv, i) => sv && fs.writeFileSync(path.join(sub, `${SHEETS[i].no}-${SHEETS[i].title.toLowerCase().replace(/[^a-z]+/g, '-')}.svg`), sv));
    fs.writeFileSync(path.join(sub, 'plans.dxf'), buildDXF(geo, mep, 'all', li));
    { const cad = path.join(sub, 'cad'); fs.mkdirSync(cad, { recursive: true });
      [['architectural', 'architect'], ['electrical', 'electrical'], ['plumbing', 'plumbing'], ['site-and-structure', 'site']].forEach(([n, part]) => { if (part === 'site' && li !== 0) return; fs.writeFileSync(path.join(cad, n + '.dxf'), buildDXF(geo, mep, part, li)); }); }
    fs.writeFileSync(path.join(sub, 'schedules.json'), JSON.stringify(sch, null, 2));
    parts.push({ geo, sch });
  });
  { /* elevations cover the whole building, so they sit at the top of the project folder */
    const roofStyle = extra.exterior && extra.exterior.roof && extra.exterior.roof.style;
    try {
      const ev = buildElevationSheet(parts, meta, roofStyle, finishes), ed = buildElevationDXF(parts, roofStyle);
      if (ev) { fs.writeFileSync(path.join(dir, 'A-301-elevations.svg'), ev); allSheets.push(ev); }
      if (ed) { fs.mkdirSync(path.join(dir, 'cad'), { recursive: true }); fs.writeFileSync(path.join(dir, 'cad', 'elevations.dxf'), ed); }
    } catch (e) { console.error('elevations failed', e); }
  }
  { /* the rest of the drawing set: title sheet, roof plan, sections, schedules, details, drainage, risers (and per-floor AC, fire and beam sheets above) */
    try {
      const roofStyle = extra.exterior && extra.exterior.roof && extra.exterior.roof.style;
      const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12].map(i => [SHEETS[i].no, SHEETS[i].title, i === 8 ? 'Ground level' : 'Each floor']); rows.push(['A-301', 'Elevations', 'Whole building']);
      const extras = buildExtraSheets(parts, meta, roofStyle, finishes, extra, rows);
      extras.forEach(([no, slug, svg]) => { if (!svg) return; fs.writeFileSync(path.join(dir, no + '-' + slug + '.svg'), svg); if (no === 'G-001') allSheets.unshift(svg); else allSheets.push(svg); });
    } catch (e) { console.error('extra sheets failed', e); }
  }
  fs.writeFileSync(path.join(dir, 'all-sheets-print.html'), buildSheetsHtml(allSheets, meta));
  const issues = parts.flatMap((p, i) => p.geo.issues.map(x => ({ ...x, floor: LEVEL_NAMES[i] })));
  fs.writeFileSync(path.join(dir, 'design.json'), JSON.stringify({ meta, storeys, plot: parts[0].geo.design.plot, levels: parts.map(p => ({ rooms: p.geo.design.rooms })), issues, finishes: finishes || null, exterior: extra.exterior || null }, null, 2));
  if (finishes) fs.writeFileSync(path.join(dir, 'finishes.json'), JSON.stringify(finishes, null, 2));
  if (extra.furniture) fs.writeFileSync(path.join(dir, 'furniture.json'), JSON.stringify(extra.furniture, null, 2));
  if (extra.exterior) fs.writeFileSync(path.join(dir, 'exterior-and-finishes.json'), JSON.stringify(extra.exterior, null, 2));
  return { geo: { issues }, sch: { floorArea: Math.round(parts.reduce((a, p) => a + (p.sch.floorArea || 0), 0) * 100) / 100 } };
}
app.get('/api/version', (req, res) => res.json({ build: '2026-11-08a' }));
app.post('/api/projects', limit(10, 60000), (req, res) => {
  const s = sessions.get(String(req.body.sessionId || ''));
  const id = 'CR-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
  const typed = String(req.body.clientName || '').replace(/[^A-Za-z\u00C0-\u024F .'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const ct = req.body.contact || {}, contact = { email: String(ct.email || '').replace(/[^A-Za-z0-9@._+-]/g, '').slice(0, 100), phone: String(ct.phone || '').replace(/[^0-9+() -]/g, '').slice(0, 30), address: String(ct.address || '').replace(/[<>]/g, '').slice(0, 120), notes: String(ct.notes || '').replace(/[<>]/g, '').slice(0, 400) };
  const meta = { ref: id, contact, client: typed || (s ? s.client : ''), project: 'Client home design', date: new Date().toISOString(), session: s ? s.id : '' };
  const { geo, sch } = writeProject(id, req.body.design, meta, cleanFinishes(req.body.finishes), { furniture: cleanFurniture(req.body.furniture), exterior: cleanExterior(req.body.exterior) });
  let rolled = null; if (s) { s.prevProject = s.project; s.project = id; rolled = s; }
  const ua = String(req.headers['user-agent'] || '');
  const device = /OculusBrowser|Quest/i.test(ua) ? 'Meta Quest headset' : /Mobile|Android|iPhone/i.test(ua) ? 'Phone' : 'Computer';
  const source = { device, via: req.body.via === 'vr' ? 'Inside VR (headset on)' : req.body.via === 'screen' ? 'On a flat screen' : 'Unknown', host: String(req.headers.host || '').slice(0, 80), build: String(req.body.build || '').slice(0, 20), at: new Date().toISOString() };
  const nr = team.onNewProject(id, rolled, contact, source);
  const errors = geo.issues.filter(i => i.level === 'error');
  res.json({ ref: id, fileCount: listFiles(path.join(DATA, 'projects', id), '').length, claim: nr.code, warnings: geo.issues, hasErrors: errors.length > 0, floorArea: sch.floorArea });
});
app.post('/api/projects/:ref/renders', limit(40, 60000), (req, res) => {
  const ref = String(req.params.ref); if (!/^CR-[0-9A-Z-]+$/.test(ref)) return res.status(400).json({ error: 'Bad reference' });
  const s = sessions.get(String(req.body.sessionId || '')); if (!s || (s.project !== ref && s.prevProject !== ref)) return res.status(403).json({ error: 'This session did not send that project.' });
  const imgs = Array.isArray(req.body.images) ? req.body.images.slice(0, 6) : []; const dir = path.join(DATA, 'projects', ref, 'renders'); fs.mkdirSync(dir, { recursive: true });
  let saved = 0;
  for (const im of imgs) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(im && im.data || '')); if (!m) continue;
    const buf = Buffer.from(m[1], 'base64'); if (buf.length > 900 * 1024 || buf.length < 500 || buf[0] !== 0xff || buf[1] !== 0xd8) continue;
    const idx = String(Math.max(0, Math.min(99, parseInt(im.n, 10) || 0))).padStart(2, '0'), label = String(im.name || 'view').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'view';
    if (fs.readdirSync(dir).length >= 40) break;
    fs.writeFileSync(path.join(dir, idx + '-' + label + '.jpg'), buf); saved++;
  }
  res.json({ ok: true, saved });
});
const team = require('./team')(app, { express, DATA, ADMIN_KEY, limit, same });
const listFiles = (dir, pre) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listFiles(path.join(dir, e.name), pre + e.name + '__') : [pre + e.name]);
app.get('/api/admin/projects', needAdmin, (req, res) => {
  const base = path.join(DATA, 'projects');
  const list = fs.readdirSync(base).filter(d => fs.existsSync(path.join(base, d, 'design.json'))).map(d => {
    const j = JSON.parse(fs.readFileSync(path.join(base, d, 'design.json'), 'utf8'));
    return { ref: d, client: j.meta.client, date: j.meta.date, rooms: j.levels ? j.levels.reduce((a, l) => a + l.rooms.length, 0) : j.design.rooms.length, files: listFiles(path.join(base, d), '') };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  res.json({ projects: list });
});
app.get('/api/admin/projects/:ref/:file', needAdmin, (req, res) => {
  if (!/^CR-[0-9A-Z-]+$/.test(req.params.ref) || !/^[A-Za-z0-9._-]+$/.test(req.params.file)) return res.status(400).end();
  const segs = req.params.file.split('__'); if (segs.length > 2 || segs.some(x => !x || x === '.' || x === '..' || !/^[A-Za-z0-9.-]+$/.test(x))) return res.status(400).end();
  const p = path.join(DATA, 'projects', req.params.ref, ...segs);
  if (!fs.existsSync(p)) return res.status(404).end();
  if (req.params.file.endsWith('.dxf')) res.type('application/dxf');
  res.sendFile(p);
});

app.get(['/team', '/team/'], (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'team.html')));
// no-cache = the browser must check for a newer file every time (cheap, uses ETag), so the headset never runs an old copy of the app
app.use(express.static(path.join(__dirname, '..', 'public'), { index: 'index.html', setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));
if (require.main === module) app.listen(PORT, () => console.log(`ConstructReality Studio running on http://localhost:${PORT}`));
module.exports = { app, fullAnalysis, writeProject };
