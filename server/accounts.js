'use strict';
/* User accounts for the team workspace and the client portal.
   Passwords are stored only as scrypt hashes (never in plain text). Accounts live in data/users.json.
   The owner signs in with ADMIN_KEY and creates staff accounts; clients make their own. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function accounts(DATA, SECRET) {
  const file = path.join(DATA, 'users.json');
  let users = [];
  try { users = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { users = []; }
  const persist = () => { fs.mkdirSync(DATA, { recursive: true }); const t = file + '.tmp'; fs.writeFileSync(t, JSON.stringify(users, null, 1)); fs.renameSync(t, file); };
  const hash = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
  const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const clean = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n || 80);
  const norm = (u) => String(u || '').toLowerCase().trim();
  const pub = (u) => u && ({ id: u.id, role: u.role, name: u.name, username: u.username, email: u.email, phone: u.phone, company: u.company, disabled: !!u.disabled, created: u.created, lastLogin: u.lastLogin, mustChange: !!u.mustChange, address: u.address || '', parish: u.parish || '' });
  const ROLE_OK = ['pm', 'architect', 'surveyor', 'engineer', 'contractor', 'supplier', 'client'];

  function validUsername(u) { return /^[a-z0-9][a-z0-9_.-]{2,29}$/.test(u); }
  function validPassword(p) { return typeof p === 'string' && p.length >= 8 && p.length <= 100; }
  const tempPassword = () => { const A = 'abcdefghjkmnpqrstuvwxyz23456789'; return Array.from(crypto.randomBytes(10), b => A[b % A.length]).join(''); };

  function create(role, f, opts) {
    opts = opts || {};
    if (!ROLE_OK.includes(role)) throw new Error('Unknown role.');
    const username = norm(f.username); if (!validUsername(username)) throw new Error('Username: 3 to 30 letters, numbers, dots, dashes or underscores.');
    if (users.some(u => u.username === username)) throw new Error('That username is taken. Try another.');
    const name = clean(f.name, 60); if (!name) throw new Error('Please enter a name.');
    const email = clean(f.email, 100); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('That email address does not look right.');
    const pw = opts.temp ? tempPassword() : f.password; if (!validPassword(pw)) throw new Error('Password must be at least 8 characters.');
    const salt = crypto.randomBytes(16).toString('hex');
    const u = { id: 'u' + crypto.randomBytes(5).toString('hex'), role, name, username, email, phone: clean(f.phone, 30), company: clean(f.company, 80), address: clean(f.address, 160), parish: clean(f.parish, 40), salt, hash: hash(pw, salt), created: new Date().toISOString(), mustChange: !!opts.temp, tv: 1, disabled: false };
    users.push(u); persist(); return { user: u, password: opts.temp ? pw : undefined };
  }
  function check(username, password) {
    const u = users.find(x => x.username === norm(username));
    const salt = u ? u.salt : 'x'.repeat(32), h = hash(password, salt);          // always hash, so timing does not reveal valid usernames
    if (!u || u.disabled || !same(h, u.hash)) return null;
    u.lastLogin = new Date().toISOString(); persist(); return u;
  }
  function setPassword(id, pw, mustChange) { const u = users.find(x => x.id === id); if (!u) throw new Error('No such user.'); if (!validPassword(pw)) throw new Error('Password must be at least 8 characters.'); u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hash(pw, u.salt); u.mustChange = !!mustChange; u.tv = (u.tv || 1) + 1; persist(); }
  function resetTemp(id) { const pw = tempPassword(); setPassword(id, pw, true); return pw; }
  function update(id, f) {
    const u = users.find(x => x.id === id); if (!u) throw new Error('No such user.');
    ['name', 'phone', 'company', 'address', 'parish'].forEach(k => { if (typeof f[k] === 'string') u[k] = clean(f[k], k === 'address' ? 160 : 80); });
    if (typeof f.email === 'string') { const e = clean(f.email, 100); if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('That email address does not look right.'); u.email = e; }
    if (typeof f.disabled === 'boolean') { u.disabled = f.disabled; u.tv = (u.tv || 1) + 1; }
    persist(); return u;
  }
  const byId = (id) => users.find(x => x.id === id);
  const list = (role) => users.filter(u => !role || u.role === role);

  /* signed tokens: carry the user id and a version, so a password change signs the person out everywhere */
  const sign = (o) => { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', SECRET).update(b).digest('base64url'); };
  const verify = (t) => { try { const [b, s] = String(t).split('.'); const e = crypto.createHmac('sha256', SECRET).update(b).digest('base64url'); if (!same(s || '', e)) return null; const o = JSON.parse(Buffer.from(b, 'base64url').toString()); if (!(o.exp > Date.now())) return null; if (o.id && o.id[0] === 'u') { const u = byId(o.id); if (!u || u.disabled || (u.tv || 1) !== o.tv) return null; o.role = u.role; o.name = u.name; } return o; } catch (e) { return null; } };
  const tokenFor = (u) => sign({ id: u.id, role: u.role, name: u.name, tv: u.tv || 1, exp: Date.now() + 12 * 3600 * 1000 });
  return { create, check, setPassword, resetTemp, update, byId, list, pub, sign, verify, tokenFor, same, clean, validPassword, ROLE_OK };
};
