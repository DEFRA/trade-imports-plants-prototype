# Address book pages

The designer says: "change the address book", "add an address manually",
"let users delete an address", "change an address", "add a manual address
page to the address book", "address categories" or "sort addresses by what
they are used for".

**Whose it is.** The address book belongs to the Import Notification Service
frontend (INS), not to plants. Plants-frontend only reads it
(`src/server/app/services/address-book/index.js`: `search` and `party`, and
it says so), and the header's "Address book" link goes to INS, which this
prototype does not run. So address book pages in a design release are
flagged **"belongs to the Import Notification Service frontend"**, and a
hand-off says the change is for the INS team, not plants-frontend. Say both
to the designer in the opening line.

## What is there already

The prototype-owned service `src/server/app/services/ins-address-book/` is a
copy of the INS frontend's own address book service
(DEFRA/trade-imports-ins-frontend, `src/server/app/services/address-book/`):
the same five operations, the same wire shape, the same
`TRADE_IMPORTS_ADDRESS_BOOK_URL`. Its stub refuses what the real address
book API refuses, with the API's own messages.

| Function                                         | Answers                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listAddresses(orgId, { page, q, countryCode })` | `{ items, page, pageSize, totalItems, totalPages }`, 25 to a page, as the API pages. Starts with the stub address book and the release's extra parties. |
| `getAddress(orgId, id)`                          | One address. Throws an error with `status: 404` when the organisation has none by that id.                                                              |
| `createAddress(orgId, body)`                     | Saves and returns the address, with an `id` made from its name. Any extra field (a `usages` list, say) is kept.                                         |
| `updateAddress(orgId, id, body)`                 | Lays the changes over the address and returns it.                                                                                                       |
| `deleteAddress(orgId, id)`                       | Deletes it (a starter address is hidden for that organisation until Reset).                                                                             |
| `isValidationFailure(error)`                     | True for the 400 a refused save throws.                                                                                                                 |
| `mapApiErrorsToFormErrors(error.body)`           | `{ field: message }`, the first message for each refused field.                                                                                         |

An address is in the INS wire shape: `name`, `addressLine1`, `addressLine2`,
`townOrCity`, `county`, `postcode`, `countryCode` (two letters, `GB` for the
United Kingdom), `phone`, `email`, `deleted`. The API requires `name`,
`addressLine1`, `townOrCity`, `postcode`, `countryCode`, `phone` and `email`,
and checks the email's format.

**The journey's pickers follow without any change.** Every address added,
changed or deleted through `ins-address-book` shows in the release's
consignor, consignee, place of destination and contact pickers, and on check
your answers, straight away. They keep importing the real
`services/address-book/index.js`: the prototype lays the release's changes
over the stub book it serves (`withExtraParties` in
`src/server/prototype-data/`). Never change a picker's import.

Added, changed and deleted addresses are kept per release, and per
organisation on the address book pages. Reset brings the starters back for
that release only.

## Where the imports come from

From a file in `src/server/app/sets/<release>/journeys/linear/features/<feature>/`:

| Import                  | Path                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| The address book API    | `'../../../../../../services/ins-address-book/index.js'`                                                         |
| Countries for a select  | `'../../../../../../services/countries/index.js'` (`originCountries()`)                                          |
| Shared paths, kit, copy | `'../../../../../../shared/paths.js'`, `'../../../../../../shared/kit.js'`, `'../../../../../../shared/copy.js'` |
| The organisation        | `'../../../../../../../common/helpers/organisation-id.js'`                                                       |

## Step 1: the address book list

The pattern to copy is the saved transporters list in the placeholder set,
`src/server/app/sets/sample-journey/journeys/linear/features/saved-transporters/`
(`controller.js`, `view-model.js` and `list.njk`): a search form, a results
table with a "Delete" link per row, and pagination. Copy it into a new
feature `features/address-book/` in the release, then change it to the
address book:

```js
import * as addressBook from '../../../../../../services/ins-address-book/index.js'

const list = async (request, h) => {
  const query = String(request.query.q ?? '').trim()
  const found = await addressBook.listAddresses(organisationIdOf(request), {
    page: pageNumber(request.query.page),
    q: query
  })
  // found.items, found.totalItems, found.page, found.totalPages
}
```

Mount it at `'/address-book'`, so the page is
`http://localhost:3103/<release>/address-book`. Each row shows `name` and the
address lines joined (`addressLine1`, `townOrCity`, `postcode`), with the
country's name from `originLabel(countryCode)` in
`services/countries/index.js` (`United Kingdom` for `GB`). Add a success
banner for `?added=<id>` or `?deleted=1` (`success-banner.md`).

In `features/index.js`, add
`import * as addressBookPage from './address-book/controller.js'` and
`...addressBookPage.routes` to `allRoutes`, and put a link
to the page on the release's dashboard (`addressBookHref:
`${dashboardPath()}/address-book`` in the dashboard controller's view
model). The header's "Address book" link is shared layout and belongs to
the real service: leave it.

## Step 2: add an address by hand

`features/address-book-add/controller.js`, `GET` and `POST` on
`/address-book/add`. Copy `add.njk` and the add handlers from the saved
transporters example, and ask for the INS fields with the INS labels: name,
address line 1, address line 2 (optional), town or city, county (optional),
postcode, country, telephone number and email address. The field names are
the wire names above, so the form posts straight to `createAddress`.

- Country: a `govukSelect` named `countryCode`, with
  `{ value: 'GB', text: 'United Kingdom' }` first, then
  `await originCountries()`.
- `POST`: call `createAddress`. When it throws and `isValidationFailure`
  says so, render the form again with the values, `kit.errorSummary(errors)`
  and each field's message, and answer `400`. The messages come from the API
  (`mapApiErrorsToFormErrors`); to reword one, or to give the Welsh, put the
  page's own words in its copy keyed by field and use them first, as the
  saved transporters example does (`formErrorsFor` in its `view-model.js`).
- Without an error, land on the list with a banner:

  ```js
  const added = await addressBook.createAddress(
    organisationIdOf(request),
    values
  )
  return h.redirect(
    `${dashboardPath()}/address-book?added=${encodeURIComponent(added.id)}`
  )
  ```

  To come back to a picker instead (the designer went off to add an address
  from the consignor page), carry the page in a `returnTo` query and follow
  `come-back-to-where-i-was.md`: the picker ticks the new address with
  `?selected=<id>`, and finds it, because the pickers see the change.

**Change an address.** The same form on `/address-book/{addressId}/change`,
filled from `getAddress`, saving with `updateAddress(orgId, id, values)`.

**Find an address by postcode.** The old prototype had a lookup. There is no
address lookup service here, so build the manual form, and log a design gap:
"Find an address by postcode: needs a real service (an address lookup such as
OS Places); the prototype asks for the address by hand".

**Address categories** ("what is this address used for": consignor,
consignee, importer). The real address book has no types on purpose: the
same address can be a consignor on one notification and a consignee on the
next. To test the idea, add a `govukCheckboxes` named `usages` to the add
form. `createAddress` keeps the list on the record, and the list page can
show it or filter by it. Log it as a design gap that says the real address
book has no categories, so it needs a decision from the INS team, not only a
build. Add a line to `openQuestions` in `CONTRACT` in
`services/ins-address-book/index.js` too.

## Step 3: "are you sure?" before deleting

Follow `confirm-then-act.md`. The saved transporters example has the page
(`delete.njk` and `showDelete`/`remove` in its `controller.js`). Use
`getAddress` to find it (redirect to the list when it throws a 404),
`deleteAddress` to delete it, and land on the list with `?deleted=1`. Copy:

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
   followed, which `designer:show` cannot drive. The service's own test
   proves the pickers follow (`ins-address-book.test.js`). Say the round
   trip was not clicked through.

## The design gaps rows

```text
| address-book | Address book pages: list, add by hand, change, delete with a check page | Prototype-owned service `ins-address-book` (`src/server/app/services/ins-address-book`), a copy of the INS frontend's API | Belongs to the Import Notification Service frontend: it owns the address book and is its only writer; plants-frontend only reads it. The INS team needs the design, not the plants team. | <frame> |
```

and, when built, one row each for the postcode lookup and address categories
as described above.
