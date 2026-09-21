# Judges panel — rulings on the spec's conflicts and open questions

`../decisions.json` is the ledger: one entry per ruling, stamped onto its
subject (a conflict's `resolution` and `decision`, or a behaviour's `status`
and `decision`). It is the only place a ruling lives; conflicts.json and the
behaviours carry a pointer to it, never their own answer.

The two files here are the evidence behind the ledger, kept so a ruling can be
revisited with its reasoning in reach:

- `rulings.json` — the panel's output after its consistency critic's fixes
  were folded in: eight dockets, three judges and a chair each, one ruling
  per item with rationale, spec changes, dissent and who decided it (`panel`,
  or `sam` where a standing product-owner ruling settled it). The
  `reconciliation` array records every edit the critic's findings caused.
- `critic.json` — the critic's report: coverage, cross-docket contradictions,
  breaches of the standing rulings.

Standing rulings for the first pass (2026-09-06): users, sign-in models,
agents, delegation of authority, plant-operator registration and "who
notifies" are out of phase; bulk upload is out of phase. Both are parked,
not rejected.

To change a ruling, do not edit any of these files. From the workspace:

```
tools/journey-builder/spec-add-decision.sh EUDPA-409 --subject conflict:c-012 \
    --ruling resolve --resolution "..." --rationale "..." --decided-by sam \
    --decided-at YYYY-MM-DD --supersedes d-0NN
```

The earlier entry is marked superseded and the subject is re-stamped.
