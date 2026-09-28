---
paths:
  - 'src/server/app/sets/**'
  - 'src/server/app/routes-*.js'
---

# Working inside a set

A set is one journey under `src/server/app/sets/<set-id>/`, served at
`/<set-id>`. Its gateway is `src/server/app/routes-<set-id>.js`. Design
releases are sets. Keep them working with these rules.

1. **Run `npm run designer:where -- <paths>` first.** A design release is
   yours. `high-risk-plants` belongs to the real service. A frozen release
   (its `release.json` says `"frozen": true`) must never be edited: start a
   working release from it.
2. **A set never imports another set.** Every import stays inside
   `sets/<this-set>/` or goes to the shared platform
   (`src/server/app/{engine,model,bridge,flow,shared,lib,services}`). The
   `set-isolation` check in `npm run lint` fails on an import from another
   set. To reuse something from `high-risk-plants`, copy it into the release.
   A release may import a prototype-owned service, a folder under
   `src/server/app/services/` that `overrides.json` lists on its own line in
   `ours` (today `transporters`, `templates`, `ins-address-book` and
   `notification-search`). On a `design/*` branch that folder may be made or
   changed only through the service scaffold
   (`npm run designer:service -- new <name>`) and the workspace `prototype`
   skill's fake-a-service reference. Every other folder under
   `src/server/app/services/` belongs to the real service: never edit it on
   a `design/*` branch.
3. **Keep the generated names.** `SET_ID` and `SET_BASE` in `set.js`, and
   `TEMPLATES` in `journeys/linear/config.js`, were written by
   `npm run new:set`. Do not rename or hand-edit them. The server finds the
   set's pages through them.
4. **A required answer changed? Update the example walk.** When you add,
   remove or change a field that a page requires, update the release's
   `journeys/linear/flow/fixtures/happy-path.json` so the examples and the
   walk-through still reach the end. Check with
   `npm run designer:examples -- check <set-id>`.
5. **Never add a route at the server root.** A set's routes are mounted under
   `/<set-id>`. Only the chooser lives at `/`. Put new pages in the set's own
   flow and features.
6. **Copy lives in copy files.** Change `copy.en.js` and `copy.cy.js`
   together, keeping the same keys. With no Welsh given, write
   `'[Welsh needed] <English>'`.
7. **No tests are copied into a release.** Do not add `*.test.js` or
   `*.fit.spec.js` files to a design release. Prove a change with
   `npm run designer:check -- --set <set-id>` instead.

After a change, run `npm run designer:check -- --set <set-id>` and
`npm run designer:show -- --set <set-id>`.
