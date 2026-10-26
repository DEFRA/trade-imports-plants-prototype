import { expect, vi } from 'vitest'

import { SET_BASE } from '../../../../set.js'
import { PAGE_SIZE } from '../../../../../../services/address-book/index.js'
import { copy as pickerCopy } from './copy/copy.en.js'

const JOURNEY_ID = 'HRP-0001'
const LABELS = pickerCopy.pagination
const PAGES_IN_A_SHORT_BOOK = 3
const FIRST_THREE_PAGES = Array.from(
  { length: PAGES_IN_A_SHORT_BOOK },
  (_, index) => index + 1
)
export const IMPORT_CO = 'import-co-uk'

const LINE_1 = '18 Dockside Road'
const POSTCODE = 'E14 9GE'
const COUNTRY = 'United Kingdom'
const ONE_LINE = `${LINE_1}, Unit 4, London, Greater London, ${POSTCODE}`

export const TECH_IMPORTS_ID = 'tech-imports-ltd'
export const TECH_IMPORTS_NAME = 'Tech Imports Ltd'

export const NOT_IN_THE_BOOK = 'no-such-address'
export const DELETED_ID = 'closed-depot-ltd'

const API_PAGE_SIZE = 25

const apiRecord = (id, overrides = {}) => ({
  id,
  name: `Record ${id}`,
  addressLine1: '1 Test Street',
  townOrCity: 'Testville',
  postcode: 'TE5 7ER',
  countryCode: 'BE',
  deleted: false,
  ...overrides
})

const LIVE_RECORDS = [apiRecord('live-depot-one'), apiRecord('live-depot-two')]

const COUNTRIES_IN_THE_REFERENCE_DATA = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'BE', name: 'Belgium' }
]

export const okJson = (body) => ({
  ok: true,
  status: 200,
  json: async () => body
})

export const bookHoldingADeletedRecord = () =>
  vi.fn(async (url) => {
    if (url.endsWith(`/addresses/${DELETED_ID}`)) {
      return okJson(apiRecord(DELETED_ID, { deleted: true }))
    }
    if (new URL(url).pathname.endsWith('/countries')) {
      return okJson(COUNTRIES_IN_THE_REFERENCE_DATA)
    }
    return okJson({
      items: LIVE_RECORDS,
      page: 1,
      pageSize: API_PAGE_SIZE,
      totalItems: LIVE_RECORDS.length,
      totalPages: 1
    })
  })

export const addressRecord = (id, name, address = {}) => ({
  id,
  name,
  deleted: false,
  address: {
    addressLine1: LINE_1,
    addressLine2: 'Unit 4',
    townOrCity: 'London',
    county: 'Greater London',
    postcode: POSTCODE,
    country: COUNTRY,
    phone: '01632 960123',
    email: 'trade@example.com',
    ...address
  }
})

const found = (results, { page = 1, total = results.length } = {}) => ({
  results,
  total,
  page,
  totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  pageSize: PAGE_SIZE
})

const pagePathFor = (slug) => `${SET_BASE}/notifications/${JOURNEY_ID}/${slug}`

const resultsHrefCases = ({ resultsHref, slug }) => ({
  name: '#resultsHref',
  cases: [
    {
      title: 'Should carry the search term, the page and the ticked row',
      check: () => {
        expect(
          resultsHref(JOURNEY_ID, {
            query: 'imports',
            page: 3,
            selectedId: TECH_IMPORTS_ID
          })
        ).toBe(
          `${pagePathFor(slug)}?q=imports&page=3&selected=${TECH_IMPORTS_ID}`
        )
      }
    },
    {
      title: 'Should leave out a search term and a selection it does not have',
      check: () => {
        expect(
          resultsHref(JOURNEY_ID, { query: '', page: 2, selectedId: '' })
        ).toBe(`${pagePathFor(slug)}?page=2`)
      }
    }
  ]
})

const pagingState = (overrides) => ({
  query: '',
  page: 1,
  totalPages: 3,
  selectedId: '',
  labels: LABELS,
  ...overrides
})

const paginationCases = ({ pagination }) => ({
  name: '#pagination',
  cases: [
    {
      title: 'Should render nothing while one page holds every result',
      check: () => {
        expect(
          pagination(JOURNEY_ID, pagingState({ totalPages: 1 }))
        ).toBeNull()
      }
    },
    {
      title: 'Should offer next but no previous on the first page',
      check: () => {
        const paged = pagination(JOURNEY_ID, pagingState({}))

        expect(paged.previous).toBeUndefined()
        expect(paged.next.href).toContain('page=2')
        expect(paged.next.text).toBe(LABELS.next)
        expect(paged.items.map((item) => item.number)).toEqual(
          FIRST_THREE_PAGES
        )
        expect(paged.items[0].current).toBe(true)
      }
    },
    {
      title: 'Should offer previous but no next on the last page',
      check: () => {
        const paged = pagination(JOURNEY_ID, pagingState({ page: 3 }))

        expect(paged.previous.href).toContain('page=2')
        expect(paged.previous.text).toBe(LABELS.previous)
        expect(paged.next).toBeUndefined()
      }
    },
    {
      title: 'Should name the paging links in the language of the page',
      check: () => {
        const paged = pagination(
          JOURNEY_ID,
          pagingState({
            page: 2,
            labels: { previous: 'Blaenorol', next: 'Nesaf' }
          })
        )

        expect(paged.previous.text).toBe('Blaenorol')
        expect(paged.next.text).toBe('Nesaf')
      }
    }
  ]
})

const pagingLinkCases = ({ pagination, slug }) => ({
  name: '#pagination links',
  cases: [
    {
      title:
        'Should carry the search term and the ticked row into every paging link',
      check: () => {
        const paged = pagination(
          JOURNEY_ID,
          pagingState({
            query: 'imports',
            page: 2,
            selectedId: TECH_IMPORTS_ID
          })
        )

        const pagePath = pagePathFor(slug)

        expect(paged.previous.href).toBe(
          `${pagePath}?q=imports&page=1&selected=${TECH_IMPORTS_ID}`
        )
        expect(paged.next.href).toBe(
          `${pagePath}?q=imports&page=3&selected=${TECH_IMPORTS_ID}`
        )
        expect(paged.items[0].href).toBe(
          `${pagePath}?q=imports&page=1&selected=${TECH_IMPORTS_ID}`
        )
      }
    },
    {
      title: 'Should elide the pages the window skips over',
      check: () => {
        const paged = pagination(
          JOURNEY_ID,
          pagingState({ page: 5, totalPages: 10 })
        )

        expect(paged.items).toEqual([
          {
            number: 1,
            href: expect.stringContaining('page=1'),
            current: false
          },
          { ellipsis: true },
          {
            number: 4,
            href: expect.stringContaining('page=4'),
            current: false
          },
          {
            number: 5,
            href: expect.stringContaining('page=5'),
            current: true
          },
          {
            number: 6,
            href: expect.stringContaining('page=6'),
            current: false
          },
          { ellipsis: true },
          {
            number: 10,
            href: expect.stringContaining('page=10'),
            current: false
          }
        ])
      }
    }
  ]
})

const rowCases = ({ fieldName, pickerViewModel }) => {
  const rows = [
    addressRecord(TECH_IMPORTS_ID, TECH_IMPORTS_NAME),
    addressRecord(IMPORT_CO, 'Import Co UK')
  ]

  const viewModelFor = (pagesFound, selectedId = '') =>
    pickerViewModel(
      JOURNEY_ID,
      { query: '', selectedId, found: pagesFound },
      pickerCopy
    )

  return {
    name: '#pickerViewModel',
    cases: [
      {
        title:
          'Should give the first row on the first page the bare field name so the error link focuses it',
        check: () => {
          const picker = viewModelFor(found(rows))

          expect(picker.rows.map((row) => row.idPrefix)).toEqual([
            fieldName,
            `${fieldName}-2`
          ])
        }
      },
      {
        title:
          'Should give the first row of every page the bare field name so the error link resolves',
        check: () => {
          const picker = viewModelFor(found(rows, { page: 2, total: 7 }))

          expect(picker.rows.map((row) => row.idPrefix)).toEqual([
            fieldName,
            `${fieldName}-7`
          ])
        }
      },
      {
        title: 'Should tick the row the selection names, and only that one',
        check: () => {
          const picker = viewModelFor(found(rows), IMPORT_CO)

          expect(picker.rows.map((row) => row.checked)).toEqual([false, true])
        }
      },
      {
        title: 'Should count the rows shown against the rows found',
        check: () => {
          const picker = viewModelFor(found(rows, { total: 13 }))

          expect(picker.resultsCount).toBe('Showing 2 out of 13 results')
        }
      },
      {
        title: 'Should label the paging links with the shared picker copy',
        check: () => {
          const picker = viewModelFor(found(rows, { page: 2, total: 13 }))

          expect(picker.pagination.previous.text).toBe(LABELS.previous)
          expect(picker.pagination.next.text).toBe(LABELS.next)
        }
      },
      {
        title:
          'Should carry the country as its own column and leave it out of the line',
        check: () => {
          const picker = viewModelFor(found(rows))

          expect(picker.rows[0].country).toBe(COUNTRY)
          expect(picker.rows[0].addressText).toBe(ONE_LINE)
        }
      }
    ]
  }
}

/**
 * Builds the test cases every address picker's view model and pagination
 * share, grouped by the function they prove.
 *
 * @param {object} picker
 * @param {string} picker.fieldName - the answer name the page collects
 * @param {string} picker.slug - the page's path under the notification
 * @param {Function} picker.pickerViewModel - the page's bound view model
 * @param {Function} picker.pagination - the page's bound pagination builder
 * @param {Function} picker.resultsHref - the page's bound results link builder
 * @returns {Array<{ name: string, cases: Array<{ title: string, check: Function }> }>}
 */
export const pickerViewModelSuites = (picker) => [
  resultsHrefCases(picker),
  paginationCases(picker),
  pagingLinkCases(picker),
  rowCases(picker)
]
