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

This folder belongs to the prototype: the weekly update never touches it.
