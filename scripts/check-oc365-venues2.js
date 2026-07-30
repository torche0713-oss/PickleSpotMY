const axios = require('axios');

(async () => {
  const { data } = await axios.get('https://opencourt365.com.my/api/courts/search', {
    params: { lat: 3.139, lng: 101.6869 },
    headers: { 'User-Agent': 'PickleSpotMY/1.0' },
    timeout: 10000,
  });
  console.log('Top-level keys:', Object.keys(data));
  console.log('total:', data.total);
  console.log('searchId:', data.searchId);
  console.log('Has venues:', Array.isArray(data.venues));
  console.log('Has courts:', Array.isArray(data.courts));
  if (data.courts && data.courts.length) {
    console.log('Courts[0]:', JSON.stringify(data.courts[0], null, 2).substring(0, 300));
  }
  if (data.venues && data.venues.length) {
    console.log('Venues[0]:', JSON.stringify(data.venues[0], null, 2).substring(0, 300));
  }
  // Log all keys in the response
  console.log('\nFull response structure:');
  for (const [k, v] of Object.entries(data)) {
    const type = Array.isArray(v) ? `Array(${v.length})` : typeof v;
    console.log(`  ${k}: ${type}`);
  }
  // Try to find venue names
  const allText = JSON.stringify(data);
  const nameMatches = [...allText.matchAll(/"name":"([^"]+)"/g)];
  const names = [...new Set(nameMatches.map(m => m[1]))];
  console.log('\nVenue names found:', names.slice(0, 20));
  console.log('Total unique names:', names.length);

})().catch(e => console.error('ERROR', e.message));
