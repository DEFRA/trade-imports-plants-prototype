# What the prototype's refusals mean

The prototype checks the journey every time it starts. If a change leaves the
journey inconsistent, it refuses to start and prints one of the messages
below. You see them in the `npm run dev` window, and in the log that
`npm run designer:check` prints the path of.

This file covers the refusals a journey change causes. For every other error
(formatting, Welsh copy shape, a port in use, a missing browser), use
`check-my-change`: its translator covers them, and
`docs/designers/checks-and-errors.md` lists them for the designer.

For each message: what it means in plain English, the step you missed, and the
fix. Tell the designer the plain meaning, not the raw message.

## Obligations collected by no page: `<name>`

**Plain English:** a question exists in the list of things a notification
owes, but no page asks it.

**Missed step:** the page's controller does not list the field in
`meta.collects`, or the controller's `meta` is not in `dispatchPages` in
`features/index.js`.

**Fix:** add the field name to `collects`, and check `dispatchPages`.

## Invalid fulfilment binding registry: obligations owned by no feature: `<name>`

**Plain English:** a question exists, but nothing says where its answer is
stored.

**Missed step:** add-a-field step 2. The feature's `evaluation.js` has no
`scalar({ field, obligation })` line for it, or the feature's bindings are not
in `featureEvaluationBindings` in `features/evaluation.js`.

**Fix:** add the binding, and register the feature's bindings if it is new.

## Invalid fulfilment binding registry: binding for `<field>` must import its obligation object from the manifest

**Plain English:** the storage line points at a copy of the question, not the
question itself.

**Missed step:** the binding imports the obligation from somewhere other than
the set's `obligations/index.js`, or the obligation was never added to that
file's export list and `obligations` array.

**Fix:** export it from `obligations/index.js`, add it to the `obligations`
array, and import it from there in `evaluation.js`.

## Invalid fulfilment binding registry: feature name `<name>` is registered twice

**Plain English:** two features claim the same name.

**Missed step:** a copied `evaluation.js` still says
`feature('<old-name>', ...)`.

**Fix:** give the new feature its own name, matching its folder.

## Invalid fulfilment binding registry: obligation `<name>` is owned by both `<a>` and `<b>`

**Plain English:** two features both claim to store the same answer.

**Fix:** keep the binding in the feature whose page asks the question. Remove
the other.

## Obligation `<name>` is collected by two pages

**Plain English:** two pages both ask the same question.

**Missed step:** a copied controller kept the old page's `collects`.

**Fix:** each field belongs to exactly one page. Remove it from the page that
should not ask it.

## Obligation id `<name>` contains a path metacharacter

**Plain English:** a field name contains `.`, `[` or `]`.

**Fix:** rename the field in camel case, like `numberOfVehicles`, everywhere:
the obligation, the binding, `collects`, the form field and the copy.

## Model purity violated: display logic does not live in the model

**Plain English:** a question's definition carries words meant for the
screen.

**Missed step:** an obligation in `obligations/sections/` has a `label`,
`title`, `titleKey`, `hint`, `legend` or `widget` key.

**Fix:** remove the key. Put the words in the feature's `copy/copy.en.js` and
`copy/copy.cy.js`.

## Unrecognised answer key(s)

**Plain English:** a page tried to save an answer the journey does not know
about. This shows when someone presses Continue, not when the prototype
starts.

**Missed step:** the controller commits a field that is not an obligation.
Usually the obligation was not added to the `obligations` array, or its `name`
differs from the form field name.

**Fix:** make the obligation's `name`, the form field `name` and `id`, and the
key the controller commits all the same.

## New route `<path>` conflicts with existing `<path>`

**Plain English:** two pages have the same web address.

**Missed step:** a copied `page.js` kept the old slug.

**Fix:** give the new page its own slug.

## Template render error: template not found

**Plain English:** a controller points at a template file that is not there.

**Fix:** the view name must be
`` `${TEMPLATES}/features/<folder>/template` `` with the real folder name, and
the folder must contain `template.njk`. Never type the release id by hand:
import `TEMPLATES` from `../../config.js`.

## The requested module does not provide an export named `<name>`

**Plain English:** a file imports something under a name that the other file
does not use.

**Fix:** check the spelling in both files. A page identity is usually
`export const <camelCaseName>Page = { id, slug }`.

## ObligationEvaluator: applyTo/purge did not converge

**Plain English:** two questions each decide whether the other applies, so the
prototype cannot settle which to keep.

**Missed step:** add-a-branch step 1. A gate must only look at an answer given
earlier, and never at itself or at the page it hides.

**Fix:** make the gate depend on one earlier answer.

## Lint: `set-isolation`

**Plain English:** a file in the release imports from another set, usually
from `sets/high-risk-plants/`.

**Fix:** import from the release's own folder. Copy what you need into the
release if it is not there.

## Lint: `obligations-never-journeys`

**Plain English:** a question's definition imports from the journey folder.

**Missed step:** add-a-branch step 1. A gate's value was imported from a
feature (for example from `statuses.js`) instead of written in the
obligations file.

**Fix:** write the value as a plain string in the obligations file, the way
`obligations/sections/arrival.js` does.

## Lint: `no-circular`

**Plain English:** two files import each other, directly or in a loop.

**Missed step:** a `page.js` imports something. It must import nothing.

**Fix:** remove the import from `page.js`.

## Lint: `no-orphans` (a warning, not a failure)

**Plain English:** a new file is not used by anything.

**Missed step:** the controller is not imported in `features/index.js`, or a
new `page.js` is not imported by its controller.

**Fix:** register it. If you meant to remove the page, delete its whole
feature folder.

## An example stopped at a page

`designer:examples -- check <release>` says an example stopped at a page, or
the page said an error.

**Plain English:** the release's example data does not answer a question that
is now required.

**Fix:** add the answer to that page's step in
`flow/fixtures/happy-path.json` for every scenario that reaches it, or add a
step for a new page. Field keys are the field names.

## When none of these match

The failure may not be caused by this change. Run
`npm run designer:where -- --changed` to see what changed. If the failing file
is not one you touched, say "this is not caused by your change: tell the
maintainer", and stop. Never edit a file the real service owns to make a
check pass.
