import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { copy as pickerCopy } from './copy/copy.en.js'
import { pickerTableRows } from './table-rows.js'

const FIELD_NAME = 'consignor'
const NAME = 'Astra Rosales'
const STREET_LINE = 'Rua da Boavista 100'
const LOCALITY_LINE = 'Porto, 4050-113'

const fragmentOf = (html) => JSDOM.fragment(html)

const addressLinesOf = (html) => {
  const cell = fragmentOf(`<div>${html}</div>`).firstChild
  return [...cell.childNodes]
    .filter((node) => node.nodeName !== 'BR')
    .map((node) => node.textContent.trim())
}

const row = {
  id: 'astra-rosales',
  idPrefix: FIELD_NAME,
  name: NAME,
  addressLines: [STREET_LINE, LOCALITY_LINE],
  country: 'Portugal',
  contactLines: ['01632 960123', 'astra.rosales@example.com'],
  checked: true
}

describe('#pickerTableRows', () => {
  it('Should give each address a checked radio for the field, its plain facts, its address lines with a break between each, and a details cell listing its contact lines', () => {
    const [[selectCell, name, addressCell, country, detailsCell]] =
      pickerTableRows(FIELD_NAME, [row], pickerCopy)

    const select = fragmentOf(selectCell.html)
    const radio = select.querySelector('input')

    expect(radio.getAttribute('type')).toBe('radio')
    expect(radio.getAttribute('name')).toBe(FIELD_NAME)
    expect(radio.getAttribute('value')).toBe('astra-rosales')
    expect(radio.checked).toBe(true)
    expect(select.textContent.trim()).toBe(
      `${pickerCopy.selectRowPrefix} Astra Rosales`
    )
    expect(name).toEqual({ text: NAME })
    expect(addressLinesOf(addressCell.html)).toEqual([
      STREET_LINE,
      LOCALITY_LINE
    ])
    expect(fragmentOf(addressCell.html).querySelectorAll('br')).toHaveLength(1)
    expect(country).toEqual({ text: 'Portugal' })
    expect(
      [...fragmentOf(detailsCell.html).querySelectorAll('li')].map(
        (item) => item.textContent
      )
    ).toEqual(['01632 960123', 'astra.rosales@example.com'])
  })

  it('Should escape markup in a stored address line', () => {
    const [[, , addressCell]] = pickerTableRows(
      FIELD_NAME,
      [{ ...row, addressLines: ['<b>Unit 1</b>', LOCALITY_LINE] }],
      pickerCopy
    )

    expect(addressLinesOf(addressCell.html)).toEqual([
      '<b>Unit 1</b>',
      LOCALITY_LINE
    ])
    expect(fragmentOf(addressCell.html).querySelector('b')).toBeNull()
  })

  it('Should leave the radio unchecked for an address that is not the selected one', () => {
    const [[selectCell]] = pickerTableRows(
      FIELD_NAME,
      [{ ...row, checked: false }],
      pickerCopy
    )

    expect(fragmentOf(selectCell.html).querySelector('input').checked).toBe(
      false
    )
  })
})
