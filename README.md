# Backloggd Atlas

Explore a Backloggd library through ratings, release years, developers, genres, and more.

## Deploy on Vercel

Import this repository with the Root Directory set to the repository root and the
Framework Preset set to **Other**. The checked-in `vercel.json` configures the build
command and output directory. Pushes to `main` trigger deployments when the Vercel
GitHub integration is enabled.

Add `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` in the Vercel project's Environment
Variables for Production (and Preview if needed), then redeploy. These credentials
are required for game metadata; they must stay server-side and out of Git.

`npm run build` generates `public/index.html` from `dist/server/page.js`.
`api/[...path].mjs` forwards API requests to the existing application in
`dist/server/index.js`. Only the generated page is published as a static asset.

Run `npm run test:vercel` to check page output and API routing locally.

Web Analytics uses Vercel's plain HTML integration, injected by the build into
`public/index.html`. This project is not Next.js; installing `@vercel/analytics`
alone does not load tracking in the browser. Enable Web Analytics in the Vercel
project, then deploy the updated build and visit the deployed site. In browser
Network tools, check that `/_vercel/insights/script.js` loads and a page-view
request is sent. Vercel serves these endpoints; they are not available locally.
If the script returns 404, confirm Analytics is enabled and redeploy.

## Library metadata

Run `npm run refresh:metadata` with server-side IGDB credentials to refresh the
bundled library, then `npm run build` and `npm run test:metadata`. The refresh
preserves library membership and ratings. Unmatched records remain explicitly
unchecked; they must never be filled with invented empty metadata and marked done.

`dist/server/metadata.js` defines the shared completeness and freshness contract.
The browser and API reject partial or obsolete cached records, and metadata is
refreshed after seven days. The default library also checks for stale or incomplete
metadata on load. Build validation rejects incomplete records marked as checked.
When changing the metadata schema, update its version and regenerate the browser
copies of the validation functions; regression tests check that they match.

If Backloggd is unavailable, metadata falls back to IGDB using the game slug.
Backloggd-only statistics remain unavailable, and the response includes a warning.
Fallback results expire after one minute so later requests can recover those statistics.
If IGDB also fails or cannot match the slug, the API returns the error message and
upstream HTTP status instead of marking the game complete.

Successful metadata uses a bounded, seven-day warm-instance cache with concurrent
request deduplication, plus a one-hour Vercel CDN cache for each requested batch.
The browser first loads IGDB metadata through `/api/metadata` in groups of up to 40
games. This route makes one IGDB query for matching slugs and consults Backloggd
only for slugs IGDB cannot match. Backloggd play counts, average times, and community
ratings arrive afterward through the existing game details route and are saved
progressively in the browser. A fresh dashboard no longer waits for every
Backloggd game page before displaying years, developers, genres, and other IGDB
fields.
The instance cache resets on cold starts; the CDN supplies caching across instances
for matching URLs. Failed or degraded responses are not CDN-cached. Workers still
use their native edge cache. Browser warnings retain the upstream failure reason.

Each four-game details group batches its uncached canonical IGDB slugs into one
expanded query. A separate bounded, seven-day IGDB cache deduplicates games across
groups and reuses metadata when Backloggd statistics need retrying. Missing games
and failed queries are not cached. IGDB requests start at least 275 ms apart and
can overlap, with at most eight requests open through response-body consumption.
A 429 pauses the shared queue using Retry-After (at least one second) and retries
once. These limits and caches are per warm instance; multiple instances sharing
credentials still need a distributed limiter for a guaranteed global quota.
Backloggd's separate throttle still applies when fetching uncached game pages.

Profile pages and favourites are cached for five minutes on Vercel's CDN and in
warm instances; community results use a one-hour CDN and one-day instance cache.
All Backloggd consumers share a bounded five-minute HTML cache and in-flight
requests. Game details and community averages also share a compact, day-long parsed
game-page cache, avoiding a second page fetch for the same game. Each instance
spaces upstream request starts by 750 ms, allows up to four open requests, and pauses on 403/429
for at least a minute, honoring longer Retry-After values. This is instance-local
throttling, not a global distributed quota. Requests for never-cached profiles
still require Backloggd to permit access. Failure responses retain the upstream
status and are not CDN-cached.
