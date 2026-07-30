const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.pickleballcourts.my';
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const OUTPUT = path.join(__dirname, '..', 'data', 'scraped-pickleballcourts.json');

const STATES = [
  'johor', 'kedah', 'kelantan', 'kuala-lumpur', 'labuan',
  'melaka', 'negeri-sembilan', 'pahang', 'penang', 'perak',
  'perlis', 'putrajaya', 'sabah', 'sarawak', 'selangor', 'terengganu'
];

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allCourts = [];

  for (const state of STATES) {
    console.log(`Fetching ${state}...`);
    try {
      await page.goto(`${BASE_URL}/directory#${state}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(3000);

      const courts = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid="court-card"], .court-card, .location-item, [class*="court"], [class*="location"]');
        if (items.length === 0) {
          const links = document.querySelectorAll('a[href*="/location/"]');
          return Array.from(links).map(a => ({
            name: a.textContent.trim(),
            slug: a.getAttribute('href')?.split('/location/')[1]?.split('/')[0],
            url: a.href
          }));
        }
        return Array.from(items).map(item => ({
          name: item.querySelector('[class*="name"], [class*="title"], h2, h3')?.textContent?.trim() || '',
          location: item.querySelector('[class*="location"], [class*="address"], [class*="city"]')?.textContent?.trim() || '',
          url: item.querySelector('a')?.href || ''
        }));
      });

      console.log(`  Found ${courts.length} courts in ${state}`);
      allCourts.push(...courts.map(c => ({ ...c, state })));
    } catch (err) {
      console.error(`  Error fetching ${state}: ${err.message}`);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(allCourts, null, 2));
  console.log(`\nSaved ${allCourts.length} courts to ${OUTPUT}`);
  await browser.close();
}

scrape().catch(console.error);
