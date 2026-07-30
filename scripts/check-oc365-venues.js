const oc365 = require('../services/opencourt365');
const seed = require('../data/seed-courts.json');

(async () => {
  const data = await oc365.searchCourts(3.139, 101.6869, oc365.SPORT_IDS.pickleball);
  console.log('OC365 total from API:', data.total);
  const venues = data.venues || [];

  const seedNames = new Set(seed.map(v => v.name.toLowerCase().trim()));

  console.log(`\nOC365 returns ${venues.length} venues in KL search`);
  console.log('Unique to OC365 (not in our seed):');
  venues.forEach(v => {
    const inSeed = seedNames.has(v.name?.toLowerCase().trim());
    if (!inSeed) console.log(`  ✗ ${v.name} (${v.city || ''})`);
  });
  console.log(`\nIn our seed too:`);
  let inCount = 0;
  venues.forEach(v => {
    if (seedNames.has(v.name?.toLowerCase().trim())) inCount++;
  });
  console.log(`${inCount}/${venues.length} already in our seed`);

  // Search Penang
  try {
    const d2 = await oc365.searchCourts(5.39, 100.33, oc365.SPORT_IDS.pickleball);
    const v2 = d2.venues || [];
    console.log(`\nPenang: ${v2.length} OC365 venues`);
    v2.forEach(v => {
      if (!seedNames.has(v.name?.toLowerCase().trim())) console.log(`  ✗ ${v.name}`);
    });
  } catch(e) {}
})().catch(e => console.error(e));
