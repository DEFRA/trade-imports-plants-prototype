import { describe, expect, it } from 'vitest'

import { useStubbedHighRiskPlantsJourney } from '../../../test-support.js'
import {
  driveHandler,
  itHoldsCopyAtEveryLeaf
} from '../../../../../../../engine/test-support.js'
import * as contact from '../controller.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it('Should carry the contact question and the intro sentence in both languages', () => {
    expect(copy.title).toBe('Contact address for consignment')
    expect(cy.title).toBe('Cyfeiriad cyswllt ar gyfer y llwyth')
    expect(copy.description).toBe(
      'This is the contact address of the person responsible for the consignment from when it enters Great Britain until authorities complete their checks.'
    )
    expect(cy.description).toBe(
      'Dyma gyfeiriad cyswllt y person sy’n gyfrifol am y llwyth o’r adeg y mae’n cyrraedd Prydain Fawr hyd nes bod yr awdurdodau wedi cwblhau eu gwiriadau.'
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

  it('Should hold the two return-control words as the design source sets them, with a Welsh draft that differs', () => {
    expect(copy.saveActions.saveAndReturnToHub).toBe('Save and return to hub')
    expect(copy.saveActions.cancelAndReturnToHub).toBe(
      'Cancel and return to hub'
    )
    expect(cy.saveActions.saveAndReturnToHub).not.toBe(
      copy.saveActions.saveAndReturnToHub
    )
    expect(cy.saveActions.cancelAndReturnToHub).not.toBe(
      copy.saveActions.cancelAndReturnToHub
    )
  })
})

describe('GET contact — copy reaches the view', () => {
  useStubbedHighRiskPlantsJourney()

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
