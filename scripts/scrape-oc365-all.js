const axios = require('axios');
const fs = require('fs');

const seed = JSON.parse(fs.readFileSync('C:/Users/User/OneDrive/Documents/PickleSpotMY/data/seed-courts.json', 'utf8'));

const AREAS = [
  { lat: 3.139, lng: 101.6869, label: 'Kuala Lumpur' },
  { lat: 3.073, lng: 101.518, label: 'KL Selangor' },
  { lat: 3.2, lng: 101.6, label: 'Selangor North' },
  { lat: 3.0, lng: 101.4, label: 'Selangor South' },
  { lat: 2.92, lng: 101.65, label: 'Putrajaya' },
  { lat: 3.25, lng: 101.68, label: 'Selayang' },
  { lat: 3.15, lng: 101.45, label: 'Shah Alam' },
  { lat: 3.03, lng: 101.55, label: 'Subang Jaya' },
  { lat: 3.07, lng: 101.60, label: 'Petaling Jaya' },
  { lat: 3.20, lng: 101.73, label: 'Ampang' },
  { lat: 5.39, lng: 100.33, label: 'Penang Island' },
  { lat: 5.44, lng: 100.28, label: 'Penang Island 2' },
  { lat: 5.33, lng: 100.47, label: 'Penang Mainland' },
  { lat: 1.47, lng: 103.62, label: 'Johor Bahru' },
  { lat: 1.55, lng: 103.78, label: 'Johor Bahru 2' },
  { lat: 2.03, lng: 103.32, label: 'Johor (Kluang)' },
  { lat: 4.59, lng: 101.09, label: 'Perak (Ipoh)' },
  { lat: 4.22, lng: 100.65, label: 'Perak (Lumut)' },
  { lat: 2.19, lng: 102.24, label: 'Melaka' },
  { lat: 2.72, lng: 101.94, label: 'Negeri Sembilan' },
  { lat: 3.8, lng: 103.3, label: 'Pahang (Kuantan)' },
  { lat: 5.33, lng: 103.14, label: 'Terengganu' },
  { lat: 6.12, lng: 102.24, label: 'Kelantan' },
  { lat: 6.12, lng: 100.37, label: 'Kedah (Alor Setar)' },
  { lat: 5.65, lng: 100.50, label: 'Kedah (Sungai Petani)' },
  { lat: 6.44, lng: 100.20, label: 'Perlis' },
  { lat: 1.55, lng: 110.34, label: 'Sarawak (Kuching)' },
  { lat: 2.3, lng: 111.83, label: 'Sarawak (Sibu)' },
  { lat: 5.95, lng: 116.07, label: 'Sabah (KK)' },
  { lat: 5.98, lng: 116.11, label: 'Sabah (KK 2)' },
  { lat: 4.26, lng: 117.88, label: 'Sabah (Tawau)' },
];

// Map rough lat/lng to a state name
function guessState(lat, lng) {
  if (!lat || !lng) return 'Unknown';
  if (lng > 114) return 'Sabah';
  if (lng > 109) return 'Sarawak';
  if (lat > 6.2) return 'Perlis';
  if (lat > 5.7 && lng < 100.6) return 'Kedah';
  if (lat > 5.2 && lng < 100.5) return 'Penang';
  if (lat > 4.8 && lng < 101.2) return 'Perak';
  if (lat > 4.5 && lng > 101.9) return 'Kelantan';
  if (lat > 5.0 && lng > 102.9) return 'Terengganu';
  if (lat > 3.8 && lng > 102.5) return 'Pahang';
  if (lat > 3.4 && lng < 101.8) return 'Selangor';
  if (lat > 3.0 && lng < 101.9) { if (lat > 3.2) return 'Selangor'; return 'Kuala Lumpur'; }
  if (lat > 2.5 && lng < 102.2) return 'Negeri Sembilan';
  if (lat > 2.0 && lng < 102.5) return 'Melaka';
  if (lat > 1.3 && lng < 104.2) return 'Johor';
  return 'Unknown';
}

(async () => {
  const seen = new Map(); // venue.id -> venue object

  for (const area of AREAS) {
    try {
      const { data } = await axios.get('https://opencourt365.com.my/api/courts/search', {
        params: { lat: area.lat, lng: area.lng },
        headers: { 'User-Agent': 'PickleSpotMY/1.0' },
        timeout: 15000,
      });

      (data.courts || []).forEach(c => {
        if (c.venue && c.venue.id && !seen.has(c.venue.id)) {
          seen.set(c.venue.id, {
            name: c.venue.name || '',
            id: c.venue.id,
            slug: c.venue.slug || '',
            lat: c.venue.latitude,
            lng: c.venue.longitude,
            city: c.venue.city || '',
            state: c.venue.state || '',
            bookingUrl: c.venue.bookingUrl || '',
            phone: c.venue.phone || '',
            website: c.venue.website || '',
            sourceType: c.sourceType || 'opencourt365',
          });
        }
      });
      console.log(`${area.label}: ${(data.courts || []).length} courts | unique: ${seen.size}`);
    } catch (e) {
      console.log(`${area.label}: ERROR ${e.message}`);
    }
  }

  console.log(`\n=== TOTAL OC365 VENUES: ${seen.size} ===`);

  // Build seed name lookup
  const seedNames = new Set(seed.map(v => v.name.toLowerCase().trim()));

  const newVenues = [];
  seen.forEach(v => {
    const name = v.name.trim();
    if (!name) return;
    const normalized = name.toLowerCase().trim();

    // Skip if already in seed
    if (seedNames.has(normalized)) return;

    const state = v.state || guessState(v.lat, v.lng);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    newVenues.push({
      id: slug,
      name: name,
      slug: slug,
      description: `${name} pickleball venue in ${v.city || state || 'Malaysia'}.`,
      category: 'indoor',
      location: {
        address: '',
        city: v.city || '',
        state: state,
        lat: v.lat || 0,
        lng: v.lng || 0,
      },
      contact: {
        website: v.website || v.bookingUrl || '',
        phone: v.phone || '',
      },
      amenities: [],
      courts: 1,
      price_range: '',
      source: v.sourceType === 'playbypoint' ? 'playbypoint.com' : 'opencourt365.com.my',
      source_url: v.bookingUrl || '',
      status: 'active',
    });
  });

  console.log(`\nNew venues to add: ${newVenues.length}`);
  newVenues.forEach(v => console.log(`  + ${v.name} (${v.location.state})`));

  // Merge and save
  const merged = [...seed, ...newVenues];
  fs.writeFileSync('C:/Users/User/OneDrive/Documents/PickleSpotMY/data/seed-courts.json', JSON.stringify(merged, null, 2));
  console.log(`\nWritten ${merged.length} venues to seed-courts.json`);

  const byState = {};
  merged.forEach(v => {
    const s = v.location.state || 'Unknown';
    byState[s] = (byState[s] || 0) + 1;
  });
  console.log('By state:', JSON.stringify(byState, null, 2));
})().catch(e => console.error('FATAL', e.message));
