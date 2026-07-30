const axios = require('axios');
const seed = require('../data/seed-courts.json');

(async () => {
  const { data } = await axios.get('https://opencourt365.com.my/api/courts/search', {
    params: { lat: 3.139, lng: 101.6869 },
    headers: { 'User-Agent': 'PickleSpotMY/1.0' },
    timeout: 10000,
  });

  // Extract venue names from court names
  // Courts are named like "Venue Name - Court X" or "Venue Name - Sport"
  const courtNames = data.courts.map(c => c.name);
  const venueNames = new Set();
  courtNames.forEach(n => {
    // Try to extract venue name (before the dash)
    const parts = n.split(' - ');
    if (parts.length > 1) {
      venueNames.add(parts[0].trim().toLowerCase());
    } else {
      venueNames.add(n.trim().toLowerCase());
    }
  });

  console.log('Unique venues from OC365 courts:', venueNames.size);
  console.log('OC365 venue names:', [...venueNames].sort());

  // Compare with our seed
  const seedNames = new Set(seed.map(v => v.name.toLowerCase().trim()));
  const uniqueToOc365 = [...venueNames].filter(n => !seedNames.has(n));
  console.log('\nOC365 venues NOT in our seed:', uniqueToOc365.length);
  console.log('Missing:', uniqueToOc365.sort());

  // Also check the "venue" field on courts if it exists
  const hasVenueField = data.courts.some(c => c.venue);
  console.log('\nHas venue object field:', hasVenueField);
  if (hasVenueField) {
    const ocVenues = new Set();
    data.courts.forEach(c => {
      if (c.venue?.name) ocVenues.add(c.venue.name.toLowerCase());
    });
    console.log('Venue objects:', [...ocVenues].sort());
    const missing = [...ocVenues].filter(n => !seedNames.has(n));
    console.log('Venue objects not in seed:', missing);
  }
})().catch(e => console.error('ERROR', e.message));
