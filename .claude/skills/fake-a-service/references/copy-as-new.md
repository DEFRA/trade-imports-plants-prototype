# Copy as new

The designer says: "copy as new", "copy this notification", "start from a
previous notification", or "a Copy as new button on the dashboard".

**Whose it is.** This one is not a fake. The backend already copies a
notification (`POST /notifications/{id}/copy`), and the engine already has
`copyJourney` in `src/server/app/engine/journey.js`. Plants-frontend has no
button or page for it yet: the dashboard's `view-model/row/actions.js` says
Copy as new is parked with "reuse previous consignment", so a design here
feeds a decision the real team has put off. So the page belongs to
plants-frontend and
can be handed off as it is: flag it **"a new page for plants-frontend; the
backend can already copy"**, not "needs a real service". Say so to the
designer in the opening line.

A copy is a new draft with the same answers and a new reference number. The
original is not changed. Only a draft, a submitted notification, or one being
amended can be copied (a deleted one cannot).

## Step 1: a "Copy as new" action on each dashboard card

In the release's `features/dashboard/view-model/row/actions.js`, add an
action to the cards whose status can be copied, next to the delete action:

```js
const copyAsNewAction = {
  text: copy.actions.copyAsNew,
  href: pagePath(journey.journeyId, 'copy')
}
```

and `copy.actions.copyAsNew` to the dashboard's copy pair ("Copy as new", and
`'[Welsh needed] Copy as new'`). Put it in the lists that already hold
`deleteAction` (the draft, submitted and amending cards), never on a deleted
one.

## Step 2: the check page, and the copy

GOV.UK asks before an action that creates something the user did not type,
so the action goes to its own page (the `confirm-then-act.md` pattern, with a
primary button, because nothing is lost). In the release, a new feature
`features/copy-notification/`, copied from `features/delete-notification/`:

```js
import {
  dashboardPath,
  hubPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  copyJourney,
  isKnownJourney
} from '../../../../../../engine/journey.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/copy-notification/template`
const copy = copyFor({ en, cy })

const copyPath = (journeyId) => pagePath(journeyId, 'copy')
const copyable = (journey) =>
  journey.status === state.DRAFT ||
  journey.status === state.SUBMITTED ||
  journey.status === state.AMEND

const owns = (request) => isKnownJourney(request, request.params.journeyId)

const render = (h, journey, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: dashboardPath(),
      journey,
      recoverableError
    }),
    heading: copy.title,
    copy,
    copyAction: copyPath(journey.journeyId),
    noHref: dashboardPath()
  })

const get = async (request, h) => {
  if (!(await owns(request))) {
    return h.redirect(dashboardPath())
  }
  const { journey } = await state.get(request, h)
  return copyable(journey) ? render(h, journey) : h.redirect(dashboardPath())
}

const post = async (request, h) => {
  if (!(await owns(request))) {
    return h.redirect(dashboardPath())
  }
  const { journey } = await state.get(request, h)
  if (!copyable(journey)) {
    return h.redirect(dashboardPath())
  }
  const { failure, value: copied } = await kit.recoverableSave(
    () =>
      copyJourney(
        request,
        h,
        request.params.journeyId,
        journey.concurrencyToken
      ),
    () => render(h, journey, true).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }
  return copied
    ? h.redirect(
        `${hubPath(copied.journeyId)}?copiedFrom=${encodeURIComponent(journey.journeyId)}`
      )
    : h.redirect(dashboardPath())
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath('copy'),
    options: kit.routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath('copy'),
    options: kit.routeOptions,
    handler: post
  }
]
```

The template is `delete-notification/template.njk` with this feature's words,
the form's `action` set to `copyAction`, and the button **without**
`govuk-button--warning`. Copy:

```js
export const copy = {
  title: 'Copy this notification as a new one?',
  body: 'This starts a new draft with the same answers and a new reference number. The notification you copied does not change.',
  confirmButton: 'Copy as new notification',
  noLink: 'No, go back'
}
```

and the same keys in `copy.cy.js` with `[Welsh needed]`.

Then:

1. Add `...copyNotification.routes` to `allRoutes` in `features/index.js`.
2. Check the release's deep-link guard treats `copy` as an action, not a
   journey page: `journeys/linear/flow/entry-guard.js` lists it in
   `ACTION_SLUGS` already (the real journey planned for it). If it is not
   there, add it, or an unstarted draft is sent to the first question
   instead of the check page.

## Step 3: a banner on the new draft

The copy lands on the new draft's task list with `?copiedFrom=<reference>`.
Follow `success-banner.md` on the release's hub (`features/hub/`): read
`copiedFrom: request.query?.copiedFrom` in its controller, and show a success
banner from a copy function, for example
``copiedFrom: (reference) => `This is a copy of ${reference}. Check every answer before you submit it.` ``.

## Check it

1. `npm run designer:check -- --set <release> --full`.
2. Picture the dashboard and the check page:

   ```bash
   npm run designer:show -- --set <release> --pages dashboard,task-list --url "notifications/{notification}/copy" --url "notifications/{notification}?copiedFrom=GBN-EXAMPLE" --before
   ```

   The second `--url` is the task list (`hubPath`) as the copy lands on it,
   with its banner. Pressing the button is a form sent, which
   `designer:show` cannot do: read the `POST` handler, and say the copy
   itself was not clicked through.

3. In the running prototype, press "Copy as new" on a submitted example: a
   new draft opens with the same answers and a new reference, and the
   dashboard lists both.

## The design gaps row

No "needs a real service" row: the backend copies already. If the designer
wants the copy to leave some answers out (dates, say), that is a rule the
backend's copy does not have: log it as
"Needs a real service: the backend copies every answer; leaving <answers> out
needs a change to the copy endpoint".
