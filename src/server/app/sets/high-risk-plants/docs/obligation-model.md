# High-risk-plants obligation set

The high-risk-plants manifest is
[`src/server/app/sets/high-risk-plants/obligations/index.js`](../obligations/index.js).
It is expected to import declarations from `obligations/sections/`, export each
obligation, build the ordered `obligations` array and derive `groups` from
`within` references.

Today it declares the commodity section: the notification-level
`commodityType`, the `commodityLines` group and the ten fields a line carries.

```js
export const obligations = [commodityType, commodityLine, category /* … */]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)
```

`groups` is derived, not hand-maintained. It stays derived as the array fills:
`commodityLines` is in it because the line fields name it in their `within`,
never because anything added it.

The commodity-type page increment created `obligations/sections/`, and
`commodityType` in
[`sections/commodity.js`](../obligations/sections/commodity.js) is the smallest
a declaration gets — identity, name and a direct mandate:

```js
export const commodityType = {
  id: '9f2c4b71-3e58-4a6d-9c02-71d8f5a3e6b4',
  name: 'commodityType',
  status: 'mandatory'
}
```

Three arrangements landed in
[`obligations/sections/commodity.js`](../obligations/sections/commodity.js).
The group — `commodityLine` — carries a `requires` floor and no status of its
own. An ungated member — `category` and `quantity` — carries `within` plus a
direct `status` and deliberately no `applyTo`: `quantity` applies on every
line whatever its category, and `category` cannot be gated at all because
every other gate reads it, so a field that applies on every line of the group
carries no `applyTo`. A gated member — everything `gatedOnCategory` builds —
adds an `applyTo` from the platform helpers over an allow-list the set-owned
commodities service supplies, read lazily so the module does no reference-data
work when it loads. See [Obligation shape](#obligation-shape) below.

## Sections

Split declarations by domain, one module per section, as the journey grows.

This document deliberately does **not** list the sections this set will need.
The journey's requirements are not agreed yet, and writing a candidate list here
would turn a guess into something a later reader treats as settled. Derive the
sections from the requirements when they land.

Create a section module when its first obligation lands, not before. An empty
module is a liability: it reads as coverage that does not exist.

The declarations use helper functions from the platform model. They contain
stable identity, scope, mandate and cardinality rules, but no display copy and
no journey knowledge.

## Obligation shape

An obligation has a stable UUID `id`, a path-safe `name` and either a direct
`status` or an `applyTo` rule that returns scope and mandate. Collection members
use `within` to point at their parent group object, by identity — a real import,
not a copy. `requires` carries cardinality or cross-field invariants.

A name cannot contain `.`, `[` or `]`. The same vocabulary is used for
fulfilment paths and page dispatch, so a path metacharacter makes
`buildDispatch` throw at boot.

## The model has no display copy

Obligations describe domain applicability and completeness. They carry no
titles, labels, hints, legends, options, error messages, routes or template
names. Copy belongs to the feature; validation belongs to the controller.

[`src/server/app/obligation-purity.js`](../../../obligation-purity.js) and
[`src/server/app/model/no-display-keys.js`](../../../model/no-display-keys.js)
enforce this at boot. `assertObligationPurity()` runs in
[`routes.js`](../../../routes.js) before routes are added, so a display-shaped
key in the model fails the server start, not a test.

## Registration

[`src/server/app/routes.js`](../../../routes.js) imports the manifest namespace
and passes it to `configureObligationSet()`. Generic model and bridge code then
reads the set through
[`src/server/app/model/obligations/manifest.js`](../../../model/obligations/manifest.js).

The journey's feature bindings import the same obligation objects from this set.
That shared object identity is what lets the fulfilment registry check that
every leaf is owned once and that grouped binding paths match each `within`
chain. A structurally identical copy is rejected.

The Vitest suite does NOT wire this set: `test/setup-obligation-set.js` installs a
synthetic journey-neutral fixture from `test/fixtures/` instead, because the
engine is journey-agnostic and its tests must not depend on the installed set.

## Set checks

The animals set keeps two set-owned test modules beside its manifest, and this
set should gain the same pair with its first obligations:

- `obligations/coverage.test.js` — manifest identity (no duplicate UUID, no
  duplicate name), `within` chains, group invariants and gate dependencies
- `obligations/whitelists.test.js` — any commodity allow-list checked against
  the set-owned reference service, so the two cannot drift

[`obligations/coverage.test.js`](../obligations/coverage.test.js) exists and
covers the manifest as it stands. The first allow-lists landed with the
commodity section, and
[`obligations/whitelists.test.js`](../obligations/whitelists.test.js) landed
with them: it holds every per-line obligation's `name` against `lineFields()`,
every service field against the manifest, every gate's allow-list against
`categories()`, and every gate's allow-list against the categories
`categoriesFor()` offers — so a rename on one side alone, which would put a
field in scope for no category, fails there, and so does dropping a category
from a commodity type while a gate still names it.

The generic model contract is in the
[platform obligation-model guide](../../../docs/obligation-model.md).
