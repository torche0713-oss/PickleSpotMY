const venues = require('../data/seed-courts.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { state, city, limit = '50' } = req.query;
    let results = venues;

    if (state) {
      results = results.filter(v => v.location.state?.toLowerCase() === state.toLowerCase());
    }
    if (city) {
      results = results.filter(v => v.location.city?.toLowerCase() === city.toLowerCase());
    }

    const lmt = Math.min(parseInt(limit) || 50, 398);
    results = results.slice(0, lmt);

    const summary = results.map(v => ({
      name: v.name,
      slug: v.slug,
      city: v.location.city || '',
      state: v.location.state || '',
      lat: v.location.lat,
      lng: v.location.lng,
      courts: v.courts,
      amenities: (v.amenities || []).slice(0, 3),
      source: v.source,
    }));

    const venuesByState = {};
    venues.forEach(v => {
      const s = v.location.state || 'Unknown';
      venuesByState[s] = (venuesByState[s] || 0) + 1;
    });

    res.json({
      total: venues.length,
      filtered: results.length,
      venues: summary,
      states: Object.entries(venuesByState).map(([name, count]) => ({ name, count })),
    });
  } catch (err) {
    console.error('directory error:', err);
    res.status(500).json({ error: err.message });
  }
};
