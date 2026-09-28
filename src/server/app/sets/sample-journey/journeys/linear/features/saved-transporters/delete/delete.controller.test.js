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
import { STARTER_TRANSPORTERS } from '../../../../../../../services/transporters/stub.js'
import * as deleteController from './delete.controller.js'

const RELEASE = 'plants-saved-transporters-delete-test'

beforeAll(() => registerSetMount(RELEASE, `/${RELEASE}`))

const get = deleteController.routes.find(
  (route) => route.method === 'GET'
).handler
const post = deleteController.routes.find(
  (route) => route.method === 'POST'
).handler

const requestFor = (transporterId) => ({
  params: { transporterId },
  payload: {},
  auth: { isAuthenticated: true, credentials: authenticatedCredentials }
})

const inRelease = (fn) => withSetContext(RELEASE, fn)

describe('saved-transporters delete', () => {
  beforeEach(() => clearFakesFor(RELEASE))

  it('Should throw a 404 for a well-shaped id that does not exist, on GET and POST', async () => {
    const h = stubH()

    await expect(
      inRelease(() => get(requestFor('not-an-id'), h))
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
    await expect(
      inRelease(() => post(requestFor('not-an-id'), h))
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('Should show the confirm page, naming the transporter, for a real one', async () => {
    const [starter] = STARTER_TRANSPORTERS
    const h = stubH()

    const response = await inRelease(() => get(requestFor(starter.id), h))

    expect(response.context.heading).toContain(starter.name)
  })

  it('Should delete the named transporter and redirect to the list', async () => {
    const [starter] = STARTER_TRANSPORTERS
    const h = stubH()

    const response = await inRelease(() => post(requestFor(starter.id), h))

    expect(response.redirect).toContain('/transporters')
    await expect(
      inRelease(() => get(requestFor(starter.id), h))
    ).rejects.toMatchObject({ output: { statusCode: 404 } })
  })
})
