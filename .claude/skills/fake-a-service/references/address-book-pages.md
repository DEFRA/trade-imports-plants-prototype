# Address book pages

The designer says: "change the address book", "add an address manually",
"let users delete an address", "add a manual address page to the address
book", "address categories" or "sort addresses by what they are used for".

**Whose it is.** The address book belongs to the Import Notification Service
frontend (INS), not to plants. Plants-frontend only reads it
(`src/server/app/services/address-book/index.js` says so), and the header's
"Address book" link goes to INS, which this prototype does not run. So
address book pages in a design release are a fake, flagged
**"belongs to the Import Notification Service frontend"**, and a hand-off
says the change is for the INS team, not plants-frontend. Say both to the
designer in the opening line.

## What is there already

The fake `src/server/prototype-services/address-book/` answers exactly like
the real address book seam, plus three things the real seam cannot do:

| Function                            | Answers                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search(orgId, { query, page })`    | One page of addresses, the same shape and order as the real `search`. Starts with the stub address book and the set's extra parties.                                       |
| `party(orgId, id)`                  | One address, or `undefined` (also for one the organisation deleted).                                                                                                       |
| `validateAddress(fields)`           | `{}` when the fields can be saved, else `{ field: 'missing' }` for each of `name`, `addressLine1`, `townOrCity`, `country`. The words for each code go in the page's copy. |
| `addAddress(orgId, fields)`         | Saves and returns the new address, with an `id` made from its name. Any extra answer (a `usages` list, say) is kept on the record.                                         |
| `removeAddress(orgId, id)`          | `true` when deleted (a starter address is hidden for that organisation until Reset).                                                                                       |
| `ADDRESS_FIELDS`, `REQUIRED_FIELDS` | The fields a form asks for, in order.                                                                                                                                      |

Added and deleted addresses are kept per release and per organisation, saved
across restarts on the designer's computer, and Reset brings the starters
back.

## Step 1: let the journey see the release's address book

Three files in the release read the real address book. Swap one import in
each, and every picker (consignor, consignee, place of destination, contact)
and check your answers read the fake instead. Nothing else changes, because
the fake answers the same two functions.

| File in the release                                      | Was                                                  | Becomes                                                           |
| -------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| `journeys/linear/features/address-book-picker/render.js` | `'../../../../../../services/address-book/index.js'` | `'../../../../../../../prototype-services/address-book/index.js'` |
| `journeys/linear/features/check-answers/controller.js`   | `'../../../../../../services/address-book/index.js'` | `'../../../../../../../prototype-services/address-book/index.js'` |
| `journeys/linear/parties/index.js`                       | `'../../../../../services/address-book/index.js'`    | `'../../../../../../prototype-services/address-book/index.js'`    |

Keep the `import * as addressBook from` part as it is. Then
`grep -rn "services/address-book/index.js" src/server/app/sets/<release>` must
list only lines that also say `prototype-services`.

Skip this step only when the designer wants the address book pages on their
own, with the pickers unchanged; say that a new address will not show in the
pickers then.

## Step 2: the address book list

A new feature `features/address-book/` in the release, with a
`controller.js`, a `template.njk` and a `copy/` pair. Plain paths are mounted
under the release's address, so the page is
`http://localhost:3103/<release>/address-book`.

```js
import { dashboardPath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import {
  party,
  search
} from '../../../../../../../prototype-services/address-book/index.js'
import { TEMPLATES } from '../../config.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/address-book/template`
const copy = copyFor({ en, cy })
const DECIMAL = 10
export const addressBookPath = () => `${dashboardPath()}/address-book`

const list = async (request, h) => {
  const orgId = organisationIdOf(request)
  const query = request.query.q ?? ''
  const page = Number.parseInt(request.query.page, DECIMAL) || 1
  const found = await search(orgId, { query, page })
  const added = request.query.added
    ? await party(orgId, request.query.added)
    : undefined
  return h.view(view, {
    ...kit.base(copy.title, { backLink: dashboardPath() }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    query,
    found,
    addedName: added?.name,
    deleted: request.query.deleted === '1',
    addHref: `${addressBookPath()}/add`,
    rows: found.results.map((address) => ({
      ...address,
      deleteHref: `${addressBookPath()}/${address.id}/delete`
    }))
  })
}

export const routes = [
  {
    method: 'GET',
    path: '/address-book',
    options: kit.routeOptions,
    handler: list
  }
]
```

The template: a success banner for `addedName` ("<name> has been added") or
`deleted` (`success-banner.md`), the `h1`, a search form (`govukInput` named
`q` and a secondary `govukButton`), a `govukButton` link "Add an address" to
`addHref`, then one `govukSummaryList` card per row (name as the card title,
the address lines as rows, a "Delete" action to `row.deleteHref`), and
pagination from `found`, built the way the consignor page builds it
(`features/consignor-select/view-model/pagination.js` and its template). With no
rows, a paragraph from copy ("No addresses match your search").

Add `...addressBook.routes` to `allRoutes` in `features/index.js`, and a link
to the page on the release's dashboard (`addressBookHref: addressBookPath()`
in the dashboard controller's view model). The header's "Address book" link
is shared layout and belongs to the real service: leave it.

## Step 3: add an address by hand

`features/address-book-add/controller.js`, `GET` and `POST` on
`/address-book/add`:

- `GET` renders a form: `govukInput` for the name and each of
  `ADDRESS_FIELDS` (address line 1, address line 2, town or city, postcode,
  country, telephone, email), with labels from copy.
- `POST` runs `validateAddress(request.payload)`. With errors, render the form
  again with `kit.errorSummary(...)` and each field's message from copy, and
  answer `400`. Without, save and land on the list with a banner:

  ```js
  const added = await addAddress(organisationIdOf(request), request.payload)
  return h.redirect(
    `${addressBookPath()}?added=${encodeURIComponent(added.id)}`
  )
  ```

  To come back to a picker instead (the designer went off to add an address
  from the consignor page), carry the page in a `returnTo` query and follow
  `come-back-to-where-i-was.md`: the picker ticks the new address with
  `?selected=<id>`.

**Find an address by postcode.** The old prototype had a lookup. There is no
address lookup service here, so build the manual form, and log a design gap:
"Find an address by postcode: needs a real service (an address lookup such as
OS Places); the prototype asks for the address by hand".

**Address categories** ("what is this address used for": consignor,
consignee, importer). The real address book has no types on purpose: the
same address can be a consignor on one notification and a consignee on the
next. To test the idea, add a `govukCheckboxes` named `usages` to the add
form. `addAddress` keeps the list on the record, and the list page can show
it as a row or filter by it. Log it as a design gap that says the real
address book has no categories, so it needs a decision from the INS team, not
only a build.

## Step 4: "are you sure?" before deleting

Follow `confirm-then-act.md`, worked example, with the fake in place of
templates: `GET` and `POST` on `/address-book/{addressId}/delete`, `party`
to find it (redirect to the list when it is gone), `removeAddress` to delete
it, and land on the list with `?deleted=1`. Copy:

```js
export const copy = {
  title: 'Are you sure you want to delete this address?',
  body: 'You will not be able to choose it on a new notification. Notifications that already use it keep it.',
  confirmButton: 'Delete address',
  noLink: 'No, go back'
}
```

## Check it

1. `npm run designer:check -- --set <release> --full`.
2. Picture the pages:

   ```bash
   npm run designer:show -- --set <release> --pages dashboard,consignors/select --url address-book --url address-book/add --url "address-book/northgate-trading-ag/delete" --url "address-book?added=northgate-trading-ag" --errors --mobile --before
   ```

   `--errors` pictures the add form sent empty. The banner picture uses a
   starter's id, because a new address only exists once someone adds it.

3. Adding and then finding the address in a picker is a form sent and a page
   followed, which `designer:show` cannot drive. Read the add page's `POST`
   handler, and say the round trip was not clicked through.

## The design gaps rows

```text
| address-book | Address book pages: list, add by hand, delete with a check page | Fake address book (`src/server/prototype-services/address-book`) | Belongs to the Import Notification Service frontend: it owns the address book and is its only writer; plants-frontend only reads it. The INS team needs the design, not the plants team. | <frame> |
```

and, when built, one row each for the postcode lookup and address categories
as described above.
