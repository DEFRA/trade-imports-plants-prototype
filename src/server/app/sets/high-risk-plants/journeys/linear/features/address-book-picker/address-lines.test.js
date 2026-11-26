import { describe, expect, it } from 'vitest'

import {
  addressParts,
  addressText,
  contactLines,
  pickerAddressLines
} from './address-lines.js'
import { addressRecord } from './test-support.js'

const LINE_1 = '18 Dockside Road'
const LINE_2 = 'Unit 4'
const TOWN = 'London'
const COUNTY = 'Greater London'
const POSTCODE = 'E14 9GE'
const COUNTRY = 'United Kingdom'
const ONE_LINE = `${LINE_1}, ${LINE_2}, ${TOWN}, ${COUNTY}, ${POSTCODE}`

describe('#addressText', () => {
  it('Should join the parts it holds, in reading order, leaving the country out', () => {
    expect(
      addressText({
        addressLine1: LINE_1,
        addressLine2: LINE_2,
        townOrCity: TOWN,
        county: COUNTY,
        postcode: POSTCODE,
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

describe('#pickerAddressLines', () => {
  it('Should give each street line its own line, then town or city, county and postcode on one line, without the country', () => {
    expect(
      pickerAddressLines({
        addressLine1: LINE_1,
        addressLine2: LINE_2,
        townOrCity: TOWN,
        county: COUNTY,
        postcode: POSTCODE,
        country: COUNTRY
      })
    ).toEqual([LINE_1, LINE_2, `${TOWN}, ${COUNTY}, ${POSTCODE}`])
  })

  it('Should give only the filled street line, then town or city and postcode on one line, with no blank line', () => {
    expect(
      pickerAddressLines({
        addressLine1: LINE_1,
        townOrCity: TOWN,
        postcode: POSTCODE
      })
    ).toEqual([LINE_1, `${TOWN}, ${POSTCODE}`])
  })
})

describe('#contactLines', () => {
  it('Should read out the telephone number then the email address, and nothing else', () => {
    expect(
      contactLines(
        addressRecord('tech-imports-ltd', 'Tech Imports Ltd').address
      )
    ).toEqual(['01632 960123', 'trade@example.com'])
  })
})

describe('#addressParts', () => {
  it('Should list each part the record holds, in reading order, leaving the country out', () => {
    expect(
      addressParts({
        addressLine1: LINE_1,
        addressLine2: LINE_2,
        townOrCity: TOWN,
        county: COUNTY,
        postcode: POSTCODE,
        country: COUNTRY
      })
    ).toEqual([LINE_1, LINE_2, TOWN, COUNTY, POSTCODE])
  })

  it('Should answer no parts for a record with no address at all', () => {
    expect(addressParts()).toEqual([])
  })
})
