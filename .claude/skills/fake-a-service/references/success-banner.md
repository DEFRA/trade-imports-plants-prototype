# A success banner after an action

The designer says: "Show a green 'Template saved' message on the dashboard
after they save", or "a success banner after deleting a transporter".

The dashboard already does this once, after a notification is deleted. Copy
that, in the release. No fake is needed for the banner itself, but the action
before it often is one.

## How the existing one works

1. The action's `POST` handler finishes, then redirects with a flag in the
   address. In `features/delete-notification/controller.js`:

   ```js
   return deleted
     ? h.redirect(`${dashboardPath()}?deleted=1`)
     : h.redirect(dashboardPath())
   ```

2. The page that lands reads the flag. In `features/dashboard/controller.js`,
   in the object passed to `h.view`:

   ```js
   deletionSucceeded: request.query?.deleted === '1'
   ```

3. The template shows a `govukNotificationBanner` of type `success` at the top
   of `journeyContent`, before the caption and `h1`. In
   `features/dashboard/template.njk`:

   ```njk
   {% if deletionSucceeded %}
     {{ govukNotificationBanner({
       type: "success",
       titleText: sharedCopy.notificationActions.delete.successTitle,
       text: sharedCopy.notificationActions.delete.successBody,
       role: "alert"
     }) }}
   {% endif %}
   ```

The flag is in the address, not the session, so the banner shows once, the
browser's Back button does not bring it back, and it works with no session at
all.

## Adding one

For "Template saved" on the dashboard:

1. The action redirects with its own flag, named for what happened:
   ``h.redirect(`${dashboardPath()}?templateSaved=1`)``.
2. The dashboard controller adds `templateSaved: request.query?.templateSaved === '1'`
   to the view model.
3. The dashboard template adds a second `{% if templateSaved %}` block, the
   same shape as the one above.
4. The words go in the **release's** dashboard copy pair, not in
   `sharedCopy`: `src/server/app/shared/copy.en.js` belongs to the real
   service and every set. For example:

   ```js
   banners: {
     templateSaved: {
       title: 'Success',
       body: 'Your template has been saved.'
     }
   }
   ```

   and in the template `titleText: copy.banners.templateSaved.title`,
   `text: copy.banners.templateSaved.body`.

To name the thing in the banner ("Harbourline Haulage Ltd has been added"),
carry its id in the flag (`?added=harbourline-haulage-ltd`), look it up in the
landing controller (`transporter(orgId, request.query.added)`), and build the
sentence from a copy function: ``added: (name) => `${name} has been added` ``.
Never put the words themselves in the address.

GOV.UK guidance for this banner:

- one banner at a time, at the top of the page
- `titleText` is usually "Success"; the body says what happened in the past
  tense
- use `role: "alert"` as the dashboard does, so a screen reader announces it

## Check it

Do the action in the running prototype and read the page you land on: the
banner shows. Then open the same page from the service's menu: the banner is
gone, because the flag is not in the address. In the gallery, the
banner does not show, because `designer:show` visits the page without the
flag: describe it from the running prototype instead.
