import { expect } from 'vitest'

import { copy as pickerCopy } from './copy/copy.en.js'
import { TECH_IMPORTS_ID, TECH_IMPORTS_NAME } from '../../test-support.js'

export const IMPORT_CO = 'import-co-uk'

const LINE_1 = '18 Dockside Road'
const POSTCODE = 'E14 9GE'
const COUNTRY = 'United Kingdom'

export const NOT_IN_THE_BOOK = 'no-such-address'
export const DELETED_ID = 'closed-depot-ltd'

const API_PAGE_SIZE = 25

const apiRecord = (id, overrides = {}) => ({
  id,
  name: `Record ${id}`,
  addressLine1: '1 Test Street',
  townOrCity: 'Testville',
  postcode: 'TE5 7ER',
  countryCode: 'CH',
  deleted: false,
  roles: [],
  ...overrides
})

const LIVE_RECORDS = [apiRecord('live-depot-one'), apiRecord('live-depot-two')]

/** The address book's answer to an address request for a book whose
 * `DELETED_ID` record is deleted and whose list holds two live records. */
export const addressResponseForABookHoldingADeletedRecord = (request) => {
  const body = request.url.endsWith(`/addresses/${DELETED_ID}`)
    ? apiRecord(DELETED_ID, { deleted: true })
    : {
        items: LIVE_RECORDS,
        page: 1,
        pageSize: API_PAGE_SIZE,
        totalItems: LIVE_RECORDS.length,
        totalPages: 1
      }
  return { body: JSON.stringify(body) }
}

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

const rowCases = ({ fieldName, pickerViewModel }) => {
  const found = [
    addressRecord(TECH_IMPORTS_ID, TECH_IMPORTS_NAME),
    addressRecord(IMPORT_CO, 'Import Co UK')
  ]

  const viewModelFor = (records, selectedId = '') =>
    pickerViewModel({ query: '', selectedId, found: records }, pickerCopy)

  return {
    name: '#pickerViewModel',
    cases: [
      {
        title:
          'Should give the first row the bare field name so the error link focuses it',
        check: () => {
          const picker = viewModelFor(found)

          expect(picker.rows.map((row) => row.idPrefix)).toEqual([
            fieldName,
            `${fieldName}-2`
          ])
        }
      },
      {
        title: 'Should tick the row the selection names, and only that one',
        check: () => {
          const picker = viewModelFor(found, IMPORT_CO)

          expect(picker.rows.map((row) => row.checked)).toEqual([false, true])
        }
      },
      {
        title: 'Should count every row the picker is given, whatever the count',
        check: () => {
          const picker = viewModelFor(found)

          expect(picker.resultsCount).toBe('Showing 2 out of 2 results')
        }
      },
      {
        title:
          'Should carry the country as its own column and leave it out of the address lines',
        check: () => {
          const picker = viewModelFor(found)

          expect(picker.rows[0].country).toBe(COUNTRY)
          expect(picker.rows[0].addressLines).toEqual([
            LINE_1,
            'Unit 4',
            `London, Greater London, ${POSTCODE}`
          ])
        }
      }
    ]
  }
}

/**
 * Builds the test cases every address picker's view model shares.
 *
 * @param {object} picker
 * @param {string} picker.fieldName - the answer name the page collects
 * @param {Function} picker.pickerViewModel - the page's bound view model
 * @returns {Array<{ name: string, cases: Array<{ title: string, check: Function }> }>}
 */
export const pickerViewModelSuites = (picker) => [rowCases(picker)]
