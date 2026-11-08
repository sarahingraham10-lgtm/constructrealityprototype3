'use strict';
/*
 * AI design helper. The AI only ever proposes room lists and plain-language advice.
 * Placement, walls, doors and services are always produced by our own rules (model.js, mep.js),
 * so the plans stay consistent even when the AI is wrong. The API key stays on the server.
 */
const { TYPES, clamp, pack, templateSpec, analyzeGeometry } = require('./model');

const KEY = () => process.env.ANTHROPIC_API_KEY || '';
const MODEL = () => process.env.AI_MODEL || 'claude-sonnet-5-5';

async function claude(system, user, maxTokens) {
  if (!KEY()) return null;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': KEY(), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens || 600, system, messages: [{ role: 'user', content: user }] })
    });
    clearTimeout(t);
    if (!res.ok) { console.error('AI error', res.status, (await res.text()).slice(0, 200)); return null; }
    const j = await res.json();
    return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  } catch (e) { console.error('AI request failed:', e.message); return null; }
}

const SYSTEM = `You help first-time home builders in Jamaica and the wider Caribbean design a single-storey house in a VR app.
Speak plainly, no jargon, friendly and brief. Never promise a building will survive a hurricane or meet building code. You may mention common Caribbean considerations (hurricane straps and hip roofs, shutters, cross-ventilation, roof overhangs, drainage away from the house, water tanks) as things to discuss with the architect and engineer.
The app places walls, doors, windows, plumbing, electrical and lighting automatically. Do not describe those as finished engineering.`;

function describe(design, issues) {
  const g = analyzeGeometry(design);
  return g.design.rooms.map(r => `${r.label} ${r.w} x ${r.d} m`).join('; ') + (issues && issues.length ? '. Problems: ' + issues.map(i => i.text).join(' ') : '') + `. Plot ${g.design.plot.w} x ${g.design.plot.d} m.`;
}

/* ---------- first draft ---------- */
async function suggest(brief) {
  const plot = brief.plot || { w: 16, d: 12 };
  const fallback = () => ({ ...pack(templateSpec(brief), plot), source: 'template', explanation: 'Here is a starting layout built from your answers. Move or resize any room to make it yours.' });
  if (!KEY()) return fallback();
  const user = `Plot ${plot.w} m wide x ${plot.d} m deep. Family wants ${brief.bedrooms} bedroom(s), ${brief.bathrooms} bathroom(s)${brief.dining ? ', a dining room' : ''}${brief.laundry ? ', a laundry' : ''}${brief.office ? ', an office' : ''}. Budget style: ${brief.budget || 'standard'}. Notes: ${String(brief.notes || 'none').slice(0, 300)}.
Return ONLY JSON: {"rooms":[{"type":"living|dining|kitchen|bedroom|bathroom|laundry|office|hall","w":number,"d":number}],"explanation":"two or three plain sentences"}.
Use sizes in metres in steps of 0.5. Include exactly the requested bedrooms and bathrooms, one living room and one kitchen. Total floor area must fit comfortably inside ${(plot.w - 2) * (plot.d - 2)} square metres, ideally 55 to 75 percent of it. Make the main bedroom a little larger.`;
  const text = await claude(SYSTEM, user, 700);
  if (!text) return fallback();
  try {
    const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const rooms = (j.rooms || []).filter(r => TYPES[r.type]).slice(0, 14);
    if (!rooms.length) return fallback();
    const out = pack({ rooms }, plot);
    return { ...out, source: 'ai', explanation: String(j.explanation || '').slice(0, 400) || 'Here is a draft from the AI. Change anything you like.' };
  } catch (e) { return fallback(); }
}

/* ---------- questions ---------- */
const CANNED = {
  light: 'Put living areas and bedrooms along outside walls so each gets a window. Ask your architect about window sizes and shading, so you get daylight without heat.',
  money: 'Simple shapes cost less than many corners. Keep bathrooms and the kitchen close together so pipes stay short. Cut room sizes before you cut quality.',
  hurricane: 'Ask your architect and engineer about a hip roof, roof straps, shutters or impact windows, and drainage away from the house. We can later show you how your design behaves in a storm simulation.',
  family: 'Think about who lives here in ten years. A spare room or office can become a bedroom later. Place bedrooms away from the noisy kitchen and living room.',
  privacy: 'Keep the front door opening into the living room, not into a bedroom. Place bathrooms so you do not need to cross the living room to reach them.',
  size: 'Many families are comfortable with about 3.5 m by 3.5 m for bedrooms and 5 m by 4.5 m for the living room. Use the size buttons to see how each room feels.'
};
async function ask(question, design, issues, chip) {
  const q = String(question || '').slice(0, 400);
  const canned = CANNED[chip];
  if (!KEY()) return { source: 'tips', answer: canned || 'Good question. Write it down and your designer will answer it with you. Meanwhile, check the tips on each step.' };
  const text = await claude(SYSTEM, `Current design: ${describe(design, issues)}\nThe client asks: ${q}\nAnswer in under 90 words, plain language, one practical suggestion they can try right now in the app.`, 300);
  return { source: text ? 'ai' : 'tips', answer: text || canned || 'Write that down and your designer will answer it with you.' };
}


/* ---------- make a furniture or decor item from a sentence ---------- */
const UNITS = { m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, feet: 0.3048, foot: 0.3048, in: 0.0254, inch: 0.0254, inches: 0.0254 };
const COLOUR_WORDS = [['charcoal', '#4a4a4c'], ['dark grey', '#4a4a4c'], ['dark gray', '#4a4a4c'], ['light grey', '#c9c9c7'], ['light gray', '#c9c9c7'], ['grey', '#8d8d8d'], ['gray', '#8d8d8d'], ['black', '#161616'], ['white', '#f4f4f2'], ['cream', '#ecd9a8'], ['beige', '#d8c7a8'], ['sand', '#d8b98a'], ['navy', '#25405e'], ['sky blue', '#8cc3e6'], ['blue', '#3f6fa8'], ['teal', '#2f8f8a'], ['sage', '#9fb59a'], ['green', '#3f8a45'], ['yellow', '#f2c230'], ['orange', '#e8873a'], ['terracotta', '#c2603c'], ['coral', '#ee6f57'], ['red', '#b23a3a'], ['pink', '#e8a6b4'], ['purple', '#6b4fa0'], ['brown', '#6b4b2c'], ['walnut', '#5a3a24'], ['oak', '#c9a26b'], ['gold', '#b08d45'], ['brass', '#b08d45'], ['silver', '#cfd2d6']];
const SYN = { couch: 'sofa', settee: 'sofa', loveseat: 'sofa', wardrobe: 'wardrobe', closet: 'wardrobe', cupboard: 'wardrobe', tv: 'tv', television: 'tv', bookshelf: 'bookcase', shelves: 'shelf', nightstand: 'bedside', desk: 'desk', stool: 'stool', carpet: 'rug', lamp: 'lamp', cot: 'cot', crib: 'cot', bunk: 'bunk' };
function parseDims(t) {
  const U = '(m|cm|mm|ft|feet|foot|in|inches|inch)?';
  let m = t.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + U + '\\s*(?:x|by|\\*)\\s*(\\d+(?:\\.\\d+)?)\\s*' + U + '(?:\\s*(?:x|by|\\*)\\s*(\\d+(?:\\.\\d+)?)\\s*' + U + ')?'));
  if (m) {
    const unit = m[6] || m[4] || m[2] || null, k = (v) => { const n = +v; return unit ? n * UNITS[unit] : (n > 12 ? n / 100 : n); };
    return [k(m[1]), k(m[3]), m[5] ? k(m[5]) : null];
  }
  const out = {}; const re = /(\d+(?:\.\d+)?)\s*(m|cm|ft|feet|foot|in|inches|inch)\s*(wide|long|tall|high|deep)?/g; let x;
  while ((x = re.exec(t))) { const v = +x[1] * UNITS[x[2]], w = x[3] || ''; if (/tall|high/.test(w)) out.h = v; else if (/deep/.test(w)) out.d = v; else if (out.w === undefined) out.w = v; }
  return out.w || out.d || out.h ? [out.w || null, out.d || null, out.h || null] : null;
}
function ruleItem(text, T) {
  const t = String(text || '').toLowerCase(), words = t.replace(/[^a-z0-9. ]/g, ' ').split(/\s+/).filter(Boolean).map(w => SYN[w] || w);
  let best = null, bs = 0;
  T.forEach(([key, name]) => { const nw = name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/); const s = nw.reduce((a, w) => a + (words.includes(w) || words.includes(w.replace(/s$/, '')) ? (w.length > 3 ? 2 : 1) : 0), 0) + (words.includes(key.replace(/\d|_.*/g, '')) ? 2 : 0); if (s > bs) { bs = s; best = [key, name]; } });
  return best;
}
const LOOKS = { modern: /modern|minimal|clean|contemporary|sleek|simple/, tropical: /tropical|island|caribbean|breezy|bright/, classic: /classic|traditional|elegant|formal/ };
async function designItem(prompt, templates) {
  const p = String(prompt || '').replace(/[<>]/g, '').slice(0, 240).trim(); if (!p) return { source: 'rules', answer: 'Tell me what you would like, for example: a dark grey L-shaped sofa, 2.6 m wide.' };
  const T = (Array.isArray(templates) ? templates : []).slice(0, 400).filter(r => Array.isArray(r) && typeof r[0] === 'string').map(r => [String(r[0]).slice(0, 30), String(r[1] || '').slice(0, 40), +r[2] || 1, +r[3] || 1, +r[4] || 1]);
  const keys = new Set(T.map(r => r[0]));
  const clampDim = (v, d) => { v = +v; return isFinite(v) && v > 0 ? Math.max(0.05, Math.min(6, Math.round(v * 100) / 100)) : d; };
  const hexOk = (h) => /^#[0-9a-fA-F]{6}$/.test(String(h || '')) ? String(h).toLowerCase() : null;
  if (KEY() && T.length) {
    const list = T.map(r => `${r[0]}=${r[1]} (${r[2]}x${r[3]}x${r[4]} m)`).join('; ');
    const txt = await claude('You turn a home-owner request into a furniture or decor item for a Caribbean home design app. Reply with ONE JSON object only, no prose. Either {"look":"modern"|"tropical"|"classic"} when they ask for a whole style, or {"name":"short name","tpl":"<key from the list>","w":metres,"d":metres,"h":metres,"colour":"#rrggbb","colour2":"#rrggbb or null","note":"one friendly sentence"} choosing the closest key in the list; sizes in metres (width, depth, height), realistic unless the user gives sizes. If the request is not about furniture, decor or style, reply {"answer":"a short friendly reply"}. Available keys: ' + list, p, 400);
    try { const j = JSON.parse((txt || '').replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
      if (j.look && LOOKS[j.look]) return { source: 'ai', look: j.look };
      if (j.tpl && keys.has(j.tpl)) { const b = T.find(r => r[0] === j.tpl); return { source: 'ai', item: { name: String(j.name || b[1]).replace(/[^\w #&()+,.'/-]/g, '').slice(0, 40) || b[1], tpl: j.tpl, w: clampDim(j.w, b[2]), d: clampDim(j.d, b[3]), h: clampDim(j.h, b[4]), colour: hexOk(j.colour), colour2: hexOk(j.colour2) }, note: String(j.note || '').slice(0, 200) }; }
      if (j.answer) return { source: 'ai', answer: String(j.answer).slice(0, 300) };
    } catch (e) { /* fall through to the rules below */ }
  }
  for (const k of Object.keys(LOOKS)) if (LOOKS[k].test(p) && /(style|look|feel|home|house|room|whole|everything)/.test(p)) return { source: 'rules', look: k };
  const hit = ruleItem(p, T); if (!hit) return { source: 'rules', answer: 'I could not match that to a piece I can build. Try a plain word like sofa, bed, table, wardrobe, lamp or rug, with a size if you know it.' };
  const b = T.find(r => r[0] === hit[0]), dm = parseDims(p.toLowerCase()) || [], low = p.toLowerCase();
  const hits = COLOUR_WORDS.filter(([w]) => low.includes(w)), cols = hits.filter(([w]) => !hits.some(([o]) => o !== w && o.includes(w))).map(c => c[1]);
  return { source: 'rules', item: { name: p.length <= 32 ? p.charAt(0).toUpperCase() + p.slice(1) : hit[1], tpl: hit[0], w: clampDim(dm[0], b[2]), d: clampDim(dm[1], b[3]), h: clampDim(dm[2], b[4]), colour: cols[0] || null, colour2: cols[1] || null }, note: 'Built from your words. Change anything in the panel on the right.' };
}

module.exports = { suggest, ask, designItem };
