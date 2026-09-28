# Templates in this prototype

The workspace's own
`~/git/defra/trade-imports-workspace/docs/best-practices/node/nunjucks.md`
and
`~/git/defra/trade-imports-workspace/docs/best-practices/node/govuk-frontend.md`
are the source of truth for Nunjucks and GOV.UK Frontend conventions. This
page covers only the shape every page in this prototype shares.

Every page is a Nunjucks template (a `.njk` file) in its feature folder, for
example
`src/server/app/sets/<your-release>/journeys/linear/features/arrival-details/template.njk`.
The words it shows come from `copy/copy.en.js` and `copy/copy.cy.js` in the
same folder. The page's `controller.js` decides what data the template gets
and what happens when the form is sent.

This page explains the pieces every template shares, so you know what you can
move and what you must keep.

## The shape of a question page

```njk
{% extends "shared/layout.njk" %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "shared/save-actions.njk" import saveActions %}
{% from "shared/section-caption.njk" import sectionCaption %}

{% block journeyContent %}
  {% include "shared/error-summary.njk" %}

  {{ sectionCaption(caption) }}
  <form method="post" novalidate>
    <input type="hidden" name="crumb" value="{{ crumb }}" />
    <input type="hidden" name="concurrencyToken" value="{{ concurrencyToken }}" />

    {{ govukRadios({ ... }) }}

    {{ saveActions(hubHref, copy = sharedCopy.saveActions) }}
  </form>
{% endblock %}
```

## The layout

`{% extends "shared/layout.njk" %}` wraps your page in everything that is the
same on every page: the GOV.UK header, the service navigation (Dashboard,
Address book, Manage account, Log out), the phase banner, the back link, the
footer, and the column your content sits in.

Your content goes in `{% block journeyContent %}`. The layout also shows, above
your content when they apply:

- a banner when a save failed and can be tried again
- a banner when someone else changed the notification first
- the reference strip: the notification's status tag and reference number

The layout is shared by every set and belongs to the real service. Changes to
the header, navigation or footer are design gaps, never edits.

## The content column

Question pages sit in a two-thirds column. Pages with tables or many records
(the dashboard, check your answers, the address pickers) use the full width.
The page's controller chooses: `contentColumnClass: kit.surfaceClass('display')`
means full width.

## The section caption

`{{ sectionCaption(caption) }}` shows the grey caption above the heading that
names the part of the journey, for example "Arrival". The journey's flow
decides the words, so every page in a section gets the same caption. Keep it
straight above the page heading. On pages with an `xl` heading, write
`{{ sectionCaption(caption, "govuk-caption-xl") }}`.

## The error summary

`{% include "shared/error-summary.njk" %}` shows the red "There is a problem"
box when the form was sent with errors. Keep it first on every page with a
form. Each field shows its own message from `errors.<field name>`.

## The hidden fields

- `crumb` protects the form against forged requests. Without it, sending the
  form fails.
- `concurrencyToken` stops two people overwriting each other's changes to the
  same notification.

Keep both inside every form that uses `method="post"`.

## The buttons at the end

`{{ saveActions(hubHref, copy = sharedCopy.saveActions) }}` draws the end of a
journey page: "Save and continue", "Save and return to overview" and "Cancel
and return to overview". On a page reached from another page rather than from
the overview, the return controls are left off.

## Field names

Each field's `name` is what the controller reads when the form is sent, and
its `id` is what the error summary links to. Never change them in a template:
saving and error links would break.

## Words

Templates show words through `{{ copy.<key> }}` (this page's words) and
`{{ sharedCopy.<key> }}` (words every page shares). Do not type words straight
into a template: put them in the copy files, in English and Welsh.

## What a template cannot do

- Add a `style` attribute or a `<style>` or `<script>` block. The service's
  security settings block them, so they do nothing.
- Use classes that are not GOV.UK's. There is no custom Sass.
- Change the header, navigation, phase banner or footer.

When a design needs one of these, it goes in your release's design gaps log.
See [design gaps](design-gaps.md).
