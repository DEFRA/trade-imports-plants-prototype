/**
 * The route wrapper, with two sets mounted.
 *
 * With one set mounted `currentSetId()` falls back to the sole set, so every
 * one of these assertions would pass on an unwrapped route. Mounting a second
 * set is what makes the wrapping load-bearing — and this repo's own hosts,
 * high-risk-plants and sample-journey, are two real ones.
 */
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  currentSetId,
  hasSetContext,
  registerSetMount,
  routeWithSetContext
} from './set-context.js'

const OTHER_SET = 'wrapped-routes-probe'
const OTHER_BASE = `/${OTHER_SET}`

let server

const answerWithSetId = () => ({ setId: currentSetId() })

beforeAll(async () => {
  registerSetMount(OTHER_SET, OTHER_BASE)
  server = Hapi.server()
  server.route([
    routeWithSetContext(OTHER_SET, {
      method: 'GET',
      path: `${OTHER_BASE}/options-handler`,
      options: { handler: answerWithSetId }
    }),
    routeWithSetContext(OTHER_SET, {
      method: 'GET',
      path: `${OTHER_BASE}/options-pre`,
      options: {
        pre: [{ assign: 'seen', method: () => currentSetId() }],
        handler: (request) => ({ setId: request.pre.seen })
      }
    }),
    routeWithSetContext(OTHER_SET, {
      method: 'GET',
      path: `${OTHER_BASE}/route-handler`,
      handler: answerWithSetId
    })
  ])
  await server.initialize()
})

afterAll(async () => {
  await server.stop({ timeout: 0 })
})

describe('#routeWithSetContext', () => {
  it.each([
    ['options.handler', 'options-handler'],
    ['options.pre', 'options-pre'],
    ['route.handler', 'route-handler']
  ])(
    'Should run a route declared with %s inside its own set',
    async (_shape, slug) => {
      const response = await server.inject(`${OTHER_BASE}/${slug}`)

      expect(response.statusCode).toBe(200)
      expect(response.result.setId).toBe(OTHER_SET)
    }
  )

  it('Should leave a route that declares no top-level handler without one', () => {
    // Hapi rejects a route carrying both `handler` and `options.handler`, so
    // writing an undefined handler back would turn a valid declaration into a
    // registration error rather than a wrapped route.
    const wrapped = routeWithSetContext(OTHER_SET, {
      method: 'GET',
      path: `${OTHER_BASE}/shape-only`,
      options: { handler: answerWithSetId }
    })

    expect('handler' in wrapped).toBe(false)
  })
})

describe('#hasSetContext', () => {
  it('Should report no set outside every context while several are mounted', () => {
    // The sole-set fallback is retired by the second mount above, so this is
    // the answer a server-wide surface gets: no set, rather than a throw.
    expect(hasSetContext()).toBe(false)
  })
})
