import { SET_BASE } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import { driveHandler } from '../../../../../../engine/test-support.js'
import { hubRoutePath } from '../../../../../../shared/paths.js'
import { SURFACES } from '../../../../../../shared/kit.js'
import {
  COMPLETE_NOTIFICATION,
  COMPLETE_POTATO_CONSIGNMENT,
  TECH_IMPORTS_COPY,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'

import { ALREADY_ARRIVED } from '../arrival-status/statuses.js'
import { routes } from './controller.js'
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

describe('#hubGet', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should register one GET-only route at the hub path', () => {
    expect(routes).toEqual([
      expect.objectContaining({ method: 'GET', path: hubRoutePath() })
    ])
  })

  it('Should title the hub Overview and render it on the form surface', async () => {
    const {
      view: { view: template, context }
    } = await driveHandler(hubGet)

    expect(template).toBe(
      'high-risk-plants/journeys/linear/features/hub/template'
    )
    expect(context).toMatchObject({
      heading: 'Overview',
      pageTitle: 'Overview',
      copy,
      contentColumnClass: SURFACES.form
    })
  })

  it('Should point the back link and the Return to dashboard button at the dashboard', async () => {
    const { view } = await driveHandler(hubGet)

    expect(view.context.backLink).toBe(SET_BASE)
    expect(view.context.dashboardHref).toBe(SET_BASE)
  })

  it('Should render no breadcrumbs, no progress line and no section caption', async () => {
    const { view } = await driveHandler(hubGet)

    expect(view.context.breadcrumbs).toBeUndefined()
    expect(view.context.progressLine).toBeUndefined()
    expect(view.context.caption).toBeUndefined()
  })

  it('Should carry the shared chrome copy and the journey reference strip', async () => {
    const { journeyId, view } = await driveHandler(hubGet)

    expect(view.context.sharedCopy.layout.serviceName).toBe(
      'Import notification service'
    )
    expect(view.context.journeyStrip).toEqual({
      reference: journeyId,
      status: { text: 'Draft', classes: 'govuk-tag--blue' }
    })
  })

  it('Should render the about-the-consignment group and its two rows', async () => {
    const { journeyId, view } = await driveHandler(hubGet)

    expect(view.context.groups).toEqual([
      {
        id: CONSIGNMENT_GROUP_ID,
        caption: copy.groups[CONSIGNMENT_GROUP_ID],
        items: [
          expect.objectContaining({
            title: { text: copy.rows.commodities.title },
            href: `${SET_BASE}/notifications/${journeyId}/commodity-type?from=overview`,
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
    const { view } = await driveHandler(hubGet)

    const [, originRow] = view.context.groups[0].items
    expect(originRow).toEqual({
      title: { text: copy.rows.origin.title },
      status: CANNOT_START_STATUS
    })
  })

  it('Should open the origin row once the commodity type is answered', async () => {
    const { journeyId, view } = await driveHandler(hubGet, {
      seed: { commodityType: POTATOES }
    })

    const [, originRow] = view.context.groups[0].items
    expect(originRow.href).toBe(
      `${SET_BASE}/notifications/${journeyId}/origin?from=overview`
    )
    expect(originRow.status).toEqual({
      tag: {
        text: copy.statuses.notYetStarted,
        classes: NOT_STARTED_TAG_CLASS
      }
    })
  })

  it('Should complete the origin row once a country is named', async () => {
    const { view } = await driveHandler(hubGet, {
      seed: { commodityType: POTATOES, countryOfOrigin: FRANCE }
    })

    const [, originRow] = view.context.groups[0].items
    expect(originRow.status).toEqual({
      tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
    })
  })

  it('Should still complete the origin row when the stored country is no longer offered by the origin block', async () => {
    const UNOFFERED_COUNTRY = 'ZZ'
    const { view } = await driveHandler(hubGet, {
      seed: { commodityType: POTATOES, countryOfOrigin: UNOFFERED_COUNTRY }
    })

    const [, originRow] = view.context.groups[0].items
    expect(originRow.status).toEqual({
      tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
    })
  })

  it('Should give the commodities row no hint', async () => {
    const { view } = await driveHandler(hubGet)

    const [row] = view.context.groups[0].items
    expect(row).not.toHaveProperty('hint')
  })

  it('Should hold the commodities row in progress on a type with no line', async () => {
    const { view } = await driveHandler(hubGet, {
      seed: { commodityType: POTATOES }
    })

    const [row] = view.context.groups[0].items
    expect(row.status).toEqual({
      tag: { text: copy.statuses.inProgress, classes: 'govuk-tag--light-blue' }
    })
  })

  it('Should complete the commodities row once a line answers every field its category asks for', async () => {
    const { journeyId, view } = await driveHandler(hubGet, {
      seed: COMPLETE_POTATO_CONSIGNMENT
    })

    const [row] = view.context.groups[0].items
    expect(row.status).toEqual({
      tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
    })
    expect(row.href).toBe(
      `${SET_BASE}/notifications/${journeyId}/commodity-type?from=overview`
    )
  })

  it('Should render the review group after the answer groups', async () => {
    const { view } = await driveHandler(hubGet)

    expect(view.context.groups.map((group) => group.id)).toEqual(
      RENDERED_GROUP_IDS
    )
  })

  it('Should carry no commodity totals in the view context', async () => {
    const { view } = await driveHandler(hubGet)

    expect(view.context).not.toHaveProperty('commodityTotals')
  })
})

describe('#hubGet — the task links', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should link every task row to its page with exactly the Overview mark added', async () => {
    const { view } = await driveHandler(hubGet, { seed: COMPLETE_NOTIFICATION })
    const items = view.context.groups.flatMap((group) => group.items)

    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      const [pagePathOfRow] = item.href.split('?')
      expect(pagePathOfRow).not.toContain('?')
      expect(item.href).toBe(`${pagePathOfRow}?from=overview`)
    }
  })
})

describe('#hubGet — the arrival row', () => {
  useStubbedHighRiskPlantsJourney()

  const arrivalRowIn = async (seed) => {
    const { journeyId, view } = await driveHandler(hubGet, { seed })
    const [arrivalRow] = view.context.groups[1].items
    return { journeyId, arrivalRow }
  }

  it('Should open the row for a potato notification at the details page', async () => {
    const { journeyId, arrivalRow } = await arrivalRowIn({
      commodityType: POTATOES,
      countryOfOrigin: FRANCE
    })

    expect(arrivalRow.href).toBe(
      `${SET_BASE}/notifications/${journeyId}/arrival-details?from=overview`
    )
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

    expect(arrivalRow.href).toBe(
      `${SET_BASE}/notifications/${journeyId}/arrival-status?from=overview`
    )
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
  useStubbedHighRiskPlantsJourney()

  const destinationRowIn = async (seed) => {
    const { journeyId, view } = await driveHandler(hubGet, { seed })
    const [, destinationRow] = view.context.groups[1].items
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
    for (const commodityType of [POTATOES, PLANTS_FOR_PLANTING]) {
      const { journeyId, destinationRow } = await destinationRowIn({
        commodityType,
        countryOfOrigin: FRANCE
      })

      expect(destinationRow.href).toBe(
        `${SET_BASE}/notifications/${journeyId}/destinations/select?from=overview`
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
      placeOfDestination: TECH_IMPORTS_COPY
    })

    expect(destinationRow.status).toEqual({
      tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
    })
  })
})

describe('#hubGet — consignor', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should show identification numbers and contact in the parties group for potatoes', async () => {
    const { view } = await driveHandler(hubGet, {
      seed: { commodityType: POTATOES }
    })
    expect(
      view.context.groups
        .find(({ id }) => id === PARTIES_GROUP_ID)
        .items.map((item) => item.title.text)
    ).toEqual([copy.rows.identificationNumbers.title, copy.rows.contact.title])
  })

  it('Should link plants and wood to the picker and complete a picked copy', async () => {
    for (const commodityType of [PLANTS_FOR_PLANTING, 'wood-and-cut-trees']) {
      const { journeyId, view } = await driveHandler(hubGet, {
        seed: {
          commodityType,
          countryOfOrigin: FRANCE,
          consignor: TECH_IMPORTS_COPY
        }
      })
      const group = view.context.groups.find(
        ({ id }) => id === PARTIES_GROUP_ID
      )
      expect(group.items).toEqual([
        {
          title: { text: copy.rows.consignor.title },
          href: `${SET_BASE}/notifications/${journeyId}/consignors/select?from=overview`,
          status: {
            tag: { text: copy.statuses.completed, classes: COMPLETED_TAG_CLASS }
          }
        },
        {
          title: { text: copy.rows.identificationNumbers.title },
          href: `${SET_BASE}/notifications/${journeyId}/identification-numbers?from=overview`,
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
          href: `${SET_BASE}/notifications/${journeyId}/consignment/contact/select?from=overview`,
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

describe('#hubGet — the order of the task rows', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should list the task rows under each caption in the order Save and continue visits them', async () => {
    const { view } = await driveHandler(hubGet, {
      seed: { commodityType: PLANTS_FOR_PLANTING }
    })

    expect(
      view.context.groups.map((group) =>
        group.items.map((item) => item.title.text)
      )
    ).toEqual([
      [copy.rows.commodities.title, copy.rows.origin.title],
      [copy.rows.arrival.title, copy.rows.destination.title],
      [
        copy.rows.consignor.title,
        copy.rows.identificationNumbers.title,
        copy.rows.contact.title
      ],
      [copy.rows.review.title]
    ])
  })
})
