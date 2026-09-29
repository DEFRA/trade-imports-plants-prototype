import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  DemoBuildProblem,
  buildDemoSite,
  changedSetIdsFrom,
  parseArgs
} from './cli.js'

const ROOT = '/prototype'

describe('changedSetIdsFrom', () => {
  it('Should map a changed set file, its gateway and its scenario file to the same set id', () => {
    const text = [
      'src/server/app/sets/plants-working/set.js',
      'src/server/app/routes-plants-working.js',
      'src/server/prototype-seed/scenarios/plants-working.js',
      'README.md'
    ].join('\n')

    expect(changedSetIdsFrom(text, { root: ROOT })).toEqual(['plants-working'])
  })

  it('Should name every set touched, once each, ignoring blank lines', () => {
    const text = [
      'src/server/app/sets/high-risk-plants/set.js',
      '',
      'src/server/app/sets/plants-working/journeys/linear/flow/origin.js',
      ''
    ].join('\n')

    expect(changedSetIdsFrom(text, { root: ROOT })).toEqual([
      'high-risk-plants',
      'plants-working'
    ])
  })

  it('Should give nothing for a file that names no set', () => {
    expect(changedSetIdsFrom('package.json', { root: ROOT })).toEqual([])
  })

  it('Should give nothing for an empty or missing file', () => {
    expect(changedSetIdsFrom(undefined, { root: ROOT })).toEqual([])
    expect(changedSetIdsFrom('', { root: ROOT })).toEqual([])
  })
})

describe('buildDemoSite', () => {
  let folder

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  it('Should still build the page when the changed-files listing was never written', async () => {
    folder = mkdtempSync(path.join(tmpdir(), 'demo-cli-'))
    const reportFile = path.join(folder, 'report.json')
    writeFileSync(
      reportFile,
      JSON.stringify({ config: { projects: [] }, suites: [] })
    )
    const siteDir = path.join(folder, 'site')

    const result = await buildDemoSite({
      reportFile,
      resultsDir: path.join(folder, 'test-results'),
      siteDir,
      changedFilesFile: path.join(folder, 'never-written.txt'),
      env: { SHA: 'abcdef1234' }
    })

    expect(result).toEqual({ wrote: ['index.html', 'demo.css'], setCount: 0 })
    expect(readFileSync(path.join(siteDir, 'index.html'), 'utf8')).toContain(
      'The walkthroughs did not run this time'
    )
  })
})

describe('parseArgs', () => {
  it('Should read every option', () => {
    expect(
      parseArgs([
        '--report',
        'a.json',
        '--results',
        'results',
        '--site',
        'site',
        '--links',
        'b.json',
        '--changed-files',
        'changed.txt'
      ])
    ).toEqual({
      reportFile: 'a.json',
      resultsDir: 'results',
      siteDir: 'site',
      linksFile: 'b.json',
      changedFilesFile: 'changed.txt'
    })
  })

  it('Should default links to the report, and changed-files to none', () => {
    expect(
      parseArgs([
        '--report',
        'a.json',
        '--results',
        'results',
        '--site',
        'site'
      ])
    ).toMatchObject({ linksFile: 'a.json', changedFilesFile: null })
  })

  it('Should name every missing required option at once', () => {
    expect(() => parseArgs([])).toThrow(DemoBuildProblem)
    try {
      parseArgs([])
    } catch (error) {
      expect(error.message).toContain('--report')
      expect(error.message).toContain('--results')
      expect(error.message).toContain('--site')
    }
  })
})
