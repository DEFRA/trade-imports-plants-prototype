/**
 * `/examples/{setId}/{example}` sends a reader to wherever an example's
 * journey is now. The example data is swapped for a fake here: the route's
 * job is the lookup and the redirect, not the seeding.
 */
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createServer } from '../server.js'
import { registerSetMount } from '../app/shared/set-context.js'
import { createSeedClient } from '../prototype-seed/http-client.js'
import { resetSet } from '../prototype-seed/index.js'
import { examplesRoute } from './examples-controller.js'
import { exampleLink } from './examples.js'

const SET_ID = 'plants-examples-route'
const SET_BASE = `/${SET_ID}`

const EXAMPLES = {
  'midway-through': { journeyId: 'DRAFT-2', stopAt: 'arrival-details' },
  submitted: { journeyId: 'SUBMITTED-1' },
  'custom-href': { href: `${SET_BASE}/some/where` }
}

const anonymousAuth = {
  plugin: {
    name: 'anonymous-auth',
    register(server) {
      server.auth.scheme('anonymous', () => ({
        authenticate: (_request, h) =>
          h.unauthenticated(new Error('no session'))
      }))
      server.auth.strategy('session', 'anonymous')
      server.auth.default('session')
    }
  }
}

let server
const lookups = []

beforeAll(async () => {
  registerSetMount(SET_ID, SET_BASE)
  server = Hapi.server()
  await server.register(anonymousAuth)
  server.route(
    examplesRoute({
      find: (_server, setId, slug) => {
        lookups.push([setId, slug])
        return Promise.resolve(EXAMPLES[slug])
      }
    })
  )
  await server.initialize()
})

afterAll(async () => {
  await server.stop({ timeout: 0 })
})

describe('stable example links', () => {
  it('Should send the reader to the page the example stopped at', async () => {
    const response = await server.inject(exampleLink(SET_ID, 'midway-through'))

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      `${SET_BASE}/notifications/DRAFT-2/arrival-details`
    )
    expect(lookups).toContainEqual([SET_ID, 'midway-through'])
  })

  it('Should send the reader to the notification when the example did not stop at a page', async () => {
    const response = await server.inject(exampleLink(SET_ID, 'submitted'))

    expect(response.headers.location).toBe(
      `${SET_BASE}/notifications/SUBMITTED-1`
    )
  })

  it('Should use the link the example data gives when it gives one', async () => {
    const response = await server.inject(exampleLink(SET_ID, 'custom-href'))

    expect(response.headers.location).toBe(`${SET_BASE}/some/where`)
  })

  it('Should answer not found for an example the set does not have', async () => {
    const response = await server.inject(exampleLink(SET_ID, 'no-such'))

    expect(response.statusCode).toBe(404)
  })

  it('Should answer not found for a set that is not mounted', async () => {
    const response = await server.inject(
      exampleLink('not-a-mounted-set', 'submitted')
    )

    expect(response.statusCode).toBe(404)
  })
})

describe('stable example links on the real prototype', () => {
  const REAL_JOURNEY = 'high-risk-plants'
  const MIDWAY = 'draft-midway'
  const STOP_PAGE = new RegExp(
    `^/${REAL_JOURNEY}/notifications/([^/]+)/destinations/select$`
  )
  let realServer

  beforeAll(async () => {
    realServer = await createServer()
    await realServer.initialize()
  })

  afterAll(async () => {
    await realServer.stop({ timeout: 0 })
  })

  const signedInClient = async () => {
    const client = createSeedClient(realServer)
    await client.get('/auth/stub-sign-in?organisationId=example-link-reader')
    return client
  }

  it('Should seed a set nobody has visited since the start, then open the example’s stop page', async () => {
    const client = await signedInClient()

    const response = await client.get(exampleLink(REAL_JOURNEY, MIDWAY))

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(STOP_PAGE)
    const page = await client.get(response.headers.location)
    expect(page.statusCode).toBe(200)
  })

  it('Should follow the example to its new reference number after a reset', async () => {
    const client = await signedInClient()
    const before = await client.get(exampleLink(REAL_JOURNEY, MIDWAY))

    await resetSet(realServer, REAL_JOURNEY)
    const after = await client.get(exampleLink(REAL_JOURNEY, MIDWAY))

    const [, beforeId] = before.headers.location.match(STOP_PAGE)
    const [, afterId] = after.headers.location.match(STOP_PAGE)
    expect(afterId).not.toBe(beforeId)
    expect((await client.get(after.headers.location)).statusCode).toBe(200)
  })
})
