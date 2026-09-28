# Fake a service

A fake service is pretend data and behaviour that stands in for a real service
the plants frontend does not have yet: a transporter register, notification
templates, anything a design needs to look up, list or save. It lives in
`src/server/prototype-services/<name>/`, which belongs to the prototype, so the
weekly update never touches it. Only a design release may use one.

Every fake carries the flag "needs a real service". Say it to the designer,
add a `design-gaps.md` row for it (SKILL.md step 7), and the hand-off brief
lists every file that imports it.

## What is there already

| Fake            | Folder                                        | What it does                                                                                                                                                                                                      |
| --------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transporters    | `src/server/prototype-services/transporters/` | Search saved transporters, read one, add one, remove one. Seven starter transporters in `data.json`. Plants-frontend removed its transporter pages on purpose, so there is nothing to copy from the real journey. |
| Templates       | `src/server/prototype-services/templates/`    | Save a notification's answers under a name, list and search them, delete one, start a new draft from one. `data.json` starts empty.                                                                               |
| Address book    | `src/server/prototype-services/address-book/` | The stub address book plus add an address, delete one (hidden until Reset), with the real seam's `search` and `party`. Belongs to the Import Notification Service frontend: see `address-book-pages.md`.          |
| Records wrapper | `src/server/prototype-services/records/`      | Dashboard filters, tabs and counts, saving a release's data across restarts, and Reset clearing every fake. See `dashboard-filters-and-tabs.md`.                                                                  |

Both fakes answer searches in the address book's shape, so any page built
like the address book picker can use them:

```js
search(orgId, { query, page })
// → { results, total, page, totalPages, pageSize }   (5 to a page)
```

`orgId` is always `organisationIdOf(request)` from
`src/server/common/helpers/organisation-id.js`. Rows people add belong to
their organisation. Starter rows are seen by everyone.

### Transporters: every function

From `src/server/prototype-services/transporters/index.js`:

| Function                         | Answers                                                                                                                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `search(orgId, { query, page })` | One page of transporters whose name, address or approval number contains `query`.                                                                                                                                                                                                    |
| `transporter(orgId, id)`         | One transporter, or `undefined`.                                                                                                                                                                                                                                                     |
| `validateTransporter(fields)`    | `{}` when the fields can be saved, else `{ field: 'missing' }` for each of `name`, `transporterType`, `addressLine1`, `townOrCity`, `country`, and `{ transporterType: 'unknown' }` for a type that is not `commercial` or `private`. The words for each code go in the page's copy. |
| `addTransporter(orgId, fields)`  | Saves and returns the new transporter, with an `id` made from its name and `approvalStatus: 'new'`.                                                                                                                                                                                  |
| `removeTransporter(orgId, id)`   | `true` when removed (a starter one is hidden for that organisation until Reset).                                                                                                                                                                                                     |
| `TRANSPORTER_TYPES`              | `['commercial', 'private']`. Their labels go in copy.                                                                                                                                                                                                                                |

A transporter looks like an address book record, plus two fields:

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

### Templates: every function

From `src/server/prototype-services/templates/index.js`:

| Function                                                   | Answers                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `search(orgId, { query, page })`                           | One page of templates, newest first, whose name contains `query`. Rows leave out the saved answers. |
| `template(orgId, id)`                                      | One template with its answers (`fulfilment`), or `undefined`.                                       |
| `saveTemplate(orgId, { name, fulfilment, fromJourneyId })` | Saves and returns a template. Throws when `name` is empty.                                          |
| `deleteTemplate(orgId, id)`                                | `true` when deleted.                                                                                |

From `src/server/prototype-services/templates/journey.js`, the two that touch
notifications (call them inside a release's route handler):

| Function                                          | Answers                                                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saveJourneyAsTemplate(request, journeyId, name)` | Saves one of the user's notifications as a template. `undefined` when the notification is not theirs.                                                                     |
| `startFromTemplate(request, h, templateId)`       | A new draft with the template's answers, already on the user's dashboard. `undefined` when there is no such template. Send the user to `hubPath(journey.journeyId)` next. |

A template's answers belong to one release's questions, so templates are kept
per release. A template saved in one release never shows in another.

## Where the imports come from

A release's feature folder is
`src/server/app/sets/<release>/journeys/linear/features/<feature>/`. From a
file in it:

| Import                         | Path                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| A fake                         | `'../../../../../../../prototype-services/<name>/index.js'`                                                      |
| Shared paths, kit, copy        | `'../../../../../../shared/paths.js'`, `'../../../../../../shared/kit.js'`, `'../../../../../../shared/copy.js'` |
| The engine                     | `'../../../../../../engine/index.js'`, `'../../../../../../engine/journey.js'`                                   |
| The organisation               | `'../../../../../../../common/helpers/organisation-id.js'`                                                       |
| The release's templates folder | `import { TEMPLATES } from '../../config.js'`                                                                    |

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
   that lives in a fake service.

The names are settled here, whatever the old page was called: the page is
`transporter-select` (folder `features/transporter-select/`, slug
`transporter-select`), and the add page is `transporter-select/add` (folder
`features/transporter-add/`). This follows the picker it is copied from
(`consignors/select`), so its links and tests read the same way.
`port-a-kit-page` follows these names too when it ports a list page.

The address book picker is the pattern. The consignor page
(`features/consignor-select/`) is one picker page built on it. In the release:

1. Copy `features/address-book-picker/` to `features/transporter-picker/`.
2. In the copy's `render.js`, swap the address book for the fake:

   ```js
   // was: import * as addressBook from '../../../../../../services/address-book/index.js'
   import * as transporters from '../../../../../../../prototype-services/transporters/index.js'
   ```

   and in the two places it is used:

   ```js
   const record = await transporters.transporter(orgId, selectedId) // was addressBook.party
   const found = await transporters.search(orgId, { query, page: pageNumber }) // was addressBook.search
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

For "add a new one", add a page that is not a journey step:

- Route: `GET` and `POST` on
  `pageRoutePath('transporter-select/add')` (from `shared/paths.js`), in a new
  `features/transporter-add/controller.js`, added to `allRoutes`.
- `GET` renders a form: `govukInput` for name, address line 1, town or city,
  postcode and approval number, `govukRadios` for the type
  (`TRANSPORTER_TYPES`), `govukSelect` or `govukInput` for the country.
- `POST` runs `validateTransporter(request.payload)`. With errors, render the
  form again with `kit.errorSummary(...)` and each field's message from copy,
  and answer `400`. Without, run `addTransporter(orgId, request.payload)` and
  send the user back to the picker with the new transporter ticked:

  ```js
  const added = await addTransporter(organisationIdOf(request), request.payload)
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
the fake, so give it a small lookup of its own, in a new file. Never add it
to `partiesFor`: that function is already at the code rules' complexity
limit, and one more branch fails `sonarjs/cyclomatic-complexity`.

1. A new file, `features/check-answers/fake-parties.js`:

   ```js
   import * as transporters from '../../../../../../../prototype-services/transporters/index.js'
   import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'

   /**
    * Parties kept in the prototype's fake services, not the address book:
    * the answer field, the key its saved answer holds the id in, and the
    * lookup. Needs a real service: see design-gaps.md.
    */
   const FAKE_PARTIES = [
     {
       field: 'transporter',
       idKey: 'transporterId',
       find: transporters.transporter
     }
   ]

   const lookUp = async (request, saved, { idKey, find }) => {
     const id = saved?.[idKey]
     return id ? find(organisationIdOf(request), id) : undefined
   }

   /** Each fake-backed party the notification has, by answer field. */
   export const fakePartiesFor = async (request, source, scope) => {
     const found = {}
     for (const entry of FAKE_PARTIES) {
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

   Another fake-backed party is one more line in `FAKE_PARTIES`.

2. In `features/check-answers/controller.js`, import it and change only the
   `parties` line in `render`:

   ```js
   import { fakePartiesFor } from './fake-parties.js'
   // …
   const parties = {
     ...(await partiesFor(request, source, current.scope)),
     ...(await fakePartiesFor(request, source, current.scope))
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
   `transporter-select` step with `{ "transporter": "<a starter id from data.json>" }`
   so the examples reach the page and check your answers shows the card.

The design-gaps row:

```text
| transporter-select | Search saved transporters, pick one or add a new one | Fake transporters service (`src/server/prototype-services/transporters`) | Needs a real service: plants-frontend has no transporter register, so a real one needs an API to search, read and add an organisation's transporters. | <frame> |
```

## Worked example 2: save as a template, start from one

The designer says: "Let traders save a notification as a template, and start a
new one from a template."

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
   import { saveJourneyAsTemplate } from '../../../../../../../prototype-services/templates/journey.js'
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

3. Add `...saveAsTemplate.routes` to `allRoutes` in `features/index.js`.
4. Tell the release's deep-link guard this is an action, not a journey page:
   in the release's `journeys/linear/flow/entry-guard.js`, add
   `'save-as-template'` to `ACTION_SLUGS`. Without it, a draft with no
   answers is sent to the first question instead.
5. Show a success banner on the dashboard for `?templateSaved=1`
   (`success-banner.md`).

### A templates page, and "use this template"

1. A new feature `features/templates/`: routes `GET /templates` (the list) and
   `POST /templates/{templateId}/use`. Plain paths like these are mounted under
   the release's address, so the page is `http://localhost:3103/<release>/templates`.

   ```js
   import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
   import * as kit from '../../../../../../shared/kit.js'
   import { copyFor } from '../../../../../../shared/copy.js'
   import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
   import { search } from '../../../../../../../prototype-services/templates/index.js'
   import { startFromTemplate } from '../../../../../../../prototype-services/templates/journey.js'
   import { TEMPLATES } from '../../config.js'
   import { copy as en } from './copy/copy.en.js'
   import { copy as cy } from './copy/copy.cy.js'

   const view = `${TEMPLATES}/features/templates/template`
   const copy = copyFor({ en, cy })
   const DECIMAL = 10
   const templatesPath = () => `${dashboardPath()}/templates`

   const list = async (request, h) => {
     const query = request.query.q ?? ''
     const page = Number.parseInt(request.query.page, DECIMAL) || 1
     const found = await search(organisationIdOf(request), { query, page })
     return h.view(view, {
       ...kit.base(copy.title, { backLink: dashboardPath() }),
       contentColumnClass: kit.surfaceClass('display'),
       copy,
       query,
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
3. Add `...templates.routes` to `allRoutes`, and a link to
   `{{ templatesHref }}` on the dashboard, with
   ``templatesHref: `${dashboardPath()}/templates` `` added to the dashboard
   controller's view model.
4. Deleting a template is a confirm page (`confirm-then-act.md`) that calls
   `deleteTemplate(orgId, id)` and lands on the list with a banner.

To give every visitor a starter template: save one in the running prototype,
open `.cache/designer/data/<release>.templates.json`, and copy its row into
`src/server/prototype-services/templates/data.json`, adding
`"setId": "<release>"`. Drop `organisationId`. The answers only make sense in
that release.

The design-gaps row:

```text
| dashboard | Save a notification as a template, and start a new one from it | Fake templates service (`src/server/prototype-services/templates`) | Needs a real service: plants-frontend and its backend cannot save templates, so a real one needs an API to save, list, delete and read templates. | <frame> |
```

## Making a new fake

Only when no existing fake fits. Everything goes in one new folder,
`src/server/prototype-services/<name>/`, with three files:

- `data.json`: the starter rows, an array. Give each row an `id`, a `name`,
  and `"deleted": false` if a picker will show it. Use made-up names, never a
  real company. Add `"setId": "<release>"` to a row only one release should
  see.
- `index.js`: the fake. Start from `transporters/index.js`, and keep:
  - `SERVICE = { name, needsARealService }`, with one plain sentence saying
    what the real service would need to provide
  - `const store = createFakeStore({ ...SERVICE, starters })`, which gives
    per-release and per-organisation data, saving across restarts, and Reset
  - `search(orgId, { query, page })` built with `searchRecords` from
    `../lib/search-page.js`, so it answers in the address book's shape
  - `clear(setId)` calling `store.clear(setId)`
- `index.test.js`: a vitest test, written like `transporters/index.test.js`.
  Cover search, each change, and that `clearFakesFor('<a release>')` empties
  it. Wrap each call in `withSetContext('<a release>', () => ...)`.

A fake never writes to `data.json`. Saved rows go to
`.cache/designer/data/<release>.<name>.json` on the designer's own computer,
which nodemon does not watch, so saving never restarts the prototype.

Then run the tests for it:

```bash
npm test
```

and `npm run lint`. `npm test` runs every test, so it takes a few minutes.
