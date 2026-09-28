import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createServer } from '../server.js'
import { mountedSetIds } from '../app/shared/set-context.js'
import { loadSetForRender, renderPages, renderSet } from './release-render.js'
import { REAL_JOURNEY_SET, setIdsOnDisk, setsToCheck } from './sets-on-disk.js'

/**
 * Every set on disk boots inside `npm test`: it is mounted, and every page its
 * flow.js lists opens after one notification is started and walked through
 * the set's own routes. A page that is half-registered (listed in flow.js
 * with no route, or a route whose template is broken) fails here, before it
 * reaches a designer's browser or the weekly update.
 */
let server

beforeAll(async () => {
  // The check starts its own notifications. Example data would only slow the
  // first request down.
  vi.stubEnv('PROTOTYPE_SEED', 'false')
  server = await createServer()
  await server.initialize()
})

afterAll(async () => {
  await server?.stop({ timeout: 0 })
  vi.unstubAllEnvs()
})

describe('release render — every set boots and opens its pages', () => {
  it('Should mount every set that has a folder', () => {
    const unmounted = setIdsOnDisk().filter(
      (setId) => !mountedSetIds().includes(setId)
    )

    expect(
      unmounted,
      `release-render: these sets have a folder but are not mounted in src/server/prototype-sets/index.js: ${unmounted.join(', ')}`
    ).toEqual([])
  })

  it.each(setsToCheck(setIdsOnDisk()))(
    'Should open every page of %s',
    async (setId) => {
      const report = await renderSet(server, setId)

      expect(
        report.problems,
        `release-render: ${setId} has pages that do not open:\n${report.problems.join('\n')}`
      ).toEqual([])
      expect(report.pagesChecked).toBeGreaterThan(0)
    }
  )
})

describe('release render — it notices a half-registered page', () => {
  it('Should fail a page that flow.js lists but no route answers', async () => {
    // The real journey with one page added to its flow and nothing else: the
    // shape of a page whose flow.js line was written but whose controller was
    // never registered.
    const realJourney = await loadSetForRender(REAL_JOURNEY_SET)
    const halfRegistered = {
      ...realJourney,
      sections: [
        ...realJourney.sections,
        { id: 'extra', pages: [{ id: 'transporter', slug: 'transporter' }] }
      ]
    }

    const report = await renderPages(server, halfRegistered)

    expect(report.problems).toEqual([
      "The 'transporter' page showed the error page (404): no route answers it. A page listed in flow.js needs its controller routes added to the features index."
    ])
  })
})
