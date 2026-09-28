import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  dataFile,
  persistenceEnabled,
  readJson,
  removeFile,
  writeJson
} from './persist.js'

const scratch = () => mkdtempSync(path.join(tmpdir(), 'designer-persist-'))

describe('#persistenceEnabled', () => {
  it('Should save data only in development', () => {
    expect(persistenceEnabled({ NODE_ENV: 'development' })).toBe(true)
    expect(persistenceEnabled({ NODE_ENV: 'test' })).toBe(false)
    expect(persistenceEnabled({ NODE_ENV: 'production' })).toBe(false)
  })

  it('Should stay off for the clean-room runs that switch examples off', () => {
    expect(
      persistenceEnabled({ NODE_ENV: 'development', PROTOTYPE_SEED: 'false' })
    ).toBe(false)
    expect(
      persistenceEnabled({
        NODE_ENV: 'development',
        PROTOTYPE_PERSIST: 'false'
      })
    ).toBe(false)
  })
})

describe('#dataFile', () => {
  it('Should name one file per set, and one per fake service in a set', () => {
    expect(dataFile('/data', 'plants-dr2')).toBe(
      path.join('/data', 'plants-dr2.json')
    )
    expect(dataFile('/data', 'plants-dr2', 'templates')).toBe(
      path.join('/data', 'plants-dr2.templates.json')
    )
  })
})

describe('#readJson and #writeJson', () => {
  it('Should read back what it wrote, creating the folder', () => {
    const file = path.join(scratch(), 'nested', 'data.json')

    writeJson(file, { rows: [1, 2] })

    expect(readJson(file)).toEqual({ rows: [1, 2] })
  })

  it('Should answer null for a missing file, a removed file, or a file that no longer parses', () => {
    const dir = scratch()
    const broken = path.join(dir, 'broken.json')
    const written = path.join(dir, 'written.json')
    writeFileSync(broken, '{ not json')
    writeJson(written, {})
    removeFile(written)

    expect(readJson(path.join(dir, 'missing.json'))).toBeNull()
    expect(readJson(broken)).toBeNull()
    expect(readJson(written)).toBeNull()
  })
})
