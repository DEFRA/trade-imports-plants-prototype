import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  BASE,
  createPath,
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../shared/paths.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import {
  configureSession,
  SESSION_COOKIES
} from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import { journeyRequest, stubH } from '../../../../../engine/test-support.js'
import { RUN_ACTIVE, RUN_COMPLETE } from '../../../../../flow/run-state.js'
import { installHighRiskPlantsJourney } from '../test-support.js'
import { SESSION_COOKIE_NAMES } from '../config.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  entryGuardTarget,
  guardedJourneyPath,
  hasCommittedNotificationAnswers
} from './entry-guard.js'

const ENTRY_SLUG = commodityTypePage.slug
const OTHER_JOURNEY_ID = 'HRP-9999'

const openingRunState = (record) => ({
  [SESSION_COOKIES.openingRun]: record
})

const guardOn = (journeyId, { path, record } = {}) =>
  entryGuardTarget(
    journeyRequest(journeyId, {
      path: path ?? hubPath(journeyId),
      ...(record ? { state: openingRunState(record) } : {})
    }),
    stubH()
  )

const freshJourney = async (seed = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  return journey.journeyId
}

describe('#guardedJourneyPath', () => {
  it('Should exempt anything outside a journey', () => {
    expect(guardedJourneyPath(BASE)).toBe(false)
    expect(guardedJourneyPath(dashboardPath())).toBe(false)
    expect(guardedJourneyPath(createPath())).toBe(false)
    expect(guardedJourneyPath('/some-other-service/commodity-type')).toBe(false)
  })

  it('Should exempt the entry page and its sub-paths, so there is no redirect loop', () => {
    expect(guardedJourneyPath(pagePath('j-1', ENTRY_SLUG))).toBe(false)
    expect(guardedJourneyPath(pagePath('j-1', `${ENTRY_SLUG}/anything`))).toBe(
      false
    )
  })

  it('Should exempt each notification action slug', () => {
    for (const slug of ['amend', 'cancel-amend', 'copy', 'delete']) {
      expect(guardedJourneyPath(pagePath('j-1', slug))).toBe(false)
    }
  })

  it('Should guard the overview and every journey page beyond the entry page', () => {
    expect(guardedJourneyPath(hubPath('j-1'))).toBe(true)
    expect(guardedJourneyPath(pagePath('j-1', 'notification-view'))).toBe(true)
  })
})

describe('#hasCommittedNotificationAnswers', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should read an empty or absent set of answers as fresh', () => {
    expect(hasCommittedNotificationAnswers(undefined)).toBe(false)
    expect(hasCommittedNotificationAnswers({})).toBe(false)
  })

  it('Should count a committed manifest obligation', () => {
    expect(hasCommittedNotificationAnswers({ commodityType: 'potatoes' })).toBe(
      true
    )
  })

  it('Should ignore an empty value for a manifest obligation', () => {
    expect(hasCommittedNotificationAnswers({ commodityType: '' })).toBe(false)
  })

  it('Should ignore a flow-only key, which resolves to no obligation', () => {
    expect(hasCommittedNotificationAnswers({ declaration: 'confirmed' })).toBe(
      false
    )
  })
})

describe('#entryGuardTarget', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub, SESSION_COOKIE_NAMES)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should never consult the journey for an exempt path', async () => {
    await expect(
      entryGuardTarget(
        journeyRequest(undefined, { path: createPath() }),
        stubH()
      )
    ).resolves.toBeNull()
  })

  it('Should redirect a journey with neither a run record nor answers to the entry page', async () => {
    const journeyId = await freshJourney()

    expect(await guardOn(journeyId)).toBe(pagePath(journeyId, ENTRY_SLUG))
  })

  it('Should redirect a deep link to a page beyond the entry page', async () => {
    const journeyId = await freshJourney()

    expect(
      await guardOn(journeyId, {
        path: pagePath(journeyId, 'notification-view')
      })
    ).toBe(pagePath(journeyId, ENTRY_SLUG))
  })

  it('Should admit a journey whose opening run has begun — active or complete', async () => {
    const journeyId = await freshJourney()

    for (const phase of [RUN_ACTIVE, RUN_COMPLETE]) {
      expect(
        await guardOn(journeyId, { record: { [journeyId]: phase } })
      ).toBeNull()
    }
  })

  it('Should admit a journey holding a committed user answer', async () => {
    const journeyId = await freshJourney({ commodityType: 'potatoes' })

    expect(await guardOn(journeyId)).toBeNull()
  })

  it('Should treat a journey whose only answer is a flow-only key as fresh', async () => {
    const journeyId = await freshJourney({ declaration: 'confirmed' })

    expect(await guardOn(journeyId)).toBe(pagePath(journeyId, ENTRY_SLUG))
  })

  it("Should not let another journey's run record vouch for a fresh journey", async () => {
    const journeyId = await freshJourney()

    expect(
      await guardOn(journeyId, {
        record: { [OTHER_JOURNEY_ID]: RUN_ACTIVE }
      })
    ).toBe(pagePath(journeyId, ENTRY_SLUG))
  })
})
