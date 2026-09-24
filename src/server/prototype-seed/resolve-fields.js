/**
 * A fixture step's fields, with `arrivalDate` resolved to a real "d/m/yyyy"
 * relative to today — the same relative-date trick `fit/seed-fields.js` uses
 * for the Playwright journey smoke test, kept here too because `fit/` is test
 * tooling that never ships in the production image this runs in.
 */
export const resolveFields = (step, today = new Date()) => {
  const fields = { ...step.fields }
  if (typeof fields.arrivalDate === 'object' && fields.arrivalDate !== null) {
    const date = new Date(today)
    date.setDate(date.getDate() + fields.arrivalDate.daysFromToday)
    fields.arrivalDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  }
  return fields
}
