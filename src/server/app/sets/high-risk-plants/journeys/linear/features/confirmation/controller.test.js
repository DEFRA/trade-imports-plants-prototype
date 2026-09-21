import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as state from '../../../../../../engine/index.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import {
  COMPLETE_NOTIFICATION,
  installHighRiskPlantsJourney
} from '../../test-support.js'
import { sections } from '../../flow/flow.js'
import {
  POTATO_DAYS_BEFORE_ARRIVAL,
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL
} from '../timing-windows.js'
import { copy } from './copy/copy.en.js'
import { routes, meta } from './controller.js'

const get = routes[0].handler

describe('confirmation', () => {
  beforeAll(() => {
    installHighRiskPlantsJourney()
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => store.clear())

  it('Should be a GET-only receipt after declaration without collecting answers', () => {
    expect(meta.collects).toEqual([])
    expect(routes.map(({ method }) => method)).toEqual(['GET'])
    expect(
      sections.find(({ id }) => id === 'review').pages.map(({ id }) => id)
    ).toEqual(['notification-view', 'declaration', 'confirmation'])
  })

  it('Should show the submitted reference and exit links without changing saved state on reload', async () => {
    const { journeyId } = await store.create()
    await store.seedAnswers(journeyId, COMPLETE_NOTIFICATION)
    await store.submit(journeyId)
    const before = await store.get(journeyId)
    const request = journeyRequest(journeyId)
    const h = stubH()
    for (let visit = 0; visit < 2; visit++) {
      await get(request, h)
      expect(h.captured.view.context).toMatchObject({
        pageTitle: copy.title,
        copy,
        reference: journeyId,
        notificationHref: `/notifications/${journeyId}/notification-view`,
        dashboardHref: '/',
        journeyStrip: { reference: journeyId }
      })
      expect(h.captured.view.context.backLink).toBeUndefined()
      expect(h.captured.view.context.caption).toBeUndefined()
    }
    expect(await store.get(journeyId)).toEqual(before)
  })

  it.each([
    { indicator: 'on-time', late: false },
    { indicator: 'late', late: true }
  ])(
    'Should date the receipt and read the $indicator banner from the stored indicator',
    async ({ indicator, late }) => {
      const { journeyId } = await store.create()
      await store.seedAnswers(journeyId, {
        ...COMPLETE_NOTIFICATION,
        lateNotificationIndicator: indicator
      })
      await store.submit(journeyId)
      const { submittedAt } = await store.get(journeyId)
      const h = stubH()
      await get(journeyRequest(journeyId), h)
      expect(h.captured.view.context).toMatchObject({
        notificationDate: new Date(submittedAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/London'
        }),
        late,
        lateRule: copy.late.potatoes(POTATO_DAYS_BEFORE_ARRIVAL)
      })
    }
  )

  it('Should quote the plants and wood window for a plants consignment', async () => {
    const { journeyId } = await store.create()
    await store.seedAnswers(journeyId, {
      ...COMPLETE_NOTIFICATION,
      commodityType: 'plants-for-planting',
      lateNotificationIndicator: 'late'
    })
    await store.submit(journeyId)
    const h = stubH()
    await get(journeyRequest(journeyId), h)
    expect(h.captured.view.context.lateRule).toBe(
      copy.late.plantsAndWood(PLANTS_WOOD_DAYS_AFTER_ARRIVAL)
    )
  })

  it.each([state.DRAFT, state.AMEND])(
    'Should return %s to check answers without claiming submission',
    async (status) => {
      const { journeyId } = await store.create()
      await store.seedAnswers(journeyId, COMPLETE_NOTIFICATION)
      if (status === state.AMEND) {
        await store.submit(journeyId)
        await recordsStub.amend(journeyId)
      }
      const h = stubH()
      expect(await get(journeyRequest(journeyId), h)).toEqual({
        redirect: `/notifications/${journeyId}/notification-view`
      })
      expect((await store.get(journeyId)).status).toBe(status)
    }
  )
})
