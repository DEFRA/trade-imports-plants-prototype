import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import {
  categories,
  commodityTypes,
  genera,
  lineFields
} from '../../../../../services/commodities/index.js'
import { copy as typeCopyCy } from '../../commodity-type/copy/copy.cy.js'
import { maxLengthOf } from '../line-form.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const LOCALES = [
  ['en', copy],
  ['cy', cy]
]

const SENTINEL_MAX = 7
const POTATOES_LABEL = 'Potatoes (seed or ware)'

describe('#copy', () => {
  it.each(LOCALES)(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => {
      for (const { path, value } of leaves(bundle)) {
        expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
      }
    }
  )

  it.each(LOCALES)(
    'Should label every %s category the service offers, and no other',
    (locale, bundle) => {
      expect(Object.keys(bundle.categoryLabels), locale).toEqual([
        ...categories()
      ])
    }
  )

  it.each(LOCALES)(
    'Should label every %s genus the service offers, and no other',
    (locale, bundle) => {
      expect(Object.keys(bundle.genusLabels), locale).toEqual([...genera()])
    }
  )

  it.each(LOCALES)(
    'Should name every %s commodity type the removal banner can report',
    (locale, bundle) => {
      expect(Object.keys(bundle.typeLabels), locale).toEqual([
        ...commodityTypes()
      ])
    }
  )

  it('Should say the same three words the commodity-type feature says', () => {
    expect(Object.values(copy.typeLabels)).toEqual([
      POTATOES_LABEL,
      'Plants for planting',
      'Wood and cut trees'
    ])
    expect(cy.typeLabels).toEqual(typeCopyCy.typeLabels)
  })

  it.each(LOCALES)(
    'Should give every %s per-line field a label, a hint and an error',
    (locale, bundle) => {
      const asked = lineFields()
      expect(Object.keys(bundle.details.fields), locale).toEqual(asked)
      for (const field of asked) {
        const where = `${locale}: ${field}`
        expect(bundle.details.fields[field].label, where).toBeTruthy()
        expect(bundle.details.fields[field].hint, where).toBeTruthy()
        expect(bundle.details.errors[field], where).toBeTruthy()
      }
    }
  )

  it('Should hint only the two categories the spec singles out', () => {
    expect(Object.keys(copy.details.categoryHints)).toEqual([
      'plants-for-planting',
      'trees-for-planting'
    ])
  })

  it('Should carry the wood exclusion as a hint on the wood category question', () => {
    expect(Object.keys(copy.details.categoryHintByCommodityType)).toEqual([
      'wood-and-cut-trees'
    ])
    expect(
      copy.details.categoryHintByCommodityType['wood-and-cut-trees']
    ).toContain('Preservative-treated wood')
  })

  it.each(LOCALES)(
    'Should quote whatever cap each %s length error is handed rather than a literal',
    (locale, bundle) => {
      for (const [field, error] of Object.entries(bundle.details.errors)) {
        if (typeof error?.maxLength === 'function') {
          expect(
            error.maxLength(SENTINEL_MAX),
            `${locale}: ${field}`
          ).toContain(String(SENTINEL_MAX))
        }
      }
    }
  )

  it('Should name the real cap when the controller passes it', () => {
    expect(copy.details.errors.species.maxLength(maxLengthOf('species'))).toBe(
      'Species must be 58 characters or less'
    )
    expect(
      copy.details.errors.phytosanitaryTreatments.maxLength(
        maxLengthOf('phytosanitaryTreatments')
      )
    ).toBe('Phytosanitary treatments must be 400 characters or less')
  })

  it('Should carry the spec sentences the list page renders', () => {
    expect(copy.list.title).toBe('Commodities in the consignment')
    expect(copy.list.addAnother).toBe('Add another commodity')
    expect(copy.list.errors.commodityLines).toBe('Add at least one commodity')
  })

  it('Should say how many lines a change of commodity type removed', () => {
    expect(copy.list.removed.body(2, POTATOES_LABEL)).toBe(
      `We removed 2 commodities that are not ${POTATOES_LABEL}`
    )
    expect(copy.list.removed.body(1, POTATOES_LABEL)).toBe(
      `We removed 1 commodity that is not ${POTATOES_LABEL}`
    )
  })

  it('Should carry the spec title and legend the entry page renders', () => {
    expect(copy.details.title).toBe('Commodity details')
    expect(cy.details.title).toBe('Manylion y nwyddau')
    expect(copy.details.categoryLegend).toBe('What category of goods is this?')
    expect(copy.details.errors.category).toBe('Select the category of goods')
  })
})
