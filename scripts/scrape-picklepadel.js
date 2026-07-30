const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'data', 'scraped-picklepadel.json');
const SITEMAP_URL = 'https://picklepadel.my/sitemap.xml';
const BASE = 'https://picklepadel.my';
const DELAY_MS = 500;

async function getVenueIds() {
  const { data: xml } = await axios.get(SITEMAP_URL, {
    headers: { 'User-Agent': 'PickleSpotMY/1.0' },
    timeout: 15000,
  });
  const regex = /<loc>[^<]*\/en\/venues\/([^<]+)<\/loc>/g;
  const ids = new Set();
  let match;
  while ((match = regex.exec(xml)) !== null) {
    ids.add(match[1].replace(/\/$/, ''));
  }
  return [...ids];
}

function parseVenuePage(html, id) {
  const $ = cheerio.load(html);
  const result = { id, url: `${BASE}/en/venues/${id}`, source: 'picklepadel.my' };

  // Try to extract JSON-LD SportsActivityLocation
  let jsonld = null;
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'SportsActivityLocation') {
        jsonld = data;
      }
    } catch (e) {}
  });

  if (jsonld) {
    result.name = jsonld.name || '';
    result.description = jsonld.description || '';
    if (jsonld.address) {
      result.streetAddress = jsonld.address.streetAddress || '';
      result.city = jsonld.address.addressLocality || '';
      result.state = jsonld.address.addressRegion || '';
    }
    if (jsonld.geo) {
      result.latitude = jsonld.geo.latitude;
      result.longitude = jsonld.geo.longitude;
    }
    if (jsonld.amenityFeature) {
      result.amenities = jsonld.amenityFeature
        .filter(a => a.value === true || a.value === 'true')
        .map(a => a.name);
    }
    if (jsonld.openingHoursSpecification) {
      result.hours = jsonld.openingHoursSpecification.map(h => ({
        day: h.dayOfWeek?.split('/').pop() || '',
        opens: h.opens,
        closes: h.closes,
      }));
    }
    result.image = jsonld.image || '';
    result.telephone = jsonld.telephone || '';
  }

  // Fallback: get name from meta/h1
  if (!result.name) {
    result.name = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content')?.split('|')[0]?.trim() || '';
  }
  if (!result.description) {
    result.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
  }

  // Determine sport type from description/text
  const bodyText = $('body').text().toLowerCase();
  result.sport = bodyText.includes('padel') && !bodyText.includes('pickleball') ? 'padel' : 'pickleball';

  return result;
}

async function scrape() {
  console.log('Fetching venue IDs from sitemap...');
  const ids = await getVenueIds();
  console.log(`Found ${ids.length} venues`);

  const venues = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    process.stdout.write(`\r${i + 1}/${ids.length}: ${id.substring(0, 12)}...`);
    try {
      const { data: html } = await axios.get(`${BASE}/en/venues/${id}`, {
        headers: { 'User-Agent': 'PickleSpotMY/1.0', 'Accept': 'text/html' },
        timeout: 15000,
      });
      const venue = parseVenuePage(html, id);
      if (venue.name) {
        venues.push(venue);
      }
    } catch (err) {
      // skip
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nSaving ${venues.length} venues...`);
  fs.writeFileSync(OUTPUT, JSON.stringify(venues, null, 2));
  console.log(`Saved to ${OUTPUT}`);
}

scrape().catch(console.error);
