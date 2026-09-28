import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  authenticatedCredentials,
  stubH
} from '../../../../../../../engine/test-support.js'
import {
  registerSetMount,
  withSetContext
} from '../../../../../../../shared/set-context.js'
import { clearFakesFor } from '../../../../../../../../prototype-support/registry.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { copy } from '../copy/copy.en.js'
import * as addController from './add.controller.js'

const RELEASE = 'plants-saved-transporters-add-test'

beforeAll(() => registerSetMount(RELEASE, `/${RELEASE}`))

const get = addController.routes.find((route) => route.method === 'GET').handler
const post = addController.routes.find(
  (route) => route.method === 'POST'
).handler

const requestWith = (payload) => ({
  payload,
  auth: { isAuthenticated: true, credentials: authenticatedCredentials }
})

const inRelease = (fn) => withSetContext(RELEASE, fn)

describe('saved-transporters add', () => {
  beforeEach(() => clearFakesFor(RELEASE))

  it('Should show every field, and a country to choose, on GET', async () => {
    const h = stubH()

    const response = await inRelease(() => get(requestWith({}), h))

    expect(response.view).toBe(
      'sample-journey/journeys/linear/features/saved-transporters/add/add'
    )
    expect(response.context.types).toHaveLength(2)
    expect(response.context.countryItems.length).toBeGreaterThan(1)
    expect(response.context.errorSummary).toBeNull()
  })

  it('Should re-render an empty form with this page’s own copy.errors messages, and never reach the service', async () => {
    const h = stubH()

    const orgId = authenticatedCredentials.organisationId
    const before = await inRelease(() => transporters.listTransporters(orgId))
    const response = await inRelease(() => post(requestWith({}), h))
    const after = await inRelease(() => transporters.listTransporters(orgId))

    expect(response.statusCode).toBe(400)
    expect(response.context.errors.name).toEqual({ text: copy.errors.name })
    expect(response.context.errors.transporterType).toEqual({
      text: copy.errors.transporterType
    })
    expect(response.context.errors.addressLine1).toEqual({
      text: copy.errors.addressLine1
    })
    expect(response.context.errors.townOrCity).toEqual({
      text: copy.errors.townOrCity
    })
    expect(response.context.errors.country).toEqual({
      text: copy.errors.country
    })
    // Validation ran before any call to the service: nothing was created,
    // and none of these fields could have come back from a 400 problem
    // (createTransporter was never given the chance to refuse anything).
    expect(after.total).toBe(before.total)
  })

  it('Should save a valid transporter with the new address fields, and redirect to the list', async () => {
    const h = stubH()
    const payload = {
      name: 'New Haulage Ltd',
      transporterType: 'commercial',
      addressLine1: '1 Depot Road',
      addressLine2: 'Riverside Estate',
      townOrCity: 'Dover',
      county: 'Kent',
      postcode: 'CT16 1AA',
      country: 'GB'
    }

    const response = await inRelease(() => post(requestWith(payload), h))

    expect(response.redirect).toContain('/transporters?q=')
  })
})
