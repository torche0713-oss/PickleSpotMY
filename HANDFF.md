# PickleSpotMY — Handoff Document

## Project Origin
Pivoted from **PickleSpotPH** (Philippines pickleball court directory) after discovering the Malaysia ecosystem is significantly more mature with accessible booking platforms that expose real-time availability data.

## Malaysia Pickleball Ecosystem (Platforms Investigated)

### Key Platforms

| Platform | URL | Type | Scale | Accessibility |
|---|---|---|---|---|
| **OpenCourt365** | opencourt365.com.my | Meta-search engine | Aggregates 5+ platforms | **Server-rendered, scrapable** — real-time availability across sites |
| **pickleballcourts.my** | pickleballcourts.my | Static directory | 195+ courts, 13 states | **Static HTML, easily scraped** |
| **PicklePadel.my** | picklepadel.my | Directory + booking | 397 venues, 14 states | **Server-rendered** |
| **pickle-ball.com.my** | pickle-ball.com.my | Directory | Claims 150+ venues | SPA (client-rendered, harder) |
| **dink.my** | dink.my | Full booking platform | 50+ venues, 5K+ players | SPA (API-backed, harder) |
| **CourtOS** | courtos.momentist.com.my | Booking platform | Small (1-2 venues public) | **Server-rendered with real-time availability in HTML** |
| **pickleballmalaysia.my** | pickleballmalaysia.my | Wix directory | 6 venues listed | **Wix static, scrapable** |
| **Courtsite** | courtsite.my | Multi-sport booking | Badminton, futsal, pickleball | Unknown — likely SPA |
| **SportsWePlay** | sportsweplay.com.my | Tournament/booking | Multi-sport | Unknown |
| **PlayByPoint** | (via OpenCourt365) | Booking platform | Used by PLAYA Racquet Club | Mobile app based |
| **AFA Sports** | (via OpenCourt365) | Booking platform | Malaysian market | Unknown |
| **Metahub** | (via OpenCourt365) | Booking platform | Malaysian market | Unknown |
| **SportsSync** | sportssync.asia | Tournament platform | APP KL Open 2026 | Server-rendered, scrapable |
| **PLAYA Racquet Club** | playaracquetclub.com | Venue (15 courts) | Subang Jaya, Selangor | Uses PlayByPoint for booking |

### The Aggregator Opportunity
**OpenCourt365** is already doing what we envisioned — it aggregates real-time court availability from Courtsite, AFA Sports, PlayByPoint, Metahub, and SportsWePlay into one search. They have a mobile app (iOS + Android). This validates the market need but means we'd need a differentiator.

### What Makes Malaysia Different from PH
- PH platforms (Courtogo, Onda Fit, Sport360) are all **SPAs with JWT auth + Cloudflare** — unscrapable, ToS-banned
- Malaysia platforms: **CourtOS renders real-time slots in server HTML**, directories are **static HTML**, and **OpenCourt365 proves aggregation works**
- Much larger player base: 5,000+ on dink.my alone
- Proper tournament circuit: APP KL Open 2026 with RM211K prize pool

## Approach Options

### Option A: Court Directory (like PickleSpotPH)
- Scrape pickleballcourts.my (195+ courts), PicklePadel.my (397 venues), pickleballmalaysia.my (6 venues)
- Cross-reference and deduplicate
- Build a searchable directory with maps
- Add booking links where available
- Lower effort, proven model

### Option B: Availability Aggregator
- Target platforms that render server-side (CourtOS, OpenCourt365 itself?)
- Build a real-time availability search
- Higher effort, but OpenCourt365 already exists as competition
- Would need a differentiator (PH integration? Better UX? Price comparison?)

### Option C: Hybrid
- Directory as foundation (quick to build)
- Add availability aggregation per-platform as feasible
- Could focus on venues/platforms OpenCourt365 *doesn't* cover

## PH Project Technical Stack (for reference)
- **Frontend**: Vanilla JS, HTML, CSS (CourtQ Pro light theme)
- **Backend**: Node.js via Vercel serverless functions (api/*.js)
- **Database**: Firestore (Google Firebase)
- **Email**: Brevo (free tier, 300 emails/day)
- **Auth**: Firebase Auth
- **Hosting**: Vercel (picklespotph.site)
- **Scraping**: Node.js scripts with `node-fetch`, `jsdom`, `fast-xml-parser`
- **Directory**: `js/booking-links.js` maps court IDs to booking URLs

## Suggested Starting Point for New Chat
1. Explore **pickleballcourts.my** directory structure and scrape its 195+ courts
2. Also scrape **PicklePadel.my** (397 venues)
3. Deduplicate and store in Firestore (or similar)
4. Build a searchable directory with map view
5. Add booking links to CourtOS, dink.my, etc. where available
6. Optionally add availability aggregation if feasible

## Key URLs for Reference
- OpenCourt365: https://opencourt365.com.my/
- pickleballcourts.my: https://www.pickleballcourts.my/
- PicklePadel.my: https://picklepadel.my/en
- pickle-ball.com.my: https://www.pickle-ball.com.my/
- dink.my: https://dink.my/
- CourtOS: https://courtos.momentist.com.my/
- pickleballmalaysia.my: https://pickleballmalaysia.my/
- Courtsite: https://www.courtsite.my/
- SportsSync: https://www.sportssync.asia/
- PLAYA Racquet Club: https://playaracquetclub.com/
- Pickleball MY Directory: https://www.pickleballcourts.my/directory?state=kuala-lumpur

## Previous PH Project Patterns to Reuse
- Firestore schema: `courts/{id}` with fields (name, location, region, lat, lng, image, notes/bookingInfo)
- Dashboard with import tool (batch-import.html pattern)
- Booking button integration (getBookingButtonHtml pattern from booking-links.js)
- Brevo campaign API pattern (aggregate subscribers + users, deduplicated)
