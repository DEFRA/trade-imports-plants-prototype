# Confirm, then act

The designer says: "Ask 'are you sure?' before deleting a template", "confirm
before removing a transporter", or "a check page before cancelling".

GOV.UK does not use pop-up dialogs. A destructive action gets its own page:
a question as the `h1`, a sentence saying what will happen, a red (warning)
button to do it, and a way back that does nothing. The real journey already
has one: deleting a notification. Copy it, in the release.

## The pattern: delete-notification

Read the release's `features/delete-notification/controller.js` and
`template.njk`. What they do, in order:

1. **One address, two methods.** `GET` and `POST` on the same path
   (`pageRoutePath('delete')`). The `GET` shows the page; the `POST` does the
   deed. A link can never delete anything.
2. **Check first, on both.** Before reading anything, both handlers check the
   thing is the user's (`isKnownJourney`) and can be deleted (its status). If
   not, they send the user to the dashboard. Check again in the `POST`: the
   thing may have changed since the page was shown.
3. **The page.** From `template.njk`: an `h1` from copy, a paragraph saying
   what will happen, and one form holding the crumb, the warning button and
   the way back:

   ```njk
   <form method="post" action="{{ deleteAction }}" novalidate>
     <input type="hidden" name="crumb" value="{{ crumb }}" />
     <div class="govuk-button-group">
       {{ govukButton({ text: copy.confirmButton, classes: "govuk-button--warning" }) }}
       {{ govukButton({ text: copy.noLink, href: noHref, classes: "govuk-button--secondary" }) }}
     </div>
   </form>
   ```

4. **Do it, safely.** The `POST` wraps the action in `kit.recoverableSave(…)`
   so a failure shows the same page with the "something went wrong" message
   rather than an error page.
5. **Land with a banner.** It redirects to the dashboard with `?deleted=1`,
   and the dashboard shows a success banner (`success-banner.md`).

## Worked example: delete a template

In the release, a new feature `features/delete-template/`:

```js
import { dashboardPath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import {
  deleteTemplate,
  template
} from '../../../../../../../prototype-services/templates/index.js'
import { TEMPLATES } from '../../config.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/delete-template/template`
const copy = copyFor({ en, cy })
const templatesPath = () => `${dashboardPath()}/templates`
const deletePath = (id) => `${templatesPath()}/${id}/delete`

const get = async (request, h) => {
  const found = await template(
    organisationIdOf(request),
    request.params.templateId
  )
  if (!found) {
    return h.redirect(templatesPath())
  }
  return h.view(view, {
    ...kit.base(copy.title, { backLink: templatesPath() }),
    copy,
    name: found.name,
    deleteAction: deletePath(found.id),
    noHref: templatesPath()
  })
}

const post = async (request, h) => {
  const deleted = await deleteTemplate(
    organisationIdOf(request),
    request.params.templateId
  )
  return h.redirect(deleted ? `${templatesPath()}?deleted=1` : templatesPath())
}

export const routes = [
  {
    method: 'GET',
    path: '/templates/{templateId}/delete',
    options: kit.routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: '/templates/{templateId}/delete',
    options: kit.routeOptions,
    handler: post
  }
]
```

The template is `delete-notification/template.njk` with the heading and
paragraph from this feature's copy, for example:

```js
export const copy = {
  title: 'Are you sure you want to delete this template?',
  body: 'You will not be able to use it to start a notification again.',
  confirmButton: 'Delete template',
  noLink: 'No, go back'
}
```

and the same keys in `copy.cy.js` with `[Welsh needed]`. Add
`...deleteTemplate.routes` to `allRoutes`, link to it from each template on
the list page with a "Delete" link to `deletePath(template.id)`, and show a
banner on the list for `?deleted=1`.

A fake's delete needs no `recoverableSave`: it cannot fail the way a real
backend can. Say so in the design gap row, because the real one will need the
"try again" handling the notification delete has.

## Wording (GOV.UK)

- The `h1` is the question: "Are you sure you want to delete <thing>?"
- The body says what happens next, plainly.
- The button says the action: "Delete template", not "Yes" or "Confirm".
- The way back says it does nothing: "No, go back" or "Cancel".

## Check it

`designer:show` cannot reach a page that needs a thing picked first. Open it
in the running prototype and read it:
`http://localhost:3103/<release>/templates/<template-id>/delete`. Press the
way back: nothing is deleted. Press the button: the list shows the banner and
the template is gone. Press Reset on the chooser: every saved template is
gone, and any starter template in `data.json` is back.
