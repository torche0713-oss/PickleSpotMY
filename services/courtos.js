const axios = require('axios');

const BASE = 'https://courtos.momentist.com.my';

async function getVenues() {
  const { data } = await axios.get(`${BASE}/venues`, {
    headers: { 'User-Agent': 'PickleSpotMY/1.0' },
    timeout: 15000,
  });
  return data;
}

async function getVenueDetail(slug) {
  const { data } = await axios.get(`${BASE}/v/${slug}`, {
    headers: { 'User-Agent': 'PickleSpotMY/1.0' },
    timeout: 15000,
  });
  return data;
}

async function getAvailability(slug, date) {
  const { data } = await axios.get(`${BASE}/book/${slug}`, {
    headers: { 'User-Agent': 'PickleSpotMY/1.0' },
    timeout: 15000,
  });

  const wireData = data.match(/wire:snapshot="([^"]+)"/);
  if (!wireData) return { error: 'No Livewire data found' };

  try {
    const decoded = JSON.parse(unescape(wireData[1]));
    const calendar = decoded?.state?.dayData;
    if (!calendar) return { error: 'No calendar data in snapshot' };
    return { calendar, courts: decoded?.state?.courts || [] };
  } catch (e) {
    return { error: `Parse error: ${e.message}` };
  }
}

module.exports = { getVenues, getVenueDetail, getAvailability };
