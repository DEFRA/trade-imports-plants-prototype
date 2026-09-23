/**
 * The answers-for-read seam, with two sets mounted.
 *
 * It is one of the few seams that answers for an unconfigured set rather than
 * throwing: a set that configures no sanitiser reads its answers unchanged.
 * That is not hypothetical here — `routes-sample-journey.js` configures no
 * sanitiser while `routes-high-risk-plants.js` does. Proving it needs a second
 * set deliberately left unconfigured, because with one set mounted the identity
 * fallback and a configured sanitiser cannot be told apart.
 */
import { beforeAll, describe, expect, it } from 'vitest'

import { answersForRead, configureAnswersForRead } from './answers-read.js'
import { registerSetMount, withSetContext } from '../shared/set-context.js'
import { SET_ID as HIGH_RISK_PLANTS } from '../sets/high-risk-plants/set.js'

const UNCONFIGURED_SET = 'answers-read-probe'
const REQUEST = { path: '/anywhere' }
const ANSWERS = Object.freeze({
  countryOfOrigin: 'FR',
  consignor: { addressId: 'deleted-address' }
})

const sanitized = { countryOfOrigin: 'FR', consignor: null }

beforeAll(() => {
  registerSetMount(UNCONFIGURED_SET, `/${UNCONFIGURED_SET}`)
  // Only high-risk-plants gets a sanitiser. The other set is left unconfigured
  // on purpose — that is the case under test.
  configureAnswersForRead(HIGH_RISK_PLANTS, async () => sanitized)
})

describe('#answersForRead', () => {
  it('Should apply the configured set’s own sanitiser', async () => {
    const result = await withSetContext(HIGH_RISK_PLANTS, () =>
      answersForRead(REQUEST, ANSWERS)
    )

    expect(result).toEqual(sanitized)
  })

  it('Should read a set that configures no sanitiser unchanged', async () => {
    const result = await withSetContext(UNCONFIGURED_SET, () =>
      answersForRead(REQUEST, ANSWERS)
    )

    expect(result).toEqual(ANSWERS)
    expect(result).not.toEqual(sanitized)
  })
})
