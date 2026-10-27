import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import webpack from 'webpack'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import baseConfig from '../../webpack.config.js'
import prototypeConfig from '../../webpack.prototype.config.js'
import { findReleaseAssets, releaseEntryName } from './releases.js'
import { withReleaseAssets } from './with-release-assets.js'

const repoRoot = path.join(import.meta.dirname, '../..')
const fixtureSets = path.join(import.meta.dirname, 'fixtures/sets')

describe('webpack.prototype.config.js', () => {
  it('Should add one entry for each release in src/server/app/sets that carries styles or scripts', () => {
    const releaseEntries = Object.keys(prototypeConfig.entry).filter((name) =>
      name.startsWith('release-')
    )

    expect(releaseEntries).toEqual(
      findReleaseAssets(path.join(repoRoot, 'src/server/app/sets')).map(
        ({ id }) => releaseEntryName(id)
      )
    )
  })
})

const compile = (config) =>
  new Promise((resolve, reject) => {
    webpack(config, (error, stats) => {
      if (error) {
        reject(error)
      } else if (stats.hasErrors()) {
        reject(new Error(stats.toString('errors-only')))
      } else {
        resolve(stats)
      }
    })
  })

describe('a build of the real webpack config with two fixture releases', () => {
  let outputPath
  let manifest
  let startedIn

  const builtFile = (key) =>
    readFileSync(path.join(outputPath, manifest[key]), 'utf8')

  beforeAll(async () => {
    startedIn = process.cwd()
    process.chdir(repoRoot)
    outputPath = mkdtempSync(path.join(tmpdir(), 'release-assets-'))
    const config = withReleaseAssets(baseConfig, findReleaseAssets(fixtureSets))
    await compile({ ...config, output: { ...config.output, path: outputPath } })
    manifest = JSON.parse(
      readFileSync(path.join(outputPath, 'assets-manifest.json'), 'utf8')
    )
  }, 120_000)

  afterAll(() => {
    process.chdir(startedIn)
    rmSync(outputPath, { recursive: true, force: true })
  })

  it('Should list each release bundle under its release name', () => {
    expect(manifest).toMatchObject({
      'release-alpha.css': 'stylesheets/release-alpha.css',
      'release-alpha.js': 'javascripts/release-alpha.js',
      'release-beta.css': 'stylesheets/release-beta.css'
    })
    expect(
      Object.keys(manifest).filter((key) => key.startsWith('release-'))
    ).toEqual(['release-alpha.css', 'release-alpha.js', 'release-beta.css'])
  })

  it('Should keep the application bundle under its own names', () => {
    expect(manifest).toMatchObject({
      'application.css': 'stylesheets/application.css',
      'application.js': 'javascripts/application.js',
      'stylesheets/application.scss': 'stylesheets/application.css'
    })
  })

  it('Should write each release its own stylesheet, holding only its own classes', () => {
    const alpha = builtFile('release-alpha.css')
    const beta = builtFile('release-beta.css')

    expect(alpha).toContain('.app-alpha-callout')
    expect(alpha).toContain('.app-alpha-summary-card')
    expect(alpha).not.toContain('.app-beta-highlight')
    expect(beta).toContain('.app-beta-highlight')
    expect(beta).not.toContain('.app-alpha-callout')
  })

  it('Should style a release with GOV.UK settings and mixins without repeating GOV.UK styles', () => {
    const alpha = builtFile('release-alpha.css')

    expect(alpha).toMatch(/\.app-alpha-callout\s*{[^}]*padding:\s*15px/)
    expect(alpha).toMatch(/\.app-alpha-summary-card\s*{[^}]*font-family:/)
    expect(alpha).not.toContain('.govuk-button')
  })

  it('Should keep release classes out of the application stylesheet', () => {
    expect(builtFile('application.css')).not.toContain('app-alpha-')
  })
})
