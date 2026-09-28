import net from 'node:net'

import { afterEach, describe, expect, it } from 'vitest'

import {
  DESIGNER_PORT,
  FIRST_SHOW_PORT,
  findFreePort,
  isPortFree,
  showServerEnv
} from './server.js'

const holders = []

const hold = (port) =>
  new Promise((resolve) => {
    const server = net.createServer()
    server.listen(port, () => {
      holders.push(server)
      resolve(server)
    })
  })

afterEach(async () => {
  for (const server of holders.splice(0)) {
    await new Promise((resolve) => server.close(resolve))
  }
})

describe('showServerEnv', () => {
  it('Should run with stub data, the example notifications, nothing saved to disk and its own port', () => {
    expect(
      showServerEnv(3204, {
        PATH: '/bin',
        PORT: '3103',
        PROTOTYPE_SEED: 'false'
      })
    ).toEqual({
      PATH: '/bin',
      NODE_ENV: 'development',
      STUB_MODE: 'true',
      PROTOTYPE_SEED: 'true',
      PROTOTYPE_PERSIST: 'false',
      PORT: '3204',
      HOST: '127.0.0.1',
      NUNJUCKS_WATCH: 'false',
      AWS_EMF_ENVIRONMENT: 'Local'
    })
  })

  it('Should leave the examples out when asked for an empty dashboard', () => {
    expect(
      showServerEnv(3204, { PATH: '/bin' }, { examples: false })
    ).toMatchObject({ PROTOTYPE_SEED: 'false', PROTOTYPE_PERSIST: 'false' })
  })
})

describe('findFreePort', () => {
  it('Should start from 3203', () => {
    expect(FIRST_SHOW_PORT).toBe(3203)
  })

  it('Should never answer the designer port', async () => {
    const port = await findFreePort(DESIGNER_PORT)
    expect(port).not.toBe(DESIGNER_PORT)
    expect(port).toBeGreaterThan(DESIGNER_PORT)
  })

  it('Should skip a port something else is using, and ports it is told to avoid', async () => {
    const taken = await findFreePort(3250)
    await hold(taken)
    expect(await isPortFree(taken)).toBe(false)
    const next = await findFreePort(taken, [taken + 1])
    expect(next).not.toBe(taken)
    expect(next).not.toBe(taken + 1)
    expect(next).toBeGreaterThan(taken)
  })
})
