const fs = require('fs');
const path = require('path');

const CACHE_TTL = 5 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

const DATA_FILE = path.join(__dirname, '..', 'data', 'seed-courts.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
      return res.status(200).json(cache.data);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    cache = { data, timestamp: Date.now() };
    res.status(200).json(data);
  } catch (err) {
    console.error('Error reading courts data:', err);
    res.status(500).json({ error: 'Failed to load courts data' });
  }
};
