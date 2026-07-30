const axios = require('axios');
const fs = require('fs');
const seed = require('../data/seed-courts.json');

const AREAS = [
  { lat: 3.139, lng: 101.6869, label: 'Kuala Lumpur' },
  { lat: 3.0, lng: 101.5, label: 'Selangor' },
  { lat: 5.39, lng: 100.33, label: 'Penang' },
  { lat: 1.47, lng: 103.62, label: 'Johor' },
  { lat: 4.59, lng: 101.09, label: 'Perak' },
  { lat: 2.19, lng: 102.24, label: 'Melaka' },
  { lat: 2.72, lng: 101.94, label: 'Negeri Sembilan' },
  { lat: 3.8, lng: 103.3, label: 'Pahang' },
  { lat: 5.33, lng: 103.14, label: 'Terengganu' },
  { lat: 6.12, lng: 102.24, label: 'Kelantan' },
  { lat: 6.12, lng: 100.37, label: 'Kedah' },
  { lat: 6.44, lng: 100.20, label: 'Perlis' },
  { lat: 1.55, lng: 110.34, label: 'Sarawak' },
  { lat: 5.95, lng: 116.07, label: 'Sabah' },
];

// Helper: approximate state from lat/lng
function stateFromLabel(label) {
  return label;
}

(async () => {
  const allVenues = new Map(); // keyed by venue id

  for (const area of AREAS) {
    try {
      const { data } = await axios.get('https://opencourt365.com.my/api/courts/search', {
        params: { lat: area.lat, lng: area.lng },
        headers: { 'User-Agent': 'PickleSpotMY/1.0' },
        timeout: 15000,
      });

      (data.courts || []).forEach(c => {
        if (c.venue && c.venue.id) {
          const v = c.venue;
          if (!allVenues.has(v.id)) {
            allVenues.set(v.id, {
              ...v,
              _area: area.label,
            });
          }
        }
      });
      console.log(`${area.label}: ${(data.courts || []).length} courts`);
    } catch (e) {
      console.log(`${area.label}: ERROR ${e.message}`);
    }
  }

  console.log(`\nTotal unique OC365 venues: ${allVenues.size}`);

  // Create seed entries from OC365 venues
  const seedNames = new Set(seed.map(v => v.name.toLowerCase().trim()));
  const newVenues = [];

  allVenues.forEach((v, id) => {
    const name = v.name?.trim();
    if (!name) return;

    const normalizedName = name.toLowerCase().trim();
    if (seedNames.has(normalizedName)) {
      return; // already in seed
    }

    // Determine state from area or coords
    let state = v.state || '';
    if (!state) {
      state = v._area || '';
    }

    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    newVenues.push({
      id: slug,
      name: name,
      slug: slug,
      description: `${name} pickleball venue in ${v.city || state || 'Malaysia'}.`,
      category: 'indoor',
      location: {
        address: v.address || '',
        city: v.city || '',
        state: state,
        lat: v.latitude || v.lat || 0,
        lng: v.longitude || v.lng || 0,
      },
      contact: {
        website: v.website || v.bookingUrl || '',
        phone: v.phone || '',
      },
      amenities: [],
      courts: 1,
      price_range: '',
      source: 'opencourt365.com.my',
      source_url: v.bookingUrl || `https://opencourt365.com.my/venues/${v.slug || id}`,
      status: 'active',
    });
  });

  console.log(`New venues to add: ${newVenues.length}`);
  newVenues.forEach(v => console.log(`  + ${v.name} (${v.location.state})`));

  // Merge and save
  const merged = [...seed, ...newVenues];
  fs.writeFileSync('C:/Users/User/OneDrive/Documents/PickleSpotMY/data/seed-courts.json', JSON.stringify(merged, null, 2));
  console.log(`\nWritten ${merged.length} venues to seed-courts.json`);

  // Stats
  const byState = {};
  merged.forEach(v => {
    const s = v.location.state || 'Unknown';
    byState[s] = (byState[s] || 0) + 1;
  });
  console.log('By state:', JSON.stringify(byState, null, 2));
})().catch(e => console.error('FATAL', e.message));
