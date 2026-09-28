# Hand-offs

Each folder here is one change prepared for the real plants-frontend team,
named `<yyyy-mm-dd>-<slug>`. It is written by
`npm run designer:handoff -- --set <release> --slug <slug>` (the `hand-off`
skill) and holds:

- `brief.md`: the brief in plain English, with screenshots and a table of
  changed words
- `brief.jira.txt`: the same brief in Jira wiki markup
- `upstream.patch`: the change as the real service's files, for
  `git apply --3way`
- `report.json`: the same facts as data
- `screenshots/`: at most 2 MB of pictures

Nothing here is sent anywhere automatically. See
[Saving, sharing, undoing and handing off](../docs/designers/sharing-and-handing-off.md).

## Who to send it to

- **Where:** a story in the **EUDPA** Jira project (the trade imports
  programme's board). Paste `brief.jira.txt` as the description and attach
  `upstream.patch` and the screenshots.
- **Who:** the plants-frontend team's delivery lead or product owner. They
  decide when the story is built. If you do not know who that is, ask the
  prototype maintainer.
- **A developer who wants it now** can apply `upstream.patch` in their own
  clone of trade-imports-plants-frontend; the brief's "How to apply" says how.

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
