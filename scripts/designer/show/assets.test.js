import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  BUILT_MARKER,
  missingBuiltFiles,
  needsClientBuild,
  newestModifiedTime
} from './assets.js'

const roots = []

const makeRoot = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'designer-assets-'))
  roots.push(root)
  mkdirSync(path.join(root, 'src/client/stylesheets'), { recursive: true })
  return root
}

const writeAt = (root, file, seconds, content = 'x') => {
  const full = path.join(root, file)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, content)
  utimesSync(full, seconds, seconds)
}

const MANIFEST = JSON.stringify({
  'stylesheets/application.scss': 'stylesheets/application.css'
})

const writeBuild = (root, seconds) => {
  writeAt(root, '.public/stylesheets/application.css', seconds)
  writeAt(root, BUILT_MARKER, seconds, MANIFEST)
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

describe('needsClientBuild', () => {
  it('Should build when nothing has been built yet', () => {
    expect(needsClientBuild(makeRoot())).toBe(true)
  })

  it('Should build when the client source changed after the last build', () => {
    const root = makeRoot()
    writeBuild(root, 1000)
    writeAt(root, 'src/client/stylesheets/application.scss', 2000)
    expect(needsClientBuild(root)).toBe(true)
  })

  it('Should not build when the last build is newer than the source', () => {
    const root = makeRoot()
    writeAt(root, 'src/client/stylesheets/application.scss', 1000)
    writeBuild(root, 2000)
    expect(needsClientBuild(root)).toBe(false)
  })

  it('Should build when the manifest names a file that is not there', () => {
    const root = makeRoot()
    writeAt(root, 'src/client/stylesheets/application.scss', 1000)
    writeAt(root, BUILT_MARKER, 2000, MANIFEST)
    expect(missingBuiltFiles(root)).toEqual(['stylesheets/application.css'])
    expect(needsClientBuild(root)).toBe(true)
  })
})

describe('newestModifiedTime', () => {
  it('Should look into sub-folders and answer 0 for a missing folder', () => {
    const root = makeRoot()
    writeAt(root, 'src/client/a.js', 1000)
    writeAt(root, 'src/client/deep/er/b.js', 3000)
    expect(newestModifiedTime(path.join(root, 'src/client'))).toBe(3_000_000)
    expect(newestModifiedTime(path.join(root, 'nowhere'))).toBe(0)
  })
})
