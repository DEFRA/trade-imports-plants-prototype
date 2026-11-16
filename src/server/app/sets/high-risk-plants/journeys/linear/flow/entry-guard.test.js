import { SET_ID } from '../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  createPath,
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../shared/paths.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import { journeyRequest, stubH } from '../../../../../engine/test-support.js'
import { installHighRiskPlantsJourney } from '../test-support.js'
import { SESSION_COOKIE_NAMES } from '../config.js'
import { useInsFrontendBaseUrl } from '../../../../../../common/test-helpers/use-ins-frontend-base-url.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  insTypeQuestionUrl,
  leaveJourneyLink,
  entryGuardTarget,
  guardedJourneyPath,
  hasCommittedNotificationAnswers
} from './entry-guard.js'

const ENTRY_SLUG = commodityTypePage.slug
const NOTIFICATION_VIEW_SLUG = 'notification-view'

const guardOn = (journeyId, { path } = {}) =>
  entryGuardTarget(
    journeyRequest(journeyId, { path: path ?? hubPath(journeyId) }),
    stubH()
  )

const freshJourney = async (seed = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  return journey.journeyId
}

describe('#guardedJourneyPath', () => {
  it('Should exempt anything outside a journey', () => {
    expect(guardedJourneyPath('/')).toBe(false)
    expect(guardedJourneyPath(dashboardPath())).toBe(false)
    expect(guardedJourneyPath(createPath())).toBe(false)
    expect(guardedJourneyPath('/some-other-service/commodity-type')).toBe(false)
    expect(guardedJourneyPath('/another-set/notifications/j-1')).toBe(false)
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
    expect(guardedJourneyPath(pagePath('j-1', NOTIFICATION_VIEW_SLUG))).toBe(
      true
    )
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
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub, SESSION_COOKIE_NAMES)
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

  it('Should redirect a journey with no answers to the entry page', async () => {
    const journeyId = await freshJourney()

    expect(await guardOn(journeyId)).toBe(pagePath(journeyId, ENTRY_SLUG))
  })

  it('Should redirect a deep link to a page beyond the entry page', async () => {
    const journeyId = await freshJourney()

    expect(
      await guardOn(journeyId, {
        path: pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
      })
    ).toBe(pagePath(journeyId, ENTRY_SLUG))
  })

  it.each([
    ['Overview', (journeyId) => hubPath(journeyId)],
    [
      'the review page',
      (journeyId) => pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
    ],
    ['the declaration', (journeyId) => pagePath(journeyId, 'declaration')],
    [
      'the confirmation page',
      (journeyId) => pagePath(journeyId, 'confirmation')
    ]
  ])(
    'Should send %s of a notification with no entered answer to the entry page',
    async (_name, pathFor) => {
      const journeyId = await freshJourney()

      expect(await guardOn(journeyId, { path: pathFor(journeyId) })).toBe(
        pagePath(journeyId, ENTRY_SLUG)
      )
    }
  )

  it.each(['amend', 'cancel-amend', 'copy', 'delete'])(
    'Should let the %s action of a notification with no entered answer through',
    async (action) => {
      const journeyId = await freshJourney()

      expect(
        await guardOn(journeyId, { path: pagePath(journeyId, action) })
      ).toBeNull()
    }
  )

  it('Should log the redirect once with the journey and the requested path', async () => {
    const journeyId = await freshJourney()
    const request = journeyRequest(journeyId, { path: hubPath(journeyId) })

    await entryGuardTarget(request, stubH(request))

    expect(request.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId, path: hubPath(journeyId) },
        message: 'No answer entered, sent to the first page'
      }
    ])
  })

  it('Should admit a journey holding a committed user answer', async () => {
    const journeyId = await freshJourney({ commodityType: 'potatoes' })

    expect(await guardOn(journeyId)).toBeNull()
  })

  it('Should treat a journey whose only answer is a flow-only key as fresh', async () => {
    const journeyId = await freshJourney({ declaration: 'confirmed' })

    expect(await guardOn(journeyId)).toBe(pagePath(journeyId, ENTRY_SLUG))
  })
})

describe('#leaveJourneyLink', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should send Back to the overview once a notification answer is committed', () => {
    expect(
      leaveJourneyLink({ journeyId: 'j-1' }, { commodityType: 'potatoes' })
    ).toBe(hubPath('j-1'))
  })

  it('Should send Back to the dashboard while nothing is committed', () => {
    expect(leaveJourneyLink({ journeyId: 'j-1' }, {})).toBe(dashboardPath())
  })
})

describe('#insTypeQuestionUrl', () => {
  const setInsFrontendBaseUrl = useInsFrontendBaseUrl()

  it('Should be the same Import Notification Service What are you importing? question URL for every journey', () => {
    setInsFrontendBaseUrl('http://ins.example/')

    expect(insTypeQuestionUrl()).toBe('http://ins.example/notification-type')
  })
})
