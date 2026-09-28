import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { withSetContext } from '../../shared/set-context.js'
import { clearFakesFor } from '../../../prototype-support/registry.js'
import * as templates from './index.js'

const CONTRACT = JSON.parse(
  readFileSync(
    path.join(fileURLToPath(import.meta.url), '../contract.json'),
    'utf8'
  )
)

const RELEASE = 'plants-templates-test'
const OTHER_RELEASE = 'plants-templates-elsewhere'
const ORG = 'org-templates'
const ANSWERS = { 'obligation-uuid': 'Rosa canina' }
const WEEKLY_ROSES = 'Weekly roses'
const WEEKLY_ROSES_ID = 'weekly-roses'
const SAVED_AT = '2026-09-28T10:00:00.000Z'
const BACKEND = 'http://localhost:8091'

const inRelease = (fn) => withSetContext(RELEASE, fn)

describe('the stub, in stub mode', () => {
  beforeEach(() => {
    clearFakesFor(RELEASE)
    clearFakesFor(OTHER_RELEASE)
  })

  it('Should save a named copy of the answers and read it back whole', async () => {
    const saved = await inRelease(() =>
      templates.createTemplate(ORG, {
        name: ` ${WEEKLY_ROSES} `,
        fulfilment: ANSWERS,
        fromJourneyId: 'GBN-HRP-26-ABC123'
      })
    )

    expect(saved).toMatchObject({
      id: WEEKLY_ROSES_ID,
      name: WEEKLY_ROSES,
      fromJourneyId: 'GBN-HRP-26-ABC123',
      fulfilment: ANSWERS
    })
    expect(
      await inRelease(() => templates.getTemplate(ORG, WEEKLY_ROSES_ID))
    ).toEqual(saved)
  })

  it('Should refuse a template with no name, as a 400 problem', async () => {
    const refusal = await inRelease(() =>
      templates
        .createTemplate(ORG, { name: '  ', fulfilment: {} })
        .catch((error) => error)
    )

    expect(templates.isValidationFailure(refusal)).toBe(true)
    expect(templates.mapApiErrorsToFormErrors(refusal.body)).toEqual({
      name: 'Enter a name for the template'
    })
  })

  it('Should keep a template to the release whose questions it answers', async () => {
    await inRelease(() =>
      templates.createTemplate(ORG, { name: 'Only here', fulfilment: ANSWERS })
    )

    expect(
      await withSetContext(OTHER_RELEASE, () =>
        templates.getTemplate(ORG, 'only-here')
      )
    ).toBeUndefined()
  })

  it('Should list templates newest first, by name, without their answers', async () => {
    await inRelease(() =>
      templates.createTemplate(ORG, {
        name: 'Search apples',
        fulfilment: ANSWERS
      })
    )
    await inRelease(() =>
      templates.createTemplate(ORG, {
        name: 'Search apricots',
        fulfilment: ANSWERS
      })
    )

    const found = await inRelease(() =>
      templates.listTemplates(ORG, { search: 'search ap' })
    )

    expect(found.results.map((row) => row.name)).toEqual([
      'Search apricots',
      'Search apples'
    ])
    expect(found.results[0]).not.toHaveProperty('fulfilment')
  })

  it('Should delete one template, and Reset should empty the rest', async () => {
    await inRelease(() =>
      templates.createTemplate(ORG, { name: 'Delete me', fulfilment: ANSWERS })
    )
    await inRelease(() =>
      templates.createTemplate(ORG, { name: 'Reset me', fulfilment: ANSWERS })
    )

    expect(
      await inRelease(() => templates.deleteTemplate(ORG, 'delete-me'))
    ).toBe(true)
    expect(
      await inRelease(() => templates.deleteTemplate(ORG, 'delete-me'))
    ).toBe(false)

    clearFakesFor(RELEASE)

    expect((await inRelease(() => templates.listTemplates(ORG))).total).toBe(0)
  })
})

describe('the proposed client, against the plants backend', () => {
  const originalMode = process.env.STUB_MODE

  const realService = async (answer) => {
    vi.resetModules()
    process.env.STUB_MODE = 'false'
    const fetched = vi.fn(answer)
    vi.stubGlobal('fetch', fetched)
    return { service: await import('./index.js'), fetched }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })

  it('Should list with the organisation header, and map each template without its answers', async () => {
    const { service, fetched } = await realService(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: WEEKLY_ROSES_ID,
            name: WEEKLY_ROSES,
            createdAt: SAVED_AT
          }
        ],
        page: 1,
        pageSize: 5,
        totalItems: 1,
        totalPages: 1
      })
    }))

    const found = await service.listTemplates(ORG, { search: 'roses' })

    const [url, options] = fetched.mock.calls[0]
    const asked = new URL(url)
    expect(`${asked.origin}${asked.pathname}`).toBe(`${BACKEND}/templates`)
    expect(asked.searchParams.get('q')).toBe('roses')
    expect(options.headers['Trade-Imports-Organisation-Id']).toBe(ORG)
    expect(options.headers).toHaveProperty('x-cdp-request-id')
    expect(found.results).toEqual([
      {
        id: WEEKLY_ROSES_ID,
        name: WEEKLY_ROSES,
        fromJourneyId: null,
        createdAt: SAVED_AT
      }
    ])
  })

  it('Should POST a template and raise the 400 problem as a validation failure', async () => {
    const problem = { errors: { name: ['Enter a name for the template'] } }
    const { service, fetched } = await realService(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => problem
    }))

    const refusal = await service
      .createTemplate(ORG, { name: '', fulfilment: ANSWERS })
      .catch((error) => error)

    expect(fetched.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetched.mock.calls[0][1].body)).toEqual({
      name: '',
      fulfilment: ANSWERS
    })
    expect(service.isValidationFailure(refusal)).toBe(true)
  })

  it('Should read one template with its answers, and nothing for a 404', async () => {
    const { service } = await realService(async (url) =>
      url.endsWith('/weekly-roses')
        ? {
            ok: true,
            status: 200,
            json: async () => ({
              id: WEEKLY_ROSES_ID,
              name: WEEKLY_ROSES,
              createdAt: SAVED_AT,
              fulfilment: ANSWERS
            })
          }
        : { ok: false, status: 404, statusText: 'Not Found' }
    )

    expect(await service.getTemplate(ORG, WEEKLY_ROSES_ID)).toMatchObject({
      fulfilment: ANSWERS
    })
    expect(await service.getTemplate(ORG, 'nothing')).toBeUndefined()
    expect(await service.deleteTemplate(ORG, 'nothing')).toBe(false)
  })
})

describe('what it says it needs', () => {
  it('Should name the real service it stands in for, and its contract, in contract.json', () => {
    expect(CONTRACT.needsARealService).toMatch(/templates/)
    expect(CONTRACT).toMatchObject({
      service: 'templates',
      owner: 'plants-backend',
      baseUrlEnv: 'TRADE_IMPORTS_PLANTS_BACKEND_URL'
    })
  })

  it('Should export neither CONTRACT nor NEEDS_A_REAL_SERVICE from index.js', () => {
    expect(templates.CONTRACT).toBeUndefined()
    expect(templates.NEEDS_A_REAL_SERVICE).toBeUndefined()
  })
})
