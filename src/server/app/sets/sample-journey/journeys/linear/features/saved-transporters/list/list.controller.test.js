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
import * as listController from './list.controller.js'

const RELEASE = 'plants-saved-transporters-list-test'

beforeAll(() => registerSetMount(RELEASE, `/${RELEASE}`))

const get = listController.routes.find(
  (route) => route.method === 'GET'
).handler

const requestWith = (query = {}) => ({
  query,
  auth: { isAuthenticated: true, credentials: authenticatedCredentials }
})

describe('saved-transporters list', () => {
  beforeEach(() => clearFakesFor(RELEASE))

  it('Should list the starter transporters, with a link to add one', async () => {
    const h = stubH()

    const response = await withSetContext(RELEASE, () => get(requestWith(), h))

    expect(response.context.addHref).toContain('/transporters/add')
    expect(response.context.rows).toHaveLength(
      Math.min(5, STARTER_TRANSPORTERS.length)
    )
  })

  it('Should search by name, address or approval number', async () => {
    const h = stubH()
    const [target] = STARTER_TRANSPORTERS

    const response = await withSetContext(RELEASE, () =>
      get(requestWith({ q: target.townOrCity }), h)
    )

    expect(response.context.rows.map((row) => row.name)).toContain(target.name)
  })
})
