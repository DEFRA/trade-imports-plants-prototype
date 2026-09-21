# Validation

Controllers own field validation. Obligations decide whether data is owed; they do
not define form schemas or messages.

## Library surface

[`src/server/app/lib/validate/index.js`](../lib/validate/index.js) exports the runner
and named Joi schema factories. Each field factory accepts unknown sibling keys so
a controller can compose only the rules it owns.

`validate(schema, payload)` returns `{ value, errors }`. `errors` is `null` on
success or a flat `{ fieldId: message }` map. Validation runs with
`abortEarly: false`, while only the first message for each field is exposed.

## Controller contract

A collecting controller:

1. reads raw payload values
2. builds any service-backed schema at POST time
3. validates the payload
4. renders raw values with status 400 on error
5. commits the cleaned values on success

Build service-backed membership rules inside POST so they use reference data primed
at boot. A module-level schema can freeze an outdated service list.

Normalising validators return cleaned values. Persist `value` from the validation
result, not the raw payload. The guarantee is pinned by
[`src/server/app/lib/validate/persists-cleaned-value.test.js`](../lib/validate/persists-cleaned-value.test.js).

## GDS error wiring

Keep the field name, input id and error-map key identical.
[`kit.errorSummary()`](../shared/kit.js) turns the map into links to `#fieldId`, and
the GOV.UK or MoJ macro renders the matching inline error.

## Save rules and completion rules

A required Joi rule can block a malformed or blank page save. Obligation `status`,
scope and `requires` rules decide whether the journey is complete. These are
separate checks: saving an optional blank is allowed, while submit readiness still
reflects every in-scope mandatory obligation and group invariant.

[`src/server/app/flow/prerequisites.js`](../flow/prerequisites.js) adds the separate
continue-time gate for configured fields that must be answered before later pages
open.

## Dates and structured values

The date helpers validate a `dd/mm/yyyy` text value, then
[`kit.readDate()`](../shared/kit.js) stores `{ day, month, year }`.
`kit.dateField()` creates the MoJ date-picker view model, and carries optional
`minDate`/`maxDate` through to the picker's `data-min-date`/`data-max-date`
attributes.

`dateText` leaves the field optional: a blank value passes before the calendar
check runs. `requiredDateText` is the save-blocking form, and takes two messages
so a blank answer and an unreadable one read differently. It is a primitive
rather than `compose(requiredText, dateText)` because composing merges
`dateText`'s empty-string allowance onto the required rule — the same reason
`requiredMaxText` and `requiredIntegerInRange` exist.

`dateTextInRange` layers inclusive `Date` bounds on top of the `dateText`
calendar check. The caller supplies the bounds, so the policy and the
current-date read stay in the journey feature, out of `lib/validate`. A picker
bound is not enough on its own. The MoJ date picker is a free-text input, so the
server rule enforces the window and the `data-min-date`/`data-max-date`
attributes only hint the calendar to the user.

The two sides take the bounds in different forms, and mixing them fails
quietly. `dateTextInRange` compares raw timestamps, so `min`/`max` must be
midnight-UTC `Date`s — a `new Date()` carrying a time loses that whole day from
an inclusive bound. `kit.dateField()` writes its values straight into an HTML
attribute, so `minDate`/`maxDate` must be `d/m/yyyy` text, which is all the
picker parses. So a journey's bounds helper must return **both** shapes from one
call: `min`/`max` as midnight-UTC `Date`s for the validator, and
`minText`/`maxText` as `d/m/yyyy` strings for the field. Build them with the
[`calendar.js`](../lib/validate/calendar.js) helpers —
`startOfDayInZone`, `startOfUtcDay`, `addUtcDays`, `addUtcMonths` and
`formatDateText` — rather than by hand.

The high-risk-plants set's helper is
[`arrival-bounds.js`](../sets/high-risk-plants/journeys/linear/features/arrival-details/arrival-bounds.js),
beside the arrival-details feature and not in `lib/validate`: the window policy
and the current-date read are journey decisions. It bounds the date only when
the consignment has already arrived, and returns `max` and `maxText` from one
Europe/London clock read. A later dated page follows the same rule — its own
helper beside its own feature.

`dateTextInRange` and `dateText` let a blank value pass, so they never make an
optional field required. A date the page must have takes
`requiredDateTextInRange` instead — a single primitive, because composing
`requiredText` with either of the other two merges their empty-string allowance
onto the required rule and blank then passes. `requiredTime` is the same
primitive for a 24-hour time.

Structured values such as addresses are opaque to model completeness: a non-blank
object is filled. The collecting controller must validate required subfields before
it commits the object.
