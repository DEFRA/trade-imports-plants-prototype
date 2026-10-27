import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { findReleaseAssets, releaseEntryName } from './releases.js'

const fixtureSets = path.join(import.meta.dirname, 'fixtures/sets')

describe('findReleaseAssets', () => {
  it('Should find each release with styles or scripts, and leave out a release with neither', () => {
    expect(findReleaseAssets(fixtureSets)).toEqual([
      {
        id: 'alpha',
        styles: path.join(fixtureSets, 'alpha/assets/styles.scss'),
        scripts: path.join(fixtureSets, 'alpha/assets/scripts.js')
      },
      {
        id: 'beta',
        styles: path.join(fixtureSets, 'beta/assets/styles.scss')
      }
    ])
  })
})

describe('releaseEntryName', () => {
  it('Should name the bundle after the release', () => {
    expect(releaseEntryName('plants-r3')).toBe('release-plants-r3')
  })
})
