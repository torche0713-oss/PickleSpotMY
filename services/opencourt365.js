const axios = require('axios');

const BASE = 'https://opencourt365.com.my';

const api = axios.create({
  baseURL: BASE,
  headers: { 'User-Agent': 'PickleSpotMY/1.0', 'Accept': 'application/json' },
  timeout: 15000,
});

const cache = {
  venues: { data: null, timestamp: 0 },
  courts: new Map(),
  TTL: 5 * 60 * 1000,
};

function isCached(entry) {
  return entry && Date.now() - entry.timestamp < cache.TTL;
}

async function searchVenues(lat, lng, sport) {
  const params = { lat, lng };
  if (sport) params.sportId = sport;

  const { data } = await api.get('/api/venues/search', { params });
  return data;
}

async function getVenueDetail(venueId) {
  const { data } = await api.get(`/api/venues/${venueId}`);
  return data;
}

async function getVenueCourts(venueId) {
  const { data } = await api.get(`/api/venues/${venueId}/courts`);
  return data;
}

async function searchCourts(lat, lng, sportId) {
  const params = { lat, lng };
  if (sportId) params.sportId = sportId;

  const { data } = await api.get('/api/courts/search', { params });
  return data;
}

async function getSports() {
  const { data } = await api.get('/api/sports');
  return data;
}

async function getSuggestedLocations() {
  const { data } = await api.get('/api/suggested-locations');
  return data;
}

module.exports = {
  searchVenues,
  getVenueDetail,
  getVenueCourts,
  searchCourts,
  getSports,
  getSuggestedLocations,
  SPORT_IDS: { pickleball: '94a457ed-653c-4082-8dbc-eae3be168364', badminton: 'd91846b2-3cfb-4e49-a96a-115008c0b9b4' },
};
