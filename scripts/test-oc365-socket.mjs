import { io } from 'socket.io-client';
import { setTimeout as sleep } from 'timers/promises';

const BASE = 'https://opencourt365.com.my';

// Step 1: Create a search via REST to get a searchId
const searchRes = await fetch(`${BASE}/api/courts/search?lat=3.139&lng=101.686&radius=10&sportId=94a457ed-653c-4082-8dbc-eae3be168364`);
const { searchId, courts } = await searchRes.json();
console.log(`Search created: ${searchId}, courts: ${courts?.length || 0}`);

// Step 2: Connect WebSocket
const socket = io(BASE, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  socket.emit('search:join', searchId);
  console.log('Joined search:', searchId);

  // Request crawl
  socket.emit('crawl:batch_start', {
    lat: 3.139,
    lng: 101.686,
    radius: 10,
    sportId: '94a457ed-653c-4082-8dbc-eae3be168364',
    searchId,
  });
});

socket.on('crawl:progress', (data) => {
  console.log('Progress:', data);
});

socket.on('crawl:complete', (data) => {
  console.log('Complete! Sessions:', data?.sessions?.length || 0);
  console.log(JSON.stringify(data, null, 2).substring(0, 2000));
  socket.close();
  process.exit(0);
});

socket.on('crawl:error', (err) => {
  console.error('Crawl error:', err);
});

socket.on('connect_error', (err) => {
  console.error('Socket connect error:', err.message);
});

await sleep(30000);
console.log('Timeout - no results received');
socket.close();
process.exit(1);
