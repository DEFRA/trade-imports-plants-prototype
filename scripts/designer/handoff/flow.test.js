import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../lib/repo.js'
import {
  flowRows,
  gateChangesOf,
  readJourneyFlow,
  validationCallsIn,
  validationRowsFor
} from './flow.js'

const ORDERS = {
  firstPass: ['commodity-type', 'origin', 'arrival-details'],
  sections: [
    { id: 'origin', pages: ['origin'] },
    { id: 'arrival', pages: ['arrival-details'] }
  ],
  groups: [
    {
      id: 'about',
      rows: [{ id: 'origin', pages: ['origin'] }]
    }
  ]
}

describe('flowRows', () => {
  it('Should show the before and after order where a page moves', () => {
    const after = {
      ...ORDERS,
      firstPass: ['commodity-type', 'arrival-details', 'origin']
    }

    expect(flowRows(ORDERS, after, ['arrival-details'])[0]).toEqual({
      order: 'First pass, a new notification',
      before: 'commodity-type > origin > {{arrival-details}}',
      after: 'commodity-type > {{arrival-details}} > origin',
      moved: true
    })
  })

  it('Should mark an order that holds a changed page but does not move as not moved', () => {
    const rows = flowRows(ORDERS, ORDERS, ['arrival-details'])

    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.moved === false)).toBe(true)
  })

  it('Should show a new page and the section it joins', () => {
    const after = {
      ...ORDERS,
      firstPass: [...ORDERS.firstPass, 'transporter'],
      sections: [
        ...ORDERS.sections,
        { id: 'transport', pages: ['transporter'] }
      ]
    }

    expect(
      flowRows(ORDERS, after, ['transporter']).map((row) => row.order)
    ).toEqual(['First pass, a new notification', 'Continue, section transport'])
  })

  it('Should give no rows when nothing moves and no changed page is in an order', () => {
    expect(flowRows(ORDERS, ORDERS, ['hub'])).toEqual([])
  })

  it('Should say before is not known when there is no real journey to compare with', () => {
    expect(flowRows(null, ORDERS, ['origin'])[0].before).toBe('(not known)')
  })
})

describe('readJourneyFlow', () => {
  const report = {
    set: 'plants-working',
    mode: 'release',
    placeholder: false,
    pages: [{ feature: 'origin', slugs: ['origin'] }]
  }

  it('Should read the release after and the real journey before', async () => {
    const asked = []
    const read = async (setId) => {
      asked.push(setId)
      return ORDERS
    }

    const flow = await readJourneyFlow('/repo', report, read)

    expect(asked).toEqual(['plants-working', 'high-risk-plants'])
    expect(flow.error).toBeNull()
  })

  it('Should read the real journey’s own orders with designer:release’s logic', async () => {
    const flow = await readJourneyFlow(REPO_ROOT, {
      set: 'high-risk-plants',
      mode: 'real-journey',
      placeholder: false,
      pages: [{ feature: 'origin', slugs: ['origin'] }]
    })

    expect(flow.error).toBeNull()
    expect(flow.before).toBeNull()
    expect(flow.rows[0]).toMatchObject({
      order: 'First pass, a new notification',
      before: '(not known)'
    })
    expect(flow.rows[0].after).toContain('{{origin}}')
  })

  it('Should say why when the orders cannot be read', async () => {
    const read = async () => {
      throw new Error('Cannot find module flow.js\nat stack')
    }

    expect(await readJourneyFlow('/repo', report, read)).toEqual({
      rows: [],
      before: null,
      error: 'Cannot find module flow.js'
    })
  })
})

describe('gateChangesOf', () => {
  it('Should list the gate lines an obligation change adds and removes', () => {
    const changes = [
      {
        path: 'src/server/app/sets/high-risk-plants/obligations/sections/arrival.js',
        before:
          "  label: 'Arrival',\n  applyTo: equalsGate(commodityType, 'potatoes')",
        after:
          "  label: 'Arrival',\n  applyTo: equalsGate(commodityType, 'plants')"
      },
      {
        path: 'src/server/app/sets/high-risk-plants/journeys/linear/features/origin/template.njk',
        before: 'when',
        after: 'skip'
      }
    ]

    expect(gateChangesOf(changes)).toEqual([
      {
        file: 'src/server/app/sets/high-risk-plants/obligations/sections/arrival.js',
        added: ["applyTo: equalsGate(commodityType, 'plants')"],
        removed: ["applyTo: equalsGate(commodityType, 'potatoes')"]
      }
    ])
  })
})

const FIELDS = `export const ARRIVAL_DATE = 'arrivalDate'
export const ARRIVAL_TIME = 'arrivalTime'
export const PLACE = 'proposedPlaceOfLanding'`

const CONTROLLER = `import { compose, requiredDateTextInRange, requiredOneOf, requiredTime } from '../lib/validate/index.js'
const dateRule = (bounds) =>
  requiredDateTextInRange(ARRIVAL_DATE, {
    max: bounds.max,
    messages: {
      required: copy.errors.arrivalDate.required,
      invalid: copy.errors.arrivalDate.invalid,
      range: copy.errors.arrivalDate.inFuture
    }
  })
const potatoRules = async () => [
  requiredTime(ARRIVAL_TIME, { required: copy.errors.arrivalTime }),
  requiredOneOf(PLACE, await portCodes(), copy.errors.proposedPlaceOfLanding)
]`

const EN = `export const copy = {
  errors: {
    arrivalDate: {
      required: 'Enter the arrival date',
      invalid: 'Enter a real arrival date',
      inFuture: 'The date the consignment arrived cannot be in the future'
    },
    arrivalTime: 'Enter the expected time of arrival',
    proposedPlaceOfLanding: 'Select the proposed place of landing',
    noLongerAvailable: 'The saved port is no longer available'
  }
}`

const CY = EN.replace(
  "'Enter the arrival date'",
  "'Rhowch y dyddiad cyrraedd'"
).replace(
  "'Enter the expected time of arrival'",
  "'[Welsh needed] Enter the expected time of arrival'"
)

describe('validationCallsIn', () => {
  it('Should read each rule with its field and message key', () => {
    expect(validationCallsIn([FIELDS, CONTROLLER])).toEqual([
      {
        field: 'arrivalDate',
        rule: 'Must be answered',
        key: 'errors.arrivalDate.required'
      },
      {
        field: 'arrivalDate',
        rule: 'Must be real and in the right form',
        key: 'errors.arrivalDate.invalid'
      },
      {
        field: 'arrivalDate',
        rule: 'Must be within the allowed range',
        key: 'errors.arrivalDate.inFuture'
      },
      {
        field: 'arrivalTime',
        rule: 'Must be answered',
        key: 'errors.arrivalTime'
      },
      {
        field: 'proposedPlaceOfLanding',
        rule: 'Must be answered with one of the options',
        key: 'errors.proposedPlaceOfLanding'
      }
    ])
  })

  it('Should read a literal field name and a literal message', () => {
    expect(
      validationCallsIn(["requiredText('reference', 'Enter a reference')"])
    ).toEqual([
      {
        field: 'reference',
        rule: 'Must be answered',
        text: 'Enter a reference'
      }
    ])
  })
})

describe('validationRowsFor', () => {
  const rows = validationRowsFor({
    page: 'arrival-details',
    sources: [FIELDS, CONTROLLER],
    en: EN,
    cy: CY
  })

  it('Should give the English and Welsh error for each rule', () => {
    expect(rows[0]).toEqual({
      page: 'arrival-details',
      key: 'errors.arrivalDate.required',
      field: 'arrivalDate',
      rule: 'Must be answered',
      english: 'Enter the arrival date',
      welsh: 'Rhowch y dyddiad cyrraedd'
    })
    expect(rows[3].welsh).toBe(
      '[Welsh needed] Enter the expected time of arrival'
    )
  })

  it('Should add a row for an error the page checks in its own code', () => {
    expect(rows.at(-1)).toEqual({
      page: 'arrival-details',
      key: 'errors.noLongerAvailable',
      field: 'noLongerAvailable',
      rule: 'Checked in the page’s own code',
      english: 'The saved port is no longer available',
      welsh: 'The saved port is no longer available'
    })
    expect(rows).toHaveLength(6)
  })
})
