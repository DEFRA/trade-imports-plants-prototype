---
paths:
  - 'src/server/app/sets/**/*.njk'
---

# Page templates

You are editing a page template (`.njk`) in a set. Every rule below keeps the
page real: it must render with the same GOV.UK Frontend the real service uses,
pass the same checks and still hand over cleanly to the plants team.

Before you edit, run `npm run designer:where -- <this file>`. If it says the
file belongs to the real service (for example anything in
`src/server/app/sets/high-risk-plants/`), stop and offer the designer their
design release or the `hand-off` skill instead.

## Build with the GOV.UK toolbox

- Use a Nunjucks macro before raw HTML. Import it at the top of the file, for
  example `{% from "govuk/components/tag/macro.njk" import govukTag %}`. The
  list of what is installed is in
  `.claude/skills/match-the-design/references/components-we-have.md`.
- Never add a `style` attribute or an inline `<style>` or `<script>`. The
  content security policy (`styleSrc: ['self']`) blocks them, so they do
  nothing in the browser and only mislead.
- Use only `govuk-*` classes: the grid (`govuk-grid-row`,
  `govuk-grid-column-*`), typography (`govuk-heading-*`, `govuk-body-*`,
  `govuk-caption-*`) and the override classes (`govuk-!-margin-*`,
  `govuk-!-padding-*`, `govuk-!-width-*`, `govuk-!-font-weight-*`,
  `govuk-!-text-align-*`).
- `moj-*` markup renders only for the MoJ date picker, through the
  `mojDatePicker` macro. No other MoJ component has its styles loaded.
- Never invent an `app-*` class. None is styled for set pages, and new Sass is
  out of bounds. Record what the design wants in the release's
  `design-gaps.md` instead.
- Do not add Sass, client JavaScript or webpack entries. `src/client/**` and
  `webpack.config.js` belong to the real service.

## Keep the words in copy

- No visible text written straight into the template. Put it in the feature's
  `copy/copy.en.js` and `copy/copy.cy.js` and use `{{ copy.<key> }}`.
- Change English and Welsh together. With no Welsh given, write
  `'[Welsh needed] <English>'`.
- Shared words (`sharedCopy.*`) belong to every set: do not change them from a
  template.

## Keep the page's plumbing

- Keep `{% extends "shared/layout.njk" %}` and the `{% block journeyContent %}`
  block.
- Keep `{% include "shared/error-summary.njk" %}` as the first thing in the
  block on any page with a form.
- Keep `<input type="hidden" name="crumb" value="{{ crumb }}" />` in every
  `method="post"` form, and `concurrencyToken` where it is already there.
  Without the crumb, the form fails with a 403.
- Keep `{{ sectionCaption(caption) }}` straight above the `h1`, with nothing
  between them. Match the caption size to the heading: `govuk-caption-l` with
  `govuk-heading-l`, `"govuk-caption-xl"` with `govuk-heading-xl`.
- Keep `{{ saveActions(hubHref, copy = sharedCopy.saveActions) }}` as the end of
  a journey form.
- One `h1` per page. Headings go in order: `h1`, then `h2`, then `h3`. Do not
  skip a level to get a smaller size: change the class instead.

## Keep the names the server reads

- Never change a field's `name`, `id` or the key used in `errors.<key>`. The
  controller reads the name, and the error summary links to the id. Changing
  them breaks saving and error links.
- In `high-risk-plants`, do not change a role, label, legend or button text
  the browser tests find the page by (the `*.fit.spec.js` files beside the
  template). Those tests belong to the real service.

## After the edit

Run `npm run designer:check -- --set <set-id>` and
`npm run designer:show -- --set <set-id> --pages <slug>`. Look at the
screenshot before you say it worked.
