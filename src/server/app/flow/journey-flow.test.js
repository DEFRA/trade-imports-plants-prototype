import { SET_ID } from '../sets/high-risk-plants/set.js'
import { describe, expect, it } from 'vitest'

import { flowOnlyKeys } from '../bridge/flow-only-keys.js'
import { withSetContext } from '../shared/set-context.js'
import {
  configureJourneyFlow,
  journeyInsTypeQuestionUrl,
  journeySectionCaption
} from './journey-flow.js'

describe('#journeyInsTypeQuestionUrl', () => {
  const insTypeQuestionUrlInSet = (setId) =>
    withSetContext(setId, () => journeyInsTypeQuestionUrl('PHN-26-0001'))

  it("Should answer the configured journey's Import Notification Service question for the current set", () => {
    configureJourneyFlow(SET_ID, {
      sections: [],
      taskRows: [],
      insTypeQuestionUrl: (journeyId) => `/ins/${journeyId}`
    })

    expect(insTypeQuestionUrlInSet(SET_ID)).toBe('/ins/PHN-26-0001')
  })

  it('Should report an unconfigured set as not configured', () => {
    expect(() => insTypeQuestionUrlInSet('unconfigured-set')).toThrow(
      'journey flow not configured'
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
