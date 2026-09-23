/**
 * The chooser at `/` links to the prefix each set actually mounted under.
 *
 * Rebuilding the link from the set id happens to agree with the mount today,
 * because `SET_BASE` is derived as `'/' + SET_ID`. A set mounted anywhere else
 * would then be listed at a URL nothing serves, so this registers exactly that
 * mismatch and reads the rendered link back.
 */
import path from 'node:path'
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { config } from '../../config/config.js'
import { nunjucksConfig } from '../../config/nunjucks/nunjucks.js'
import { registerSetMount } from '../app/shared/set-context.js'
import { setsIndex } from './index.js'

const MISMATCHED_SET = 'foo'
const MISMATCHED_PREFIX = '/bar'

/** The chooser is `auth` mode `try`, which needs a default strategy to fall
 * back to. This one never authenticates, which is the signed-out case. */
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

beforeAll(async () => {
  registerSetMount(MISMATCHED_SET, MISMATCHED_PREFIX)
  server = Hapi.server({
    routes: {
      files: { relativeTo: path.resolve(config.get('root'), '.public') }
    }
  })
  await server.register([nunjucksConfig, anonymousAuth, setsIndex])
  await server.initialize()
})

afterAll(async () => {
  await server.stop({ timeout: 0 })
})

describe('the sets chooser', () => {
  it('Should link a set at the prefix it mounted under, not at its id', async () => {
    const response = await server.inject('/')

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain(`href="${MISMATCHED_PREFIX}"`)
    expect(response.result).not.toContain(`href="/${MISMATCHED_SET}"`)
  })

  it('Should stay reachable signed out', async () => {
    const response = await server.inject('/')

    expect(response.statusCode).toBe(200)
  })
})
