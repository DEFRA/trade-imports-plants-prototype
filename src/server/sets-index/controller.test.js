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
import { descriptionFor } from '../prototype-sets/descriptions.js'
import { setsIndex } from './index.js'

const MISMATCHED_SET = 'foo'
const MISMATCHED_PREFIX = '/bar'
const DESCRIBED_SET = 'high-risk-plants'
const HAS_BEEN_RESET = 'has been reset'
const RESET_LABEL = 'Reset this prototype’s data'

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
  registerSetMount(DESCRIBED_SET, `/${DESCRIBED_SET}`)
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

  it('Should describe a set that has a description, and still list one that does not', async () => {
    const response = await server.inject('/')

    expect(response.result).toContain(descriptionFor(DESCRIBED_SET))
    expect(response.result).toContain(`href="${MISMATCHED_PREFIX}"`)
  })

  it('Should offer no way to switch organisation', async () => {
    const response = await server.inject('/')

    expect(response.result).not.toContain('organisationId')
    expect(response.result).not.toContain('/auth/stub-sign-in')
  })

  describe('signed out', () => {
    it('Should offer no reset action, only a hint to sign in', async () => {
      const response = await server.inject('/')

      expect(response.result).not.toContain(`action="/reset/${DESCRIBED_SET}"`)
      expect(response.result).toContain(
        'Sign in to reset this prototype’s data'
      )
    })

    it('Should show no reset banner even naming a just-reset set', async () => {
      const response = await server.inject(`/?reset=${DESCRIBED_SET}`)

      expect(response.result).not.toContain(HAS_BEEN_RESET)
    })
  })

  describe('signed in', () => {
    const signedIn = {
      auth: {
        strategy: 'session',
        credentials: { organisationId: 'any-organisation' }
      }
    }

    it('Should offer a reset action per mounted set', async () => {
      const response = await server.inject({ url: '/', ...signedIn })

      expect(response.result).toContain(`action="/reset/${DESCRIBED_SET}"`)
      expect(response.result).toContain(`action="/reset/${MISMATCHED_SET}"`)
      expect(response.result).toContain(RESET_LABEL)
    })

    it('Should not name the signed-in organisation', async () => {
      const response = await server.inject({ url: '/', ...signedIn })

      expect(response.result).not.toContain('any-organisation')
    })

    it('Should show the reset banner after a redirect, naming the set', async () => {
      const response = await server.inject({
        url: `/?reset=${DESCRIBED_SET}`,
        ...signedIn
      })

      expect(response.result).toContain(
        'The data in High risk plants has been reset.'
      )
    })

    it('Should show no reset banner for a set that was not just reset', async () => {
      const response = await server.inject({
        url: '/?reset=not-a-mounted-set',
        ...signedIn
      })

      expect(response.result).not.toContain(HAS_BEEN_RESET)
    })
  })
})
