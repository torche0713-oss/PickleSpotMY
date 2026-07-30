const axios = require('axios');

const CACHE = { data: null, timestamp: 0 };
const TTL = 10 * 60 * 1000;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!CACHE.data || Date.now() - CACHE.timestamp > TTL) {
      const { data } = await axios.get('https://opencourt365.com.my/api/suggested-locations', {
        headers: { 'User-Agent': 'PickleSpotMY/1.0', 'Accept': 'application/json' },
        timeout: 10000,
      });
      CACHE.data = data;
      CACHE.timestamp = Date.now();
    }

    const { q, state } = req.query;
    let results = CACHE.data;

    if (q) {
      const term = q.toLowerCase();
      results = results.filter(l =>
        l.city.toLowerCase().includes(term) ||
        l.state.toLowerCase().includes(term)
      );
    }
    if (state) {
      results = results.filter(l => l.state.toLowerCase() === state.toLowerCase());
    }

    results.sort((a, b) => a.sortOrder - b.sortOrder);
    res.json(results);
  } catch (err) {
    console.error('locations error:', err);
    res.status(500).json({ error: err.message });
  }
};
