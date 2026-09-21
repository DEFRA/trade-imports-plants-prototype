import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { commodityTypes } from '../../../../../services/commodities/index.js'
import {
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  POTATO_DAYS_BEFORE_ARRIVAL
} from '../../timing-windows.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => {
      for (const { path, value } of leaves(bundle)) {
        expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
      }
    }
  )

  it('Should label every commodity type the service offers, and no other', () => {
    expect(Object.keys(copy.typeLabels)).toEqual([...commodityTypes()])
    expect(Object.keys(cy.typeLabels)).toEqual([...commodityTypes()])
  })

  it('Should hint every commodity type the service offers, and no other', () => {
    expect(Object.keys(copy.typeHints)).toEqual([...commodityTypes()])
    expect(Object.keys(cy.typeHints)).toEqual([...commodityTypes()])
  })

  it('Should name the potato window in the potato hint', () => {
    expect(copy.typeHints.potatoes(POTATO_DAYS_BEFORE_ARRIVAL)).toBe(
      'You must notify at least 2 days before the expected date of arrival.'
    )
  })

  it('Should name the plants and wood window in both of their hints', () => {
    const expected =
      'You must notify before arrival, or no later than 4 days after the date of arrival.'

    expect(
      copy.typeHints['plants-for-planting'](PLANTS_WOOD_DAYS_AFTER_ARRIVAL)
    ).toBe(expected)
    expect(
      copy.typeHints['wood-and-cut-trees'](PLANTS_WOOD_DAYS_AFTER_ARRIVAL)
    ).toBe(expected)
  })

  const SENTINEL_DAYS = 9

  it.each([
    ['en', copy, `${SENTINEL_DAYS} days`],
    ['cy', cy, `${SENTINEL_DAYS} diwrnod`]
  ])(
    'Should quote whatever day count each %s hint is handed rather than a literal',
    (locale, bundle, expected) => {
      for (const value of commodityTypes()) {
        expect(
          bundle.typeHints[value](SENTINEL_DAYS),
          `${locale}: ${value}`
        ).toContain(expected)
      }
    }
  )

  it('Should carry the spec labels and error sentence', () => {
    expect(Object.values(copy.typeLabels)).toEqual([
      'Potatoes (seed or ware)',
      'Plants for planting',
      'Wood and cut trees'
    ])
    expect(copy.errors.commodityType).toBe('Select what you are importing')
    expect(copy.hint).toBe(
      'Select the type of goods this notification is for. Notify potatoes, plants for planting and wood in separate notifications.'
    )
    expect(copy.linesWarning).toBe(
      'Changing your answer will remove the commodities you have already added.'
    )
    expect(copy.linesWarningIcon).toBe('Warning')
  })

  it('Should carry the machine-draft Welsh for every commodity type it offers', () => {
    expect(Object.values(cy.typeLabels)).toEqual([
      'Tatws (hadyd neu fwyd)',
      'Planhigion i’w plannu',
      'Pren a choed wedi’u torri'
    ])
    expect(cy.errors.commodityType).toBe(
      'Dewiswch beth rydych chi’n ei fewnforio'
    )
    expect(cy.linesWarning).toBe(
      'Bydd newid eich ateb yn dileu’r nwyddau rydych eisoes wedi’u hychwanegu.'
    )
    expect(cy.linesWarningIcon).toBe('Rhybudd')
  })
})
