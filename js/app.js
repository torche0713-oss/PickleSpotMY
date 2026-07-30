(function () {
  'use strict';

  let map = null;
  let mapMarkers = [];
  let searchResults = null;
  let allLocations = [];

  const elements = {
    form: document.getElementById('search-form'),
    stateInput: document.getElementById('state-input'),
    cityInput: document.getElementById('city-input'),
    latInput: document.getElementById('lat-input'),
    lngInput: document.getElementById('lng-input'),
    dateInput: document.getElementById('date-input'),
    startTime: document.getElementById('start-time'),
    endTime: document.getElementById('end-time'),
    searchStatus: document.getElementById('search-status'),
    resultsHeader: document.getElementById('results-header'),
    resultsCount: document.getElementById('results-count'),
    resultsMap: document.getElementById('results-map'),
    resultsList: document.getElementById('results-list'),
    loading: document.getElementById('loading'),
    noResults: document.getElementById('no-results'),
    initialMsg: document.getElementById('initial-msg'),
  };

  function init() {
    const today = new Date().toISOString().split('T')[0];
    elements.dateInput.value = today;
    elements.form.addEventListener('submit', onSearch);
    elements.stateInput.addEventListener('change', onStateChange);
    elements.cityInput.addEventListener('change', onCityChange);
    loadLocations();
    loadDirectory();
  }

  async function loadLocations() {
    try {
      const res = await fetch('/api/locations');
      allLocations = await res.json();
      populateStates();
    } catch (e) {
      console.error('Failed to load locations', e);
    }
  }

  function populateStates() {
    const seen = {};
    const stateOpts = [{ value: '', label: 'All States' }];
    allLocations.forEach(l => {
      if (!seen[l.state]) {
        seen[l.state] = true;
        stateOpts.push({ value: l.state, label: l.state });
      }
    });
    stateOpts.sort((a, b) => a.label.localeCompare(b.label));
    if (stateOpts.length > 1 && stateOpts[0].value === '') {
      const all = stateOpts.shift();
      stateOpts.unshift(all);
    }
    elements.stateInput.innerHTML = stateOpts.map(s =>
      `<option value="${s.value}">${s.label}</option>`
    ).join('');
    populateCities();
  }

  function populateCities() {
    const state = elements.stateInput.value;
    let cities = allLocations;
    if (state) {
      cities = cities.filter(l => l.state === state);
    }
    cities = cities.sort((a, b) => a.sortOrder - b.sortOrder);

    let html = '<option value="">Select a city...</option>';
    cities.forEach(l => {
      html += `<option value="${l.city}" data-lat="${l.latitude}" data-lng="${l.longitude}" data-state="${l.state}">${l.city}${!state ? ', ' + l.state : ''}</option>`;
    });
    elements.cityInput.innerHTML = html;
  }

  function onStateChange() {
    populateCities();
  }

  function onCityChange() {
    const opt = elements.cityInput.options[elements.cityInput.selectedIndex];
    if (opt && opt.value) {
      elements.latInput.value = opt.dataset.lat;
      elements.lngInput.value = opt.dataset.lng;
    }
  }

  async function onSearch(e) {
    e.preventDefault();
    const lat = parseFloat(elements.latInput.value) || 3.139;
    const lng = parseFloat(elements.lngInput.value) || 101.686;
    const date = elements.dateInput.value;
    const startTime = elements.startTime.value;
    const endTime = elements.endTime.value;

    if (!date) {
      elements.searchStatus.textContent = 'Please select a date.';
      return;
    }

    setLoading(true, 'Searching for venues with pickleball courts...');
    elements.searchStatus.textContent = 'Searching venues...';

    try {
      const params = new URLSearchParams({ lat, lng });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();

      if (!data.venues || data.venues.length === 0) {
        elements.noResults.classList.remove('hidden');
        elements.searchStatus.textContent = 'No pickleball venues found in this area.';
        setLoading(false);
        return;
      }

      searchResults = data;
      displayVenues(data.venues, date, startTime, endTime);
      renderMap(data.venues);
      elements.searchStatus.textContent = `${data.venues.length} venue(s) found. Checking availability...`;

      await checkAvailabilityForVenues(data.venues, date, startTime, endTime);
    } catch (err) {
      elements.searchStatus.textContent = 'Search failed. Please try again.';
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function setLoading(v, msg) {
    elements.loading.classList.toggle('hidden', !v);
    elements.initialMsg.classList.add('hidden');
    elements.noResults.classList.add('hidden');
    elements.resultsHeader.classList.add('hidden');
    if (msg) elements.loading.querySelector('p').textContent = msg;
  }

  function displayVenues(venues, date, startTime, endTime) {
    elements.resultsHeader.classList.remove('hidden');
    elements.resultsCount.textContent = `${venues.length} venue(s)`;
    elements.initialMsg.classList.add('hidden');

    const list = elements.resultsList;
    list.innerHTML = venues.map(v => `
      <div class="venue-group" data-venue-id="${v.id}">
        <div class="venue-header" onclick="this.closest('.venue-group').classList.toggle('expanded')">
          <div>
            <h3>${v.name}</h3>
            <div class="venue-meta">${v.city || ''} ${v.state || ''}  ·  ${v.totalCourts} court${v.totalCourts > 1 ? 's' : ''}  ·  ${v.sourceType || 'external'}</div>
          </div>
          <div>
            <span class="venue-status-badge">Checking...</span>
          </div>
        </div>
        <div class="venue-courts" id="courts-${v.id}">
          <div style="padding:16px;text-align:center;color:var(--gray-500);font-size:0.85rem;">Loading availability...</div>
        </div>
        <div class="venue-gear">
          <div class="gear-toggle" onclick="event.stopPropagation();this.closest('.venue-gear').classList.toggle('open')">
            <span>🏸 Pickleball Gear</span>
            <span class="gear-arrow">▸</span>
          </div>
          <div class="gear-content">
            <a href="https://shopee.com.my/search?keyword=pickleball+paddle" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Paddles</a>
            <a href="https://shopee.com.my/search?keyword=pickleball+balls+outdoor" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Balls</a>
            <a href="https://shopee.com.my/search?keyword=portable+pickleball+net" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Nets</a>
            <a href="https://shopee.com.my/search?keyword=pickleball+shoes+court" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Shoes</a>
            <a href="https://shopee.com.my/search?keyword=pickleball+bag" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Bags</a>
            <span class="gear-disclaimer">We may earn a commission from purchases.</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function checkAvailabilityForVenues(venues, date, startTime, endTime) {
    for (const venue of venues) {
      const courtIds = venue.courts.map(c => c.id).filter(Boolean);
      if (courtIds.length === 0) {
        updateVenueStatus(venue.id, 'No bookable courts', '');
        continue;
      }

      updateVenueStatus(venue.id, `Checking ${courtIds.length} courts...`, '');

      try {
        const lat = parseFloat(elements.latInput.value) || 3.139;
        const lng = parseFloat(elements.lngInput.value) || 101.686;
        const params = new URLSearchParams({ courtIds: courtIds.join(','), date, startTime, endTime, lat, lng });
        const res = await fetch(`/api/availability?${params}`);
        const data = await res.json();
        renderVenueAvailability(venue.id, data.sessions || [], venue);
      } catch (err) {
        updateVenueStatus(venue.id, 'Unavailable', '');
      }
    }
  }

  function updateVenueStatus(venueId, text, countText) {
    const badge = document.querySelector(`[data-venue-id="${venueId}"] .venue-status-badge`);
    if (badge) badge.textContent = text;
  }

  function renderVenueAvailability(venueId, sessions, venue) {
    const container = document.getElementById(`courts-${venueId}`);
    if (!container) return;

    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--gray-500);font-size:0.85rem;">No available time slots for this date.</div>';
      updateVenueStatus(venueId, 'No slots', '');
      return;
    }

    const url = venue.bookingUrl || '';
    const availableSessions = sessions.filter(s => s.isAvailable !== false);

    container.innerHTML = availableSessions.slice(0, 30).map(s => `
      <div class="session-card">
        <div>
          <div class="session-time">${s.startTime || ''} — ${s.endTime || ''}</div>
          <div style="font-size:0.8rem;color:var(--gray-500);">${s.courtName || venue.name || ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          ${s.price ? `<span class="session-price">RM ${s.price}</span>` : ''}
          ${url ? `<a href="${url}" target="_blank" class="session-book">Book</a>` : ''}
        </div>
      </div>
    `).join('');

    if (availableSessions.length > 30) {
      container.innerHTML += `<p style="padding:8px;text-align:center;font-size:0.8rem;color:var(--gray-500);">+${availableSessions.length - 30} more slots</p>`;
    }

    updateVenueStatus(venueId, `${availableSessions.length} slot${availableSessions.length > 1 ? 's' : ''}`, '');
  }

  function renderMap(venues) {
    if (!map) {
      map = L.map('results-map').setView([3.8, 109.5], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    const bounds = [];
    venues.forEach(v => {
      const lat = parseFloat(v.latitude);
      const lng = parseFloat(v.longitude);
      if (!lat || !lng) return;

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`<h3>${v.name}</h3><p>${v.city || ''} ${v.state || ''}</p><p>${v.totalCourts} courts</p>`);
      mapMarkers.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
  }

  async function loadDirectory() {
    try {
      const res = await fetch('/api/directory?limit=398');
      const data = await res.json();
      const container = document.getElementById('directory-list');
      const countEl = document.getElementById('directory-count');
      if (!container) return;

      countEl.textContent = `${data.total} venues`;

      const sortedStates = (data.states || []).sort((a, b) => b.count - a.count);

      container.innerHTML = sortedStates.map(s => `
        <div class="dir-state-group">
          <div class="dir-state-header" onclick="this.closest('.dir-state-group').classList.toggle('dir-open')">
            <span class="dir-state-name">${s.name}</span>
            <span class="dir-state-count">${s.count} venues</span>
            <span class="dir-arrow">▸</span>
          </div>
          <div class="dir-state-venues" id="dir-${s.name.replace(/\s+/g, '-')}">
            <div style="padding:12px;text-align:center;color:var(--gray-500);font-size:0.85rem;">Loading...</div>
          </div>
        </div>
      `).join('');

      // Load venues per state
      data.states.forEach(s => {
        fetch(`/api/directory?state=${encodeURIComponent(s.name)}&limit=200`)
          .then(r => r.json())
          .then(d => {
            const el = document.getElementById(`dir-${s.name.replace(/\s+/g, '-')}`);
            if (!el) return;
            el.innerHTML = d.venues.map(v => `
              <a href="https://picklepadel.my/en/venues/${v.slug}" target="_blank" class="dir-venue-item" rel="noopener">
                <span class="dir-venue-name">${v.name}</span>
                <span class="dir-venue-city">${v.city || ''} ${v.courts ? '· ' + v.courts + ' courts' : ''}</span>
              </a>
            `).join('');
          })
          .catch(() => {});
      });
    } catch (e) {
      console.error('Failed to load directory', e);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
