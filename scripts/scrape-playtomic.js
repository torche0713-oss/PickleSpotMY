// Scrape Playtomic Malaysian club pages (public HTML) for pickleball venues
const axios = require('axios');
const fs = require('fs');

const seed = JSON.parse(fs.readFileSync('C:/Users/User/OneDrive/Documents/PickleSpotMY/data/seed-courts.json', 'utf8'));

// Candidate Malaysian club slugs (filtered to those offering pickleball)
const CLUBS = [
  'city-padel-kl',
  'reserve-pickle-padel',
  'base-pickle-padel-club',
  'skycourts-padle-pickle',
  'de-palma-social-club',
  'the-rally-padel-club',
  'jom-padel',
  'padeldepot',
  'padel-revolution',
  'jpc',
  'pop-padel-bamboo-hills',
  'padelstop-jb',
];

function guessState(address) {
  const city = (address.city || '') + ' ' + (address.administrative_area || '');
  if (city.includes('Kuala Lumpur') || city.includes('Wilayah Persekutuan')) return 'Kuala Lumpur';
  if (city.includes('Selangor') || city.includes('Petaling Jaya') || city.includes('Shah Alam') || city.includes('Subang')) return 'Selangor';
  if (city.includes('Penang') || city.includes('Pulau Pinang') || city.includes('Georgetown')) return 'Penang';
  if (city.includes('Johor')) return 'Johor';
  if (city.includes('Perak')) return 'Perak';
  if (city.includes('Melaka')) return 'Melaka';
  if (city.includes('Sabah')) return 'Sabah';
  if (city.includes('Sarawak')) return 'Sarawak';
  if (city.includes('Kedah')) return 'Kedah';
  if (city.includes('Negeri Sembilan')) return 'Negeri Sembilan';
  if (city.includes('Pahang')) return 'Pahang';
  if (city.includes('Terengganu')) return 'Terengganu';
  if (city.includes('Kelantan')) return 'Kelantan';
  return '';
}

// Unescape a JS string literal body (content captured between outer quotes)
function unescapeJs(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== '\\') { out += ch; continue; }
    const next = s[++i];
    switch (next) {
      case 'n': out += '\n'; break;
      case 't': out += '\t'; break;
      case 'r': out += '\r'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case '0': out += '\0'; break;
      case '"': out += '"'; break;
      case '\\': out += '\\'; break;
      case '/': out += '/'; break;
      case 'u': {
        const hex = s.slice(i + 1, i + 5);
        out += String.fromCharCode(parseInt(hex, 16));
        i += 4;
        break;
      }
      default: out += next;
    }
  }
  return out;
}

// Extract tenant JSON from Next.js RSC payload
function extractTenant(html) {
  const pushRegex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let m;
  while ((m = pushRegex.exec(html))) {
    const s = unescapeJs(m[1]);
    const tidIdx = s.indexOf('tenant_id');
    if (tidIdx < 0) continue;
    // Find the opening brace of the object containing tenant_id
    let start = -1;
    for (let i = tidIdx; i >= 0; i--) {
      if (s[i] === '{') { start = i; break; }
    }
    if (start < 0) continue;
    // Walk unescaped text (real strings now), find balanced object
    let depth = 0, end = -1, inStr = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end > 0) {
      try { return JSON.parse(s.slice(start, end)); } catch (e) { console.log('JSON parse failed: ' + e.message); }
    }
  }
  return null;
}

(async () => {
  const venues = [];

  for (const slug of CLUBS) {
    try {
      const { data } = await axios.get('https://playtomic.com/clubs/' + slug, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
        timeout: 20000,
      });

      const tenant = extractTenant(data);
      if (!tenant) { console.log(slug + ': NO tenant data'); continue; }

      const sports = tenant.sport_ids || [];
      const hasPickle = sports.includes('PICKLEBALL');
      console.log(slug + ': ' + tenant.tenant_name + ' | sports: ' + sports.join(', ') + (hasPickle ? ' | HAS PICKLEBALL' : ' | no pickle'));

      if (!hasPickle) continue;

      const addr = tenant.address || {};
      const props = tenant.properties || {};
      const state = guessState(addr) || '';

      venues.push({
        name: tenant.tenant_name,
        slug: slug,
        description: tenant.tenant_name + ' pickleball venue in ' + (addr.city || 'Malaysia') + '.',
        category: (tenant.resources || []).find(r => r.sport === 'PICKLEBALL' && (r.features || []).includes('indoor')) ? 'indoor' : 'outdoor',
        location: {
          address: [addr.street, addr.postal_code].filter(Boolean).join(', '),
          city: addr.city || '',
          state: state,
          lat: addr.coordinate ? addr.coordinate.lat : 0,
          lng: addr.coordinate ? addr.coordinate.lon : 0,
        },
        contact: {
          website: props.WEBSITE_URL || 'https://playtomic.com/clubs/' + slug,
          phone: props.CONTACT_PHONE || '',
        },
        amenities: [],
        courts: (tenant.resources || []).filter(r => r.sport === 'PICKLEBALL').length,
        price_range: '',
        source: 'playtomic.com',
        source_url: 'https://playtomic.com/clubs/' + slug,
        status: 'active',
      });
    } catch (e) {
      console.log(slug + ': ERROR ' + e.message);
    }
  }

  console.log('\n=== Playtomic pickleball venues: ' + venues.length + ' ===');
  venues.forEach(v => console.log('  ' + v.name + ' [' + v.location.state + '] ' + v.location.lat + ',' + v.location.lng));

  // Dedupe against seed by name (normalized) and by proximity
  const seedNames = new Set(seed.map(v => v.name.toLowerCase().trim()));

  function dist(lat1, lng1, lat2, lng2) {
    const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  const toAdd = [];
  venues.forEach(v => {
    if (seedNames.has(v.name.toLowerCase().trim())) { console.log('  SKIP (name dup): ' + v.name); return; }

    // proximity check
    if (v.location.lat && v.location.lng) {
      let near = false;
      for (const s of seed) {
        if (s.location.lat && s.location.lng && s.location.state === v.location.state) {
          const d = dist(v.location.lat, v.location.lng, s.location.lat, s.location.lng);
          if (d < 150) { near = true; console.log('  SKIP (near ' + Math.round(d) + 'm to "' + s.name + '"): ' + v.name); break; }
        }
      }
      if (near) return;
    }
    toAdd.push(v);
  });

  console.log('\nNew venues to add: ' + toAdd.length);
  toAdd.forEach(v => console.log('  + ' + v.name + ' [' + v.location.state + ']'));

  if (toAdd.length) {
    const merged = [...seed, ...toAdd];
    fs.writeFileSync('C:/Users/User/OneDrive/Documents/PickleSpotMY/data/seed-courts.json', JSON.stringify(merged, null, 2));
    console.log('\nWritten ' + merged.length + ' venues');
  } else {
    console.log('No new venues.');
  }
})().catch(e => console.error('FATAL', e.message));
