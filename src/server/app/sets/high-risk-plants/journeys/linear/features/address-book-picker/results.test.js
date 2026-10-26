import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { copy as pickerCopy } from './copy/copy.en.js'
import { pickerTableRows } from './table-rows.js'

const environment = nunjucksConfig.options.compileOptions.environment

const FIELD_NAME = 'placeOfDestination'
const ERROR = 'Select a place of destination from the list'

const row = {
  idPrefix: FIELD_NAME,
  id: 'astra-rosales',
  name: 'Astra Rosales',
  checked: false,
  addressText: 'Rua da Boavista 100, Porto, 4050-113',
  country: 'Portugal',
  detailLines: ['Astra Rosales', 'Rua da Boavista 100', 'Porto']
}

const render = (picker) =>
  new JSDOM(
    environment.renderString(
      `{% from "high-risk-plants/journeys/linear/features/address-book-picker/results.njk" import addressBookPickerResults %}
       {{ addressBookPickerResults(fieldName, picker, pickerCopy) }}`,
      { fieldName: FIELD_NAME, picker, pickerCopy }
    )
  ).window.document

const rowsWith = (rows, extra = {}) => ({
  rows,
  tableRows: pickerTableRows(FIELD_NAME, rows, pickerCopy),
  resultsCount: pickerCopy.resultsCount(rows.length, rows.length),
  ...extra
})

describe('addressBookPickerResults macro', () => {
  it('Should put the count in the paragraph straight after the results heading, outside the table', () => {
    const document = render(rowsWith([row]))

    const heading = document.querySelector('h2')
    const count = heading.nextElementSibling

    expect(heading.textContent).toBe('Select an address')
    expect(count.tagName).toBe('P')
    expect(count.textContent).toBe('Showing 1 out of 1 results')
    expect(count.closest('table')).toBeNull()
  })

  it('Should hold the table in one fieldset named by a visually hidden legend, after the count', () => {
    const document = render(rowsWith([row]))

    const fieldset = document.querySelector('h2 + p + div > fieldset')
    const legend = fieldset.querySelector('legend')

    expect(legend.textContent.trim()).toBe('Select an address')
    expect(legend.classList.contains('govuk-visually-hidden')).toBe(true)
    expect(fieldset.querySelector('table').firstElementChild.tagName).toBe(
      'THEAD'
    )
  })

  it('Should name the radios and the error after the field passed in', () => {
    const document = render(rowsWith([row], { error: ERROR }))

    const fieldset = document.querySelector('fieldset')
    const error = fieldset.querySelector(`#${FIELD_NAME}-error`)

    expect(fieldset.getAttribute('aria-describedby')).toBe(
      `${FIELD_NAME}-error`
    )
    expect(error.textContent.replace(/\s+/g, ' ').trim()).toBe(
      `Error: ${ERROR}`
    )
    expect(fieldset.querySelector('input[type="radio"]').name).toBe(FIELD_NAME)
  })

  it('Should wrap the fieldset in an error form group when there is an error', () => {
    const document = render(rowsWith([row], { error: ERROR }))

    const group = document.querySelector('.govuk-form-group--error')

    expect(group.querySelector('fieldset')).not.toBeNull()
  })

  it('Should wrap the fieldset in a plain form group when there is no error', () => {
    const document = render(rowsWith([row]))

    expect(document.querySelector('.govuk-form-group--error')).toBeNull()
    expect(
      document.querySelector('.govuk-form-group > fieldset')
    ).not.toBeNull()
  })

  it('Should leave the fieldset undescribed when there is no error', () => {
    const document = render(rowsWith([row]))

    expect(
      document.querySelector('fieldset').hasAttribute('aria-describedby')
    ).toBe(false)
  })

  it('Should escape an address name holding markup characters in the radio label', () => {
    const document = render(
      rowsWith([{ ...row, name: 'Fish & <b>Chips</b> Ltd' }])
    )

    const label = document.querySelector('.govuk-radios__label')

    expect(label.textContent.trim()).toBe('Select Fish & <b>Chips</b> Ltd')
    expect(label.querySelector('b')).toBeNull()
  })

  it('Should put the no-matches message where the count goes when nothing matched', () => {
    const document = render(rowsWith([]))

    const message = document.querySelector('h2').nextElementSibling

    expect(message.tagName).toBe('P')
    expect(message.textContent).toBe('No addresses match your search.')
    expect(document.querySelector('fieldset')).toBeNull()
    expect(document.querySelector('table')).toBeNull()
  })
})
