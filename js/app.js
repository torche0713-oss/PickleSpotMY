(function () {
  'use strict';

  let courtsData = [];
  let map = null;
  let markers = [];
  let currentView = 'grid';

  const API_BASE = '/api';

  const elements = {
    container: document.getElementById('courts-container'),
    loading: document.getElementById('loading'),
    noResults: document.getElementById('no-results'),
    stats: document.getElementById('stats'),
    searchInput: document.getElementById('search-input'),
    stateFilter: document.getElementById('state-filter'),
    categoryFilter: document.getElementById('category-filter'),
    searchBtn: document.getElementById('search-btn'),
    mapContainer: document.getElementById('map-container'),
    modal: document.getElementById('court-modal'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.querySelector('.modal-close'),
  };

  const states = [
    'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan',
    'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak',
    'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
  ];

  function init() {
    populateStateFilter();
    bindEvents();
    loadCourts();
  }

  function populateStateFilter() {
    const select = elements.stateFilter;
    states.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
  }

  function bindEvents() {
    elements.searchBtn.addEventListener('click', filterCourts);
    elements.searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') filterCourts(); });
    elements.stateFilter.addEventListener('change', filterCourts);
    elements.categoryFilter.addEventListener('change', filterCourts);

    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentView = this.dataset.view;
        renderCourts(getFilteredCourts());
      });
    });

    elements.modalClose.addEventListener('click', closeModal);
    elements.modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keyup', e => { if (e.key === 'Escape') closeModal(); });
  }

  async function loadCourts() {
    elements.loading.classList.remove('hidden');

    try {
      const res = await fetch(`${API_BASE}/courts`);
      courtsData = await res.json();
      populateMap(courtsData);
      filterCourts();
    } catch (err) {
      console.error('Failed to load courts:', err);
      elements.loading.textContent = 'Failed to load courts. Using offline data.';
      loadFallback();
    }
  }

  async function loadFallback() {
    try {
      const res = await fetch('data/seed-courts.json');
      courtsData = await res.json();
      populateMap(courtsData);
      filterCourts();
    } catch (err2) {
      elements.loading.textContent = 'Could not load court data.';
      elements.loading.classList.remove('hidden');
    }
  }

  function getFilteredCourts() {
    const q = elements.searchInput.value.toLowerCase().trim();
    const state = elements.stateFilter.value;
    const cat = elements.categoryFilter.value;

    return courtsData.filter(c => {
      if (q) {
        const searchStr = `${c.name} ${c.location.city || ''} ${c.location.state || ''}`.toLowerCase();
        if (!searchStr.includes(q)) return false;
      }
      if (state && c.location.state !== state) return false;
      if (cat && c.category !== cat) return false;
      return true;
    });
  }

  function filterCourts() {
    const filtered = getFilteredCourts();
    renderCourts(filtered);
    updateMarkers(filtered);
    updateStats(filtered);
  }

  function renderCourts(courts) {
    const isList = currentView === 'list';
    elements.container.className = `courts-grid${isList ? ' list-view' : ''}`;
    elements.container.innerHTML = '';
    elements.loading.classList.add('hidden');

    if (courts.length === 0) {
      elements.noResults.classList.remove('hidden');
      return;
    }
    elements.noResults.classList.add('hidden');

    courts.forEach(c => {
      const card = document.createElement('div');
      card.className = 'court-card';
      card.innerHTML = `
        <div class="court-card-body">
          <div class="court-card-name">${c.name}</div>
          <div class="court-card-city">${[c.location.city, c.location.state].filter(Boolean).join(', ') || 'Location TBC'}</div>
          <div class="court-card-tags">
            ${c.category ? `<span class="court-tag ${c.category}">${c.category}</span>` : ''}
            ${(c.amenities || []).slice(0, 3).map(a => `<span class="court-tag amenity">${a}</span>`).join('')}
            ${c.courts ? `<span class="court-tag amenity">${c.courts} court${c.courts > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="court-card-meta">
            ${c.price_range ? `<span>${c.price_range}</span>` : ''}
            ${c.booking_links?.length ? `<span>🔗 Bookable</span>` : ''}
          </div>
        </div>
      `;
      card.addEventListener('click', () => openModal(c));
      elements.container.appendChild(card);
    });
  }

  function updateStats(courts) {
    const total = courtsData.length;
    const shown = courts.length;
    elements.stats.textContent = shown < total
      ? `Showing ${shown} of ${total} courts`
      : `${total} court${total !== 1 ? 's' : ''} listed`;
  }

  function populateMap(courts) {
    if (!map) {
      map = L.map('map-container').setView([3.8, 109.5], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

    courts.forEach(c => addMarker(c));
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  function addMarker(court) {
    const lat = court.location?.lat;
    const lng = court.location?.lng;
    if (!lat || !lng) return;

    const color = court.category === 'indoor' ? '#1d4ed8' : court.category === 'outdoor' ? '#15803d' : '#9333ea';
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,.3);">${court.category === 'indoor' ? '🏠' : '🌳'}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    marker.bindPopup(`
      <h3>${court.name}</h3>
      <p>${[court.location.city, court.location.state].filter(Boolean).join(', ')}</p>
      ${court.courts ? `<p>${court.courts} court${court.courts > 1 ? 's' : ''}</p>` : ''}
    `);
    marker.on('click', () => openModal(court));
    markers.push(marker);
  }

  function updateMarkers(courts) {
    const ids = new Set(courts.map(c => c.id || c.slug));
    markers.forEach(m => {
      const courtId = m._courtId;
      if (m._map) {
        if (courtId && !ids.has(courtId)) {
          map.removeLayer(m);
        }
      }
    });
  }

  function openModal(court) {
    const body = elements.modalBody;
    const loc = [court.location.city, court.location.state].filter(Boolean).join(', ') || 'Location TBC';

    body.innerHTML = `
      <h2>${court.name}</h2>
      <div class="city">${loc}</div>
      ${court.description ? `<div class="desc">${court.description}</div>` : ''}
      <div class="modal-details">
        ${court.category ? `<div class="modal-detail"><div class="modal-detail-label">Type</div><div class="modal-detail-value">${court.category}</div></div>` : ''}
        ${court.courts ? `<div class="modal-detail"><div class="modal-detail-label">Courts</div><div class="modal-detail-value">${court.courts}</div></div>` : ''}
        ${court.price_range ? `<div class="modal-detail"><div class="modal-detail-label">Price</div><div class="modal-detail-value">${court.price_range}</div></div>` : ''}
        ${court.location.address ? `<div class="modal-detail"><div class="modal-detail-label">Address</div><div class="modal-detail-value">${court.location.address}</div></div>` : ''}
        ${court.contact?.phone ? `<div class="modal-detail"><div class="modal-detail-label">Phone</div><div class="modal-detail-value">${court.contact.phone}</div></div>` : ''}
      </div>
      ${court.amenities?.length ? `<div class="court-card-tags">${court.amenities.map(a => `<span class="court-tag amenity">${a}</span>`).join('')}</div>` : ''}
      <div class="modal-actions">
        ${court.contact?.website ? `<a href="${court.contact.website}" target="_blank">Visit Website</a>` : ''}
        ${court.source_url ? `<a href="${court.source_url}" target="_blank">View on ${court.source}</a>` : ''}
        ${court.booking_links?.length ? court.booking_links.map(b => `<a href="${b.url}" target="_blank">Book via ${b.platform}</a>`).join('') : ''}
        ${(court.location?.lat && court.location?.lng) ? `<a href="https://www.google.com/maps?q=${court.location.lat},${court.location.lng}" target="_blank">Open in Maps</a>` : ''}
      </div>
    `;

    elements.modal.classList.remove('hidden');
  }

  function closeModal() {
    elements.modal.classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
