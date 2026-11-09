import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/test-support.js'
import { originConstraints } from '../../../../../services/commodities/index.js'
import { originLabel } from '../../../../../../../services/countries/index.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

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

  it.each(['country', 'errors', 'guidance'])(
    'Should hold the same %s keys in English and Welsh',
    (block) => {
      expect(Object.keys(cy[block]).toSorted()).toEqual(
        Object.keys(copy[block]).toSorted()
      )
    }
  )

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
