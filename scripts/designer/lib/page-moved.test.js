import { describe, expect, it } from 'vitest'

import { valueUnlessPageMoved } from './page-moved.js'

const timeout = () =>
  Object.assign(new Error('Timeout 30000ms exceeded.'), {
    name: 'TimeoutError'
  })

describe('valueUnlessPageMoved', () => {
  it('Should give back the call’s own value when it finishes', async () => {
    expect(await valueUnlessPageMoved(Promise.resolve(['ref']), [])).toEqual([
      'ref'
    ])
  })

  it.each([
    { what: 'a timeout', err: timeout() },
    {
      what: 'a navigation',
      err: new Error(
        'Execution context was destroyed, most likely because of a navigation'
      )
    },
    {
      what: 'a closed page',
      err: new Error('Target page, context or browser has been closed')
    },
    { what: 'a detached frame', err: new Error('frame was detached') }
  ])('Should give back the fallback after $what', async ({ err }) => {
    expect(await valueUnlessPageMoved(Promise.reject(err), [])).toEqual([])
  })

  it('Should reject with any other error', async () => {
    await expect(
      valueUnlessPageMoved(Promise.reject(new TypeError('bad selector')), [])
    ).rejects.toThrow('bad selector')
  })
})
