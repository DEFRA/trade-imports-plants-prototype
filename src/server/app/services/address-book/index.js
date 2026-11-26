<<<<<<< HEAD
import { isStubDataMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
=======
import { isStubMode } from '../../../common/services/mode.js'
import { addressBookCountryCodesMatching } from '../countries/index.js'
>>>>>>> upstream/main
import * as client from './client.js'
import { STUB_BOOK as STUB_ROWS } from './stub/index.js'
import { withExtraParties } from '../../../prototype-data/index.js'
const STUB_BOOK = withExtraParties(STUB_ROWS)

const searchableTextOf = (record) =>
  [record.name, ...Object.values(record.address ?? {})]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const matchesSearch = (record, query) =>
  searchableTextOf(record).includes(query.trim().toLowerCase())

export const offeredForRole = (record, role) =>
  !role || record.roles.length === 0 || record.roles.includes(role)

const pageNumbersFrom = (first, last) =>
  Array.from({ length: last - first + 1 }, (_, index) => first + index)

const recordsFromEveryLivePage = async (orgId, query) => {
  const PAGES_READ_AT_ONCE = 4
  const countryCodes = await addressBookCountryCodesMatching(query)
  const readPage = (page) =>
    client.listAddresses(orgId, {
      page,
      pageSize: client.MAX_API_PAGE_SIZE,
      query,
      countryCodes
    })
  const first = await readPage(1)
  const records = [...first.records]
  for (
    let batchStart = 2;
    batchStart <= first.totalPages;
    batchStart += PAGES_READ_AT_ONCE
  ) {
    const batchEnd = Math.min(
      batchStart + PAGES_READ_AT_ONCE - 1,
      first.totalPages
    )
    const batch = await Promise.all(
      pageNumbersFrom(batchStart, batchEnd).map(readPage)
    )
    records.push(...batch.flatMap((found) => found.records))
  }
  return records
}

<<<<<<< HEAD
const searchStub = (query, requested) => {
  const term = query.trim().toLowerCase()
  return pageOf(
    STUB_BOOK.filter((record) => haystack(record).includes(term)),
    requested
  )
}

/** One page of ours, cut out of one page of theirs. Their page holds
 * `API_PAGE_SIZE` records and ours holds `PAGE_SIZE`, so a page of ours falls
 * entirely inside a single page of theirs — no straddling, no second call. */
const sliceAt = async (orgId, query, requested) => {
  const offset = (requested - 1) * PAGE_SIZE
  let apiPage = Math.floor(offset / client.API_PAGE_SIZE) + 1
  let found = await client.listAddresses(orgId, { page: apiPage, query })

  // The server owns its page size. If it is not what we assumed, the page we
  // just asked for was the wrong one — redo the arithmetic with the real size.
  if (found.pageSize > 0 && found.pageSize !== client.API_PAGE_SIZE) {
    apiPage = Math.floor(offset / found.pageSize) + 1
    found = await client.listAddresses(orgId, { page: apiPage, query })
  }

  const within = offset - (apiPage - 1) * found.pageSize
  return {
    results: found.records.slice(within, within + PAGE_SIZE),
    total: found.totalItems,
    page: requested,
    totalPages: Math.max(1, Math.ceil(found.totalItems / PAGE_SIZE)),
    pageSize: PAGE_SIZE
  }
}

/** An out-of-range page falls back to the first — the book decides what a page
 * is, the pages only render what comes back. The API rejects an out-of-range
 * page with a 400, so that is a fallback and not an error. */
const searchReal = async (orgId, query, requested) => {
  try {
    const found = await sliceAt(orgId, query, requested)
    if (requested <= found.totalPages) {
      return found
    }
  } catch (error) {
    if (error.status !== HTTP_STATUS_BAD_REQUEST) {
      throw error
    }
  }
  return sliceAt(orgId, query, 1)
}

/** Free-text search over the organisation's book, returning one page. */
export const search = async (orgId, { query = '', page = 1 } = {}) => {
  const requested = Number.isInteger(page) && page >= 1 ? page : 1
  return isStubDataMode()
    ? searchStub(query, requested)
    : searchReal(orgId, query, requested)
=======
/** The organisation's live addresses matching an optional search term (part of
 * a name, part of an address or part of a country's name), narrowed to an
 * optional role: a record holding that role, or holding no role at all,
 * matches; with no role given, every matching record does. */
export const addresses = async (orgId, { query = '', role } = {}) => {
  const matching = isStubMode()
    ? STUB_BOOK.filter((record) => matchesSearch(record, query))
    : await recordsFromEveryLivePage(orgId, query)
  return matching.filter((record) => offeredForRole(record, role))
>>>>>>> upstream/main
}

/** One address by id. Resolves to undefined when the record does not exist for
 * this organisation; a soft-deleted record comes back with `deleted: true`. */
export const party = async (orgId, id) => {
  if (isStubDataMode()) {
    return STUB_BOOK.find((record) => record.id === id)
  }
  return client.getAddress(orgId, id)
}
