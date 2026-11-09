import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { copy as pickerCopy } from './copy/copy.en.js'
import { pickerTableRows } from './table-rows.js'

const FIELD_NAME = 'consignor'
const NAME = 'Astra Rosales'

const row = {
  id: 'astra-rosales',
  idPrefix: FIELD_NAME,
  name: NAME,
  addressText: 'Rua da Boavista 100, Porto, 4050-113',
  country: 'Portugal',
  detailLines: [NAME, 'Rua da Boavista 100'],
  checked: true
}

describe('#pickerTableRows', () => {
  it('Should give each address a checked radio for the field, its plain facts and a details cell listing its lines', () => {
    const [[selectCell, name, address, country, detailsCell]] = pickerTableRows(
      FIELD_NAME,
      [row],
      pickerCopy
    )

    const select = JSDOM.fragment(selectCell.html)
    const radio = select.querySelector('input')

    expect(radio.getAttribute('type')).toBe('radio')
    expect(radio.getAttribute('name')).toBe(FIELD_NAME)
    expect(radio.getAttribute('value')).toBe('astra-rosales')
    expect(radio.checked).toBe(true)
    expect(select.textContent.trim()).toBe(
      `${pickerCopy.selectRowPrefix} Astra Rosales`
    )
    expect([name, address, country]).toEqual([
      { text: NAME },
      { text: 'Rua da Boavista 100, Porto, 4050-113' },
      { text: 'Portugal' }
    ])
    expect(
      [...JSDOM.fragment(detailsCell.html).querySelectorAll('li')].map(
        (item) => item.textContent
      )
    ).toEqual([NAME, 'Rua da Boavista 100'])
  })

  it('Should leave the radio unchecked for an address that is not the selected one', () => {
    const [[selectCell]] = pickerTableRows(
      FIELD_NAME,
      [{ ...row, checked: false }],
      pickerCopy
    )

    expect(JSDOM.fragment(selectCell.html).querySelector('input').checked).toBe(
      false
    )
  })
})
