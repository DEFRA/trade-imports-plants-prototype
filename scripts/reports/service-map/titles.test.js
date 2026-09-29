import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../../designer/lib/repo.js'
import {
  fieldLabelFor,
  humanise,
  labelsFor,
  readFeatureIndex,
  titleOfRoute
} from './titles.js'

const JOURNEY = path.join(
  REPO_ROOT,
  'src/server/app/sets/high-risk-plants/journeys/linear'
)

describe('titles from copy', () => {
  it('Should title each page from the copy of the controller that serves it, sub-folder first', async () => {
    const index = await readFeatureIndex(JOURNEY)
    expect(titleOfRoute(index, '/notifications/{journeyId}/commodities')).toBe(
      'Commodities in the consignment'
    )
    expect(
      titleOfRoute(index, '/notifications/{journeyId}/commodities/details')
    ).toBe('Commodity details')
    expect(titleOfRoute(index, '/notifications/{journeyId}')).toBe('Overview')
    expect(titleOfRoute(index, '/no/such/page')).toBeNull()
  })

  it('Should pick the labels object that names the most of the values', () => {
    const copy = {
      errors: { potatoes: 'Select one' },
      typeLabels: { potatoes: 'Potatoes', wood: 'Wood', plants: 'Plants' },
      hints: { potatoes: () => 'a function, not a label' }
    }
    expect(labelsFor(copy, ['wood', 'potatoes'])).toBe(copy.typeLabels)
    expect(labelsFor(copy, ['nothing'])).toBeNull()
  })

  it('Should read a field’s label from its copy, else make one from its name', () => {
    const copy = { details: { fields: { genus: { label: 'Genus' } } } }
    expect(fieldLabelFor(copy, 'genus')).toBe('Genus')
    expect(fieldLabelFor(copy, 'sizeOfTree')).toBe('Size of tree')
    expect(humanise('arrival-status')).toBe('Arrival status')
  })
})
