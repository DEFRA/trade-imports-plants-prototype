# What a port of the fixture page should produce

The fixture `transporter-type.kit.html` is a real page from the old Prototype
Kit prototype, adapted to stand alone. Use it to try `port-a-kit-page` in a
scratch release and to check the result against this page.

## How to run it

In a working release (here `plants-working`), say:

> Re-create this Prototype Kit page from the old prototype in my working
> release, straight after arrival details:
> `.claude/skills/port-a-kit-page/references/examples/transporter-type.kit.html`

The workflow's arguments are:

```text
{
  "set": "plants-working",
  "source": ".claude/skills/port-a-kit-page/references/examples/transporter-type.kit.html",
  "sourceKind": "html",
  "slug": "transporter-type",
  "after": "arrival-details",
  "reference": null
}
```

## The inventory

The inventory step should find at least this. The page kind is
`data-collecting`, because it has a form that saves an answer.

```text
title:       Choose a transporter type
pageKind:    data-collecting
headings:    h1 "Choose a transporter type" (class app-transporter-add-page__heading)
caption:     "Add a new transporter" (a p with app-transporter-add-page__caption)
components:  phase banner, back link, warning text, error summary, radios
             (hand-written HTML, not the macro), text input (in a reveal), button
fields:      transporterType (radios, required: "Select a transporter type")
               private   "Private transporter"
               commercial "Commercial", hint "This can only be a commercial
                          transporter from Northern Ireland."
               other     "Something else"
             transporterTypeOtherDetail (text, label "Describe the transporter")
reveals:     transporterType = other shows transporterTypeOtherDetail
strings:     every label, hint, heading, warning, link and button text above
links:       "Search saved transporters instead" -> /transporter
             "give your feedback by email" (phase banner) -> #
             "Back" -> /transporter
appClasses:  app-transporter-add-shell, app-transporter-add-page,
             app-transporter-add-page__header, app-transporter-add-page__caption,
             app-transporter-add-page__heading, app-transporter-add-page__warning,
             app-transporter-add-form, app-transporter-add-page__question,
             app-transporter-add-radios, app-transporter-add-page__detail,
             app-transporter-add-page__help,
             app-transporter-add-page__continue-button
```

## The build

In `src/server/app/sets/plants-working/journeys/linear/features/transporter-type/`:

- `page.js`: `{ id: 'transporter-type', slug: 'transporter-type' }`
- `template.njk`: extends `shared/layout.njk`; the error summary include;
  `sectionCaption(caption)`; the warning as `govukWarningText`; the question
  as `govukRadios` with the legend as the page heading
  (`isPageHeading: true`, `govuk-fieldset__legend--l`); "Something else" with
  `conditional: { html: ... }` holding a `govukInput`; the link in a
  `govuk-body` paragraph; `saveActions` at the end
- `copy/copy.en.js` and `copy/copy.cy.js`: every string, with
  `'[Welsh needed] <English>'` on every Welsh leaf
- `controller.js`, `evaluation.js` and the obligations: made by the
  add-a-page recipe that `change-the-journey` routes to, with no test files

The page sits after `arrival-details` in the release's `flow.js`, and the
release's `happy-path.json` gains a `transporterType` answer so the examples
still reach the end.

## The fidelity table

The fidelity step should give this, give or take the wording:

```text
| # | In the old page | In the prototype | Verdict |
| 1 | Caption "Add a new transporter" | The section caption the flow gives this page | Nearest |
| 2 | Heading in bespoke style (app-transporter-add-page__heading) | Legend as page heading, govuk-fieldset__legend--l, same words | Nearest |
| 3 | Visually hidden legend repeating the heading | One heading: the legend is the h1 | Matched (better for screen readers) |
| 4 | Warning text | govukWarningText, same words | Matched |
| 5 | Error summary | shared error summary include | Matched |
| 6 | Hand-written radios with a hint | govukRadios with the same options and hint | Matched |
| 7 | "Something else" reveals a text input | govukRadios conditional with govukInput | Matched |
| 8 | Link "Search saved transporters instead" to /transporter | Link to the overview until a transporter search page exists | Nearest |
| 9 | Continue button | saveActions: Save and continue, plus the two return controls | Nearest |
| 10 | Full-width column and bespoke wrappers | Two-thirds question column | Nearest |
| 11 | 12 app-* classes | None | Design gap for any look they gave that the gallery shows is missing |
| 12 | Phase banner and back link | From the shared layout | Matched |
```

Every "Nearest" row the designer cares about, and row 11, become rows in
`src/server/app/sets/plants-working/design-gaps.md`.

## Acceptance

The port passes when:

1. `npm run designer:check -- --set plants-working --full` passes, so the
   release boots with the new page.
2. `npm run designer:show -- --set plants-working --pages transporter-type`
   gives a screenshot of the new page with the radios and the warning.
3. The workflow's report has a fidelity table with a verdict on every row.
4. No file outside `src/server/app/sets/plants-working/` and
   `src/server/app/routes-plants-working.js` changed.
