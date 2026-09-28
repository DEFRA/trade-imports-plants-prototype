# Hand-offs

Each folder here is one change prepared for the real plants-frontend team,
named `<yyyy-mm-dd>-<slug>`. It is written by
`npm run designer:handoff -- --set <release> --slug <slug>` (the `hand-off`
skill) and holds:

- `brief.jira.txt`: a story ready to paste into Jira. It starts with the
  story in the EUDPA shape: a summary, _As_, _I want_ and _So that_ in the
  designer's own words, a description, acceptance criteria as _Given_,
  _When_, _Then_, and a Tech Notes panel. Then how to see the prototype, the
  journey flow before and after, every validation rule with its English and
  Welsh error, any new service to build, the tests to add and a note for the
  developer or agent. The detail follows: each page with screenshots and a
  table of changed words, Welsh needed, tests and spec files that quote the
  old words, what cannot ship yet, drift and how to apply.
- `brief.md`: the same in Markdown
- `ticket.json` and `ticket.description.jira.txt`: the same story as a
  `tim-ticket/1` manifest, ready for `tim jira create --from ticket.json` to
  raise for real (see "Raising it" below). `ticket.description.jira.txt` is
  `brief.jira.txt` without the `*Summary:*` line (Jira's own Summary field
  carries that) and without the `(attach ...)` notes (the manifest's own
  `attachments` list does the attaching).
- `upstream.patch`: the change as the real service's files, for
  `git apply --3way`. A page that uses a new prototype-owned service travels
  with that service's `index.js` and `client.js`, marked proposed. There is
  no patch for a brief only (a release made from `sample-journey`, or a pure
  concept handed off with `--brief-only`).
- `report.json`: the same facts as data, including any story placeholders
  still to fill in and whether the story is `ready` to raise as it is
- `screenshots/`: at most 2 MB of pictures

Words in square brackets in the story (`[Who is this for? …]`) are
placeholders: the designer did not give those words yet. Fill them in with
the designer before the story is raised. Nobody else writes them.

Nothing here is sent anywhere automatically. See
[Saving, sharing, undoing and handing off](../docs/designers/sharing-and-handing-off.md).

## Raising it

The **usual way**, from the trade-imports workspace: `tim auth` checks Jira
access, then `tim jira create --from <folder>/ticket.json --json` is a dry
run by default — it prints the plan (project, summary, labels, every
attachment with its size, and any warning, such as a placeholder still left
in) and a plan id, and sends nothing. Once the designer says yes to that
plan in their own words, `tim jira create --from <folder>/ticket.json
--confirm <planId>` creates the story for real, attaches every file, links
anything in `relates`, and writes `ticket.created.json` next to the
manifest. Running `npm run designer:handoff -- status --dir <folder>` after
that reads the new ticket back and records it (see "Keeping track" below).

**No Jira access on this computer?** Fall back to pasting: paste the
`*Summary:*` line of `brief.jira.txt` into the Summary field and
`ticket.description.jira.txt` into the description, then attach
`upstream.patch` and the screenshots by hand. Ask the prototype maintainer
who the plants-frontend team's delivery lead or product owner is if you do
not know — they choose the parent epic and decide when the story is built.

**Either way, the real branch is `feat/<ticket key>-<slug>`** in
`trade-imports-plants-frontend` (or `feat/NO_JIRA-<slug>` before a ticket
exists). In the trade-imports workspace, an agent builds it in
`repos/trade-imports-plants-frontend` on that branch, following the recipe
the brief names; the developer note in `brief.md` says the exact route.

## Keeping track

Once a hand-off is raised, `npm run designer:handoff -- status --dir
<folder>` reads its `ticket.created.json` and records the real ticket and
branch in two places: straight under the brief's own heading —

```
Status: sent
Sent on: <yyyy-mm-dd>
Ticket: EUDPA-<number>
Branch: feat/EUDPA-<number>-<slug>
```

— and as a row of the table below, so anyone can see every hand-off's ticket
and branch at a glance without opening each folder:

| Hand-off | Ticket | Branch |
| -------- | ------ | ------ |

Pasted it by hand instead, or heard it was merged? Tell Claude ("I raised it
as EUDPA-123", "it was merged") and it adds or updates the same lines,
including `Merged in plants-frontend: <pull request link>` once that is
known.

**Once it is merged into plants-frontend and before the next weekly
update:** if the change built a proposed service for real, drop that
service's `ours` line from `overrides.json` first. The weekly update only
brings in files the real service owns; a line still in `ours` keeps the
prototype treating the now-real service as its own and the sync leaves the
real version out, so the two drift apart. With that line dropped, the
weekly update brings the real journey in as normal, and your design release
can be retired or refreshed.

This folder belongs to the prototype: the weekly update never touches it.
