import { describe, expect, it } from 'vitest'

import { pagePath } from '../../../../../../../shared/paths.js'
import { PLACE_OF_DESTINATION } from '../fields.js'
import { placeOfDestinationPage } from '../page.js'
import { copy } from '../copy/copy.en.js'
import {
  addressText,
  detailLines
} from '../../address-book-picker/address-lines.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

const JOURNEY_ID = 'HRP-0001'
const PAGE_SIZE = 5
const PAGE_PATH = pagePath(JOURNEY_ID, placeOfDestinationPage.slug)
const LABELS = copy.pagination

const LINE_1 = '18 Dockside Road'
const LINE_2 = 'Unit 4'
const TOWN = 'London'
const COUNTY = 'Greater London'
const POSTCODE = 'E14 9GE'
const COUNTRY = 'United Kingdom'
const ONE_LINE = `${LINE_1}, ${LINE_2}, ${TOWN}, ${COUNTY}, ${POSTCODE}`
const TELEPHONE = '01632 960123'
const EMAIL = 'trade@example.com'

const TECH_IMPORTS_ID = 'tech-imports-ltd'
const TECH_IMPORTS_NAME = 'Tech Imports Ltd'

const record = (id, name, address = {}) => ({
  id,
  name,
  deleted: false,
  address: {
    addressLine1: LINE_1,
    addressLine2: LINE_2,
    townOrCity: TOWN,
    county: COUNTY,
    postalOrZipCode: POSTCODE,
    country: COUNTRY,
    telephoneNumber: TELEPHONE,
    emailAddress: EMAIL,
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

describe('#addressText', () => {
  it('Should join the parts it holds, in reading order, leaving the country out', () => {
    expect(
      addressText({
        addressLine1: LINE_1,
        addressLine2: LINE_2,
        townOrCity: TOWN,
        county: COUNTY,
        postalOrZipCode: POSTCODE,
        country: COUNTRY
      })
    ).toBe(ONE_LINE)
  })

  it('Should skip a part the record does not carry', () => {
    expect(addressText({ addressLine1: LINE_1, townOrCity: TOWN })).toBe(
      `${LINE_1}, ${TOWN}`
    )
  })

  it('Should answer an empty line for a record with no address at all', () => {
    expect(addressText()).toBe('')
  })
})

describe('#detailLines', () => {
  it('Should read out the name, the whole address and the contact details', () => {
    expect(detailLines(record(TECH_IMPORTS_ID, TECH_IMPORTS_NAME))).toEqual([
      TECH_IMPORTS_NAME,
      LINE_1,
      LINE_2,
      TOWN,
      COUNTY,
      POSTCODE,
      COUNTRY,
      TELEPHONE,
      EMAIL
    ])
  })
})

describe('#resultsHref', () => {
  it('Should carry the search term, the page and the ticked row', () => {
    expect(
      resultsHref(JOURNEY_ID, {
        query: 'imports',
        page: 3,
        selectedId: TECH_IMPORTS_ID
      })
    ).toBe(
      `/notifications/${JOURNEY_ID}/destinations/select?q=imports&page=3&selected=${TECH_IMPORTS_ID}`
    )
  })

  it('Should leave out a search term and a selection it does not have', () => {
    expect(
      resultsHref(JOURNEY_ID, { query: '', page: 2, selectedId: '' })
    ).toBe(`/notifications/${JOURNEY_ID}/destinations/select?page=2`)
  })
})

describe('#pagination', () => {
  it('Should render nothing while one page holds every result', () => {
    expect(
      pagination(JOURNEY_ID, {
        query: '',
        page: 1,
        totalPages: 1,
        selectedId: '',
        labels: LABELS
      })
    ).toBeNull()
  })

  it('Should offer next but no previous on the first page', () => {
    const paged = pagination(JOURNEY_ID, {
      query: '',
      page: 1,
      totalPages: 3,
      selectedId: '',
      labels: LABELS
    })

    expect(paged.previous).toBeUndefined()
    expect(paged.next.href).toContain('page=2')
    expect(paged.next.text).toBe(LABELS.next)
    expect(paged.items.map((item) => item.number)).toEqual([1, 2, 3])
    expect(paged.items[0].current).toBe(true)
  })

  it('Should offer previous but no next on the last page', () => {
    const paged = pagination(JOURNEY_ID, {
      query: '',
      page: 3,
      totalPages: 3,
      selectedId: '',
      labels: LABELS
    })

    expect(paged.previous.href).toContain('page=2')
    expect(paged.previous.text).toBe(LABELS.previous)
    expect(paged.next).toBeUndefined()
  })

  it('Should name the paging links in the language of the page', () => {
    const paged = pagination(JOURNEY_ID, {
      query: '',
      page: 2,
      totalPages: 3,
      selectedId: '',
      labels: { previous: 'Blaenorol', next: 'Nesaf' }
    })

    expect(paged.previous.text).toBe('Blaenorol')
    expect(paged.next.text).toBe('Nesaf')
  })

  it('Should carry the search term and the ticked row into every paging link', () => {
    const paged = pagination(JOURNEY_ID, {
      query: 'imports',
      page: 2,
      totalPages: 3,
      selectedId: TECH_IMPORTS_ID,
      labels: LABELS
    })

    expect(paged.previous.href).toBe(
      `${PAGE_PATH}?q=imports&page=1&selected=${TECH_IMPORTS_ID}`
    )
    expect(paged.next.href).toBe(
      `${PAGE_PATH}?q=imports&page=3&selected=${TECH_IMPORTS_ID}`
    )
    expect(paged.items[0].href).toBe(
      `${PAGE_PATH}?q=imports&page=1&selected=${TECH_IMPORTS_ID}`
    )
  })

  it('Should elide the pages the window skips over', () => {
    const paged = pagination(JOURNEY_ID, {
      query: '',
      page: 5,
      totalPages: 10,
      selectedId: '',
      labels: LABELS
    })

    expect(paged.items).toEqual([
      { number: 1, href: expect.stringContaining('page=1'), current: false },
      { ellipsis: true },
      { number: 4, href: expect.stringContaining('page=4'), current: false },
      { number: 5, href: expect.stringContaining('page=5'), current: true },
      { number: 6, href: expect.stringContaining('page=6'), current: false },
      { ellipsis: true },
      { number: 10, href: expect.stringContaining('page=10'), current: false }
    ])
  })
})

describe('#pickerViewModel', () => {
  const rows = [
    record(TECH_IMPORTS_ID, TECH_IMPORTS_NAME),
    record('import-co-uk', 'Import Co UK')
  ]

  it('Should give the first row the field name so the error link focuses it', () => {
    const picker = pickerViewModel(
      JOURNEY_ID,
      { query: '', selectedId: '', found: found(rows) },
      copy
    )

    expect(picker.rows.map((row) => row.idPrefix)).toEqual([
      'placeOfDestination',
      'placeOfDestination-2'
    ])
  })

  it('Should give the first row of every page the bare field name so the error link resolves', () => {
    const picker = pickerViewModel(
      JOURNEY_ID,
      { query: '', selectedId: '', found: found(rows, { page: 2, total: 7 }) },
      copy
    )

    expect(picker.rows.map((row) => row.idPrefix)).toEqual([
      PLACE_OF_DESTINATION,
      'placeOfDestination-7'
    ])
  })

  it('Should tick the row the selection names, and only that one', () => {
    const picker = pickerViewModel(
      JOURNEY_ID,
      { query: '', selectedId: 'import-co-uk', found: found(rows) },
      copy
    )

    expect(picker.rows.map((row) => row.checked)).toEqual([false, true])
  })

  it('Should count the rows shown against the rows found', () => {
    const picker = pickerViewModel(
      JOURNEY_ID,
      { query: '', selectedId: '', found: found(rows, { total: 13 }) },
      copy
    )

    expect(picker.resultsCaption).toBe('Showing 2 of 13 addresses')
  })

  it('Should carry the country as its own column and leave it out of the line', () => {
    const picker = pickerViewModel(
      JOURNEY_ID,
      { query: '', selectedId: '', found: found(rows) },
      copy
    )

    expect(picker.rows[0].country).toBe(COUNTRY)
    expect(picker.rows[0].addressText).toBe(ONE_LINE)
  })
})
