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

To change a ruling, leave the two files here alone and edit the ledger and
its subject in one commit:

1. Append an entry to `../decisions.json` with the next `d-NNN` id,
   `status: "current"`, `supersedes` set to the earlier entry's id and
   `decidedAt` set to the date of the ruling.
2. Set the earlier entry's `status` to `"superseded"` and its
   `supersededBy` to the new id.
3. Re-stamp the subject. For a conflict in `../conflicts.json`, set
   `resolution`, `resolvedBy` and `decision`. For a behaviour in
   `../journey-spec.json`, set `status` and `decision`, and append
   ` | Ruling: <resolution>` to its `detail`.
