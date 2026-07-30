const { fetchAvailability } = require('../services/availability-fetcher');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { courtIds, date, startTime, endTime, lat, lng } = req.query;
    if (!courtIds) return res.status(400).json({ error: 'courtIds required' });

    const ids = courtIds.split(',').filter(Boolean);
    const sessions = await fetchAvailability(ids, {
      startDate: date,
      endDate: date,
      startTime: startTime || '00:00',
      endTime: endTime || '24:00',
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
    });

    res.json({ sessions, total: sessions.length });
  } catch (err) {
    console.error('availability error:', err);
    res.status(500).json({ error: err.message });
  }
};
