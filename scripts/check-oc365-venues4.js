const axios = require('axios');

(async () => {
  const { data } = await axios.get('https://opencourt365.com.my/api/courts/search', {
    params: { lat: 3.139, lng: 101.6869 },
    headers: { 'User-Agent': 'PickleSpotMY/1.0' },
    timeout: 10000,
  });

  // Check venue object structure
  const withVenue = data.courts.filter(c => c.venue);
  if (withVenue.length) {
    console.log('Venue object keys:', Object.keys(withVenue[0].venue));
    console.log('Sample venue:', JSON.stringify(withVenue[0].venue, null, 2));
  }

  // Unique venues with full details
  const venueMap = new Map();
  data.courts.forEach(c => {
    if (c.venue) {
      const v = c.venue;
      const key = v.id || v.name;
      if (key && !venueMap.has(key)) {
        venueMap.set(key, v);
      }
    }
  });

  console.log(`\nTotal unique venues in KL search: ${venueMap.size}`);
  venueMap.forEach((v, k) => {
    console.log(`  ${v.name} | ${v.city || ''}, ${v.state || ''} | lat: ${v.latitude || v.lat || '?'} lng: ${v.longitude || v.lng || '?'}`);
  });
})().catch(e => console.error('ERROR', e.message));
