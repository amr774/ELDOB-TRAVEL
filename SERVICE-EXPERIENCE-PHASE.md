# Service experience phase — 2026-10-21

Implemented separate `/requests/airport`, `/requests/trip`, and `/requests/hotel` experiences, linked from the home page, services catalogue, and service switcher.

- Airport transfers: 14 Egyptian airports with English/Arabic names and IATA codes, arrival/departure mapping, flight number and terminal (optional), flight date/time, requested pickup, luggage, vehicle preference, and optional reverse-route return quotation.
- Private trips: business/group purpose, exact addresses, guests, luggage, vehicle preferences and return quotation.
- Hotels: suggested Egyptian cities with custom city entry, stay dates, rooms, total guests, child counts/ages, meal preference and optional per-room nightly budget in EGP.
- All service requests: phone contact, date validation, review/edit before explicit submission, pending-review confirmation with reference and account link.
- Guests can explicitly save a draft in this browser tab for 30 minutes and sign in/register before returning. Drafts are cleared on success or expired restoration. No passwords or auth tokens are saved by the draft feature.

Backend compatibility: no schema, migration, authentication endpoint, role, pricing or existing database record changes. Airport transfers remain TRIP requests. Additional service fields are serialized into bilingual labelled notes under the existing 3000-character limit. These are visible in customer and employee views, retaining line breaks, and searchable through the existing operations search. Return journeys request a combined quotation; they do not create a separately scheduled second booking.

The list is a curated airport selector, not a guarantee of current flights or service coverage. Flight times are manually supplied in Egypt local time. No live flight monitoring, inventory or instant hotel confirmation is claimed.

Airport name/code reference checked 2026-10-21: https://zasair.com/locations.php
Cairo passenger reference: https://www.cairo-airport.com/en-us/

Validation: frontend production build and lint passed; 25 frontend tests passed, including 10 new helper/UI tests. API calls in UI tests are mocked, so they create no customer records. Visual browser inspection remains unavailable under the saved browser permission restriction. No deployment performed.
