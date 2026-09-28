---
name: show-my-change
description: 'Take pictures of a designer''s pages and put them in a gallery they can open, send or attach to a pull request: runs designer:show on its own private copy of the prototype (never the designer''s running one), reaching each page by filling in the set''s example answers, with before and after pairs, error states, phone width, a Figma frame or screenshot beside a page, the same page from another set (such as the real journey), accessibility results in plain words and a slowed-down walkthrough video. Reads the key pictures itself before describing them, and never claims a result it has not looked at. Use when a designer says "show me", "screenshot my pages", "what does it look like", "what does the X page look like", "before and after", "compare with the Figma", "compare with the real journey", "show it on a phone", "show the error messages", "record a walkthrough", "make a demo video" or "make a review pack". NOT for checking whether a change works or passes the tests (use check-my-change), for starting the prototype to click through yourself (use run-the-prototype), for changing a page (use change-the-words, match-the-design or change-the-journey) or for saving and sharing the change (use share-my-change).'
---

# Show my change

You are helping an interaction or content designer see what their pages look
like, and show them to others. They know HTML, Nunjucks and the GOV.UK Design
System. They are not JavaScript developers. Reply in GDS plain English: short
sentences, active voice, no jargon without a plain explanation.

Say "your design release", "the gallery" and "your last saved version" (the
last commit), not "set", "manifest" or "HEAD".

## Guard rails

- **Look before you describe.** Read the pictures with the Read tool before
  saying anything about how a page looks. Never say "it looks right", "the
  error shows" or "they match" about a picture you have not opened. If you
  cannot open one (the video, for example), say so.
- **Showing changes nothing.** `designer:show` runs its own copy of the
  prototype on a spare port (3203 or above), never port 3103, and writes only
  under `.cache/designer/`, which git ignores. `git status` is the same
  before and after. Do not stop the designer's `npm run dev`.
- **This skill does not fix pages.** If a picture shows a problem, describe
  it and offer the skill that fixes it. That skill runs
  `npm run designer:where -- <path>` and checks `overrides.json` before any
  edit: anything not in its `ours` list belongs to the real service and is
  never edited on a `design/*` branch.
- **One Bash command per call.** Never commit or push from here
  (`share-my-change` does that).

## Step 1: Find the set

Use the set the designer named. If they did not name one, use their working
release: the set they changed most recently under
`src/server/app/sets/` (not `high-risk-plants` or `sample-journey`). If they
have none, and they want the real journey, use `high-risk-plants`. If you
cannot tell, ask.

## Step 2: Choose what to show

Build one command from what they asked:

| The designer asked for                            | Add                                                |
| ------------------------------------------------- | -------------------------------------------------- |
| "show me", "screenshot my pages" (after a change) | nothing: the pages their changed files show up on  |
| "what does the X page look like"                  | `--pages <X>`                                      |
| every page, "the whole journey"                   | `--pages all`                                      |
| "before and after"                                | `--before`                                         |
| "show the error messages"                         | `--errors`                                         |
| "on a phone", "mobile"                            | `--mobile` (320 pixels wide)                       |
| "compare with the Figma", a design they attached  | `--reference <page>=<image>` (one per page)        |
| "compare X with the real journey"                 | `--pages <X> --compare high-risk-plants`           |
| "compare with release X"                          | `--pages <the pages> --compare <X>`                |
| "record a walkthrough", "demo video"              | `--video`                                          |
| "make a review pack"                              | `--pages all --before --errors --mobile --video`   |
| "open it" when done                               | `--open`                                           |
| "the chooser", "the list of prototypes"           | `--pages chooser`                                  |
| "where the X example link goes"                   | `--examples <slug>,<slug>`                         |
| both sides of a question, "the Yes and the No"    | `--each-example` (one picture per example)         |
| a filtered dashboard, a tab, an add or side page  | `--url "<address after the set name>"` (see below) |
| an empty dashboard, as a new user sees it         | `--no-examples`                                    |
| "compare with before the undo", an older version  | `--before-commit HEAD~1` (or a commit id)          |

Page names are the page's address inside a notification, for example
`arrival-details`, `origin`, `commodities/details`,
`consignment/contact/select`, or `dashboard`, `hub` (the task list, also
`task-list`), `check-answers` (also `notification-view`, its id),
`declaration`, `confirmation`. A page id from `designer:words -- find`
(`consignor-select`) and a picture's file name (`consignors-select`) work
too. Separate several with commas, and add `changed` to keep the changed
pages as well (`--pages changed,dashboard`). A wrong name gets a list of the
right ones.

**Once a change is saved, name the pages.** With no `--pages`, show
pictures the pages your _unsaved_ changes are on. After a save there are none,
so `--compare`, `--before` and `--video` runs made after a save picture no
pages (it says so). Always give `--pages` with `--compare`, and use
`--pages <pages> --before-commit <the commit before the change>` for a
before-and-after of saved work.

`--url` pictures any address in the set, written as it shows in the browser
after the set's name. Repeat it for several:

- `--url "?status=submitted"`: the dashboard with a filter or a tab
  (`?tab=drafts`)
- `--url "transporters"`: a page of the set outside a notification
- `--url "notifications/{notification}/transporter-select/add"`: a page
  inside a notification; `{notification}` becomes the one the pictures filled
  in, which has answered every page
- `--url "/"`: an address of the whole prototype (it starts with `/`)

`--errors` also pictures each `--url` page sent empty, when it has a form.

The dashboard is pictured with the release's example notifications on it (the
same ones `npm run dev` makes), plus the notifications the pictures filled in.

A question page is pictured the first time an example reaches it, **before**
the example answers it, so its boxes are empty even though check your answers
later shows the answer (P123, say). That is expected: say so if the designer
asks. Not every example visits every page: potatoes have no consignor, for
example, so a potato example's check your answers has no consignor card. For
words on a page only some commodities see, add `--each-example` or name an
example that visits it (`designer:examples -- fixtures <set>` lists which
fixture visits which page).

A reference image must be a picture file: PNG, JPEG, GIF, WebP or SVG. A PDF
does not work: ask for the frame exported as PNG. The path can be relative to
the prototype's folder. To get the designer's Figma frame into a file:

- Best: in Figma, select the frame, Export, PNG, 1x, and give you the file's
  path. Dragging the file into the terminal pastes its path.
- If they pasted the image into the chat, you can see it but cannot save it
  as a file. Say so, and ask for the exported file's path. If they say it is
  in Downloads, run `ls -t ~/Downloads` and take the newest image with a
  matching name.
- Copy it to `.cache/designer/refs/<page>.png` with `cp`, so the next run
  finds it too.

Never draw a stand-in wireframe and present it as their design, and never
reuse a file already in `.cache/designer/refs/` unless the designer gave it
to you in this conversation: an earlier run may have left a stand-in there.
With no frame from the designer, picture the page on its own and say "no
design frame was given to compare with". A frame exported at a different
width from the page picture (1280 pixels) is still fine to compare by eye;
say its size if it differs a lot, and ask for a 1x export if it looks
cropped.

`--before` compares with the last saved version (commit). A release that has
never been saved has no before picture; the gallery says so. After an undo,
use `--before-commit HEAD~1`: the last saved version is then the undo itself,
so a plain `--before` pair would match.

## Step 3: Run it

Tell the designer how long to expect: under a minute for a few pages, a few
minutes for `--pages all`, `--before` or `--video`.

```bash
npm run designer:show -- --set <set-id> <options from step 2>
```

If npm says `Missing script: "designer:show"`, the designer tools are not on
this branch. Say so and stop.

What it can say instead of a gallery:

| It says                                                | Do this                                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "None of your changes show on a page in ..."           | Run again with the pages named (`--pages <X>`); ask which pages if you cannot tell. With `--video` the walkthrough is still recorded, and the same line is the gallery's first note |
| "There is no page called ..."                          | Use a name from the list it prints                                                                                                                                                  |
| "There is no set called ..."                           | Use a set from the list it prints                                                                                                                                                   |
| "Cannot find the reference image ..."                  | Ask for the right path                                                                                                                                                              |
| "The browser designer:show uses is not installed"      | Run `npm run playwright:install`, then run show again                                                                                                                               |
| "The prototype stopped before it was ready" with a log | The change stops the prototype starting: use `check-my-change`                                                                                                                      |

## Step 4: Read the pictures

The last lines name the gallery, for example
`.cache/designer/show/<set-id>/<date-and-time>/index.html`, and a
`latest` folder that always holds the newest run. Pictures sit beside it,
named `<page>--<version>--<state>--<width>.png` (with `--each-example`, the
page is `<page>_<example>`, and a `--url` address is written with `_` for
`?`, `=` and `{ }`):

- version: `now` (the working copy), `before` (last saved version),
  `compare` (the other set), `reference` (their image)
- state: `page`, or `errors` (the form sent empty)
- width: `desktop` (1280 pixels) or `mobile` (320 pixels)

Read `manifest.json` in that folder: each page's pictures, its accessibility
results (`axe`), and notes. Then open, with the Read tool, at least:

- every `now` picture of the pages the designer changed or asked about
- its partner (`before`, `compare` or `reference`) when there is one
- every `errors` picture when they asked about errors

For `--pages all`, open the changed pages and any page with a note or an
accessibility problem, and say which pages you did not open.

## Step 5: Tell the designer what you saw

Keep it short and concrete:

- **Each pair:** what is different, in words ("the hint under 'Expected time
  of arrival' now reads 'Use the 24-hour clock, like 09:15 or 17:45'"), or
  "no visible difference" if you looked and found none. The notification
  reference (GBN-HRP-26-…) and today's dates differ between the before and
  after pictures, because each copy of the prototype makes its examples
  afresh: never report those as a change. For a reference
  image, list every visible difference: spacing, sizes, order, wording,
  colour, missing or extra parts. `match-the-design` can close the gaps.
- **Error states:** which messages the error summary lists. If a page moved
  on instead ("Sending this page empty moved on"), say it has no error state
  for an empty form.
- **Phone width:** anything cut off, squashed or wrapping badly.
- **Accessibility:** the manifest's result in plain words. The check is
  automatic and cannot catch everything; say so when it finds nothing.
- **Notes:** repeat any note, for example an example that stopped before a
  page, a page no example reaches, or files the pages could not load (the
  pictures may then be missing fonts or styles, not the design's fault). The
  command prints each page's notes as "Note on <page>: …".
- **Video:** give the `walk.webm` path. You cannot watch it, so say so; the
  designer can open it in a browser.

## Step 6: Offer the gallery

Give the path of `index.html` (for example
`.cache/designer/show/<set-id>/latest/index.html`) and say they can open it
in a browser, or add `--open` next time. The folder is self-contained: it can
be zipped and sent.

Then offer:

- **For a pull request:** "Say 'save my work' and I will commit your change
  and write the pull request from this gallery." (`share-my-change` reads
  `manifest.json` for its "What it looks like" section.)
- **As a private web page,** only where your host can publish one (for
  example an Artifact tool): "I can publish this gallery as a private page
  you can share by link. Shall I?" Publish only after they say yes, and only
  their prototype's pictures.

## Step 7: Verify

Before you finish, make sure you:

- ran `designer:show` in this conversation and it printed "Gallery:"
- opened every picture you described
- gave the gallery path from this run, not an older one

If any is not true, say what you did not do.

## Step 8: Hand-off

If they have not saved yet, say: "Say 'save my work' when you are happy
(`share-my-change`)." If something looked wrong, name the skill that fixes it
(`change-the-words`, `match-the-design`, `change-the-journey` or
`example-data`).

End with the hand-off line, word for word:

"If this should become part of the real service, say 'hand this to the real
team' and I will prepare a brief and a patch for the plants-frontend team."

## References

- `docs/designers/seeing-your-change.md`: every option, reading the gallery,
  the pull request video
- `scripts/designer/show/`: how it works (`cli.js` is the entry point)
- `fit/designer-sets.fit.spec.js`: the walk every design release gets on
  every pull request
