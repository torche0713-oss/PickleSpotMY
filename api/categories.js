const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'categories.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    res.status(200).json(data);
  } catch (err) {
    console.error('Error reading categories:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
};
