import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { leaves } from '../../shared/copy-leaves.js'
import { LEVELS } from '../levels.js'
import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const MACHINE_DRAFT_MARKER =
  '// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.'

describe('page maturity copy', () => {
  it('Should have the same leaf paths in Welsh as in English', () => {
    expect(leaves(cy).map((leaf) => leaf.path)).toEqual(
      leaves(en).map((leaf) => leaf.path)
    )
  })

  it('Should translate every Welsh leaf to something non-empty and different from English', () => {
    const englishByPath = new Map(
      leaves(en).map((leaf) => [leaf.path, leaf.value])
    )

    for (const { path, value } of leaves(cy)) {
      expect(value, path).toBeTruthy()
      expect(value, path).not.toBe(englishByPath.get(path))
    }
  })

  it('Should have one levels entry per level id', () => {
    expect(Object.keys(en.levels).sort()).toEqual(Object.keys(LEVELS).sort())
  })

  it('Should mark the Welsh as a machine draft on its first line', () => {
    const source = readFileSync(
      new URL('./copy.cy.js', import.meta.url),
      'utf-8'
    )

    expect(source.split('\n')[0]).toBe(MACHINE_DRAFT_MARKER)
  })
})
