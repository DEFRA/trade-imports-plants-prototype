# Add a guidance page

## When to use it

Use this recipe for a page that tells people something and asks nothing. For
example:

- "Before the identification numbers, add a page explaining where to find
  them."
- "Add an interruption page before check your answers."
- "Add a 'Before you start' page."

A page that asks even one question is not a guidance page: use the
real-service recipe `src/server/app/sets/high-risk-plants/docs/add-a-page.md`.

## How it differs from a question page

A guidance page collects nothing, so it needs:

- no obligation, no storage binding and no validation
- no row on check your answers
- no change to the example answers

It still needs a place in the journey, so Continue, the first pass and the
task list know where it goes. The sample-journey's welcome page
(`src/server/app/sets/sample-journey/journeys/linear/features/welcome/`) has
the simplest template: a heading and a paragraph. The page below adds a
Continue button.

## Files in a release

`<journey>` means `src/server/app/sets/<release>/journeys/linear`. For a page
called `finding-identification-numbers`:

- new: `<journey>/features/finding-identification-numbers/page.js`,
  `controller.js`, `template.njk`, `copy/copy.en.js`, `copy/copy.cy.js`
- `<journey>/features/index.js`
- `<journey>/flow/flow.js`, `<journey>/flow/run.js`,
  `<journey>/flow/task-rows.js`, and optionally
  `<journey>/flow/section-captions/index.js`
- `<journey>/flow/fixtures/happy-path.json`

Do not create `copy.test.js`, `controller.test.js` or a `.fit.spec.js`: a
release carries no tests.

## Steps

### 1. The page's identity

`page.js` exports only the id and slug, and imports nothing:

```js
export const findingIdentificationNumbersPage = {
  id: 'finding-identification-numbers',
  slug: 'finding-identification-numbers'
}
```

Search the release with the Grep tool for the slug first. It must be new.

### 2. The words

`copy/copy.en.js`:

```js
export const copy = {
  title: 'Finding your identification numbers',
  body: [
    'The supplier identification number is on the plant passport.',
    'Ask your supplier if you cannot find it.'
  ],
  continue: 'Continue'
}
```

`copy/copy.cy.js` has exactly the same keys. With no Welsh from the designer,
write `'[Welsh needed] <the English>'` for every string.

### 3. The controller

```js
import { hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { findingIdentificationNumbersPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/finding-identification-numbers/template`

const copy = copyFor({ en, cy })

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      page
    }),
    copy
  })
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
```

`collects: []` is what makes it a guidance page. Keep `meta`: the flow needs
the page's id even though it collects nothing.

### 4. The template

```njk
{% extends "shared/layout.njk" %}
{% from "shared/save-actions.njk" import saveActions %}
{% from "shared/section-caption.njk" import sectionCaption %}

{% block journeyContent %}
  {{ sectionCaption(caption) }}
  <h1 class="govuk-heading-l">{{ copy.title }}</h1>

  {% for paragraph in copy.body %}
    <p class="govuk-body">{{ paragraph }}</p>
  {% endfor %}

  <form method="post" novalidate>
    <input type="hidden" name="crumb" value="{{ crumb }}" />
    <input type="hidden" name="concurrencyToken" value="{{ concurrencyToken }}" />
    {{ saveActions(hubHref, primary = { text: copy.continue }, copy = sharedCopy.saveActions, showReturnControls = false) }}
  </form>
{% endblock %}
```

Use GOV.UK components for anything more: `govukInsetText`,
`govukWarningText`, `govukDetails`, lists with `govuk-list govuk-list--bullet`.
`match-the-design` has the full set.

`showReturnControls = false` suits a page reached by Continue. If the task
list links straight to this page (step 6), remove it, so the page also offers
"Save and return to overview".

### 5. Register it

In `<journey>/features/index.js`:

- import it: `import * as findingIdentificationNumbers from './finding-identification-numbers/controller.js'`
- add `findingIdentificationNumbers.meta` to `dispatchPages`
- add `...findingIdentificationNumbers.routes` to `allRoutes`

It has no storage binding, so `features/evaluation.js` does not change.

### 6. Put it in the journey

Put it straight before the page it introduces, in each of these:

- `flow/flow.js`: in the same section, before that page. For the example:
  `{ id: 'parties', pages: [consignorPage, findingIdentificationNumbersPage, identificationNumbersPage] }`
- `flow/run.js`: a step before that page's step:
  `{ id: findingIdentificationNumbersPage.id, target: flowPageTarget(findingIdentificationNumbersPage) }`
- `flow/task-rows.js`: in the same row, before that page. If it leads the row,
  the task list links to it, so the guidance shows every time someone opens
  that task. If that is not wanted, put it after the first page of the row, or
  leave it out of the row.
- `flow/section-captions/index.js`: in the same caption section, or leave it
  out for no caption.

Import the page identity at the top of each file you change.

To show it only to some people, give its identity a gate. `add-a-branch`
explains how.

### 7. Add it to the example data

In `<journey>/flow/fixtures/happy-path.json`, add a step to every scenario
that reaches it, in journey order:

```json
{ "slug": "finding-identification-numbers", "fields": {} }
```

The commodities list page already has a step like this.

### A guidance page before the first question

A "Before you start" page before `commodity-type` is a bigger change, because
every new notification must start on `commodity-type`. In the release you
also:

- make it the first step in `RUN_STEPS`, and give it its own section before
  `commodity` in `flow.js`
- change the start button's redirect in
  `<journey>/features/dashboard/controller.js`: it sends new notifications to
  `commodityTypePage.slug`; send them to the new page's slug instead

Leave `flow/entry-guard.js` alone. Anyone who opens the new page without
starting a notification is sent on to `commodity-type`, which is what the real
service does.

## What you will see

Start a new notification. The guidance page appears in the first pass, before
the page it introduces. Continue goes on to that page.

## How to check it

1. `npm run designer:check -- --set <release> --full`
2. `npm run designer:check -- --set <release> --walk`
3. `npm run designer:show -- --set <release> --pages finding-identification-numbers`
4. Give the designer the link to a draft example.

## Hand-off notes

- The real team will decide whether the guidance belongs on its own page, in a
  hint, or in a details component. The brief says which the designer tested.
- Record the recipe as `guidance-page` in the commit message.
