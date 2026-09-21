import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { configureRecords } from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  SESSION_COOKIES
} from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { store } from '../../../../../../engine/store.js'
import { journeyRequest } from '../../../../../../engine/test-support.js'
import { hubRoutePath } from '../../../../../../shared/paths.js'
import { SURFACES } from '../../../../../../shared/kit.js'
import { RUN_ACTIVE, RUN_COMPLETE } from '../../../../../../flow/run-state.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  installHighRiskPlantsJourney
} from '../../test-support.js'

import { ALREADY_ARRIVED } from '../arrival-status/statuses.js'
import { GROUPS, routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const REVIEW_GROUP_ID = 'check-and-submit'
const PARTIES_GROUP_ID = 'consignment-parties'

const hubGet = routes.find((route) => route.method === 'GET').handler

const CONSIGNMENT_GROUP_ID = 'about-the-consignment'
const ARRIVAL_GROUP_ID = 'arrival-and-destination'
const RENDERED_GROUP_IDS = [
  CONSIGNMENT_GROUP_ID,
  ARRIVAL_GROUP_ID,
  PARTIES_GROUP_ID,
  REVIEW_GROUP_ID
]
const NOT_STARTED_TAG_CLASS = 'govuk-tag--blue'
const COMPLETED_TAG_CLASS = 'govuk-tag--green'
const CANNOT_START_STATUS = {
  text: copy.statuses.cannotStartYet,
  classes: 'govuk-task-list__status--cannot-start-yet'
}
const POTATOES = 'potatoes'
const PLANTS_FOR_PLANTING = 'plants-for-planting'
const FRANCE = 'FR'

const buildH = () => {
  const captured = { cookies: {} }
  return {
    view: (template, context) => {
      captured.view = { template, context }
      return captured.view
    },
    redirect: (to) => {
      captured.redirect = to
      return { redirect: to }
    },
    state: (name, value) => {
      captured.cookies[name] = value
    },
    unstate: (name) => {
      delete captured.cookies[name]
    },
    captured
  }
}

const renderHub = async ({ openingRun, seed = {} } = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  const h = buildH()
  const state = openingRun
    ? { [SESSION_COOKIES.openingRun]: { [journey.journeyId]: openingRun } }
    : {}
  await hubGet(journeyRequest(journey.journeyId, { state }), h)
  return { journeyId: journey.journeyId, h }
}

describe('#hubGet', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should register one GET-only route at the hub path', () => {
    expect(routes).toEqual([
      expect.objectContaining({ method: 'GET', path: hubRoutePath() })
    ])
  })

  it('Should title the hub Overview and render it on the form surface', async () => {
    const { h } = await renderHub()

    expect(h.captured.view.template).toBe(
      'high-risk-plants/journeys/linear/features/hub/template'
    )
    expect(h.captured.view.context).toMatchObject({
      heading: 'Overview',
      pageTitle: 'Overview',
      copy,
      contentColumnClass: SURFACES.form
    })
  })

  it('Should point the back link and the Return to dashboard button at the dashboard', async () => {
    const { h } = await renderHub()

    expect(h.captured.view.context.backLink).toBe('/')
    expect(h.captured.view.context.dashboardHref).toBe('/')
  })

  it('Should render no breadcrumbs, no progress line and no section caption', async () => {
    const { h } = await renderHub()

    expect(h.captured.view.context.breadcrumbs).toBeUndefined()
    expect(h.captured.view.context.progressLine).toBeUndefined()
    expect(h.captured.view.context.caption).toBeUndefined()
  })

  it('Should carry the shared chrome copy and the journey reference strip', async () => {
    const { journeyId, h } = await renderHub()

    expect(h.captured.view.context.sharedCopy.layout.serviceName).toBe(
      'Import notification service'
    )
    expect(h.captured.view.context.journeyStrip).toEqual({
      reference: journeyId,
      status: { text: 'Draft', classes: 'govuk-tag--blue' }
    })
  })

  it('Should render the about-the-consignment group and its two rows', async () => {
    const { journeyId, h } = await renderHub()

    expect(h.captured.view.context.groups).toEqual([
      {
        id: CONSIGNMENT_GROUP_ID,
        caption: copy.groups[CONSIGNMENT_GROUP_ID],
        items: [
          expect.objectContaining({
            title: { text: copy.rows.commodities.title },
            href: `/notifications/${journeyId}/commodity-type`,
            status: {
              tag: {
                text: copy.statuses.notYetStarted,
                classes: NOT_STARTED_TAG_CLASS
              }
            }
          }),
          expect.objectContaining({
            title: { text: copy.rows.origin.title },
            status: CANNOT_START_STATUS
          })
        ]
      },
      {
        id: ARRIVAL_GROUP_ID,
        caption: copy.groups[ARRIVAL_GROUP_ID],
        items: [
          expect.objectContaining({
            title: { text: copy.rows.arrival.title },
            status: CANNOT_START_STATUS
          }),
          expect.objectContaining({
            title: { text: copy.rows.destination.title },
            status: CANNOT_START_STATUS
          })
        ]
      },
      {
        id: PARTIES_GROUP_ID,
        caption: copy.groups[PARTIES_GROUP_ID],
        items: [
          {
            title: { text: copy.rows.identificationNumbers.title },
            status: CANNOT_START_STATUS
          },
          {
            title: { text: copy.rows.contact.title },
            status: CANNOT_START_STATUS
          }
        ]
      },
      {
        id: REVIEW_GROUP_ID,
        caption: copy.groups[REVIEW_GROUP_ID],
        items: [
          {
            title: { text: copy.rows.review.title },
            status: CANNOT_START_STATUS
          }
        ]
      }
    ])
  })

  it('Should offer no link to origin until the entry question is answered', async () => {
    const { h } = await renderHub()

    const [, originRow] = h.captured.view.context.groups[0].items
    expect(originRow).not.toHaveProperty('href')
  })

  it('Should open the origin row once the commodity type is answered', async () => {
    const { journeyId, h } = await renderHub({
      seed: { commodityType: POTATOES }
    })

    const [, originRow] = h.captured.view.context.groups[0].items
    expect(originRow.href).toBe(`/notifications/${journeyId}/origin`)
    expect(originRow.status).toEqual({
      tag: {
        text: copy.statuses.notYetStarted,
        classes: NOT_STARTED_TAG_CLASS
      }
    })
  })

  it('Should complete the origin row once a country is named', async () => {
    const { h } = await renderHub({
      seed: { commodityType: POTATOES, countryOfOrigin: FRANCE }
    })

    const [, originRow] = h.captured.view.context.groups[0].items
    expect(originRow.status).toEqual({
      tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
    })
  })

  it('Should give the commodities row no hint — no source writes one', async () => {
    const { h } = await renderHub()

    const [row] = h.captured.view.context.groups[0].items
    expect(row).not.toHaveProperty('hint')
  })

  it('Should hold the commodities row in progress on a type with no line', async () => {
    const { h } = await renderHub({ seed: { commodityType: POTATOES } })

    const [row] = h.captured.view.context.groups[0].items
    expect(row.status).toEqual({
      tag: { text: copy.statuses.inProgress, classes: 'govuk-tag--light-blue' }
    })
  })

  it('Should complete the commodities row once a line answers every field its category asks for', async () => {
    const { journeyId, h } = await renderHub({
      seed: COMPLETE_POTATO_CONSIGNMENT
    })

    const [row] = h.captured.view.context.groups[0].items
    expect(row.status).toEqual({
      tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
    })
    expect(row.href).toBe(`/notifications/${journeyId}/commodity-type`)
  })

  it('Should render the review group after the answer groups', async () => {
    const { h } = await renderHub()

    expect(GROUPS.find((group) => group.id === REVIEW_GROUP_ID).rows).toEqual([
      'review'
    ])
    expect(h.captured.view.context.groups.map((group) => group.id)).toEqual(
      RENDERED_GROUP_IDS
    )
  })

  it('Should carry no commodity totals — the animals panel is not copied', async () => {
    const { h } = await renderHub()

    expect(h.captured.view.context).not.toHaveProperty('commodityTotals')
  })

  it('Should complete an active opening run on GET', async () => {
    const { journeyId, h } = await renderHub({ openingRun: RUN_ACTIVE })

    expect(h.captured.cookies[SESSION_COOKIES.openingRun]).toEqual({
      [journeyId]: RUN_COMPLETE
    })
  })

  it('Should leave a journey that never began an opening run untouched', async () => {
    const { h } = await renderHub()

    expect(h.captured.cookies).not.toHaveProperty(SESSION_COOKIES.openingRun)
  })
})

describe('#hubGet — the arrival row', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  const arrivalRowIn = async (seed) => {
    const { journeyId, h } = await renderHub({ seed })
    const [arrivalRow] = h.captured.view.context.groups[1].items
    return { journeyId, arrivalRow }
  }

  it('Should open the row for a potato notification at the details page', async () => {
    // The status question is out of scope for potatoes, so the row opens on
    // the details page, which every commodity type answers.
    const { journeyId, arrivalRow } = await arrivalRowIn({
      commodityType: POTATOES,
      countryOfOrigin: FRANCE
    })

    expect(arrivalRow.href).toBe(`/notifications/${journeyId}/arrival-details`)
    expect(arrivalRow.status).toEqual({
      tag: {
        text: copy.statuses.notYetStarted,
        classes: NOT_STARTED_TAG_CLASS
      }
    })
  })

  it('Should keep the row blocked until a plants notification names its origin', async () => {
    const { arrivalRow } = await arrivalRowIn({
      commodityType: PLANTS_FOR_PLANTING
    })

    expect(arrivalRow).not.toHaveProperty('href')
    expect(arrivalRow.status).toEqual(CANNOT_START_STATUS)
  })

  it('Should open the row at the status question once a plants notification names its origin', async () => {
    const { journeyId, arrivalRow } = await arrivalRowIn({
      commodityType: PLANTS_FOR_PLANTING,
      countryOfOrigin: FRANCE
    })

    expect(arrivalRow.href).toBe(`/notifications/${journeyId}/arrival-status`)
    expect(arrivalRow.status).toEqual({
      tag: {
        text: copy.statuses.notYetStarted,
        classes: NOT_STARTED_TAG_CLASS
      }
    })
  })

  it('Should complete the row once the status and the date are given', async () => {
    const { arrivalRow } = await arrivalRowIn({
      commodityType: PLANTS_FOR_PLANTING,
      countryOfOrigin: FRANCE,
      arrivalStatus: ALREADY_ARRIVED,
      arrivalDate: { day: '27', month: '3', year: '2026' }
    })

    expect(arrivalRow.status).toEqual({
      tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
    })
  })
})

describe('#hubGet — the destination row', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  const destinationRowIn = async (seed) => {
    const { journeyId, h } = await renderHub({ seed })
    const [, destinationRow] = h.captured.view.context.groups[1].items
    return { journeyId, destinationRow }
  }

  it('Should keep the row blocked until the notification names its origin', async () => {
    const { destinationRow } = await destinationRowIn({
      commodityType: POTATOES
    })

    expect(destinationRow).not.toHaveProperty('href')
    expect(destinationRow.status).toEqual(CANNOT_START_STATUS)
  })

  it('Should open the row once the origin is named, for every commodity type', async () => {
    // Every notification owes a place of destination, so the row is asked of
    // potatoes and of plants alike.
    for (const commodityType of [POTATOES, PLANTS_FOR_PLANTING]) {
      const { journeyId, destinationRow } = await destinationRowIn({
        commodityType,
        countryOfOrigin: FRANCE
      })

      expect(destinationRow.href).toBe(
        `/notifications/${journeyId}/destinations/select`
      )
      expect(destinationRow.status).toEqual({
        tag: {
          text: copy.statuses.notYetStarted,
          classes: NOT_STARTED_TAG_CLASS
        }
      })
    }
  })

  it('Should complete the row once an address has been picked', async () => {
    const { destinationRow } = await destinationRowIn({
      commodityType: POTATOES,
      countryOfOrigin: FRANCE,
      placeOfDestination: { addressId: 'tech-imports-ltd' }
    })

    expect(destinationRow.status).toEqual({
      tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
    })
  })
})

describe('#hubGet — consignor', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should show identification numbers and contact in the parties group for potatoes', async () => {
    const { h } = await renderHub({ seed: { commodityType: POTATOES } })
    expect(
      h.captured.view.context.groups
        .find(({ id }) => id === PARTIES_GROUP_ID)
        .items.map((item) => item.title.text)
    ).toEqual([copy.rows.identificationNumbers.title, copy.rows.contact.title])
  })

  it('Should link plants and wood to the picker and complete a saved reference', async () => {
    for (const commodityType of [PLANTS_FOR_PLANTING, 'wood-and-cut-trees']) {
      const { journeyId, h } = await renderHub({
        seed: {
          commodityType,
          countryOfOrigin: FRANCE,
          consignor: { addressId: 'tech-imports-ltd' }
        }
      })
      const group = h.captured.view.context.groups.find(
        ({ id }) => id === PARTIES_GROUP_ID
      )
      expect(group.items).toEqual([
        {
          title: { text: copy.rows.consignor.title },
          href: `/notifications/${journeyId}/consignors/select`,
          status: {
            tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
          }
        },
        {
          title: { text: copy.rows.identificationNumbers.title },
          href: `/notifications/${journeyId}/identification-numbers`,
          status:
            commodityType === 'wood-and-cut-trees'
              ? { text: copy.statuses.optional }
              : {
                  tag: {
                    text: copy.statuses.notYetStarted,
                    classes: NOT_STARTED_TAG_CLASS
                  }
                }
        },
        {
          title: { text: copy.rows.contact.title },
          href: `/notifications/${journeyId}/consignment/contact/select`,
          status: {
            tag: {
              text: copy.statuses.notYetStarted,
              classes: NOT_STARTED_TAG_CLASS
            }
          }
        }
      ])
    }
  })
})
