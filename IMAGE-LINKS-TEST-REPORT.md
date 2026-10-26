# Image links and project verification — 2026-10-21

## Implemented
- Owner vehicle editor accepts public direct HTTPS image links instead of file upload.
- Gallery previews, main-photo selection, duplicate validation, 12-photo limit, removal and error messages.
- A pasted link is included when saving even if Add image link was not clicked.
- Existing /uploads/ image references are preserved; upload API and stored files remain intact.
- Invalid or credential-bearing image URLs are rejected by the UI. Remote images load directly in the browser; the backend does not fetch them.

## Bugs fixed
- Vehicle changes now invalidate owner statistics, public listings, individual car details and favorites caches.
- Clearing fleet filters also clears the visible form fields.
- Broken image links have a readable fallback and recover when the URL changes.
- A selected gallery photo no longer carries over when navigating to another vehicle.

## Verification
- Backend: 19 suites, 35 unit tests passed.
- Backend PostgreSQL/API integration: 2 suites, 9 tests passed, including image link persistence and public retrieval.
- Frontend: 11 files, 33 tests passed, including link validation, gallery saving/promoting/limits, broken images and filter clearing.
- Both builds and both linters passed. Prisma schema validation passed.
- Local PostgreSQL healthy; existing OWNER account still has OWNER role.
- Public pages and API health respond 200; unauthenticated owner dashboard API responds 401.

Integration tests used isolated QA records and removed their own records. Existing business data was not edited. Added a local/non-production database guard to workflow tests. No migrations or deployment.

Visual browser QA remains blocked by the existing saved browser permission. Automated tests do not prove every possible scenario is bug-free. Hosting providers can block direct image links or remove an image; gallery previews and customer fallbacks handle failed loads.
