/**
 * The set's answers-read sanitiser.
 *
 * The address book is mocked at the network boundary — `stubMode` off and
 * `fetch` stubbed — wherever a test needs a book this one controls. Only that
 * mode can produce a soft-deleted record: every record the stub book holds
 * carries `deleted: false`, and the stub book cannot be written to.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

// Real-mode address-book resolution flows through the address-book mapper's
// originLabel, which now self-loads via a countries fetch. Mock the countries
// reader so the fetch stub only has to answer address-book URLs — otherwise
// the once-only fetch assertions in this file would double-count a countries
// load onto the address-book count.
vi.mock('../../../../../services/countries/index.js', () => {
  const LABELS = { BE: 'Belgium', GB: 'United Kingdom' }
  return {
    ensureLoaded: async () => {},
    originLabel: async (code) => LABELS[code]
  }
})

import { config } from '../../../../../../../config/config.js'
import { obligationByName } from '../../../../../bridge/obligation-source.js'
import { journeyRequest } from '../../../../../engine/test-support.js'
import { installHighRiskPlantsJourney } from '../test-support.js'
import { REFERENCE_PARTIES, withoutUnresolvedPartyRefs } from './index.js'

const ORGANISATION_ID = '5900001'
const JOURNEY_ID = 'HRP-0001'

// Records the stub address book holds, and one it does not.
const IN_THE_BOOK = 'tech-imports-ltd'
const NOT_IN_THE_BOOK = 'no-such-address'

const DELETED_ID = 'closed-depot-ltd'
const LIVE_ID = 'live-depot-one'

const request = () => journeyRequest(JOURNEY_ID)

const apiRecord = (id, overrides = {}) => ({
  id,
  name: `Record ${id}`,
  addressLine1: '1 Test Street',
  townOrCity: 'Testville',
  postcode: 'TE5 7ER',
  countryCode: 'BE',
  deleted: false,
  ...overrides
})

const okJson = (body) => ({ ok: true, status: 200, json: async () => body })

/** The API resolves a soft-deleted record rather than 404ing it, so the book
 * answers for both ids and only the deleted one carries the tombstone. */
const bookHoldingADeletedRecord = () =>
  vi.fn(async (url) => {
    const deleted = url.endsWith(`/${DELETED_ID}`)
    return okJson(apiRecord(deleted ? DELETED_ID : LIVE_ID, { deleted }))
  })

describe('REFERENCE_PARTIES', () => {
  beforeAll(installHighRiskPlantsJourney)

  it('Should name only answers the manifest declares', () => {
    expect(REFERENCE_PARTIES.length).toBeGreaterThan(0)
    expect(REFERENCE_PARTIES.filter((name) => !obligationByName(name))).toEqual(
      []
    )
  })
})

describe('withoutUnresolvedPartyRefs — against the stub book', () => {
  it('Should drop a reference the book no longer holds', async () => {
    const answers = {
      commodityType: 'potatoes',
      placeOfDestination: { addressId: NOT_IN_THE_BOOK }
    }

    const next = await withoutUnresolvedPartyRefs(request(), answers)

    expect(next.placeOfDestination).toBeUndefined()
    expect(next.commodityType, 'the other answers are untouched').toBe(
      'potatoes'
    )
  })

  it('Should leave the stored answers alone when it drops a reference', async () => {
    const answers = { placeOfDestination: { addressId: NOT_IN_THE_BOOK } }

    await withoutUnresolvedPartyRefs(request(), answers)

    expect(answers.placeOfDestination).toEqual({ addressId: NOT_IN_THE_BOOK })
  })

  it('Should return the same object when every reference still resolves', async () => {
    const answers = { placeOfDestination: { addressId: IN_THE_BOOK } }

    const next = await withoutUnresolvedPartyRefs(request(), answers)

    // Same object, not a copy — the engine skips its re-evaluation on that.
    expect(next).toBe(answers)
  })

  it('Should return the same object when no party is referenced at all', async () => {
    const answers = { commodityType: 'potatoes' }

    const next = await withoutUnresolvedPartyRefs(request(), answers)

    expect(next).toBe(answers)
  })

  it('Should treat no answers at all as nothing to sanitise', async () => {
    await expect(withoutUnresolvedPartyRefs(request())).resolves.toEqual({})
  })
})

describe('withoutUnresolvedPartyRefs — against the real book', () => {
  const originalMode = config.get('stubMode')

  beforeEach(() => {
    config.set('stubMode', false)
  })

  afterEach(() => {
    config.set('stubMode', originalMode)
    vi.unstubAllGlobals()
  })

  it('Should drop a reference to a record the organisation has deleted', async () => {
    vi.stubGlobal('fetch', bookHoldingADeletedRecord())

    const next = await withoutUnresolvedPartyRefs(request(), {
      placeOfDestination: { addressId: DELETED_ID }
    })

    expect(next.placeOfDestination).toBeUndefined()
  })

  it('Should keep a reference to a record the organisation still holds', async () => {
    vi.stubGlobal('fetch', bookHoldingADeletedRecord())
    const answers = { placeOfDestination: { addressId: LIVE_ID } }

    const next = await withoutUnresolvedPartyRefs(request(), answers)

    expect(next).toBe(answers)
  })

  it('Should read the book for the organisation the request is signed in as', async () => {
    const fetched = bookHoldingADeletedRecord()
    vi.stubGlobal('fetch', fetched)

    await withoutUnresolvedPartyRefs(request(), {
      placeOfDestination: { addressId: LIVE_ID }
    })

    expect(fetched).toHaveBeenCalledTimes(1)
    expect(fetched.mock.calls[0][0]).toContain(
      `/organisation/${ORGANISATION_ID}/addresses/${LIVE_ID}`
    )
  })

  it('Should let an outage propagate rather than read it as a deletion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('address book is down')
      })
    )

    await expect(
      withoutUnresolvedPartyRefs(request(), {
        placeOfDestination: { addressId: LIVE_ID }
      })
    ).rejects.toThrow('address book is down')
  })
})
