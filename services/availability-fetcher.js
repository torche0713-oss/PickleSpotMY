const axios = require('axios');
const { io } = require('socket.io-client');

const BASE = 'https://opencourt365.com.my';

async function fetchAvailability(courtIds, { startDate, endDate, startTime, endTime, lat, lng } = {}) {
  const today = new Date().toISOString().split('T')[0];
  const queryLat = lat || 3.139;
  const queryLng = lng || 101.686;
  const queryStartDate = startDate || today;
  const queryEndDate = endDate || today;
  const queryStartTime = startTime || '00:00';
  const queryEndTime = endTime || '24:00';

  const courtIdArray = Array.isArray(courtIds) ? courtIds : [courtIds];
  if (courtIdArray.length === 0) return [];

  // Step 1: Get a real searchId from REST API
  let searchId;
  try {
    const { data } = await axios.get(`${BASE}/api/courts/search`, {
      params: { lat: queryLat, lng: queryLng },
      headers: { 'User-Agent': 'PickleSpotMY/1.0', 'Accept': 'application/json' },
      timeout: 10000,
    });
    searchId = data.searchId;
  } catch (err) {
    searchId = `picklespot-${Date.now()}`;
  }

  return new Promise((resolve) => {
    const socket = io(BASE, { transports: ['websocket'] });
    const sessions = [];
    let completedCount = 0;
    const expected = Math.min(courtIdArray.length, 20);

    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve(sessions);
    }, 120000);

    socket.on('connect', () => {
      socket.emit('search:join', searchId);
      socket.emit('crawl:batch_start', {
        searchId,
        totalCourtCount: expected,
        latitude: queryLat,
        longitude: queryLng,
        sportId: '94a457ed-653c-4082-8dbc-eae3be168364',
        locationName: 'Kuala Lumpur',
      });

      courtIdArray.slice(0, 20).forEach((courtId, idx) => {
        setTimeout(() => {
          socket.emit('crawl:request', {
            courtId,
            startDate: queryStartDate,
            endDate: queryEndDate,
            startTime: queryStartTime,
            endTime: queryEndTime,
            searchId,
          });
        }, idx * 1500);
      });
    });

    socket.on('crawl:complete', (data) => {
      completedCount++;
      if (data && data.sessions) {
        sessions.push(...data.sessions);
      }
      if (completedCount >= expected) {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(sessions);
      }
    });

    socket.on('crawl:error', () => {
      completedCount++;
      if (completedCount >= expected) {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(sessions);
      }
    });

    socket.on('connect_error', () => {
      clearTimeout(timeout);
      resolve(sessions);
    });
  });
}

module.exports = { fetchAvailability };
