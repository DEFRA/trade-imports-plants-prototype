# Prototype-owned services

A prototype-owned service stands in for a service the real plants frontend
does not have yet: a transporter register, notification templates, anything a
design needs to look up, list or save. It is built exactly the way the real
services are, in the place the real services live:

```
src/server/app/services/<name>/
  index.js         picks stub.js or client.js with isStubDataMode(), one named export per operation,
                   plus NEEDS_A_REAL_SERVICE (one plain sentence) and CONTRACT (the API a developer builds)
  client.js        the proposed real client: calls the API at an env URL, with the organisation and
                   tracing headers the real clients send, and a toRecord mapping
  stub.js          the starter rows as a JS array, and a store kept per design release and per organisation
  <name>.test.js   the stub's behaviour, and the client's requests and mapping with fetch stubbed
```

`overrides.json` lists each one on its own line in `ours`
(`src/server/app/services/<name>/**`), so the weekly update leaves it alone,
and `designer:where` answers "Yours" for its files. Every other folder under
`src/server/app/services/` belongs to the real service.

Two rules keep the service ready to hand over:

- **`index.js` and `client.js` never import `src/server/prototype-support/`.**
  A developer copies them into plants-frontend unchanged.
- **`stub.js` imports only `src/server/prototype-support/` from the
  prototype's own code** (`fake-store.js` and `search-page.js`). That
  plumbing keeps each design release's data apart, saves it across a restart
  on the designer's computer, and lets the chooser's Reset clear one release
  only, the way a real multi-tenant backend keeps each organisation's data
  apart.

Pages import a prototype-owned service the way they import a real one. They
never import `src/server/prototype-support/`.

Every prototype-owned service is flagged "needs a real service". Say it to
the designer, add a `design-gaps.md` row for it (SKILL.md step 7), and the
hand-off reads its `CONTRACT` to describe what a developer has to build.
`npm run designer:service -- list` prints each service with its sentence.

## What is there already

| Service               | Owner of the real one | What it does                                                                                                                                                                                                     |
| --------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transporters`        | a new API             | Search an organisation's saved transporters, read one, add one, delete one. Seven made-up starters. Plants-frontend removed its transporter pages on purpose, so there is nothing to copy from the real journey. |
| `templates`           | the plants backend    | Save a notification's answers under a name, list and search them, read one, delete one. No starters.                                                                                                             |
| `ins-address-book`    | the INS frontend      | The Import Notification Service's own address book API: list, create, read, change and delete an address. The journey's pickers see every change. See `address-book-pages.md`.                                   |
| `notification-search` | the plants backend    | Dashboard filters, tabs and counts. See `dashboard-filters-and-tabs.md`.                                                                                                                                         |

`transporters` and `templates` answer a search in the address book picker's
shape, so any page built like the address book picker can use them:

```js
listTransporters(orgId, { search, page })
// → { results, total, page, totalPages, pageSize }   (5 to a page)
```

`orgId` is always `organisationIdOf(request)` from
`src/server/common/helpers/organisation-id.js`. Rows people add belong to
their organisation and their design release. Starter rows are seen by
everyone.

A refused save throws a 400 problem, the way the INS address book does. Two
helpers in each `index.js` turn it into a form's errors:

```js
try {
  await transporters.createTransporter(orgId, values)
} catch (error) {
  if (!transporters.isValidationFailure(error)) {
    throw error
  }
  const refused = transporters.mapApiErrorsToFormErrors(error.body) // { field: message }
}
```

### Transporters: every function

From `src/server/app/services/transporters/index.js`:

| Function                                    | Answers                                                                                                                                                                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listTransporters(orgId, { search, page })` | One page of transporters whose name, address or approval number contains `search`.                                                                                                                                                                  |
| `getTransporter(orgId, id)`                 | One transporter, or `undefined`.                                                                                                                                                                                                                    |
| `createTransporter(orgId, body)`            | Saves and returns the new transporter, with an `id` made from its name and `approvalStatus: 'new'`. Refuses (400) a missing `name`, `transporterType`, `addressLine1`, `townOrCity` or `country`, and a type that is not `commercial` or `private`. |
| `deleteTransporter(orgId, id)`              | `true` when deleted (a starter is hidden for that organisation until Reset), `false` when there was none.                                                                                                                                           |
| `TRANSPORTER_TYPES`, `PAGE_SIZE`            | `['commercial', 'private']` (their labels go in copy), and `5`.                                                                                                                                                                                     |

`createTransporter` takes the API's field names: `name`, `transporterType`,
`approvalNumber`, `addressLine1`, `townOrCity`, `postcode`, `country`. Name a
form's fields the same, and the form posts straight to it. A transporter
comes back looking like an address book record, plus three fields:

```js
{
  id: 'harbourline-haulage-ltd',
  name: 'Harbourline Haulage Ltd',
  deleted: false,
  address: { addressLine1, townOrCity, postalOrZipCode, country },
  approvalNumber: 'UK/SUFFOLK/T1/00092001',
  transporterType: 'commercial',   // or 'private'
  approvalStatus: 'approved'       // or 'new'
}
```

**A working example.** The placeholder set has real pages on this service:
`src/server/app/sets/sample-journey/journeys/linear/features/saved-transporters/`
(a search with paging, an add form whose errors come from the service, and a
delete page with a check). Open it at
`http://localhost:3103/sample-journey/transporters`. Copy its files into a
release; never import them from another set.

### Templates: every function

From `src/server/app/services/templates/index.js`:

| Function                                                     | Answers                                                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `listTemplates(orgId, { search, page })`                     | One page of templates, newest first, whose name contains `search`. Rows leave out the saved answers. |
| `getTemplate(orgId, id)`                                     | One template with its answers (`fulfilment`), or `undefined`.                                        |
| `createTemplate(orgId, { name, fulfilment, fromJourneyId })` | Saves and returns a template. Refuses (400) an empty `name`.                                         |
| `deleteTemplate(orgId, id)`                                  | `true` when deleted.                                                                                 |

A template's answers belong to one release's questions, so templates are kept
per release. A template saved in one release never shows in another.

The code that reads and writes notifications for templates belongs to the
release, not the service: see worked example 2.

## Where the imports come from

A release's feature folder is
`src/server/app/sets/<release>/journeys/linear/features/<feature>/`. From a
file in it:

| Import                             | Path                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A service, real or prototype-owned | `'../../../../../../services/<name>/index.js'`                                                                   |
| Shared paths, kit, copy            | `'../../../../../../shared/paths.js'`, `'../../../../../../shared/kit.js'`, `'../../../../../../shared/copy.js'` |
| The engine                         | `'../../../../../../engine/index.js'`, `'../../../../../../engine/journey.js'`                                   |
| The organisation                   | `'../../../../../../../common/helpers/organisation-id.js'`                                                       |
| The release's templates folder     | `import { TEMPLATES } from '../../config.js'`                                                                    |

Count the `../`: six reach `src/server/app/`, seven reach `src/server/`. One
too few or too many and the release will not start; `designer:check -- --full`
says which file.

## Worked example 1: pick a transporter

The designer says: "After arrival details, add a Transporter page like the one
in the GB prototype: search saved transporters, pick one from the list, or add
a new one."

This is one request with three parts, all done in this run (it is the
designer's one change, even though it adds two pages):

1. **A new journey page that stores an answer.** That is
   `change-the-journey` (the add-a-page recipe): a new obligation named
   `transporter` (stored as `{ transporterId }`), the page, and its place in
   `flow.js`. Do it first.
2. **The picker behind the page, and its "add a new one" page.** That is this
   reference.
3. **The answer on check your answers.** Also this reference, below. The
   add-a-page recipe's own check-your-answers step does not cover a record
   that lives in a prototype-owned service.

The names are settled here, whatever the old page was called: the page is
`transporter-select` (folder `features/transporter-select/`, slug
`transporter-select`), and the add page is `transporter-select/add` (folder
`features/transporter-add/`). This follows the picker it is copied from
(`consignors/select`), so its links and tests read the same way.
`port-a-kit-page` follows these names too when it ports a list page.

The address book picker is the pattern. The consignor page
(`features/consignor-select/`) is one picker page built on it. In the release:

1. Copy `features/address-book-picker/` to `features/transporter-picker/`.
2. In the copy's `render.js`, read the transporters service in place of the
   address book:

   ```js
   // was: import * as addressBook from '../../../../../../services/address-book/index.js'
   import * as transporters from '../../../../../../services/transporters/index.js'
   ```

   and in the two places it is used:

   ```js
   const record = await transporters.getTransporter(orgId, selectedId) // was addressBook.party
   const found = await transporters.listTransporters(orgId, {
     search: query,
     page: pageNumber
   }) // was addressBook.search
   ```

3. Copy `features/consignor-select/` to `features/transporter-select/`. In the
   copy, import `chosenFor` and `renderPicker` from `../transporter-picker/render.js`,
   store `{ transporterId: chosen.id }` where it stored
   `{ addressId: chosen.id }`, and write the page's words in its `copy/` pair.
   The consignor's name is written in more places than `CONSIGNOR`. Change
   every one, or the picker never saves (the form posts a `consignor` field
   the controller no longer reads):

   | File            | Was                                                                                | Becomes                                                                   |
   | --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
   | `fields.js`     | `export const CONSIGNOR = 'consignor'`                                             | `export const TRANSPORTER = 'transporter'` (and every use)                |
   | `template.njk`  | `name: "consignor"` on the row radios                                              | `name: "transporter"`                                                     |
   | `template.njk`  | `<p id="consignor-error" …>`                                                       | `<p id="transporter-error" …>`                                            |
   | `controller.js` | `copy.errors.consignor`                                                            | `copy.errors.transporter` (and the key in both copy files)                |
   | `controller.js` | `answers[CONSIGNOR]?.addressId`                                                    | `answers[TRANSPORTER]?.transporterId`                                     |
   | `page.js`       | `consignorPage`, `id: 'consignor-select'`, `slug: 'consignors/select'`             | `transporterPage`, `'transporter-select'`, `'transporter-select'`         |
   | `evaluation.js` | `feature('consignor-select', …)`, `field: 'consignor'`, the `consignor` obligation | `'transporter-select'`, `'transporter'`, the new `transporter` obligation |

   Then search the new folder for what is left: `grep -rn -i consignor src/server/app/sets/<release>/journeys/linear/features/transporter-select`
   must print nothing.

4. The table's rows already read `name` and the `address` lines, which a
   transporter has. To show the approval number or the type, **do not add
   columns**: the table already has five, and seven run off the right-hand
   edge at phone width. Fold them into the name cell as extra lines instead,
   so the table stays at four columns plus the radio:

   ```njk
   {% set nameCell %}
     {{ row.name }}
     <span class="govuk-body-s govuk-!-display-block govuk-!-margin-bottom-0">{{ copy.table.approval }} {{ row.approvalNumber }}</span>
     <span class="govuk-body-s govuk-!-display-block govuk-!-margin-bottom-0">{{ row.typeText }}</span>
   {% endset %}
   ```

   and use `{ html: nameCell }` in place of `{ text: row.name }`. Add
   `approvalNumber` and `typeText` to the copied `view-model.js` row (the type
   words from copy, keyed by `TRANSPORTER_TYPES`). Picture it with `--mobile`
   and look at the phone picture.

**Tell the designer what differs from the old GB prototype page**, in the
report, even when they did not ask (these are known, not faults):

- The old page sat in the arrival section; the check your answers card sits
  in "Consignment parties", with the other parties. Moving the card is
  `change-the-journey`'s check-answers recipe.
- The card shows name and address like the other party cards (phone and
  email read "Not provided"), not the approval number or type. Offer to add
  them as two more rows of the card.
- The add form is one page with a type question at the top, not the old
  type-first flow of two pages. Offer the two-page flow as a follow-up
  (`change-the-journey`, add-a-branch).
- The real journey's pickers refuse Continue without a choice; the old page
  let the user carry on. Keep the refusal unless the designer asks otherwise
  (then it is `research-session`'s relax-a-save-rule, or a design gap).

For "add a new one", add a page that is not a journey step. The add page in
the saved transporters example (`add.njk`, and `renderAdd` and `add` in its
`controller.js`) is the pattern:

- Route: `GET` and `POST` on
  `pageRoutePath('transporter-select/add')` (from `shared/paths.js`), in a new
  `features/transporter-add/controller.js`, added to `allRoutes`.
- `GET` renders a form: `govukInput` for `name`, `approvalNumber`,
  `addressLine1`, `townOrCity`, `postcode` and `country`, and `govukRadios`
  named `transporterType` (`TRANSPORTER_TYPES`).
- `POST` calls `createTransporter(organisationIdOf(request), values)`. When
  `isValidationFailure(error)`, render the form again with the values,
  `kit.errorSummary(errors)` and each field's message, and answer `400`. Take
  each message from the page's copy by field, falling back to the service's
  (`formErrorsFor` in the example's `view-model.js`), so the Welsh works.
  Otherwise send the user back to the picker with the new transporter
  ticked:

  ```js
  const added = await transporters.createTransporter(
    organisationIdOf(request),
    values
  )
  return h.redirect(
    `${pagePath(request.params.journeyId, 'transporter-select')}?selected=${encodeURIComponent(added.id)}`
  )
  ```

  The picker's `GET` already reads `request.query.selected`. See
  `come-back-to-where-i-was.md` for why that works and how to keep the search
  as well.

- Link to it from the picker page with `pagePath(journeyId, 'transporter-select/add')`.
- Put any link the page shows (a GOV.UK guidance page, say) in its copy under
  a key ending `Href`, for example `guidanceHref`. The English and Welsh
  check lets a link address be the same in both files, so never put
  `[Welsh needed]` in front of an address.

### Show the transporter on check your answers

Check your answers looks up the address book for the consignor and the place
of destination (`partiesFor` in its `controller.js`). A transporter lives in
its own service, so give it a small lookup of its own, in a new file. Never
add it to `partiesFor`: that function is already at the code rules'
complexity limit, and one more branch fails `sonarjs/cyclomatic-complexity`.

1. A new file, `features/check-answers/owned-parties.js`:

   ```js
   import * as transporters from '../../../../../../services/transporters/index.js'
   import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'

   /**
    * Parties kept in prototype-owned services, not the address book: the
    * answer field, the key its saved answer holds the id in, and the lookup.
    * Needs a real service: see design-gaps.md.
    */
   const OWNED_PARTIES = [
     {
       field: 'transporter',
       idKey: 'transporterId',
       find: transporters.getTransporter
     }
   ]

   const lookUp = async (request, saved, { idKey, find }) => {
     const id = saved?.[idKey]
     return id ? find(organisationIdOf(request), id) : undefined
   }

   /** Each party the notification has in a prototype-owned service, by answer field. */
   export const ownedPartiesFor = async (request, source, scope) => {
     const found = {}
     for (const entry of OWNED_PARTIES) {
       const party = scope.has(entry.field)
         ? await lookUp(request, source[entry.field], entry)
         : undefined
       if (party && !party.deleted) {
         found[entry.field] = party
       }
     }
     return found
   }
   ```

   Another party in a prototype-owned service is one more line in
   `OWNED_PARTIES`.

2. In `features/check-answers/controller.js`, import it and change only the
   `parties` line in `render`:

   ```js
   import { ownedPartiesFor } from './owned-parties.js'
   // …
   const parties = {
     ...(await partiesFor(request, source, current.scope)),
     ...(await ownedPartiesFor(request, source, current.scope))
   }
   ```

3. In `features/check-answers/view-model/index.js`, add the card to
   `partiesSection`, after the consignor card:

   ```js
   ...(scope.has('transporter')
     ? [
         partyCard(
           'transporter',
           copy.cards.transporter,
           parties.transporter,
           journeyId,
           readOnly
         )
       ]
     : []),
   ```

   A transporter has a `name` and an `address` like an address book record,
   so `partyCard` shows it as it is. Its Change link finds the
   `transporter-select` page by itself.

4. Add `cards.transporter: 'Transporter'` to both check-answers copy files
   (`'[Welsh needed] Transporter'` in the Welsh).

5. Picture it: `--pages transporter-select,notification-view --url "notifications/{notification}/transporter-select/add" --errors --before`.
   The example data (the release's `happy-path.json`) needs a
   `transporter-select` step with `{ "transporter": "<a starter id>" }`
   (the ids are in `STARTER_TRANSPORTERS` in
   `src/server/app/services/transporters/stub.js`), so the examples reach the
   page and check your answers shows the card.

The design-gaps row:

```text
| transporter-select | Search saved transporters, pick one or add a new one | Prototype-owned service `transporters` (`src/server/app/services/transporters`) | Needs a real service: plants-frontend has no transporter register, so a real one needs an API to search, read, add and delete an organisation's transporters (its CONTRACT). | <frame> |
```

## Worked example 2: save as a template, start from one

The designer says: "Let traders save a notification as a template, and start a
new one from a template."

### The release's own glue: `features/templates/from-template.js`

Saving a notification's answers and starting a draft from them reads and
writes the release's notifications, so it belongs to the release, in its own
feature. Write this file first, in
`src/server/app/sets/<release>/journeys/linear/features/templates/from-template.js`:

```js
import {
  isKnownJourney,
  replaceJourneyFulfilment,
  startJourney
} from '../../../../../../engine/journey.js'
import { records } from '../../../../../../engine/persistence/records.js'
import * as templates from '../../../../../../services/templates/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'

/**
 * Saves one of the user's notifications as a template. Only a notification
 * this browser knows can be saved, the same rule the engine applies to copy
 * and delete. Undefined when it is not the user's or no longer exists.
 */
export const saveJourneyAsTemplate = async (request, journeyId, name) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const journey = await records.load({ journeyId })
  if (!journey) {
    return undefined
  }
  return templates.createTemplate(organisationIdOf(request), {
    name,
    fulfilment: journey.fulfilment,
    fromJourneyId: journeyId
  })
}

/**
 * Starts a new draft from a template: a new reference number, on the user's
 * dashboard, with the template's answers filled in. Send the user to
 * `hubPath(journey.journeyId)` next. Undefined when there is no such template.
 */
export const startFromTemplate = async (request, h, templateId) => {
  const chosen = await templates.getTemplate(
    organisationIdOf(request),
    templateId
  )
  if (!chosen) {
    return undefined
  }
  const journey = await startJourney(request, h)
  return replaceJourneyFulfilment(
    request,
    journey.journeyId,
    structuredClone(chosen.fulfilment)
  )
}
```

`createTemplate` refuses an empty name with a 400 problem, so check the name
on the page first (below) and the refusal never reaches the user.

### A "Save as template" action on each dashboard card

1. In the release's `features/dashboard/view-model/row/actions.js`, add an
   action to the draft and submitted cards:

   ```js
   const saveAsTemplateAction = {
     text: copy.actions.saveAsTemplate,
     href: pagePath(journey.journeyId, 'save-as-template')
   }
   ```

   and `copy.actions.saveAsTemplate` to the dashboard's copy pair ("Save as
   template").

2. A new feature `features/save-as-template/` with a `controller.js`, a
   `template.njk` and a `copy/` pair. The controller:

   ```js
   import {
     dashboardPath,
     pageRoutePath
   } from '../../../../../../shared/paths.js'
   import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
   import * as kit from '../../../../../../shared/kit.js'
   import { copyFor } from '../../../../../../shared/copy.js'
   import { saveJourneyAsTemplate } from '../templates/from-template.js'
   import { TEMPLATES } from '../../config.js'
   import { copy as en } from './copy/copy.en.js'
   import { copy as cy } from './copy/copy.cy.js'

   const view = `${TEMPLATES}/features/save-as-template/template`
   const copy = copyFor({ en, cy })
   const FIELD = 'templateName'

   const render = (h, errors = {}, value = '') =>
     h.view(view, {
       ...kit.base(copy.title, { backLink: dashboardPath() }),
       copy,
       value,
       errorSummary: kit.errorSummary(errors),
       fieldError: kit.fieldError(errors, FIELD)
     })

   const get = (_request, h) => render(h)

   const post = async (request, h) => {
     const name = String(request.payload?.[FIELD] ?? '').trim()
     if (!name) {
       return render(h, { [FIELD]: copy.errors.missing }, name).code(
         HTTP_STATUS_BAD_REQUEST
       )
     }
     const saved = await saveJourneyAsTemplate(
       request,
       request.params.journeyId,
       name
     )
     return h.redirect(
       saved ? `${dashboardPath()}?templateSaved=1` : dashboardPath()
     )
   }

   export const routes = [
     {
       method: 'GET',
       path: pageRoutePath('save-as-template'),
       options: kit.routeOptions,
       handler: get
     },
     {
       method: 'POST',
       path: pageRoutePath('save-as-template'),
       options: kit.routeOptions,
       handler: post
     }
   ]
   ```

   The template: the error summary include, an `h1` from `copy.title`, a
   `<form method="post" novalidate>` with the `crumb` hidden input, a
   `govukInput` named `templateName` with `errorMessage: fieldError`, and a
   `govukButton`.

3. In `features/index.js`, import it
   (`import * as saveAsTemplate from './save-as-template/controller.js'`) and
   add `...saveAsTemplate.routes` to `allRoutes`.
4. Tell the release's deep-link guard this is an action, not a journey page:
   in the release's `journeys/linear/flow/entry-guard.js`, add
   `'save-as-template'` to `ACTION_SLUGS`. Without it, a draft with no
   answers is sent to the first question instead.
5. Show a success banner on the dashboard for `?templateSaved=1`
   (`success-banner.md`).

### A templates page, and "use this template"

1. In the same `features/templates/` folder, a `controller.js` with the
   routes `GET /templates` (the list) and `POST /templates/{templateId}/use`.
   Plain paths like these are mounted under the release's address, so the
   page is `http://localhost:3103/<release>/templates`.

   ```js
   import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
   import * as kit from '../../../../../../shared/kit.js'
   import { copyFor } from '../../../../../../shared/copy.js'
   import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
   import { listTemplates } from '../../../../../../services/templates/index.js'
   import { startFromTemplate } from './from-template.js'
   import { TEMPLATES } from '../../config.js'
   import { copy as en } from './copy/copy.en.js'
   import { copy as cy } from './copy/copy.cy.js'

   const view = `${TEMPLATES}/features/templates/template`
   const copy = copyFor({ en, cy })
   const DECIMAL = 10
   const templatesPath = () => `${dashboardPath()}/templates`

   const list = async (request, h) => {
     const search = request.query.q ?? ''
     const page = Number.parseInt(request.query.page, DECIMAL) || 1
     const found = await listTemplates(organisationIdOf(request), {
       search,
       page
     })
     return h.view(view, {
       ...kit.base(copy.title, { backLink: dashboardPath() }),
       contentColumnClass: kit.surfaceClass('display'),
       copy,
       search,
       found,
       rows: found.results.map((template) => ({
         ...template,
         useAction: `${templatesPath()}/${template.id}/use`
       }))
     })
   }

   const use = async (request, h) => {
     const journey = await startFromTemplate(
       request,
       h,
       request.params.templateId
     )
     return h.redirect(journey ? hubPath(journey.journeyId) : templatesPath())
   }

   export const routes = [
     {
       method: 'GET',
       path: '/templates',
       options: kit.routeOptions,
       handler: list
     },
     {
       method: 'POST',
       path: '/templates/{templateId}/use',
       options: kit.routeOptions,
       handler: use
     }
   ]
   ```

2. The template lists each row as a `govukSummaryList` card (the dashboard
   does the same for notifications): the name as the card title, the date it
   was saved, and a `<form method="post" action="{{ row.useAction }}">` with
   the `crumb` and a `govukButton` "Use this template". With no rows, show a
   paragraph from copy ("You have no templates yet").
3. Add `...templatesPage.routes` to `allRoutes`
   (`import * as templatesPage from './templates/controller.js'`), and a link
   to `{{ templatesHref }}` on the dashboard, with
   ``templatesHref: `${dashboardPath()}/templates` `` added to the dashboard
   controller's view model.
4. Deleting a template is a confirm page (`confirm-then-act.md`) that calls
   `deleteTemplate(orgId, id)` and lands on the list with a banner.

To give every visitor a starter template: save one in the running prototype,
open `.cache/designer/data/<release>.templates.json`, and copy its row into
`STARTER_TEMPLATES` in `src/server/app/services/templates/stub.js`, adding
`setId: '<release>'`. Drop `organisationId`. The answers only make sense in
that release.

The design-gaps row:

```text
| dashboard | Save a notification as a template, and start a new one from it | Prototype-owned service `templates` (`src/server/app/services/templates`) | Needs a real service: plants-frontend and its backend cannot save templates, so the backend needs the templates API in its CONTRACT. | <frame> |
```

## Making a new service

Only when no service above fits, real or prototype-owned. First check the
real service does not already have it: `ls src/server/app/services/` lists
every service folder, and `npm run designer:service -- list` says which are
the prototype's own.

1. Make it. Pick a short name in lower-case words joined by hyphens, say who
   would own the real one, and write the "needs a real service" sentence:

   ```bash
   npm run designer:service -- new saved-vehicles --owner new-api --describe "A register of an organisation's vehicles: search them, read one, add one and delete one."
   ```

   - `--owner plants-backend`: the plants backend would hold the data (the
     client calls `TRADE_IMPORTS_PLANTS_BACKEND_URL` + `/<name>`).
   - `--owner new-api`: a new API (the client calls
     `TRADE_IMPORTS_<NAME>_URL` + `/organisation/{organisationId}/<name>`).
   - `--owner ins`: the Import Notification Service would hold it.

   It writes `index.js`, `client.js`, `stub.js` and `<name>.test.js` in
   `src/server/app/services/<name>/` in the shape above, with list, get,
   create and delete operations named after the service
   (`listSavedVehicles`, `getSavedVehicle`, `createSavedVehicle`,
   `deleteSavedVehicle`), and adds its line to `ours`. It refuses a name the
   real service already has (it asks `upstream/main`), a name the real team
   removed on purpose (`commercial-transporters`, `import-reason-purpose`,
   `transport-reference`), and a folder that already exists. It warns when
   the animals frontend has a service of that name, such as
   `transporters`: say so in the design gap row.

2. Shape it to the design:
   - `stub.js`: replace the two example rows in `STARTER_ROWS` with made-up
     rows the design needs (never a real company), and add the design's
     checks to `create…` (throw `validationError({ errors: { field:
['message'] } })` for each refusal, as the transporters stub does).
   - `client.js`: map any field whose name the pages read differently in
     `toRecord`.
   - `index.js`: fill in `CONTRACT`: every field of a record (`record.fields`,
     with `required` and any `enum`), one example request and response, and
     the questions the real team must answer (`openQuestions`). The hand-off
     turns this into the API a developer builds, so write it as the design
     settles. **`CONTRACT` must be plain values**: the hand-off reads
     `index.js` as data without running it, so never use a name `index.js`
     imports (`client.MAX_LENGTH`, `[...client.TYPES]`). Write the values
     out, or declare them as constants in `index.js` itself. If you break
     this, `designer:check` says "A stand-in service's CONTRACT cannot be
     read".
   - Add operations the design needs (an update, say) to all three files, in
     the same pattern.

3. Check it:

   ```bash
   npm test -- src/server/app/services/<name> --coverage.enabled=false
   ```

   then `npm run lint`. Extend `<name>.test.js` for anything you added: the
   stub's behaviour, and the client's request and mapping.

4. Build the pages on it in the release, importing
   `'../../../../../../services/<name>/index.js'`, as worked example 1 does.
   For a small list that is not addresses (saved vehicles, say), a lean
   picker is enough: its own render and view-model, reusing the release's
   `features/address-book-picker/pagination.js` (`paginationFor(slug)` works
   for any page slug) in place of copying the whole address book picker.

### Store a reference or a copy?

A journey answer that points at a saved record can hold its id
(`{ transporterId }`, as worked example 1 does) or a copy of the fields the
notification needs (`{ vehicleId, registration, haulier, trailerType }`).

- **A copy is the default for saved lists.** Deleting or changing a saved
  record then never changes a notification, which is how the journey's own
  contact page works (see the comment in the release's `parties/index.js`).
- **An id alone** leaves a dangling answer when the record is deleted, and
  the task list still counts it as Completed: the release's
  `withoutUnresolvedPartyRefs` only knows address book references. Use one
  only when the notification must follow later changes to the record, and
  then add the owned field to that sanitiser.

Say which you chose in the report, and put the choice in the service's
`CONTRACT.openQuestions`.

### Required or optional?

Pick from the obligation: required when a regulation or the real service
needs the answer, optional otherwise (a saved vehicle nobody has to give).
Say which in the report. An optional page has no error state, so
`designer:show -- --errors` notes it moved on: that is expected, not a fault.

A stub never writes to its own files. Rows people add go to
`.cache/designer/data/<release>.<name>.json` on the designer's own computer,
which nodemon does not watch, so saving never restarts the prototype. Reset
deletes that file for the release.

**When the real service arrives.** The weekly update notices when the real
plants service adds a folder with the same name, keeps the prototype's copy
for now, labels its pull request `needs-person`, and tells the maintainer to
run `npm run designer:service -- retire <name>` and take the real one.
`retire` deletes the folder and its `ours` line, and refuses while a
release's pages still import the service (unless `--force`).

## Journey words a release owns: `sets/<release>/services/<name>/`

Some lists are not data a backend keeps: the options a release's own new
question offers ("reasons for import" in a new wording, a list of vehicle
types for one design). Those are journey vocabulary, not a service. Keep them
in the release, as a plain JS module:

```
src/server/app/sets/<release>/services/<name>/index.js
  export const VEHICLE_TYPES = Object.freeze([{ value: 'rigid', text: 'Rigid lorry' }, …])
```

A page imports it from inside its own release
(`'../../../../services/<name>/index.js'` from a feature folder: four `../`
reach `sets/<release>/`), and the
release's copy pair holds any words a user reads. It needs no `ours` line
(the release is already the designer's own), no stub and no client, and it
never goes in `src/server/app/services/`. Anything that must be saved,
searched per organisation, or looked up from a real system is a
prototype-owned service instead (above).
