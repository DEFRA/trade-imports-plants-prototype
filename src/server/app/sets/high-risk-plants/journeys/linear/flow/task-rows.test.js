const ADDRESS_ID = 'tech-imports-ltd'
import { consignmentContactSelectPage } from '../features/consignment-contact-select/page.js'
import { identificationNumbersPage } from '../features/identification-numbers/page.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../flow/dispatch.js'
import {
  configureObligationSet,
  obligationSet
} from '../../../../../model/obligations/manifest.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../../../../bridge/status/index.js'
import { makeScope } from '../../../../../engine/index.js'
import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  installHighRiskPlantsJourney
} from '../test-support.js'
import { GROUPS } from '../features/hub/controller.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { ALREADY_ARRIVED } from '../features/arrival-status/statuses.js'
import { arrivalDetailsPage } from '../features/arrival-details/page.js'
import { placeOfDestinationPage } from '../features/place-of-destination/page.js'
import { commodityTypes } from '../../../services/commodities/index.js'
import { dispatchPages } from '../features/index.js'
import { rowParts, rowStatus, taskRowById, taskRows } from './task-rows.js'

const REVIEW_ROW_ID = 'review'
const NO_OBLIGATIONS = { obligations: [], groups: [] }
const PLANTS_FOR_PLANTING = 'plants-for-planting'
const POTATOES = 'potatoes'
const AN_ARRIVAL_DATE = { day: '27', month: '3', year: '2026' }

// Stand-ins for `rowParts` and `rowStatus`, which are page-agnostic: they are
// driven over a dispatch index of their own so the cases stay independent of
// whichever pages the journey has landed.
const stubFirstPage = {
  id: 'stubFirstPage',
  slug: 'stub-first',
  collects: ['stubFirst']
}
const stubSecondPage = {
  id: 'stubSecondPage',
  slug: 'stub-second',
  collects: ['stubSecond']
}

const scopeOf = (...names) => new Set(names)

describe('#taskRows — the rows the hub can resolve', () => {
  it('Should hold the rows the commodity, origin, arrival and destination sections landed', () => {
    expect(taskRows).toEqual([
      {
        id: 'commodities',
        pages: [commodityTypePage, commoditiesPage, commodityDetailsPage]
      },
      { id: 'origin', pages: [originPage] },
      { id: 'arrival', pages: [arrivalStatusPage, arrivalDetailsPage] },
      { id: 'destination', pages: [placeOfDestinationPage] },
      { id: 'consignor', pages: [consignorPage], conditional: true },
      { id: 'identificationNumbers', pages: [identificationNumbersPage] },
      { id: 'contact', pages: [consignmentContactSelectPage] }
    ])
  })

  it('Should resolve each landed row by id', () => {
    expect(taskRowById('commodities')).toBe(taskRows[0])
    expect(taskRowById('origin')).toBe(taskRows[1])
    expect(taskRowById('arrival')).toBe(taskRows[2])
    expect(taskRowById('destination')).toBe(taskRows[3])
    expect(taskRowById('consignor')).toBe(taskRows[4])
  })

  it('Should resolve no id the journey has not landed', () => {
    expect(taskRowById(REVIEW_ROW_ID)).toBeUndefined()
    expect(taskRowById('about-the-consignment')).toBeUndefined()
  })

  it('Should give the hub a row for every id its groups name', () => {
    const unresolved = GROUPS.flatMap((group) => group.rows).filter(
      (id) => id !== REVIEW_ROW_ID && taskRowById(id) === undefined
    )
    expect(
      unresolved,
      'a hub group may only name a task row or the review row'
    ).toEqual([])
  })
})

describe('#rowParts and #rowStatus', () => {
  const installedSet = obligationSet()

  beforeAll(() => {
    configureObligationSet(NO_OBLIGATIONS)
    buildDispatch([...dispatchPages, stubFirstPage, stubSecondPage])
  })
  afterAll(() => configureObligationSet(installedSet))

  it('Should take the commodities row parts from the pages it holds', () => {
    // The entry sub-page collects nothing of its own — the list page owns the
    // group — so the row is the entry question plus the collection.
    expect(rowParts(taskRows[0])).toEqual(['commodityType', 'commodityLines'])
  })

  it('Should prefer an explicit parts list over the pages the row holds', () => {
    const row = {
      id: 'stub',
      parts: ['countryOfOrigin'],
      pages: [stubFirstPage, stubSecondPage]
    }

    expect(rowParts(row)).toEqual(['countryOfOrigin'])
  })

  it('Should otherwise take the obligations the row pages collect', () => {
    const row = { id: 'stub', pages: [stubFirstPage, stubSecondPage] }

    expect(rowParts(row)).toEqual(['stubFirst', 'stubSecond'])
  })

  it('Should read no obligation from a page the dispatch index never saw', () => {
    const row = { id: 'stub', pages: [{ id: 'unindexedPage' }] }

    expect(rowParts(row)).toEqual([])
  })

  it('Should status a row over its parts — out of scope is not applicable', () => {
    const row = { id: 'stub', pages: [stubFirstPage] }

    expect(rowStatus(row, {}, scopeOf('stubSecond'), {})).toBe(NA)
  })

  it('Should status an in-scope row nobody has answered as optional', () => {
    const row = { id: 'stub', pages: [stubFirstPage] }

    expect(rowStatus(row, {}, scopeOf('stubFirst'), {})).toBe(OPTIONAL)
  })
})

describe('#rowStatus — one status per hub task row', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  const statusIn = (rowId, answers) =>
    rowStatus(
      taskRowById(rowId),
      answers,
      makeScope(answers).inScope,
      evaluateAnswers(answers)
    )

  it('Should hold the commodities row at Not yet started while nothing is answered', () => {
    expect(statusIn('commodities', {})).toBe(NOT_STARTED)
  })

  it('Should hold the commodities row in progress on a type with no line', () => {
    expect(
      statusIn('commodities', { commodityType: commodityTypes()[0] })
    ).toBe(IN_PROGRESS)
  })

  it('Should complete the commodities row once a line is complete too', () => {
    expect(statusIn('commodities', COMPLETE_POTATO_CONSIGNMENT)).toBe(FULFILLED)
  })

  it('Should hold the row in progress while a line is missing a field', () => {
    expect(
      statusIn('commodities', {
        commodityType: POTATOES,
        commodityLines: [{ category: 'seed-potatoes' }]
      })
    ).toBe(IN_PROGRESS)
  })

  it('Should hold the row in progress while any one line is incomplete', () => {
    expect(
      statusIn('commodities', {
        commodityType: POTATOES,
        commodityLines: [
          ...COMPLETE_POTATO_CONSIGNMENT.commodityLines,
          { category: 'seed-potatoes' }
        ]
      })
    ).toBe(IN_PROGRESS)
  })

  it('Should hold the origin row at Not yet started while nothing is answered', () => {
    expect(statusIn('origin', {})).toBe(NOT_STARTED)
  })

  it('Should complete the origin row once a country is named', () => {
    expect(statusIn('origin', { countryOfOrigin: 'FR' })).toBe(FULFILLED)
  })

  it('Should hold the arrival row at Not yet started on a plants notification', () => {
    expect(statusIn('arrival', { commodityType: PLANTS_FOR_PLANTING })).toBe(
      NOT_STARTED
    )
  })

  it('Should hold the arrival row in progress on a status with no date', () => {
    expect(
      statusIn('arrival', {
        commodityType: PLANTS_FOR_PLANTING,
        arrivalStatus: ALREADY_ARRIVED
      })
    ).toBe(IN_PROGRESS)
  })

  it('Should complete the arrival row on a plants notification once both are answered', () => {
    expect(
      statusIn('arrival', {
        commodityType: PLANTS_FOR_PLANTING,
        arrivalStatus: ALREADY_ARRIVED,
        arrivalDate: AN_ARRIVAL_DATE
      })
    ).toBe(FULFILLED)
  })

  it('Should hold the arrival row at Not yet started on a potato notification', () => {
    // The status question is out of scope for potatoes, but the date, the time
    // and the place of landing are not, so the row is applicable.
    expect(statusIn('arrival', { commodityType: POTATOES })).toBe(NOT_STARTED)
  })

  it('Should complete the arrival row on a potato notification without a status', () => {
    expect(
      statusIn('arrival', {
        commodityType: POTATOES,
        arrivalDate: AN_ARRIVAL_DATE,
        arrivalTime: '14:30',
        proposedPlaceOfLanding: 'GB DVR'
      })
    ).toBe(FULFILLED)
  })

  it('Should require consignor for plants and wood, hide it for potatoes and complete a reference', () => {
    for (const commodityType of ['plants-for-planting', 'wood-and-cut-trees']) {
      expect(statusIn('consignor', { commodityType })).toBe(NOT_STARTED)
      expect(
        statusIn('consignor', {
          commodityType,
          consignor: { addressId: ADDRESS_ID }
        })
      ).toBe(FULFILLED)
    }
    expect(statusIn('consignor', { commodityType: POTATOES })).toBe(NA)
  })

  it('Should make identifiers optional only for wood and complete the required branch', () => {
    expect(
      statusIn('identificationNumbers', { commodityType: 'wood-and-cut-trees' })
    ).toBe(OPTIONAL)
    expect(statusIn('identificationNumbers', { commodityType: POTATOES })).toBe(
      NOT_STARTED
    )
    expect(
      statusIn('identificationNumbers', {
        commodityType: POTATOES,
        producerIdentificationNumber: 'P1',
        cropIdentificationNumber: 'C1'
      })
    ).toBe(FULFILLED)
  })
  it('Should require contact and complete the row with an inline record', () => {
    expect(statusIn('contact', {})).toBe(NOT_STARTED)
    expect(
      statusIn('contact', {
        contactAddress: {
          addressId: ADDRESS_ID,
          name: 'Tech Imports',
          address: { country: 'United Kingdom' }
        }
      })
    ).toBe(FULFILLED)
  })

  it('Should hold the destination row at Not yet started while nothing is answered', () => {
    expect(statusIn('destination', {})).toBe(NOT_STARTED)
  })

  it('Should complete the destination row once an address is referenced', () => {
    expect(
      statusIn('destination', {
        placeOfDestination: { addressId: ADDRESS_ID }
      })
    ).toBe(FULFILLED)
  })

  it('Should hold the destination row at Not yet started on an empty reference', () => {
    // A reference with no id is as good as no answer: the picker never writes
    // one, but the status must not read the wrapper object as an answer.
    expect(
      statusIn('destination', { placeOfDestination: { addressId: '' } })
    ).toBe(NOT_STARTED)
  })
})
