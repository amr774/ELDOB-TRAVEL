# Hotel catalogue and simplified stay requests — 2026-10-22

## Implemented
- `/hotels`: owner-managed hotel cards, city filter, photos, stars, optional starting nightly rate, and luxury apartment contact option at the end.
- `/hotels/:id`: hotel details and a short request form for arrival/departure, guests, rooms and phone. Children, meals and notes are optional expandable fields.
- Guest drafts survive sign-in for 30 minutes in the current tab; hotel-specific return destinations are allowlisted.
- `/owner#hotels`: add/edit hotels using HTTPS photo links, show/hide listings, set descriptions and optional starting prices.
- Public hotel reads and OWNER-only mutations/management listing. No hotel deletion endpoint: hiding preserves linked requests.
- Selected hotels feed the existing HOTEL service request, employee follow-up, customer tracking, quotation and payment workflows. The backend verifies the hotel is visible and snapshots its authoritative name/city. Starting prices do not create automatic financial charges.
- Apartment contact opens an inquiry with its purpose prefilled.

## Database
Applied only `20261022000100_hotel_catalog` to the configured loopback `eldob_travel` database. Adds Hotel and a nullable ServiceRequest.hotelId foreign key. Existing record counts verified unchanged. No destructive migration or external deployment. The guarded local migration helper refuses other pending migrations and production/nonlocal targets.

## Validation
- Backend: 38 unit tests, 10 integration/e2e tests passed.
- Frontend: 37 tests passed, including selected-hotel submission, guest draft storage, reversed dates, catalogue city filtering and apartment contact.
- Integration covers OWNER-only management, employee reply, public hiding, rejection of hidden hotel requests, preservation of request history and authoritative hotel snapshots. Temporary test data removed by the test cleanup.
- Backend/frontend lint and builds passed; Prisma schema validated.
- Live frontend, hotel API and car API returned HTTP 200; all 18 cars remain. Hotel catalogue contains no demo hotel records.
- Browser visual inspection was unavailable under the existing browser permission restriction; no visual-QA claim is made.

## Owner setup remaining
Add real hotel names, cities, photo links, descriptions and optional starting rates at `/owner#hotels`. Hotel inventory and final prices are confirmed by the office; this phase does not connect an external hotel inventory provider.
