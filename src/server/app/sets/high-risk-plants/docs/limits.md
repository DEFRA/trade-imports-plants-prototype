# High-risk-plants limits and edges

## The set declares a floor and no ceiling

`commodityLines` carries `requires: { minEntries: 1 }`, so a notification with
no commodity line can never be complete. No ceiling is in force anywhere.
Collection caps are declared in two separate places:

- a `requires: { minEntries, maxEntries }` rule on the group obligation, which
  decides completeness and defends loaded data — `commodityLines` sets the
  floor and no maximum, because no source gives one
- the `MAX_ENTRIES_FROM` map, still empty of plant data, in
  [`src/server/app/bridge/obligation-source.js`](../../../bridge/obligation-source.js),
  which links a collection name to a sibling count field and caps the write path

A journey can use either or both. See
[Collection cardinality](../../../docs/cardinality.md).

Two generic sets in that same module — `SYSTEM_POPULATED` and
`ENFORCED_AT_CONTINUE` — hold what the set declares. `SYSTEM_POPULATED` is still
empty; `ENFORCED_AT_CONTINUE` names `commodityType`, the notification's entry
answer, and `countryOfOrigin`, so every page after the one that collects each of
them waits on it. Keep both in step with the manifest: a name listed there that
this set does not declare is inert, and one this set declares but does not list
gets no continue-time enforcement.

## The commodity vocabulary constrains three of the eleven answers

Obligation allow-lists read from a set-owned reference service. The set owns
one — [`services/commodities/`](../services/commodities/index.js) — and it
constrains the commodity types, the nine categories and their grouping by
type, the fifteen genera and the hardwood narrowing, plus which categories
each per-line field applies on. Only three commodity answers are checked
against it: `commodityType` in
[`commodity-type/controller.js`](../journeys/linear/features/commodity-type/controller.js),
`category` through `categoryRule` in
[`details.controller.js`](../journeys/linear/features/commodities/details/details.controller.js),
and `genus` in
[`line-form.js`](../journeys/linear/features/commodities/line-form.js).

Every other per-line value is free text bounded only by the length caps in
`line-form.js` — `species`, `commodityCode`, `potatoVariety`,
`potatoIntendedUse`, `eppoCode`, `sizeOfTree` and `phytosanitaryTreatments`
all fall through to `textRule`, capped at 58 characters and 400 for
`phytosanitaryTreatments` — and `quantity` is a whole number of at least one.
Nothing outside the commodity section is constrained yet. See
[Services](services.md) for the seam a reference service plugs into.

## One backend projection, and no event publishing

This repository ships one notification mapper.

Canonical fulfilment can contain values that the backend projection cannot
represent. A new obligation always needs a feature binding, but it only gets a
mapper field when the target backend schema has a real home for it. Where there
is no home, leave the mapper unchanged and add an explicit omission assertion.
Do not invent a payload property.

Today the mapper projects the reference number and nothing else, because the
backend carries no typed content fields — the whole engine state round-trips
through the opaque `fulfilments` payload beside it.

The plants alpha has no outbox, publishes no events and does no downstream
routing.

## Collection positions are snapshot-local

Grouped fulfilment tokens such as `line0` and `line0.unit1` are positions in one
canonical snapshot, not durable record identifiers. Every save replaces the
whole snapshot, so removing an earlier entry can renumber the later ones. Do not
persist or link to a position as though it were an id.

## Reconciling a commodity type destroys lines

The categories partition by commodity type, so saving a different
`commodityType` reconciles `commodityLines` down to the lines the new type
still allows — in practice none, because no category belongs to two types. Any
page that writes `commodityType` must therefore route to the commodities list
carrying the `removed` count, so the trader is told what went rather than
finding an empty consignment.

## A gate cannot read across sibling frames

A collection member's `applyTo` gate reads values at the same identity level, or
projects a shallower gate down onto its own instances through the projection
group argument. It cannot read a value in a sibling frame at the same depth.

A field gated on another value in the _same_ enclosing instance is expressible.
A field gated across unrelated frames is not. See
[add-a-collection.md](add-a-collection.md).

## Array-valued answers do not drive scalar gates

The standard scalar gate helpers expect scalar fulfilment values. Collection
conditions use group-aware helpers and cardinality rules instead.

Generic constraints are documented in
[Platform limits](../../../docs/limits.md).
