const express = require('express');
const path = require('path');
const oc365 = require('./services/opencourt365');
const { fetchAvailability } = require('./services/availability-fetcher');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/sports', async (req, res) => {
  try {
    const sports = await oc365.getSports();
    res.json(sports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/venues', async (req, res) => {
  try {
    const { lat = 3.139, lng = 101.686 } = req.query;
    const venues = await oc365.searchVenues(parseFloat(lat), parseFloat(lng));
    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { lat = 3.139, lng = 101.686 } = req.query;
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

    const venues = Array.from(venueMap.values());
    res.json({ total: data.total, searchId: data.searchId, venues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/availability', async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PickleSpotMY server running on http://localhost:${PORT}`);
});
