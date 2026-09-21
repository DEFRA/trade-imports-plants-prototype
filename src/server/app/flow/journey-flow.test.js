import { describe, expect, it } from 'vitest'

import { flowOnlyKeys } from '../bridge/flow-only-keys.js'
import { configureJourneyFlow, journeySectionCaption } from './journey-flow.js'

describe('#journeySectionCaption', () => {
  it('Should render no caption for a journey that configures none', () => {
    configureJourneyFlow({ sections: [], taskRows: [] })

    expect(journeySectionCaption('origin')).toBeUndefined()
  })
})

describe('#configureJourneyFlow', () => {
  it('Should forward the journey flow-only keys to the bridge seam', () => {
    configureJourneyFlow({
      sections: [],
      taskRows: [],
      flowOnlyKeys: ['declaration']
    })

    expect(flowOnlyKeys()).toEqual(['declaration'])
  })

  it('Should leave the bridge seam empty for a journey that declares no flow-only key', () => {
    configureJourneyFlow({ sections: [], taskRows: [] })

    expect(flowOnlyKeys()).toEqual([])
  })
})
