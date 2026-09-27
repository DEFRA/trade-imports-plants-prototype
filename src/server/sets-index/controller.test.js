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
import { load } from 'cheerio'
import { registerSetMount } from '../app/shared/set-context.js'
import { descriptionFor } from '../prototype-sets/descriptions.js'
import { KINDS } from '../prototype-sets/releases.js'
import { setsIndex } from './index.js'
import { setsIndexController } from './controller.js'

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

  it('Should tag the real journey as updating weekly', async () => {
    const response = await server.inject('/')
    const $ = load(response.result)

    expect(
      $(`[data-set-id="${DESCRIBED_SET}"] .govuk-tag`).first().text().trim()
    ).toBe('Real journey, updates weekly')
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

describe('the sets chooser with design releases', () => {
  const REAL = DESCRIBED_SET
  const PLACEHOLDER = 'sample-journey'
  const FROZEN = 'plants-dr1'
  const WORKING_OLD = 'plants-working-old'
  const WORKING_NEW = 'plants-working-new'
  const RESEARCH = 'plants-research-oct'
  const RELEASES = {
    [REAL]: { kind: 'real' },
    [PLACEHOLDER]: { kind: 'placeholder' },
    [FROZEN]: {
      kind: 'frozen',
      from: REAL,
      createdAt: '2026-06-01T09:00:00.000Z'
    },
    [WORKING_OLD]: {
      kind: 'working',
      from: REAL,
      createdAt: '2026-07-01T09:00:00.000Z'
    },
    [WORKING_NEW]: {
      kind: 'working',
      from: FROZEN,
      createdAt: '2026-09-27T09:00:00.000Z'
    },
    [RESEARCH]: {
      kind: 'research',
      from: REAL,
      createdAt: '2026-09-01T09:00:00.000Z',
      researchMode: true
    }
  }

  const releaseInfo = (setId) => {
    const {
      kind,
      from = null,
      createdAt = null,
      researchMode = false
    } = RELEASES[setId]
    return { setId, ...KINDS[kind], from, createdAt, researchMode }
  }

  const examples = (setId) =>
    setId === WORKING_NEW
      ? [{ text: 'Submitted', href: `/examples/${WORKING_NEW}/submitted` }]
      : []

  let releasesServer
  let $

  beforeAll(async () => {
    releasesServer = Hapi.server({
      routes: {
        files: { relativeTo: path.resolve(config.get('root'), '.public') }
      }
    })
    await releasesServer.register([nunjucksConfig, anonymousAuth])
    releasesServer.route({
      method: 'GET',
      path: '/',
      ...setsIndexController(
        () => Object.keys(RELEASES).map((setId) => [setId, `/${setId}`]),
        { releaseInfo, examples }
      )
    })
    await releasesServer.initialize()
    $ = load((await releasesServer.inject('/')).result)
  })

  afterAll(async () => {
    await releasesServer.stop({ timeout: 0 })
  })

  const row = (setId) => $(`[data-set-id="${setId}"]`)
  const tagsOf = (setId) =>
    row(setId)
      .find('.govuk-tag')
      .map((_, tag) => $(tag).text().trim())
      .get()

  it('Should list the real journey, then working, research, frozen and placeholder sets, newest first', () => {
    const order = $('[data-set-id]')
      .map((_, item) => $(item).attr('data-set-id'))
      .get()

    expect(order).toEqual([
      REAL,
      WORKING_NEW,
      WORKING_OLD,
      RESEARCH,
      FROZEN,
      PLACEHOLDER
    ])
  })

  it.each([
    [REAL, ['Real journey, updates weekly']],
    [WORKING_NEW, ['Working release']],
    [RESEARCH, ['Research', 'Research mode on']],
    [FROZEN, ['Frozen']],
    [PLACEHOLDER, ['Placeholder']]
  ])('Should tag %s %o', (setId, tags) => {
    expect(tagsOf(setId)).toEqual(tags)
  })

  it('Should say what a release was made from and when', () => {
    expect(row(WORKING_NEW).text()).toContain(
      'Made from Plants dr1 on 27 September 2026'
    )
    expect(row(REAL).text()).not.toContain('Made from')
  })

  it('Should link to a release’s examples by their stable links', () => {
    const links = row(WORKING_NEW)
      .find('.govuk-list--bullet a')
      .map((_, link) => $(link).attr('href'))
      .get()

    expect(links).toEqual([`/examples/${WORKING_NEW}/submitted`])
    expect(row(FROZEN).find('.govuk-list--bullet')).toHaveLength(0)
  })
})
