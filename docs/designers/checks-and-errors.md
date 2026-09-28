# Checks and errors

The check answers one question: did I break anything? It runs the same tests
the real service runs, then tells you in plain English what failed, how to fix
it and which skill fixes it.

You can ask Claude "check my changes", "did I break anything" or "is it
ready", or run it yourself:

```bash
npm run designer:check -- --set <set-id>
```

For example `npm run designer:check -- --set plants-working`. If you leave out
`--set`, it checks the working release you changed most recently.

## The three levels

| Level | Command                                           | What it runs                                                                                                                     | When to use it                                                                          |
| ----- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| quick | `npm run designer:check -- --set <set-id>`        | Tidies the files you changed, says whose files they are, checks the English and Welsh, compiles every template, opens every page | After changing words or a template. Usually under a minute.                             |
| full  | `npm run designer:check -- --set <set-id> --full` | The quick check, then exactly what the pre-commit hook runs                                                                      | After changing the flow, a controller or the model, and always before you save or share |
| walk  | `npm run designer:check -- --set <set-id> --walk` | The full check, then walks every journey to the end in a real browser                                                            | Before a research session or a show and tell                                            |

Add `--json` to any of them to get the result as JSON instead of a table.

If you ran the quick check but changed how pages work, the check ends with a
"Next:" line telling you to run the full check.

### What the quick check does

1. **Tidy the code layout (Prettier).** Every file you changed is laid out in
   the house style: spaces, quotes and line breaks. It names every file it
   tidied. It never changes what a file says.
2. **Whose files you changed.** Each changed file is yours, shared with the
   real service on purpose, belongs to the real service, or is removed by the
   weekly update. A file that is not yours is marked "Check". This is advice,
   not a failure. See [Where your changes go](where-changes-go.md). The one
   exception: a change to a release that was frozen at your last save is
   FAILED, and the pre-commit hook refuses it too. Freezing a release is not a
   change to it: the freeze's own `release.json` shows as "You froze …".
3. **English and Welsh words.** In your set, `copy.en.js` and `copy.cy.js` must
   have the same keys, nothing may be empty, and no Welsh text may be a
   straight copy of the English. Welsh nobody has written yet reads
   `'[Welsh needed] <the English>'`. The check counts and lists those markers.
   A link address may be the same in both: a value that is only an address
   (starting `https://`, `mailto:`, `tel:` or `/`), or any key whose name ends
   in `Href` or `Url`. Never write `[Welsh needed]` in front of an address: it
   breaks the link.
4. **Page templates.** Every `.njk` file in your set compiles, and every file
   it extends, includes or imports exists.
5. **Code rules in the files you changed.** ESLint on every `.js` file you
   changed, the same rules the pre-commit hook runs, so a broken rule shows
   now and not only when you save. Each error is named with its file, line
   and rule.
6. **Pages open (prototype checks).** The prototype starts in the background,
   starts a notification, walks the set's example journey and opens every page
   the set's `flow.js` lists. Each page must open, or send you somewhere else
   in the same set. None may show the error page.
7. **Real journey unit tests.** Only when you check `high-risk-plants`.

### What the pre-commit hook runs

Every time anyone commits, git runs `.husky/pre-commit`, which runs
`npm run git:pre-commit-hook`. That is three commands, one after another:

1. `npm run format:check`: every file is tidy.
2. `npm run lint`: code rules (ESLint), style rules (Stylelint) and the rules
   about which files may use which (dependency-cruiser).
3. `npm test`: builds the styles and scripts, then runs every unit test,
   including the prototype checks.

If any of them fails, the commit does not happen. The full check runs the same
three commands, so a commit made straight after a green full check passes the
hook first time. Never skip the hook with `--no-verify`.

### The prototype checks

Three tests in `src/server/prototype-checks/` run inside `npm test`, so every
design release is checked on every commit and every pull request:

- `frozen-releases.test.js`: nothing in a frozen release has changed since
  the commit that froze it.

- `copy-shape.test.js`: the English and Welsh rules above, for every set
  except `high-risk-plants`. The real journey has its own, stricter tests: it
  does not accept `[Welsh needed]`.
- `release-render.test.js`: every set with a folder is loaded by the
  prototype, and every page each set's `flow.js` lists opens. This is what
  catches a page added to `flow.js` without its controller, or a page whose
  template breaks.

## Reading the result

The check prints a table, one row per step:

| Result  | Meaning                                                  |
| ------- | -------------------------------------------------------- |
| Passed  | Nothing wrong.                                           |
| Check   | Advice, for example you changed a file that is not yours |
| FAILED  | Something must be fixed before you can save your work    |
| Not run | Skipped because an earlier step failed                   |

Under the table, "What went wrong" explains every failure:

- **What happened**: the cause, in plain English
- **How to fix it**: what to do
- **Skill that fixes it**: the skill to ask for, for example
  `change-the-words`

Some failures end with "Not caused by your change: tell the maintainer". That
means every file the failure names is one you did not touch (or you have not
changed anything yet). The check never hides these. They still have to be
fixed before anything can be saved, but not by you.

The last line gives the log file, for example
`.cache/designer/check/2026-09-27T10-11-12.log`. It holds everything each step
printed, in full. Git ignores it.

## Every error the check explains

These are listed in the order the check looks for them. The heading is the
title the check prints.

### A typing slip in a file

- You see: `SyntaxError`, `Unexpected token` or `Unterminated string
constant`.
- It means: a file has a missing quote, comma or bracket.
- Fix: open the file at the line the log shows and close the quote or bracket.
  In copy files, every piece of text needs a quote at each end and a comma
  after it.
- Skill: `change-the-words`

### Code layout

- You see: `[warn] <file>` and `Code style issues found`.
- It means: some files do not match the house layout. The pre-commit hook
  refuses the commit until they do.
- Fix: run the check again. Its first step tidies every file you changed. If
  the files named are ones you did not change, run `npm run designer:format`
  (the same as `npm run format`, but it only prints the files it changed).
- Skill: `check-my-change`

### English and Welsh words do not match

- You see: `copy-shape:` and a line such as ``The Welsh file has no `hint` ``.
- It means: in your design release, `copy.en.js` and `copy.cy.js` are not the
  same shape. A key is missing or empty, or a Welsh text is a straight copy of
  the English.
- Fix: add the missing key to `copy.cy.js`. If you do not have the Welsh yet,
  write `'[Welsh needed] '` followed by the English. Keep exactly the same keys
  in both files. See [Wording and Welsh](wording-and-welsh.md).
- Skill: `change-the-words`

### Real journey English and Welsh do not match

- You see: `copy parity`, `cy paths must equal en paths` or `must be
translated (or allowlisted)`.
- It means: the real journey's English and Welsh differ in shape, or a Welsh
  text is the same as the English.
- Fix: the real journey does not accept `[Welsh needed]`. Make the change in
  your design release, or get the Welsh before it is handed off.
- Skill: `change-the-words`

### A page is missing its copy files

- You see: `copy convention`, `must carry its Welsh copy` or `must own its
copy`.
- It means: a feature folder with a template has no `copy/copy.en.js` or
  `copy/copy.cy.js`, or a piece of text is empty.
- Fix: every feature with a template needs both copy files (the real journey
  also needs `copy/copy.test.js`). No text can be empty.
- Skill: `change-the-words`

### A real journey page saves the wrong answers

- You see: `controller <-> model commit contract` or `contract.test.js`.
- It means: in the real journey, a page saves different answers from the ones
  its controller says it collects (its `meta.collects`).
- Fix: this test only covers `high-risk-plants`. Make the change in your
  design release instead.
- Skill: `change-the-journey`

### A file nothing uses

- You see: `no-orphans` and a file name.
- It means: a JavaScript file is not used by anything.
- Fix: import it where it is needed (a new page's controller goes in the
  features `index.js`), or delete it if you meant to remove it.
- Skill: `change-the-journey`

### One set uses another set

- You see: `set-isolation` or `journey-isolation` and two file names.
- It means: a file in one set imports a file from another set. Each set must
  stand on its own.
- Fix: copy what you need into your own set. To bring a change from one
  release to another, ask to carry it across.
- Skill: `design-release`

### Display words in the model

- You see: `Model purity violated` or `obligation-purity`.
- It means: a label, hint, title or other display text was put in the model
  (the `obligations` files). The model only says what is collected.
- Fix: move the words into the page's copy files and use them in the
  template.
- Skill: `change-the-journey`

### An answer no page asks for

- You see: `Obligations collected by no page:` and the answers' names.
- It means: the model asks for an answer that no page collects.
- Fix: add the answer's name to a page's `meta.collects` in its controller, or
  remove it from the set's obligations.
- Skill: `change-the-journey`

### An answer no feature reads back

- You see: `obligations owned by no feature:` and the answers' names.
- It means: an answer in the model has no feature binding that reads it back.
- Fix: add a binding for it in the feature's `evaluation.js` (the add-a-field
  recipe shows how), or remove it from the obligations.
- Skill: `change-the-journey`

### A binding made its own copy of an answer

- You see: `must import its obligation object from the manifest`.
- It means: a feature's binding made its own copy of an obligation instead of
  importing the real one.
- Fix: import the obligation from the set's obligations files and pass that
  object to the binding.
- Skill: `change-the-journey`

### An example could not get through a page

- You see: `Example '<label>' stopped at <page>`, or `The example '<name>'
stopped at '<page>'`.
- It means: an example notification could not get past that page, usually
  because a required question changed. The check shows what the page said.
- Fix: update the example's answers for that page (the set's
  `flow/fixtures/happy-path.json`, or its example scenario), then press Reset
  on the chooser. See [Example data](example-data.md).
- Skill: `example-data`

### The port is already in use

- You see: `EADDRINUSE` and a port number, or `is already used, make sure that
nothing is running on the port`.
- It means: something is already running on that port. On 3103 it is probably
  the prototype, started earlier. On 3003 (used by the browser walk) it is
  probably the real plants service.
- Fix: use the copy that is already running, or stop it first. Ask before
  stopping anything you did not start yourself.
- Skill: `run-the-prototype`

### The test browser is not installed

- You see: `Executable doesn't exist at`.
- It means: the browser the checks drive (Playwright Chromium) is not
  installed.
- Fix: run `npm run playwright:install` once, then run the check again.
- Skill: `run-the-prototype`

### Code ran outside its set

- You see: `No set context` and `2 sets are mounted` (or more).
- It means: some code tried to work out which set it belongs to outside a page
  request, while several sets are loaded.
- Fix: this is usually a call at the top of a file, which runs when the file
  loads, instead of inside a controller function. Move it inside the function.
  If it happens in a file you did not change, tell the maintainer.
- Skill: `change-the-journey`

### A set is missing part of its set-up

- You see: `mounted without configuring` or `mounted without its journey
cookies`.
- It means: a set started without one of the pieces every set must set up in
  its routes file.
- Fix: compare `src/server/app/routes-<your set>.js` with
  `routes-high-risk-plants.js` and put back what is missing. `new:set` writes
  this file: do not edit it by hand.
- Skill: `design-release`

### A set is not on the chooser

- You see: `have a folder but are not mounted`.
- It means: a set has a folder but the prototype does not load it.
- Fix: make design releases with `npm run new:set`, which loads them for you.
  See [Design releases](design-releases.md).
- Skill: `design-release`

### A page does not open

- You see: `release-render:`, `showed the error page (404)` or `sent the
visitor outside the set`.
- It means: a page the set's `flow.js` lists does not open, or shows the error
  page.
- Fix: if you added a page, register its controller routes in the set's
  features `index.js` as well as `flow.js` (the add-a-page recipe shows how).
  If a page shows the error page, its template or controller has a mistake:
  the log shows the error just before this line.
- Skill: `change-the-journey`

### A page template has a mistake

- You see: `njk-check:`, `Template render error`, `template not found` or
  `expected block end`.
- It means: a page template (`.njk`) has a mistake, or includes a file that
  does not exist.
- Fix: open the template at the line shown. Check that every `{% %}` tag is
  closed and every include, import or extends path is spelt correctly.
- Skill: `match-the-design`

### Styles or scripts are missing

- You see: `response 404:` and a `/public/` address, `Webpack
assets-manifest.json not found`, or `Module not found`.
- It means: the prototype's styles or scripts were not built, or a page asks
  for one that does not exist.
- Fix: run `npm run build:frontend` (`npm run dev` does this for you). Never
  add webpack entries or client scripts: if a page needs one, log it in your
  release's `design-gaps.md` and tell the maintainer.
- Skill: `run-the-prototype`

### A frozen release was changed

- You see: `frozen-release: plants-dr2 was frozen in 0f54597, and 1 file in it
changed since: …`.
- It means: a file in a release that was frozen at your last save has
  changed. Frozen releases are a record of what was designed.
- Fix: undo the edits to the frozen release, then make the change in a
  working release made from it. To have a change in a frozen release, carry it
  in before you freeze.
- Skill: `design-release`

### A code rule is broken

- You see: `✖ 1 problem (1 error, 0 warnings)` and a line such as
  `12:7 error 'unused' is assigned a value but never used`. The check lists
  each one under "Where" as `file:line rule: message`.
- It means: a code rule was broken, for example an unused name, a missing
  import, a repeated piece of text or a very long function.
- Fix: say "fix the lint errors" and Claude will read each rule and fix it.
  Many are fixed by `npm run lint:js:fix`. A rule about a long or complicated
  function (`sonarjs/cognitive-complexity`, `sonarjs/cyclomatic-complexity`)
  means splitting the code you added into a small helper in the same file.
- Skill: `check-my-change`

### A test failed

- You see: `FAIL` and a `.test.js` file name.
- It means: a test failed that none of the explanations above covers.
- Fix: read the lines under `FAIL` in the log. If the test belongs to the real
  journey (`high-risk-plants`), your change probably altered words or
  behaviour it pins: make the change in your design release instead.
- Skill: `check-my-change`

### Something the check does not recognise

- It means: something failed that the check has no plain explanation for yet.
- Fix: open the log file and read the first error. Or say "what does this
  error mean" and paste the lines.
- Skill: `check-my-change`
