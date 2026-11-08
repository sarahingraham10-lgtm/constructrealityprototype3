'use strict';
/* Generates a sample project from the template layout so you can see the plans without a headset. Run: npm run sample */
const path = require('path');
const { pack, templateSpec } = require('../server/model');
const { writeProject } = require('../server/index');
const out = pack(templateSpec({ bedrooms: 3, bathrooms: 2, dining: true, laundry: true }), { w: 16, d: 12 });
const r = writeProject('CR-SAMPLE-0001', out.design, { ref: 'CR-SAMPLE-0001', client: 'Sample client', project: 'Sample 3 bedroom home', date: new Date().toISOString() });
console.log('Rooms:', r.sch.rooms.map(x => `${x.name} ${x.width}x${x.depth}`).join(' | '));
console.log('Issues:', JSON.stringify(r.geo.issues));
console.log('Files written to', path.join(__dirname, '..', 'data', 'projects', 'CR-SAMPLE-0001'));
