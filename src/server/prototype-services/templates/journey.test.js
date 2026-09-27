import { beforeEach, describe, expect, it } from 'vitest'

import { store } from '../../app/engine/store.js'
import {
  configureRecords,
  records
} from '../../app/engine/persistence/records.js'
import {
  configureSession,
  knownJourneysCookie
} from '../../app/engine/persistence/session.js'
import {
  authenticatedCredentials,
  recordingH
} from '../../app/engine/test-support.js'
import { records as stubRecords } from '../../app/services/persistence/records/stub/index.js'
import { session as stubSession } from '../../app/services/persistence/session/stub.js'
import { obligationSet } from '../../app/model/obligations/manifest.js'
import { SET_ID, VALUE_ONE } from '../../../../test/fixtures/index.js'
import { designerRecords } from '../records/index.js'
import { saveJourneyAsTemplate, startFromTemplate } from './journey.js'

const requestKnowing = (journeyIds) => ({
  params: {},
  payload: {},
  query: {},
  headers: {},
  app: {},
  state: { [knownJourneysCookie()]: journeyIds },
  auth: { isAuthenticated: true, credentials: authenticatedCredentials }
})

describe('#saveJourneyAsTemplate and #startFromTemplate', () => {
  let sourceId

  beforeEach(async () => {
    configureRecords(
      SET_ID,
      designerRecords(SET_ID, stubRecords, { persist: false })
    )
    configureSession(SET_ID, stubSession)
    await store.clear()
    sourceId = (await store.create()).journeyId
    await store.seedAnswers(sourceId, { scalarField: VALUE_ONE })
  })

  it('Should start a new draft with the template’s answers, known to the browser', async () => {
    const { scalarField } = obligationSet()
    const saved = await saveJourneyAsTemplate(
      requestKnowing([sourceId]),
      sourceId,
      'My usual consignment'
    )
    const h = recordingH()

    const started = await startFromTemplate(
      requestKnowing([sourceId]),
      h,
      saved.id
    )

    expect(started.journeyId).not.toBe(sourceId)
    expect(
      (await records.load({ journeyId: started.journeyId })).fulfilment
    ).toEqual({ [scalarField.id]: VALUE_ONE })
    expect(h.cookies[knownJourneysCookie()]).toContain(started.journeyId)
  })

  it('Should refuse to save a notification this browser does not know', async () => {
    expect(
      await saveJourneyAsTemplate(requestKnowing([]), sourceId, 'Not mine')
    ).toBeUndefined()
  })

  it('Should start nothing from a template that does not exist', async () => {
    expect(
      await startFromTemplate(requestKnowing([]), recordingH(), 'no-such')
    ).toBeUndefined()
  })
})
