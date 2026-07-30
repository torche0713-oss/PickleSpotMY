const oc365 = require('../services/opencourt365');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { lat = '3.139', lng = '101.686' } = req.query;
    const data = await oc365.searchCourts(parseFloat(lat), parseFloat(lng), oc365.SPORT_IDS.pickleball);

    const venueMap = new Map();
    (data.courts || []).forEach(c => {
      if (!c.venue) return;
      const vid = c.venue.id;
      if (!venueMap.has(vid)) {
        venueMap.set(vid, { ...c.venue, courts: [], totalCourts: 0 });
      }
      const v = venueMap.get(vid);
      v.courts.push({ id: c.id, name: c.name, displayName: c.displayName, isIndoor: c.isIndoor, sourceType: c.sourceType });
      v.totalCourts++;
    });

    res.json({ total: data.total, searchId: data.searchId, venues: Array.from(venueMap.values()) });
  } catch (err) {
    console.error('search error:', err);
    res.status(500).json({ error: err.message });
  }
};
