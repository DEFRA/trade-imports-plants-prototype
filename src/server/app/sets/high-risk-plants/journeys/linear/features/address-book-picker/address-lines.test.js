import { describe, expect, it } from 'vitest'

import { addressText, detailLines } from './address-lines.js'
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

describe('#detailLines', () => {
  it('Should read out the name, the whole address and the contact details', () => {
    expect(
      detailLines(addressRecord('tech-imports-ltd', 'Tech Imports Ltd'))
    ).toEqual([
      'Tech Imports Ltd',
      LINE_1,
      LINE_2,
      TOWN,
      COUNTY,
      POSTCODE,
      COUNTRY,
      '01632 960123',
      'trade@example.com'
    ])
  })
})
