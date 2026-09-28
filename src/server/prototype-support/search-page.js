/**
 * The page size every fake search returns, the same as the address book's
 * picker (`src/server/app/services/address-book/index.js`), so a picker page
 * copied from the address book shows the same number of rows.
 */
export const PAGE_SIZE = 5

/**
 * Lower-cased text a free-text search matches against.
 *
 * @param {Array<*>} parts - the values to search, nested objects included.
 * @returns {string} every non-empty string value, joined.
 */
export const haystackOf = (parts) =>
  parts
    .flatMap((part) =>
      part && typeof part === 'object' ? Object.values(part) : [part]
    )
    .filter((part) => typeof part === 'string' && part.length > 0)
    .join(' ')
    .toLowerCase()

/**
 * One page of results, in the shape the address book's `search()` returns:
 * `{ results, total, page, totalPages, pageSize }`. An out-of-range page falls
 * back to the first, as the address book does.
 *
 * @param {Array<object>} records - every matching record, in display order.
 * @param {number} requested - the page asked for, counting from 1.
 * @param {number} [pageSize] - rows per page.
 * @returns {{results: Array<object>, total: number, page: number, totalPages: number, pageSize: number}}
 * the page.
 */
export const pageOf = (records, requested, pageSize = PAGE_SIZE) => {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))
  const current =
    Number.isInteger(requested) && requested >= 1 && requested <= totalPages
      ? requested
      : 1
  const from = (current - 1) * pageSize
  return {
    results: structuredClone(records.slice(from, from + pageSize)),
    total: records.length,
    page: current,
    totalPages,
    pageSize
  }
}

/**
 * Free-text search over records, one page at a time.
 *
 * @param {Array<object>} records - every record the caller may see.
 * @param {(record: object) => Array<*>} fieldsOf - the values to match.
 * @param {object} [options]
 * @param {string} [options.query] - the search text; empty matches all.
 * @param {number} [options.page] - the page asked for.
 * @returns {object} the page, as `pageOf` returns it.
 */
export const searchRecords = (records, fieldsOf, { query = '', page = 1 }) => {
  const term = String(query ?? '')
    .trim()
    .toLowerCase()
  const matching = term
    ? records.filter((record) => haystackOf(fieldsOf(record)).includes(term))
    : records
  return pageOf(matching, page)
}

/**
 * A readable, unique id for a new record, from its name.
 *
 * @param {string} name - what the designer or participant typed.
 * @param {Set<string>} taken - ids already in use.
 * @returns {string} for example `quick-haulage-ltd` or `quick-haulage-ltd-2`.
 */
export const idFromName = (name, taken) => {
  const base =
    String(name ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .join('-') || 'record'
  let candidate = base
  let suffix = 1
  while (taken.has(candidate)) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  return candidate
}
