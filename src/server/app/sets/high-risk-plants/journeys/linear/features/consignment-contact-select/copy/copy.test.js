import { SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { installHighRiskPlantsJourney } from '../../../test-support.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  itHoldsCopyAtEveryLeaf
} from '../../../../../../../engine/test-support.js'
import * as contact from '../controller.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it('Should carry the contact question and the copying sentence in both languages', () => {
    expect(copy.title).toBe('Contact address for consignment')
    expect(cy.title).toBe('Cyfeiriad cyswllt ar gyfer y llwyth')
    expect(copy.description).toBe(
      'Selecting a contact copies their name and address into this notification.'
    )
    expect(cy.description).toBe(
      "Mae dewis cyswllt yn copïo eu henw a'u cyfeiriad i'r hysbysiad hwn."
    )
  })

  it('Should carry the error sentence for an address the book does not hold', () => {
    expect(copy.errors.contactAddress).toBe(
      'Select a contact address from the list'
    )
    expect(cy.errors.contactAddress).toBe(
      'Dewiswch gyfeiriad cyswllt o’r rhestr'
    )
  })
})

describe('GET contact — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = contact.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.heading).toBe(copy.title)
    expect(result.view.context.description).toBe(copy.description)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
