# High-risk-plants services

## The set owns one: commodities

[`services/commodities/index.js`](../services/commodities/index.js) holds the
commodity vocabulary, every list frozen so a caller cannot edit the catalogue.
It holds values and nothing else: every label and hint for those values is a
copy leaf in the feature that renders them.

- `commodityTypes()` — the three values a notification may be for
- `categories()` and `categoriesFor(commodityType)` — the nine categories, and
  the ones a notification of one type may hold
- `genera()` and `generaFor(category)` — the fifteen entries the regulation
  lists, and the narrowing to three for a hardwood line
- `lineFields()`, `categoriesRequiring(field)` and `lineFieldsFor(category)` —
  every per-line field in page order, the categories one field applies to, and
  the fields one category is asked for — read twice: the entry page renders
  those fields and the field's obligation gates on the same list

It landed with the commodity-type page because the lists are volatile enough
that retyping one into an obligation or a copy module would leave two copies
with nothing holding them in step, and the commodities collection extended it
rather than replacing it. Still to come: the origin narrowing, and the stub and
real clients behind a `configure*` seam in [`routes.js`](../../../routes.js).

A set-owned service is the right home for vocabulary that belongs to this
journey rather than to the platform — a commodity catalogue, the options behind
a select, the allow-lists an obligation's gate reads. That vocabulary is domain
data, not a generic platform contract, which is why it lives in the set rather
than under `src/server/app/services/`.

The seam for one that generic code has to reach is a `configure*` call in
[`src/server/app/routes.js`](../../../routes.js): the set's module is passed
in at boot, so generic code never imports the set. The commodities service
needs no such seam yet — only this journey's own pages and this set's own
obligations read it. Follow that shape when generic code first needs it. The
first obligation allow-lists landed with the commodity section, and they read
`categoriesRequiring()` rather than a hand-typed list, so the drift to guard
against is a rename on one side alone.
[`obligations/whitelists.test.js`](../obligations/whitelists.test.js) is that
guard: it holds every per-line obligation's `name` against `lineFields()`, every
gate's allow-list against `categories()`, and every gate's allow-list against
the categories `categoriesFor()` offers, so a field that would be in scope for
no category — or for a category no commodity type offers — fails there.

## Platform services used by the journey

The journey calls shared service barrels under `src/server/app/services/`,
documented in [Platform services](../../../docs/services.md):

- countries
- ports
- address book

Each of these is generic. Countries and ports are primed from the reference-data
service when the application runs in real mode, and serve stub data otherwise.

The reason-for-import/purpose service and the transport and transporter
services were removed because this journey asks no such question: behaviour
`import-reason-purpose-service-unused` records that no plants source asks a
reason-for-import or purpose, and behaviour `customs-no-sps-hold-or-matching`
records that the journey collects no transport or port-of-exit details. Do not
restore them without a behaviour that needs them.

## Out of scope

There is **no** document-upload service in this repository. The plants alpha
persists obligations and fulfilments only — no uploads, no outbox, no event
publishing and no downstream routing. A page that needs to attach a scanned file
is out of scope until that decision changes.
