(function () {
  'use strict';

  let map = null;
  let mapMarkers = [];
  let searchResults = null;
  let allLocations = [];
  let allCourtsData = [];

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
    resultsList: document.getElementById('results-list'),
    resultsCount: document.getElementById('resultsCount'),
    loading: document.getElementById('loading'),
    noResults: document.getElementById('no-results'),
    initialMsg: document.getElementById('initial-msg'),
    map: document.getElementById('map'),
    listView: document.getElementById('listView'),
    courtsGrid: document.getElementById('courtsGrid'),
    directorySection: document.getElementById('directorySection'),
    directoryList: document.getElementById('directory-list'),
    directoryCount: document.getElementById('directory-count'),
    appContainer: document.getElementById('appContainer'),
    hamburger: document.getElementById('hamburger'),
    mobileMenu: document.getElementById('mobileMenu'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    locateMe: document.getElementById('locateMe'),
    toggleSidebar: document.getElementById('toggleSidebar'),
    totalCourts: document.getElementById('totalCourts'),
    totalCities: document.getElementById('totalCities'),
    totalVenues: document.getElementById('totalVenues'),
    addCourtBtn: document.getElementById('addCourtBtn'),
    heroAddBtn: document.getElementById('heroAddBtn'),
    mobileAddCourt: document.getElementById('mobileAddCourt'),
    addCourtModal: document.getElementById('addCourtModal'),
    addModalClose: document.getElementById('addModalClose'),
    cancelAdd: document.getElementById('cancelAdd'),
    addCourtForm: document.getElementById('addCourtForm'),
    courtModal: document.getElementById('courtModal'),
    modalClose: document.getElementById('modalClose'),
    modalHeader: document.getElementById('modalHeader'),
    modalBody: document.getElementById('modalBody'),
    modalFooter: document.getElementById('modalFooter'),
    listSearchInput: document.getElementById('listSearchInput'),
    listVenueCount: document.getElementById('listVenueCount'),
    toast: document.getElementById('toast'),
  };

  function init() {
    const today = new Date().toISOString().split('T')[0];
    if (elements.dateInput) elements.dateInput.value = today;
    if (elements.form) elements.form.addEventListener('submit', onSearch);
    if (elements.stateInput) elements.stateInput.addEventListener('change', onStateChange);
    if (elements.cityInput) elements.cityInput.addEventListener('change', onCityChange);

    setupNav();
    setupModals();
    setupSidebar();
    setupMapControls();

    loadLocations();
    loadDirectory();
    loadAllVenues();
  }

  function setupNav() {
    if (elements.hamburger) {
      elements.hamburger.addEventListener('click', function () {
        elements.mobileMenu.classList.toggle('open');
      });
    }
    document.querySelectorAll('[data-view]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var view = el.dataset.view;
        showView(view);
        elements.mobileMenu.classList.remove('open');
      });
    });
  }

  function showView(view) {
    var isMap = view === 'map';
    var isList = view === 'list';
    var isDir = view === 'directory';

    elements.appContainer.style.display = isMap ? 'flex' : 'none';
    elements.listView.style.display = isList ? 'block' : 'none';
    elements.directorySection.style.display = isDir ? 'block' : 'none';

    if (isMap && map) setTimeout(function () { map.invalidateSize(); }, 100);

    document.querySelectorAll('.nav-link[data-view]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.view === view);
    });
  }
  window.showView = showView;

  function setupModals() {
    function openAddModal() {
      elements.addCourtModal.style.display = 'flex';
    }
    function closeAddModal() {
      elements.addCourtModal.style.display = 'none';
    }
    function openCourtModal() { /* populated dynamically */ }

    if (elements.addCourtBtn) elements.addCourtBtn.addEventListener('click', openAddModal);
    if (elements.heroAddBtn) elements.heroAddBtn.addEventListener('click', openAddModal);
    if (elements.mobileAddCourt) elements.mobileAddCourt.addEventListener('click', function (e) {
      e.preventDefault();
      openAddModal();
      elements.mobileMenu.classList.remove('open');
    });
    if (elements.addModalClose) elements.addModalClose.addEventListener('click', closeAddModal);
    if (elements.cancelAdd) elements.cancelAdd.addEventListener('click', closeAddModal);
    if (elements.modalClose) elements.modalClose.addEventListener('click', function () {
      elements.courtModal.style.display = 'none';
    });
    if (elements.addCourtForm) {
      elements.addCourtForm.addEventListener('submit', function (e) {
        e.preventDefault();
        showToast('Venue submitted! We\'ll review it shortly.');
        closeAddModal();
        elements.addCourtForm.reset();
      });
    }
    [elements.addCourtModal, elements.courtModal].forEach(function (modal) {
      if (modal) modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.style.display = 'none';
      });
    });
  }

  function setupSidebar() {
    if (elements.sidebarToggle) {
      elements.sidebarToggle.addEventListener('click', function () {
        elements.sidebar.classList.toggle('collapsed');
        if (map) setTimeout(function () { map.invalidateSize(); }, 300);
      });
    }
  }

  function setupMapControls() {
    if (elements.toggleSidebar) {
      elements.toggleSidebar.addEventListener('click', function () {
        elements.sidebar.classList.toggle('collapsed');
        if (map) setTimeout(function () { map.invalidateSize(); }, 300);
      });
    }
    if (elements.locateMe) {
      elements.locateMe.addEventListener('click', function () {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function (pos) {
            if (map) map.setView([pos.coords.latitude, pos.coords.longitude], 13);
          }, function () {
            showToast('Unable to find your location.');
          });
        } else {
          showToast('Geolocation not supported.');
        }
      });
    }
  }

  async function loadLocations() {
    try {
      var res = await fetch('/api/locations');
      allLocations = await res.json();
      populateStates();
    } catch (e) {
      console.error('Failed to load locations', e);
    }
  }

  function populateStates() {
    if (!elements.stateInput) return;
    var seen = {};
    var stateOpts = [{ value: '', label: 'All States' }];
    allLocations.forEach(function (l) {
      if (!seen[l.state]) {
        seen[l.state] = true;
        stateOpts.push({ value: l.state, label: l.state });
      }
    });
    stateOpts.sort(function (a, b) { return a.label.localeCompare(b.label); });
    if (stateOpts.length > 1 && stateOpts[0].value === '') {
      var all = stateOpts.shift();
      stateOpts.unshift(all);
    }
    elements.stateInput.innerHTML = stateOpts.map(function (s) {
      return '<option value="' + s.value + '">' + s.label + '</option>';
    }).join('');
    populateCities();
  }

  function populateCities() {
    if (!elements.cityInput) return;
    var state = elements.stateInput.value;
    var cities = allLocations;
    if (state) cities = cities.filter(function (l) { return l.state === state; });
    cities = cities.sort(function (a, b) { return a.sortOrder - b.sortOrder; });

    var html = '<option value="">Select a city...</option>';
    cities.forEach(function (l) {
      html += '<option value="' + l.city + '" data-lat="' + l.latitude + '" data-lng="' + l.longitude + '" data-state="' + l.state + '">' + l.city + (!state ? ', ' + l.state : '') + '</option>';
    });
    elements.cityInput.innerHTML = html;
  }

  function onStateChange() {
    populateCities();
  }

  function onCityChange() {
    if (!elements.cityInput) return;
    var opt = elements.cityInput.options[elements.cityInput.selectedIndex];
    if (opt && opt.value) {
      elements.latInput.value = opt.dataset.lat;
      elements.lngInput.value = opt.dataset.lng;
    }
  }

  async function onSearch(e) {
    e.preventDefault();
    var lat = parseFloat(elements.latInput.value) || 3.139;
    var lng = parseFloat(elements.lngInput.value) || 101.686;
    var date = elements.dateInput.value;
    var startTime = elements.startTime.value;
    var endTime = elements.endTime.value;

    if (!date) {
      if (elements.searchStatus) elements.searchStatus.textContent = 'Please select a date.';
      return;
    }

    setLoading(true, 'Searching for venues...');
    if (elements.searchStatus) elements.searchStatus.textContent = 'Searching venues...';

    try {
      var params = new URLSearchParams({ lat: lat, lng: lng });
      var res = await fetch('/api/search?' + params.toString());
      var data = await res.json();

      if (!data.venues || data.venues.length === 0) {
        if (elements.noResults) elements.noResults.classList.remove('hidden');
        if (elements.searchStatus) elements.searchStatus.textContent = 'No pickleball venues found in this area.';
        setLoading(false);
        return;
      }

      searchResults = data;
      displayVenues(data.venues, date, startTime, endTime);
      renderMap(data.venues);
      if (elements.searchStatus) elements.searchStatus.textContent = data.venues.length + ' venue(s) found. Checking availability...';

      await checkAvailabilityForVenues(data.venues, date, startTime, endTime);
    } catch (err) {
      if (elements.searchStatus) elements.searchStatus.textContent = 'Search failed. Please try again.';
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function setLoading(v, msg) {
    if (elements.loading) elements.loading.classList.toggle('hidden', !v);
    if (elements.initialMsg) elements.initialMsg.classList.add('hidden');
    if (elements.noResults) elements.noResults.classList.add('hidden');
    if (msg && elements.loading) elements.loading.querySelector('p').textContent = msg;
  }

  function displayVenues(venues, date, startTime, endTime) {
    if (elements.initialMsg) elements.initialMsg.classList.add('hidden');
    if (elements.resultsCount) elements.resultsCount.textContent = venues.length;

    var list = elements.resultsList;
    if (!list) return;

    list.innerHTML = venues.map(function (v) {
      return '<div class="venue-group" data-venue-id="' + v.id + '">' +
        '<div class="venue-header" onclick="this.closest(\'.venue-group\').classList.toggle(\'expanded\')">' +
          '<div>' +
            '<h3>' + escapeHtml(v.name) + '</h3>' +
            '<div class="venue-meta">' + (v.city || '') + ' ' + (v.state || '') + ' &middot; ' + (v.totalCourts || '?') + ' court' + ((v.totalCourts || 0) > 1 ? 's' : '') + ' &middot; ' + (v.sourceType || 'external') + '</div>' +
          '</div>' +
          '<div>' +
            '<span class="venue-status-badge">Checking...</span>' +
          '</div>' +
        '</div>' +
        '<div class="venue-courts" id="courts-' + v.id + '">' +
          '<div style="padding:16px;text-align:center;color:#64748b;font-size:13px;">Loading availability...</div>' +
        '</div>' +
        '<div class="venue-gear">' +
          '<div class="gear-toggle" onclick="event.stopPropagation();this.closest(\'.venue-gear\').classList.toggle(\'open\')">' +
            '<span><i class="fas fa-shopping-cart"></i> Pickleball Gear</span>' +
            '<span class="gear-arrow">&#9656;</span>' +
          '</div>' +
          '<div class="gear-content">' +
            '<a href="https://shopee.com.my/search?keyword=pickleball+paddle" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Paddles</a>' +
            '<a href="https://shopee.com.my/search?keyword=pickleball+balls+outdoor" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Balls</a>' +
            '<a href="https://shopee.com.my/search?keyword=portable+pickleball+net" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Nets</a>' +
            '<a href="https://shopee.com.my/search?keyword=pickleball+shoes+court" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Shoes</a>' +
            '<a href="https://shopee.com.my/search?keyword=pickleball+bag" target="_blank" rel="noopener" class="gear-link" onclick="event.stopPropagation()">Bags</a>' +
            '<span class="gear-disclaimer">We may earn a commission from purchases.</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function checkAvailabilityForVenues(venues, date, startTime, endTime) {
    for (var i = 0; i < venues.length; i++) {
      var venue = venues[i];
      var courtIds = (venue.courts || []).map(function (c) { return c.id; }).filter(Boolean);
      if (courtIds.length === 0) {
        updateVenueStatus(venue.id, 'No bookable courts', '');
        continue;
      }

      updateVenueStatus(venue.id, 'Checking ' + courtIds.length + ' courts...', '');

      try {
        var lat = parseFloat(elements.latInput.value) || 3.139;
        var lng = parseFloat(elements.lngInput.value) || 101.686;
        var params = new URLSearchParams({
          courtIds: courtIds.join(','),
          date: date,
          startTime: startTime,
          endTime: endTime,
          lat: lat,
          lng: lng
        });
        var res = await fetch('/api/availability?' + params.toString());
        var data = await res.json();
        renderVenueAvailability(venue.id, data.sessions || [], venue);
      } catch (err) {
        updateVenueStatus(venue.id, 'Unavailable', '');
      }
    }
  }

  function updateVenueStatus(venueId, text, countText) {
    var badge = document.querySelector('[data-venue-id="' + venueId + '"] .venue-status-badge');
    if (badge) badge.textContent = text;
  }

  function renderVenueAvailability(venueId, sessions, venue) {
    var container = document.getElementById('courts-' + venueId);
    if (!container) return;

    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;font-size:13px;">No available time slots for this date.</div>';
      updateVenueStatus(venueId, 'No slots', '');
      return;
    }

    var url = venue.bookingUrl || '';
    var availableSessions = sessions.filter(function (s) { return s.isAvailable !== false; });

    container.innerHTML = availableSessions.slice(0, 30).map(function (s) {
      return '<div class="session-card">' +
        '<div>' +
          '<div class="session-time">' + (s.startTime || '') + ' &mdash; ' + (s.endTime || '') + '</div>' +
          '<div style="font-size:12px;color:#64748b;">' + (s.courtName || venue.name || '') + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          (s.price ? '<span class="session-price">RM ' + s.price + '</span>' : '') +
          (url ? '<a href="' + url + '" target="_blank" class="session-book">Book</a>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    if (availableSessions.length > 30) {
      container.innerHTML += '<p style="padding:8px;text-align:center;font-size:12px;color:#64748b;">+' + (availableSessions.length - 30) + ' more slots</p>';
    }

    updateVenueStatus(venueId, availableSessions.length + ' slot' + (availableSessions.length > 1 ? 's' : ''), '');
  }

  function renderMap(venues) {
    if (!map) {
      if (!elements.map) return;
      map = L.map('map').setView([3.8, 109.5], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

    mapMarkers.forEach(function (m) { map.removeLayer(m); });
    mapMarkers = [];

    var bounds = [];
    venues.forEach(function (v) {
      var lat = parseFloat(v.latitude);
      var lng = parseFloat(v.longitude);
      if (!lat || !lng) return;

      var icon = L.divIcon({
        className: 'custom-marker',
        iconSize: [14, 14]
      });
      var marker = L.marker([lat, lng], { icon: icon }).addTo(map);
      marker.bindPopup(
        '<div class="popup-header"><div class="popup-name">' + escapeHtml(v.name) + '</div><div class="popup-location">' + (v.city || '') + ' ' + (v.state || '') + '</div></div>' +
        '<div class="popup-body">' +
          '<div class="popup-detail"><i class="fas fa-map-pin"></i> ' + (v.totalCourts || '?') + ' court(s)</div>' +
          '<div class="popup-detail"><i class="fas fa-tag"></i> ' + (v.sourceType || 'external') + '</div>' +
          (v.bookingUrl ? '<a href="' + v.bookingUrl + '" target="_blank" class="popup-btn"><i class="fas fa-calendar-check"></i> Book Now</a>' : '') +
        '</div>'
      );
      mapMarkers.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
    updateStats(venues);
  }

  function updateStats(venues) {
    var venueSet = {};
    var citySet = {};
    var totalCourts = 0;
    venues.forEach(function (v) {
      venueSet[v.id || v.name] = true;
      if (v.city) citySet[v.city] = true;
      totalCourts += parseInt(v.totalCourts) || 0;
    });
    if (elements.totalVenues) elements.totalVenues.textContent = Object.keys(venueSet).length;
    if (elements.totalCities) elements.totalCities.textContent = Object.keys(citySet).length;
    if (elements.totalCourts) elements.totalCourts.textContent = totalCourts || Object.keys(venueSet).length;
  }

  async function loadDirectory() {
    try {
      var res = await fetch('/api/directory?limit=500');
      var data = await res.json();
      var container = elements.directoryList;
      var countEl = elements.directoryCount;
      if (!container) return;

      countEl.textContent = data.total + ' venues';

      var sortedStates = (data.states || []).sort(function (a, b) { return b.count - a.count; });

      container.innerHTML = sortedStates.map(function (s) {
        return '<div class="dir-state-group">' +
          '<div class="dir-state-header" onclick="this.closest(\'.dir-state-group\').classList.toggle(\'dir-open\')">' +
            '<span class="dir-state-name">' + escapeHtml(s.name) + '</span>' +
            '<span class="dir-state-count">' + s.count + ' venues</span>' +
            '<span class="dir-arrow">&#9656;</span>' +
          '</div>' +
          '<div class="dir-state-venues" id="dir-' + s.name.replace(/\s+/g, '-') + '">' +
            '<div style="padding:12px;text-align:center;color:#64748b;font-size:13px;">Loading...</div>' +
          '</div>' +
        '</div>';
      }).join('');

      data.states.forEach(function (s) {
        fetch('/api/directory?state=' + encodeURIComponent(s.name) + '&limit=200')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var el = document.getElementById('dir-' + s.name.replace(/\s+/g, '-'));
            if (!el) return;
            el.innerHTML = d.venues.map(function (v) {
              return '<a href="https://picklepadel.my/en/venues/' + (v.slug || '') + '" target="_blank" class="dir-venue-item" rel="noopener">' +
                '<span class="dir-venue-name">' + escapeHtml(v.name) + '</span>' +
                '<span class="dir-venue-city">' + (v.city || '') + (v.courts ? ' &middot; ' + v.courts + ' courts' : '') + '</span>' +
              '</a>';
            }).join('');
          })
          .catch(function () {});
      });
    } catch (e) {
      console.error('Failed to load directory', e);
    }
  }

  async function loadAllVenues() {
    try {
      var res = await fetch('/api/directory?limit=500');
      var data = await res.json();
      allCourtsData = [];
      var promises = (data.states || []).map(function (s) {
        return fetch('/api/directory?state=' + encodeURIComponent(s.name) + '&limit=200')
          .then(function (r) { return r.json(); })
          .then(function (d) { allCourtsData = allCourtsData.concat(d.venues || []); })
          .catch(function () {});
      });
      await Promise.all(promises);
      populateListView(allCourtsData);
    } catch (e) {
      console.error('Failed to load all venues', e);
    }
  }

  function populateListView(venues) {
    var grid = elements.courtsGrid;
    if (!grid) return;
    if (elements.listVenueCount) elements.listVenueCount.textContent = venues.length;

    grid.innerHTML = venues.map(function (v) {
      return '<div class="court-card" onclick="showView(\'map\')">' +
        '<div class="court-card-header">' +
          '<div class="court-card-name">' + escapeHtml(v.name) + '</div>' +
          '<div class="court-card-location"><i class="fas fa-map-marker-alt"></i> ' + (v.city || '') + ', ' + (v.state || '') + '</div>' +
        '</div>' +
        '<div class="court-card-body">' +
          '<div class="court-detail-row"><i class="fas fa-info-circle"></i> ' + (v.courts || '?') + ' court' + ((v.courts || 0) > 1 ? 's' : '') + '</div>' +
          (v.phone ? '<div class="court-detail-row"><i class="fas fa-phone"></i> ' + escapeHtml(v.phone) + '</div>' : '') +
          '<div class="court-card-tags"><span class="tag tag-indoor">Venue</span></div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Live search for list view
    if (elements.listSearchInput) {
      elements.listSearchInput.addEventListener('input', function () {
        var q = this.value.toLowerCase();
        var cards = grid.querySelectorAll('.court-card');
        cards.forEach(function (card) {
          var name = card.querySelector('.court-card-name');
          var loc = card.querySelector('.court-card-location');
          var text = (name ? name.textContent : '') + ' ' + (loc ? loc.textContent : '');
          card.style.display = text.toLowerCase().indexOf(q) > -1 ? '' : 'none';
        });
      });
    }
  }

  function showToast(msg) {
    var t = elements.toast;
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 3000);
  }
  window.showToast = showToast;

  document.addEventListener('DOMContentLoaded', init);
})();
