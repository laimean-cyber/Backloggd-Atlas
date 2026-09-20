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
