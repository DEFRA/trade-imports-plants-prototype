---
name: match-the-design
description: Make a page in a design release look like a Figma frame, a screenshot or a described layout, using only real GOV.UK Frontend components and classes, and log anything the toolbox cannot do as a design gap for the plants team. Use when the designer says "make this page match the design", "match the Figma", "move this above", "change the spacing", "make it wider", "make it a table", "make it a summary list", "make it cards", "make it tabs", "add a tag", "add an inset", "add a warning", "custom dropdown", "change the header" or "change the navigation". NOT for wording (use change-the-words), NOT for page order, new questions or new pages (use change-the-journey), NOT for re-creating a whole page from the old Prototype Kit prototype (use port-a-kit-page).
---

# Match the design

Turn a design into the real GOV.UK components this prototype already has, one
page at a time. What cannot be built is not faked: it is built as the nearest
GOV.UK option and logged for the plants team.

## What you need from the designer

- **The page**: a page slug (`arrival-details`), a page name ("the
  dashboard"), or a link such as
  `http://localhost:3103/plants-working/notifications/<id>/arrival-details`.
- **The design**: a Figma frame exported as PNG, a screenshot, or words.
  Images need a file path: ask the designer to export the frame and save it in
  `.cache/designer/references/` (that folder never goes into git).
- **The release**, if they have more than one. Otherwise use the working
  release they changed most recently.

Do not ask anything else. If something is unclear, make the obvious choice,
do it, and say what you chose at the end.

## Guard rails

- Work only in a design release the designer owns. Never edit
  `src/server/app/sets/high-risk-plants/**` unless the current branch starts
  with `handoff/`. Never edit a frozen release.
- Change only the page's template (`.njk`), its copy files (`copy/copy.en.js`
  and `copy/copy.cy.js`) for new words, and, in the release's own controller or
  view model, the two presentation settings: `contentColumnClass` and the
  `classes` of a tag or button the controller builds. Anything else in a
  controller is a journey change: use `change-the-journey`.
- Never touch Sass (`*.scss`), `src/client/**`, `webpack.config.js` or
  `src/server/app/shared/**`. `npm run lint:scss` must give the same result
  before and after.
- No `style` attributes, no inline `<style>` or `<script>`, no new `app-*`
  classes. `.claude/rules/templates.md` has the full list of template rules.
- The header, service navigation, phase banner and footer are always a design
  gap. They live in `src/server/app/shared/layout.njk`, which every set shares
  and the real service owns.
- If `overrides.json` does not list a file under `ours`, it belongs to the
  real service. `npm run designer:where` tells you.
- One Bash command per call.

## Steps

### 1. Find the page's template and check it is yours

Work out the set and the page slug. From a link, the set is the first part of
the path and the slug is everything after the notification id. A link to
`/<set>` alone is the dashboard; `/<set>/notifications/<id>` alone is the hub
(the overview).

Find the feature folder by its slug:

```bash
grep -rn "slug: '<slug>'" src/server/app/sets/<set-id>/journeys/linear/features
```

The dashboard's slug is `''`, so look in `features/dashboard/` directly. The
hub is `features/hub/`. The template is the file the folder's controller names
in `h.view(...)`, usually `template.njk` beside it.

Then:

```bash
npm run designer:where -- src/server/app/sets/<set-id>/journeys/linear/features/<feature>/template.njk
```

- "Yours": carry on.
- "Belongs to the real service" (for example `high-risk-plants`): stop. Offer
  "do it in your design release" (the default: use `design-release` to start
  one if there is none) or "prepare it for the real team" (`hand-off`).
- "This is a frozen release": stop. Offer a working release made from it with
  `design-release`.

### 2. Take the starting picture

```bash
npm run designer:show -- --set <set-id> --pages <slug> --reference <slug>=<image path>
```

Leave out `--reference` when the design came in words. Use `dashboard` and
`hub` as the page names for those two pages. Note the gallery folder it
prints. Open the page's PNG and the reference image and look at both.

### 3. List every visible difference

Write one numbered line per difference: what the page shows now, what the
design shows, and which line of the template makes it. Include spacing, type
size, width, order, colour, component type, missing or extra elements. Skip
differences in wording: those belong to `change-the-words`.

### 4. Map each difference to the toolbox

Use, in this order:

1. `references/figma-to-govuk.md` for spacing, type, width, colour and
   moving things.
2. `references/components-we-have.md` for which component to use, its import
   line and a template that already uses it. First check the "Installed" line
   against `package.json`. If the version differs, refresh the list:
   `node .claude/skills/match-the-design/scripts/components-we-have.js --write`.
3. `references/layout-patterns.md` for page layouts (full width, two columns,
   cards, task list, filter panel, tabs, counts).
4. `references/nearest-equivalent.md` for bespoke patterns (custom dropdowns,
   modals, sticky bars, chips, header changes).

Each difference ends up as exactly one of:

- **Matched**: a GOV.UK class or macro gives the design.
- **Nearest**: the nearest GOV.UK option is built, and the difference is
  logged as a gap.
- **Gap only**: nothing can be built (for example the header). Logged as a
  gap.

`references/examples/heading-gap-and-status-colour.md` is a worked example.

### 5. Edit the template

Make every matched and nearest change in the template. Follow
`.claude/rules/templates.md`. In particular:

- import each new macro at the top of the file
- keep the error summary include, `crumb`, `concurrencyToken`, the section
  caption straight above the `h1`, and `saveActions`
- keep every field's `name`, `id` and error key
- put any new visible text in both copy files, with `'[Welsh needed] <English>'`
  in `copy.cy.js` when there is no Welsh

For full width, add `contentColumnClass: kit.surfaceClass('display')` to the
object the release's controller passes to `h.view`.

### 6. Log the gaps

Add one row per gap to `src/server/app/sets/<set-id>/design-gaps.md`, using
the heading, table header and columns in `references/design-gaps.md`. Create
the file if it does not exist. Never remove an existing row.

### 7. Check it

```bash
npm run designer:check -- --set <set-id>
```

If it fails, read the plain-English reason, fix your own change and run it
again. After 3 failed attempts, undo your edits to the files you changed
(`git restore <file>` for each, after telling the designer which) and explain
what went wrong.

### 8. Show it and compare

```bash
npm run designer:show -- --set <set-id> --pages <slug> --reference <slug>=<image path>
```

Open the new PNG and the reference and look at them. Never describe a
visual result you have not looked at. Compare the new `axe.json` in the
gallery folder with the one from step 2, and report any new accessibility
finding in plain words (for example "the new heading skips from h1 to h3").

### 9. Tell the designer

In plain English, short:

- what changed on which page, difference by difference
- what is logged as a design gap, and why
- the gallery path and the link to click, for example
  `http://localhost:3103/<set-id>`
- any new accessibility findings
- then this line, exactly: "If this should become part of the real service,
  say 'hand this to the real team' and I will prepare a brief and a patch for
  the plants-frontend team. The design gaps go with it."

Do not commit. The designer saves their work with `share-my-change`.

## Header and navigation asks

These always become gaps, never edits. The header, the service navigation
links (Dashboard, Address book, Manage account, Log out), the phase banner
and the footer come from `src/server/app/shared/layout.njk` and
`src/server/app/shared/copy.en.js`. Both are shared by every set and owned by
the real service. Write a gap row with page `all pages` that says exactly what
the design wants, so the plants team can decide.
