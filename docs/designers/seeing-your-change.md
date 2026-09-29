# Seeing your change

`designer:show` takes pictures of your pages and puts them in a gallery: a
web page you can open, send to someone, or attach to a pull request. It can
show a page before and after your change, with its error messages, at phone
width, next to a Figma frame, or next to the same page in another set. It
also checks each page for accessibility problems and can record a video of
the whole journey.

Ask Claude Code **"show me"** (the `show-my-change` skill), or run it
yourself:

```
npm run designer:show -- --set <set-id>
```

It runs its own private copy of the prototype on a spare port, so the
prototype you have open on port 3103 is never disturbed. It changes none of
your files: `git status` is the same before and after.

## What to ask for

| You want                                        | Ask Claude                      | Or add to the command                                                                                          |
| ----------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| The pages your change affects                   | "show me"                       | nothing                                                                                                        |
| Particular pages                                | "what does origin look like"    | `--pages origin,arrival-details`                                                                               |
| Every page                                      | "show me the whole journey"     | `--pages all`                                                                                                  |
| Before and after                                | "before and after"              | `--before`                                                                                                     |
| Error messages                                  | "show the error messages"       | `--errors`                                                                                                     |
| Phone width                                     | "show it on a phone"            | `--mobile`                                                                                                     |
| Your Figma frame beside the page                | "compare with the Figma"        | `--reference origin=designs/origin.png`                                                                        |
| The same pages in the real journey              | "compare with the real journey" | `--compare high-risk-plants`                                                                                   |
| A video in your gallery, alongside the pictures | "add a video to my gallery"     | `--video`                                                                                                      |
| Everything, for a review or show and tell       | "make a review pack"            | `--pages all --before --errors --mobile`, plus a walkthrough run (see "The walkthrough on every pull request") |
| The gallery opened for you                      | "and open it"                   | `--open`                                                                                                       |
| The prototypes page (the chooser)               | "show me the chooser"           | `--pages chooser`                                                                                              |
| Where example links land                        | "show the example links"        | `--examples submitted,amended`                                                                                 |
| Both sides of a question                        | "show the Yes and the No"       | `--each-example`                                                                                               |
| A filtered dashboard, a tab, a side page        | "show the Submitted tab"        | `--url "?tab=submitted"`                                                                                       |
| The dashboard with no notifications             | "show a new user's dashboard"   | `--no-examples`                                                                                                |
| Compared with an older save                     | "compare with before the undo"  | `--before-commit HEAD~1`                                                                                       |

You can combine any of them. `npm run designer:show -- --help` lists them.

### Any address: `--url`

`--url` photographs any address in your release, written as it shows in the
browser after the release's name. Repeat it for several:

- `--url "?status=submitted"` or `--url "?tab=drafts"`: the dashboard,
  filtered or on a tab. Use one for each state you want to see: filtered,
  a tab, nothing matching, an error.
- `--url "notifications/{notification}/transporter-select/add"`: a page
  inside a notification that is not a step of the journey (an "add" form, a
  confirm page). `{notification}` is the notification the pictures filled in.
- `--url "/"`: an address of the whole prototype, not only your release.

### Both sides of a question: `--each-example`

Normally each page is photographed once, from the first example that reaches
it. `--each-example` photographs it once for every example that reaches it,
named after the example, so a potato notification and a plants one (or the
Yes and the No of a question you added) sit side by side, check your answers
included.

### Page names

A page's name is its address inside a notification: `commodity-type`,
`commodities`, `commodities/details`, `origin`, `arrival-status`,
`arrival-details`, `destinations/select`, `consignors/select`,
`identification-numbers`, `consignment/contact/select`, `notification-view`
(check your answers), `declaration`, `confirmation`. Two pages have names of
their own: `dashboard` and `hub` (the task list).

You can also use `check-answers` and `task-list`, a page's id
(`consignor-select`, as `designer:words -- find` prints it), or write
`commodities-details` for `commodities/details`. `chooser` is the prototypes
page. `changed,dashboard` gives the changed pages and the dashboard. A name it
does not know gets a list of the right ones.

### Which pages "the pages your change affects" means

With no `--pages`, it looks at every file you have changed or added since your
last save, and works out the pages:

- a file in a page's own folder (`features/<page>/`): that page
- a file shared by the whole release (its flow, captions, obligations,
  example answers): every page in the release. For a wording change to a
  caption or the task list, that is more than you need: name the pages
  instead. `npm run designer:words -- find "<words>"` ends with the exact
  command for the pages the words are on.
- tests, docs and notes: no page
- files outside a set: no page. Use `--pages` to name the pages you want.

If nothing you changed shows on a page, it says so and takes no pictures.

### Before and after

`--before` photographs your last saved version (your last commit) next to
your working copy. It unpacks that saved version into your computer's
temporary folder and runs it there, so nothing in your working folder is
touched: no stash, no switching branches. The first `--before` for a saved
version takes a little longer; later runs reuse it.

A release you have never saved has no "before" yet. The gallery says so.

The before pictures use today's styles and scripts. That makes no difference
unless someone changed `src/client/`, which belongs to the real service.

Every run makes its example notifications afresh, with new reference
numbers. So that before and after match, the pictures show each reference
as a stand-in, in the order the page shows them: GBN-HRP-26-EXMP01, then
EXMP02, and so on. The prototype itself, and the example links, show the
real numbers.

### A Figma frame beside the page

Export the frame from Figma as a PNG (select the frame, then Export, PNG, 1x).
Save it somewhere in the prototype's folder, for example
`.cache/designer/refs/origin.png` (git ignores `.cache/`, so it is never
committed by accident), and add:

```
--reference origin=.cache/designer/refs/origin.png
```

Add one `--reference` for each page. The picture appears next to that page in
the gallery. To match the page to the frame, ask Claude "make this page match
the design" (the `match-the-design` skill).

## How it reaches each page

Most pages only exist inside a notification, after the pages before it are
answered. `designer:show` fills them in for you, using your set's example
answers in `journeys/linear/flow/fixtures/happy-path.json`: the same answers
the example notifications use. For each page, it uses the first example that
answers that page, signs in, sends the answers for every page before it, and
photographs the page as a trader first sees it: empty.

- **Dashboard** is photographed last, with your release's example
  notifications on it (the same ones `npm run dev` makes, late tags
  included) and the notifications the pictures filled in. `--no-examples`
  leaves the examples out.
- **Task list (hub)** is photographed when the first example has answered
  every page.
- **Check your answers, declaration and confirmation** are reached by
  carrying on from the task list, the way a trader does.

A page no example answers cannot be reached. The gallery lists it under
"Pages no example reaches". To fix that, add the page to the release's
`happy-path.json` (ask Claude "add this page to the example's route", or use
the `example-data` skill).

If an example is refused part of the way ("The example ... stopped at origin:
the page said ..."), the page did not accept its answers, just as it would
refuse a trader. That usually means a question changed. Update the answers in
the release's `happy-path.json` (the `example-data` skill explains how).

## Reading the gallery

The last lines of the run name the gallery:

```
Gallery: .cache/designer/show/<set-id>/<date and time>/index.html
Newest gallery for this set, always: .cache/designer/show/<set-id>/latest/index.html
```

Open `index.html` in your browser. For each page it shows:

- **The page**: your working copy, with the before version, the other set
  or your reference image beside it when you asked for them.
- **With error messages (the form sent empty)**: what a trader sees when they
  press the main button without answering. Some pages move on instead (a list
  page, or one with an answer already chosen); the gallery says so.
- **At phone width (320px)**: the width GOV.UK pages must work at without
  scrolling sideways.
- **Accessibility**: the automatic check's result in plain words, with a link
  explaining each problem and how to fix it. It checks against WCAG 2.2 AA.
  It cannot catch everything, so still look at the page yourself.
- **Address**: the page's address, with `<reference>` where a notification's
  reference number goes. To open the page yourself, use an example link
  (`npm run designer:examples -- links <set-id>`).

At the top: the set, when the pictures were taken, your last saved version,
what you asked for, a link to your running prototype, and any notes. At the
bottom: pages no example reaches, and the files you had changed.

Each picture file is named `<page>--<version>--<state>--<width>.png`, for
example `arrival-details--before--page--desktop.png`. Versions are `now`,
`before`, `compare` and `reference`.

The folder also holds:

- `manifest.json`: everything the gallery shows, as data. Claude reads it to
  describe the pictures and to write your pull request.
- `axe.json`: the full accessibility results.
- `walk.webm`: the walkthrough video, when you asked for one. It fills in the
  first example's answers on screen, slowed down so people can follow it, all
  the way to confirmation. Open it in a browser.
- `server.log`: what the private prototype printed, for when something goes
  wrong.

The folder is complete on its own: zip it and send it, and it opens anywhere.
Old galleries stay until you delete them. They are never committed.

## The walkthrough on every pull request

Every pull request, and every push to `main`, publishes a **walkthrough**: a
run through every example in every release on the branch, page by page, with
a picture of each page, a video and a trace. It is documentation, not a
test: a red story is reported, but it never blocks the pull request.

For a pull request, within about ten minutes, a comment appears on it with
the report's link. Add `#?q=@walkthrough` to see only the walkthroughs, or
`#?q=@<release-id>` for one release's alone. Once the work is on `main`
(pushed straight there or merged), the lasting link is
`https://defra.github.io/trade-imports-plants-prototype/#?q=@walkthrough`.
If the comment says GitHub Pages is not turned on for this repository yet,
download the `prototype-playwright-report` Actions artifact from the run
instead and open its `index.html`.

Each story in the report is one example, walked through:

- its name is the example's `label`, or the one-sentence `story` you gave it;
- each step is named after the page's own heading, with a picture, and any
  note the walk made — "Sent directly" means the answers were posted to the
  page's own route because the on-screen form did not move on, and "the
  story stops here, left to fill in" means the example's `through` stopped
  there on purpose;
- the video and the trace sit alongside it, for the whole story.

The browser tests still walk every design release too, separately from the
walkthrough:
`fit/designer-sets.fit.spec.js` fills in each example in each release's
`happy-path.json`, on screen, all the way to confirmation, and checks every
page for serious accessibility problems. It is part of the same report,
under its own filter.

The weekly update runs the same checks, so it also notices when the real
team's changes break one of your releases.

## Record a walkthrough on your laptop

Ask Claude to **"record a walkthrough"**, or run:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:walkthrough -- --set <set-id>
```

It takes a few minutes: it walks every example in the set, page by page, and
opens the report in your browser when it is done. `--all` walks every set;
leave `--set` out and it uses your working release. Run
`npm run designer:walkthrough -- --show` on its own to open the last report
again without making a new one.

## If something goes wrong

| You see                                                                  | What it means                                                     | What to do                                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| "None of your changes show on a page in ..."                             | Your changes are not in a page's folder, or you have none         | Name the pages with `--pages`, or use `--pages all`               |
| "There is no page called ..." or "There is no set called ..."            | A name is misspelt                                                | Use a name from the list it prints                                |
| "The example ... stopped at <page>: the page said ..."                   | The page refused the example's answers                            | Update the release's `happy-path.json` (the `example-data` skill) |
| "... is not in your last saved version, so there are no before pictures" | The release has never been saved                                  | Save it once, or leave out `--before`                             |
| "The browser designer:show uses is not installed"                        | The picture-taking browser is missing                             | `npm run playwright:install`                                      |
| "The prototype stopped before it was ready"                              | Your change stops the prototype starting                          | Ask Claude "check my changes"                                     |
| "Building the prototype styles and scripts first"                        | Styles were missing or out of date                                | Nothing: it builds them, once                                     |
| "The prototype could not give the browser ... file(s)"                   | Fonts, styles or scripts did not load, so pictures may look plain | Run again; if it keeps happening, tell the prototype's maintainer |
| "The list of changed files moved while the pictures were being taken"    | Something else changed files during the run                       | Run again when nothing else is saving files                       |

## Related guides

- [Your first hour](your-first-hour.md): from nothing to a shared change
- [Checks and errors](checks-and-errors.md): checking a change works
- [Example data](example-data.md): examples, their answers and their links
- [Sharing and handing off](sharing-and-handing-off.md): putting the gallery
  in a pull request
