const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://picklepadel.my';
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const OUTPUT = path.join(__dirname, '..', 'data', 'scraped-picklepadel.json');

async function getVenueSlugs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(SITEMAP_URL, { waitUntil: 'networkidle', timeout: 30000 });
  const xml = await page.content();
  await browser.close();

  const slugRegex = /<loc>[^<]*\/en\/venues\/([^<]+)<\/loc>/g;
  const slugs = [];
  let match;
  while ((match = slugRegex.exec(xml)) !== null) {
    slugs.push(match[1].replace(/\/$/, ''));
  }
  return [...new Set(slugs)];
}

async function scrapeVenue(page, slug) {
  try {
    const url = `${BASE_URL}/en/venues/${slug}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const venue = await page.evaluate((slug) => {
      const title = document.querySelector('title')?.textContent || '';
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
      const ogDesc = document.querySelector('meta[property="og:description"]')?.content || '';

      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const visible = document.body.innerText;

      const extractAfter = (text, keyword) => {
        const idx = text.indexOf(keyword);
        if (idx === -1) return '';
        return text.substring(idx, idx + 200).replace(keyword, '').split('\n')[0]?.trim() || '';
      };

      const name = h1 || ogTitle || title.split('|')[0]?.trim() || slug;
      const description = ogDesc || metaDesc;

      return {
        slug,
        name,
        title,
        description,
        metaDescription: metaDesc,
        ogTitle,
        ogDescription: ogDesc,
        url: `https://picklepadel.my/en/venues/${slug}`
      };
    }, slug);

    return venue;
  } catch (err) {
    return { slug, error: err.message };
  }
}

async function scrape() {
  console.log('Fetching venue slugs from sitemap...');
  const slugs = await getVenueSlugs();
  console.log(`Found ${slugs.length} venue slugs`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const venues = [];
  for (let i = 0; i < slugs.length; i++) {
    process.stdout.write(`\rScraping ${i + 1}/${slugs.length}: ${slugs[i].substring(0, 30)}...`);
    const venue = await scrapeVenue(page, slugs[i]);
    venues.push(venue);
  }

  console.log(`\nSaving ${venues.length} venues...`);
  fs.writeFileSync(OUTPUT, JSON.stringify(venues, null, 2));
  console.log(`Saved to ${OUTPUT}`);
  await browser.close();
}

scrape().catch(console.error);
