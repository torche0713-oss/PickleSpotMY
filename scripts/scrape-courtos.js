const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const COURTOS_URL = 'https://courtos.momentist.com.my/';
const OUTPUT = path.join(__dirname, '..', 'data', 'scraped-courtos.json');

async function scrape() {
  console.log(`Fetching ${COURTOS_URL}...`);
  const { data } = await axios.get(COURTOS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PickleSpotBot/1.0)' }
  });

  const $ = cheerio.load(data);
  const venues = [];

  $('[class*="venue"], [class*="court"], [class*="club"], [class*="card"], [class*="item"]').each((i, el) => {
    const $el = $(el);
    const name = $el.find('[class*="name"], [class*="title"], h2, h3, h4').first().text()?.trim();
    if (name && name.length > 2) {
      venues.push({
        name,
        description: $el.find('[class*="desc"], p').first().text()?.trim() || '',
        location: $el.find('[class*="location"], [class*="address"]').first().text()?.trim() || '',
        url: COURTOS_URL
      });
    }
  });

  const title = $('title').text()?.trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  const result = {
    site: { title, description: metaDesc, url: COURTOS_URL },
    venues
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(`Saved ${venues.length} venues to ${OUTPUT}`);
}

scrape().catch(console.error);
