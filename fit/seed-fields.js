// Resolve relative dates at use time so the shared JSON remains valid tomorrow.
export const seedFields = (step, today = new Date()) => {
  const fields = { ...step.fields }
  if (typeof fields.arrivalDate === 'object' && fields.arrivalDate !== null) {
    const date = new Date(today)
    date.setDate(date.getDate() + fields.arrivalDate.daysFromToday)
    fields.arrivalDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
  }
  return fields
}
