/* ConstructReality Studio - client app (WebXR for Meta Quest 3, also runs in a normal browser for testing).
   The headset only ever shows this app. The client designs rooms on one to three floors; the server draws walls, doors, windows,
   plumbing, electrical and lighting and creates the 2D plan package for the architect. The app furnishes, finishes and landscapes
   the home so the walk-through is a finished house. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { KINDS, SURFACES, COLOURS, material, plain, metricUV, thumb, defaultFloor } from './materials.js';
import { buildModel, registerGlb, GLOW, aliasModel } from './models.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ITEMS, FIXTURE_SLOTS, CATS, furnishLevel, roomSig, placeNew, rotOf, foot } from './catalog.js';
import { buildRoof, buildDoor, buildWindow, buildYard, DOOR_STYLES, WINDOW_STYLES, SHUTTERS, FENCES, veranda } from './exterior.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const H = 2.7, SLAB = 0.3;                              // wall height, floor thickness (m)
const elev = i => i * (H + SLAB);
const TYPES = {
  living: { n: 'Living room', def: [5, 4.5], min: [3.5, 3.5] }, dining: { n: 'Dining', def: [3.5, 3.5], min: [2.5, 2.5] },
  kitchen: { n: 'Kitchen', def: [3.5, 3.5], min: [2.5, 2.5] }, bedroom: { n: 'Bedroom', def: [3.5, 3.5], min: [2.8, 2.8] },
  bathroom: { n: 'Bathroom', def: [2, 2.5], min: [1.5, 2] }, laundry: { n: 'Laundry', def: [2, 2], min: [1.5, 1.5] },
  office: { n: 'Office', def: [3, 3], min: [2.5, 2.5] }, hall: { n: 'Hallway', def: [1.5, 3], min: [1, 1] },
  garage: { n: 'Garage', def: [3.5, 5.5], min: [3, 5] }, stairs: { n: 'Staircase', def: [1.5, 3.5], min: [1.5, 3.5] }
};
const PLOTS = { small: [14, 12], medium: [18, 14], large: [22, 16] };
const STEPS = ['plot', 'brief', 'build', 'utilities', 'finishes', 'exterior', 'furnish', 'walk', 'send'];
const LEVEL_NAMES = ['Ground floor', 'First floor', 'Second floor'];

const defaultExt = () => ({
  roof: { style: 'gable', k: 'cltile', c: 0xffffff, fc: 0xffffff, solar: false },
  door: { style: 'panel', k: 'doorpanel', c: 0x7a4a2b }, doorIn: { style: 'flush', k: 'paint', c: 0xf3ead8 }, garage: { c: 0xffffff },
  win: { style: 'sliding', fc: 0xffffff, glass: 'clear', shutters: 'none', sc: 0x25405e, grille: 'none' },
  fence: { style: 'wall', k: 'render', c: 0xf3ead8, pc: 0x4a4a4c }, drive: { k: 'pavers', c: 0xffffff }, path: { k: 'pavers', c: 0xffffff }, lawn: { k: 'grass', c: 0xffffff },
  garden: 'tropical', veranda: { on: true, fk: 'tile', fc: 0xffffff, cc: 0xffffff }, gardenLights: true, mailbox: true, tank: false
});
const newFin = () => ({ floor: {}, wallIn: {}, wallOut: {}, ceil: {}, counter: {} });

/* ---------------- state ---------------- */
const S = { step: 'welcome', name: '', shift: false, overlay: null, plot: { w: 18, d: 14 }, beds: 3, baths: 2, dining: true, laundry: true, office: false, garage: false, storeys: 1, budget: 'standard',
  levels: [{ rooms: [], A: null }], lv: 0, sel: null, layers: { plumb: false, elec: false, light: false }, mode: 'model', busy: false, aiText: '', aiNote: '', msg: '', msgAt: 0,
  flash: '', session: null, ref: '', claim: '', pin: '', pinBad: false, history: [], noteCount: 0, menu: true,
  fin: newFin(), finTab: 'floor', finScope: '_', finPage: 0, ext: defaultExt(), exTab: 'wallOut', doorScope: 'front',
  items: [], nid: 0, sigs: {}, typeFin: {}, selItem: null, fView: 'room', fRoom: null, fPage: 0, fCat: 'Seating', fSlot: null, styleAll: true, roofOn: true, cut: false, walkLv: 0, cove: false, customDefs: [] };
Object.defineProperty(S, 'rooms', { get() { return S.levels[S.lv].rooms; }, set(v) { S.levels[S.lv].rooms = v; }, enumerable: false });
Object.defineProperty(S, 'A', { get() { return S.levels[S.lv].A; }, set(v) { S.levels[S.lv].A = v; }, enumerable: false });
const save = () => { try { localStorage.setItem('crs2', JSON.stringify({ step: S.step, plot: S.plot, beds: S.beds, baths: S.baths, dining: S.dining, laundry: S.laundry, office: S.office, garage: S.garage, storeys: S.storeys, levels: S.levels.map(l => ({ rooms: l.rooms })), lv: S.lv, ref: S.ref, claim: S.claim, name: S.name, session: S.session, fin: S.fin, ext: S.ext, items: S.items, nid: S.nid, sigs: S.sigs, typeFin: S.typeFin, custom: S.customDefs, cove: S.cove })); } catch (e) { /* storage may be blocked */ } };
const BUILD = '2026-11-08a';
const api1 = (p, body) => fetch(p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(async r => { let j = null; try { j = await r.json(); } catch (e) {} if (!r.ok || !j) throw new Error((j && j.error) || ('HTTP ' + r.status)); return j; });
/* sending a design: tell the server whether the headset was on, and try again if the network drops */
const api = async (p, body) => {
  if (p !== '/api/projects' || !body) return api1(p, body);
  body = { ...body, via: (typeof inXR !== 'undefined' && inXR) ? 'vr' : 'screen', build: BUILD };
  let last;
  for (let i = 0; i < 3; i++) { try { return await api1(p, body); } catch (e) { last = e; if (!/Failed to fetch|NetworkError|Load failed|HTTP 5/i.test(String(e.message))) throw e; await new Promise(r => setTimeout(r, 1200 * (i + 1))); } }
  throw new Error('Could not reach ' + location.host + '. Check the internet on the headset and try again. (' + last.message + ')');
};
const allRoomsMax = () => Math.max(0, ...S.levels.flatMap(l => l.rooms.map(r => +String(r.id).slice(1) || 0)));

/* ---------------- renderer, scene ---------------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf3f3f1);
const camera = new THREE.PerspectiveCamera(60, 1, 0.03, 300);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
const hemi = new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 1.35); sun.position.set(-6, 14, 10); scene.add(sun);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); }
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08;

const stage = new THREE.Group(); scene.add(stage);           // holds the table and the model
const world = new THREE.Group(); stage.add(world);
const table = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.06, 48), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.5 })); stage.add(table);
const [roomsG, wallsG, fixG, plumbG, elecG, lightG, ceilG, labG, groundG, itemsG, doorsG, roofG] = Array.from({ length: 12 }, () => { const g = new THREE.Group(); world.add(g); return g; });
const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, o || {}));
const wallMat = M(0xf7f7f5), capMat = M(0x000000), glassMat = new THREE.MeshStandardMaterial({ color: 0xbfc7cc, transparent: true, opacity: 0.35, roughness: 0.1 });
const blackMat = M(0x050505), whiteMat = M(0xffffff);

function clearGroup(g) { while (g.children.length) { const c = g.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isSprite && o.material.map) o.material.map.dispose(); }); } }
function sprite(text, sub) {
  const cv = document.createElement('canvas'), c = cv.getContext('2d'), f = '700 30px Helvetica,Arial,sans-serif', f2 = '400 24px Helvetica,Arial,sans-serif';
  c.font = f; let w = Math.ceil(c.measureText(text).width); if (sub) { c.font = f2; w = Math.max(w, Math.ceil(c.measureText(sub).width)); }
  cv.width = w + 36; cv.height = sub ? 84 : 52; c.fillStyle = 'rgba(0,0,0,.9)'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.font = f; c.fillText(text, 18, sub ? 26 : 27); if (sub) { c.font = f2; c.fillText(sub, 18, 62); }
  const t = new THREE.CanvasTexture(cv); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true })); s.renderOrder = 10;
  s.userData = { w: cv.width, h: cv.height }; return s;
}

/* ---------------- finishes: what the client chose, with sensible starting materials ---------------- */
const FIN_DEFAULT = { wallIn: { k: 'paint', c: 0xf3ead8 }, wallOut: { k: 'render', c: 0xf3ead8 }, ceil: { k: 'paint', c: 0xffffff }, counter: { k: 'granite', c: 0xffffff } };
function finPick(surf, id, type) {
  const m = S.fin[surf] || {}, f = (id && m[id]) || m._;
  if (f) return f;
  if (surf === 'floor') return { k: defaultFloor(type), c: 0xffffff };
  return FIN_DEFAULT[surf];
}
const slabMat = material('exconcrete', 0xd6d6d4);

/* the finish of one slot of one item: this item, else all of its type, else the catalogue default */
function slotFin(it, name) {
  const spec = ITEMS[it.type]; if (!spec) return { k: 'paint', c: 0x888888 };
  if (name === 'top' && (it.type === 'kcab')) { const f = finPick('counter'); return f; }
  return (it.fin && it.fin[name]) || (S.typeFin[it.type] && S.typeFin[it.type][name]) || spec.slots[name].def;
}
const slotsOf = (it) => { const o = {}; Object.keys(ITEMS[it.type].slots).forEach(n => { o[n] = slotFin(it, n); }); return o; };
const FIXTURE_DIMS = { toilet: 1, basin: 1, shower: 1, ksink: 1, cooker: 1, fridge: 1, counter: 1, washer: 1, lsink: 1 };
function fixtureSlots(f) {
  const top = finPick('counter'), s = FIXTURE_SLOTS[f.kind] || {}, o = {};
  Object.keys(s).forEach(n => { o[n] = n === 'top' ? top : s[n].def; });
  if (f.kind === 'basin') { o.body = (S.typeFin.basin && S.typeFin.basin.body) || s.body.def; }
  return o;
}

/* ---------------- build the 3D model from the server analysis ---------------- */
function visibility() {
  const n = S.levels.length, edit = ['plot', 'brief', 'build', 'utilities', 'finishes'].includes(S.step);
  let maxL = n - 1, roof = S.roofOn;
  if (edit || S.step === 'furnish' || S.cut) { maxL = S.lv; roof = false; }
  if (S.mode === 'walk' || S.step === 'welcome' || S.step === 'send' || S.step === 'done') { maxL = n - 1; roof = true; }
  return { maxL, roof };
}
function buildStairs(parent, r, rise, floorMat, hasUp) {
  if (!hasUp) return;
  const n = 16, rs = rise / n, y0 = 0.06, fw = r.w / 2 - 0.08, run = 0.3, z0 = r.z + 0.5, mat = floorMat;
  const step = (x0, x1, za, zb, top) => { const b = new THREE.Mesh(metricUV(new THREE.BoxGeometry(x1 - x0, top, zb - za), x1 - x0, top, zb - za), mat); b.position.set((x0 + x1) / 2, y0 + top / 2, (za + zb) / 2); parent.add(b); };
  for (let k = 0; k < 8; k++) step(r.x + 0.05, r.x + 0.05 + fw, z0 + k * run, z0 + (k + 1) * run, (k + 1) * rs);
  step(r.x + 0.05, r.x + r.w - 0.05, z0 + 8 * run, r.z + r.d - 0.05, 8 * rs);
  for (let k = 0; k < 8; k++) step(r.x + r.w - 0.05 - fw, r.x + r.w - 0.05, z0 + 8 * run - (k + 1) * run, z0 + 8 * run - k * run, (9 + k) * rs);
  const rm = plain(0x1a1a1a, 0.4, 0.6);                              // handrail on the open side of the first flight
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 8 * run), rm); rail.position.set(r.x + 0.05 + fw + 0.02, y0 + 4 * rs + 0.95, z0 + 4 * run); rail.rotation.x = -Math.atan2(8 * rs, 8 * run); parent.add(rail);
}
function buildLevel(L, i) {
  const A = L.A, top = S.levels.length - 1, y0 = elev(i), isStairsUp = i < top;
  const sub = (g) => { const s = new THREE.Group(); s.position.y = y0; g.add(s); return s; };
  const gR = sub(roomsG), gW = sub(wallsG), gF = sub(fixG), gP = sub(plumbG), gE = sub(elecG), gL = sub(lightG), gC = sub(ceilG), gB = sub(labG), gI = sub(itemsG), gD = sub(doorsG);
  const rooms = A.design.rooms, roomAt = (x, z) => rooms.find(r => x > r.x + 1e-6 && x < r.x + r.w - 1e-6 && z > r.z + 1e-6 && z < r.z + r.d - 1e-6);
  const E = S.ext;
  rooms.forEach(r => {
    const sel = r.id === S.sel && i === S.lv, fl = finPick('floor', r.id, r.type), topMat = material(fl.k, fl.c, { glow: sel });
    const stairsUpper = r.type === 'stairs' && i > 0;
    const th = i > 0 ? 0.36 : 0.06, yc = i > 0 ? -0.12 : 0.03;
    const rd = stairsUpper ? 0.5 : r.d, zc = stairsUpper ? r.z + 0.25 : r.z + r.d / 2;
    const geo = metricUV(new THREE.BoxGeometry(r.w, th, rd), r.w, th, rd);
    const f = new THREE.Mesh(geo, [slabMat, slabMat, topMat, slabMat, slabMat, slabMat]); f.position.set(r.x + r.w / 2, yc, zc); f.userData.roomId = r.id; f.userData.level = i; f.name = 'floor'; gR.add(f);
    if (r.type === 'stairs') { buildStairs(gF, r, elev(1), material(fl.k, fl.c), isStairsUp); }
    if (sel) for (const [w, d, x, z] of [[r.w, 0.12, r.x + r.w / 2, r.z], [r.w, 0.12, r.x + r.w / 2, r.z + r.d], [0.12, r.d, r.x, r.z + r.d / 2], [0.12, r.d, r.x + r.w, r.z + r.d / 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), blackMat); b.position.set(x, 0.08, z); gR.add(b); }
    if (!(r.type === 'stairs' && isStairsUp)) {                          // open stairwell: no ceiling above the stairs
      const cf = finPick('ceil'), cg = new THREE.PlaneGeometry(r.w, r.d), cuv = cg.attributes.uv; for (let q = 0; q < cuv.count; q++) cuv.setXY(q, cuv.getX(q) * r.w, cuv.getY(q) * r.d);
      const c = new THREE.Mesh(cg, material(cf.k, cf.c)); c.rotation.x = Math.PI / 2; c.position.set(r.x + r.w / 2, H - 0.015, r.z + r.d / 2); gC.add(c);
      if (S.cove && !['bathroom', 'hall', 'stairs', 'laundry', 'garage'].includes(r.type) && r.w >= 2.4 && r.d >= 2.4) {      // tray ceiling with a warm glowing edge, like a modern show home
        const band = material(cf.k, cf.c), lip = 0.24, cx = r.x + r.w / 2, cz = r.z + r.d / 2;
        for (const [w, d, x, z] of [[r.w, lip, cx, r.z + lip / 2], [r.w, lip, cx, r.z + r.d - lip / 2], [lip, r.d - 2 * lip, r.x + lip / 2, cz], [lip, r.d - 2 * lip, r.x + r.w - lip / 2, cz]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), band); b.position.set(x, H - 0.07, z); gC.add(b); }
        for (const [w, d, x, z] of [[r.w - 2 * lip, 0.045, cx, r.z + lip + 0.025], [r.w - 2 * lip, 0.045, cx, r.z + r.d - lip - 0.025], [0.045, r.d - 2 * lip, r.x + lip + 0.025, cz], [0.045, r.d - 2 * lip, r.x + r.w - lip - 0.025, cz]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), GLOW); b.position.set(x, H - 0.125, z); b.userData.noShadow = true; gC.add(b); }
        if (S.mode === 'walk' && !(typeof inXR !== 'undefined' && inXR) && glowN < 60) { glowN++; const L = new THREE.PointLight(0xffd9a0, 3.2, Math.max(r.w, r.d) * 1.3, 2); L.position.set(cx, H - 0.35, cz); L.visible = glowN <= 12; glowLights.push(L); gC.add(L); }
      }
    }
    const s = sprite(r.label, `${r.w} x ${r.d} m`); s.position.set(r.x + r.w / 2, 3.1, r.z + r.d / 2); gB.add(s);
  });
  /* walls: the room's own finish inside, the outside finish outside */
  const faceMat = (r) => { const f = r ? finPick('wallIn', r.id, r.type) : finPick('wallOut'); return material(f.k, f.c); };
  A.walls.forEach(w => {
    const horiz = w.ori === 'h', t = w.ext ? 0.2 : 0.1;
    const a0 = horiz ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2), a1 = horiz ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2), fixed = horiz ? w.z1 : w.x1;
    const ops = [...A.doors, ...A.windows].filter(o => o.wall === w.id).map(o => ({ a0: (horiz ? o.x : o.z) - o.w / 2, a1: (horiz ? o.x : o.z) + o.w / 2, b0: o.kind === 'door' ? 0 : o.sill, b1: o.kind === 'door' ? (o.hgt || 2.1) : o.head, glass: o.kind === 'window' })).sort((p, q) => p.a0 - q.a0);
    const box = (s, e, y0_, y1, mat, th) => {
      if (e - s < 1e-3 || y1 - y0_ < 1e-3) return; const tt = th || t, bw = horiz ? e - s : tt, bh = y1 - y0_, bd = horiz ? tt : e - s, mid = (s + e) / 2;
      let mm = mat;
      if (mat === wallMat) {
        const rN = horiz ? roomAt(mid, fixed - 0.3) : roomAt(fixed - 0.3, mid), rP = horiz ? roomAt(mid, fixed + 0.3) : roomAt(fixed + 0.3, mid);
        const mN = faceMat(rN), mP = faceMat(rP), mE = (!rN || !rP) ? faceMat(null) : mP;
        mm = horiz ? [mE, mE, mE, mE, mP, mN] : [mP, mN, mE, mE, mE, mE];
      }
      const geo = (mat === wallMat) ? metricUV(new THREE.BoxGeometry(bw, bh, bd), bw, bh, bd) : new THREE.BoxGeometry(bw, bh, bd);
      const m = new THREE.Mesh(geo, mm); m.position.set(horiz ? (s + e) / 2 : fixed, (y0_ + y1) / 2, horiz ? fixed : (s + e) / 2); gW.add(m);
    };
    let cur = a0;
    for (const o of ops) { box(cur, o.a0, 0, H, wallMat); box(o.a0, o.a1, 0, o.b0, wallMat); box(o.a0, o.a1, o.b1, H, wallMat); cur = o.a1; }
    box(cur, a1, 0, H, wallMat); box(a0, a1, H, H + 0.05, capMat, t + 0.02);
    if (i > 0 && w.ext) box(a0, a1, -SLAB, 0, wallMat);                   // the floor edge shows as a band on the outside
  });
  /* doors and windows */
  const outwardRot = (o) => {
    const horiz = o.ori === 'h', pos = horiz ? roomAt(o.x, o.z + 0.3) : roomAt(o.x + 0.3, o.z), neg = horiz ? roomAt(o.x, o.z - 0.3) : roomAt(o.x - 0.3, o.z);
    if (horiz) return (pos && !neg) ? Math.PI : 0; return (pos && !neg) ? -Math.PI / 2 : Math.PI / 2;
  };
  A.doors.forEach(o => {
    const th = o.ext ? 0.2 : 0.1, h = o.hgt || 2.1, horiz = o.ori === 'h', rot = outwardRot(o), trim = M(0xf2f2f0);
    const jx = (dx, dy, dz, w, hh, d) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), trim); b.position.set(o.x + dx, dy, o.z + dz); gD.add(b); };
    if (horiz) { jx(-o.w / 2 - 0.03, h / 2, 0, 0.06, h, th + 0.04); jx(o.w / 2 + 0.03, h / 2, 0, 0.06, h, th + 0.04); jx(0, h + 0.03, 0, o.w + 0.12, 0.06, th + 0.04); } else { jx(0, h / 2, -o.w / 2 - 0.03, th + 0.04, h, 0.06); jx(0, h / 2, o.w / 2 + 0.03, th + 0.04, h, 0.06); jx(0, h + 0.03, 0, th + 0.04, 0.06, o.w + 0.12); }
    if (o.garage) { const lf = buildDoor('panel', o.w, h, { k: 'paint', c: E.garage.c }, true); const ax = [Math.cos(rot), -Math.sin(rot)]; lf.position.set(o.x - ax[0] * o.w / 2, 0, o.z - ax[1] * o.w / 2); lf.rotation.y = rot; gD.add(lf); return; }
    const style = o.ext ? E.door : E.doorIn, lf = buildDoor(style.style, o.w - 0.02, h - 0.02, style);
    const ax = horiz ? [1, 0] : [0, 1];
    if (o.ext) { const a2 = [Math.cos(rot), -Math.sin(rot)]; lf.position.set(o.x - a2[0] * (o.w - 0.02) / 2, 0.01, o.z - a2[1] * (o.w - 0.02) / 2); lf.rotation.y = rot; }
    else {                                                              // inside doors stand open so the home can be seen
      const toRoom = A.design.rooms[o.rooms[1]]; const c = toRoom ? (horiz ? toRoom.z + toRoom.d / 2 : toRoom.x + toRoom.w / 2) : 0, fix = horiz ? o.z : o.x, sgn = c >= fix ? 1 : -1;
      lf.position.set(o.x - ax[0] * (o.w - 0.02) / 2, 0.01, o.z - ax[1] * (o.w - 0.02) / 2); lf.rotation.y = horiz ? -sgn * Math.PI / 2 : (sgn > 0 ? 0 : Math.PI);
    }
    gD.add(lf);
  });
  A.windows.forEach(o => {
    const th = 0.2, w = buildWindow(o.w - 0.1, o.head - o.sill, E.win, th); w.position.set(o.x, o.sill, o.z); w.rotation.y = outwardRot(o); gD.add(w);
  });
  /* fixtures: the plumbed ones from the server, finished with the client's counters */
  A.fixtures.forEach(f => {
    if (!FIXTURE_DIMS[f.kind]) return; const rot = (f.nx || f.nz) ? rotOf(f.nx, f.nz) : 0, sw = rot % 180 === 90;
    const g = buildModel(f.kind, { w: sw ? f.d : f.w, d: sw ? f.w : f.d, h: f.h }, fixtureSlots(f)); g.position.set(f.x, 0.06, f.z); g.rotation.y = rot * Math.PI / 180; gF.add(g);
  });
  /* furniture and decor */
  S.items.filter(it => it.level === i && ITEMS[it.type] && (S.mode === 'walk' || !['plot', 'brief', 'build', 'utilities'].includes(S.step))).forEach(it => {
    const g = buildModel(it.type, { w: it.w, d: it.d, h: it.h }, slotsOf(it), it.v || (parseInt(String(it.id).replace(/\D/g, "")) || 1)); g.position.set(it.x, (it.roomId === 'yard' ? 0 : 0.06) + (it.y || 0), it.z); g.rotation.y = it.rot * Math.PI / 180; g.userData.itemId = it.id; gI.add(g); addGlow(it, gI);
    if (it.id === S.selItem) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(it.w + 0.06, Math.max(it.h, 0.1) + 0.06, it.d + 0.06)), new THREE.LineBasicMaterial({ color: 0x000000, depthTest: false })); e.position.y = Math.max(it.h, 0.1) / 2; e.renderOrder = 20; g.add(e); }
  });
  /* recessed ceiling lights, always visible */
  const lm = new THREE.MeshBasicMaterial({ color: 0xfff6dc });
  A.mep.lights.forEach(l => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14), lm); m.position.set(l.x, H - 0.03, l.z); gC.add(m); });
  /* services layers */
  const edge = new THREE.LineBasicMaterial({ color: 0x000000 });
  A.mep.lights.forEach(l => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.position.set(l.x, 2.55, l.z); gL.add(m); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), blackMat); ring.rotation.x = Math.PI / 2; ring.position.copy(m.position); gL.add(ring); });
  A.mep.switches.forEach(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), blackMat); m.position.set(s.x, 1.2, s.z); gL.add(m); });
  A.mep.outlets.forEach(o => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), blackMat); m.position.set(o.x, 0.3, o.z); gE.add(m); });
  A.mep.acs.forEach(a => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.25), blackMat); m.position.set(a.x, 2.2, a.z); gE.add(m); });
  (A.mep.dedicated || []).forEach(d => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 8), blackMat); m.position.set(d.x, 1.0, d.z); gE.add(m); });
  if (A.mep.db) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.2), blackMat); m.position.set(A.mep.db.x, 1.5, A.mep.db.z); gE.add(m); const s = sprite('Power board'); s.position.set(A.mep.db.x, 2.1, A.mep.db.z); s.userData.small = true; gE.add(s); }
  const style = { cold: [0x777777, 0.06, 0.3], hot: [0xffffff, 0.06, 0.5], drain: [0x000000, 0.1, 0.12] }, up = new THREE.Vector3(0, 1, 0);
  A.mep.pipes.forEach(p => {
    const [col, r, y] = style[p.kind];
    for (let q = 1; q < p.pts.length; q++) {
      const a = new THREE.Vector3(p.pts[q - 1][0], y, p.pts[q - 1][1]), b = new THREE.Vector3(p.pts[q][0], y, p.pts[q][1]); const len = a.distanceTo(b); if (len < 0.01) continue;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), M(col, { roughness: 0.5 })); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()); gP.add(m);
      if (p.kind === 'hot') { const o = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, len * 0.5, 8), M(0x000000)); o.position.copy(m.position); o.quaternion.copy(m.quaternion); gP.add(o); }
    }
  });
  const P = A.mep.plumbing;
  [[P.meter, 'Water meter'], [P.heater, 'Water heater'], [P.sewer, 'Drain outlet']].forEach(([pt, t]) => { if (!pt) return; const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), blackMat); m.position.set(pt.x, 0.3, pt.z); gP.add(m); const s = sprite(t); s.position.set(pt.x, 1.1, pt.z); s.userData.small = true; gP.add(s); });
}
function rebuild() {
  glowN = 0; glowLights.length = 0;
  [roomsG, wallsG, fixG, plumbG, elecG, lightG, ceilG, labG, groundG, itemsG, doorsG, roofG].forEach(clearGroup);
  const L0 = S.levels[0].A; if (!L0) return;
  const { plot } = L0.design, v = visibility();
  S.levels.forEach((L, i) => { if (L.A && i <= v.maxL) buildLevel(L, i); });
  /* yard: ground, road, fence, drive, planting */
  const fd = L0.doors.find(d => d.front), gd = L0.doors.find(d => d.garage);
  groundG.add(buildYard({ wide: S.mode === 'walk', plot, rooms: L0.design.rooms, frontDoor: fd ? { x: fd.x, z: fd.z } : null, garageDoor: gd ? { x: gd.x, z: gd.z, w: gd.w } : null }, S.ext));
  const bp = [[0, 0], [plot.w, 0], [plot.w, plot.d], [0, plot.d]].map(p => new THREE.Vector3(p[0], 0.03, p[1]));
  groundG.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(bp), new THREE.LineBasicMaterial({ color: 0x000000 })));
  const street = sprite('STREET'); street.userData.street = true; street.position.set(plot.w / 2, 0.6, plot.d + 7.8); labG.add(street);
  if (v.roof) { const fm = finPick('wallOut'); roofG.add(buildRoof(S.levels.filter(l => l.A).map(l => ({ rooms: l.A.design.rooms })), elev, H, S.ext, material(fm.k, fm.c))); }
  if (S.mode === 'walk') [roomsG, wallsG, fixG, ceilG, itemsG, doorsG, groundG, roofG].forEach(mergeGroup);
  applyMode(); applyLayers(); polish();
}
/* soft environment reflections, and shadows when walking: casters and receivers are set after every rebuild */
/* real light from lamps while walking on a computer (not in the headset, where it would be too slow) */
const LAMPS = { pendant: 0.4, chandelier: 0.4, chand_crystal: 0.4, chand_modern: 0.4, chand_rustic: 0.4, pendant_cluster: 0.25, downlight: 'c', domelight: 'c', tracklight: 'c', sconce: 0.5, inwall: 0.5, picturelight: 0.5, floorlamp: 0.85, tablelamp: 0.7, bollard: 0.7, postlamp: 0.88, floodlight: 0.97, stringlights: 0.9, lantern: 0.85 };
let glowN = 0; const glowLights = [];
function addGlow(it, parent) {
  const v = LAMPS[it.type]; if (v === undefined || S.mode !== 'walk' || (typeof inXR !== 'undefined' && inXR) || glowN >= 60) return;
  glowN++; const out = it.roomId === 'yard', L = new THREE.PointLight(0xffe0a8, out ? 7 : 5.5, out ? 7 : 6, 2);
  L.position.set(it.x, (out ? 0 : 0.06) + (it.y || 0) + (v === 'c' ? it.h - 0.25 : it.h * v), it.z); L.userData.glow = true; L.visible = glowN <= 12; glowLights.push(L); parent.add(L);
}
function polish() {
  const walk = S.mode === 'walk';
  world.traverse(o => {
    if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(m => { if (m && m.isMeshStandardMaterial && m.envMapIntensity !== 0.35) m.envMapIntensity = 0.35; });
    const sky = o.parent === ceilG || o.parent === roofG || o.userData.noShadow;
    o.castShadow = walk && !sky && !ms.some(m => m && m.transparent); o.receiveShadow = walk;
  });
}

/* walking mode: fuse the static geometry of each group into one mesh per material, so the headset draws far fewer objects */
function mergeGroup(g) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), buckets = new Map(), meshes = [];
  g.traverse(o => { if (o.isMesh) meshes.push(o); });
  meshes.forEach(m => {
    const geo0 = m.geometry, rel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), multi = Array.isArray(m.material);
    const ng = geo0.index ? geo0.toNonIndexed() : geo0.clone(), n = ng.attributes.position.count;
    const parts = multi ? ng.groups.map(gr => ({ mat: m.material[gr.materialIndex], start: gr.start, count: gr.count })) : [{ mat: m.material, start: 0, count: n }];
    parts.forEach(pt => {
      if (!pt.mat || pt.count <= 0) return; const pg = new THREE.BufferGeometry();
      ['position', 'normal', 'uv'].forEach(nm => { const a = ng.attributes[nm]; if (a) pg.setAttribute(nm, new THREE.BufferAttribute(a.array.slice(pt.start * a.itemSize, (pt.start + pt.count) * a.itemSize), a.itemSize)); else if (nm === 'uv') pg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pt.count * 2), 2)); });
      if (!pg.attributes.normal) pg.computeVertexNormals();
      pg.applyMatrix4(rel); let b = buckets.get(pt.mat.uuid); if (!b) { b = { mat: pt.mat, list: [] }; buckets.set(pt.mat.uuid, b); } b.list.push(pg);
    });
    ng.dispose();
  });
  meshes.forEach(m => { if (m.parent) m.parent.remove(m); m.geometry.dispose(); });
  buckets.forEach(b => { const merged = mergeGeometries(b.list, false); b.list.forEach(x => x.dispose()); if (merged) g.add(new THREE.Mesh(merged, b.mat)); });
}
function applyLayers() { plumbG.visible = S.layers.plumb; elecG.visible = S.layers.elec; lightG.visible = S.layers.light; }


/* custom model library: real .glb models listed in /library/library.json join the catalogue */
async function loadLibrary(done) {
  try {
    const r = await fetch('/library/library.json'); if (!r.ok) return; const j = await r.json(); const list = (j.items || []).filter(x => x.type && x.file); if (!list.length) return;
    const loader = new GLTFLoader(); let n = 0;
    await Promise.all(list.map(x => new Promise(res => loader.load('/library/' + x.file, gl => {
      const cat = x.cat || 'Decor'; if (!CATS.includes(cat)) CATS.push(cat);
      ITEMS[x.type] = { n: x.name || x.type, cat, w: x.w || 1, d: x.d || 1, h: x.h || 1, a: x.place || 'free', slots: {} };
      gl.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); registerGlb(x.type, gl.scene); n++; res();
    }, undefined, () => res()))));
    if (n && done) done();
  } catch (err) { /* no library: fine */ }
}

/* ---------------- modes: table-top model, or walk inside at full size ---------------- */
let inXR = false, lastMode = null;
function entryPoint() { const A = S.levels[0].A; const d = A && (A.doors.find(x => x.front) || A.doors[0]); return d ? { x: d.x, z: d.z } : { x: S.plot.w / 2, z: S.plot.d - 1 }; }
function applyMode() {
  const walk = S.mode === 'walk', changed = lastMode !== S.mode; lastMode = S.mode;
  const A0 = S.levels[0].A, pw = A0 ? A0.design.plot.w : S.plot.w, pd = A0 ? A0.design.plot.d : S.plot.d;
  table.visible = !walk; ceilG.visible = walk; groundG.visible = true;
  const k = walk ? 0.0045 : 0.012;
  labG.traverse(s => { if (s.isSprite) { const sm = s.userData.small || s.userData.street; s.scale.set(s.userData.w * k * (sm ? 0.8 : 1), s.userData.h * k * (sm ? 0.8 : 1), 1); s.visible = !walk; } });
  [plumbG, elecG].forEach(g => g.traverse(s => { if (s.isSprite) s.scale.set(s.userData.w * k * 0.8, s.userData.h * k * 0.8, 1); }));
  scene.background.set(walk ? 0xcfe3ef : 0xf3f3f1); hemi.color.set(walk ? 0xf4f8ff : 0xffffff); hemi.groundColor.set(walk ? 0xe6e1d8 : 0x9a9a9a); hemi.intensity = walk ? 1.6 : 1.35;
  sun.castShadow = walk;
  if (walk) { world.add(sun); world.add(sun.target); sun.position.set(pw / 2 - 14, 34, pd / 2 + 18); sun.target.position.set(pw / 2, 0, pd / 2); const c = sun.shadow.camera; c.left = -Math.max(pw, pd) * 0.9 - 8; c.right = -c.left; c.top = c.right; c.bottom = c.left; c.near = 1; c.far = 90; c.updateProjectionMatrix(); sun.shadow.needsUpdate = true; }
  else { scene.add(sun); sun.position.set(-6, 14, 10); sun.target.position.set(0, 0, 0); }
  if (walk) {
    world.scale.setScalar(1); const e = entryPoint(); stage.position.set(0, 0, 0);
    if (changed) { S.walkLv = 0; S.walkSp = null; rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); if (!inXR) { camera.position.set(0, 1.6, 0); controls.target.set(0, 1.6, -1); controls.update(); } }
    if (inXR) world.position.set(-e.x, 0, -(e.z - 1.3));                         // headset: the rig moves
    else { const sp = S.walkSp || { x: e.x, y: 0, z: e.z - 1.3 }; world.position.set(-sp.x, -sp.y, -sp.z); }   // computer: the house moves around the viewer
  } else {
    const s = Math.min(1.0 / Math.max(pw, pd), 0.06); world.scale.setScalar(s);
    stage.position.set(inXR || PRO ? 0 : 1.2, 0, 0); world.position.set(-pw * s / 2, 0.89, -1.25 - pd * s / 2);
    const tr = Math.hypot(pw, pd) / 2 * s + 0.1; table.scale.set(tr, 1, tr); table.position.set(0, 0.85, -1.25);
    if (changed || true) { rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); }
    if (!inXR && changed) { camera.position.set(PRO ? 0 : 0.75, PRO ? 2.3 : 1.75, PRO ? 0.7 : 0.15); controls.target.set(PRO ? 0 : 0.75, 0.88, -1.25); controls.update(); }
  }
  placePanel();
}
/* walking: jump to another floor (next to the stairs), or look at the house from the street */
let planArea = null, planDrag = null;                       // the mini floor plan on the walk screen, and the dot being dragged
function walkHere() { const v = new THREE.Vector3(); camera.getWorldPosition(v); const l = world.worldToLocal(v); return { x: l.x, z: l.z }; }
function walkToXZ(lv, px, pz, yaw) {
  const e = entryPoint(), y = elev(lv); S.walkLv = lv;
  if (inXR) {
    if (yaw === undefined) { const cur = new THREE.Vector3(); camera.getWorldPosition(cur); const t = world.localToWorld(new THREE.Vector3(px, y, pz)); rig.position.x += t.x - cur.x; rig.position.z += t.z - cur.z; rig.position.y = y; }
    else { rig.position.set(px - e.x, y, pz - (e.z - 1.3)); rig.rotation.set(0, yaw, 0); }
  } else { S.walkSp = { x: px, y, z: pz }; world.position.set(-px, -y, -pz); camera.position.set(0, 1.6, 0); controls.target.set(0, 1.6, -1); controls.update(); }
}
function walkTo(where) {
  const e = entryPoint(), A0 = S.levels[0].A; if (!A0) return;
  if (where === 'street') { walkToXZ(0, A0.design.plot.w / 2, A0.design.plot.d + 12, 0); return; }
  if (where === 'garden') { const rs = A0.design.rooms, pl = A0.design.plot, zmin = Math.min(...rs.map(r => r.z)), zmax = Math.max(...rs.map(r => r.z + r.d)); walkToXZ(0, pl.w / 2, zmin > 2.5 ? zmin / 2 : (zmax + pl.d) / 2, 0); return; }
  const li = +where, A = S.levels[li] && S.levels[li].A; let px, pz;
  if (li === 0 || !A) { px = e.x; pz = e.z - 1.3; }
  else {                                                                     // stand in the room beside the stairs
    const rooms = A.design.rooms, si = rooms.findIndex(r => r.type === 'stairs'), dr = A.doors.find(d => d.rooms.includes(si)), oi = dr ? dr.rooms.find(q => q !== si) : -1, rm = rooms[oi] || rooms.find(r => r.type !== 'stairs');
    if (rm) { px = rm.x + rm.w / 2; pz = rm.z + rm.d / 2; } else { px = e.x; pz = e.z - 1.3; }
  }
  walkToXZ(li, px, pz, 0);
}
/* jump to the middle of any room on any floor */
function walkToRoom(lv, id) { const A = S.levels[lv] && S.levels[lv].A, r = A && A.design.rooms.find(q => q.id === id); if (r) walkToXZ(lv, r.x + r.w / 2, r.z + r.d / 2); }
function nearestRoom(lv, X, Z) {
  const A = S.levels[lv] && S.levels[lv].A; if (!A) return null; let best = null, bd = 1e9;
  for (const r of A.design.rooms) { const dx = Math.max(r.x - X, 0, X - (r.x + r.w)), dz = Math.max(r.z - Z, 0, Z - (r.z + r.d)), d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = r; } }
  return best;
}

/* ---------------- the floating guide panel ---------------- */
const logoW = new Image(); logoW.src = '/logo_white.png'; logoW.onload = () => draw();
const logoB = new Image(); logoB.src = '/logo_black.png'; logoB.onload = () => draw();
const pcv = document.createElement('canvas'); pcv.width = pcv.height = 1024; const g = pcv.getContext('2d');
const ptex = new THREE.CanvasTexture(pcv); ptex.colorSpace = THREE.SRGBColorSpace; ptex.anisotropy = 8;
const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: ptex, transparent: true })); panel.name = 'panel';
let buttons = [], hover = null;
const FONT = 'Helvetica,Arial,sans-serif';
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function txt(s, x, y, o) {
  o = o || {}; const size = o.size || 30; g.font = `${o.weight || 400} ${size}px ${FONT}`; g.fillStyle = o.color || '#000'; g.textAlign = o.align || 'left'; g.textBaseline = 'top';
  const maxW = o.maxW || 940, lh = o.lh || size * 1.25, words = String(s).split(' '); let line = '', yy = y, lines = 0;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); yy += lh; line = w; lines++; if (o.maxLines && lines >= o.maxLines) return yy; } else line = t; }
  g.fillText(line, x, yy); return yy + lh;
}
function btn(id, label, x, y, w, h, o) {
  o = o || {}; const dis = o.disabled, dark = o.dark || o.sel, hv = hover === id && !dis;
  rr(x, y, w, h, 10); g.fillStyle = dis ? '#e6e6e6' : dark ? (hv ? '#333' : '#000') : (hv ? '#e4e4e4' : '#fff'); g.fill(); g.lineWidth = 4; g.strokeStyle = dis ? '#aaa' : '#000'; g.stroke();
  g.font = `${o.weight || 700} ${o.size || 28}px ${FONT}`; g.fillStyle = dis ? '#999' : dark ? '#fff' : '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const parts = String(label).split('\n'); parts.forEach((p, i) => g.fillText(p, x + w / 2, y + h / 2 + (i - (parts.length - 1) / 2) * (o.size || 28) * 1.15));
  if (!dis) buttons.push({ id, x, y, w, h });
}
const thumbCache = new Map();
function thumbOf(kind, c) { const k = kind + '|' + c; if (!thumbCache.has(k)) thumbCache.set(k, thumb(kind, c)); return thumbCache.get(k); }
function matBtn(id, kind, tint, label, x, y, w, h, on) {
  const hv = hover === id; rr(x, y, w, h, 10); g.fillStyle = '#fff'; g.fill();
  g.save(); rr(x, y, w, h, 10); g.clip(); const th = h - 34; g.drawImage(thumbOf(kind, tint), 0, 0, 128, Math.max(8, Math.round(128 * th / w)), x, y, w, th); if (hv) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y, w, th); } g.restore();
  g.fillStyle = on ? '#000' : '#fff'; g.fillRect(x, y + th, w, h - th); g.font = `700 19px ${FONT}`; g.fillStyle = on ? '#fff' : '#000'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x + w / 2, y + th + (h - th) / 2 + 1);
  rr(x, y, w, h, 10); g.lineWidth = on ? 8 : 3; g.strokeStyle = '#000'; g.stroke(); buttons.push({ id, x, y, w, h });
}
function swatches(y, cur, prefix, h) {
  h = h || 62; COLOURS.forEach(([n, c], i) => {
    const x = 50 + i * 77, on = cur === c, hv = hover === prefix + i; rr(x, y, 70, h, 10); g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.fill();
    if (hv) { g.fillStyle = 'rgba(0,0,0,0.15)'; g.fill(); } g.lineWidth = on ? 8 : 3; g.strokeStyle = '#000'; g.stroke();
    if (i === 0) { g.font = `700 15px ${FONT}`; g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Natural', x + 35, y + h / 2); }
    buttons.push({ id: prefix + i, x, y, w: 70, h });
  });
}
const colourName = (c) => (COLOURS.find(x => x[1] === c) || ['Custom'])[0];
function kindRow(y, kinds, cur, prefix, tint, h, perRow) {
  perRow = perRow || 4; const w = Math.floor((924 - (perRow - 1) * 8) / perRow);
  kinds.forEach((k, i) => matBtn(prefix + k, k, k === cur ? tint : 0xffffff, KINDS[k].n, 50 + (i % perRow) * (w + 8), y + Math.floor(i / perRow) * (h + 8), w, h, cur === k));
  return y + Math.ceil(kinds.length / perRow) * (h + 8);
}
function optRow(y, opts, cur, prefix, h, size, perRow) {
  perRow = perRow || opts.length; const w = Math.floor((924 - (perRow - 1) * 8) / perRow);
  opts.forEach(([v, l], i) => btn(prefix + v, l, 50 + (i % perRow) * (w + 8), y + Math.floor(i / perRow) * (h + 8), w, h, { sel: cur === v, size: size || 22 }));
  return y + Math.ceil(opts.length / perRow) * (h + 8);
}
function levelBar(y, small) {
  const n = S.levels.length; if (n < 2) return;
  const w = small ? 160 : Math.floor((924 - (n - 1) * 8) / n), x0 = small ? 974 - n * 168 + 8 : 50;
  S.levels.forEach((l, i) => btn('lvl:' + i, small ? ['Ground', 'First', 'Second'][i] : LEVEL_NAMES[i], x0 + i * (w + 8), y, w, small ? 42 : 46, { sel: S.lv === i, size: small ? 20 : 22 }));
}

function tip() {
  if (S.msg && Date.now() - S.msgAt < 45000) return 'Message from your designer: ' + S.msg;
  if (S.flash) return S.flash;
  const A = S.A, sel = A && A.design.rooms.find(r => r.id === S.sel);
  switch (S.step) {
    case 'welcome': return 'Welcome. We will guide you from your first idea to a fully finished home and plans your architect can use. Nothing here can break anything.';
    case 'name': return 'Tap the letters to enter your name. Press Next when you are done, or Skip.';
    case 'plot': return 'Pick the plot size closest to yours, then tell us who the home is for and how many floors you want. You can change all of it later.';
    case 'brief': return 'The AI suggests a layout from your answers. You stay in charge: every room can be moved or resized afterwards.';
    case 'build': {
      if (A && A.issues.some(i => i.level === 'error')) return A.issues.find(i => i.level === 'error').text;
      if (S.levels.length > 1 && A && S.lv === 0 && !A.design.rooms.some(r => r.type === 'stairs')) return 'With more than one floor you need a staircase. Add one from the list below.';
      if (A && S.lv === 0 && !A.design.rooms.some(r => r.type === 'kitchen')) return 'Every home needs a kitchen. Add one from the list below.';
      if (A && !A.design.rooms.some(r => r.type === 'bathroom') && S.levels.every(l => !l.rooms.some(r => r.type === 'bathroom'))) return 'You need at least one bathroom. Add one below, close to a bedroom.';
      if (!sel) return 'Press and hold a room in the model, drag it, and release where you want it. Or pick it from the list and use the buttons.';
      const t = TYPES[sel.type];
      return `${sel.label} is ${sel.w} x ${sel.d} m. ${sel.type === 'bedroom' ? 'Bedrooms feel comfortable from about 3.5 x 3.5 m.' : sel.type === 'living' ? 'A living room of 5 x 4.5 m seats a family easily.' : sel.type === 'bathroom' ? 'Place bathrooms next to bedrooms to keep pipes short.' : sel.type === 'stairs' ? 'The staircase stays in the same place on every floor, so moving it moves it everywhere.' : `Smallest usual size is ${t.min[0]} x ${t.min[1]} m.`}`;
    }
    case 'utilities': return 'We placed plumbing, electrical points and lights for you, using the rooms you made. Switch each layer on to see it.';
    case 'finishes': return S.finTab === 'floor' || S.finTab === 'wallIn' ? 'Pick a room (or All rooms), then a material, then a colour. Natural keeps the material as it really looks.' : 'Pick a material, then a colour. Your architect gets this list too.';
    case 'exterior': return 'Design the outside: walls, roof, doors, windows, fence and garden. Use "Cutaway" to see inside and "Roof" to take the roof off.';
    case 'furnish': return S.selItem ? 'Press and hold it in the model, drag, then release to place it. Or use the buttons to nudge, turn, restyle or remove.' : 'We furnished every room for you. Pick a room, tap an item to change it, or add more.';
    case 'walk': return S.mode === 'walk' ? 'Look around. Left stick walks, right stick turns. Use the floor buttons to go upstairs, or look at the house from the street.' : 'Step inside your finished home at full size before you send it. You can come back and change anything.';
    case 'send': return 'Your architect receives drawings of everything you made and will refine them with you. Nothing is final until you agree.';
    case 'done': return 'All done. Please hand the headset to our team.';
  }
  return '';
}
function draw() {
  buttons = []; g.clearRect(0, 0, 1024, 1024);
  rr(3, 3, 1018, 1018, 26); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#000'; g.stroke();
  g.save(); rr(3, 3, 1018, 96, 26); g.clip(); g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 100); g.restore(); g.fillStyle = '#000'; g.fillRect(3, 60, 1018, 40);
  if (logoW.complete && logoW.naturalWidth) g.drawImage(logoW, 30, 22, 230, 55);
  const si = STEPS.indexOf(S.step); if (si >= 0) txt(`STEP ${si + 1} OF ${STEPS.length}`, 994, 38, { size: 24, weight: 700, color: '#fff', align: 'right' });
  const B = 120;
  if (S.overlay === 'ai') overlayAI(); else ({ welcome, name: nameStep, plot, brief, build, utilities, finishes, exterior, furnish, walk, send, done })[S.step](B);
  const t = tip(); rr(30, 900, 964, 100, 14); g.fillStyle = '#000'; g.fill(); txt('GUIDE', 52, 912, { size: 18, weight: 700, color: '#aaa' }); txt(t, 52, 934, { size: 24, color: '#fff', maxW: 920, lh: 28, maxLines: 2 });
  ptex.needsUpdate = true;
}
function welcome() {
  if (logoB.complete && logoB.naturalWidth) g.drawImage(logoB, 112, 190, 800, 191);
  txt('Design your home.', 512, 440, { size: 62, weight: 700, align: 'center' });
  txt('Experience it. Understand it. Build with confidence.', 512, 525, { size: 28, align: 'center', color: '#444' });
  txt('In a few minutes you will place your rooms and floors, choose every material and colour, furnish and landscape your home, and walk through it at full size.', 512, 590, { size: 28, align: 'center', maxW: 800, color: '#222' });
  txt('Our aim: see your home under hurricane loads before you build. Load testing is in development.', 512, 706, { size: 21, align: 'center', color: '#444' });
  btn('start', 'Start designing', 292, 735, 440, 110, { dark: true, size: 38 });
  txt((S.session ? `Session ${S.session}  ` : '') + 'App version ' + BUILD, 512, 862, { size: 20, align: 'center', color: '#777' });
}
function nameStep() {
  txt('What is your name?', 50, 125, { size: 44, weight: 700 });
  txt('Your architect and project manager will use it. Tap the letters below. You can skip this.', 50, 185, { size: 24, color: '#444', maxW: 920 });
  rr(50, 235, 924, 90, 12); g.fillStyle = '#f4f4f4'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#000'; g.stroke();
  txt(S.name ? S.name + (Math.floor(Date.now() / 500) % 2 ? '' : '|') : 'Type your full name', 76, 258, { size: 42, weight: 700, color: S.name ? '#000' : '#999', maxW: 870 });
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'], kw = 84, gap = 8, up = (c) => (S.shift || !S.name || S.name.endsWith(' ')) ? c.toUpperCase() : c;
  rows.forEach((row, ri) => { const x0 = 512 - (row.length * (kw + gap) - gap) / 2 + (ri === 2 ? 0 : 0); [...row].forEach((c, i) => btn('key:' + c, up(c), x0 + i * (kw + gap), 350 + ri * 90, kw, 80, { size: 34 })); });
  btn('key:SHIFT', 'Shift', 50, 530, 130, 80, { size: 24, sel: S.shift });
  btn('key:BS', 'Delete', 844, 530, 130, 80, { size: 24 });
  btn("key:'", "'", 200, 620, 84, 70, { size: 32 }); btn('key:-', '-', 292, 620, 84, 70, { size: 32 });
  btn('key:SP', 'Space', 384, 620, 256, 70, { size: 28 }); btn('key:.', '.', 648, 620, 84, 70, { size: 32 }); btn('key:CLR', 'Clear', 740, 620, 150, 70, { size: 24 });
  btn('go:welcome', 'Back', 50, 790, 250, 90, { size: 28 });
  btn('go:plot', S.name ? 'Next' : 'Skip', 560, 790, 414, 90, { dark: !!S.name, size: 34 });
}
function counter(id, label, v, y) { txt(label, 50, y + 14, { size: 34, weight: 700 }); btn(id + '-', '-', 560, y, 90, 70, { size: 44 }); txt(String(v), 725, y + 8, { size: 48, weight: 700, align: 'center' }); btn(id + '+', '+', 800, y, 90, 70, { size: 44 }); }
function plot() {
  txt('Your plot and your family', 50, 125, { size: 44, weight: 700 });
  txt('How big is your plot?', 50, 190, { size: 26, color: '#444' });
  [['small', 'Small\n14 x 12 m'], ['medium', 'Medium\n18 x 14 m'], ['large', 'Large\n22 x 16 m']].forEach(([k, l], i) => btn('plot:' + k, l, 50 + i * 318, 225, 300, 90, { sel: PLOTS[k][0] === S.plot.w, size: 28 }));
  counter('beds', 'Bedrooms', S.beds, 340); counter('baths', 'Bathrooms', S.baths, 425); counter('storeys', 'Floors', S.storeys, 510);
  txt('Add if you want them', 50, 605, { size: 26, color: '#444' });
  [['dining', 'Dining'], ['laundry', 'Laundry'], ['office', 'Office'], ['garage', 'Garage']].forEach(([k, l], i) => btn('opt:' + k, l, 50 + i * 233, 640, 224, 80, { sel: S[k], size: 28 }));
  btn('go:brief', 'Next', 600, 760, 380, 100, { dark: true, size: 38 });
}
function brief() {
  txt('Let the AI draft your home', 50, 125, { size: 44, weight: 700 });
  txt(`The AI uses your answers (${S.beds} bedroom${S.beds > 1 ? 's' : ''}, ${S.baths} bathroom${S.baths > 1 ? 's' : ''}, ${S.storeys} floor${S.storeys > 1 ? 's' : ''}${S.garage ? ', garage' : ''}, plot ${S.plot.w} x ${S.plot.d} m) to suggest where each room goes. Walls, doors, windows, plumbing and electrical follow automatically.`, 50, 195, { size: 28, maxW: 920, color: '#222' });
  txt('What style of budget?', 50, 340, { size: 28, color: '#444' });
  ['economy', 'standard', 'premium'].forEach((k, i) => btn('budget:' + k, k[0].toUpperCase() + k.slice(1), 50 + i * 318, 380, 300, 80, { sel: S.budget === k, size: 30 }));
  btn('ai:draft', S.busy ? 'Drafting your home...' : 'Draft my home with AI', 50, 500, 924, 120, { dark: true, size: 40, disabled: S.busy });
  btn('blank', 'I want to start from scratch', 50, 645, 924, 90, { size: 30, disabled: S.busy });
  btn('go:plot', 'Back', 50, 790, 200, 80, { size: 28 });
}
function build() {
  const A = S.A, rooms = A ? A.design.rooms : [];
  txt(S.aiNote ? 'Your draft is ready' : 'Shape your rooms', 50, 122, { size: 34, weight: 700 }); levelBar(114, true);
  rooms.slice(0, 12).forEach((r, i) => btn('sel:' + r.id, r.label, 50 + (i % 4) * 236, 170 + Math.floor(i / 4) * 54, 226, 46, { sel: r.id === S.sel, size: 20 }));
  const sel = rooms.find(r => r.id === S.sel);
  txt(sel ? `Selected: ${sel.label}   ${sel.w} x ${sel.d} m` : 'No room selected. Pick one above or point at it in the model.', 50, 340, { size: 24, weight: 700 });
  const row = (y, label, items) => { txt(label, 50, y + 20, { size: 24, weight: 700 }); items.forEach(([id, l], i) => btn(id, l, 160 + i * 205, y, 195, 60, { size: 24, disabled: !sel })); };
  row(374, 'Move', [['mv:l', 'Left'], ['mv:r', 'Right'], ['mv:b', 'Back'], ['mv:f', 'Front']]);
  row(444, 'Size', [['sz:w+', 'Wider'], ['sz:w-', 'Narrower'], ['sz:d+', 'Longer'], ['sz:d-', 'Shorter']]);
  btn('del', 'Remove room', 50, 514, 215, 54, { size: 22, disabled: !sel }); btn('undo', 'Undo', 275, 514, 160, 54, { size: 22, disabled: !S.history.length });
  btn('addfloor', 'Add a floor', 445, 514, 250, 54, { size: 22, disabled: S.levels.length >= 3 }); btn('delfloor', 'Remove top floor', 705, 514, 269, 54, { size: 22, disabled: S.levels.length <= 1 });
  txt('Add a room', 50, 586, { size: 24, weight: 700 });
  const types = Object.keys(TYPES).filter(k => k !== 'stairs' || S.levels.length > 1);
  types.forEach((k, i) => btn('add:' + k, TYPES[k].n, 50 + (i % 5) * 186, 618 + Math.floor(i / 5) * 52, 178, 46, { size: 20 }));
  const bad = (A ? A.issues : []).slice(0, 2); bad.forEach((it, i) => txt('! ' + it.text, 50, 730 + i * 30, { size: 21, weight: 700, maxW: 920 }));
  btn('overlay:ai', 'Ask the AI helper', 50, 826, 330, 64, { size: 24 });
  btn('go:utilities', 'Next: services', 640, 826, 334, 64, { dark: true, size: 26, disabled: !rooms.length });
}
function utilities() {
  const A = S.A, sm = A ? A.summary : null;
  txt('Plumbing, electrical and lights', 50, 125, { size: 40, weight: 700 });
  levelBar(176);
  txt('Switch each layer on to see it in the model. These were placed for you from your rooms.', 50, S.levels.length > 1 ? 232 : 185, { size: 24, maxW: 920, color: '#222' });
  [['plumb', 'Plumbing'], ['elec', 'Electrical'], ['light', 'Lighting']].forEach(([k, l], i) => btn('layer:' + k, l, 50 + i * 318, 285, 300, 80, { sel: S.layers[k], size: 32 }));
  let y = 390; const note = (t) => { y = txt(t, 50, y, { size: 22, maxW: 920, color: '#222' }) + 6; };
  if (S.layers.plumb) note('Plumbing: grey = cold water, white = hot water, black = drains. The meter, heater and drain outlet sit close to your bathrooms and kitchen to keep pipes short.');
  if (S.layers.elec) note('Electrical: black blocks near the floor are outlets, boxes on the wall are air conditioners, cones are appliances such as the cooker and shower heater, and the large block is the power board.');
  if (S.layers.light) note('Lighting: white discs are ceiling lights and small black cubes are switches beside each door.');
  if (!S.layers.plumb && !S.layers.elec && !S.layers.light) note('Tap a layer above to look at it.');
  if (sm) {
    rr(50, 660, 924, 140, 12); g.fillStyle = '#f1f1f1'; g.fill();
    txt(`${sm.lighting.lights} lights   ${sm.lighting.switches} switches   ${sm.electrical.outlets} outlets   ${sm.electrical.acPoints} air conditioner points`, 70, 680, { size: 26, weight: 700 });
    const fx = Object.values(sm.fixtures).reduce((a, b) => a + b, 0), pipes = Object.values(sm.plumbing.pipeLengthByDiameterMm).reduce((a, b) => a + b, 0);
    txt(`${fx} fixtures   ${Math.round(pipes)} m of pipe   ${sm.electrical.circuits.length} circuits   ${sm.floorArea} m2 floor area (this floor)`, 70, 724, { size: 26, weight: 700, maxW: 880 });
    txt('Your architect and engineers will check and refine all of this.', 70, 764, { size: 22, color: '#444' });
  }
  btn('go:build', 'Back to rooms', 50, 826, 300, 64, { size: 26 }); btn('overlay:ai', 'Ask the AI helper', 370, 826, 270, 64, { size: 24 }); btn('go:finishes', 'Next: finishes', 660, 826, 314, 64, { dark: true, size: 24 });
}
/* ---------- inside finishes ---------- */
function finCurrent() { const tab = S.finTab, sc = S.finScope, room = S.levels.flatMap(l => l.A ? l.A.design.rooms : []).find(r => r.id === sc); return finPick(tab, sc, room && room.type); }
function finishes() {
  const tab = S.finTab, SF = SURFACES[tab], tabs = ['floor', 'wallIn', 'ceil', 'counter'];
  txt('Inside finishes', 50, 118, { size: 38, weight: 700 }); levelBar(112, true);
  tabs.forEach((k, i) => btn('ftab:' + k, SURFACES[k].n, 50 + i * 233, 168, 224, 54, { sel: tab === k, size: 22 }));
  const rooms = (S.A ? S.A.design.rooms : []).filter(r => r.type !== 'stairs');
  if (SF.room) { const chips = [['_', 'All rooms'], ...rooms.slice(0, 14).map(r => [r.id, r.label])]; chips.forEach(([id, l], i) => btn('fscope:' + id, l, 50 + (i % 5) * 186, 236 + Math.floor(i / 5) * 48, 178, 42, { sel: S.finScope === id, size: 17 })); }
  else txt(tab === 'ceil' ? 'Applies to every ceiling. Visible when you walk inside.' : 'Applies to the kitchen and laundry worktops, sinks and bathroom vanities.', 50, 252, { size: 22, color: '#444', maxW: 920 });
  const cur = finCurrent(), mixed = tab === 'floor' && S.finScope === '_' && !S.fin.floor._, kinds = SF.kinds, per = 8, pages = Math.ceil(kinds.length / per), pg = Math.min(S.finPage, pages - 1);
  const shown = kinds.slice(pg * per, pg * per + per);
  kindRow(392, shown, mixed ? null : cur.k, 'fmat:', cur.c, 112, 4);
  const where = SF.room ? (S.finScope === '_' ? 'all rooms' : ((rooms.find(r => r.id === S.finScope) || {}).label || 'this room')) : '';
  txt(mixed ? 'Floors: starting mix. Pick one for all rooms.' : `${SF.n}${where ? ', ' + where : ''}:  ${KINDS[cur.k].n}, ${colourName(cur.c)}`, 50, 640, { size: 24, weight: 700, maxW: 720, lh: 28, maxLines: 1 });
  if (pages > 1) btn('fpage:+', `More (${pg + 1}/${pages})`, 790, 632, 184, 44, { size: 20 });
  txt('Colour', 50, 686, { size: 22, color: '#444' }); swatches(716, cur.c, 'fcol:', 70);
  btn('go:utilities', 'Back', 50, 826, 200, 64, { size: 26 });
  btn('mode', S.mode === 'walk' ? 'Back to model' : 'Enter the house', 270, 826, 330, 64, { size: 26 });
  btn('go:exterior', 'Next: outside', 620, 826, 354, 64, { dark: true, size: 24 });
}
/* ---------- outside: walls, roof, doors, windows, fence, ground, extras ---------- */
const EX_TABS = [['wallOut', 'Walls'], ['roof', 'Roof'], ['doors', 'Doors'], ['windows', 'Windows'], ['fence', 'Fence'], ['ground', 'Garden'], ['extras', 'Extras']];
const getPath = (o, p) => p.split('.').reduce((a, k) => a && a[k], o);
function exterior() {
  const E = S.ext, tab = S.exTab;
  txt('Outside your home', 50, 118, { size: 38, weight: 700 }); levelBar(112, true);
  EX_TABS.forEach(([k, l], i) => btn('extab:' + k, l, 50 + i * 133, 168, 126, 50, { sel: tab === k, size: 20 }));
  const sw = (y, path, h) => swatches(y, getPath(E, path), 'ex:' + path + '=c', h || 56);
  const kr = (y, kinds, path, h, per) => kindRow(y, kinds, getPath(E, path + '.k'), 'ex:' + path + '.k=', getPath(E, path + '.c'), h, per);
  const lab = (t, y) => txt(t, 50, y, { size: 22, color: '#444' });
  if (tab === 'wallOut') {
    const cur = finPick('wallOut'); S.finTab = 'wallOut'; S.finScope = '_';
    lab('Material', 236); kindRow(262, SURFACES.wallOut.kinds, cur.k, 'fmat:', cur.c, 112, 4);
    txt(`${KINDS[cur.k].n}, ${colourName(cur.c)}`, 50, 516, { size: 24, weight: 700 }); lab('Colour', 562); swatches(594, cur.c, 'fcol:', 70);
  } else if (tab === 'roof') {
    const R = E.roof; lab('Shape', 236); optRow(262, [['gable', 'Gable'], ['hip', 'Hip'], ['flat', 'Flat'], ['mono', 'Sloping']], R.style, 'ex:roof.style=', 56, 24);
    txt({ gable: 'Gable: two sloping sides meeting at a peak, like an upside-down V.', hip: 'Hip: all four sides slope down, like a gentle pyramid.', flat: 'Flat: level roof with a low wall around the edge.', mono: 'Sloping: one slope, high on one side and low on the other.' }[R.style], 50, 332, { size: 20, color: '#222', maxW: 920 });
    if (R.style === 'flat') txt('Flat roofs are finished in concrete with a low wall (parapet) in your outside wall finish. Pitched roofs shed rain better in heavy storms.', 50, 372, { size: 22, maxW: 920, color: '#222' });
    else { lab('Roofing', 352); kindRow(372, ['cltile', 'metalroof', 'shingle'], R.k, 'ex:roof.k=', R.c, 112, 4); lab('Colour', 506); swatches(534, R.c, 'ex:roof.c=c', 62); lab('Edge boards (fascia)', 610); swatches(638, R.fc, 'ex:roof.fc=c', 50); }
    btn('ex:roof.solar=!', R.solar ? 'Solar panels: ON' : 'Solar panels: off', 50, 720, 420, 56, { sel: R.solar, size: 22 });
    btn('exroof', S.roofOn ? 'Roof shown' : 'Roof hidden', 490, 720, 484, 56, { sel: S.roofOn, size: 22 });
  } else if (tab === 'doors') {
    optRow(236, [['front', 'Front door'], ['inside', 'Inside doors'], ['garage', 'Garage door']], S.doorScope, 'doorscope:', 52, 22);
    const key = S.doorScope === 'front' ? 'door' : S.doorScope === 'inside' ? 'doorIn' : 'garage', D = E[key];
    if (key === 'garage') { lab('Colour', 316); sw(344, 'garage.c', 70); txt('The garage door is a rolling metal door. It appears only if you added a garage.', 50, 440, { size: 22, color: '#444', maxW: 920 }); }
    else {
      lab('Style', 316); optRow(342, DOOR_STYLES, D.style, `ex:${key}.style=`, 52, 20);
      lab('Material', 410); const ks = D.style === 'panel' ? ['doorpanel'] : ['paint', 'oak', 'walnut', 'mahogany', 'pine', 'steel']; kindRow(436, ks, D.k, `ex:${key}.k=`, D.c, 100, 6);
      lab('Colour', 560); sw(590, key + '.c', 70);
      txt(D.style === 'panel' ? 'Panel doors are painted. Pick any colour.' : 'Wood materials look best with Natural. Paint takes any colour.', 50, 680, { size: 22, color: '#444', maxW: 920 });
    }
  } else if (tab === 'windows') {
    const W = E.win; lab('Style', 236); optRow(260, WINDOW_STYLES, W.style, 'ex:win.style=', 50, 22);
    lab('Frame colour', 322); sw(348, 'win.fc', 52);
    lab('Glass', 420); optRow(446, [['clear', 'Clear'], ['blue', 'Blue'], ['bronze', 'Bronze'], ['dark', 'Dark'], ['frost', 'Frosted']], W.glass, 'ex:win.glass=', 50, 20);
    lab('Shutters', 516); optRow(542, SHUTTERS, W.shutters, 'ex:win.shutters=', 50, 22);
    if (W.shutters !== 'none') { lab('Shutter colour', 606); sw(630, 'win.sc', 46); }
    lab('Security bars', 690); optRow(716, [['none', 'None'], ['black', 'Black bars'], ['white', 'White bars']], W.grille, 'ex:win.grille=', 50, 22);
  } else if (tab === 'fence') {
    const F = E.fence; lab('Fence and gate', 236); optRow(262, FENCES, F.style, 'ex:fence.style=', 50, 18, 6);
    if (F.style === 'wall') { lab('Wall material', 336); kindRow(362, ['render', 'block', 'brick', 'stone', 'exconcrete'], F.k, 'ex:fence.k=', F.c, 100, 5); lab('Wall colour', 482); sw(508, 'fence.c', 56); }
    if (F.style === 'timber') { lab('Timber colour', 336); sw(362, 'fence.c', 56); }
    if (F.style !== 'none' && F.style !== 'hedge') { lab('Posts, rails and gate colour', 590); sw(616, 'fence.pc', 56); }
    if (F.style === 'none') txt('No fence. Your plot boundary is shown as a thin black line.', 50, 340, { size: 22, color: '#444' });
  } else if (tab === 'ground') {
    lab('Garden style', 236); optRow(262, [['none', 'None'], ['minimal', 'Minimal'], ['tropical', 'Tropical'], ['lush', 'Lush']], E.garden, 'ex:garden=', 50, 22);
    lab('Lawn and ground', 336); kindRow(362, ['grass', 'gravel', 'pavers', 'concrete'], E.lawn.k, 'ex:lawn.k=', E.lawn.c, 96, 4);
    lab('Driveway', 480); kindRow(506, ['pavers', 'asphalt', 'exconcrete', 'gravel'], E.drive.k, 'ex:drive.k=', E.drive.c, 96, 4);
    lab('Front path', 624); kindRow(650, ['pavers', 'exconcrete', 'slatefloor', 'gravel'], E.path.k, 'ex:path.k=', E.path.c, 96, 4);
  } else {
    const V = E.veranda; btn('ex:veranda.on=!', V.on ? 'Front veranda: ON' : 'Front veranda: off', 50, 236, 450, 56, { sel: V.on, size: 22 });
    btn('ex:gardenLights=!', E.gardenLights ? 'Garden lights: ON' : 'Garden lights: off', 524, 236, 450, 56, { sel: E.gardenLights, size: 22 });
    btn('ex:mailbox=!', E.mailbox ? 'Mailbox: ON' : 'Mailbox: off', 50, 306, 450, 56, { sel: E.mailbox, size: 22 });
    btn('ex:tank=!', E.tank ? 'Water tank: ON' : 'Water tank: off', 524, 306, 450, 56, { sel: E.tank, size: 22 });
    if (V.on) { lab('Veranda column colour', 392); sw(418, 'veranda.cc', 56); lab('Veranda floor', 494); kindRow(520, ['tile', 'tilegrey', 'pavers', 'exconcrete'], V.fk, 'ex:veranda.fk=', V.fc, 96, 4); }
  }
  btn('go:finishes', 'Back', 50, 826, 160, 64, { size: 26 });
  btn('excut', S.cut ? 'Cutaway: ON' : 'Cutaway', 226, 826, 220, 64, { sel: S.cut, size: 22 });
  btn('mode', S.mode === 'walk' ? 'Back to model' : 'Enter', 462, 826, 230, 64, { size: 24 });
  btn('go:furnish', 'Next: furniture', 708, 826, 266, 64, { dark: true, size: 22 });
}
/* ---------- furniture and decor ---------- */
const itemName = (it) => ITEMS[it.type].n;
const levelItems = () => S.items.filter(it => it.level === S.lv && ITEMS[it.type]);
function roomsHere() { const rs = (S.A ? S.A.design.rooms : []).filter(r => r.type !== 'stairs'); return S.lv === 0 ? [...rs, { id: 'yard', label: 'Garden' }] : rs; }
function furnish() {
  const sel = S.items.find(i => i.id === S.selItem);
  if (S.fView === 'add') return furnishAdd();
  if (S.fView === 'style' && sel) return furnishStyle(sel);
  txt('Furniture and decor', 50, 118, { size: 36, weight: 700 }); levelBar(112, true);
  const rooms = roomsHere(); if (!rooms.some(r => r.id === S.fRoom)) S.fRoom = rooms[0] ? rooms[0].id : null;
  rooms.slice(0, 15).forEach((r, i) => btn('froom:' + r.id, r.label, 50 + (i % 5) * 186, 168 + Math.floor(i / 5) * 48, 178, 42, { sel: r.id === S.fRoom, size: 17 }));
  const list = levelItems().filter(it => it.roomId === S.fRoom), per = 10, pages = Math.max(1, Math.ceil(list.length / per)), pg = Math.min(S.fPage, pages - 1);
  const ly = 168 + Math.ceil(Math.min(rooms.length, 15) / 5) * 48 + 14;
  txt(`${list.length} items in this room`, 50, ly + 4, { size: 22, weight: 700 }); if (pages > 1) btn('fpage:i', `More (${pg + 1}/${pages})`, 790, ly - 4, 184, 40, { size: 18 });
  list.slice(pg * per, pg * per + per).forEach((it, i) => btn('fitem:' + it.id, itemName(it), 50 + (i % 5) * 186, ly + 36 + Math.floor(i / 5) * 48, 178, 42, { sel: it.id === S.selItem, size: 16 }));
  const cy = ly + 36 + 2 * 48 + 14;
  if (sel) {
    txt(`Selected: ${itemName(sel)}`, 50, cy, { size: 26, weight: 700 });
    [['fmove:l', 'Left'], ['fmove:r', 'Right'], ['fmove:b', 'Back'], ['fmove:f', 'Front']].forEach(([id, l], i) => btn(id, l, 50 + i * 233, cy + 38, 224, 54, { size: 22 }));
    [['frot', 'Turn'], ['fview:style', 'Colour and material'], ['fdup', 'Copy'], ['fdel', 'Remove']].forEach(([id, l], i) => btn(id, l, 50 + i * 233, cy + 102, 224, 54, { size: id === 'fview:style' ? 17 : 22, sel: false }));
  } else txt('Tap an item above, or press and hold furniture in the model, drag it, and release to place it.', 50, cy, { size: 22, color: '#444', maxW: 920 });
  btn('fview:add', 'Add furniture or decor to this room', 50, 740, 924, 64, { size: 26, dark: true, disabled: !S.fRoom });
  btn('go:exterior', 'Back', 50, 826, 160, 64, { size: 26 }); btn('mode', S.mode === 'walk' ? 'Back to model' : 'Enter', 226, 826, 230, 64, { size: 24 });
  btn('frefurnish', 'Redo this floor', 472, 826, 240, 64, { size: 20 }); btn('go:walk', 'Next: walk through', 728, 826, 246, 64, { dark: true, size: 20 });
}
function furnishStyle(it) {
  const spec = ITEMS[it.type], names = Object.keys(spec.slots);
  txt(`Style: ${spec.n}`, 50, 118, { size: 36, weight: 700 });
  if (!names.length) { txt('This item has no colour or material options.', 50, 200, { size: 24 }); btn('fview:room', 'Done', 50, 826, 300, 64, { size: 26 }); return; }
  if (!names.includes(S.fSlot)) S.fSlot = names[0];
  names.forEach((n, i) => btn('fslot:' + n, spec.slots[n].n, 50 + i * 233, 168, 224, 54, { sel: S.fSlot === n, size: 20 }));
  const slot = spec.slots[S.fSlot], cur = slotFin(it, S.fSlot), perm = it.type === 'kcab' && S.fSlot === 'top';
  if (perm) { txt('Kitchen worktops follow your Counters choice under Inside finishes.', 50, 250, { size: 22, color: '#444', maxW: 920 }); }
  else {
    kindRow(246, slot.kinds.slice(0, 8), cur.k, 'fsmat:', cur.c, 108, 4);
    txt(`${slot.n}: ${KINDS[cur.k].n}, ${colourName(cur.c)}`, 50, 530, { size: 24, weight: 700, maxW: 920 });
    txt('Colour', 50, 574, { size: 22, color: '#444' }); swatches(602, cur.c, 'fscol:', 70);
    btn('fall', S.styleAll ? `Applies to all ${spec.n.toLowerCase()} items` : 'Applies to this item only', 50, 696, 924, 54, { sel: S.styleAll, size: 22 });
  }
  btn('fview:room', 'Done', 50, 826, 300, 64, { dark: true, size: 26 });
}
function furnishAdd() {
  const room = (roomsHere().find(r => r.id === S.fRoom) || {}).label || 'this room';
  txt(`Add to ${room}`, 50, 118, { size: 36, weight: 700 });
  const cats = S.fRoom === 'yard' ? CATS.filter(c => c === 'Outdoor') : CATS.filter(c => c !== 'Outdoor'); if (!cats.includes(S.fCat)) S.fCat = cats[0];
  cats.forEach((c, i) => btn('fcat:' + c, c, 50 + (i % 7) * 134, 168 + Math.floor(i / 7) * 52, 128, 46, { sel: S.fCat === c, size: 18 }));
  const types = Object.keys(ITEMS).filter(t => ITEMS[t].cat === S.fCat);
  types.forEach((t, i) => btn('fadd:' + t, ITEMS[t].n, 50 + (i % 4) * 233, 290 + Math.floor(i / 4) * 62, 224, 56, { size: 19 }));
  btn('fview:room', 'Done', 50, 826, 300, 64, { dark: true, size: 26 });
}
function walk() {
  planArea = null;
  if (S.mode !== 'walk') {
    txt('Walk through your finished home', 50, 125, { size: 40, weight: 700 });
    txt('Stand inside your home at full size. Then you can jump to any room from a list, or drag a dot on a floor plan and let go to snap into a room, so you never have to walk the whole house.', 50, 190, { size: 26, maxW: 920, color: '#222' });
    btn('mode', 'Enter the house', 50, 330, 924, 120, { dark: true, size: 44 });
    txt('Ask yourself: Is each room big enough? Where does the bed go? Do the colours feel right? You can go back and change anything.', 50, 500, { size: 24, maxW: 920, color: '#222' });
  } else {
    txt('Walk through your home', 50, 112, { size: 34, weight: 700 }); btn('mode', 'Back to model view', 600, 100, 374, 60, { size: 24 });
    txt('Jump to a floor', 50, 182, { size: 22, weight: 700 });
    S.levels.forEach((l, i) => btn('walkto:' + i, LEVEL_NAMES[i], 50 + i * 158, 212, 150, 52, { sel: S.walkLv === i, size: 19 }));
    const bx = 50 + S.levels.length * 158; btn('walkto:garden', 'Garden', bx, 212, 130, 52, { size: 19 }); btn('walkto:street', 'Street view', bx + 138, 212, 170, 52, { size: 19 });
    const lv = Math.min(S.walkLv || 0, S.levels.length - 1), A = S.levels[lv] && S.levels[lv].A, rooms = A ? A.design.rooms.slice(0, 20) : [], here = walkHere();
    const cur = A ? nearestRoom(lv, here.x, here.z) : null, inRoom = cur && here.x >= cur.x && here.x <= cur.x + cur.w && here.z >= cur.z && here.z <= cur.z + cur.d ? cur.id : null;
    txt('Go to a room on the ' + LEVEL_NAMES[lv].toLowerCase(), 50, 286, { size: 22, weight: 700 });
    const cols = rooms.length > 9 ? 2 : 1, cw = cols === 1 ? 450 : 221;
    rooms.forEach((r, i) => btn('walkroom:' + lv + ':' + r.id, r.label, 50 + (i % cols) * (cw + 8), 322 + Math.floor(i / cols) * 46, cw, 40, { sel: inRoom === r.id, size: cols === 1 ? 20 : 17 }));
    if (!rooms.length) txt('No rooms on this floor yet.', 50, 330, { size: 22, color: '#555' });
    /* the mini plan: press the dot (or anywhere), drag, and let go. It snaps into the nearest room. */
    const X = 520, Y = 322, W = 454, H = 400, pl = S.plot, s = Math.min((W - 16) / pl.w, (H - 16) / pl.d), ox = X + (W - pl.w * s) / 2, oz = Y + (H - pl.d * s) / 2;
    planArea = { x: X, y: Y, w: W, h: H, s, ox, oz, lv };
    g.fillStyle = '#fff'; rr(X, Y, W, H, 10); g.fill(); g.lineWidth = 4; g.strokeStyle = '#000'; g.stroke();
    g.fillStyle = '#efefef'; g.fillRect(ox, oz, pl.w * s, pl.d * s); g.lineWidth = 2; g.strokeStyle = '#999'; g.strokeRect(ox, oz, pl.w * s, pl.d * s);
    const target = planDrag && planDrag.id;
    rooms.forEach(r => { const rx = ox + r.x * s, rz = oz + r.z * s, rw = r.w * s, rd = r.d * s, hot = target === r.id;
      g.fillStyle = hot ? '#000' : inRoom === r.id ? '#d6d6d6' : r.type === 'stairs' ? '#e2e2e2' : '#fff'; g.fillRect(rx, rz, rw, rd); g.lineWidth = 2.5; g.strokeStyle = '#000'; g.strokeRect(rx, rz, rw, rd);
      if (rw > 52 && rd > 24) { g.font = `700 ${rw > 90 ? 15 : 12}px ${FONT}`; g.fillStyle = hot ? '#fff' : '#000'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r.label.length > 14 ? r.label.slice(0, 13) + '.' : r.label, rx + rw / 2, rz + rd / 2); } });
    const m = planDrag || here, mx = ox + Math.max(0, Math.min(pl.w, m.x)) * s, mz = oz + Math.max(0, Math.min(pl.d, m.z)) * s;
    g.beginPath(); g.arc(mx, mz, 16, 0, 6.283); g.fillStyle = planDrag ? '#d00' : '#000'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); g.beginPath(); g.arc(mx, mz, 5, 0, 6.283); g.fillStyle = '#fff'; g.fill();
    txt(planDrag ? 'Let go to snap into the highlighted room.' : 'Drag the dot to a room and let go. It snaps into place.', X, Y + H + 10, { size: 19, maxW: W, color: '#222' });
  }
  btn('go:furnish', 'Back', 50, 826, 250, 64, { size: 26 }); btn('go:send', 'Next: send to architect', 600, 826, 374, 64, { dark: true, size: 24 });
}
function send() {
  const rooms = S.levels.flatMap(l => l.A ? l.A.design.rooms : []), errs = S.levels.flatMap((l, i) => l.A ? l.A.issues.filter(x => x.level === 'error').map(x => ({ ...x, floor: i })) : []);
  const area = S.levels.reduce((a, l) => a + (l.A ? l.A.design.rooms.reduce((s, r) => s + r.w * r.d, 0) : 0), 0);
  txt('Ready to send?', 50, 125, { size: 44, weight: 700 });
  txt(`${S.levels.length} floor${S.levels.length > 1 ? 's' : ''}   ${rooms.filter(r => r.type !== 'stairs').length} rooms   ${Math.round(area)} m2   ${rooms.filter(r => r.type === 'bedroom').length} bedrooms   ${rooms.filter(r => r.type === 'bathroom').length} bathrooms`, 50, 195, { size: 28, weight: 700, maxW: 920 });
  if (errs.length) { txt('Please fix these first:', 50, 270, { size: 28, weight: 700 }); errs.slice(0, 4).forEach((e, i) => txt(`! ${S.levels.length > 1 ? LEVEL_NAMES[e.floor] + ': ' : ''}${e.text}`, 50, 315 + i * 56, { size: 22, maxW: 920 })); }
  else txt('Your architect receives a floor plan for every floor, plumbing, electrical and lighting drawings, a schedule of rooms, fixtures and finishes, your furniture layout, and a CAD file. They will contact you to refine it.', 50, 270, { size: 26, maxW: 920, color: '#222' });
  btn('go:walk', 'Back', 50, 826, 250, 64, { size: 26 });
  btn('send', S.busy ? 'Sending...' : 'Send to my architect', 460, 790, 514, 100, { dark: true, size: 36, disabled: !!errs.length || S.busy || !rooms.length });
}
function done() {
  txt('Sent to your architect', 512, 135, { size: 50, weight: 700, align: 'center' });
  txt('Project reference', 270, 195, { size: 24, align: 'center', color: '#555' }); txt(S.ref, 270, 225, { size: 44, weight: 700, align: 'center' });
  txt(S.fileCount ? S.fileCount + ' files saved on ' + location.host : '', 512, 270, { size: 22, align: 'center', color: '#060' }); txt('Access code', 754, 195, { size: 24, align: 'center', color: '#555' }); txt(S.claim || '-', 754, 225, { size: 44, weight: 700, align: 'center' });
  txt('To follow progress and see your drawings, open the Client portal on our website (your team will give you the address), choose Create an account, and enter this reference and code. Please write them down now.', 512, 300, { size: 24, align: 'center', maxW: 880, lh: 32, maxLines: 5, color: '#222' });
  txt(S.name ? 'Thank you, ' + S.name.split(' ')[0] + '. Please hand the headset to our team.' : 'Thank you. Please hand the headset to our team.', 512, 465, { size: 26, align: 'center', color: '#222' });
  txt('Staff only: enter PIN to start a new design', 512, 510, { size: 22, align: 'center', color: '#666' });
  txt(S.pinBad ? 'Wrong PIN' : '*'.repeat(S.pin.length), 512, 536, { size: 36, weight: 700, align: 'center' });
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].forEach((k, i) => btn('pin:' + k, k, 372 + (i % 3) * 100, 585 + Math.floor(i / 3) * 74, 92, 66, { size: 30, dark: k === 'OK' }));
}
function overlayAI() {
  txt('Ask the AI helper', 50, 125, { size: 44, weight: 700 });
  txt('Choose a question. The answer uses the rooms you have drawn so far.', 50, 185, { size: 26, color: '#444' });
  [['light', 'How do I get more light?'], ['money', 'How do I save money?'], ['hurricane', 'Is it ready for hurricanes?'], ['family', 'Will it suit my family?'], ['privacy', 'Is it private enough?'], ['size', 'Are my rooms big enough?']].forEach(([k, l], i) => btn('ask:' + k, l, 50 + (i % 2) * 468, 240 + Math.floor(i / 2) * 82, 456, 70, { size: 24, disabled: S.busy }));
  rr(50, 500, 924, 300, 12); g.fillStyle = '#f1f1f1'; g.fill();
  txt(S.busy ? 'Thinking...' : S.aiText || 'The answer appears here.', 72, 520, { size: 26, maxW: 880, lh: 34, maxLines: 8 });
  btn('overlay:close', 'Close', 50, 826, 250, 64, { size: 26 });
}

/* ---------------- actions ---------------- */
const snap = () => JSON.stringify({ plot: S.plot, levels: S.levels.map(l => l.rooms), items: S.items, sigs: S.sigs, nid: S.nid, lv: S.lv });
function push() { S.history.push(snap()); if (S.history.length > 40) S.history.shift(); }
const overlaps = (a, b) => a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.z < b.z + b.d - 1e-9 && b.z < a.z + a.d - 1e-9;
function flash(t) { S.flash = t; draw(); setTimeout(() => { if (S.flash === t) { S.flash = ''; draw(); } }, 3500); }
const nextRid = () => 'R' + (allRoomsMax() + 1);
const setStoreys = () => { S.storeys = S.levels.length; };

/* why a room cannot go to n (a copy of the room with new x, z, w, d), or '' if it can */
function roomMoveError(r, n) {
  if (r.type === 'stairs' && (n.w !== r.w || n.d !== r.d)) return 'The staircase has a fixed size. You can move it.';
  if (n.x < 0 || n.z < 0 || n.x + n.w > S.plot.w + 1e-9 || n.z + n.d > S.plot.d + 1e-9) return 'That would go outside your plot.';
  if (S.rooms.some(o => o.id !== r.id && overlaps(n, o))) return 'That would overlap another room.';
  if (r.type === 'stairs') for (let li = 0; li < S.levels.length; li++) { if (li !== S.lv && S.levels[li].rooms.some(o => o.type !== 'stairs' && overlaps(n, o))) return `That would overlap a room on the ${LEVEL_NAMES[li].toLowerCase()}.`; }
  return '';
}
function edit(fn) {
  const r = S.rooms.find(x => x.id === S.sel); if (!r) return;
  const n = { ...r }; fn(n);
  if (r.type !== 'stairs') { n.w = Math.max(1.5, n.w); n.d = Math.max(1.5, n.d); }
  const err = roomMoveError(r, n); if (err) return flash(err + (err.includes('overlap another') ? ' Move the other room first.' : ''));
  push(); Object.assign(r, n);
  if (r.type === 'stairs') S.levels.forEach((l, li) => { if (li !== S.lv) l.rooms.filter(o => o.type === 'stairs').forEach(o => { o.x = r.x; o.z = r.z; }); });
  refresh();
}
/* best free spot for a new room; lvls = the floors that must all be free there (stairs use every floor) */
function findSpot(type, lvls) {
  const t = TYPES[type], occ = lvls.flatMap(i => S.levels[i].rooms); let best = null;
  for (const [w, d] of [t.def, t.min]) {
    for (let z = 0; z + d <= S.plot.d + 1e-9; z += 0.5) for (let x = 0; x + w <= S.plot.w + 1e-9; x += 0.5) {
      const box = { x, z, w, d }; if (occ.some(o => overlaps(box, o))) continue;
      let touch = 0; occ.forEach(o => { const ox = Math.min(x + w, o.x + o.w) - Math.max(x, o.x), oz = Math.min(z + d, o.z + o.d) - Math.max(z, o.z); if ((Math.abs(x + w - o.x) < 1e-9 || Math.abs(o.x + o.w - x) < 1e-9) && oz > 0) touch += oz; if ((Math.abs(z + d - o.z) < 1e-9 || Math.abs(o.z + o.d - z) < 1e-9) && ox > 0) touch += ox; });
      const score = touch * 10 - Math.hypot(x + w / 2 - S.plot.w / 2, z + d / 2 - S.plot.d * 0.6) + (occ.length ? 0 : 5) + (type === 'stairs' ? -x * 2 + z : 0);
      if (!best || score > best.score) best = { x, z, w, d, score };
    }
    if (best) return best;
  }
  return null;
}
function addRoom(type) {
  if (type === 'stairs') {
    if (S.rooms.some(r => r.type === 'stairs')) return flash('This floor already has a staircase.');
    const all = S.levels.map((_, i) => i), existing = S.levels.flatMap(l => l.rooms.filter(r => r.type === 'stairs'))[0];
    const sp = existing ? { x: existing.x, z: existing.z, w: existing.w, d: existing.d } : findSpot('stairs', all); if (!sp) return flash('There is no free space for a staircase on every floor.');
    if (existing && S.rooms.some(o => overlaps(sp, o))) return flash('Something is in the way of the staircase on this floor.');
    push(); S.levels.forEach((l, li) => { if (!l.rooms.some(r => r.type === 'stairs')) { const id = nextRid(); l.rooms.push({ id, type: 'stairs', x: sp.x, z: sp.z, w: sp.w, d: sp.d }); if (li === S.lv) S.sel = id; } });
    return refresh();
  }
  const s = findSpot(type, [S.lv]); if (!s) return flash('There is no free space left. Make a room smaller or choose a bigger plot.');
  push(); const id = nextRid(); S.rooms.push({ id, type, x: s.x, z: s.z, w: s.w, d: s.d }); S.sel = id; refresh();
}
function addFloor() {
  if (S.levels.length >= 3) return;
  push(); S.levels.push({ rooms: [], A: null }); const ni = S.levels.length - 1;
  const st = S.levels.flatMap(l => l.rooms.filter(r => r.type === 'stairs'))[0];
  const sp = st ? { x: st.x, z: st.z, w: st.w, d: st.d } : findSpot('stairs', S.levels.map((_, i) => i));
  if (!sp) { S.levels.pop(); S.history.pop(); return flash('There is no space for a staircase. Make a room smaller first.'); }
  S.levels.forEach(l => { if (!l.rooms.some(r => r.type === 'stairs')) l.rooms.push({ id: nextRid(), type: 'stairs', x: sp.x, z: sp.z, w: sp.w, d: sp.d }); });
  const b = findSpot('bedroom', [ni]); if (b) S.levels[ni].rooms.push({ id: nextRid(), type: 'bedroom', x: b.x, z: b.z, w: b.w, d: b.d });
  S.lv = ni; S.sel = null; S.selItem = null; setStoreys(); refresh();
}
function removeFloor() {
  if (S.levels.length <= 1) return; push();
  const gone = S.levels.length - 1; S.levels.pop(); S.items = S.items.filter(it => it.level < gone);
  if (S.levels.length === 1) S.levels[0].rooms = S.levels[0].rooms.filter(r => r.type !== 'stairs');
  S.lv = Math.min(S.lv, S.levels.length - 1); S.sel = null; S.selItem = null; setStoreys(); refresh();
}

/* ---------------- analysis and automatic furnishing ---------------- */
let anT, rfTok = 0;
function refresh() { clearTimeout(anT); anT = setTimeout(doRefresh, 100); }
async function doRefresh() {
  const tok = ++rfTok, n = S.levels.length;
  try {
    const res = await Promise.all(S.levels.map((l, i) => api('/api/analyze', { design: { plot: S.plot, rooms: l.rooms }, level: i, storeys: n })));
    if (tok !== rfTok) return;
    S.plot = res[0].design.plot;
    res.forEach((A, i) => { S.levels[i].A = A; S.levels[i].rooms = A.design.rooms; });
    if (S.sel && !S.rooms.some(r => r.id === S.sel)) S.sel = null;
    syncFurniture();
    if (S.selItem && !S.items.some(i => i.id === S.selItem)) S.selItem = null;
    rebuild(); draw(); save();
    if (S.session) api('/api/session/' + S.session + '/draft', { design: { plot: S.plot, rooms: S.levels[0].rooms } }).catch(() => {});
  } catch (e) { console.error('refresh failed', e && e.stack || e); flash('Connection problem. Please ask our team for help.'); }
}
/* furnish every room whose shape, doors or windows changed (or whole floors when forced) */
function syncFurniture(force) {
  const live = new Set();
  S.levels.forEach((L, li) => {
    if (!L.A) return; const A = L.A, rooms = A.design.rooms, changed = new Set(), all = force && force.has(li);
    rooms.forEach((r, ri) => {
      const key = li + ':' + r.id; live.add(key);
      const sig = roomSig(r) + '|' + A.doors.filter(d => d.rooms.includes(ri)).map(d => d.x + ',' + d.z).join(';') + '|' + A.windows.filter(w => w.rooms[0] === ri).map(w => w.x + ',' + w.z).join(';');
      if (S.sigs[key] !== sig || all) { changed.add(r.id); S.sigs[key] = sig; }
    });
    if (!changed.size) return;
    S.items = S.items.filter(it => {
      if (it.level !== li || !changed.has(it.roomId)) return true; if (all || it.auto) return false;
      const r = rooms.find(q => q.id === it.roomId); return !!r && it.x > r.x && it.x < r.x + r.w && it.z > r.z && it.z < r.z + r.d;
    });
    const ids = new Set(S.items.map(i => i.id)); S.items = S.items.filter(it => !it.on || ids.has(it.on));
    const made = furnishLevel(A, li, S.items.filter(i => i.level === li), changed);
    made.forEach(it => { it.id = 'I' + (++S.nid); });
    made.forEach(it => { if (it._p) { it.on = it._p.id; delete it._p; } });
    S.items.push(...made);
  });
  Object.keys(S.sigs).forEach(k => { if (k !== 'yard' && !live.has(k)) delete S.sigs[k]; });
  if (S.levels[0].A && !S.sigs.yard) { S.sigs.yard = '1'; ['patio_set', 'lounger', 'lounger', 'grill', 'planter', 'planter', 'garden_bench'].forEach(t => { if (!ITEMS[t]) return; const it = placeYard(t, S.items); if (it) { it.auto = true; it.id = 'I' + (++S.nid); S.items.push(it); } }); }
  S.items = S.items.filter(it => (it.roomId === 'yard' ? it.level === 0 : live.has(it.level + ':' + it.roomId)) && ITEMS[it.type]);
}

/* ---------------- steps and the main action switch ---------------- */
function go(step) {
  S.step = step; S.overlay = null;
  if (step === 'finishes') { S.finTab = 'floor'; S.finScope = '_'; S.finPage = 0; }
  if (step === 'furnish') { S.fView = 'room'; S.selItem = null; }
  if (S.mode === 'walk' && !['finishes', 'exterior', 'furnish', 'walk'].includes(step)) S.mode = 'model';
  rebuild(); draw(); save();
}
const colourIdx = (v) => /^c\d+$/.test(v) ? COLOURS[+v.slice(1)][1] : null;
function setPath(o, p, val) { const ks = p.split('.'); let t = o; for (let i = 0; i < ks.length - 1; i++) t = t[ks[i]]; t[ks[ks.length - 1]] = val; }
function exAct(v) {
  const eq = v.indexOf('='), path = v.slice(0, eq), val = v.slice(eq + 1), E = S.ext;
  if (val === '!') setPath(E, path, !getPath(E, path));
  else if (/^c\d+$/.test(val) && /(^|\.)(c|fc|sc|pc|cc)$/.test(path)) setPath(E, path, colourIdx(val));
  else {
    setPath(E, path, val);
    if (path.endsWith('.k')) { const cp = path.slice(0, -2) + '.c'; if (!KINDS[val].tint) setPath(E, cp, 0xffffff); }
    if (path.endsWith('.style') && (path.startsWith('door.') || path.startsWith('doorIn.'))) { const par = getPath(E, path.slice(0, -6)); if (val === 'panel') par.k = 'doorpanel'; else if (par.k === 'doorpanel') { par.k = 'paint'; } }
  }
  rebuild(); draw(); save();
}
/* furniture helpers */
const selItemObj = () => S.items.find(i => i.id === S.selItem);
const kids = (it) => S.items.filter(o => o.on === it.id);
function itemRoom(it) { if (it.roomId === 'yard') return null; const A = S.levels[it.level] && S.levels[it.level].A; return A ? A.design.rooms.find(r => r.id === it.roomId) : null; }
function moveItem(it, dx, dz) {
  const r = itemRoom(it), f = foot({ ...it, x: it.x + dx, z: it.z + dz });
  if (r && (f.x0 < r.x - 0.02 || f.x1 > r.x + r.w + 0.02 || f.z0 < r.z - 0.02 || f.z1 > r.z + r.d + 0.02)) return flash('That would go outside the room.');
  it.x += dx; it.z += dz; it.auto = false; kids(it).forEach(k => { k.x += dx; k.z += dz; }); rebuild(); draw(); save();
}
function turnItem(it) {
  const old = it.rot; it.rot = (it.rot + 90) % 360; spinKids(it, 90); it.auto = false;
  const r = itemRoom(it), f = foot(it);
  if (r && it.roomId !== 'yard' && (f.x0 < r.x || f.x1 > r.x + r.w || f.z0 < r.z || f.z1 > r.z + r.d)) { it.rot = old; spinKids(it, -90); return flash('It does not fit turned the other way.'); }
  rebuild(); draw(); save();
}
function addItem(type) {
  const A = S.A, ri = A ? A.design.rooms.findIndex(r => r.id === S.fRoom) : -1;
  if (S.fRoom === 'yard' && isOutdoor(type)) { const y = placeYard(type, S.items); if (!y) return flash('There is no space left in the garden.'); y.id = 'I' + (++S.nid); S.items.push(y); S.selItem = y.id; S.fView = 'room'; rebuild(); draw(); save(); return; }
  if (ri < 0 || isOutdoor(type)) return flash(isOutdoor(type) ? 'Choose Garden in the room list to place outdoor items.' : 'Choose a room first.');
  const it = placeNew(A, S.lv, S.items.filter(i => i.level === S.lv), ri, type); if (!it) return flash(`There is no space for a ${ITEMS[type].n.toLowerCase()} in this room.`);
  it.id = 'I' + (++S.nid); S.items.push(it); S.selItem = it.id; S.fView = 'room'; rebuild(); draw(); save();
}
function removeItem(it) { const ids = new Set([it.id, ...kids(it).map(k => k.id)]); S.items = S.items.filter(o => !ids.has(o.id)); S.selItem = null; rebuild(); draw(); save(); }
function applyDraft(r) {
  push(); S.plot = r.plot; let c = 0;
  S.levels = r.levels.map(l => ({ rooms: l.rooms.map(rm => ({ ...rm, id: 'R' + (++c) })), A: null }));
  S.items = []; S.sigs = {}; S.lv = 0; S.sel = null; S.selItem = null; setStoreys();
}


/* ---------------- garden items and drag-and-drop ---------------- */
const hit2 = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
const isOutdoor = (type) => ITEMS[type] && ITEMS[type].cat === 'Outdoor';
function placeYard(type, existing) {
  const A0 = S.levels[0].A; if (!A0) return null; const spec = ITEMS[type], rooms = A0.design.rooms, pw = S.plot.w, pd = S.plot.d;
  const minZ = rooms.length ? Math.min(...rooms.map(r => r.z)) : pd / 2;
  const blocked = (f) => f.x0 < 0.4 || f.z0 < 0.4 || f.x1 > pw - 0.4 || f.z1 > pd - 0.4 || rooms.some(r => hit2(f, { x0: r.x - 0.5, x1: r.x + r.w + 0.5, z0: r.z - 0.5, z1: r.z + r.d + 0.5 })) || existing.some(o => o.roomId === 'yard' && hit2(f, foot(o)));
  const px = pw / 2, pz = Math.max(1.2, Math.min(minZ - 1.5, pd / 2));
  for (let r = 0; r <= Math.max(pw, pd); r += 0.4) for (let k = 0; k < (r === 0 ? 1 : 20); k++) {
    const a = k / 20 * 6.283, x = Math.round((px + Math.cos(a) * r * 1.6) * 20) / 20, z = Math.round((pz + Math.sin(a) * r) * 20) / 20, it = { x, z, w: spec.w, d: spec.d, rot: 0 };
    if (!blocked(foot(it))) return { type, level: 0, roomId: 'yard', x, z, rot: 0, w: spec.w, d: spec.d, h: spec.h, y: 0, a: spec.a, auto: false };
  }
  return null;
}
function spinKids(it, deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  kids(it).forEach(k => { const rx = k.x - it.x, rz = k.z - it.z; k.x = it.x + rx * c + rz * sn; k.z = it.z - rx * sn + rz * c; k.rot = (k.rot + deg + 720) % 360; });
}
/* where can this item go? returns {x, z, rot, roomId} or an error string */
function itemTarget(it, nx, nz) {
  const A = S.A, rooms = A ? A.design.rooms : [], tol = 0.04;
  if (isOutdoor(it.type)) {
    const f = foot({ ...it, x: nx, z: nz });
    if (f.x0 < 0.2 || f.z0 < 0.2 || f.x1 > S.plot.w - 0.2 || f.z1 > S.plot.d - 0.2) return 'That is outside your plot.';
    if (rooms.some(r => hit2(f, { x0: r.x, x1: r.x + r.w, z0: r.z, z1: r.z + r.d }))) return 'Garden items go outside the house.';
    return { x: nx, z: nz, rot: it.rot, roomId: 'yard' };
  }
  const room = rooms.find(r => r.type !== 'stairs' && nx > r.x && nx < r.x + r.w && nz > r.z && nz < r.z + r.d); if (!room) return 'Drop it inside a room.';
  let x = nx, z = nz, rot = it.rot;
  if (it.a === 'wall' || it.a === 'wallhigh') {                                    // wall furniture snaps flat against the nearest wall
    const sides = [{ o: 'h', fix: room.z, n: [0, 1] }, { o: 'h', fix: room.z + room.d, n: [0, -1] }, { o: 'v', fix: room.x, n: [1, 0] }, { o: 'v', fix: room.x + room.w, n: [-1, 0] }];
    let best = null; sides.forEach(sd => { const dist = sd.o === 'h' ? Math.abs(nz - sd.fix) : Math.abs(nx - sd.fix); if (!best || dist < best.dist) best = { ...sd, dist }; });
    if (best.dist < it.d / 2 + 0.4) {
      rot = rotOf(best.n[0], best.n[1]);
      if (best.o === 'h') { x = Math.max(room.x + it.w / 2 + 0.02, Math.min(room.x + room.w - it.w / 2 - 0.02, nx)); z = best.fix + best.n[1] * (it.d / 2 + 0.01); }
      else { z = Math.max(room.z + it.w / 2 + 0.02, Math.min(room.z + room.d - it.w / 2 - 0.02, nz)); x = best.fix + best.n[0] * (it.d / 2 + 0.01); }
    }
  }
  const f = foot({ ...it, x, z, rot });
  if (f.x0 < room.x - tol || f.x1 > room.x + room.w + tol || f.z0 < room.z - tol || f.z1 > room.z + room.d + tol) return 'It does not fit there.';
  return { x, z, rot, roomId: room.id };
}
function dropItem(it, nx, nz) {
  const t = itemTarget(it, nx, nz); if (typeof t === 'string') return flash(t);
  const dx = t.x - it.x, dz = t.z - it.z, dr = ((t.rot - it.rot) % 360 + 360) % 360;
  if (!dx && !dz && !dr && t.roomId === it.roomId) { draw(); return; }
  kids(it).forEach(k => { k.x += dx; k.z += dz; k.roomId = t.roomId; });
  if (dr) spinKids({ ...it, x: t.x, z: t.z }, dr);
  it.x = t.x; it.z = t.z; it.rot = t.rot; it.roomId = t.roomId; it.auto = false; S.fRoom = t.roomId; rebuild(); draw(); save();
}
function dropRoom(r, nx, nz) {
  if (nx === r.x && nz === r.z) return; S.sel = r.id; edit(n => { n.x = nx; n.z = nz; });
}

async function act(id) {
  const ci = id.indexOf(':'), k = ci < 0 ? id : id.slice(0, ci), v = ci < 0 ? '' : id.slice(ci + 1);
  switch (k) {
    case 'start': go('name'); break;
    case 'key': {                                                              // on-panel keyboard for the client's name
      if (v === 'BS') S.name = S.name.slice(0, -1);
      else if (v === 'CLR') S.name = '';
      else if (v === 'SHIFT') S.shift = !S.shift;
      else if (S.name.length < 40) { const ch = v === 'SP' ? ' ' : v; if (!(ch === ' ' && (!S.name || S.name.endsWith(' ')))) { const cap = S.shift || !S.name || S.name.endsWith(' ') || S.name.endsWith('-') || S.name.endsWith("'"); S.name += cap ? ch.toUpperCase() : ch; S.shift = false; } }
      draw(); break;
    }
    case 'plot': S.plot = { w: PLOTS[v][0], d: PLOTS[v][1] }; draw(); break;
    case 'beds-': S.beds = Math.max(1, S.beds - 1); draw(); break; case 'beds+': S.beds = Math.min(6, S.beds + 1); draw(); break;
    case 'baths-': S.baths = Math.max(1, S.baths - 1); draw(); break; case 'baths+': S.baths = Math.min(5, S.baths + 1); draw(); break;
    case 'storeys-': S.storeys = Math.max(1, S.storeys - 1); draw(); break; case 'storeys+': S.storeys = Math.min(3, S.storeys + 1); draw(); break;
    case 'opt': S[v] = !S[v]; draw(); break;
    case 'budget': S.budget = v; draw(); break;
    case 'go': go(v); if (['build', 'utilities', 'finishes', 'exterior', 'furnish'].includes(v) && !S.levels[0].A) refresh(); break;
    case 'blank': { push(); S.levels = [{ rooms: [{ id: 'R1', type: 'living', x: Math.round((S.plot.w - 5) / 2 * 2) / 2, z: S.plot.d - 5.5, w: 5, d: 4.5 }], A: null }]; S.items = []; S.sigs = {}; S.lv = 0; S.sel = 'R1'; S.aiNote = ''; setStoreys(); go('build'); refresh(); break; }
    case 'ai': if (v === 'draft') {
      S.busy = true; draw();
      try {
        const body = { bedrooms: S.beds, bathrooms: S.baths, dining: S.dining, laundry: S.laundry, office: S.office, garage: S.garage, storeys: S.storeys, budget: S.budget, plot: S.plot };
        let r;
        if (S.storeys > 1 || S.garage) r = await api('/api/draft', body);
        else { const q = await api('/api/ai/suggest', body); r = { plot: q.design.plot, levels: [{ rooms: q.design.rooms }], notes: q.notes, explanation: q.explanation }; }
        applyDraft(r); S.aiNote = r.explanation; S.busy = false; go('build'); S.flash = (r.explanation || '') + (r.notes && r.notes.length ? ' ' + r.notes.join(' ') : ''); refresh(); setTimeout(() => { S.flash = ''; draw(); }, 14000);
      } catch (e) { console.error(e); S.busy = false; flash('The AI is not reachable. Try again or start from scratch.'); }
    } break;
    case 'lvl': S.lv = +v; S.sel = null; S.selItem = null; S.fRoom = null; S.finScope = '_'; rebuild(); draw(); break;
    case 'sel': S.sel = v; rebuild(); draw(); break;
    case 'mv': edit(n => { if (v === 'l') n.x -= 0.5; if (v === 'r') n.x += 0.5; if (v === 'b') n.z -= 0.5; if (v === 'f') n.z += 0.5; }); break;
    case 'sz': edit(n => { if (v === 'w+') n.w += 0.5; if (v === 'w-') n.w -= 0.5; if (v === 'd+') n.d += 0.5; if (v === 'd-') n.d -= 0.5; }); break;
    case 'del': { const r = S.rooms.find(x => x.id === S.sel); if (!r) break; push(); if (r.type === 'stairs') S.levels.forEach(l => { l.rooms = l.rooms.filter(o => o.type !== 'stairs'); }); else S.rooms = S.rooms.filter(o => o.id !== S.sel); S.sel = null; refresh(); break; }
    case 'undo': {
      const h = S.history.pop(); if (!h) break; const o = JSON.parse(h);
      S.plot = o.plot; S.levels = o.levels.map(rooms => ({ rooms, A: null })); S.items = o.items; S.sigs = o.sigs; S.nid = Math.max(S.nid, o.nid); S.lv = Math.min(o.lv, S.levels.length - 1); S.sel = null; S.selItem = null; setStoreys(); refresh(); break;
    }
    case 'add': addRoom(v); break;
    case 'addfloor': addFloor(); break;
    case 'delfloor': removeFloor(); break;
    case 'layer': S.layers[v] = !S.layers[v]; applyLayers(); draw(); break;
    case 'ftab': S.finTab = v; S.finScope = '_'; S.finPage = 0; draw(); break;
    case 'fscope': S.finScope = v; if (v !== '_') S.sel = v; rebuild(); draw(); break;
    case 'fpage': if (v === '+') { const n = Math.ceil(SURFACES[S.finTab].kinds.length / 8); S.finPage = (S.finPage + 1) % n; } else { S.fPage = S.fPage + 1; const list = levelItems().filter(it => it.roomId === S.fRoom); if (S.fPage >= Math.ceil(list.length / 10)) S.fPage = 0; } draw(); break;
    case 'fmat': case 'fcol': {
      const tab = S.finTab, sc = SURFACES[tab].room ? S.finScope : '_', cur = finPick(tab, sc, (S.levels.flatMap(l => l.A ? l.A.design.rooms : []).find(r => r.id === sc) || {}).type); let nk = cur.k, nc = cur.c;
      if (k === 'fmat') { nk = v; if (!KINDS[v].tint) nc = 0xffffff; } else nc = COLOURS[+v][1];
      const m = S.fin[tab]; if (SURFACES[tab].room && sc === '_') Object.keys(m).forEach(key => { if (key !== '_') delete m[key]; });
      m[sc] = { k: nk, c: nc }; rebuild(); draw(); save(); break;
    }
    case 'extab': S.exTab = v; draw(); break;
    case 'ex': exAct(v); break;
    case 'exroof': S.roofOn = !S.roofOn; rebuild(); draw(); break;
    case 'excut': S.cut = !S.cut; rebuild(); draw(); break;
    case 'doorscope': S.doorScope = v; draw(); break;
    case 'froom': S.fRoom = v; S.fPage = 0; S.selItem = null; draw(); break;
    case 'fitem': { S.selItem = v; const it = selItemObj(); if (it) S.fRoom = it.roomId; rebuild(); draw(); break; }
    case 'fmove': { const it = selItemObj(); if (it) moveItem(it, v === 'l' ? -0.25 : v === 'r' ? 0.25 : 0, v === 'b' ? -0.25 : v === 'f' ? 0.25 : 0); break; }
    case 'frot': { const it = selItemObj(); if (it) turnItem(it); break; }
    case 'fdup': { const it = selItemObj(); if (it) addItem(it.type); break; }
    case 'fdel': { const it = selItemObj(); if (it) removeItem(it); break; }
    case 'fview': S.fView = v; if (v === 'style') S.fSlot = null; draw(); break;
    case 'fcat': S.fCat = v; draw(); break;
    case 'fadd': addItem(v); break;
    case 'fslot': S.fSlot = v; draw(); break;
    case 'fall': S.styleAll = !S.styleAll; draw(); break;
    case 'fsmat': case 'fscol': {
      const it = selItemObj(); if (!it) break; const slot = S.fSlot, cur = slotFin(it, slot); let nk = cur.k, nc = cur.c;
      if (k === 'fsmat') { nk = v; if (!KINDS[v].tint) nc = 0xffffff; } else nc = COLOURS[+v][1];
      if (S.styleAll) { S.typeFin[it.type] = Object.assign({}, S.typeFin[it.type], { [slot]: { k: nk, c: nc } }); S.items.forEach(o => { if (o.type === it.type && o.fin) delete o.fin[slot]; }); }
      else it.fin = Object.assign({}, it.fin, { [slot]: { k: nk, c: nc } });
      rebuild(); draw(); save(); break;
    }
    case 'frefurnish': { if (!S.A) break; S.items = S.items.filter(it => it.level !== S.lv); S.selItem = null; syncFurniture(new Set([S.lv])); rebuild(); draw(); save(); break; }
    case 'mode': S.mode = S.mode === 'walk' ? 'model' : 'walk'; rebuild(); draw(); break;
    case 'walkto': walkTo(v === 'street' || v === 'garden' ? v : +v); draw(); break;
    case 'walkroom': { const [lv, id] = v.split(':'); walkToRoom(+lv, id); draw(); break; }
    case 'overlay': S.overlay = v === 'ai' ? 'ai' : null; draw(); break;
    case 'ask': {
      S.busy = true; draw();
      const q = { light: 'How can I get more natural light into this design?', money: 'How can I reduce the cost of this design?', hurricane: 'How hurricane-ready is this design and what should I ask my architect?', family: 'Will this layout suit a growing family?', privacy: 'Is this layout private enough?', size: 'Are my rooms big enough?' }[v];
      try { const r = await api('/api/ai/ask', { question: q, chip: v, design: { plot: S.plot, rooms: S.levels[0].rooms } }); S.aiText = r.answer; } catch (e) { S.aiText = 'The helper is not reachable right now. Please ask our team.'; }
      S.busy = false; draw(); break;
    }
    case 'send': {
      S.busy = true; draw();
      try { const r = await api('/api/projects', { sessionId: S.session, clientName: S.name, design: { plot: S.plot, levels: S.levels.map(l => ({ rooms: l.rooms })) }, finishes: finishList(), furniture: furnitureList(), exterior: exteriorList() }); S.ref = r.ref; S.claim = r.claim || ''; S.fileCount = r.fileCount || 0; if (!r.ref) throw new Error('no reference'); S.busy = false; go('done'); } catch (e) { S.busy = false; flash('Could not send: ' + (e && e.message ? e.message : 'unknown') + '. Please ask our team.'); }
      break;
    }
    case 'pin': {
      if (v === 'C') { S.pin = ''; S.pinBad = false; } else if (v === 'OK') {
        const r = await api('/api/staff/verify', { pin: S.pin }).catch(() => ({ ok: false })); if (r.ok) return resetAll(); S.pinBad = true; S.pin = '';
      } else if (S.pin.length < 8) { S.pin += v; S.pinBad = false; }
      draw(); break;
    }
  }
}

/* ---------------- what the architect receives ---------------- */
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const nm = (k, c) => ({ material: KINDS[k].n, colour: colourName(c) });
function finishList() {
  const E = S.ext, out = { rooms: S.levels.flatMap((l, li) => l.A ? l.A.design.rooms.filter(r => r.type !== 'stairs').map(r => { const fl = finPick('floor', r.id, r.type), wl = finPick('wallIn', r.id, r.type); return { room: r.label, level: li, floor: nm(fl.k, fl.c), walls: nm(wl.k, wl.c) }; }) : []) };
  [['outsideWalls', 'wallOut'], ['ceilings', 'ceil'], ['counters', 'counter']].forEach(([n, s]) => { const f = finPick(s); out[n] = nm(f.k, f.c); });
  out.roof = E.roof.style === 'flat' ? { material: 'Flat concrete roof', colour: 'Natural' } : nm(E.roof.k, E.roof.c);
  out.frontDoor = { material: `${E.door.style} ${KINDS[E.door.k].n}`, colour: colourName(E.door.c) };
  out.windows = { material: `${E.win.style} windows, ${E.win.glass} glass, shutters ${E.win.shutters}`, colour: colourName(E.win.fc) };
  out.fence = { material: E.fence.style === 'wall' ? `Wall, ${KINDS[E.fence.k].n}` : E.fence.style, colour: colourName(E.fence.c) };
  return out;
}
function furnitureList() {
  return S.items.filter(it => ITEMS[it.type] && !it.on && !['ceiling', 'hang', 'window', 'wallhigh'].includes(it.a) && it.a !== 'floor').map(it => ({ level: it.level, name: ITEMS[it.type].n, x: it.x, z: it.z, w: it.w, d: it.d, h: it.h, rot: it.rot, store: ITEMS[it.type].store || '', link: ITEMS[it.type].link || '', price: ITEMS[it.type].price || 0 }));
}
function exteriorList() {
  const out = {}, E = S.ext;
  Object.keys(E).forEach(k => { const v = E[k]; if (v && typeof v === 'object') { out[k] = {}; Object.keys(v).forEach(q => { const x = v[q]; out[k][q] = typeof x === 'number' ? hex(x) : typeof x === 'boolean' ? (x ? 'yes' : 'no') : String(x); }); } else out[k] = typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v); });
  out.floors = String(S.levels.length); out.items = String(S.items.length);
  return out;
}

function freshState() {
  return { step: 'welcome', name: '', shift: false, overlay: null, plot: { w: 18, d: 14 }, beds: 3, baths: 2, dining: true, laundry: true, office: false, garage: false, storeys: 1, budget: 'standard',
    levels: [{ rooms: [], A: null }], lv: 0, sel: null, layers: { plumb: false, elec: false, light: false }, mode: 'model', busy: false, aiText: '', aiNote: '', msg: '', flash: '', ref: '', claim: '', pin: '', pinBad: false, history: [], noteCount: 0,
    fin: newFin(), finTab: 'floor', finScope: '_', finPage: 0, ext: defaultExt(), exTab: 'wallOut', doorScope: 'front', items: [], nid: 0, sigs: {}, typeFin: {}, selItem: null, fView: 'room', fRoom: null, fPage: 0, fCat: 'Seating', fSlot: null, styleAll: true, roofOn: true, cut: false, walkLv: 0 };
}
async function resetAll() {
  try { localStorage.removeItem('crs2'); } catch (e) { /* ignore */ }
  Object.assign(S, freshState()); lastMode = null;
  await newSession(); rebuild(); applyMode(); draw();
}
async function newSession() { try { S.session = (await api('/api/session', {})).id; S.noteCount = 0; } catch (e) { S.session = null; } }

/* ---------------- input: controllers in VR, mouse on a computer ---------------- */
const ray = new THREE.Raycaster(); const controllers = [];
const mkCtrl = i => {
  const c = renderer.xr.getController(i); c.addEventListener('selectstart', () => onRay(c));
  c.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1.6)]), new THREE.LineBasicMaterial({ color: 0x000000 })));
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.11, 12), blackMat); b.rotation.x = Math.PI / 2; c.add(b);
  const tp = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), whiteMat); tp.position.z = -0.06; c.add(tp);
  rig.add(c); controllers.push(c);
};
mkCtrl(0); mkCtrl(1);
const itemOf = (o) => { while (o) { if (o.userData && o.userData.itemId) return o.userData.itemId; o = o.parent; } return null; };
function pick() {
  const list = [panel]; if (S.mode !== 'walk') list.push(roomsG, itemsG);
  const hits = ray.intersectObjects(list.filter(o => o.visible !== false), true).filter(h => h.object.isMesh);
  return hits[0] || null;
}
function uvToId(uv) { const x = uv.x * 1024, y = (1 - uv.y) * 1024; for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id; } return null; }
/* drag and drop: press on a room (Shape rooms) or on furniture (Furniture), move, release to place it */
let drag = null;
const ghost = new THREE.Group(); const ghostMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
const ghostBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat), ghostEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x000000, depthTest: false }));
ghostEdge.renderOrder = 30; ghost.add(ghostBox, ghostEdge); ghost.visible = false; world.add(ghost);
function planePoint() {
  const yW = world.localToWorld(new THREE.Vector3(0, elev(S.lv) + 0.06, 0)).y, pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -yW), p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(pl, p)) return null; return world.worldToLocal(p);
}
function showGhost(x0, z0, w, d, h, ok) { ghost.visible = true; ghost.position.set(x0 + w / 2, elev(S.lv) + 0.06 + h / 2, z0 + d / 2); ghost.scale.set(w, h, d); ghostMat.color.set(ok ? 0x000000 : 0xcc2222); ghostEdge.material.color.set(ok ? 0x000000 : 0xcc2222); }

/* magnet: a room being dragged clicks onto the edges of its neighbours (sides touching, or lined up) when it comes within 0.45 m */
function magnet(r, rawX, rawZ, nx, nz) {
  const T = 0.45; let bx = null, bz = null, hit = false;
  const tryX = (v) => { const d = Math.abs(v - rawX); if (d < T && (bx === null || d < bx.d)) bx = { v, d }; };
  const tryZ = (v) => { const d = Math.abs(v - rawZ); if (d < T && (bz === null || d < bz.d)) bz = { v, d }; };
  for (const o of S.rooms) { if (o.id === r.id) continue;
    const overlapZ = rawZ < o.z + o.d + T && rawZ + r.d > o.z - T, overlapX = rawX < o.x + o.w + T && rawX + r.w > o.x - T;
    if (overlapZ) { tryX(o.x + o.w); tryX(o.x - r.w); }                     // side by side
    if (overlapX) { tryZ(o.z + o.d); tryZ(o.z - r.d); }                     // front to back
    if (overlapZ || overlapX) { tryX(o.x); tryX(o.x + o.w - r.w); tryZ(o.z); tryZ(o.z + o.d - r.d); } }   // lined up
  tryX(0); tryX(S.plot.w - r.w); tryZ(0); tryZ(S.plot.d - r.d);
  if (bx) { nx = bx.v; hit = true; } if (bz) { nz = bz.v; hit = true; }
  nx = Math.max(0, Math.min(S.plot.w - r.w, nx)); nz = Math.max(0, Math.min(S.plot.d - r.d, nz));
  return { x: Math.round(nx * 100) / 100, z: Math.round(nz * 100) / 100, hit };
}
function startDrag(h, ctrl) {
  if (S.mode === 'walk') return false;
  const iid = itemOf(h.object);
  if (S.step === 'furnish' && iid) {
    const it = S.items.find(i => i.id === iid); if (!it || it.level !== S.lv) return false;
    S.selItem = iid; S.fRoom = it.roomId; S.fView = 'room'; const p = world.worldToLocal(h.point.clone());
    drag = { kind: 'item', id: iid, ctrl, active: !!ctrl, ox: p.x - it.x, oz: p.z - it.z }; rebuild(); draw(); return true;
  }
  const rid = h.object.userData && h.object.userData.roomId, lvl = h.object.userData && h.object.userData.level;
  if (rid && lvl === S.lv && S.step === 'build') {
    const r = S.rooms.find(q => q.id === rid); if (!r) return false; S.sel = rid; const p = world.worldToLocal(h.point.clone());
    drag = { kind: 'room', id: rid, ctrl, active: !!ctrl, ox: p.x - r.x, oz: p.z - r.z }; rebuild(); draw(); return true;
  }
  return false;
}
function updateDrag() {
  if (drag && drag.kind === 'plan') { updatePlanDrag(); return; }
  if (!drag || !drag.active) return; const p = planePoint(); if (!p) return;
  if (drag.kind === 'room') {
    const r = S.rooms.find(q => q.id === drag.id); if (!r) return;
    let nx = Math.round((p.x - drag.ox) * 2) / 2, nz = Math.round((p.z - drag.oz) * 2) / 2; nx = Math.max(0, Math.min(S.plot.w - r.w, nx)); nz = Math.max(0, Math.min(S.plot.d - r.d, nz));
    { const q = magnet(r, p.x - drag.ox, p.z - drag.oz, nx, nz); nx = q.x; nz = q.z; drag.snapped = q.hit; }
    drag.nx = nx; drag.nz = nz; showGhost(nx, nz, r.w, r.d, 0.4, !roomMoveError(r, { ...r, x: nx, z: nz }));
  } else {
    const it = S.items.find(q => q.id === drag.id); if (!it) return;
    const nx = Math.round((p.x - drag.ox) * 20) / 20, nz = Math.round((p.z - drag.oz) * 20) / 20, t = itemTarget(it, nx, nz), ok = typeof t !== 'string', q = ok ? t : { x: nx, z: nz, rot: it.rot };
    drag.nx = ok ? t.x : nx; drag.nz = ok ? t.z : nz; const f = foot({ ...it, x: q.x, z: q.z, rot: q.rot });
    showGhost(f.x0, f.z0, f.x1 - f.x0, f.z1 - f.z0, Math.max(it.h, 0.1), ok);
  }
}
function planUV() { const h = ray.intersectObject(panel, false)[0]; return h ? h.uv : null; }
function inPlan(uv) { const P = planArea; if (!P) return false; const x = uv.x * 1024, y = (1 - uv.y) * 1024; return x >= P.x && x <= P.x + P.w && y >= P.y && y <= P.y + P.h; }
function startPlanDrag(h, ctrl) { if (S.mode !== 'walk' || !planArea || h.object !== panel || !inPlan(h.uv)) return false; drag = { kind: 'plan', ctrl, active: true, lv: planArea.lv }; updatePlanDrag(h.uv); return true; }
function updatePlanDrag(uv) {
  uv = uv || planUV(); const P = planArea; if (!uv || !P) return; const X = Math.max(0, Math.min(S.plot.w, (uv.x * 1024 - P.ox) / P.s)), Z = Math.max(0, Math.min(S.plot.d, ((1 - uv.y) * 1024 - P.oz) / P.s));
  const r = nearestRoom(drag.lv, X, Z); drag.room = r; drag.nx = r ? r.x + r.w / 2 : X; drag.nz = r ? r.z + r.d / 2 : Z;
  if (!planDrag || Math.abs(planDrag.x - X) > 0.15 || Math.abs(planDrag.z - Z) > 0.15 || planDrag.id !== (r && r.id)) { const t = performance.now(), snap = !planDrag || planDrag.id !== (r && r.id); planDrag = { x: X, z: Z, id: r && r.id }; if (t - (drag.lastDraw || 0) > 90 || snap && t - (drag.lastDraw || 0) > 45) { drag.lastDraw = t; draw(); } else drag.dirty = true; }
}
function endDrag(commit) {
  const d = drag; drag = null; ghost.visible = false; controls.enabled = !inXR;
  if (d && d.kind === 'plan') { planDrag = null; if (commit && d.room) walkToRoom(d.lv, d.room.id); draw(); return; }
  if (!d || !commit || !d.active || d.nx === undefined) return;
  if (d.kind === 'room') { const r = S.rooms.find(q => q.id === d.id); if (r) { const err = roomMoveError(r, { ...r, x: d.nx, z: d.nz }); if (err) flash(err); else dropRoom(r, d.nx, d.nz); } }
  else { const it = S.items.find(q => q.id === d.id); if (it) dropItem(it, d.nx, d.nz); }
}
function rayFrom(c) { c.updateMatrixWorld(); const o = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld), d = new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld); ray.set(o, d); }
function onRay(c) {
  rayFrom(c); const h = pick(); if (!h) return;
  if (h.object === panel) { if (startPlanDrag(h, c)) return; const id = uvToId(h.uv); if (id) act(id); return; }
  if (!startDrag(h, c)) click(h);
}
function onRayEnd(c) { if (drag && drag.ctrl === c) endDrag(true); }
controllers.forEach(c => c.addEventListener('selectend', () => onRayEnd(c)));
function click(h) {
  h = h || pick(); if (!h) return;
  if (h.object === panel) { const id = uvToId(h.uv); if (id) act(id); return; }
  const iid = itemOf(h.object);
  if (S.step === 'furnish' && iid) { const it = S.items.find(i => i.id === iid); if (it && it.level === S.lv) { S.selItem = iid; S.fRoom = it.roomId; S.fView = 'room'; rebuild(); draw(); } return; }
  const rid = h.object.userData.roomId, lvl = h.object.userData.level;
  if (!rid || lvl !== S.lv) return;
  if (S.step === 'build') { S.sel = rid; rebuild(); draw(); }
  else if (S.step === 'finishes' && SURFACES[S.finTab].room) { S.finScope = rid; S.sel = rid; rebuild(); draw(); }
  else if (S.step === 'furnish') { const r = S.rooms.find(q => q.id === rid); if (r && r.type !== 'stairs') { S.fRoom = rid; S.selItem = null; S.fPage = 0; draw(); } }
}
function setHover(id) { if (id !== hover) { hover = id; draw(); } }
let down = null;
const setRayMouse = (e) => { const r = canvas.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera); };
canvas.addEventListener('pointerdown', e => {
  down = { x: e.clientX, y: e.clientY, moved: false }; if (inXR || e.button !== 0) return; setRayMouse(e);
  const h = pick(); if (h && (h.object === panel ? startPlanDrag(h, null) : startDrag(h, null))) { controls.enabled = false; down.drag = true; canvas.setPointerCapture(e.pointerId); }
});
canvas.addEventListener('pointerup', e => {
  if (!down || inXR) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), wasDrag = down.drag; down = null;
  if (wasDrag) { try { canvas.releasePointerCapture(e.pointerId); } catch (x) { /* ok */ } if (drag && drag.active) { endDrag(true); } else { endDrag(false); } return; }
  if (moved > 6) return; setRayMouse(e); click();
});
canvas.addEventListener('pointermove', e => {
  if (inXR) return; setRayMouse(e);
  if (drag && down && down.drag) { if (!drag.active && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) drag.active = true; updateDrag(); return; }
  const h = ray.intersectObject(panel, false)[0]; setHover(h ? uvToId(h.uv) : null);
});
document.addEventListener('contextmenu', e => e.preventDefault());

function placePanel() {
  if (!inXR) { if (panel.parent !== camera) camera.add(panel); const a = camera.aspect || 1.6, hh = Math.tan(THREE.MathUtils.degToRad(30)) * 1.25, ww = hh * a, s = Math.min(0.7, (ww * 2 - 0.1) / 1.1, (hh * 2 - 0.08) / 1.1); panel.scale.setScalar(s); panel.position.set(-ww + s * 0.55 + 0.04, 0, -1.25); panel.rotation.set(0, 0, 0); panel.visible = true; return; }
  if (panel.parent !== scene) scene.add(panel);
  if (S.mode === 'walk') {
    const p = new THREE.Vector3(); camera.getWorldPosition(p); const d = new THREE.Vector3(); camera.getWorldDirection(d); d.y = 0; d.normalize();
    panel.position.copy(p).addScaledVector(d, 1.05); panel.position.y = p.y - 0.05; panel.lookAt(p.x, panel.position.y, p.z); panel.scale.setScalar(0.8);
  } else { panel.position.set(-0.95, 1.3, -0.7); panel.lookAt(0, 1.4, 0); panel.scale.setScalar(1); panel.visible = true; }
}
renderer.xr.addEventListener('sessionstart', () => { inXR = true; controls.enabled = false; lastMode = null; applyMode(); panel.visible = true; });
renderer.xr.addEventListener('sessionend', () => { inXR = false; controls.enabled = true; lastMode = null; applyMode(); });
document.getElementById('vrslot').appendChild(VRButton.createButton(renderer));

/* thumbstick walking and menu button */
const prevBtn = {}; let turnCool = 0;
function pollXR(dt) {
  const sess = renderer.xr.getSession(); if (!sess) return;
  for (const src of sess.inputSources) {
    const gp = src.gamepad; if (!gp) continue; const key = src.handedness;
    const pressed = (gp.buttons[4] && gp.buttons[4].pressed) || (gp.buttons[5] && gp.buttons[5].pressed);
    if (pressed && !prevBtn[key]) { if (S.mode === 'walk') { panel.visible = !panel.visible; if (panel.visible) placePanel(); } else placePanel(); }
    prevBtn[key] = pressed;
    if (S.mode !== 'walk') continue;
    const ax = gp.axes, x = ax[2] || 0, y = ax[3] || 0;
    if (key === 'left' && (Math.abs(x) > 0.15 || Math.abs(y) > 0.15)) {
      const d = new THREE.Vector3(); camera.getWorldDirection(d); d.y = 0; d.normalize(); const rgt = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0));
      rig.position.addScaledVector(d, -y * 1.6 * dt).addScaledVector(rgt, x * 1.6 * dt);
    }
    if (key === 'right') { turnCool -= dt; if (Math.abs(x) > 0.7 && turnCool <= 0) { rig.rotation.y -= Math.sign(x) * THREE.MathUtils.degToRad(30); turnCool = 0.3; } }
  }
}
function hoverXR() {
  let id = null;
  for (const c of controllers) { if (!c.visible) continue; c.updateMatrixWorld(); const o = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld), d = new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld); ray.set(o, d); const h = ray.intersectObject(panel, false)[0]; if (h && panel.visible) { id = uvToId(h.uv); break; } }
  setHover(id);
}

/* ---------------- staff messages ---------------- */
setInterval(async () => {
  if (!S.session) return;
  try { const r = await api(`/api/session/${S.session}/notes?since=${S.noteCount}`); if (r.notes && r.notes.length) { S.msg = r.notes[r.notes.length - 1].text; S.msgAt = Date.now(); S.noteCount = r.total; draw(); } } catch (e) { /* offline */ }
}, 4000);

/* ---------------- loop ---------------- */
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (!inXR) placePanel(); }
addEventListener('resize', resize);
const clock = new THREE.Clock(); let markerT = 0, lastHere = { x: 0, z: 0 }; const keys = new Set();
addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; keys.add(e.key.toLowerCase()); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase())); addEventListener('blur', () => keys.clear());
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.1, clock.getDelta());
  if (!inXR && S.mode === 'walk' && S.walkSp && keys.size) {
    const d = new THREE.Vector3(); camera.getWorldDirection(d); d.y = 0; d.normalize(); const rt = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)), sp = (keys.has('shift') ? 3.2 : 1.6) * dt;
    let mx = 0, mz = 0; if (keys.has('w') || keys.has('arrowup')) { mx += d.x; mz += d.z; } if (keys.has('s') || keys.has('arrowdown')) { mx -= d.x; mz -= d.z; } if (keys.has('d') || keys.has('arrowright')) { mx += rt.x; mz += rt.z; } if (keys.has('a') || keys.has('arrowleft')) { mx -= rt.x; mz -= rt.z; }
    if (mx || mz) { S.walkSp.x += mx * sp; S.walkSp.z += mz * sp; world.position.set(-S.walkSp.x, -S.walkSp.y, -S.walkSp.z); }
  }
  markerT -= dt; if (markerT <= 0) { markerT = 0.4; if (S.mode === 'walk' && S.step === 'walk' && panel.visible && !drag) { const h = walkHere(); if (Math.hypot(h.x - lastHere.x, h.z - lastHere.z) > 0.3) { lastHere = h; draw(); } } }
  if (inXR) { pollXR(dt); hoverXR(); if (drag && drag.ctrl) { rayFrom(drag.ctrl); updateDrag(); } } else controls.update();
  renderer.render(scene, camera);
});

/* ---------------- start ---------------- */
(async function init() {
  let r = null; try { r = JSON.parse(localStorage.getItem('crs2') || 'null'); } catch (e) { r = null; }
  if (r && Array.isArray(r.levels) && r.levels.length) {
    Object.assign(S, { step: r.step || 'welcome', plot: r.plot || S.plot, beds: r.beds, baths: r.baths, dining: r.dining, laundry: r.laundry, office: r.office, garage: !!r.garage, storeys: r.levels.length,
      levels: r.levels.map(l => ({ rooms: l.rooms || [], A: null })), lv: Math.min(r.lv || 0, r.levels.length - 1), ref: r.ref || '', claim: r.claim || '', name: r.name || '', session: r.session, items: r.items || [], nid: r.nid || 0, sigs: r.sigs || {}, typeFin: r.typeFin || {} });
    if (r.fin) S.fin = Object.assign(newFin(), r.fin);
    if (r.ext) S.ext = Object.assign(defaultExt(), r.ext);
    if (S.step === 'done') S.step = 'welcome';
  }
  if (S.session) { const ok = await api(`/api/session/${S.session}/notes?since=0`).then(x => !x.error).catch(() => false); if (!ok) S.session = null; }
  if (!S.session) await newSession();
  resize();
  if (S.levels.some(l => l.rooms.length)) refresh(); else rebuild();
  applyMode(); draw(); save();
  loadLibrary(() => { rebuild(); draw(); });
  document.getElementById('boot').style.opacity = 0; setTimeout(() => document.getElementById('boot').remove(), 600);
})();
if (DEBUG) window.__crs = { S, act, draw, go, refresh, walkTo, rebuild, panel, get planArea() { return planArea; }, get planDrag() { return planDrag; }, set planDrag(v) { planDrag = v; }, walkHere, renderer, scene, camera, ceilG, roofG, THREE };

/* ===================================================================================
   Desktop studio (D5-style): top toolbar, library on the left, properties on the right.
   Used on a computer. In the headset the 3D panel above is used instead.
   Everything here calls the same functions as the headset panel, so both stay in step.
   =================================================================================== */
const PRO = !/[?&]panel\b/.test(location.search);
/* the mission: clients come to our studio. Outside the headset the public sees a visit-us screen; staff add ?staff to demo on a computer */
const GATE = PRO && !/[?&]staff\b/.test(location.search);
const LIGHT0 = { sun: 1.35, amb: 1.35, az: 215, el: 52, bg: '#f3f3f1' };
const LIGHT = Object.assign({}, LIGHT0, (() => { try { return JSON.parse(localStorage.getItem('crslight') || '{}'); } catch (e) { return {}; } })());
S.client = S.client || { name: '', email: '', phone: '', address: '', notes: '' };
try { const sv = JSON.parse(localStorage.getItem('crsclient') || 'null'); if (sv) Object.assign(S.client, sv); } catch (e) { /* ignore */ }
const el = (t, a, ...k) => { const e = document.createElement(t); if (a) Object.keys(a).forEach(n => { if (n === 'class') e.className = a[n]; else if (n === 'html') e.innerHTML = a[n]; else if (n.startsWith('on')) e.addEventListener(n.slice(2), a[n]); else if (a[n] !== false && a[n] != null) e.setAttribute(n, a[n]); }); k.flat().forEach(c => c != null && e.append(c)); return e; };
const css2hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6), hex2num = (h) => parseInt(String(h).replace('#', ''), 16);
function applyLight() {
  sun.intensity = LIGHT.sun; hemi.intensity = LIGHT.amb; scene.background = new THREE.Color(LIGHT.bg);
  const az = LIGHT.az * Math.PI / 180, el_ = LIGHT.el * Math.PI / 180, R = 18;
  sun.position.set(Math.cos(el_) * Math.sin(az) * R, Math.sin(el_) * R, Math.cos(el_) * Math.cos(az) * R);
  sun.color.set(LIGHT.el < 18 ? 0xffc890 : 0xfff4e0);
  try { localStorage.setItem('crslight', JSON.stringify(LIGHT)); } catch (e) { /* ignore */ }
}
applyLight();

const PRO_CSS = `
#pro{position:fixed;inset:0;pointer-events:none;font:14px/1.35 Helvetica,Arial,sans-serif;color:#000;z-index:5}
#pro *{box-sizing:border-box}
#pro .bar{position:absolute;left:0;right:0;top:0;height:52px;background:#000;color:#fff;display:flex;align-items:center;gap:6px;padding:0 12px;pointer-events:auto}
#pro .bar img{height:24px;margin-right:10px}
#pro .tab{background:none;border:0;color:#bbb;padding:8px 12px;border-radius:6px;cursor:pointer;font:inherit}
#pro .tab.on{background:#fff;color:#000;font-weight:700}
#pro .tab:hover{color:#fff}#pro .tab.on:hover{color:#000}
#pro .sp{flex:1}
#pro .go{background:#fff;color:#000;border:0;border-radius:6px;padding:8px 14px;font-weight:700;cursor:pointer}
#pro .lib,#pro .ins{position:absolute;top:60px;bottom:34px;background:#fff;border:1px solid #000;border-radius:10px;display:flex;flex-direction:column;overflow:hidden;pointer-events:auto}
#pro .lib{left:8px;width:262px}#pro .ins{right:8px;width:318px}
#pro .hd{padding:10px 12px;font-weight:700;border-bottom:1px solid #ddd;display:flex;gap:6px;flex-wrap:wrap}
#pro .hd .tab{color:#555;padding:5px 9px;border:1px solid #ccc}#pro .hd .tab.on{background:#000;color:#fff;border-color:#000}
#pro .scroll{overflow:auto;padding:10px 12px;flex:1}
#pro .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#pro .card{border:1px solid #bbb;border-radius:8px;padding:8px;background:#fafafa;cursor:pointer;text-align:left;font:inherit;color:#000}
#pro .card:hover{border-color:#000;background:#fff}#pro .card.on{border:2px solid #000;background:#eee;padding:7px}
#pro .card small{display:block;color:#666}
#pro h4{margin:14px 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#555}
#pro h4:first-child{margin-top:0}
#pro .row{display:flex;align-items:center;gap:6px;margin:5px 0}
#pro .row label{flex:0 0 92px;color:#333}
#pro input[type=text],#pro input[type=number],#pro input[type=email],#pro input[type=tel],#pro select,#pro textarea{flex:1;min-width:0;border:1px solid #999;border-radius:6px;padding:6px 8px;font:inherit;background:#fff}
#pro input[type=range]{flex:1}
#pro input[type=color]{width:40px;height:30px;border:1px solid #999;border-radius:6px;padding:1px;background:#fff;cursor:pointer}
#pro .sw{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}
#pro .sw i{width:22px;height:22px;border-radius:4px;border:1px solid #888;cursor:pointer}
#pro .sw i.on{outline:2px solid #000;outline-offset:1px}
#pro .btn{border:1px solid #000;background:#fff;border-radius:6px;padding:6px 10px;cursor:pointer;font:inherit}
#pro .btn:hover{background:#eee}#pro .btn.dark{background:#000;color:#fff}#pro .btn.red{border-color:#a00;color:#a00}
#pro .btns{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
#vrslot button{left:auto!important;right:8px!important;bottom:8px!important;transform:none!important}
#pro .walkbar{position:absolute;left:8px;right:190px;bottom:8px;display:flex;flex-direction:column;gap:6px;pointer-events:none}#pro .chips{display:flex;flex-wrap:wrap;gap:6px;pointer-events:auto}#pro .chip{background:rgba(0,0,0,.78);color:#fff;border:0;border-radius:20px;padding:7px 14px;cursor:pointer;font:inherit}#pro .chip:hover{background:#000}
#pro .st{position:absolute;left:8px;right:190px;bottom:6px;height:24px;display:flex;align-items:center;gap:14px;color:#222;pointer-events:none;text-shadow:0 0 4px #fff,0 0 4px #fff}
#pro .msg{position:absolute;left:50%;top:64px;transform:translateX(-50%);background:#000;color:#fff;padding:8px 14px;border-radius:8px;pointer-events:none}
#pro .modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;pointer-events:auto}
#pro .box{background:#fff;border:2px solid #000;border-radius:12px;padding:22px 24px;width:min(520px,94vw);max-height:92vh;overflow:auto}
#pro .box h2{margin:0 0 4px}#pro .box p{margin:0 0 12px;color:#444}
#pro .box .row label{flex-basis:110px}
#pro .ok{color:#060}#pro .bad{color:#a00}
@media (max-width:900px){#pro .lib{width:200px}#pro .ins{width:240px}}
`;

const proState = { libTab: 'rooms', cat: 'Seating', insTab: 'props', modal: null, typing: false, sendMsg: '' };
let proRoot = null, proQueued = false;
const STEP_TABS = [['build', 'Plan'], ['finishes', 'Materials'], ['exterior', 'Exterior'], ['furnish', 'Furniture & decor'], ['utilities', 'Utilities']];

function proSet(path, val) { setPath(S.ext, path, val); rebuild(); draw(); save(); }
function proFin(tab, scope, k, c) { const m = S.fin[tab]; if (SURFACES[tab].room && scope === '_') Object.keys(m).forEach(key => { if (key !== '_') delete m[key]; }); m[scope] = { k, c }; rebuild(); draw(); save(); }
const nm_ = (n, v, step, min, max) => el('input', { type: 'number', value: v, step: step || 0.1, min, max });
function numRow(label, v, step, min, max, onSet, unit) {
  const i = nm_(label, +(+v).toFixed(2), step, min, max); i.addEventListener('focus', () => { proState.typing = true; }); i.addEventListener('blur', () => { proState.typing = false; });
  i.addEventListener('change', () => { const x = parseFloat(i.value); if (isFinite(x)) onSet(x); proState.typing = false; proQ(); });
  return el('div', { class: 'row' }, el('label', null, label), i, unit ? el('span', null, unit) : null);
}
function txtRow(label, v, onSet, type, ph, max) {
  const i = el('input', { type: type || 'text', value: v || '', placeholder: ph || '', maxlength: max || 60 });
  i.addEventListener('focus', () => { proState.typing = true; }); i.addEventListener('blur', () => { proState.typing = false; });
  i.addEventListener('change', () => { onSet(i.value); proState.typing = false; });
  return el('div', { class: 'row' }, el('label', null, label), i);
}
function colRow(label, num, onSet) {
  const i = el('input', { type: 'color', value: css2hex(num) }); i.addEventListener('input', () => { proState.typing = true; }); i.addEventListener('change', () => { onSet(hex2num(i.value)); proState.typing = false; proQ(); });
  return el('div', { class: 'row' }, el('label', null, label), i, el('span', { style: 'color:#666' }, css2hex(num)));
}
function swRow(cur, onSet) {
  return el('div', { class: 'sw' }, COLOURS.map(([n, c]) => el('i', { class: c === cur ? 'on' : '', title: n, style: 'background:' + css2hex(c), onclick: () => onSet(c) })));
}
function optRow_(label, cur, list, onSet) {
  const s = el('select'); list.forEach(([v, l]) => s.append(el('option', { value: v, selected: v === cur ? 'selected' : null }, l))); s.addEventListener('change', () => { onSet(s.value); proQ(); });
  return el('div', { class: 'row' }, el('label', null, label), s);
}
const togRow = (label, on, onSet) => { const c = el('input', { type: 'checkbox' }); c.checked = !!on; c.addEventListener('change', () => { onSet(c.checked); proQ(); }); return el('div', { class: 'row' }, el('label', null, label), c); };
const rngRow = (label, v, min, max, step, onSet) => { const r = el('input', { type: 'range', min, max, step, value: v }); r.addEventListener('input', () => onSet(+r.value)); return el('div', { class: 'row' }, el('label', null, label), r); };
const matList = (kinds) => kinds.map(k => [k, KINDS[k].n]);


/* ---------- my own pieces: custom sizes, store products, AI-made items ---------- */
const CUSTOM_CAT = 'My items';
function tintSlots(slots, hexes) {
  const out = {}; let n = 0;
  Object.keys(slots || {}).forEach(nm => {
    const s = slots[nm]; let def = s.def, tintable = s.kinds && s.kinds.some(k => KINDS[k] && KINDS[k].tint) && !/leg|metal|frame/i.test(s.n || nm);
    if (tintable && hexes[n]) { const k = KINDS[def.k] && KINDS[def.k].tint ? def.k : s.kinds.find(q => KINDS[q] && KINDS[q].tint); def = { k, c: hex2num(hexes[n]) }; n++; }
    out[nm] = Object.assign({}, s, { def });
  });
  return out;
}
function registerCustom(d) {
  const b = ITEMS[d.tpl]; if (!b || !d.key) return;
  if (!CATS.includes(CUSTOM_CAT)) CATS.push(CUSTOM_CAT);
  ITEMS[d.key] = Object.assign({}, b, { n: d.name, cat: CUSTOM_CAT, w: d.w, d: d.d, h: d.h, custom: true, tpl: d.tpl, store: d.store || '', link: d.link || '', price: d.price || 0, slots: tintSlots(b.slots, [d.colour, d.colour2]) });
  aliasModel(d.key, d.tpl);
}
try { const sv = JSON.parse(localStorage.getItem('crs2') || 'null'); if (sv && Array.isArray(sv.custom)) { S.customDefs = sv.custom.filter(d => d && d.key && ITEMS[d.tpl]); S.customDefs.forEach(registerCustom); } if (sv) S.cove = !!sv.cove; } catch (e) { /* ignore */ }
function makeCustom(d) {
  const num = (v, lo, hi, df) => { v = +v; return isFinite(v) && v > 0 ? Math.max(lo, Math.min(hi, v)) : df; }, b = ITEMS[d.tpl]; if (!b) return null;
  const def = { key: 'my_' + Date.now().toString(36) + Math.floor(Math.random() * 99), tpl: d.tpl, name: String(d.name || b.n).replace(/[<>]/g, '').slice(0, 40) || b.n, w: num(d.w, 0.05, 8, b.w), d: num(d.d, 0.05, 8, b.d), h: num(d.h, 0.05, 6, b.h), colour: d.colour || null, colour2: d.colour2 || null, store: String(d.store || '').slice(0, 40), link: /^https?:\/\//.test(d.link || '') ? String(d.link).slice(0, 200) : '', price: Math.max(0, +d.price || 0) };
  S.customDefs.push(def); registerCustom(def); save(); return def;
}
const CAT_ROOMS = { Seating: ['living', 'dining', 'office', 'bedroom'], Beds: ['bedroom'], Tables: ['dining', 'living', 'kitchen', 'office'], Storage: ['bedroom', 'living', 'office'], Kitchen: ['kitchen'], Bath: ['bathroom'], Lighting: ['living', 'bedroom', 'dining'], Decor: ['living', 'bedroom', 'dining'], Plants: ['living', 'hall', 'dining'], Rugs: ['living', 'bedroom'], Garage: ['garage'], Kids: ['bedroom'] };
function placeCard(k) {
  const A = S.A; if (!A) return flash('Add some rooms first.');
  if (isOutdoor(k)) { S.fRoom = 'yard'; return addItem(k); }
  const rs = A.design.rooms, tp = ITEMS[k].tpl && ITEMS[ITEMS[k].tpl] ? ITEMS[ITEMS[k].tpl].cat : ITEMS[k].cat, pref = CAT_ROOMS[tp] || [];
  const order = [...(S.fRoom && S.fRoom !== 'yard' ? rs.filter(r => r.id === S.fRoom) : []), ...rs.filter(r => r.id === S.sel), ...pref.flatMap(t => rs.filter(r => r.type === t)), ...rs];
  for (const r of order) { if (r.type === 'stairs') continue; const ri = rs.indexOf(r); if (placeNew(A, S.lv, S.items.filter(i => i.level === S.lv), ri, k)) { S.fRoom = r.id; return addItem(k); } }
  flash('There is no space for that. Make a room bigger or choose a smaller size.');
}
const LOOK_FABRIC = { modern: [0xbdbab4, 0x8d8d8d], tropical: [0x86d1be, 0xf2c230], classic: [0xecd9a8, 0x6b4b2c] };
function applyLook(name) {
  const F = {
    modern: { floor: ['herring', 0xffffff], wallIn: ['paint', 0xe9e6df], ceil: ['paint', 0xffffff], counter: ['quartz', 0xffffff], wood: 'walnut', cove: true },
    tropical: { floor: ['tilewhite', 0xffffff], wallIn: ['paint', 0xf3ead8], ceil: ['paint', 0xffffff], counter: ['granite', 0xffffff], wood: 'pine', cove: false },
    classic: { floor: ['oak', 0xffffff], wallIn: ['paint', 0xecd9a8], ceil: ['paint', 0xffffff], counter: ['marble', 0xffffff], wood: 'mahogany', cove: false }
  }[name]; if (!F) return;
  push(); ['floor', 'wallIn', 'ceil', 'counter'].forEach(t => { S.fin[t] = { _: { k: F[t][0], c: F[t][1] } }; });
  S.cove = F.cove; const fab = LOOK_FABRIC[name]; S.typeFin = {};
  Object.keys(ITEMS).forEach(t => { const sl = ITEMS[t].slots || {}; let n = 0; Object.keys(sl).forEach(nm => { const s = sl[nm], kinds = s.kinds || []; if (kinds.includes('fabric') && !/rug/.test(t)) { (S.typeFin[t] = S.typeFin[t] || {})[nm] = { k: 'fabric', c: fab[n++ % 2] }; } else if (kinds.includes(F.wood) && kinds.includes('oak')) { (S.typeFin[t] = S.typeFin[t] || {})[nm] = { k: F.wood, c: 0xffffff }; } }); });
  S.items.forEach(it => { delete it.fin; });
  rebuild(); draw(); save(); flash(({ modern: 'Modern minimal: herringbone floors, soft greys, glowing ceiling edge.', tropical: 'Tropical: white tile, warm walls, bright colours.', classic: 'Classic: oak floors, cream walls, rich wood.' })[name]);
}
const TEMPLATES = () => Object.keys(ITEMS).filter(k => !ITEMS[k].custom && ITEMS[k].cat !== 'Outdoor' || (!ITEMS[k].custom && /sofa|bed|table|chair|lounger|dining/i.test(k))).map(k => [k, ITEMS[k].n, ITEMS[k].w, ITEMS[k].d, ITEMS[k].h]);
async function askAI(prompt) {
  proState.aiBusy = true; proState.aiMsg = ''; proQ();
  try {
    const r = await api('/api/ai/item', { prompt, templates: TEMPLATES() });
    if (r.look) { applyLook(r.look); proState.aiMsg = 'Done: I changed your whole home to the ' + r.look + ' style.'; }
    else if (r.item) { const d = makeCustom({ ...r.item, colour: r.item.colour, colour2: r.item.colour2 }); if (d) { placeCard(d.key); proState.aiMsg = 'Made: ' + d.name + ' (' + d.w + ' x ' + d.d + ' x ' + d.h + ' m). ' + (r.note || '') + (r.source === 'rules' ? ' (Simple mode: add an AI key on the server for smarter results.)' : ''); } }
    else proState.aiMsg = r.answer || 'Try describing a piece of furniture, for example a dark grey sofa 2.4 m wide.';
  } catch (e) { proState.aiMsg = 'The assistant is not reachable: ' + (e && e.message); }
  proState.aiBusy = false; proQ();
}
const UNIT_M = { m: 1, cm: 0.01, ft: 0.3048, in: 0.0254 };
function shopBody(body) {
  const sub = proState.shopTab || 'browse', A = S.A;
  body.append(el('div', { class: 'hd', style: 'padding:0 0 8px;border:0' }, [['browse', 'Browse'], ['make', 'Make it'], ['stores', 'Stores']].map(([k, l]) => el('button', { class: 'tab' + (sub === k ? ' on' : ''), onclick: () => { proState.shopTab = k; proQ(); } }, l))));
  if (sub === 'browse') {
    if (!A) { body.append(el('p', null, 'Add some rooms first.')); return; }
    const rooms = [['', 'Choose a room...'], ...A.design.rooms.map(r => [r.id, r.label]), ['yard', 'Garden']];
    body.append(optRow_('Place in', S.fRoom || '', rooms, v => { S.fRoom = v || null; proQ(); }));
    body.append(optRow_('Section', proState.cat, CATS.map(c => [c, c]), v => { proState.cat = v; S.fCat = v; }));
    const q = el('input', { type: 'text', placeholder: 'Search, e.g. sofa, chandelier', value: proState.q || '' }); q.addEventListener('focus', () => { proState.typing = true; }); q.addEventListener('blur', () => { proState.typing = false; }); q.addEventListener('input', () => { proState.q = q.value; });
    q.addEventListener('change', () => { proState.typing = false; proQ(); }); body.append(el('div', { class: 'row' }, q));
    const term = (proState.q || '').toLowerCase().trim(), keys = Object.keys(ITEMS).filter(k => term ? ITEMS[k].n.toLowerCase().includes(term) : ITEMS[k].cat === proState.cat);
    body.append(el('p', { style: 'margin:6px 0;color:#555;font-size:12px' }, 'Click to add, or drag into the 3D view.'));
    if (!keys.length) body.append(el('p', null, proState.cat === CUSTOM_CAT ? 'Nothing here yet. Use Make it or Stores to add your own pieces.' : 'No matches.'));
    body.append(el('div', { class: 'grid' }, keys.map(k => dragCard('item', k, el('button', { class: 'card', onclick: () => placeCard(k) }, ITEMS[k].n, el('small', null, (+ITEMS[k].w).toFixed(2) + ' x ' + (+ITEMS[k].d).toFixed(2) + ' x ' + (+ITEMS[k].h).toFixed(2) + ' m' + (ITEMS[k].store ? ' · ' + ITEMS[k].store : '')))))));
  } else if (sub === 'make') {
    body.append(el('h4', null, 'Ask the assistant'), el('p', { style: 'margin:0 0 6px;color:#444;font-size:13px' }, 'Describe it in your own words. It builds it for you if it is not in the shop.'));
    const t = el('textarea', { rows: 3, maxlength: 240, placeholder: 'e.g. A navy 3-seat sofa, 2.4 m wide  /  a queen bed 5 ft wide in grey  /  make my whole home modern' }); t.value = proState.aiText || ''; t.addEventListener('focus', () => { proState.typing = true; }); t.addEventListener('blur', () => { proState.typing = false; }); t.addEventListener('input', () => { proState.aiText = t.value; });
    body.append(el('div', { class: 'row' }, t), el('div', { class: 'btns' }, el('button', { class: 'btn dark', onclick: () => { proState.typing = false; if (!proState.aiBusy) askAI(t.value); } }, proState.aiBusy ? 'Working...' : 'Create it')));
    if (proState.aiMsg) body.append(el('p', { style: 'font-size:13px;margin:4px 0;padding:8px;background:#f2f2f2;border-left:4px solid #000' }, proState.aiMsg));
    body.append(el('h4', null, 'Or enter your own sizes'), customForm(false));
  } else {
    body.append(el('h4', null, 'Add a store product'), el('p', { style: 'margin:0 0 6px;color:#444;font-size:13px' }, 'Find the piece on the store\'s website (for example Courts Jamaica or Ashley Furniture), then copy its name, link, price and sizes here. Your design then uses the real size, and your architect sees where it came from.'), customForm(true));
  }
}
function customForm(store) {
  const F = proState.form = proState.form || { tpl: 'sofa3', name: '', unit: 'cm', w: '', d: '', h: '', colour: '#8d8d8d', store: 'Courts Jamaica', link: '', price: '' }, box = el('div');
  const inp = (label, key, type, ph) => { const i = el('input', { type: type || 'text', value: F[key], placeholder: ph || '' }); i.addEventListener('focus', () => { proState.typing = true; }); i.addEventListener('blur', () => { proState.typing = false; }); i.addEventListener('input', () => { F[key] = i.value; }); return el('div', { class: 'row' }, el('label', null, label), i); };
  if (store) box.append(optRow_('Store', F.store, [['Courts Jamaica', 'Courts Jamaica'], ['Ashley Furniture', 'Ashley Furniture'], ['Other store', 'Other store']], v => { F.store = v; }));
  box.append(inp('Name', 'name', 'text', 'e.g. Brooklyn sofa'));
  const tp = Object.keys(ITEMS).filter(k => !ITEMS[k].custom).map(k => [k, ITEMS[k].n + ' (' + ITEMS[k].cat + ')']);
  box.append(optRow_('Looks like', F.tpl, tp, v => { F.tpl = v; const b = ITEMS[v]; if (b && !F.w) { /* sizes default in the boxes below */ } proQ(); }));
  box.append(optRow_('Units', F.unit, [['cm', 'Centimetres'], ['m', 'Metres'], ['ft', 'Feet'], ['in', 'Inches']], v => { F.unit = v; proQ(); }));
  const b = ITEMS[F.tpl] || {}, df = (m) => +(m / UNIT_M[F.unit]).toFixed(F.unit === 'm' ? 2 : 1);
  box.append(inp('Width', 'w', 'number', 'e.g. ' + df(b.w)), inp('Depth', 'd', 'number', 'e.g. ' + df(b.d)), inp('Height', 'h', 'number', 'e.g. ' + df(b.h)));
  const cr = el('input', { type: 'color', value: F.colour }); cr.addEventListener('change', () => { F.colour = cr.value; }); box.append(el('div', { class: 'row' }, el('label', null, 'Colour'), cr));
  if (store) box.append(inp('Link', 'link', 'text', 'https://...'), inp('Price (JMD)', 'price', 'number', 'optional'));
  box.append(el('div', { class: 'btns' }, el('button', { class: 'btn dark', onclick: () => {
    const k = UNIT_M[F.unit], d = makeCustom({ tpl: F.tpl, name: F.name || b.n, w: F.w ? +F.w * k : b.w, d: F.d ? +F.d * k : b.d, h: F.h ? +F.h * k : b.h, colour: F.colour, store: store ? F.store : '', link: store ? F.link : '', price: store ? F.price : 0 });
    if (d) { proState.cat = CUSTOM_CAT; S.fCat = CUSTOM_CAT; placeCard(d.key); proState.aiMsg = ''; }
  } }, 'Add to my design')));
  return box;
}

/* ---------- left: library ---------- */
function libPane() {
  const tabs = el('div', { class: 'hd' }, [['rooms', 'Rooms'], ['furn', 'Shop'], ['mats', 'Materials']].map(([k, l]) => el('button', { class: 'tab' + (proState.libTab === k ? ' on' : ''), onclick: () => { proState.libTab = k; proQ(); } }, l)));
  const body = el('div', { class: 'scroll' });
  if (proState.libTab === 'rooms') {
    body.append(el('h4', null, 'Click to add a room'));
    body.append(el('p', { style: 'margin:0 0 6px;color:#555;font-size:12px' }, 'Click to add, or drag into the 3D view.'));
    body.append(el('div', { class: 'grid' }, Object.keys(TYPES).map(t => dragCard('room', t, el('button', { class: 'card', onclick: () => act('add:' + t) }, TYPES[t].n, el('small', null, TYPES[t].def[0] + ' x ' + TYPES[t].def[1] + ' m'))))));
    body.append(el('h4', null, 'Floors'), el('div', { class: 'btns' }, el('button', { class: 'btn', onclick: () => act('addfloor') }, 'Add floor'), el('button', { class: 'btn', onclick: () => act('delfloor') }, 'Remove floor')));
    body.append(el('h4', null, 'Quick start'), el('div', { class: 'btns' }, el('button', { class: 'btn', onclick: () => { proState.modal = 'brief'; proQ(); } }, 'Draft from a brief'), el('button', { class: 'btn', onclick: () => act('blank') }, 'Blank plan')));
  } else if (proState.libTab === 'furn') {
    shopBody(body);
  } else {
    body.append(el('h4', null, 'Pick what the selected surface is made of'), proMatBody());
  }
  return el('div', { class: 'lib' }, tabs, body);
}

/* ---------- materials (shared by the library and the inspector) ---------- */
function proMatBody() {
  const wrap = el('div');
  const tabs = Object.keys(SURFACES), tab = S.finTab && SURFACES[S.finTab] ? S.finTab : 'floor';
  wrap.append(optRow_('Surface', tab, tabs.map(t => [t, SURFACES[t].n || t]), v => { S.finTab = v; S.finScope = '_'; draw(); }));
  const rooms = (S.levels.flatMap(l => l.A ? l.A.design.rooms : []));
  if (SURFACES[tab].room) wrap.append(optRow_('Applies to', S.finScope || '_', [['_', 'Every room'], ...rooms.map(r => [r.id, r.label])], v => { S.finScope = v; if (v !== '_') S.sel = v; rebuild(); draw(); }));
  const sc = SURFACES[tab].room ? S.finScope || '_' : '_', cur = finPick(tab, sc, (rooms.find(r => r.id === sc) || {}).type);
  wrap.append(el('div', { class: 'grid' }, SURFACES[tab].kinds.map(k => el('button', { class: 'card' + (cur.k === k ? ' on' : ''), onclick: () => proFin(tab, sc, k, KINDS[k].tint ? cur.c : 0xffffff) }, KINDS[k].n))));
  if (KINDS[cur.k].tint) { wrap.append(el('h4', null, 'Colour'), swRow(cur.c, c => proFin(tab, sc, cur.k, c)), colRow('Any colour', cur.c, c => proFin(tab, sc, cur.k, c))); }
  return wrap;
}

/* ---------- right: properties ---------- */
function insPane() {
  const tabs = el('div', { class: 'hd' }, [['props', 'Properties'], ['ext', 'Exterior'], ['mat', 'Materials'], ['light', 'Lighting'], ['me', 'Client']].map(([k, l]) => el('button', { class: 'tab' + (proState.insTab === k ? ' on' : ''), onclick: () => { proState.insTab = k; proQ(); } }, l)));
  const body = el('div', { class: 'scroll' });
  const t = proState.insTab;
  if (t === 'props') propsBody(body); else if (t === 'ext') extBody(body); else if (t === 'mat') body.append(proMatBody()); else if (t === 'light') lightBody(body); else clientBody(body);
  return el('div', { class: 'ins' }, tabs, body);
}
function propsBody(b) {
  const it = selItemObj(), r = S.rooms.find(x => x.id === S.sel);
  if (it && ITEMS[it.type]) {
    b.append(el('h4', null, ITEMS[it.type].n));
    const spec = ITEMS[it.type];
    if (spec.custom) b.append(txtRow('Name', spec.n, v => { const d = S.customDefs.find(q => q.key === it.type); if (d && v.trim()) { d.name = v.trim().slice(0, 40); spec.n = d.name; save(); } }, 'text', '', 40));
    b.append(numRow('Width', it.w, 0.05, 0.05, 8, v => proItem(it, { w: v }), 'm'), numRow('Depth', it.d, 0.05, 0.05, 8, v => proItem(it, { d: v }), 'm'), numRow('Height', it.h, 0.05, 0.05, 6, v => proItem(it, { h: v }), 'm'));
    if (spec.store || spec.link || spec.price) b.append(el('p', { style: 'font-size:13px;margin:6px 0;padding:8px;background:#f2f2f2' }, el('b', null, spec.store || 'Store'), spec.price ? ' · J$' + Number(spec.price).toLocaleString('en-US') : '', spec.link ? el('div', null, el('a', { href: spec.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open the product page')) : null));
    b.append(numRow('Left/right', it.x, 0.05, -50, 80, v => moveItem(it, v - it.x, 0), 'm'), numRow('Front/back', it.z, 0.05, -50, 80, v => moveItem(it, 0, v - it.z), 'm'));
    b.append(el('div', { class: 'btns' }, el('button', { class: 'btn', onclick: () => turnItem(it) }, 'Turn 90'), el('button', { class: 'btn', onclick: () => addItem(it.type) }, 'Copy'), el('button', { class: 'btn red', onclick: () => removeItem(it) }, 'Delete')));
    const sl = ITEMS[it.type].slots || {}; const names = Object.keys(sl);
    if (names.length) b.append(el('h4', null, 'Item colours'));
    names.forEach(n => { const cur = slotFin(it, n); b.append(colRow(sl[n].n || n, cur.c === 0xffffff ? (sl[n].def.c || 0x888888) : cur.c, c => { it.fin = it.fin || {}; it.fin[n] = { k: cur.k, c }; rebuild(); draw(); save(); })); });
    return;
  }
  if (r) {
    b.append(el('h4', null, TYPES[r.type].n));
    b.append(txtRow('Name', r.name || '', v => edit(n => { n.name = v.slice(0, 24); }), 'text', r.label, 24));
    if (r.type !== 'stairs') b.append(numRow('Width', r.w, 0.5, 1.5, 30, v => edit(n => { n.w = v; }), 'm'), numRow('Depth', r.d, 0.5, 1.5, 30, v => edit(n => { n.d = v; }), 'm'));
    b.append(numRow('Left/right', r.x, 0.5, 0, 60, v => edit(n => { n.x = v; }), 'm'), numRow('Front/back', r.z, 0.5, 0, 60, v => edit(n => { n.z = v; }), 'm'));
    b.append(el('div', { class: 'btns' }, el('button', { class: 'btn', onclick: () => act('undo') }, 'Undo'), el('button', { class: 'btn red', onclick: () => act('del') }, 'Delete room')));
    b.append(el('p', { style: 'color:#666;font-size:12px' }, 'Tip: you can also drag rooms and furniture in the 3D view.'));
    return;
  }
  b.append(el('h4', null, 'Your plot'));
  b.append(numRow('Width', S.plot.w, 0.5, 6, 60, v => { push(); S.plot = { w: v, d: S.plot.d }; refresh(); }, 'm'), numRow('Depth', S.plot.d, 0.5, 6, 60, v => { push(); S.plot = { w: S.plot.w, d: v }; refresh(); }, 'm'));
  b.append(el('h4', null, 'Style of the whole home'), el('div', { class: 'grid' }, [['modern', 'Modern minimal'], ['tropical', 'Tropical'], ['classic', 'Classic']].map(([k, l]) => el('button', { class: 'card', onclick: () => applyLook(k) }, l))));
  b.append(el('h4', null, 'Layers'));
  [['plumb', 'Plumbing'], ['elec', 'Electrical'], ['light', 'Lighting plan']].forEach(([k, l]) => b.append(togRow(l, S.layers[k], () => act('layer:' + k))));
  b.append(togRow('Show roof', S.roofOn, () => act('exroof')), togRow('Cut away upper floors', S.cut, () => act('excut')));
  b.append(el('p', { style: 'color:#666;font-size:12px' }, 'Click a room or a piece of furniture to change its size, name and colours.'));
}
function proItem(it, ch) {
  const n = { ...it, ...ch }, r = itemRoom(it), f = foot(n);
  if (r && it.roomId !== 'yard' && (f.x0 < r.x - 0.02 || f.x1 > r.x + r.w + 0.02 || f.z0 < r.z - 0.02 || f.z1 > r.z + r.d + 0.02)) return flash('That would not fit in the room.');
  Object.assign(it, ch); it.auto = false; rebuild(); draw(); save();
}

const ROOF_PLAIN = {
  gable: ['Gable', 'Two sloping sides that meet at a peak along the top, like an upside-down V. The two end walls rise to a triangle. Rain runs straight off and it is simple to build.', '<path d="M6 24 L32 6 L58 24 Z" fill="#000"/><rect x="12" y="24" width="40" height="14" fill="#fff" stroke="#000" stroke-width="2"/>'],
  hip: ['Hip', 'All four sides slope down to the walls, so there is no triangle end. The roof looks like a gentle pyramid. Many builders like it in hurricane areas because wind has no flat end wall to push on. Ask your architect.', '<path d="M4 24 L18 8 L46 8 L60 24 Z" fill="#000"/><rect x="12" y="24" width="40" height="14" fill="#fff" stroke="#000" stroke-width="2"/>'],
  flat: ['Flat', 'A nearly level roof with a low wall around the edge. It gives a modern look and can be used as a terrace, but it needs very good waterproofing.', '<rect x="8" y="18" width="48" height="6" fill="#000"/><rect x="12" y="24" width="40" height="14" fill="#fff" stroke="#000" stroke-width="2"/>'],
  mono: ['Sloping', 'One single slope, high on one side and low on the other, like a ramp. A simple, modern look, and the rain runs to one side.', '<path d="M6 24 L58 8 L58 14 L6 28 Z" fill="#000"/><rect x="12" y="26" width="40" height="12" fill="#fff" stroke="#000" stroke-width="2"/>']
};
function roofPicker(b) {
  const R = S.ext.roof;
  b.append(el('div', { class: 'grid' }, Object.keys(ROOF_PLAIN).map(k => el('button', { class: 'card' + (R.style === k ? ' on' : ''), onclick: () => exAct('roof.style=' + k), style: 'text-align:center' }, el('span', { html: '<svg viewBox="0 0 64 42" width="64" height="42">' + ROOF_PLAIN[k][2] + '</svg>' }), el('div', { style: 'font-weight:700' }, ROOF_PLAIN[k][0])))));
  b.append(el('p', { style: 'margin:8px 0;padding:8px;background:#f2f2f2;border-left:4px solid #000;font-size:13px' }, el('b', null, ROOF_PLAIN[R.style][0] + ' roof: '), ROOF_PLAIN[R.style][1]));
}
function extBody(b) {
  const E = S.ext, h = (t) => b.append(el('h4', null, t));
  const col = (l, p) => b.append(colRow(l, getPath(E, p), c => proSet(p, c)));
  const opt = (l, p, list) => b.append(optRow_(l, getPath(E, p), list, v => { if (/\.(style|k)$/.test(p)) exAct(p + '=' + v); else proSet(p, v); }));
  const tog = (l, p) => b.append(togRow(l, getPath(E, p), v => proSet(p, v)));
  h('Roof'); roofPicker(b); opt('Roofing', 'roof.k', matList(['cltile', 'metalroof', 'shingle'])); col('Roof colour', 'roof.c'); col('Edge boards', 'roof.fc'); tog('Solar panels', 'roof.solar');
  h('Front door'); opt('Style', 'door.style', DOOR_STYLES); col('Colour', 'door.c');
  h('Inside doors'); opt('Style', 'doorIn.style', DOOR_STYLES); col('Colour', 'doorIn.c');
  h('Garage door'); col('Colour', 'garage.c');
  h('Windows'); opt('Style', 'win.style', WINDOW_STYLES); col('Frame', 'win.fc'); opt('Glass', 'win.glass', [['clear', 'Clear'], ['blue', 'Blue'], ['bronze', 'Bronze'], ['dark', 'Dark'], ['frost', 'Frosted']]); opt('Shutters', 'win.shutters', SHUTTERS); col('Shutter colour', 'win.sc'); opt('Security bars', 'win.grille', [['none', 'None'], ['black', 'Black bars'], ['white', 'White bars']]);
  h('Fence'); opt('Style', 'fence.style', FENCES); col('Wall or timber', 'fence.c'); col('Posts and gate', 'fence.pc');
  h('Garden and ground'); opt('Garden', 'garden', [['none', 'None'], ['minimal', 'Minimal'], ['tropical', 'Tropical'], ['lush', 'Lush']]); opt('Lawn', 'lawn.k', matList(['grass', 'gravel', 'pavers', 'concrete'])); opt('Driveway', 'drive.k', matList(['pavers', 'asphalt', 'exconcrete', 'gravel'])); opt('Path', 'path.k', matList(['pavers', 'exconcrete', 'slatefloor', 'gravel']));
  h('Veranda'); E.veranda = veranda(E.veranda); tog('Veranda', 'veranda.on');
  if (E.veranda.on) {
    opt('Where', 'veranda.style', [['door', 'Over the front door'], ['full', 'Across the whole front'], ['wrap', 'Wrap around the sides']]);
    if (E.veranda.style === 'door') b.append(numRow('Width', E.veranda.w, 0.2, 2, 8, v => proSet('veranda.w', v), 'm'));
    b.append(numRow('Depth', E.veranda.d, 0.2, 1.2, 4, v => proSet('veranda.d', v), 'm'));
    opt('Railing', 'veranda.rail', [['balusters', 'Turned balusters'], ['iron', 'Iron bars'], ['timber', 'Timber slats'], ['none', 'None']]);
    opt('Columns', 'veranda.col', [['round', 'Round'], ['square', 'Square'], ['turned', 'Turned wood']]);
    tog('Gingerbread fretwork', 'veranda.fret'); tog('Ceiling fan', 'veranda.fan'); tog('Steps', 'veranda.steps'); tog('Back veranda too', 'veranda.back');
    opt('Floor', 'veranda.fk', matList(['tile', 'tilegrey', 'pavers', 'exconcrete', 'oak'])); col('Floor colour', 'veranda.fc'); col('Columns and ceiling', 'veranda.cc'); col('Railing colour', 'veranda.rc');
  }
  h('Extras'); tog('Garden lights', 'gardenLights'); tog('Mailbox', 'mailbox'); tog('Water tank', 'tank');
}
function lightBody(b) {
  const set = (k, v) => { LIGHT[k] = v; applyLight(); };
  b.append(el('h4', null, 'Ceiling'), togRow('Tray ceiling with glowing edge', S.cove, v => { S.cove = v; rebuild(); draw(); save(); }), el('p', { style: 'margin:0 0 6px;color:#666;font-size:12px' }, 'A recessed ceiling edge with warm hidden light, as in modern show homes. Shows in the walk-through.'));
  b.append(el('h4', null, 'Sun and sky'));
  b.append(rngRow('Time of day', Math.round(LIGHT.az), 90, 270, 1, v => set('az', v)), rngRow('Sun height', LIGHT.el, 5, 85, 1, v => set('el', v)), rngRow('Sun strength', LIGHT.sun, 0, 3, 0.05, v => set('sun', v)), rngRow('Ambient light', LIGHT.amb, 0, 3, 0.05, v => set('amb', v)));
  b.append(colRow('Background', hex2num(LIGHT.bg), c => set('bg', css2hex(c))));
  b.append(el('div', { class: 'btns' }, el('button', { class: 'btn', onclick: () => { Object.assign(LIGHT, LIGHT0); applyLight(); proQ(); } }, 'Reset lighting')));
}
function clientBody(b) {
  b.append(el('h4', null, 'Your details'), el('p', { style: 'color:#444;margin:0 0 6px' }, 'We send these with your design so your architect and your portal account connect to it.'));
  clientFields(b);
}
function clientFields(b) {
  const C = S.client, sv = () => { S.name = C.name; try { localStorage.setItem('crsclient', JSON.stringify(C)); } catch (e) { /* ignore */ } save(); };
  b.append(txtRow('Full name', C.name, v => { C.name = v.replace(/[^A-Za-zÀ-ɏ .'-]/g, '').slice(0, 40); sv(); }, 'text', 'Your name', 40));
  b.append(txtRow('Email', C.email, v => { C.email = v.trim().slice(0, 100); sv(); }, 'email', 'name@example.com', 100));
  b.append(txtRow('Phone', C.phone, v => { C.phone = v.replace(/[^0-9+() -]/g, '').slice(0, 30); sv(); }, 'tel', '+1 876 ...', 30));
  b.append(txtRow('Address', C.address, v => { C.address = v.slice(0, 120); sv(); }, 'text', 'Where the home will be built', 120));
  b.append(el('div', { class: 'row' }, el('label', null, 'Notes'), (() => { const t = el('textarea', { rows: 3, maxlength: 400, placeholder: 'Anything we should know' }); t.value = C.notes || ''; t.addEventListener('focus', () => { proState.typing = true; }); t.addEventListener('blur', () => { proState.typing = false; }); t.addEventListener('change', () => { C.notes = t.value.slice(0, 400); sv(); }); return t; })()));
}

/* ---------- drag and drop from the library into the 3D view ---------- */
const frames = (n) => new Promise(res => { const f = () => (--n <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
function dropAt(e, kind, type) {
  setRayMouse(e); const p = planePoint(); if (!p) return flash('Drop it on the plan.');
  const A = S.A;
  if (kind === 'room') {
    if (type === 'stairs') return addRoom(type);
    const t = TYPES[type], w = t.def[0], d = t.def[1], n = { x: Math.round((p.x - w / 2) * 2) / 2, z: Math.round((p.z - d / 2) * 2) / 2, w, d };
    const err = roomMoveError({ id: '_new', type }, n); if (err) return flash(err);
    push(); const id = nextRid(); S.rooms.push({ id, type, ...n }); S.sel = id; S.selItem = null; return refresh();
  }
  if (!A) return flash('Add some rooms first.');
  let it;
  if (isOutdoor(type)) { it = placeYard(type, S.items); if (!it) return flash('There is no space left in the garden.'); }
  else {
    const ri = A.design.rooms.findIndex(r => r.type !== 'stairs' && p.x > r.x && p.x < r.x + r.w && p.z > r.z && p.z < r.z + r.d);
    if (ri < 0) return flash('Drop it inside a room.');
    it = placeNew(A, S.lv, S.items.filter(i => i.level === S.lv), ri, type); if (!it) return flash(`There is no space for a ${ITEMS[type].n.toLowerCase()} in this room.`);
  }
  it.id = 'I' + (++S.nid); const t = itemTarget(it, p.x, p.z);
  if (typeof t === 'string') { S.nid--; return flash(t); }
  Object.assign(it, { x: t.x, z: t.z, rot: t.rot, roomId: t.roomId, auto: false }); S.items.push(it); S.selItem = it.id; S.sel = null; S.fRoom = t.roomId; rebuild(); draw(); save();
}
function dragCard(kind, type, node) {
  node.setAttribute('draggable', 'true'); node.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', kind + ':' + type); e.dataTransfer.effectAllowed = 'copy'; });
  return node;
}
canvas.addEventListener('dragover', (e) => { if (PRO) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
canvas.addEventListener('drop', (e) => { if (!PRO) return; e.preventDefault(); const d = (e.dataTransfer.getData('text/plain') || '').split(':'); if ((d[0] === 'room' && TYPES[d[1]]) || (d[0] === 'item' && ITEMS[d[1]])) dropAt(e, d[0], d[1]); });

/* ---------- render the home before the client walks through it ---------- */
const sigNow = () => JSON.stringify([S.plot, S.levels.map(l => l.rooms), S.items.map(i => [i.type, i.x, i.z, i.rot, i.fin]), S.ext, S.fin, S.typeFin]);
S.renders = []; S.renderSig = '';
function pickGlow() {
  if (inXR || !glowLights.length) return; camera.updateMatrixWorld(); const cp = new THREE.Vector3(); camera.getWorldPosition(cp); const wp = new THREE.Vector3();
  glowLights.map(L => { L.getWorldPosition(wp); return [L, wp.distanceTo(cp)]; }).sort((a, b) => a[1] - b[1]).forEach(([L], i) => { L.visible = i < 12; });
}
setInterval(() => { if (S.mode === 'walk') pickGlow(); }, 500);
async function renderHome() {
  const A0 = S.levels[0].A; if (!A0) { proState.renderMsg = 'Add some rooms first.'; return proQ(); }
  const prev = { mode: S.mode, step: S.step, fov: camera.fov, pr: renderer.getPixelRatio(), size: renderer.getSize(new THREE.Vector2()), lv: S.walkLv };
  proState.rendering = true; proState.renderMsg = 'Preparing the scene...'; S.renders = []; proQ();
  const pl = A0.design.plot, rs = A0.design.rooms, hx0 = Math.min(...rs.map(r => r.x)), hx1 = Math.max(...rs.map(r => r.x + r.w)), hz0 = Math.min(...rs.map(r => r.z)), hz1 = Math.max(...rs.map(r => r.z + r.d)), hcx = (hx0 + hx1) / 2, hcz = (hz0 + hz1) / 2;
  const list = [
    { name: 'Front of the house', lv: 0, p: [hcx, pl.d + 10], look: [hcx, hcz], h: 2.2, fov: 62 },
    { name: 'Front left corner', lv: 0, p: [hcx - 10, pl.d + 7], look: [hcx, hcz], h: 2.2, fov: 62 },
    { name: 'Front right corner', lv: 0, p: [hcx + 10, pl.d + 7], look: [hcx, hcz], h: 2.2, fov: 62 },
    { name: 'Back garden', lv: 0, p: [hcx, hz0 - 9], look: [hcx, hcz], h: 2.2, fov: 62 }
  ];
  S.levels.forEach((l, li) => { if (!l.A) return; l.A.design.rooms.filter(r => r.type !== 'stairs').forEach(r => {
    const cx = r.x + r.w / 2, cz = r.z + r.d / 2, ix = 0.45, sx = cx < pl.w / 2 ? r.x + r.w - ix : r.x + ix, sz = cz < pl.d / 2 ? r.z + r.d - ix : r.z + ix;   // stand in the corner nearest the middle of the house
    list.push({ name: (S.levels.length > 1 ? LEVEL_NAMES[li] + ' ' : '') + r.label, lv: li, p: [sx, sz], look: [r.x + r.w - (sx - r.x), r.z + r.d - (sz - r.z)], h: 1.5, fov: 78 });
  }); });
  try {
    S.mode = 'walk'; S.step = 'walk'; rebuild(); applyMode(); await frames(4);
    renderer.setPixelRatio(1); renderer.setSize(1600, 900, false); camera.aspect = 16 / 9;
    for (let i = 0; i < list.length; i++) {
      const sh = list[i]; proState.renderMsg = `Rendering ${i + 1} of ${list.length}: ${sh.name}`; proQ(); await frames(2);
      camera.fov = sh.fov; camera.updateProjectionMatrix(); walkToXZ(sh.lv, sh.p[0], sh.p[1]); camera.position.set(0, sh.h, 0); controls.target.set(sh.look[0] - sh.p[0], sh.h * 0.8, sh.look[1] - sh.p[1]); controls.update();
      world.updateMatrixWorld(true); pickGlow(); await frames(3); renderer.render(scene, camera);
      S.renders.push({ name: sh.name, n: i + 1, data: canvas.toDataURL('image/jpeg', 0.86) });
    }
    S.renderSig = sigNow(); proState.renderMsg = '';
  } catch (e) { console.error(e); proState.renderMsg = 'The render stopped: ' + (e && e.message ? e.message : 'unknown error'); }
  renderer.setPixelRatio(prev.pr); renderer.setSize(prev.size.x, prev.size.y, false); camera.fov = prev.fov; camera.aspect = prev.size.x / prev.size.y; camera.updateProjectionMatrix();
  S.mode = prev.mode; S.step = prev.step; lastMode = null; rebuild(); applyMode(); resize(); proState.rendering = false; draw(); proQ();
}
async function uploadRenders(ref) {
  const imgs = S.renders.slice(); let saved = 0;
  for (let i = 0; i < imgs.length; i += 3) { const r = await api('/api/projects/' + ref + '/renders', { sessionId: S.session, images: imgs.slice(i, i + 3).map(x => ({ name: x.name, n: x.n, data: x.data })) }); saved += r.saved || 0; }
  return saved;
}

/* ---------- top bar, status, modals ---------- */
function proWalk() { proState.walkPanels = false; if (S.step === 'build' || S.step === 'utilities') go('furnish'); act('mode'); }

function walkChips() {
  const chips = [];
  S.levels.forEach((l, li) => { if (l.A) l.A.design.rooms.filter(r => r.type !== 'stairs').forEach(r => chips.push(el('button', { class: 'chip', onclick: () => act('walkroom:' + li + ':' + r.id) }, (S.levels.length > 1 ? (li ? 'Up: ' : 'Down: ') : '') + r.label))); });
  const ex = [['street', 'Street'], ['garden', 'Garden']].map(([k, l]) => el('button', { class: 'chip', onclick: () => act('walkto:' + k) }, l));
  return el('div', { class: 'walkbar' }, el('div', { class: 'chips' }, ex, chips), el('div', { class: 'chips' }, el('button', { class: 'chip', onclick: () => { proState.walkPanels = true; proQ(); } }, 'Show panels'), el('span', { style: 'color:#fff;font-size:12px;align-self:center' }, 'Drag to look around. W A S D to walk.')));
}
function topBar() {
  const bar = el('div', { class: 'bar' }, el('img', { src: '/logo_white.png', alt: 'ConstructReality' }));
  STEP_TABS.forEach(([k, l]) => bar.append(el('button', { class: 'tab' + (S.step === k && S.mode !== 'walk' ? ' on' : ''), onclick: () => { if (S.mode === 'walk') act('mode'); go(k); if (!S.levels[0].A) refresh(); if (k === 'exterior') proState.insTab = 'ext'; if (k === 'finishes') proState.libTab = 'mats'; if (k === 'furnish') proState.libTab = 'furn'; if (k === 'build') proState.libTab = 'rooms'; proQ(); } }, l)));
  bar.append(el('button', { class: 'tab', onclick: () => { proState.modal = 'render'; proQ(); } }, 'Render'));
  bar.append(el('button', { class: 'tab' + (S.mode === 'walk' ? ' on' : ''), onclick: () => { if (S.mode !== 'walk' && (!S.renders.length || S.renderSig !== sigNow())) { proState.modal = 'renderfirst'; return proQ(); } proWalk(); } }, 'Walk through'));
  bar.append(el('span', { class: 'sp' }));
  S.levels.forEach((_, i) => bar.append(el('button', { class: 'tab' + (S.lv === i ? ' on' : ''), onclick: () => act('lvl:' + i) }, i === 0 ? 'Ground' : i === 1 ? 'First' : 'Second')));
  bar.append(el('button', { class: 'tab', onclick: () => act('undo') }, 'Undo'));
  bar.append(el('button', { class: 'go', onclick: () => { proState.modal = S.ref && S.step === 'done' ? 'sent' : 'send'; proQ(); } }, 'Send to architect'));
  return bar;
}
function modalBox() {
  const m = proState.modal; if (!m) return null;
  const close = () => { proState.modal = null; proQ(); };
  const box = el('div', { class: 'box' });
  if (m === 'welcome') {
    box.append(el('h2', null, 'Welcome to ConstructReality'), el('p', null, 'Tell us who you are first. Your name and details travel with your design, so your architect and your client portal account connect to it.'));
    clientFields(box);
    box.append(el('div', { class: 'btns' }, el('button', { class: 'btn dark', onclick: () => { if (!S.client.name.trim()) S.client.name = ''; go('build'); if (!S.levels[0].rooms.length) { proState.modal = 'brief'; } else close(); proQ(); } }, 'Start designing'), el('button', { class: 'btn', onclick: () => { go('build'); close(); } }, 'Skip for now')));
  } else if (m === 'brief') {
    box.append(el('h2', null, 'Draft from a brief'), el('p', null, 'Set the basics. You can change every room afterwards.'));
    box.append(numRow('Bedrooms', S.beds, 1, 1, 6, v => { S.beds = Math.round(v); }), numRow('Bathrooms', S.baths, 1, 1, 5, v => { S.baths = Math.round(v); }), numRow('Floors', S.storeys, 1, 1, 3, v => { S.storeys = Math.round(v); }), numRow('Plot width', S.plot.w, 0.5, 6, 60, v => { S.plot = { w: v, d: S.plot.d }; }, 'm'), numRow('Plot depth', S.plot.d, 0.5, 6, 60, v => { S.plot = { w: S.plot.w, d: v }; }, 'm'));
    [['dining', 'Dining room'], ['laundry', 'Laundry'], ['office', 'Office'], ['garage', 'Garage']].forEach(([k, l]) => box.append(togRow(l, S[k], v => { S[k] = v; })));
    box.append(optRow_('Budget', S.budget, [['economy', 'Economy'], ['standard', 'Standard'], ['premium', 'Premium']], v => { S.budget = v; }));
    box.append(el('div', { class: 'btns' }, el('button', { class: 'btn dark', onclick: async () => { close(); go('build'); await act('ai:draft'); proQ(); } }, 'Make my draft'), el('button', { class: 'btn', onclick: () => { close(); act('blank'); } }, 'Start blank'), el('button', { class: 'btn', onclick: close }, 'Cancel')));
  } else if (m === 'send') {
    box.append(el('h2', null, 'Send to your architect'), el('p', null, 'Check your details. Your design and these details are sent together' + (S.renders.length ? ', with your ' + S.renders.length + ' rendered pictures.' : '. Tip: use Render first so your architect also gets pictures.')));
    clientFields(box);
    box.append(el('p', { class: proState.sendMsg.startsWith('Sent') ? 'ok' : 'bad' }, proState.sendMsg));
    box.append(el('div', { class: 'btns' }, el('button', { class: 'btn dark', onclick: proSend }, S.busy ? 'Sending...' : 'Send now'), el('button', { class: 'btn', onclick: close }, 'Back to my design')));
  } else if (m === 'renderfirst') {
    const stale = S.renders.length > 0;
    box.append(el('h2', null, stale ? 'Your design changed' : 'Render your home first'), el('p', null, (stale ? 'You changed the design since the last render. ' : '') + 'A render adds real lighting, shadows and glowing lamps, so what you see is as close as possible to the finished home. It takes about a minute and the pictures go to your architect with your design.'));
    box.append(el('div', { class: 'btns' }, el('button', { class: 'btn dark', onclick: () => { proState.modal = 'render'; renderHome(); proQ(); } }, 'Render now'), el('button', { class: 'btn', onclick: () => { close(); proWalk(); } }, 'Walk through without rendering'), el('button', { class: 'btn', onclick: close }, 'Cancel')));
  } else if (m === 'render') {
    box.style.width = 'min(900px,96vw)';
    box.append(el('h2', null, 'Render your home'), el('p', null, 'Four outside views and one view of every room, with lighting, shadows and lamps switched on. Run it after you finish designing.'));
    if (proState.rendering) box.append(el('p', { style: 'font-weight:700' }, proState.renderMsg || 'Working...'));
    else {
      if (proState.renderMsg) box.append(el('p', { class: 'bad' }, proState.renderMsg));
      if (S.renders.length) {
        if (S.renderSig !== sigNow()) box.append(el('p', { class: 'bad' }, 'The design has changed since this render. Render again to update it.'));
        box.append(el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin:8px 0' }, S.renders.map(r => el('a', { href: r.data, download: 'ConstructReality-' + r.name.replace(/[^A-Za-z0-9]+/g, '-') + '.jpg', title: 'Download', style: 'text-decoration:none;color:#000' }, el('img', { src: r.data, style: 'width:100%;border:1px solid #000;border-radius:6px;display:block' }), el('small', null, r.name)))));
      }
      box.append(el('div', { class: 'btns' }, el('button', { class: 'btn dark', onclick: renderHome }, S.renders.length ? 'Render again' : 'Render now'), S.renders.length ? el('button', { class: 'btn', onclick: () => { close(); proWalk(); } }, 'Walk through my home') : null, el('button', { class: 'btn', onclick: close }, 'Close')));
    }
  } else if (m === 'sent') {
    box.append(el('h2', null, 'Sent to your architect'), el('p', null, S.client.name ? 'Thank you, ' + S.client.name.split(' ')[0] + '.' : 'Thank you.'));
    box.append(el('h4', null, 'Project reference'), el('div', { style: 'font:700 28px Helvetica,Arial' }, S.ref), el('h4', null, 'Access code'), el('div', { style: 'font:700 28px Helvetica,Arial' }, S.claim || '-'));
    box.append(el('p', { class: 'ok' }, (S.fileCount || 0) + ' files saved on the server'));
    const q = '?ref=' + encodeURIComponent(S.ref) + '&code=' + encodeURIComponent(S.claim || '') + (S.client.name ? '&name=' + encodeURIComponent(S.client.name) : '') + (S.client.email ? '&email=' + encodeURIComponent(S.client.email) : '') + (S.client.phone ? '&phone=' + encodeURIComponent(S.client.phone) : '');
    box.append(el('p', null, 'Open your client portal to follow progress and download drawings. Your details are filled in for you.'));
    box.append(el('div', { class: 'btns' }, el('a', { class: 'btn dark', href: '/portal.html' + q + '#register', target: '_blank', style: 'text-decoration:none' }, 'Open my client portal'), el('button', { class: 'btn', onclick: close }, 'Keep designing')));
  }
  return el('div', { class: 'modal' }, box);
}
async function proSend() {
  if (S.busy) return; proState.sendMsg = '';
  if (!S.A) { proState.sendMsg = 'Add some rooms first.'; return proQ(); }
  S.busy = true; proQ();
  try {
    const C = S.client, r = await api('/api/projects', { sessionId: S.session, clientName: C.name, contact: { email: C.email, phone: C.phone, address: C.address, notes: C.notes }, design: { plot: S.plot, levels: S.levels.map(l => ({ rooms: l.rooms })) }, finishes: finishList(), furniture: furnitureList(), exterior: exteriorList() });
    if (!r.ref) throw new Error('no reference came back');
    S.ref = r.ref; S.claim = r.claim || ''; S.fileCount = r.fileCount || 0; proState.sendMsg = 'Design sent. Sending renders...'; proQ();
    if (S.renders.length) { try { S.fileCount += await uploadRenders(r.ref); } catch (e) { proState.sendMsg = 'Design sent, but the renders did not upload: ' + (e && e.message); } }
    S.busy = false; S.step = 'done'; save(); proState.modal = 'sent'; proState.sendMsg = 'Sent';
  } catch (e) { S.busy = false; proState.sendMsg = 'Could not send: ' + (e && e.message ? e.message : 'unknown error'); }
  proQ();
}

function proRender() {
  if (!PRO || GATE || inXR || !proRoot) return;
  if (proState.typing && !proState.modal) return;                                   // do not rebuild a pane under someone's cursor
  if (proState.typing && document.activeElement && proRoot.contains(document.activeElement)) return;
  const keepScroll = [...proRoot.querySelectorAll('.scroll')].map(s => s.scrollTop);
  const walking = S.mode === 'walk' && !proState.walkPanels;
  const kids = walking ? [topBar(), walkChips()] : [topBar(), libPane(), insPane()];
  const r = S.rooms.find(x => x.id === S.sel), it = selItemObj();
  if (!walking) kids.push(el('div', { class: 'st' }, el('span', null, S.A ? `${S.levels.length} floor${S.levels.length > 1 ? 's' : ''}, ${S.A.design.rooms.length} rooms here` : 'No rooms yet'), el('span', null, `Plot ${S.plot.w} x ${S.plot.d} m`), el('span', null, it ? 'Selected: ' + ITEMS[it.type].n : r ? 'Selected: ' + r.label : ''), el('span', null, 'App ' + BUILD)));
  if (S.flash) kids.push(el('div', { class: 'msg' }, S.flash));
  const md = modalBox(); if (md) kids.push(md);
  proRoot.replaceChildren(...kids);
  [...proRoot.querySelectorAll('.scroll')].forEach((s, i) => { if (keepScroll[i]) s.scrollTop = keepScroll[i]; });
}
function proQ() { if (proQueued) return; proQueued = true; requestAnimationFrame(() => { proQueued = false; proRender(); }); }

if (PRO) {
  document.head.append(el('style', null, PRO_CSS));
  proRoot = el('div', { id: 'pro' }); document.body.append(proRoot);
  const _draw = draw; draw = function () { _draw(); proQ(); };
  const _place = placePanel; placePanel = function () { _place(); if (!inXR) { panel.visible = false; panel.scale.setScalar(1e-4); } };
  renderer.xr.addEventListener('sessionstart', () => { proRoot.style.display = 'none'; });
  renderer.xr.addEventListener('sessionend', () => { proRoot.style.display = GATE ? 'none' : ''; placePanel(); proQ(); });
  /* first screen: ask for the client's details, then start */
  if (GATE) {
    const hint = document.getElementById('hint'); if (hint) hint.style.display = 'none';
    const gate = el('div', { id: 'gate' });
    gate.style.cssText = 'position:fixed;inset:0;z-index:2;background:#fff;color:#000;font-family:Helvetica,Arial,sans-serif;overflow:auto;padding:28px 20px 110px;box-sizing:border-box';
    gate.innerHTML = '<div style="max-width:640px;margin:0 auto"><img src="/logo_black.png" alt="ConstructReality" style="width:min(300px,70vw)"><h1 style="font-size:30px;margin:26px 0 10px">Come and walk through your future home.</h1>'
      + '<p style="font-size:18px;line-height:1.5;margin:0 0 16px">Designing happens in our VR studio, with a team member beside you. You put on the headset, place your rooms, choose your finishes and furniture, and walk through your home at full size before anything is built.</p>'
      + '<div style="border:2px solid #000;padding:14px 16px;margin:0 0 16px"><b>What you get at the studio</b><br>Self-service design stations, a team member to help when you want it, your drawings and a client portal sign-in at the end.</div>'
      + '<div style="background:#000;color:#fff;padding:14px 16px;margin:0 0 16px"><b>Our purpose: know your home is ready for a hurricane before you build it.</b><br>ConstructReality is built to let you see your structure under loads such as hurricane winds before construction, so you know what your house can take. That load testing is in development with licensed engineers and is not yet part of the studio. Today we design your home with you from first idea to checked drawings, and you walk through it at full size. It never replaces a licensed engineer.</div>'
      + '<p style="margin:0 0 16px">Already have a design? We can also present your own model to you in VR. Ask us when you book.</p>'
      + '<p style="margin:0 0 20px"><a href="/contact.html" style="background:#000;color:#fff;padding:14px 22px;text-decoration:none;font-weight:700;display:inline-block">Book a studio visit</a> &nbsp; <a href="/portal.html" style="color:#000;font-weight:700">Client portal</a></p>'
      + '<p style="font-size:14px;color:#555">Already in a Meta Quest headset at our studio? Use the button below to enter VR.</p></div>';
    document.body.append(gate);
    if (proRoot) proRoot.style.display = 'none';
  }
  const _boot = () => { if (S.step === 'welcome' || S.step === 'name' || S.step === 'plot') { go('build'); proState.modal = 'welcome'; } else if (S.step === 'done') { S.step = 'build'; } placePanel(); proQ(); };
  if (!GATE) (function wait(n) { if ((document.getElementById('boot') && n < 40)) return setTimeout(() => wait(n + 1), 150); _boot(); })(0);
}
