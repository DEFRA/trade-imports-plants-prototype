---
name: port-a-kit-page
description: Re-create one page from the old GOV.UK Prototype Kit prototype (the GB notification prototype on Heroku) as a real page in a design release, with GOV.UK components, copy files, a check, a screenshot beside the original and a fidelity table that says what matched, what is the nearest GOV.UK equivalent and what is a design gap. Use when the designer says "re-create this page from the old prototype", "port the GB notification page for X", "build this Prototype Kit page here", "bring over the transporter page from the old prototype" or pastes a Kit .html view. NOT for restyling a page that already exists here (use match-the-design), NOT for wording (use change-the-words), NOT for moving or reordering existing pages (use change-the-journey).
---

# Port a Prototype Kit page

The old prototype built its pages with the Prototype Kit, its own Sass and its
own JavaScript. This skill rebuilds one of those pages inside a design release
here, using only the GOV.UK components the real service loads, and records
honestly how close the result is.

## What you need from the designer

- **The old page**, one of:
  - a Kit view file: a path to the `.html` file, or the HTML pasted into the
    chat. Save pasted HTML to
    `.cache/designer/port/<release-id>/<new-slug>/source.html` first.
  - a web address of the page on the old prototype (it may need a password,
    in which case ask for the `.html` file or a screenshot instead)
  - a screenshot (a file path)
- **The release** to add the page to. Default: the working release they
  changed most recently.
- **Where it goes**: the page it comes straight after, for example "after
  arrival details" (`arrival-details`).

Pick the new page's slug yourself from its heading, in lower-case words joined
by hyphens (for example `transporter-type`). Do not ask anything else: make
the obvious choice and say what you chose at the end.

## Guard rails

- Only into a design release the designer owns. Never into
  `high-risk-plants` or `sample-journey`, never into a frozen release.
- Change only files under `src/server/app/sets/<release-id>/` and
  `src/server/app/routes-<release-id>.js`, plus the port's notes under
  `.cache/designer/port/`.
- No Sass, no client JavaScript, no `src/client/**`, no
  `src/server/app/shared/**`, no new `app-*` classes, no `style` attributes.
  What the old page did with them becomes a design gap.
- No test files in a release: skip every recipe step that creates a
  `*.test.js` or `*.fit.spec.js` file.
- Every visible string goes in copy, word for word. Welsh gets
  `'[Welsh needed] <English>'`.
- One page per run. One Bash command per call. Do not commit.

## Steps

The workflow `.claude/workflows/port-kit-page.js` runs steps 2 to 6 for you.
Launch it by `scriptPath`, never by name, with every argument (there are no
defaults; use `null` for no reference image):

```text
Workflow({
  scriptPath: ".claude/workflows/port-kit-page.js",
  args: {
    set: "<release-id>",
    source: "<path to the .html, the web address, or the screenshot path>",
    sourceKind: "html" | "url" | "screenshot",
    slug: "<new-page-slug>",
    after: "<slug of the page it follows>",
    reference: "<path to a picture of the old page>" or null
  }
})
```

It writes the inventory to
`.cache/designer/port/<release-id>/<slug>/inventory.json`, the fidelity table
to `.cache/designer/port/<release-id>/<slug>/fidelity.md` and any gap rows to
the release's `design-gaps.md`. Read `fidelity.md` when it finishes.

If the Workflow tool is not available (for example in Cursor), do the same
steps yourself, one after another.

### 1. Check it is yours

```bash
npm run designer:where -- src/server/app/sets/<release-id>/set.js
```

Carry on only if the answer starts "Yours". For `high-risk-plants`, offer to
start a working release with `design-release` first. For a frozen release,
offer a working release made from it.

### 2. Take the inventory

Read the old page and write down, as JSON: the title, every heading (level and
classes), every component (and whether it was hand-written HTML or a macro),
every visible string and its role, every field (name, type, label, options,
error message), every conditional reveal, every `app-*` class, every link and
every script it depends on. Note anything the page takes from outside itself,
such as option lists in the old `routes.js` or `app/data/*.js`.

Then decide its kind:

- **static**: no form, or only a button
- **data-collecting**: a form that saves answers
- **list**: shows records from a lookup or saved list

`references/examples/transporter-type.expected.md` shows a finished
inventory.

### 3. Build it

Read `references/kit-to-prototype.md` first. Then register the page with the
recipe its kind needs:

- static: `change-the-journey`'s `guidance-page` recipe
- data-collecting: `change-the-journey`'s `add-a-page` recipe, which uses
  `add-a-field` for each answer
- list: `fake-a-service` for the data, then `change-the-journey` to place the
  page

Place it straight after the page the designer named. Build the template with
GOV.UK macros (`.claude/skills/match-the-design/references/components-we-have.md`
lists them with import lines) and follow `.claude/rules/templates.md`. If the
page adds a required answer, add it to the release's
`journeys/linear/flow/fixtures/happy-path.json`.

### 4. Check it

```bash
npm run designer:check -- --set <release-id> --full
```

If it fails, fix what the port caused and run it again, at most 3 times. Then
stop, leave the files as they are, and explain in plain words what is still
failing. Offer to undo the port (`share-my-change` can throw the changes
away).

### 5. Show it beside the original

```bash
npm run designer:show -- --set <release-id> --pages <slug> --reference <slug>=<picture of the old page>
```

Leave out `--reference` when there is no picture of the old page. Open the
new screenshot and look at it.

### 6. Grade the fidelity

Make one row for each thing in the inventory: what the old page had, what the
new page has, and a verdict:

- **matched**: the same thing, built with a GOV.UK macro or class
- **nearest**: the nearest GOV.UK option, visibly different
- **gap**: nothing could be built

Use `.claude/skills/match-the-design/references/nearest-equivalent.md` to
judge the nearest option. Add a row to the release's `design-gaps.md` (format:
`.claude/skills/match-the-design/references/design-gaps.md`) for every
"nearest" or "gap" whose difference shows on screen.

### 7. Tell the designer

In plain English, short:

- the new page's link, for example
  `http://localhost:3103/<release-id>`, and where it sits in the journey
- the fidelity table
- what was left out and logged as a design gap
- any accessibility findings from the gallery
- "The Welsh for this page is marked '[Welsh needed]'."
- then this line, exactly: "If this should become part of the real service,
  say 'hand this to the real team' and I will prepare a brief and a patch for
  the plants-frontend team. The design gaps go with it."

Do not commit. The designer saves their work with `share-my-change`.

## Trying it out

`references/examples/transporter-type.kit.html` is a real page from the old
prototype, made to stand alone. Port it into a scratch release and compare
the result with `references/examples/transporter-type.expected.md`.
