import { afterEach, describe, expect, it } from 'vitest'
import { config } from '../../config/config.js'
import { createServer } from '../server.js'
import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { clearSeeded, seededIdsFor } from './registry.js'

const SET_ID = 'high-risk-plants'

/** Starts a real server on a free port, because seeding runs `onPostStart`. */
const startServer = async () => {
  config.set('port', 0)
  const server = await createServer()
  await server.start()
  return server
}

describe('seeding at boot', () => {
  let server

  afterEach(async () => {
    await server?.stop({ timeout: 0 })
    delete process.env.PROTOTYPE_SEED
    clearSeeded(SET_ID)
  })

  it('Should seed the shared example notifications once the server starts', async () => {
    server = await startServer()

    const journeyIds = seededIdsFor(SET_ID)
    const listed = await withSetContext(SET_ID, () =>
      records.list({ journeyIds })
    )

    expect(journeyIds).toHaveLength(4)
    expect(listed.rows).toHaveLength(journeyIds.length)
  })

  it('Should seed nothing when PROTOTYPE_SEED is false', async () => {
    process.env.PROTOTYPE_SEED = 'false'

    server = await startServer()

    expect(seededIdsFor(SET_ID)).toEqual([])
  })
})
