import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { originConstraints } from '../../../../../services/commodities/index.js'
import { originLabel } from '../../../../../../../services/countries/index.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const WARE_POTATOES = 'ware-potatoes'

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

  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should carry a %s narrowing sentence for every origin constraint, and no other',
    (_locale, bundle) => {
      expect(Object.keys(bundle.errors.narrowing).toSorted()).toEqual(
        originConstraints()
          .map((constraint) => constraint.id)
          .toSorted()
      )
    }
  )

  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should key every %s guidance inset on a real constraint',
    (_locale, bundle) => {
      const ids = originConstraints().map((constraint) => constraint.id)
      expect(
        Object.keys(bundle.guidance).filter((id) => !ids.includes(id))
      ).toEqual([])
    }
  )

  it('Should name the subject of the error the consignment, not the animal', () => {
    expect(copy.errors.countryRequired).toBe(
      'Select the country where the consignment originates from'
    )
    expect(cy.errors.countryRequired).toBe(
      'Dewiswch y wlad y mae’r llwyth yn tarddu ohoni'
    )
    expect(cy.errors.countryRequired).not.toContain('anifail')
  })

  it('Should carry the spec label, hint and autocomplete strings', () => {
    expect(copy.title).toBe('Origin of the import')
    expect(copy.country).toEqual({
      label: 'Country of origin',
      hint: 'Start typing to search for a country.',
      placeholder: 'Select a country',
      noResults: 'No countries found'
    })
  })

  it('Should carry the ware-potato scope guidance, Balearic exclusion and all', () => {
    expect(copy.guidance[WARE_POTATOES]).toBe(
      'Notify ware potatoes grown, or suspected to have been grown, in Poland, Portugal, Romania or Spain. Spain does not include the Balearic Islands.'
    )
  })

  it('Should name the four ware-potato countries in their narrowing sentence', () => {
    expect(copy.errors.narrowing[WARE_POTATOES]).toBe(
      'Select Poland, Portugal, Romania or Spain – ware potatoes from other countries do not need to be notified'
    )
  })

  it('Should carry the machine-draft Welsh for the title and the country field', () => {
    expect(cy.title).toBe('Tarddiad y mewnforyn')
    expect(cy.country.label).toBe('Gwlad tarddiad')
    expect(cy.country.noResults).toBe('Dim gwledydd wedi’u darganfod')
  })

  // `eu-member-states` is exempt: its sentence names the bloc, not its 27
  // members.
  const ENUMERATED_CONSTRAINTS = ['ware-potatoes', 'conifer-wood-without-bark']

  it.each(ENUMERATED_CONSTRAINTS)(
    'Should name every country the %s constraint allows',
    async (constraintId) => {
      const constraint = originConstraints().find(
        ({ id }) => id === constraintId
      )

      for (const code of constraint.countries) {
        expect(
          copy.errors.narrowing[constraintId],
          `the ${constraintId} narrowing sentence does not name ${code}`
        ).toContain(await originLabel(code))
      }

      if (copy.guidance[constraintId]) {
        for (const code of constraint.countries) {
          expect(
            copy.guidance[constraintId],
            `the ${constraintId} guidance does not name ${code}`
          ).toContain(await originLabel(code))
        }
      }
    }
  )
})
