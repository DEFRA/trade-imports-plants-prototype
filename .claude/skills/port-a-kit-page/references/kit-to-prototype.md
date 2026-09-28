# From a Prototype Kit page to a page here

The old prototype was built with the GOV.UK Prototype Kit. Its pages are
Nunjucks too, so much of the markup carries over, but the plumbing around it
is different. This page maps each Kit habit to what this prototype does
instead.

## The page shell

- `{% extends "layouts/main.html" %}` becomes
  `{% extends "shared/layout.njk" %}`, and the page's content goes in
  `{% block journeyContent %}` (not `{% block content %}`).
- `{% set pageName = "..." %}` goes. The page title is the first argument of
  `kit.base(...)` in the controller, taken from copy.
- `{% block beforeContent %}` with a phase banner and back link goes. The
  shared layout draws the phase banner, and the controller passes `backLink`
  to `kit.base`.
- `<div class="govuk-grid-row"><div class="govuk-grid-column-...">` around the
  content goes. The layout draws the row and column. For a full-width page,
  the controller sets `contentColumnClass: kit.surfaceClass('display')`.
- Wrapper `div`s whose only job was an `app-*` class go.

## Words

- Every visible string moves to `copy/copy.en.js`, and the same keys go in
  `copy/copy.cy.js` with `'[Welsh needed] <English>'`.
- Strings built in the Kit's `routes.js` or `app/data/*.js` (option lists,
  hints, error messages) also move to copy. If only a path was given, ask the
  designer for the option text or read it from the old prototype's data file
  if they give its path.
- Keep the designer's words exactly. Style suggestions (for example "please")
  go in the report, never into the copy uninvited.

## Answers and the session

- `data['fieldName']` becomes `values.fieldName` in the template, filled by
  the controller from the saved answers.
- `{% if data.errors.x %}` and `data.errorList` become `errors.x` and the
  shared `{% include "shared/error-summary.njk" %}`, filled by the
  controller's validation.
- `checked` and `selected` written by hand become the macro's `checked` or
  `value` settings.
- Kit routes that branch on an answer (`if (data['x'] === 'yes') res.redirect(...)`)
  become a gate in the flow. That is `change-the-journey`'s `add-a-branch`
  recipe.

## Forms

- `action="/some/url"` on a form goes: a journey page posts to itself.
- Add `<input type="hidden" name="crumb" value="{{ crumb }}" />` and
  `<input type="hidden" name="concurrencyToken" value="{{ concurrencyToken }}" />`
  inside every `method="post"` form.
- A single Continue button becomes
  `{{ saveActions(hubHref, copy = sharedCopy.saveActions) }}`, which also gives
  "Save and return to overview" and "Cancel and return to overview".
- Hand-written radios, checkboxes, inputs and selects become the macros:
  `govukRadios`, `govukCheckboxes`, `govukInput`, `govukSelect`. Keep the
  `name` values from the Kit page when they make sense as field names.
- A conditional reveal (`govuk-radios__conditional`) becomes an item's
  `conditional: { html: ... }` in `govukRadios` or `govukCheckboxes`. Build
  the revealed field's HTML with `{% set %}...{% endset %}` first.

## Things with no direct equivalent

- `app-*` classes and the Sass behind them: dropped. Record any look they gave
  that the new page lacks in the release's `design-gaps.md`.
- Custom JavaScript (`data-module="app-..."`, files in
  `app/assets/javascripts`): dropped. Use the nearest GOV.UK component (see
  `.claude/skills/match-the-design/references/nearest-equivalent.md`) and log a
  gap.
- Links to other Kit pages: point them at the matching page in the release if
  it exists; otherwise at the overview (`hubHref`). Say which in the fidelity
  table.
- Fixture data from `app/data/*.js` (lists of transporters, addresses,
  templates): this is data a service would hold. Use `fake-a-service`: it
  uses a prototype-owned service that fits (`transporters`, `templates`,
  `ins-address-book`), or makes a new one, and its starter rows can come
  from the Kit's list, with made-up names in place of real companies.

## Which kind of page it is

- **Static**: no form, or a form with only a button (guidance, interruption,
  "what happens next"). It collects nothing. Build it with
  `change-the-journey`'s `guidance-page` recipe.
- **Data-collecting**: a form that saves one or more answers. Build it with
  `change-the-journey`'s `add-a-page` recipe (which follows `add-a-field` for
  each answer).
- **List**: shows records from a lookup or a saved list, often with search,
  a table or cards (address book, transporters, templates, a dashboard). Build
  the data with `fake-a-service`, then the page on top of it.
