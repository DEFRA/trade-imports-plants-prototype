# The pull request body

Copy this outline into `.cache/designer/share/pr-body.md` and fill every
section from real output. Leave a section in with "None" rather than deleting
it, so reviewers always find the same headings. Write for someone who has not
seen the prototype.

```markdown
## What this changes

<Two or three plain sentences: what the designer changed and why.>

Design release: `<set-id>` (<working, frozen or research> release, made from
<from> on <date from release.json>). <One line from the release's
description.>

## Pages changed

- <Page name>: <what changed on it> - <link>

## What it looks like

<From the gallery's manifest.json: for each page, one line on what the
before and after pictures show, and the accessibility result in words.>
Gallery made with `npm run designer:show -- --set <set-id> --pages changed --before`
on <date>. To see it yourself, run that command and open the `index.html` it
names.

## Whose files these are

<The designer:where answers for every saved file, for example
"All 4 files are yours: the weekly update never touches them.">

## Welsh needed

<Each `[Welsh needed]` marker: page, key and English text. Or "None".>

## Design gaps

<Each row of the release's design-gaps.md: page, what the design wants,
what was built instead. Or "None".>

## Make this real?

This change lives in a design release only. To take it to the real
plants-frontend team, say "hand this to the real team" to Claude after this
is merged.

## Checking it

- The checks run on this pull request. Its `frontend-playwright-report`
  download has a video walking through each design release.
- The deployed prototype updates only after this is merged to `main`.
```

Fill-in rules:

- Page links: most pages only exist inside a notification, so a bare page
  address will not open. Give the example link that reaches the page:
  `http://localhost:3103/examples/<set-id>/<example>`
  (`npm run designer:examples -- links <set-id>` prints them). For the
  dashboard, `http://localhost:3103/<set-id>` is enough.
- Deployed links: read `deployedUrl` in `scripts/designer/prototype.json`.
  When it is set, add the same links on the deployed prototype
  (`<deployedUrl>/examples/<set-id>/<example>`) and say they work once this
  is merged. When it is `null`, the prototype is not deployed yet: give only
  the local links, and leave the line "The deployed prototype updates only
  after this is merged" out.
- Never paste raw test logs. Say what passed in one line.
- If there is no gallery yet, run the `show-my-change` skill first, then fill
  "What it looks like".
