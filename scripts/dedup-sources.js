const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/User/OneDrive/Documents/PickleSpotMY/data/seed-courts.json','utf8'));

function norm(v) {
  return v.name.toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9\s'&@]/g, '')
    .replace(/\b(the|and|&|club|court|courts|centre|center|sports|badminton)\b/g, '')
    .replace(/\s+/g, ' ').trim();
}

function dist(lat1,lng1,lat2,lng2) {
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

const pp = data.filter(v => v.source === 'picklepadel.my');
const oc = data.filter(v => v.source === 'opencourt365.com.my');

const toRemove = new Set();
const matched = [];
function addPair(method, ocName, ppName, state) {
  const ocv = oc.find(v => v.name === ocName);
  const ppv = pp.find(v => v.name === ppName);
  if (!ocv) { console.log('WARN: OC not found: ' + ocName); return; }
  if (!ppv) { console.log('WARN: PP not found: ' + ppName); return; }
  if (toRemove.has(ppv.id)) { console.log('SKIP (already removed): ' + ppName); return; }
  toRemove.add(ppv.id);
  matched.push({ method, oc: ocName, pp: ppName, state });
}

// === AUTO: exact norm match within same state ===
const ppByNorm = {};
pp.forEach(v => {
  const key = norm(v) + '|' + v.location.state;
  if (!ppByNorm[key]) ppByNorm[key] = [];
  ppByNorm[key].push(v);
});
oc.forEach(v => {
  const key = norm(v) + '|' + v.location.state;
  if (ppByNorm[key]) {
    ppByNorm[key].forEach(ppv => {
      if (!toRemove.has(ppv.id)) {
        toRemove.add(ppv.id);
        matched.push({ method: 'auto-exact', oc: v.name, pp: ppv.name, state: v.location.state });
      }
    });
  }
});

// === MANUAL pairs (verified) ===
// Cross-state (KL/Selangor) that are clearly the same venue
addPair('manual', 'Lavana 3 Badminton Centre @ Kepong', 'Lavana 3 Pickleball Centre @ Kepong', 'KL/Selangor');
addPair('manual', 'X Park Sunway South Quay', 'X Park Pickleball Sunway South Quay', 'KL/Selangor');
addPair('manual', 'RCP Racquet Club Puchong (Badminton & Pickleball)', 'RCP Racquet Club Puchong', 'KL/Selangor');
addPair('manual', 'White Fairy Badminton Court', 'White Fairy Badminton & Pickleball Court', 'KL/Selangor');

// Same-state but norm didn't catch
addPair('manual', 'All-Star Pickle', 'All-Star Pickle ST', 'Selangor');
addPair('manual', 'Setapak Badminton Centre', 'Setapak Pickleball', 'Kuala Lumpur');
addPair('manual', 'Pickle Haven USJ', 'Pickle Haven', 'KL/Selangor');
addPair('manual', 'Jompickle @ Icon City PJ', 'Jompickle Sports Club', 'KL/Selangor');
addPair('manual', 'Alor Setar Pickleball Community', 'Alor Setar Pickleball', 'Kedah');
addPair('manual', 'Pickle World @ PJ (Jalan Tandang)', 'Pickle World @ PJ', 'KL/Selangor');

// Smart quote variation (OC has \u2018 left single quote)
addPair('manual', 'Gotta\u2018 Bounce Sports & Social Club', "Gotta' Bounce Sports & Social Club", 'Johor');

// Johor pairs
addPair('manual', 'KICKS - The Pickle Exchange | Taman Gembira, Johor Bahru', 'KICKS - The Pickle Exchange', 'Johor');
addPair('manual', 'Pickle Friends @ Lotuss Plentong Powered by ORI5IN', 'Pickle Friends @ Lotuss Plentong', 'Johor');

// Proximity-confirmed pairs (from auto prox run, already verified)
addPair('manual', 'MEW Pickleball', 'MEW Pickleball @ Leong See Kah', 'Penang');
addPair('manual', 'Spin City Courts @ Great Eastern Mall, Ampang', 'Spin City', 'Kuala Lumpur');
addPair('manual', 'Premier KL Pickleball', 'Premier Pickleball', 'Kuala Lumpur');
addPair('manual', 'Embassy Villa by COBNB', 'Embassy Villa Pickleball By Cobnb (KL)', 'Kuala Lumpur');

console.log('Total duplicates: ' + matched.length + '\n');
matched.forEach(m => console.log('  [' + m.method + '] OC: "' + m.oc + '"  <=>  PP: "' + m.pp + '"  [' + m.state + ']'));

const filtered = data.filter(v => !toRemove.has(v.id));
console.log('\nBefore: ' + data.length + '  After: ' + filtered.length + '  Removed: ' + toRemove.size);

fs.writeFileSync('C:/Users/User/OneDrive/Documents/PickleSpotMY/data/seed-courts.json', JSON.stringify(filtered, null, 2));
console.log('Saved.');

const sources = {};
filtered.forEach(v => { const s = v.source || 'unknown'; sources[s] = (sources[s] || 0) + 1; });
console.log('By source:', JSON.stringify(sources, null, 2));
