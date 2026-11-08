'use strict';
/* ConstructReality Studio - team workspace and client portal.
   Every finished design becomes a project with a workflow: Architect -> Land surveyor + Engineer -> Contractor -> Supplier.
   Each project has a client (who registers on the portal), a project manager (assigned by the owner), and an assigned person for each trade.
   Each trade submits its work for REVIEW; the project manager (or owner) approves it. Everything is stored as JSON next to the drawings. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const makeAccounts = require('./accounts');

const ROLES = {
  manager:    { name: 'Owner' },
  pm:         { name: 'Project manager' },
  architect:  { name: 'Architect' },
  surveyor:   { name: 'Land surveyor' },
  engineer:   { name: 'Engineer' },
  contractor: { name: 'Contractor' },
  supplier:   { name: 'Supplier' },
  client:     { name: 'Client' }
};
const NEEDS = { architect: [], surveyor: ['architect'], engineer: ['architect'], contractor: ['surveyor', 'engineer'], supplier: ['contractor'] };
const TRADES = ['architect', 'surveyor', 'engineer', 'contractor', 'supplier'];
const STATUS = { waiting: 'Not started', new: 'Ready to start', working: 'In progress', question: 'Needs an answer', review: 'Waiting review', changes: 'Sent back for changes', done: 'Complete' };
const CLIENT_STAGE = { architect: ['Drawings prepared', 'An architect checks your design and prepares proper drawings.'], surveyor: ['Land survey', 'A land surveyor checks your plot and boundaries.'], engineer: ['Structural design', 'An engineer designs the foundation and structure so your home is safe.'], contractor: ['Builder\'s price and plan', 'A contractor prices the work and plans how long it will take.'], supplier: ['Materials quotes', 'Suppliers quote the materials.'] };

const TASKS = {
  architect: [
    ['Open and read the client\'s design', 'The client designed their home in VR. Check the rooms, doors and sizes make sense before anyone else spends time on it.'],
    ['Check every room against minimum sizes and the warnings list', 'Small rooms and missing doors are the most common reasons a design gets rejected by the parish council.'],
    ['Confirm the brief with the client (budget, family size, future plans)', 'The VR design shows what the client likes. It does not show what they can afford or need later, such as extra floors.'],
    ['Check finishes, windows and the outside look are realistic and buildable', 'The VR lets clients choose anything. Some choices are costly or not suitable for sun, salt air or hurricanes.'],
    ['Prepare the drawing set for approval (plans, elevations, sections)', 'Authorities usually need more drawings than the VR sheets: elevations, sections, site plan. This is the architect\'s main job. Use the editable CAD files.'],
    ['Upload your finished drawings, then submit for review', 'The project manager reviews your work before the surveyor and engineer start.']
  ],
  surveyor: [
    ['Confirm who owns the land and the plot size on the title', 'A house cannot be approved on land the client does not legally own, or on a plot that is not the size they think.'],
    ['Measure and mark the plot boundaries on the ground', 'The VR assumes a rectangular plot. Real plots are often not rectangular. The house may have to move or shrink.'],
    ['Record ground levels and slope (a topographic survey)', 'Sloping land changes the foundation and drainage. The engineer needs these levels.'],
    ['Mark utilities, easements and required distances from the boundary', 'Many places require a minimum gap between the house and the boundary or road. Pipes and power lines may cross the plot.'],
    ['Check flooding and drainage on the plot', 'Water must run away from the house. Low plots may need the floor raised.'],
    ['Upload the signed survey plan, then submit for review', 'The engineer and contractor will rely on this plan.']
  ],
  engineer: [
    ['Read the plans and the multi-floor and room-size warnings', 'Large rooms and extra floors need stronger beams and columns.'],
    ['Ask for or review a soil investigation (what the ground is made of)', 'Weak or clay soil needs a different foundation. Skipping this is a common cause of cracked houses.'],
    ['Design the foundation, columns, beams and slabs', 'This is the structure that holds the house up. It must be calculated, not guessed.'],
    ['Check it can resist hurricane wind and earthquakes in this area', 'Roof tie-downs, steel in the walls and column spacing are what keep a house standing in a storm.'],
    ['Check electrical load, water pipes and drainage', 'The VR app draws a first layout. A licensed person must confirm sizes and safety.'],
    ['Upload structural drawings and calculations, then submit for review', 'The contractor builds from these, not from the VR sheets.']
  ],
  contractor: [
    ['Read all drawings, the survey and the engineer\'s drawings', 'Everything must agree. If the plans and the survey disagree, ask before pricing.'],
    ['Check the material list and fix anything missing', 'The app gives rough quantities. The contractor knows what is really needed.'],
    ['Price the job and add your quote', 'The client needs a real price before deciding. Include labour, materials, profit and a reserve for surprises.'],
    ['Say how long the work will take (a simple schedule)', 'Weather, delivery times and inspections all affect the finish date.'],
    ['List permits and inspections needed during building', 'Inspections at foundation, structure and completion are normally compulsory.'],
    ['Upload the quote and schedule, then submit for review', 'The project manager checks it before the supplier step.']
  ],
  supplier: [
    ['Read the material list', 'These are the quantities the contractor confirmed.'],
    ['Quote a price for each item and say if it is in stock', 'Prices change. A quote should say how long it is valid.'],
    ['Give delivery times to the site', 'Late delivery delays the whole build.'],
    ['Suggest cheaper or locally made alternatives where possible', 'Local products are often cheaper and easier to get.'],
    ['Add your quote, then submit for review', 'The project manager compares quotes from different suppliers.']
  ]
};

/* which drawings each person gets, sent automatically when their step opens */
const PACKAGES = {
  architect:  { sheets: ['G-001', 'A-101', 'A-102', 'A-301', 'A-401', 'A-501', 'A-601', 'A-201', 'E-101', 'E-102', 'P-101', 'M-101', 'F-101', 'S-001', 'S-101', 'S-102', 'C-101', 'C-102', 'R-101', 'Q-001'], cad: ['architectural', 'elevations', 'electrical', 'plumbing', 'site-and-structure'], data: ['rooms.csv', 'finishes.csv'], print: true },
  surveyor:   { sheets: ['G-001', 'C-101', 'C-102', 'A-101'], cad: ['site-and-structure'], data: ['boundary-points.csv'], print: false },
  engineer:   { sheets: ['G-001', 'A-101', 'A-102', 'A-301', 'A-401', 'S-101', 'S-102', 'C-101', 'C-102', 'E-101', 'E-102', 'P-101', 'M-101', 'F-101', 'R-101', 'S-001'], cad: ['architectural', 'elevations', 'site-and-structure', 'electrical', 'plumbing'], data: ['boundary-points.csv'], print: false },
  contractor: { sheets: ['G-001', 'A-101', 'A-102', 'A-301', 'A-401', 'A-501', 'A-601', 'A-201', 'S-101', 'S-102', 'C-101', 'C-102', 'E-101', 'E-102', 'P-101', 'M-101', 'F-101', 'R-101', 'S-001', 'Q-001'], cad: ['architectural', 'elevations', 'site-and-structure', 'electrical', 'plumbing'], data: ['boq.csv', 'rooms.csv', 'finishes.csv'], print: true },
  supplier:   { sheets: ['G-001', 'A-501', 'Q-001', 'A-201', 'S-001'], cad: [], data: ['boq.csv', 'finishes.csv'], print: false },
  client:     { sheets: ['G-001', 'A-101', 'A-301', 'A-401', 'A-201'], cad: [], data: [], print: false }
};
const SHEET_TITLE = { 'G-001': 'Title sheet, index and notes', 'A-102': 'Roof plan', 'A-401': 'Sections', 'A-501': 'Door and window schedule', 'A-601': 'Typical details', 'M-101': 'Air conditioning and ventilation', 'F-101': 'Fire safety and escape routes', 'S-102': 'Column and beam layout', 'C-102': 'Stormwater and septic', 'R-101': 'Riser diagrams (multi-storey)', 'A-101': 'Floor plan', 'A-201': 'Finishes and furniture', 'A-301': 'Elevations (front, rear, left, right)', 'E-101': 'Electrical power plan', 'E-102': 'Lighting plan', 'P-101': 'Plumbing plan', 'S-001': 'Schedules and notes', 'S-101': 'Foundation layout (schematic)', 'C-101': 'Site plan', 'Q-001': 'Quantities for pricing' };
const CAD_TITLE = { architectural: 'Architectural: walls, doors, windows, fixtures, room areas', elevations: 'Elevations: front, rear, left and right views', electrical: 'Electrical: sockets, lights, switches, panel', plumbing: 'Plumbing: water and drain pipes', 'site-and-structure': 'Site boundary, setbacks, footings and columns (schematic)' };
const DATA_TITLE = { 'rooms.csv': 'Room list (open in Excel)', 'finishes.csv': 'Finishes by room (open in Excel)', 'boq.csv': 'Rough quantities (open in Excel)', 'boundary-points.csv': 'Plot corner points, local coordinates (open in Excel)' };

const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'dxf', 'dwg', 'svg', 'txt', 'csv', 'xlsx', 'docx', 'zip', 'rvt', 'ifc', 'dgn'];
const MAX_FILE = 3 * 1024 * 1024;
const r2 = (n) => Math.round(n * 100) / 100;
const now = () => new Date().toISOString();
const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n || 400);

module.exports = function mountTeam(app, ctx) {
  const { DATA, ADMIN_KEY, limit, same } = ctx;
  const PROJ = path.join(DATA, 'projects');
  const SECRET = process.env.TEAM_SECRET || crypto.createHash('sha256').update('crteam' + ADMIN_KEY).digest('hex');
  const acc = makeAccounts(DATA, SECRET);
  const PINS = {}; TRADES.concat(['pm']).forEach(t => { if (process.env['PIN_' + t.toUpperCase()]) PINS[t] = process.env['PIN_' + t.toUpperCase()]; });

  /* ---------- sign-in ---------- */
  const tokenOwner = (name) => acc.sign({ id: 'owner', role: 'manager', name, exp: Date.now() + 12 * 3600 * 1000 });
  const auth = (req, res, next) => {
    const t = (req.get('authorization') || '').replace(/^Bearer /, '') || req.query.t || ''; const u = acc.verify(t);
    if (!u) return res.status(401).json({ error: 'Please sign in again.' }); req.user = u; next();
  };
  const isOwner = (req) => req.user.role === 'manager', isPM = (req) => req.user.role === 'pm', isStaffAdmin = (req) => isOwner(req) || isPM(req), isClient = (req) => req.user.role === 'client';
  const staffOnly = (req, res, next) => isClient(req) ? res.status(403).json({ error: 'That page is for the team.' }) : next();
  app.post('/api/team/login', limit(15, 60000), (req, res) => {
    const b = req.body || {};
    if (b.username) {                                                       // accounts: username and password
      const u = acc.check(b.username, b.password); if (!u) return res.status(401).json({ error: 'Username or password is not right.' });
      return res.json({ token: acc.tokenFor(u), role: u.role, name: u.name, mustChange: !!u.mustChange });
    }
    const role = String(b.role || ''), pin = String(b.pin || ''), name = clean(b.name, 40) || (ROLES[role] && ROLES[role].name);
    if (role === 'manager' && same(pin, ADMIN_KEY)) return res.json({ token: tokenOwner(name), role, name });
    if (PINS[role] && same(pin, PINS[role])) return res.json({ token: acc.sign({ id: 'pin:' + role, role, name, exp: Date.now() + 12 * 3600 * 1000 }), role, name });
    res.status(401).json({ error: 'That is not right. Check your username and password.' });
  });
  app.get('/api/team/me', auth, (req, res) => { const u = acc.byId(req.user.id); res.json({ id: req.user.id, role: req.user.role, name: req.user.name, roles: ROLES, status: STATUS, profile: acc.pub(u) || null }); });
  app.post('/api/team/password', auth, limit(10, 60000), (req, res) => {
    const u = acc.byId(req.user.id); if (!u) return res.status(400).json({ error: 'This sign-in has no password to change.' });
    if (!acc.check(u.username, req.body.old)) return res.status(401).json({ error: 'Your current password is not right.' });
    try { acc.setPassword(u.id, req.body.password, false); } catch (e) { return res.status(400).json({ error: e.message }); }
    res.json({ ok: true, token: acc.tokenFor(acc.byId(u.id)) });
  });
  app.post('/api/team/profile', auth, (req, res) => { try { const u = acc.update(req.user.id, req.body || {}); res.json({ ok: true, profile: acc.pub(u) }); } catch (e) { res.status(400).json({ error: e.message }); } });

  /* ---------- staff accounts (owner) ---------- */
  app.get('/api/team/users', auth, staffOnly, (req, res) => {
    if (!isStaffAdmin(req)) return res.status(403).json({ error: 'Only the owner and project managers can see the team list.' });
    const role = req.query.role; res.json({ users: acc.list(role).filter(u => isOwner(req) || u.role !== 'client' ? true : false).map(u => { const p = acc.pub(u); if (!isOwner(req)) { delete p.email; delete p.phone; delete p.address; } return p; }) });
  });
  app.post('/api/team/users', auth, limit(30, 60000), (req, res) => {
    if (!isOwner(req)) return res.status(403).json({ error: 'Only the owner creates team accounts.' });
    const role = String(req.body.role); if (role === 'client' || !acc.ROLE_OK.includes(role)) return res.status(400).json({ error: 'Choose a team role.' });
    try { const r = acc.create(role, req.body, { temp: true }); res.json({ ok: true, user: acc.pub(r.user), password: r.password }); } catch (e) { res.status(400).json({ error: e.message }); }
  });
  app.post('/api/team/users/:id/reset', auth, (req, res) => {
    const u = acc.byId(req.params.id); if (!u) return res.status(404).end();
    if (!(isOwner(req) || (isPM(req) && u.role === 'client'))) return res.status(403).json({ error: 'You cannot reset that password.' });
    res.json({ ok: true, password: acc.resetTemp(u.id) });
  });
  app.post('/api/team/users/:id/disable', auth, (req, res) => { if (!isOwner(req)) return res.status(403).end(); const u = acc.byId(req.params.id); if (!u) return res.status(404).end(); acc.update(u.id, { disabled: !!req.body.disabled }); res.json({ ok: true }); });

  /* ---------- storage ---------- */
  const wfPath = (ref) => path.join(PROJ, ref, 'workflow.json');
  const validRef = (ref) => /^CR-[0-9A-Z-]+$/.test(ref) && fs.existsSync(path.join(PROJ, ref, 'design.json'));
  const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } };
  const save = (ref, w) => { w.updated = now(); const tmp = wfPath(ref) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(w, null, 1)); fs.renameSync(tmp, wfPath(ref)); };
  /* aud = who may read the entry: 'team' (default) or 'client' (also shown to the client) */
  const log = (w, who, text, aud) => { w.log.unshift({ t: now(), who, text, aud: aud || 'team' }); w.log = w.log.slice(0, 400); };
  const code = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; return Array.from(crypto.randomBytes(8), b => A[b % A.length]).join(''); };
  function create(ref, extra) {
    const w = { ref, created: now(), updated: now(), revisionOf: (extra && extra.revisionOf) || null, supersededBy: null, claim: code(), client: { id: '', name: '', at: null }, pm: '', assign: {},
      manager: { note: '', decision: 'open' }, share: { note: '', quote: '', docs: [], at: null }, clientDecision: { status: 'pending', note: '', at: null },
      steps: {}, tasks: [], messages: [], documents: [], quotes: [], log: [], seen: {}, delivered: {} };
    TRADES.forEach(t => {
      w.steps[t] = { status: NEEDS[t].length ? 'waiting' : 'new', released: false, owner: '', started: null, finished: null, submitted: null, note: '' };
      TASKS[t].forEach((x, i) => w.tasks.push({ id: t + '-' + (i + 1), role: t, title: x[0], why: x[1], done: false, by: '', at: null }));
    });
    log(w, 'System', 'Design received.', 'client');
    log(w, 'System', 'Drawings delivered automatically to the Architect.');
    w.delivered.architect = now();
    if (w.revisionOf) log(w, 'System', 'This is a changed version of ' + w.revisionOf + '. Everyone should use this newer one.', 'client');
    fs.mkdirSync(path.join(PROJ, ref), { recursive: true }); save(ref, w); return w;
  }
  function load(ref) { const w = readJson(wfPath(ref)); if (w) { w.claim = w.claim || code(); w.client = w.client || { id: '', name: '', at: null }; w.assign = w.assign || {}; w.share = w.share || { note: '', quote: '', docs: [], at: null }; w.clientDecision = w.clientDecision || { status: 'pending', note: '', at: null }; w.delivered = w.delivered || {}; w.pm = w.pm || ''; return w; } return create(ref); }
  /* a step opens when the steps before it are complete (or the owner opened it early). Opening it delivers its drawing package. */
  function refresh(w) {
    TRADES.forEach(t => {
      const s = w.steps[t]; if (s.status !== 'waiting') return;
      if (s.released || NEEDS[t].every(n => w.steps[n].status === 'done')) {
        s.status = 'new'; w.delivered[t] = now();
        log(w, 'System', ROLES[t].name + ' step is now open. Drawings delivered automatically to the ' + ROLES[t].name.toLowerCase() + '.');
        log(w, 'System', 'Next stage has started: ' + CLIENT_STAGE[t][0] + '.', 'client');
      }
    });
  }
  function onNewProject(ref, session, contact, source) {
    let rev = null, keep = null;
    if (session && session.prevProject && validRef(session.prevProject)) { rev = session.prevProject; const o = load(rev); o.supersededBy = ref; log(o, 'System', 'Client sent a changed design: ' + ref, 'client'); save(rev, o); keep = o; }
    const w = create(ref, { revisionOf: rev });
    if (contact && (contact.email || contact.phone || contact.address || contact.notes)) { w.contact = contact; log(w, 'System', 'Client details: ' + [contact.email, contact.phone, contact.address].filter(Boolean).join(' | ') + (contact.notes ? ' | Note: ' + contact.notes : ''), 'client'); save(ref, w); }
    if (source) { w.source = source; log(w, 'System', 'Design received from: ' + source.device + ' (' + source.via + ') via ' + source.host + (source.build ? ', app ' + source.build : '') + '.', 'client'); save(ref, w); }
    if (keep) { w.client = keep.client; w.pm = keep.pm; w.assign = keep.assign; w.claim = keep.claim; save(ref, w); }
    return { code: w.claim };
  }

  /* ---------- who can see and change what ---------- */
  const canSee = (req, w) => {
    const r = req.user.role, id = req.user.id;
    if (r === 'manager') return true; if (r === 'pm') return w.pm === id; if (r === 'client') return w.client.id === id;
    if (!TRADES.includes(r)) return false; return !w.assign[r] || w.assign[r] === id || id === 'pin:' + r;
  };
  const mayEdit = (req, w, role) => isStaffAdmin(req) ? true : req.user.role === role && canSee(req, w);
  const nameOf = (id) => { const u = acc.byId(id); return u ? u.name : ''; };

  /* ---------- reading the design ---------- */
  function listFiles(dir, pre) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'uploads' ? [] : listFiles(path.join(dir, e.name), pre + e.name + '__')) : [pre + e.name]); }
  function summary(ref) {
    const d = readJson(path.join(PROJ, ref, 'design.json')); if (!d) return null;
    const levels = d.levels || []; const rooms = levels.flatMap((l, i) => (l.rooms || []).map(r => ({ ...r, level: i })));
    const area = r2(rooms.reduce((a, r) => a + r.w * r.d, 0)), ground = r2((levels[0] ? levels[0].rooms || [] : []).reduce((a, r) => a + r.w * r.d, 0));
    const plot = d.plot || {}, plotArea = (plot.w || 0) * (plot.d || 0);
    return { ref, client: (d.meta && d.meta.client) || '(no name given)', date: d.meta && d.meta.date, storeys: d.storeys || levels.length || 1, rooms: rooms.length, floorArea: area, groundArea: ground, plot, plotArea: r2(plotArea),
      coverage: plotArea ? Math.round(ground / plotArea * 100) : 0, issues: d.issues || [], finishes: d.finishes || null, exterior: d.exterior || null,
      roomList: rooms.map(r => ({ name: r.label, type: r.type, level: r.level, w: r.w, d: r.d, area: r2(r.w * r.d) })) };
  }
  /* Rough quantities so the owner can talk to contractors and suppliers. These are ESTIMATES, never for ordering. */
  function boq(ref) {
    const base = path.join(PROJ, ref), d = readJson(path.join(base, 'design.json')); if (!d) return null;
    const storeys = d.storeys || 1, H = 3.0; let ext = 0, int = 0, doorsE = 0, doorsI = 0, win = 0, fix = {}, lights = 0, outlets = 0, ac = 0, circuits = 0, load = 0, pipes = {}, ground = 0, upper = 0, floorArea = 0;
    for (let i = 0; i < storeys; i++) {
      const s = readJson(path.join(base, storeys > 1 ? 'level-' + (i + 1) : '', 'schedules.json')); if (!s) continue;
      ext += s.exteriorWallLength || 0; int += s.interiorWallLength || 0; doorsE += (s.doors && s.doors.exterior) || 0; doorsI += (s.doors && s.doors.interior) || 0; win += s.windows || 0;
      Object.entries(s.fixtures || {}).forEach(([k, v]) => { fix[k] = (fix[k] || 0) + v; }); lights += (s.lighting && s.lighting.lights) || 0; outlets += (s.electrical && s.electrical.outlets) || 0; ac += (s.electrical && s.electrical.acPoints) || 0;
      const c = s.electrical && s.electrical.circuits; circuits += Array.isArray(c) ? c.length : (Number(c) || 0); load += (s.electrical && s.electrical.connectedLoadW) || 0; Object.entries((s.plumbing && s.plumbing.pipeLengthByDiameterMm) || {}).forEach(([k, v]) => { pipes[k] = r2((pipes[k] || 0) + v); });
      if (i === 0) ground = s.floorArea || 0; else upper += s.floorArea || 0; floorArea += s.floorArea || 0;
    }
    const topArea = (readJson(path.join(base, storeys > 1 ? 'level-' + storeys : '', 'schedules.json')) || {}).floorArea || ground;
    const openings = doorsE * 2.0 + doorsI * 1.9 + win * 1.44, gross = (ext + int) * H, net = Math.max(0, gross - openings);
    const rows = [
      ['Structure', 'Floor area (all floors)', r2(floorArea), 'm²', 'Sum of every room on every floor.'],
      ['Structure', 'Footprint on the ground', r2(ground), 'm²', 'How much land the house covers.'],
      ['Structure', 'Foundation concrete (strip footings)', r2((ext + int * 0.5) * 0.6 * 0.3), 'm³', 'Assumes footings 600 mm wide and 300 mm deep. The engineer decides the real size from the soil.'],
      ['Structure', 'Ground slab concrete (100 mm)', r2(ground * 0.1), 'm³', 'Concrete floor slab under the ground floor.'],
      ['Structure', 'Upper floor slabs concrete (150 mm)', r2(upper * 0.15), 'm³', 'Only if there is more than one floor.'],
      ['Structure', 'Steel reinforcement bars (very rough)', Math.round((ground * 0.1 + upper * 0.15 + (ext + int * 0.5) * 0.18) * 100), 'kg', 'About 100 kg of steel per m³ of concrete. The engineer will calculate it properly.'],
      ['Walls', 'Wall length, outside', r2(ext), 'm', ''], ['Walls', 'Wall length, inside', r2(int), 'm', ''],
      ['Walls', 'Wall area after doors and windows', r2(net), 'm²', 'Wall height assumed 3.0 m. Doors 2.0 x 0.9 m. Windows 1.2 x 1.2 m.'],
      ['Walls', 'Concrete blocks (about 12.5 per m²)', Math.round(net * 12.5), 'blocks', 'Standard 400 x 200 mm hollow blocks. Add 5 to 10% for breakage.'],
      ['Walls', 'Plaster and paint area (both sides)', r2(ext * H + int * H * 2 - openings * 1.5), 'm²', 'Inside and outside faces.'],
      ['Roof', 'Roof covering (sloping roof assumed)', r2(topArea * 1.3), 'm²', 'Top floor area x 1.3 for the slope and overhang.'],
      ['Openings', 'Outside doors', doorsE, 'no.', ''], ['Openings', 'Inside doors', doorsI, 'no.', ''], ['Openings', 'Windows', win, 'no.', ''],
      ['Electrical', 'Lights', lights, 'no.', ''], ['Electrical', 'Sockets', outlets, 'no.', ''], ['Electrical', 'Air-conditioner points', ac, 'no.', ''], ['Electrical', 'Circuits on the breaker panel', circuits, 'no.', ''], ['Electrical', 'Connected load', r2(load / 1000), 'kW', 'The utility company and the electrician must confirm the supply size.']
    ];
    Object.entries(fix).forEach(([k, v]) => rows.push(['Plumbing and fittings', k, v, 'no.', '']));
    Object.entries(pipes).forEach(([k, v]) => rows.push(['Plumbing and fittings', 'Pipe ' + k + ' mm', v, 'm', '']));
    return { note: 'ROUGH ESTIMATE ONLY. Use these numbers to start conversations. The contractor and engineer must confirm every quantity before anything is ordered.', rows };
  }
  function finishRows(ref) {
    const d = readJson(path.join(PROJ, ref, 'design.json')); if (!d || !d.finishes) return [];
    return (d.finishes.rooms || []).map(r => ({ room: r.room, level: r.level, floor: r.floor ? r.floor.material + (r.floor.colour ? ' (' + r.floor.colour + ')' : '') : '', walls: r.walls ? r.walls.material + (r.walls.colour ? ' (' + r.walls.colour + ')' : '') : '' }));
  }
  const csv = (rows) => '﻿' + rows.map(r => r.map(c => { const s = String(c == null ? '' : c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n') + '\r\n';
  function dataFile(ref, name) {
    const s = summary(ref); if (!s) return null;
    if (name === 'rooms.csv') return csv([['Floor', 'Room', 'Width (m)', 'Depth (m)', 'Area (m2)']].concat(s.roomList.map(r => [['Ground', 'First', 'Second'][r.level], r.name, r.w, r.d, r.area])));
    if (name === 'finishes.csv') return csv([['Floor', 'Room', 'Floor finish', 'Wall finish']].concat(finishRows(ref).map(f => [['Ground', 'First', 'Second'][f.level], f.room, f.floor, f.walls])));
    if (name === 'boq.csv') { const b = boq(ref); return csv([['Group', 'Item', 'Amount', 'Unit', 'Note'], ['ESTIMATE ONLY', b.note, '', '', '']].concat(b.rows)); }
    if (name === 'boundary-points.csv') { const p = s.plot || {}; return csv([['Point', 'X (m)', 'Y (m)', 'Note'], ['P1', 0, 0, 'Back left (assumed rectangle)'], ['P2', p.w, 0, 'Back right'], ['P3', p.w, p.d, 'Front right, street side'], ['P4', 0, p.d, 'Front left, street side'], ['', '', '', 'LOCAL coordinates and an ASSUMED rectangle. The surveyor replaces these with real survey points.']]); }
    return null;
  }
  /* the drawing package for one role: only the files that role needs */
  function packageFor(role, files) {
    const P = PACKAGES[role]; if (!P) return [];
    const lv = (f) => f.startsWith('level-') ? ['', 'Ground floor', 'First floor', 'Second floor'][+f.slice(6, 7)] : '';
    const out = [];
    files.forEach(f => {
      const parts = f.split('__'), n = parts[parts.length - 1], pre = lv(f);
      if (n.endsWith('.svg')) { const no = n.slice(0, 5); if (P.sheets.includes(no)) out.push({ file: f, kind: 'drawing', title: (pre ? pre + ': ' : '') + no + ' ' + (SHEET_TITLE[no] || ''), order: P.sheets.indexOf(no) }); }
      else if (parts[parts.length - 2] === 'cad' && n.endsWith('.dxf')) { const k = n.replace('.dxf', ''); if (P.cad.includes(k)) out.push({ file: f, kind: 'cad', title: (pre ? pre + ': ' : '') + 'Editable CAD (DXF), ' + CAD_TITLE[k], order: 100 + P.cad.indexOf(k) }); }
      else if (parts[parts.length - 2] === 'renders' && n.endsWith('.jpg') && ['architect', 'client', 'contractor', 'engineer'].includes(role)) out.push({ file: f, kind: 'render', title: 'Rendered view: ' + n.slice(3, -4).replace(/-/g, ' '), order: 150 + parseInt(n.slice(0, 2), 10) });
      else if (n === 'all-sheets-print.html' && P.print) out.push({ file: f, kind: 'print', title: 'All sheets together, to print or save as PDF', order: 200 });
    });
    P.data.forEach((d, i) => out.push({ file: 'export:' + d, kind: 'data', title: DATA_TITLE[d], order: 300 + i }));
    return out.sort((a, b) => a.order - b.order);
  }

  /* ---------- plain-language warnings ("cases") ---------- */
  function alerts(ref, w, s) {
    const A = [], add = (level, title, why, todo) => A.push({ level, title, why, todo }); const age = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;
    const st = w.steps, active = TRADES.filter(t => ['new', 'working', 'question', 'changes'].includes(st[t].status));
    if (w.supersededBy) add('info', 'The client sent a newer version', 'This design was replaced by ' + w.supersededBy + '. Do not build from this one.', 'Open ' + w.supersededBy + ' instead.');
    if (!w.pm) add('high', 'No project manager assigned', 'Nobody is looking after this client.', 'Assign a project manager.');
    if (!w.client.id) add('info', 'The client has not joined the portal yet', 'They cannot see progress or send messages until they register.', 'Give the client their project reference and access code: ' + w.ref + ' / ' + w.claim + '.');
    TRADES.filter(t => st[t].status === 'review').forEach(t => add(age(st[t].submitted || w.created) > 2 ? 'high' : 'medium', ROLES[t].name + ' work is waiting for your review', 'Submitted ' + Math.floor(age(st[t].submitted || w.created)) + ' day(s) ago. The next step cannot start until it is approved.', 'Read it, then approve it or send it back with a reason.'));
    if (st.architect.status === 'new' && age(w.created) > 1) add('high', 'The architect has not opened this for over a day', 'Nothing else can start until the architect finishes.', 'Call or message the architect.');
    active.forEach(t => { const d = st[t].started ? age(st[t].started) : age(w.created); if (d > 5) add('medium', ROLES[t].name + ' has had this for ' + Math.floor(d) + ' days', 'Delays cost money and the client may lose interest.', 'Ask the ' + ROLES[t].name.toLowerCase() + ' for a date.'); });
    TRADES.filter(t => ['changes', 'question'].includes(st[t].status)).forEach(t => add('high', ROLES[t].name + ': ' + STATUS[st[t].status].toLowerCase(), st[t].note || 'There is an open question.', 'Read the messages and answer it.'));
    const errs = s.issues.filter(i => i.level === 'error');
    if (errs.length) add('high', errs.length + ' design problem' + (errs.length > 1 ? 's' : '') + ' in the drawing', errs.map(e => e.text).join(' '), 'Ask the architect to fix these with the client before anything is priced.');
    const warns = s.issues.filter(i => i.level === 'warn'); if (warns.length) add('medium', warns.length + ' design warning' + (warns.length > 1 ? 's' : ''), warns.map(e => e.text).join(' '), 'The architect should decide whether each one is acceptable.');
    if (s.storeys > 1) add('medium', 'More than one floor', 'Upper floors need stronger columns and beams, and a proper staircase.', 'Make sure the engineer reviews the staircase and the upper slab.');
    if (s.coverage > 50) add('medium', 'The house covers ' + s.coverage + '% of the plot', 'Local rules usually limit how much of the plot can be built on, and require gaps to the boundary.', 'Ask the surveyor and the parish council for the allowed percentage and setbacks.');
    if (!s.plotArea) add('medium', 'No plot size recorded', 'Without a plot size nobody can check boundaries.', 'Ask the client for their land title or survey.');
    if (!s.finishes) add('info', 'The client did not choose finishes', 'The drawings will show default finishes.', 'Architect should confirm finishes with the client.');
    if (st.engineer.status === 'working' && !w.documents.some(x => x.role === 'surveyor')) add('medium', 'The engineer started without a survey', 'Foundations depend on ground levels and boundaries from the surveyor.', 'Ask the surveyor to upload their survey plan.');
    if (st.contractor.status === 'done' && !w.quotes.some(q => q.role === 'contractor')) add('medium', 'Contractor finished but gave no price', 'A price is needed for the client to decide.', 'Ask the contractor to add a quote.');
    if (st.supplier.status === 'done' && w.quotes.filter(q => q.role === 'supplier').length < 2) add('info', 'Only one supplier quote (or none)', 'Comparing two or three quotes usually saves money.', 'Ask another supplier for a quote.');
    if (w.share.at && w.clientDecision.status === 'pending' && age(w.share.at) > 3) add('medium', 'The client has not answered the proposal', 'Shared ' + Math.floor(age(w.share.at)) + ' days ago.', 'Phone the client.');
    if (w.clientDecision.status === 'changes') add('high', 'The client asked for changes', w.clientDecision.note || '', 'Read their note and talk to the architect.');
    if (TRADES.every(t => st[t].status === 'done') && !w.share.at) add('info', 'Everyone has finished', 'The package is ready.', 'Choose a quote and share the proposal with the client.');
    return A;
  }
  const cardOf = (ref, w) => {
    const s = summary(ref); if (!s) return null; const al = alerts(ref, w, s);
    const cur = TRADES.find(t => w.steps[t].status !== 'done' && w.steps[t].status !== 'waiting') || null;
    return { ref, client: s.client, clientName: w.client.name, clientLinked: !!w.client.id, pm: w.pm, pmName: nameOf(w.pm), date: s.date, storeys: s.storeys, rooms: s.rooms, floorArea: s.floorArea, steps: Object.fromEntries(TRADES.map(t => [t, w.steps[t].status])), current: cur, superseded: w.supersededBy, revisionOf: w.revisionOf,
      alerts: al.length, high: al.filter(a => a.level === 'high').length, review: TRADES.filter(t => w.steps[t].status === 'review').length, decision: w.manager.decision, clientDecision: w.clientDecision.status, updated: w.updated, seen: w.seen };
  };
  const forEachProject = () => fs.existsSync(PROJ) ? fs.readdirSync(PROJ).filter(validRef) : [];
  const mine = (req) => forEachProject().map(ref => ({ ref, w: load(ref) })).filter(x => canSee(req, x.w));

  /* ---------- team API ---------- */
  app.get('/api/team/projects', auth, staffOnly, (req, res) => {
    const list = mine(req).map(x => cardOf(x.ref, x.w)).filter(Boolean).map(c => ({ ...c, isNew: !c.seen[req.user.id] })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    res.json({ projects: list });
  });
  app.get('/api/team/projects/:ref', auth, staffOnly, (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).json({ error: 'Not found' }); const w = load(ref);
    if (!canSee(req, w)) return res.status(403).json({ error: 'This project is not assigned to you.' });
    const s = summary(ref), files = listFiles(path.join(PROJ, ref), '').filter(f => f !== 'workflow.json' && f !== 'workflow.json.tmp');
    w.seen[req.user.id] = now(); save(ref, w);
    const roleFor = isStaffAdmin(req) ? 'architect' : req.user.role;
    const pk = {}; (isStaffAdmin(req) ? TRADES : [req.user.role]).forEach(r => { pk[r] = { delivered: w.delivered[r] || null, files: packageFor(r, files) }; });
    const users = isStaffAdmin(req) ? Object.fromEntries(TRADES.concat(['pm']).map(r => [r, acc.list(r).filter(u => !u.disabled).map(u => ({ id: u.id, name: u.name, company: u.company }))])) : null;
    const wf = { ...w, claim: isStaffAdmin(req) ? w.claim : undefined }; wf.log = w.log;
    let overview = null;
    if (isStaffAdmin(req)) {
      const rd = f => { try { return JSON.parse(fs.readFileSync(path.join(PROJ, ref, f), 'utf8')); } catch (e) { return null; } };
      const des = rd('design.json') || {}, fur = rd('furniture.json'), ext = rd('exterior-and-finishes.json');
      const items = Array.isArray(fur) ? fur : (fur && fur.items) || [];
      const total = items.reduce((a, i) => a + (+i.price || 0), 0);
      const renders = files.filter(f => /^renders__.*\.jpg$/i.test(f));
      overview = { client: des.meta && des.meta.client, contact: w.contact || null, source: w.source || null, storeys: des.storeys, plot: des.plot, rooms: (des.levels || []).map((l, i) => ({ level: i + 1, rooms: (l.rooms || []).map(r => ({ name: r.name || r.type, w: r.w, d: r.d })) })), issues: des.issues || [], finishes: des.finishes || null, exterior: ext || des.exterior || null, furniture: items.map(i => ({ name: i.name || i.key, room: i.room, level: i.level, w: i.w, d: i.d, h: i.h, store: i.store, link: i.link, price: i.price })), furnitureTotal: total, renders, sheetCount: files.filter(f => /\.svg$/i.test(f)).length, fileCount: files.length };
    }
    res.json({ overview, workflow: wf, summary: s, files: isStaffAdmin(req) ? files : [], packages: pk, alerts: alerts(ref, w, s), boq: boq(ref), finishes: finishRows(ref), users, names: { pm: nameOf(w.pm), assign: Object.fromEntries(TRADES.map(t => [t, nameOf(w.assign[t])])), client: w.client.name }, me: { id: req.user.id, role: req.user.role } });
  });
  app.post('/api/team/projects/:ref/step', auth, staffOnly, limit(60, 60000), (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).json({ error: 'Not found' });
    const role = String(req.body.role), status = String(req.body.status), w = load(ref), step = w.steps[role];
    if (!step || !STATUS[status] || status === 'waiting' || status === 'new') return res.status(400).json({ error: 'Not a valid change.' });
    if (!canSee(req, w)) return res.status(403).json({ error: 'This project is not assigned to you.' });
    if (!mayEdit(req, w, role)) return res.status(403).json({ error: 'That section belongs to the ' + ROLES[role].name.toLowerCase() + '.' });
    if (['done', 'changes'].includes(status) && !isStaffAdmin(req)) return res.status(403).json({ error: 'Only the project manager or owner can approve work or send it back. Use "Submit for review".' });
    if (step.status === 'waiting' && !isStaffAdmin(req)) return res.status(409).json({ error: 'This step opens when the step before it is complete.' });
    if (['review', 'done'].includes(status)) { const open = w.tasks.filter(t => t.role === role && !t.done).length; if (open && !req.body.force) return res.status(409).json({ error: open + ' checklist item' + (open > 1 ? 's are' : ' is') + ' not ticked yet. Tick them, or continue anyway.', needForce: true }); }
    if (status === 'changes' && !clean(req.body.note, 300)) return res.status(400).json({ error: 'Say what needs to change, so the person knows what to fix.' });
    const prev = step.status; step.status = status; step.note = clean(req.body.note, 300); if (!step.owner) step.owner = req.user.name; if (!step.started) step.started = now();
    if (status === 'review') step.submitted = now(); step.finished = status === 'done' ? now() : null;
    const who = req.user.name + ' (' + ROLES[req.user.role].name + ')';
    log(w, who, ROLES[role].name + ' step: ' + STATUS[status].toLowerCase() + (step.note ? ' - ' + step.note : ''), ['working', 'review', 'done', 'changes'].includes(status) ? 'client' : 'team');
    if (status === 'done' && prev !== 'done') log(w, 'System', CLIENT_STAGE[role][0] + ' is complete.', 'client');
    if (status === 'changes') w.messages.push({ t: now(), who: req.user.name, role: req.user.role, text: 'Sent back for changes: ' + step.note, channel: 'team', to: role });
    refresh(w); save(ref, w); res.json({ ok: true });
  });
  app.post('/api/team/projects/:ref/release', auth, staffOnly, (req, res) => {
    if (!isStaffAdmin(req)) return res.status(403).json({ error: 'Only the owner or project manager can open a step early.' }); const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end();
    const w = load(ref); if (!canSee(req, w)) return res.status(403).end(); const role = String(req.body.role); if (!w.steps[role]) return res.status(400).end(); w.steps[role].released = true; refresh(w); log(w, req.user.name, 'Opened the ' + ROLES[role].name.toLowerCase() + ' step early.'); save(ref, w); res.json({ ok: true });
  });
  app.post('/api/team/projects/:ref/assign', auth, staffOnly, (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w) || !isStaffAdmin(req)) return res.status(403).json({ error: 'Only the owner or project manager assigns people.' });
    const role = String(req.body.role), uid = String(req.body.userId || ''), u = uid ? acc.byId(uid) : null;
    if (role === 'pm') { if (!isOwner(req)) return res.status(403).json({ error: 'Only the owner assigns the project manager.' }); if (uid && (!u || u.role !== 'pm')) return res.status(400).json({ error: 'Pick a project manager.' }); w.pm = uid; log(w, req.user.name, 'Project manager: ' + (u ? u.name : 'none') + '.', 'client'); }
    else { if (!TRADES.includes(role) || (uid && (!u || u.role !== role))) return res.status(400).json({ error: 'Pick someone with that role.' }); if (uid) w.assign[role] = uid; else delete w.assign[role]; log(w, req.user.name, ROLES[role].name + ' assigned: ' + (u ? u.name : 'open to all ' + ROLES[role].name.toLowerCase() + 's') + '.'); }
    save(ref, w); res.json({ ok: true });
  });
  app.post('/api/team/projects/:ref/task', auth, staffOnly, limit(120, 60000), (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref), t = w.tasks.find(x => x.id === req.body.id); if (!t) return res.status(404).end();
    if (!canSee(req, w) || !mayEdit(req, w, t.role)) return res.status(403).json({ error: 'That checklist belongs to the ' + ROLES[t.role].name.toLowerCase() + '.' });
    t.done = !!req.body.done; t.by = t.done ? req.user.name : ''; t.at = t.done ? now() : null; save(ref, w); res.json({ ok: true });
  });
  app.post('/api/team/projects/:ref/message', auth, limit(60, 60000), (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const text = clean(req.body.text, 1000); if (!text) return res.status(400).json({ error: 'Write something first.' });
    const w = load(ref); if (!canSee(req, w)) return res.status(403).end();
    const channel = isClient(req) ? 'client' : (req.body.channel === 'client' && isStaffAdmin(req) ? 'client' : 'team');
    w.messages.push({ t: now(), who: req.user.name, role: req.user.role, text, channel, to: ROLES[req.body.to] && channel === 'team' ? req.body.to : '' }); log(w, req.user.name, channel === 'client' ? 'Sent a message to the client.' : 'Posted a message.', channel === 'client' ? 'client' : 'team'); save(ref, w); res.json({ ok: true });
  });
  app.post('/api/team/projects/:ref/quote', auth, staffOnly, limit(30, 60000), (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); if (!['contractor', 'supplier'].includes(req.user.role) && !isStaffAdmin(req)) return res.status(403).json({ error: 'Only contractors and suppliers add quotes.' });
    const amount = Number(req.body.amount); if (!(amount > 0) || amount > 1e10) return res.status(400).json({ error: 'Enter the total price as a number.' });
    const w = load(ref); if (!canSee(req, w)) return res.status(403).end(); w.quotes.push({ id: crypto.randomBytes(3).toString('hex'), t: now(), role: isStaffAdmin(req) ? (['contractor', 'supplier'].includes(req.body.role) ? req.body.role : 'contractor') : req.user.role, who: clean(req.body.company, 60) || req.user.name, amount, currency: clean(req.body.currency, 4) || 'JMD', valid: clean(req.body.valid, 40), days: clean(req.body.days, 40), note: clean(req.body.note, 400), accepted: false });
    log(w, req.user.name, 'Added a quote.'); save(ref, w); res.json({ ok: true });
  });
  app.post('/api/team/projects/:ref/quote/accept', auth, staffOnly, (req, res) => {
    if (!isStaffAdmin(req)) return res.status(403).json({ error: 'Only the owner or project manager chooses a quote.' }); const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end();
    const w = load(ref); if (!canSee(req, w)) return res.status(403).end(); const q = w.quotes.find(x => x.id === req.body.id); if (!q) return res.status(404).end(); w.quotes.filter(x => x.role === q.role).forEach(x => { x.accepted = false; }); q.accepted = !!req.body.accepted;
    log(w, req.user.name, (q.accepted ? 'Chose' : 'Un-chose') + ' the quote from ' + q.who + '.'); save(ref, w); res.json({ ok: true });
  });
  /* the proposal the client sees: a chosen quote, a note, and any documents the manager ticks */
  app.post('/api/team/projects/:ref/share', auth, staffOnly, (req, res) => {
    if (!isStaffAdmin(req)) return res.status(403).end(); const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w)) return res.status(403).end();
    const q = req.body.quote ? w.quotes.find(x => x.id === req.body.quote) : null; if (req.body.quote && !q) return res.status(400).json({ error: 'Pick a quote from the list.' });
    w.share = { note: clean(req.body.note, 1000), quote: q ? q.id : '', docs: (Array.isArray(req.body.docs) ? req.body.docs : []).filter(id => w.documents.some(d => d.id === id)).slice(0, 20), at: now() };
    w.clientDecision = { status: 'pending', note: '', at: null }; log(w, req.user.name, 'Shared a proposal with the client.', 'client'); save(ref, w); res.json({ ok: true });
  });
  app.post('/api/team/projects/:ref/manager', auth, staffOnly, (req, res) => {
    if (!isStaffAdmin(req)) return res.status(403).end(); const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w)) return res.status(403).end();
    if (['open', 'approved', 'on_hold', 'cancelled'].includes(req.body.decision)) { w.manager.decision = req.body.decision; log(w, req.user.name, 'Project marked: ' + req.body.decision.replace('_', ' ') + '.', 'client'); }
    if (typeof req.body.note === 'string') w.manager.note = clean(req.body.note, 1000); save(ref, w); res.json({ ok: true });
  });
  /* files */
  app.post('/api/team/files/:ref', auth, staffOnly, limit(20, 60000), (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w)) return res.status(403).end();
    const title = clean(req.body.title, 80), kind = clean(req.body.kind, 40), note = clean(req.body.note, 300), role = isStaffAdmin(req) ? (TRADES.includes(req.body.role) ? req.body.role : 'architect') : req.user.role;
    if (!title) return res.status(400).json({ error: 'Give the document a title.' });
    const doc = { id: crypto.randomBytes(3).toString('hex'), t: now(), role, who: req.user.name, title, kind, note, link: '', file: '', size: 0 };
    const link = clean(req.body.link, 300); if (link) { if (!/^https?:\/\//i.test(link)) return res.status(400).json({ error: 'A link must start with https://' }); doc.link = link; }
    if (req.body.data) {
      const ext = String(req.body.name || '').split('.').pop().toLowerCase(); if (!ALLOWED_EXT.includes(ext)) return res.status(400).json({ error: 'That file type is not allowed. Use: ' + ALLOWED_EXT.join(', ') + '.' });
      const buf = Buffer.from(String(req.body.data), 'base64'); if (!buf.length || buf.length > MAX_FILE) return res.status(400).json({ error: 'Files must be under 3 MB.' });
      const dir = path.join(PROJ, ref, 'uploads'); fs.mkdirSync(dir, { recursive: true }); doc.file = doc.id + '.' + ext; doc.size = buf.length; doc.name = clean(String(req.body.name).replace(/[^\w.\- ]/g, ''), 80); fs.writeFileSync(path.join(dir, doc.file), buf);
    }
    if (!doc.link && !doc.file && !note) return res.status(400).json({ error: 'Add a file, a link, or a note.' });
    w.documents.push(doc); log(w, req.user.name, 'Added a document: ' + title); save(ref, w); res.json({ ok: true });
  });
  const sendUpload = (res, ref, d) => { res.setHeader('Content-Disposition', 'attachment; filename="' + (d.name || d.file).replace(/"/g, '') + '"'); res.setHeader('Content-Type', 'application/octet-stream'); res.sendFile(path.join(PROJ, ref, 'uploads', d.file)); };
  app.get('/api/team/files/:ref/upload/:id', auth, (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w)) return res.status(403).end(); const d = w.documents.find(x => x.id === req.params.id); if (!d || !d.file) return res.status(404).end();
    if (isClient(req) && !w.share.docs.includes(d.id)) return res.status(403).end(); sendUpload(res, ref, d);
  });
  /* drawings and exports: a person may open only what is in their own package (the owner and project manager can open everything) */
  function allowedFile(req, w, ref, name) {
    if (isStaffAdmin(req)) return true;
    const files = listFiles(path.join(PROJ, ref), ''); const role = req.user.role; return packageFor(role, files).some(p => p.file === name);
  }
  app.get('/api/team/files/:ref/drawing/:file', auth, (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w)) return res.status(403).end();
    const name = req.params.file, segs = name.split('__'); if (segs.length > 3 || segs.some(x => !x || x === '.' || x === '..' || !/^[A-Za-z0-9.-]+$/.test(x)) || segs.includes('uploads')) return res.status(400).end();
    if (!allowedFile(req, w, ref, name)) return res.status(403).json({ error: 'That file is not part of your drawing package.' });
    const p = path.join(PROJ, ref, ...segs); if (!fs.existsSync(p)) return res.status(404).end();
    if (p.endsWith('.dxf')) { res.type('application/dxf'); res.setHeader('Content-Disposition', 'attachment'); }
    if (p.endsWith('.html') || p.endsWith('.svg')) res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:");
    res.sendFile(p);
  });
  app.get('/api/team/files/:ref/export/:name', auth, (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w)) return res.status(403).end();
    if (!allowedFile(req, w, ref, 'export:' + req.params.name)) return res.status(403).json({ error: 'That file is not part of your drawing package.' });
    const d = dataFile(ref, req.params.name); if (d == null) return res.status(404).end(); res.type('text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="' + ref + '-' + req.params.name + '"'); res.send(d);
  });
  app.get('/api/team/overview', auth, staffOnly, (req, res) => {
    const list = mine(req); const cards = list.map(x => cardOf(x.ref, x.w)).filter(Boolean);
    const unseen = cards.filter(c => !c.seen[req.user.id]).length;
    const byRole = {}; TRADES.forEach(t => { byRole[t] = cards.filter(c => !c.superseded && ['new', 'working', 'question', 'changes', 'review'].includes(c.steps[t])).length; });
    const feed = list.flatMap(x => x.w.log.slice(0, 8).map(l => ({ ...l, ref: x.ref }))).sort((a, b) => b.t.localeCompare(a.t)).slice(0, 40);
    const enq = isOwner(req) ? (readJson(path.join(DATA, 'enquiries.json')) || []).filter(e => !e.handled).length : 0;
    res.json({ total: cards.length, unseen, byRole, needsYou: cards.filter(c => c.high && !c.superseded).length, review: cards.filter(c => c.review && !c.superseded).length, unassigned: cards.filter(c => !c.pm && !c.superseded).length, enquiries: enq, feed, users: isOwner(req) ? acc.list().length : 0 });
  });

  /* ---------- client portal ---------- */
  const clientOnly = (req, res, next) => isClient(req) ? next() : res.status(403).json({ error: 'This page is for clients.' });
  app.post('/api/portal/register', limit(8, 3600000), (req, res) => {
    const b = req.body || {}; if (b.website) return res.status(400).end();                       // hidden field: bots fill it in
    try {
      const r = acc.create('client', b);
      let claimed = null; if (b.ref && b.code) { const out = claim(r.user, String(b.ref).trim().toUpperCase(), String(b.code).trim().toUpperCase()); if (out.error) return res.json({ ok: true, token: acc.tokenFor(r.user), role: 'client', name: r.user.name, claimError: out.error }); claimed = out.ref; }
      res.json({ ok: true, token: acc.tokenFor(r.user), role: 'client', name: r.user.name, claimed });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
  function claim(user, ref, c) {
    if (!validRef(ref)) return { error: 'We could not find that project reference. Check the reference shown in your headset.' };
    const w = load(ref); if (!same(c, w.claim)) return { error: 'That access code is not right.' };
    if (w.client.id && w.client.id !== user.id) return { error: 'This project is already linked to another account. Ask your project manager for help.' };
    w.client = { id: user.id, name: user.name, at: now() }; log(w, user.name, 'The client joined the portal.', 'client'); save(ref, w);
    return { ref };
  }
  app.post('/api/portal/claim', auth, clientOnly, limit(10, 60000), (req, res) => { const u = acc.byId(req.user.id); const out = claim(u, String(req.body.ref || '').trim().toUpperCase(), String(req.body.code || '').trim().toUpperCase()); if (out.error) return res.status(400).json(out); res.json({ ok: true, ref: out.ref }); });
  const clientView = (ref, w) => {
    const s = summary(ref), files = listFiles(path.join(PROJ, ref), '');
    const stages = [{ key: 'design', title: 'Design received', text: 'Your design from the headset is saved.', status: 'done', at: w.created }].concat(TRADES.map(t => ({ key: t, title: CLIENT_STAGE[t][0], text: CLIENT_STAGE[t][1], status: w.steps[t].status === 'new' ? 'waiting' : w.steps[t].status === 'question' ? 'working' : w.steps[t].status, at: w.steps[t].finished || w.steps[t].submitted || w.steps[t].started })));
    stages.push({ key: 'approval', title: 'Your decision', text: 'Review the proposal and tell us if you want to go ahead.', status: w.clientDecision.status === 'accepted' ? 'done' : w.share.at ? 'review' : 'waiting', at: w.clientDecision.at || w.share.at });
    const q = w.quotes.find(x => x.id === w.share.quote);
    return { ref, client: s.client, summary: { storeys: s.storeys, rooms: s.rooms, floorArea: s.floorArea, plot: s.plot, roomList: s.roomList }, stages, pmName: nameOf(w.pm), decision: w.manager.decision, superseded: w.supersededBy,
      proposal: w.share.at ? { at: w.share.at, note: w.share.note, quote: q ? { amount: q.amount, currency: q.currency, who: q.who, valid: q.valid, days: q.days, note: q.note } : null, docs: w.documents.filter(d => w.share.docs.includes(d.id)).map(d => ({ id: d.id, title: d.title, link: d.link, hasFile: !!d.file })) } : null, clientDecision: w.clientDecision,
      messages: w.messages.filter(m => m.channel === 'client'), updates: w.log.filter(l => l.aud === 'client').slice(0, 40).map(l => ({ t: l.t, text: l.text, who: l.who === 'System' ? 'ConstructReality' : l.who })),
      drawings: packageFor('client', files).filter(p => p.kind === 'drawing') };
  };
  app.get('/api/portal/projects', auth, clientOnly, (req, res) => {
    const list = mine(req).map(x => ({ ref: x.ref, client: summary(x.ref).client, date: summary(x.ref).date, superseded: x.w.supersededBy, steps: TRADES.map(t => x.w.steps[t].status), decision: x.w.manager.decision, proposal: !!x.w.share.at && x.w.clientDecision.status === 'pending' }));
    res.json({ projects: list, profile: acc.pub(acc.byId(req.user.id)) });
  });
  app.get('/api/portal/projects/:ref', auth, clientOnly, (req, res) => { const ref = req.params.ref; if (!validRef(ref)) return res.status(404).json({ error: 'Not found' }); const w = load(ref); if (!canSee(req, w)) return res.status(403).json({ error: 'Not your project.' }); w.seen[req.user.id] = now(); save(ref, w); res.json(clientView(ref, w)); });
  app.post('/api/portal/projects/:ref/decision', auth, clientOnly, limit(20, 60000), (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w)) return res.status(403).end(); if (!w.share.at) return res.status(409).json({ error: 'There is no proposal to answer yet.' });
    const status = req.body.status === 'accepted' ? 'accepted' : 'changes'; const note = clean(req.body.note, 600); if (status === 'changes' && !note) return res.status(400).json({ error: 'Tell us what you would like changed.' });
    w.clientDecision = { status, note, at: now() }; log(w, req.user.name, status === 'accepted' ? 'Client accepted the proposal.' : 'Client asked for changes: ' + note, 'client'); save(ref, w); res.json({ ok: true });
  });
  app.get('/api/portal/files/:ref/drawing/:file', auth, clientOnly, (req, res) => {
    const ref = req.params.ref; if (!validRef(ref)) return res.status(404).end(); const w = load(ref); if (!canSee(req, w)) return res.status(403).end();
    const name = req.params.file; if (!packageFor('client', listFiles(path.join(PROJ, ref), '')).some(p => p.file === name)) return res.status(403).end();
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:"); res.sendFile(path.join(PROJ, ref, ...name.split('__')));
  });

  /* ---------- website enquiries ---------- */
  const enqPath = path.join(DATA, 'enquiries.json');
  app.post('/api/public/enquiry', limit(5, 3600000), (req, res) => {
    const b = req.body || {}; if (b.website) return res.json({ ok: true });
    const name = clean(b.name, 80), email = clean(b.email, 100), msg = clean(b.message, 1500); if (!name || !msg) return res.status(400).json({ error: 'Please add your name and a message.' });
    if (!email && !clean(b.phone, 30)) return res.status(400).json({ error: 'Please give an email address or a phone number so we can reply.' });
    const all = readJson(enqPath) || []; all.unshift({ id: crypto.randomBytes(3).toString('hex'), t: now(), name, email, phone: clean(b.phone, 30), topic: clean(b.topic, 40), message: msg, handled: false }); fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(enqPath, JSON.stringify(all.slice(0, 500), null, 1));
    res.json({ ok: true });
  });
  app.get('/api/team/enquiries', auth, (req, res) => { if (!isOwner(req)) return res.status(403).end(); res.json({ enquiries: readJson(enqPath) || [] }); });
  app.post('/api/team/enquiries/:id', auth, (req, res) => { if (!isOwner(req)) return res.status(403).end(); const all = readJson(enqPath) || [], e = all.find(x => x.id === req.params.id); if (!e) return res.status(404).end(); e.handled = !!req.body.handled; fs.writeFileSync(enqPath, JSON.stringify(all, null, 1)); res.json({ ok: true }); });
  return { onNewProject, ROLES, TASKS };
};
