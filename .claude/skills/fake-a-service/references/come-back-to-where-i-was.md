# Come back to where I was

The designer says: "After they add a new transporter, take them back to the
list with it ticked", "after changing an answer from check your answers, go
back to check your answers", or "save and go back to the task list".

The engine already knows three ways back. Use them before inventing a fourth.
None of this needs a fake; the page the user goes off to often does.

## 1. Back to check your answers: `?change=1`

A "Change" link on check your answers adds `?change=1` to the question's
address. When that page saves, `kit.nextTarget(request, page, scope)` sees the
flag and sends the user to check your answers (`notification-view`) instead of
the next question. That is `exitTarget` in `src/server/app/shared/kit.js`:

```js
export const exitTarget = (request, fallback) =>
  hubExitTarget(request) ??
  (changeContext(request)
    ? pagePath(request.params.journeyId, CYA_SLUG)
    : fallback)
```

So a page built the usual way (its `POST` ends with
`h.redirect(await kit.nextTarget(request, page, committed.scope))`) already
comes back. If the page links somewhere else first (a picker's "add a new
one"), keep the flag on that link with `kit.withChangeContext(request, href)`,
and carry it back on the return redirect.

## 2. Back to the task list: `exit=hub`

The `saveActions` macro (`src/server/app/shared/save-actions.njk`) gives every
page reached from the task list a "Save and return to overview" button. It
posts `exit=hub`, and `exitTarget` sends the user to the task list
(`hubPath(journeyId)`) after saving. Keep the macro on any new journey page
the task list links to, and this works with no code.

## 3. Back to a picker, with the new thing ticked

The address book picker keeps everything it needs in the address: the search
(`q`), the page of results (`page`) and the ticked row (`selected`). Its `GET`
reads them:

```js
return render(request, h, current, {
  query: request.query.q ?? '',
  page: parsePageNumber(request.query.page),
  selectedId: request.query.selected ?? committedId(current.answers)
})
```

So a side trip from a picker (for example "Add a new transporter") comes back
by redirecting to the picker's address with those three:

1. The link to the side trip carries the search, so it can be carried back:

   ```js
   addHref: `${pagePath(journeyId, 'transporter-select/add')}?q=${encodeURIComponent(query)}`
   ```

2. The side trip's form keeps it in a hidden field:
   `<input type="hidden" name="q" value="{{ query }}" />`.

3. After saving, redirect to the picker with the new id ticked. The picker's
   own `resultsHrefFor(slug)` (copied into the release with the picker, in
   `pagination.js`) builds the address:

   ```js
   const added = await addTransporter(
     organisationIdOf(request),
     request.payload
   )
   return h.redirect(
     resultsHref(request.params.journeyId, {
       query: request.payload.q ?? '',
       page: 1,
       selectedId: added.id
     })
   )
   ```

The user lands on the picker with their search still in the box and the new
transporter ticked. They still press the primary button to choose it: the
side trip never answers the question for them.

A "Cancel" link on the side trip goes back the same way, without `selected`.

## When none of these fit

A page that is not part of a notification (the templates list, a service home
page) has no journey to return to. Give its back link the page it came from
explicitly (`kit.base(title, { backLink: dashboardPath() })`), and if it can be
reached from two places, carry a `from` value in the address and pick the back
link from a short, fixed list in the controller. Never redirect to an address
taken straight from the query string: a crafted link could send the user
anywhere.

## Check it

Walk the side trip in the running prototype, from each place it can start
(the question on its own, from check your answers, from the task list), and
say where each one lands. `designer:show` walks the example journey forwards
only, so it will not show a return.
