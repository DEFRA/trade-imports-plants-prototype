import { describe, expect, it } from 'vitest'

import { advisoryLinesFor, advisoryLinesForCopy } from './gds-wording.js'

const ADD_TITLE_KEY = 'add.title'
const ERRORS_NAME_KEY = 'errors.name'

describe('advisoryLinesFor', () => {
  it('Should say nothing for plain GDS-style words', () => {
    expect(advisoryLinesFor(ADD_TITLE_KEY, 'Add a transporter')).toEqual([])
    expect(
      advisoryLinesFor(ERRORS_NAME_KEY, 'Enter the transporter’s name')
    ).toEqual([])
  })

  it('Should flag "please"', () => {
    expect(advisoryLinesFor('add.hint', 'Please enter a name')).toEqual([
      'add.hint: "Please" is not needed on GOV.UK: an instruction reads as one without it.'
    ])
  })

  it('Should flag "click"', () => {
    expect(advisoryLinesFor('add.save', 'Click here to save')[0]).toMatch(
      /assumes a mouse/
    )
  })

  it('Should flag an exclamation mark, never a mid-sentence bang inside a longer word boundary check', () => {
    expect(advisoryLinesFor('list.done', 'Saved!')[0]).toMatch(/shouting/)
    expect(advisoryLinesFor('list.done', 'Saved.')).toEqual([])
  })

  it('Should flag an ampersand joining a sentence, not a label', () => {
    expect(advisoryLinesFor('table.col', 'Name & address')[0]).toMatch(/"&"/)
    expect(advisoryLinesFor('table.col', 'Name and address')).toEqual([])
  })

  it('Should flag "valid"/"invalid"', () => {
    expect(
      advisoryLinesFor('errors.postcode', 'Enter a valid postcode')[0]
    ).toMatch(/system.s judgement/)
  })

  it('Should flag a passive error message', () => {
    expect(advisoryLinesFor(ERRORS_NAME_KEY, 'Name is required')[0]).toMatch(
      /reads as an instruction/
    )
  })

  it('Should flag a Title Case heading but not a sentence-case one', () => {
    expect(advisoryLinesFor(ADD_TITLE_KEY, 'Add A Transporter')[0]).toMatch(
      /Title Case/
    )
    expect(advisoryLinesFor(ADD_TITLE_KEY, 'Add a transporter')).toEqual([])
  })

  it('Should not flag a non-heading key for Title Case', () => {
    expect(advisoryLinesFor('table.name', 'Full Name Given')).toEqual([])
  })

  it('Should read a parameterised leaf’s function source, not skip it', () => {
    const fn = (name) => `Please delete ${name}`
    expect(advisoryLinesFor('remove.title', fn)[0]).toMatch(/Please/)
  })
})

describe('advisoryLinesForCopy', () => {
  it('Should run every leaf, in order, with no line for clean copy', () => {
    const leaves = [
      { path: 'list.title', value: 'Saved transporters' },
      { path: 'add.save', value: 'Click to save' },
      { path: ERRORS_NAME_KEY, value: 'Enter the transporter’s name' }
    ]

    expect(advisoryLinesForCopy(leaves)).toEqual([
      'add.save: "Click" assumes a mouse. Say "select" so it reads right on every device.'
    ])
  })

  it('Should answer no lines for a fully clean copy file', () => {
    expect(
      advisoryLinesForCopy([
        { path: 'list.title', value: 'Saved transporters' }
      ])
    ).toEqual([])
  })
})
