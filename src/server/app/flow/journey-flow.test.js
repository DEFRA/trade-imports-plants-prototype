import { SET_ID } from '../sets/high-risk-plants/set.js'
import { describe, expect, it } from 'vitest'

import { flowOnlyKeys } from '../bridge/flow-only-keys.js'
import { withSetContext } from '../shared/set-context.js'
import {
  configureJourneyFlow,
  journeyNextRunTarget,
  journeyPreviousRunTarget,
  journeySectionCaption
} from './journey-flow.js'

describe('#journeyPreviousRunTarget', () => {
  const previousRunTargetInSet = (setId) =>
    withSetContext(setId, () =>
      journeyPreviousRunTarget('arrival-status', new Set(), 'PHN-26-0001')
    )

  it("Should answer the configured journey's previous run target for the current set", () => {
    configureJourneyFlow(SET_ID, {
      sections: [],
      taskRows: [],
      previousRunTarget: () => '/PHN-26-0001/origin'
    })

    expect(previousRunTargetInSet(SET_ID)).toBe('/PHN-26-0001/origin')
  })

  it('Should report an unconfigured set as not configured', () => {
    expect(() => previousRunTargetInSet('unconfigured-set')).toThrow(
      'journey flow not configured'
    )
  })
})

describe('#journeyNextRunTarget', () => {
  it('Should ask the configured journey where the run goes next', () => {
    const nextRunTarget = (stepId, scope, journeyId) =>
      `${stepId}|${scope}|${journeyId}`
    configureJourneyFlow(SET_ID, { sections: [], taskRows: [], nextRunTarget })

    expect(journeyNextRunTarget('origin', 'consignment', 'PHN-26-0001')).toBe(
      'origin|consignment|PHN-26-0001'
    )
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
