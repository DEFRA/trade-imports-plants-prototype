import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { installHighRiskPlantsJourney } from '../../../test-support.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'

import * as checkAnswers from '../controller.js'
import { copy } from './copy.en.js'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'

describe('checkAnswers copy module', () => {
  it('Should interpolate the supplied day count into both timing rules', () => {
    expect(copy.late.potatoes(9)).toContain('9 days before')
    expect(copy.late.plantsAndWood(9)).toContain('9 days after')
  })

  it('Should have a non-empty string or function at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${path} must be copy`).toBe(true)
    }
  })
})

describe('GET checkAnswers — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = checkAnswers.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
