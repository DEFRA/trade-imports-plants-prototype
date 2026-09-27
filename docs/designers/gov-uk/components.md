# Components

GOV.UK components are tested, accessible building blocks. Start every page
from them. Change one only when research shows the standard version does not
work for your users, and then log the change you want as a design gap rather
than building a lookalike.

Each component is a Nunjucks macro, such as `govukButton({ text: "Continue" })`.
The full list, with the line that imports each one and a page here that
already uses it, is in
`.claude/skills/match-the-design/references/components-we-have.md`.

## What works fully here

Most GOV.UK components work exactly as on GOV.UK. A few need a small script
that the real service has not switched on, so they show their "JavaScript
off" version:

- **Tabs** show a list of links, then every panel one after another.
- **Accordion** shows every section open.
- **Character count** does not count as you type.
- **Password input** has no "Show" button.
- **File upload** is a plain file picker.
- **Exit this page** is a plain link.

Of the MoJ (Ministry of Justice) components, only the date picker works. The
filter layout, sub navigation, badge, timeline, button menu and the rest
render as plain, unstyled HTML.

Switching any of these on is a change to the real service. Ask for it as a
design gap.

## Navigation

- **Back link**: returns to the previous page. The layout adds it for you.
- **Breadcrumbs**: where the page sits in a hierarchy. This service does not
  use them: a page has one route back (the back link) and one route up (the
  service navigation).
- **Pagination**: moves between pages of results. Used on the dashboard and
  the address pickers.
- **Service navigation**: the links under the header. Shared by every page and
  owned by the real service.
- **Skip link**: lets keyboard users jump to the main content. Built in.

## Asking questions

- **Radios**: choose one from a short list. Can reveal a follow-up question
  under an option.
- **Checkboxes**: choose any number. Can reveal follow-up questions too.
- **Text input**: one line of text. Set its width to the expected answer.
- **Textarea**: several lines of text.
- **Select**: choose one from a list. Use radios instead for fewer than about
  8 options. For long lists, this prototype has an accessible autocomplete.
- **Date input**: day, month and year boxes. This service uses the MoJ date
  picker instead for arrival dates.
- **Character count**: a textarea with a limit (see above).
- **File upload**: attach a file (see above).
- **Fieldset**: groups related questions under one legend.

## Errors

- **Error message**: red text under a field saying how to fix it.
- **Error summary**: a box at the top of the page linking to each error. Every
  form page here includes it.

## Showing information

- **Summary list**: key and value pairs, optionally with Change links. With a
  `card`, each group gets a title bar and actions: the dashboard and check
  your answers use cards.
- **Table**: compare the same facts across many records.
- **Tag**: a short status label, such as "Draft" or "Submitted".
- **Inset text**: sets a paragraph apart with a grey bar.
- **Warning text**: a bold warning with an icon, for legal or serious
  consequences.
- **Details**: a link that opens more help. Works without any script.
- **Accordion**: several sections that open and close (see above).
- **Tabs**: switch between views of related content (see above).
- **Panel**: the green box on a confirmation page.
- **Notification banner**: a blue box for important information, or a green
  one after a successful action.

## Page furniture

The header, phase banner, service navigation and footer are drawn by the
shared layout. They are the same on every page of every set and belong to the
real service.

## Tracking progress

- **Task list**: the overview page's list of tasks and their statuses.
