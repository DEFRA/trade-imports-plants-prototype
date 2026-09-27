import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { descriptionFor } from './descriptions.js'
import { SETS_DIR } from './releases.js'

/** Every set folder with a `set.js` — every set the prototype mounts. */
const setIds = readdirSync(SETS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((setId) => existsSync(path.join(SETS_DIR, setId, 'set.js')))

describe('descriptionFor', () => {
  it('Should find the sets', () => {
    expect(setIds).toEqual(
      expect.arrayContaining(['high-risk-plants', 'sample-journey'])
    )
  })

  it.each(setIds)(
    'Should describe %s on the chooser (npm run new:set -- <id> --describe "…" writes it)',
    (setId) => {
      expect(descriptionFor(setId)).toEqual(expect.any(String))
      expect(descriptionFor(setId).trim()).not.toBe('')
    }
  )

  it('Should answer undefined for a set nothing describes', () => {
    expect(descriptionFor('not-a-known-set')).toBeUndefined()
  })
})
