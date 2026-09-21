# `model/obligations`

## Orientation

This module defines the **obligation manifest** and the **evaluator** that
turns a stored `fulfilments` map into per-obligation `implications` — the
in-scope / out-of-scope, mandatory / optional, per-instance verdicts that the
UI, controllers, and analysis tools all consume. It is a pure, side-effect-free
model. It does not know about HTTP requests, the answers POJO the UI works
with, the journey / flow that decides which page to render next, or the
storage backend. All of those live in `bridge/`, `engine/`, and `flow/`
respectively; this module is what they call into.

## Vocabulary

The canonical terms used in identifiers, prose, and docs. Every entry
below reads exactly the same way in the code — one word, one meaning.

| Term                    | Meaning                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `obligation`            | One manifest entry — a field, a group, or an unindexed value the notification carries.                                                              |
| `fulfilment`            | One stored value for one obligation. Either an unindexed value (`'FR'`, `42`, `null`) or an `indexedFulfilments` map.                               |
| `fulfilments`           | The whole snapshot: `Record<obligationId, fulfilment>`. The evaluator's input.                                                                      |
| `fulfilmentIndex`       | A composite key identifying one instance of a group: `'entry0'`, `'entry0.record1'`, etc. Segments joined by `INDEX_DELIMITER` (`.`).               |
| `indexedFulfilments`    | A map keyed by `fulfilmentIndex` — the storage shape for an indexed obligation.                                                                     |
| `instance`              | One entry in a group's enumeration, identified by a `fulfilmentIndex`.                                                                              |
| `implication`           | The evaluator's verdict for one obligation: `{ inScope, status?, fulfilmentIndexes?, reasons? }`.                                                   |
| `applicabilityDecision` | The raw return value from an obligation's `applyTo` function, before the implication constructor consumes it.                                       |
| `leaf`                  | An obligation that is not a group (has no children).                                                                                                |
| `group`                 | An obligation that other obligations reference via `within`.                                                                                        |
| `unindexed`             | An obligation whose stored value lives directly at `state.fulfilments[id]`. No `fulfilmentIndex`.                                                   |
| `indexed`               | An obligation whose stored values live in an `indexedFulfilments` map.                                                                              |
| `applyTo`               | The optional `applyTo(fulfilments, fulfilmentIndexesByObligationId) → decision` closure on an obligation. Naming role: "gate".                      |
| `gate`                  | The concept: what an `applyTo` does — makes a scope decision. Used freely in prose and helper names (`equalsGate`, `presentGate`, etc.).            |
| `gateObligation`        | The obligation whose stored value a gate reads through its predicate.                                                                               |
| `gatedParentGroup`      | The gated obligation's parent group when the gate is at a shallower identity level; the gate's decision fans onto this group's `fulfilmentIndexes`. |
| `reasons`               | An optional array of `{ code, explanation }` justifications on an in-scope decision.                                                                |
| `within`                | An obligation's link to its parent group.                                                                                                           |
| `status`                | `'mandatory'` or `'optional'` — the effective mandate on an instance.                                                                               |
| `scope`                 | Whether an obligation applies (`inScope: true/false`).                                                                                              |
| `converge-purge`        | The evaluator's fixpoint loop — `{enumerate → applyTo → isInScope → purge}` until fulfilments stop shrinking.                                       |
| `requires`              | Group-level invariants: `minEntries`, `maxEntries`, `anyOfIds`, `allOrNothingOfIds`, `fulfilmentIndexCountEquals`.                                  |

## Taxonomy — the five obligation categories

Every obligation classifies into exactly one category (see
`evaluator/manifest-index/classify-obligations.js`). The split is by two axes:
structural shape (unindexed vs group) and, for indexed leaves, enumeration
provenance (where each leaf's `fulfilmentIndexes` come from).

| Category             | Structural shape                                                  | Enumeration provenance                                                    | Implication constructor       |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------- |
| `unindexed`          | No `fulfilmentIndex`; stored directly at `state.fulfilments[id]`. | —                                                                         | `unindexedImplication`        |
| `group`              | Has children via `within` back-refs.                              | Enumerated from descendants' stored keys.                                 | `groupImplication`            |
| `parent-derived`     | Indexed leaf.                                                     | From the parent group's enumeration — one entry at every parent instance. | `parentDerivedImplication`    |
| `apply-to-derived`   | Indexed leaf.                                                     | From the `applyTo` gate's output.                                         | `applyToDerivedImplication`   |
| `user-input-derived` | Indexed leaf.                                                     | From the user's own inputs (`indexedBy.source !== 'derived'`).            | `userInputDerivedImplication` |

## Storage shapes

Concrete examples of what `state.fulfilments` and `state.obligations`
(implications) look like for each category. `state` is the object the
evaluator's `evaluate(fulfilments)` returns.

### `unindexed` — e.g. `scalarField`

```js
state.fulfilments.scalarField === 'FR'

state.obligations.scalarField ===
  {
    inScope: true,
    status: 'mandatory'
  }
```

### `group` — e.g. `itemCollection`

Groups store no fulfilment of their own. Their `fulfilmentIndexes` come
from descendant leaves.

```js
state.fulfilments.itemCollection === undefined

state.obligations.itemCollection ===
  {
    inScope: true,
    fulfilmentIndexes: ['entry0', 'entry1']
  }
```

### `parent-derived` — e.g. `itemSelector` (`within: itemCollection`)

One stored value per parent instance; one `fulfilmentIndex` per parent
instance in the implication.

```js
state.fulfilments.itemSelector ===
  {
    entry0: 'selector-a',
    entry1: 'selector-b'
  }

state.obligations.itemSelector ===
  {
    inScope: true,
    status: 'mandatory',
    fulfilmentIndexes: ['entry0', 'entry1']
  }
```

### `apply-to-derived` — e.g. `nestedGatedField` (`within: nestedCollection`, `applyTo` allowListed on `itemSelector`)

The `applyTo` gate produces the set of `fulfilmentIndexes` this leaf is
authorised for. Only stored values under authorised indexes survive
purge.

```js
state.fulfilments.nestedGatedField ===
  {
    'entry0.record0': 'UK123456',
    'entry0.record1': 'UK123457'
  }

state.obligations.nestedGatedField ===
  {
    inScope: true,
    status: 'mandatory',
    fulfilmentIndexes: ['entry0.record0', 'entry0.record1'],
    reasons: [
      {
        code: 'obligation.nestedGatedField.applicable.becauseListedSelector',
        explanation:
          'nestedGatedField applies on units of lines whose itemSelector is in the nestedGatedField list'
      }
    ]
  }
```

### `user-input-derived` — e.g. user-created entries

The user creates entries directly; the storage keys ARE the
`fulfilmentIndexes`.

```js
state.fulfilments.userItemValue ===
  {
    d0: 'value-001',
    d1: 'value-002'
  }

state.obligations.userItemValue ===
  {
    inScope: true,
    status: 'optional',
    fulfilmentIndexes: ['d0', 'd1']
  }
```

## File map

Top-level primitives (used everywhere else in the module):

- `manifest.js` — the configured obligation set for this Service. `configureObligationSet` is called by the set-init code once per process.
- `manifest-graph.js` — pure walks over the manifest (`ancestorChain`, `isGroup`, `leavesUnder`, `groupsFrom`). Reads only from `manifest.js`.
- `index-delimiter.js` — the `.` used to join `fulfilmentIndex` segments.
- `is-blank-value.js` — the "blank fulfilment" predicate used by the read-side queries.
- `state-queries.js` — read-side queries over evaluator output (`leafSatisfied`, `effectiveStatus`, `groupInvariantErrors`).
- `instance-complete.js` — per-instance completeness verdict.
- `helper-internals.js` — shape-level utilities shared by gate helpers (`isNonArrayObject`, `readGate`).

`evaluator/`:

- `evaluator/index.js` — `createObligationEvaluator({ obligations })` and its `evaluate(fulfilments)`. See the docstring there for the algorithm.
- `evaluator/converge-purge.js` — the fixpoint loop.
- `evaluator/manifest-index/` — pre-computed lookup tables (`buildObligationsById`, `buildObligationChildren`, `buildAncestorGroups`, `buildDescendants`, `classifyObligations`).
- `evaluator/scope/` — `runApplicabilityDecisions`, `makeInScopeCheck`.
- `evaluator/enumeration/` — pre-purge (`enumerateGroupPathsFromStorage`) and post-purge (`enumerateGroupFulfilmentIndexesPostPurge`) group `fulfilmentIndex` derivation.
- `evaluator/purge/` — `dropUnrecognisedFulfilments`, `purgeStorage`.
- `evaluator/implications/` — the five implication constructors and their dispatcher (`buildImplication` / `buildImplications`).
- `evaluator/internal/` — `deriveGroupFulfilmentIndexes` (the shared engine for both enumeration passes), `fulfilmentsEqual` (structural equality for the fixpoint check).

`helpers/` — gate helper factories that build `applyTo` closures. All at one level; see `helpers/index.js` for the pick-a-helper guidance. Subfolders:

- `helpers/internals/` — shared machinery. `build-gate.js` (the factory used by `allowListed` / `notInUnionOf`), `run-gate.js` (the gate runner with defensive input-shape dispatch — `runGate`, `runGateIndexed`, `runGateUnindexed`), and `derive-union.js` (used by `notInUnionOf`).
- `helpers/introspection/` — `obligationMetadata` — surfaces the gate's `.metadata` sidecar and the `dependsOn` schema key for the reachability prover.

## Algorithm

The per-call evaluation algorithm is described in
`evaluator/index.js`'s module docstring. In outline:

1. Drop unrecognised obligation ids (tolerate-and-amend).
2. Fixpoint (`convergePurge`): repeat `{enumerate → applyTo → isInScope → purge}` until the fulfilments map stops shrinking. Guarantees every `applyTo` sees the same post-purge view its neighbours see.
3. Post-purge enumeration for group implications.
4. Build per-obligation implications.
