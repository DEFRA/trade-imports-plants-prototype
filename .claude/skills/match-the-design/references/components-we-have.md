# Components we have

Every component a page in this prototype can use, with the line that imports
it and a template that already uses it. Copy the shape from that template.

A component is only fully usable when three things are true:

1. Its macro is installed (every entry below).
2. Its styles are loaded by `src/client/stylesheets/application.scss`. All
   GOV.UK Frontend styles are loaded. Of MoJ Frontend, only the date picker's
   styles are loaded.
3. If it has a script, the script is started in
   `src/client/javascripts/application.js`. Both files belong to the real
   service, so a designer cannot start a new script or load new styles. Ask
   for it as a design gap.

## What "Script NOT started" means on the page

These components still render, but behave as they do with JavaScript turned
off. Use them only if that is good enough for the design, and say so in the
gap log if it is not.

- `govukTabs`: shows a list of links to each panel, then every panel one after
  another. It does not look like tabs. For a dashboard with tabs, see
  `layout-patterns.md`.
- `govukAccordion`: every section is open, with no "Show all sections" button.
- `govukCharacterCount`: the textarea and its hint show, but the count does not
  update as you type.
- `govukPasswordInput`: no "Show" button.
- `govukFileUpload`: a plain file input, without the drop zone.
- `govukExitThisPage`: the button is a plain link.
- `govukNotificationBanner`: shows normally. Only the move of focus to a
  success banner is missing.
- MoJ `add-another`, `alert`, `button-menu` and `multi-file-upload`: their
  styles are not loaded either, so they are not usable at all.

`govukDetails` needs no script: it is a native HTML `<details>` element and
works everywhere.

## What "Styles NOT loaded" means

The macro renders plain, unstyled HTML. Every MoJ component except the date
picker is in this state, including the filter layout, sub navigation, badge,
timeline, ticket panel, button menu and the MoJ task list. Never use them. See
`nearest-equivalent.md` for the GOV.UK option to build instead.

## Keeping this list up to date

The part below the line is generated from what is installed. When
`govuk-frontend` or `@ministryofjustice/frontend` changes version in
`package.json` (the weekly update does this), refresh it from the repo root:

```bash
node .claude/skills/match-the-design/scripts/components-we-have.js --write
```

Without `--write`, the command prints the list and changes nothing.

---

<!-- components-we-have:start -->

Installed: govuk-frontend 6.4.0, @ministryofjustice/frontend 10.0.1, accessible-autocomplete 3.0.1.

### GOV.UK Frontend

- `govukAccordion`: Script NOT started. Not used in any set yet.
  `{% from "govuk/components/accordion/macro.njk" import govukAccordion %}`
- `govukBackLink`: No script needed. Not used in any set yet.
  `{% from "govuk/components/back-link/macro.njk" import govukBackLink %}`
- `govukBreadcrumbs`: No script needed. Not used in any set yet.
  `{% from "govuk/components/breadcrumbs/macro.njk" import govukBreadcrumbs %}`
- `govukButton`: Script started. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/cancel-amend/template.njk` and 10 more.
  `{% from "govuk/components/button/macro.njk" import govukButton %}`
- `govukCharacterCount`: Script NOT started. Not used in any set yet.
  `{% from "govuk/components/character-count/macro.njk" import govukCharacterCount %}`
- `govukCheckboxes`: Script started. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/declaration/template.njk`.
  `{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}`
- `govukCookieBanner`: No script needed. Not used in any set yet.
  `{% from "govuk/components/cookie-banner/macro.njk" import govukCookieBanner %}`
- `govukDateInput`: No script needed. Not used in any set yet.
  `{% from "govuk/components/date-input/macro.njk" import govukDateInput %}`
- `govukDetails`: No script needed. Not used in any set yet.
  `{% from "govuk/components/details/macro.njk" import govukDetails %}`
- `govukErrorMessage`: No script needed. Not used in any set yet.
  `{% from "govuk/components/error-message/macro.njk" import govukErrorMessage %}`
- `govukErrorSummary`: Script started. Not used in any set yet.
  `{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}`
- `govukExitThisPage`: Script NOT started. Not used in any set yet.
  `{% from "govuk/components/exit-this-page/macro.njk" import govukExitThisPage %}`
- `govukFieldset`: No script needed. Not used in any set yet.
  `{% from "govuk/components/fieldset/macro.njk" import govukFieldset %}`
- `govukFileUpload`: Script NOT started. Not used in any set yet.
  `{% from "govuk/components/file-upload/macro.njk" import govukFileUpload %}`
- `govukFooter`: No script needed. Not used in any set yet.
  `{% from "govuk/components/footer/macro.njk" import govukFooter %}`
- `govukGenericHeader`: No script needed. Not used in any set yet.
  `{% from "govuk/components/generic-header/macro.njk" import govukGenericHeader %}`
- `govukHeader`: No script needed. Not used in any set yet.
  `{% from "govuk/components/header/macro.njk" import govukHeader %}`
- `govukHint`: No script needed. Not used in any set yet.
  `{% from "govuk/components/hint/macro.njk" import govukHint %}`
- `govukInput`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/template.njk` and 6 more.
  `{% from "govuk/components/input/macro.njk" import govukInput %}`
- `govukInsetText`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/consignment-contact-select/template.njk` and 3 more.
  `{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}`
- `govukLabel`: No script needed. Not used in any set yet.
  `{% from "govuk/components/label/macro.njk" import govukLabel %}`
- `govukNotificationBanner`: Script NOT started. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/template.njk` and 3 more.
  `{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}`
- `govukPagination`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/consignment-contact-select/template.njk` and 3 more.
  `{% from "govuk/components/pagination/macro.njk" import govukPagination %}`
- `govukPanel`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/confirmation/template.njk`.
  `{% from "govuk/components/panel/macro.njk" import govukPanel %}`
- `govukPasswordInput`: Script NOT started. Not used in any set yet.
  `{% from "govuk/components/password-input/macro.njk" import govukPasswordInput %}`
- `govukPhaseBanner`: No script needed. Not used in any set yet.
  `{% from "govuk/components/phase-banner/macro.njk" import govukPhaseBanner %}`
- `govukRadios`: Script started. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-status/template.njk` and 5 more.
  `{% from "govuk/components/radios/macro.njk" import govukRadios %}`
- `govukSelect`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/dashboard/template.njk`.
  `{% from "govuk/components/select/macro.njk" import govukSelect %}`
- `govukServiceNavigation`: Script started. Not used in any set yet.
  `{% from "govuk/components/service-navigation/macro.njk" import govukServiceNavigation %}`
- `govukSkipLink`: Script started. Not used in any set yet.
  `{% from "govuk/components/skip-link/macro.njk" import govukSkipLink %}`
- `govukSummaryList`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/template.njk` and 1 more.
  `{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}`
- `govukTable`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/list/list.njk` and 3 more.
  `{% from "govuk/components/table/macro.njk" import govukTable %}`
- `govukTabs`: Script NOT started. Not used in any set yet.
  `{% from "govuk/components/tabs/macro.njk" import govukTabs %}`
- `govukTag`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/dashboard/template.njk`.
  `{% from "govuk/components/tag/macro.njk" import govukTag %}`
- `govukTaskList`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/hub/template.njk`.
  `{% from "govuk/components/task-list/macro.njk" import govukTaskList %}`
- `govukTextarea`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/details/details.njk`.
  `{% from "govuk/components/textarea/macro.njk" import govukTextarea %}`
- `govukWarningText`: No script needed. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/template.njk` and 1 more.
  `{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}`

### MoJ Frontend

- `mojAddAnother`: Script NOT started. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/add-another/macro.njk" import mojAddAnother %}`
- `mojAlert`: Script NOT started. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/alert/macro.njk" import mojAlert %}`
- `mojBadge`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/badge/macro.njk" import mojBadge %}`
- `mojBanner`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/banner/macro.njk" import mojBanner %}`
- `mojButtonMenu`: Script NOT started. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/button-menu/macro.njk" import mojButtonMenu %}`
- `mojCookieBanner`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/cookie-banner/macro.njk" import mojCookieBanner %}`
- `mojCurrencyInput`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/currency-input/macro.njk" import mojCurrencyInput %}`
- `mojDatePicker`: Script started. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/template.njk`.
  `{% from "moj/components/date-picker/macro.njk" import mojDatePicker %}`
- `mojFilter`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/filter/macro.njk" import mojFilter %}`
- `mojHeader`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/header/macro.njk" import mojHeader %}`
- `mojIdentityBar`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/identity-bar/macro.njk" import mojIdentityBar %}`
- `interruptionCard`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/interruption-card/macro.njk" import interruptionCard %}`
- `mojMessages`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/messages/macro.njk" import mojMessages %}`
- `mojMultiFileUpload`: Script NOT started. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/multi-file-upload/macro.njk" import mojMultiFileUpload %}`
- `mojNotificationBadge`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/notification-badge/macro.njk" import mojNotificationBadge %}`
- `mojOrganisationSwitcher`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/organisation-switcher/macro.njk" import mojOrganisationSwitcher %}`
- `mojPageHeaderActions`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/page-header-actions/macro.njk" import mojPageHeaderActions %}`
- `mojPagination`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/pagination/macro.njk" import mojPagination %}`
- `mojPrimaryNavigation`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/primary-navigation/macro.njk" import mojPrimaryNavigation %}`
- `mojProgressBar`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/progress-bar/macro.njk" import mojProgressBar %}`
- `mojSearch`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/search/macro.njk" import mojSearch %}`
- `mojSideNavigation`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/side-navigation/macro.njk" import mojSideNavigation %}`
- `mojSubNavigation`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/sub-navigation/macro.njk" import mojSubNavigation %}`
- `mojTaskList`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/task-list/macro.njk" import mojTaskList %}`
- `mojTicketPanel`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/ticket-panel/macro.njk" import mojTicketPanel %}`
- `mojTimeline`: No script needed. Styles NOT loaded. Not used in any set yet.
  `{% from "moj/components/timeline/macro.njk" import mojTimeline %}`

### This prototype's own

- `appAccessibleAutocomplete`: Script started. Used in `src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/template.njk` and 2 more.
  `{% from "accessible-autocomplete/macro.njk" import appAccessibleAutocomplete %}`

<!-- components-we-have:end -->

## Pieces every journey page shares

These are not components but every journey template uses them. See
`docs/designers/gov-uk/templates-in-this-prototype.md` for what each does.

- `{% extends "shared/layout.njk" %}` and `{% block journeyContent %}`
- `{% include "shared/error-summary.njk" %}`
- `{% from "shared/section-caption.njk" import sectionCaption %}`
- `{% from "shared/save-actions.njk" import saveActions %}`
