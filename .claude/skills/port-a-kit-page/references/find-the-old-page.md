# Finding the old page when the designer only names it

Designers often say "port the transporter page from the old prototype" and
attach nothing. The old prototype is the GOV.UK Prototype Kit repository
`defra-design/GB-notification-service` on GitHub. Find its source yourself;
ask only if every route below fails.

## 1. Find a clone

Look for a local clone, one command each. Next to this prototype's folder
first, then anywhere a few folders down from the home folder:

```bash
ls ../GB-notification-service/app/views
```

```bash
find ~ -maxdepth 5 -type d -name GB-notification-service -not -path "*/node_modules/*"
```

If neither finds it, ask the designer once: "Where is your copy of the old GB
notification prototype? A folder path, or I can use a page you paste in or a
screenshot." Never clone it yourself without asking: it is a separate
repository.

## 2. Pick the current version of the page

The old prototype keeps several copies of most pages:

| Folder under `app/views/`      | What it is                                                  |
| ------------------------------ | ----------------------------------------------------------- |
| `design-release-2.1/`          | **The current design.** Use this one unless told otherwise. |
| `design-release-2/`            | The previous release, kept as a record                      |
| `testing/`                     | Pages set up for user research rounds                       |
| top level (`transporter.html`) | The oldest version, from before the design releases         |

Which folder is current changes over time. Check it: the folder whose pages
changed most recently is current.

```bash
git -C <clone> log -5 --format="%h %ad %s" --date=short --name-only -- app/views
```

If the designer says "the DR2 version" or "the one from research", use that
folder instead.

## 3. Read the page and what it pulls in

Page names are the old addresses: "the transporter page" is `transporter.html`,
its add form `transporter-add.html` (with `-commercial` and `-private`
variants). List the folder to match a name:

```bash
ls <clone>/app/views/design-release-2.1
```

Read the page with the Read tool. A page pulls in more than itself:

- `{% include "partials/design-release-2.1/<name>.html" %}`: read each
  partial from `app/views/partials/`
- option lists and data: `app/data/` and `app/routes.js` (search them for the
  page's field names)
- its layout: `app/views/layouts/main.html`

Copy the page's HTML to
`.cache/designer/port/<release-id>/<slug>/source.html`, and pass that path to
the workflow as `source` with `sourceKind: "html"`.

## 4. The latest saved version, not the working copy

If the clone may have unsaved edits, read the saved version instead:

```bash
git -C <clone> show HEAD:app/views/design-release-2.1/transporter.html
```

and write the output to the `source.html` path above with the Write tool.
