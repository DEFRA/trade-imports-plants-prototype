---
paths:
  - 'src/server/prototype-seed/**'
  - 'src/server/prototype-data/**'
---

# Example data: replay the real pages

You are editing the prototype's example data. Every example notification is
made by replaying the set's real pages, the way a trader would fill them in.
That is what keeps an example honest: if the real journey would refuse it, the
seed refuses it too, and says why.

## Rules

1. **Never write a record by hand.** Do not call `records.create`,
   `records.replaceFulfilment` or anything in `src/server/app/engine/` or
   `src/server/app/services/persistence/` from here. Do not build a
   notification object and put it in the store. An example is always a list of
   page answers that `seed-set.js` posts to the set's own routes.
2. **Take field names from the fixture and the page, never from memory.** The
   answers a page accepts are the `name` attributes it posts. Read them from:
   - the set's happy path:
     `src/server/app/sets/<set-id>/journeys/linear/flow/fixtures/happy-path.json`
   - the page's `controller.js` (what it checks) and, where the page has one,
     `fields.js` (the names), under
     `src/server/app/sets/<set-id>/journeys/linear/features/<page>/`.

   A date is `{ "daysFromToday": n }` (negative for the past) or `"d/m/yyyy"`.

3. **Change single answers with `answers`, not a new fixture.** Only add a
   named fixture (`src/server/prototype-seed/fixtures/<set-id>/<file>.json`)
   when several examples share the same changes. Never edit a set's
   `happy-path.json` for an example: in `high-risk-plants` it belongs to the
   real service.
4. **Keep slugs stable.** A slug is the example's link
   (`/examples/<set-id>/<slug>`). Once someone may have shared it, never
   rename it. Add a new example instead.
5. **Extra parties, ports and countries go in `src/server/prototype-data/`.**
   One JSON list per kind: `_all/` for every set, `<set-id>/` for one set. Use
   only the fields the stub rows have (see `rows.js`). Never edit the stub
   services' own rows under `src/server/app/services/*/stub*`: they belong to
   the real service.
6. **The seams stay one line.** `src/server/app/services/{address-book,ports,countries}/index.js`
   are patched in `overrides.json`. Each wraps its stub rows once
   (`withExtraParties`, `withExtraPorts`, `withExtraCountries`). Do not add
   more to them: the weekly update has to merge every line.
7. **The real rules still apply.** An extra country is still refused on the
   origin page when the commodity only comes from certain countries. When an
   example stops, fix the example, not the page.

## After the edit

```
npm run designer:examples -- check <set-id>
```

It must report every example as "Reached". A "Stopped" line quotes what the
page said: change the example's `answers` to satisfy it. Then run
`npm run designer:check -- --set <set-id>`.

For a set's scenario file, the grammar is at the top of
`src/server/prototype-seed/grammar.js`. The designer guide is
`docs/designers/example-data.md`.
