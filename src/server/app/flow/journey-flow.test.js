import { SET_ID } from '../sets/high-risk-plants/set.js'
import { describe, expect, it } from 'vitest'

import { flowOnlyKeys } from '../bridge/flow-only-keys.js'
import { withSetContext } from '../shared/set-context.js'
import {
  configureJourneyFlow,
  journeyNextRunTarget,
  journeySectionCaption
} from './journey-flow.js'

describe('#journeyNextRunTarget', () => {
  it('Should ask the configured journey where the run goes next', () => {
    const nextRunTarget = (stepId, scope, journeyId) =>
      `${stepId}|${scope}|${journeyId}`
    configureJourneyFlow(SET_ID, { sections: [], taskRows: [], nextRunTarget })

    // Read inside the set's own context, so this proves the value came back
    // through the per-set store rather than through the sole-set fallback.
    expect(
      withSetContext(SET_ID, () =>
        journeyNextRunTarget('origin', 'consignment', 'PHN-26-0001')
      )
    ).toBe('origin|consignment|PHN-26-0001')
  })
})

describe('#journeySectionCaption', () => {
  it('Should render no caption for a journey that configures none', () => {
    configureJourneyFlow(SET_ID, { sections: [], taskRows: [] })

    expect(journeySectionCaption('origin')).toBeUndefined()
  })
})

describe('#configureJourneyFlow', () => {
  it('Should forward the journey flow-only keys to the bridge seam', () => {
    configureJourneyFlow(SET_ID, {
      sections: [],
      taskRows: [],
      flowOnlyKeys: ['declaration']
    })

    expect(flowOnlyKeys()).toEqual(['declaration'])
  })

  it('Should leave the bridge seam empty for a journey that declares no flow-only key', () => {
    configureJourneyFlow(SET_ID, { sections: [], taskRows: [] })

    expect(flowOnlyKeys()).toEqual([])
  })
})
