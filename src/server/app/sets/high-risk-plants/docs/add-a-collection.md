# How to add a repeatable collection

A collection is a group of obligations the user can add more than one of: a
consignment holds many commodity lines, a line holds many identifier records, a
consignment holds many documents. Each occurrence is an **instance** with its own
fields. This guide shows you how to add one, including a field that applies to
only some instances.

## Read these files first

`commodityLines` is this set's collection. Read it before writing another:

- [`obligations/sections/commodity.js`](../obligations/sections/commodity.js) —
  the `commodityLine` group, its `minEntries` floor and every per-instance
  conditional field
- [`journeys/linear/features/commodities/list/list.controller.js`](../journeys/linear/features/commodities/list/list.controller.js) —
  the page that declares the group in `collects`, reads `collectionView` and
  removes an instance
- [`journeys/linear/features/commodities/details/details.controller.js`](../journeys/linear/features/commodities/details/details.controller.js) —
  the entry sub-page that collects nothing of its own and appends or updates one
  instance
- [`journeys/linear/features/commodities/line-form.js`](../journeys/linear/features/commodities/line-form.js) and
  [`entry-index.js`](../journeys/linear/features/commodities/entry-index.js) —
  the per-field widgets and validation rules, and the index the entry page edits
  at. The per-category field set itself is `lineFieldsFor(category)` in
  [`services/commodities/index.js`](../services/commodities/index.js)
- [`journeys/linear/features/commodities/fit/list.fit.spec.js`](../journeys/linear/features/commodities/fit/list.fit.spec.js) and
  [`fit/details.fit.spec.js`](../journeys/linear/features/commodities/fit/details.fit.spec.js)

It takes a fourth shape: a **list page plus entry sub-page**, where the list page
owns the group and the entry sub-page adds or edits one line at a time. It is
not the single-page loop and not the batch split — nothing in it reconciles a
selection, and no page edits every line at once. Its recipe is under "Build the
loop pages" with the other three. What it demonstrates for every shape alike is
the **per-instance conditional field** (a line's category decides which fields
that line is asked for) and the **collection floor** (`minEntries: 1` on the
group).

Two of the four still have no plants exemplar:

1. **the single-page loop** — a top-level collection where the entry form and
   the read-back table sit on one page, with a per-row Remove. The animals set's
   `documents` collection remains the reference.
2. **the nested loop** — one level down inside another, with a per-instance
   count cap declared in
   [`src/server/app/bridge/obligation-source.js`](../../../bridge/obligation-source.js).
   The animals set's `animalIdentifiers` collection remains the reference.

Do not follow the animals paths: they do not exist in this repository, and the
plant collections are different data. Replace each shape with links to a plants
collection once one fills it.

The engine, bridge and model APIs this recipe uses all exist today and are
generic. Where a code block below names something that is not in this repository
— a nested group, a second collection — it is the shape to write, not a
quotation. Every block that names a `commodityLines` field is quoted from
[`obligations/sections/commodity.js`](../obligations/sections/commodity.js) and
must stay in step with it.

## 1. Declare the group and its members in the manifest

A collection is a **group obligation** plus the member obligations that point at
it. Put both in the matching section module exported by
[`obligations/index.js`](../obligations/index.js), one module per section named
for that section. Import and re-export every new obligation from
[`obligations/index.js`](../obligations/index.js), and add it to that barrel's
`obligations` array.

A group carries an `id` (a UUID used by canonical fulfilment) and a `name` (the
request-local answers key and DOM field name). It carries no `status` and no
value of its own. It becomes a group purely because other obligations name it in
their `within`:

```js
export const commodityLine = {
  id: '<a new UUID>',
  name: 'commodityLines',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLines.atLeastOne'
  }
}

export const category = {
  id: '<a new UUID>',
  name: 'category',
  within: commodityLine,
  status: 'mandatory'
}
```

The `groups` array is derived, not hand-maintained — it is every obligation some
other obligation points at, and
[`obligations/index.js`](../obligations/index.js) already computes it that way:

```js
export const groups = obligations.filter((o) =>
  obligations.some((other) => other.within === o)
)
```

Collection-level facts:

- **`within`** on a member references the group object by identity (a real
  import). A member with no `applyTo` is always in scope for every instance; a
  member with `applyTo` is scoped per instance (see step 2).
- Member names are the keys inside each request-local instance object
  (`answers.commodityLines[0].category`) and the DOM field names.
  They must be path-safe — no `.`, `[` or `]` — or `buildDispatch` throws at
  boot ([`src/server/app/flow/dispatch.js`](../../../flow/dispatch.js)).

Nesting is the same declaration one level deeper: a group whose `within` points
at another group. A per-line identifier group sitting `within: commodityLine`
puts its instances at
`answers.commodityLines[i].<identifierGroupName>[j]`.

### Declare the feature-owned grouped bindings

The collection's feature owns the translation from those page fields to UUID
fulfilments. In `journeys/linear/features/<feature>/evaluation.js`, describe each
group with its page field, stable token and manifest obligation, then bind each
leaf:

```js
const line = {
  field: 'commodityLines',
  token: 'line',
  obligation: commodityLine
}

const unit = {
  field: 'nestedCollection',
  token: 'unit',
  obligation: nestedCollection
}

export const evaluationBindings = feature('commodities', [
  grouped({
    field: 'commodityCode',
    obligation: commodityCode,
    groups: [line]
  }),
  grouped({
    field: 'nestedField',
    obligation: nestedField,
    groups: [line, unit]
  })
])
```

Boot rejects a missing leaf, duplicate UUID owner, inconsistent group token, or
binding whose depth disagrees with the manifest's `within` chain. It also
rejects a binding that imports anything but the manifest's own obligation
object: identity, not shape.

The resulting fulfilment indexes (`line0`, `line0.unit1`) are positions within
one canonical snapshot, not durable identities for individual collection
records. Every save replaces the whole snapshot, so removing an earlier item may
renumber the rest.

## 2. Add a per-instance conditional field

A conditional member is one that carries an `applyTo` closure. The closure
decides, per instance, whether the field is in scope. You build it with a helper
from
[`src/server/app/model/obligations/helpers/index.js`](../../../model/obligations/helpers/index.js)
— no new syntax on the obligation itself:

```js
export const genus = {
  id: '<a new UUID>',
  name: 'genus',
  within: commodityLine,
  status: 'mandatory',
  applyTo: allowListed(category, () => categoriesRequiring('genus'), null, [
    appliesBecauseCategory
  ])
}
```

`allowListed(gate, values, gatedParentGroup, reasons)` scopes the field to the
instances whose gate value is on the allow-list. The **projection group**
argument is what makes it work at depth:

- **`null` projection** — the gate and the gated field sit at the same identity
  level. `genus` and its gate `category` are both `within
commodityLine`, so the field is in scope for exactly the lines whose own
  category is allow-listed.
- **a group** — the gated field is deeper than its gate. A per-identifier field
  that is `within` the identifier group but gates on `category`, which
  lives one level up on the line, passes the identifier group as the projection
  group so the line-level decision projects down onto every record in that line.

Every conditional field on a commodity line is built this way, by the
`gatedOnCategory` factory in
[`obligations/sections/commodity.js`](../obligations/sections/commodity.js): the
gate is the line's own `category`, the projection is `null`, and the allow-list
is read lazily so the module does no IO when it loads.

When an instance falls out of scope, the engine wipes that instance's stale
value — a field-level wipe inside one instance, not a whole-instance delete. The
reveal markup (show or hide the field as the user types) is page-side, in the
entry template. Scope and wipe stay in the model.

Any allow-list of values has to come from a set-owned reference service, and
[`obligations/whitelists.test.js`](../obligations/whitelists.test.js) has to
check it against that service. Both exist:
[`services/commodities/index.js`](../services/commodities/index.js) holds every
commodity allow-list, each gate reads it through `categoriesRequiring()` rather
than a hand-typed list, and the test holds the manifest and the service against
each other so a rename on one side alone fails there. See
[services.md](services.md).

## 3. What the engine gives you free

Once the manifest declares the group, you write no scope or wipe code. The
evaluator
([`src/server/app/model/obligations/evaluator.js`](../../../model/obligations/evaluator.js))
evaluates the feature-assembled canonical map, so a two-line journey yields
`line0` and `line1` as independent instances; the request projection exposes
them as `commodityLines[0]` and `commodityLines[1]`.

- **Per-instance scope.** Every in-scope field of every instance is projected
  into the controller-facing scope through
  [`src/server/app/bridge/scope.js`](../../../bridge/scope.js).
- **Per-path wipe.** [`src/server/app/bridge/purge.js`](../../../bridge/purge.js)
  names exactly the out-of-scope paths that still hold data; the write layer
  destroys them.
- **Per-instance completeness.**
  [`src/server/app/bridge/collection-complete.js`](../../../bridge/collection-complete.js)
  answers whether one instance is complete; the group is complete when its
  `requires` floor is met and every instance is complete.
- **Dispatch coverage at depth.** Boot asserts every obligation, at every depth,
  is collected by exactly one page. A member inherits its owning page from the
  nearest ancestor group in the dotted path
  ([`src/server/app/flow/dispatch.js`](../../../flow/dispatch.js)
  `ownerOfObligation`), so a loop page declares only the group in `collects` —
  `['documents']` or `['commodityLines']` — and every member rides along.

## 4. Build the loop pages

A collection needs a hand-written loop controller. A repeating group has no
uniform-widget projection, so each loop owns its rows and copy. The controller
reads facts from the engine barrel
([`src/server/app/engine/index.js`](../../../engine/index.js)) and writes through
it — it never touches the evaluator directly.

`state.collectionView(answers, collectionPath, evaluation)` returns facts only:
`[{ index, path, entry, complete }]`. No hrefs, no labels, no view-models. The
controller builds its own rows over those facts.

### The list page plus entry sub-page (this set's shape)

`commodityLines` takes this shape. Two pages the flow knows about: a LIST page
that declares the group in `collects`, reads `collectionView` for its rows and
removes an instance, and an ENTRY SUB-PAGE that collects nothing of its own
(`collects: []`) and appends or updates exactly one instance.

```js
// list.controller.js — the list page owns the group
export const meta = { ...page, collects: ['commodityLines'] }

await state.removeEntryAt(request, h, ['commodityLines'], index)
```

```js
// details.controller.js — the entry sub-page owns one instance
export const meta = { ...page, collects: [] }

const index = await state.appendEntryAt(request, h, ['commodityLines'], entry)
await state.updateEntryAt(request, h, ['commodityLines'], index, entry)
```

The sub-page carries the index it is editing rather than reconciling a
selection, so nothing here uses `reconcileEntriesAt` and no page edits every
line at once. Read
[`list.controller.js`](../journeys/linear/features/commodities/list/list.controller.js)
and
[`details.controller.js`](../journeys/linear/features/commodities/details/details.controller.js)
together: the index the sub-page edits at is derived in
[`entry-index.js`](../journeys/linear/features/commodities/entry-index.js), and
an index the collection has no entry for is refused rather than acted on.

### The single-page loop (entry form + read-back on one page)

One page is the page the flow knows about. It declares the group it collects and
renders both the entry form and the read-back table, with a per-row Remove link:

```js
export const meta = { ...page, collects: ['documents'] }
```

Its POST branches on the submit button. `action === 'add'` validates the entry
fields and appends; a plain Continue advances with no write. The append creates
the snapshot-local position — until that POST the draft lives only in the
payload, never a half-created instance in the store:

```js
await state.appendEntry(request, h, 'documents', entry)
```

A leaf-less entry has no canonical record from which to infer an instance and is
therefore not persisted. Collection forms should commit an entry only after
validation has produced at least one bound leaf.

Remove is a third branch of the same POST — a submit button named `action` with
a `remove:<index>` value, so the page form's crumb travels with it and no GET can
trigger a delete. It splices the instance out and reconciles, so anything left
dangling out of scope is pruned too:

```js
await state.removeEntry(request, h, 'documents', index)
```

Look the instance up before writing and refuse an index the collection has no
entry for, so a forged or stale index is rejected rather than acted on.

`appendEntry` / `updateEntry` / `removeEntry` are the top-level convenience
forms; each delegates to the `…At` form with a single-segment path
([`src/server/app/engine/write/index.js`](../../../engine/write/index.js)).

### The batch split (search page + consolidated details page)

A larger collection can use two pages. The SEARCH page declares the group in
`collects` and, on save, reconciles one line per selected item in a single
write:

```js
await state.reconcileEntriesAt(
  request,
  h,
  ['commodityLines'],
  lineKey,
  selected.map(seedLine)
)
```

`reconcileEntriesAt` keys existing instances by `keyOf`, keeps a still-selected
line's data (including its nested records), and drops a deselected line with wipe
semantics. The CONSOLIDATED DETAILS page collects nothing (`collects: []`),
renders the selected lines with a per-line Remove and an Add-another link, and
edits every line in place with
`state.updateEntryAt(request, h, ['commodityLines'], index, …)`.

### The nested loop

A collection one level down lives one card per commodity line. It appends and
removes on a two-segment-plus-index path:

```js
await state.appendEntryAt(
  request,
  h,
  ['commodityLines', index, 'nestedCollection'],
  unit
)
```

and reads its instances with the same `collectionView` call, deeper:

```js
state.collectionView(
  answers,
  ['commodityLines', index, 'nestedCollection'],
  evaluation
)
```

### Thread the change context through the loop

A collection reached from a Change link on check-your-answers carries a change
context. Wrap every internal link and redirect — row actions, back links,
add/remove/save round-trips — in `kit.withChangeContext(request, href)` so the
context survives the loop. Resolve the loop's exiting Continue with
`kit.nextTarget(request, page, scope)`, and let a hub exit win first via
`kit.hubExitTarget(request)`. Only the exit repoints to check-your-answers;
mid-loop actions must never bounce there early.

## 5. Cap the count where the model demands it

Some collections cap their instance count at a sibling field. The declaration is
data, in
[`src/server/app/bridge/obligation-source.js`](../../../bridge/obligation-source.js):

```js
export const MAX_ENTRIES_FROM = {
  nestedCollection: 'itemCount'
}
```

Each identifier collection is then capped at its line's count field. The cap is
computed by
[`src/server/app/engine/evaluate/cardinality.js`](../../../engine/evaluate/cardinality.js):

```js
export const collectionCapAt = (answers, collectionPath) => { … }
```

`collectionCapAt` reads the named sibling in the frame that holds the collection
and returns the cap, or `null` when there is no cap declared, the count is
unanswered, or the value is not a non-negative integer. An **unanswered count is
deliberately no cap** — the per-instance floor still bites at submit, so a blank
count never lets a journey finish early. Enforcement lives on the write path:
`appendEntryAt` reads the cap and returns `null` (no write) when the list is
already at it, so a stale form racing the cap is rejected rather than silently
over-filling.

`MAX_ENTRIES_FROM` is empty. Add an entry mapping the collection name to its
sibling count field when the first capped collection lands; an entry naming
obligations this set does not declare is inert.

## 6. Keep the write guards

Two guards protect collection writes. Do not remove them.

1. **Validate the parent index in a nested loop.** The write primitives append
   or splice at whatever path you give them. An out-of-range parent index would
   fabricate a phantom parent instance. A nested loop's remove handler must check
   `Number.isInteger(index) && index >= 0 && index < lines.length` before
   touching the store; copy that guard into every nested controller.
2. **The engine rejects non-integer indices.** `isValidIndex` in
   [`src/server/app/engine/write/pipeline/predicates.js`](../../../engine/write/pipeline/predicates.js)
   uses `Number.isInteger` because `splice(NaN, 1)` coerces to `splice(0, 1)` —
   a malformed remove URL would otherwise destroy the first instance.

## 7. Extend the contract test

`src/server/app/contract.test.js` pins that each page commits exactly what it
declares. Add a case shaped like the matching layout:

1. Assert the loop page's declaration — for the single-page loop,
   `documents.meta.collects` equals `['documents']`; for the batch split, the
   search page's meta collects `['commodityLines']`.
2. Drive the committing handler with a valid payload — the `action === 'add'`
   POST for a single-page loop, or the reconcile save for a batch split.
3. If the collection is conditionally scoped, seed the gating answer so it stays
   in scope — otherwise reconcile wipes the fresh write. Always-in-scope groups
   need no seed.
4. Assert the handler committed exactly the declared ids.

## The one hard limit

A member's `applyTo` gate reads values at the same identity level, or projects a
shallower gate down onto its own instances via the projection group. It cannot
read a value in a sibling frame at the same depth. A field gated on another value
in the _same_ enclosing instance (for example a per-record field gated on a
per-record sibling) is expressible; a field gated across unrelated frames is not.
See [limits.md](limits.md).
