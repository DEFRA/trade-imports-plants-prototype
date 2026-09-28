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
- `upstream.patch`: the change as the real service's files, for
  `git apply --3way`. A page that uses a new prototype-owned service travels
  with that service's `index.js` and `client.js`, marked proposed. There is
  no patch for a brief only (a release made from `sample-journey`, or a pure
  concept handed off with `--brief-only`).
- `report.json`: the same facts as data, including any story placeholders
  still to fill in
- `screenshots/`: at most 2 MB of pictures

Words in square brackets in the story (`[Who is this for? …]`) are
placeholders: the designer did not give those words yet. Fill them in with
the designer before the story is raised. Nobody else writes them.

Nothing here is sent anywhere automatically. See
[Saving, sharing, undoing and handing off](../docs/designers/sharing-and-handing-off.md).

## Who to send it to

- **Where:** a story in the **EUDPA** Jira project (the trade imports
  programme's board). Paste the `*Summary:*` line of `brief.jira.txt` into
  the Summary field and the rest into the description, then attach
  `upstream.patch` and the screenshots.
- **Who:** the plants-frontend team's delivery lead or product owner. They
  choose the parent epic and decide when the story is built. If you do not
  know who that is, ask the prototype maintainer.
- **A developer who wants it now** can apply `upstream.patch` in their own
  clone of trade-imports-plants-frontend; the brief's "How to apply" says how.
  In the trade-imports workspace, an agent can build it with the `ticket`
  skill (once the story has a number) or the `frontend-change` skill,
  following the recipe the brief names.

## Keeping track

Once you have sent a hand-off, tell Claude ("I raised it as EUDPA-123", "it
was merged"). Claude adds these lines straight under the brief's heading and
saves them, so anyone can see where each hand-off got to:

```
Status: sent | in progress | merged | not taken up
Sent on: <yyyy-mm-dd>
Ticket: EUDPA-<number>
Merged in plants-frontend: <pull request link>
```

When it is merged into plants-frontend, the weekly update brings it into the
real journey here, and your design release can be retired or refreshed.

This folder belongs to the prototype: the weekly update never touches it.
