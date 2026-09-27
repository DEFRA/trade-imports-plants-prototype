# research-mode.md template

Write this file at `src/server/app/sets/<set-id>/research-mode.md`. While it
exists, the chooser shows a "Research mode on" tag on the release. It is saved
in the "Research mode on for <set-id>" commit, so turning research mode off
removes it again.

The table is read by `designer:research` (status, the sheet and the commit
message) and by `designer:handoff`, which lists every row under "cannot ship".
Keep exactly these four columns. Put one row per relaxed rule. Put the file path
relative to the release folder, as it appears under
`src/server/app/sets/<set-id>/`.

```markdown
# Research mode for plants-research-arrival-202610

For the research sessions on 2 October 2026. Participants can get past these
pages without errors. The real service still shows every one of these errors.

| Page                   | File                                                          | What participants can now do           | What the real service does          |
| ---------------------- | ------------------------------------------------------------- | -------------------------------------- | ----------------------------------- |
| arrival-details        | journeys/linear/features/arrival-details/controller.js        | Leave the arrival date blank           | Asks for the arrival date           |
| arrival-details        | obligations/sections/arrival.js                               | Submit without an arrival date         | Will not submit without one         |
| identification-numbers | journeys/linear/features/identification-numbers/controller.js | Leave the identification numbers blank | Asks for each identification number |
```

Write the last two columns in plain English: what a participant can now do,
and what the real service does instead. The facilitator reads them on the sheet.
