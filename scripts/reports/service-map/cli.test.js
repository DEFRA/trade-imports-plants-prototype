import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { ServiceMapProblem } from './install-set.js'
import { buildServiceMaps, githubWarnings, mapPath, parseArgs } from './cli.js'

describe('parseArgs', () => {
  it('Should need --site and read the rest as optional', () => {
    expect(() => parseArgs([])).toThrow(ServiceMapProblem)
    expect(
      parseArgs([
        '--site',
        'site',
        '--report',
        'r.json',
        '--results',
        'res',
        '--sets',
        'a, b'
      ])
    ).toEqual({
      siteDir: 'site',
      reportFile: 'r.json',
      resultsDir: 'res',
      changedFilesFile: null,
      setIds: ['a', 'b']
    })
  })
})

describe('buildServiceMaps', () => {
  let siteDir

  afterEach(() => {
    rmSync(siteDir, { recursive: true, force: true })
  })

  it('Should build each set’s map with no walkthrough report, and a page for a set that cannot be drawn', async () => {
    siteDir = mkdtempSync(path.join(tmpdir(), 'service-map-site-'))
    const result = await buildServiceMaps({
      setIds: ['high-risk-plants', 'no-such-set'],
      reportFile: path.join(siteDir, 'missing.json'),
      siteDir,
      env: { SHA: 'abcdef1234' }
    })
    expect(result.built).toEqual(['high-risk-plants'])
    expect(result.failed).toEqual([
      { setId: 'no-such-set', message: 'There is no set called "no-such-set".' }
    ])
    const folder = path.join(siteDir, mapPath('high-risk-plants'))
    for (const file of ['index.html', 'service-map.json', 'screens.json']) {
      expect(existsSync(path.join(folder, file))).toBe(true)
    }
    expect(existsSync(path.join(siteDir, 'service-map/service-map.css'))).toBe(
      true
    )
    const index = readFileSync(
      path.join(siteDir, 'service-map/index.html'),
      'utf8'
    )
    expect(index).toContain('href="high-risk-plants/"')
    expect(index).toContain('Made from the code at abcdef1')
    const json = readFileSync(path.join(folder, 'service-map.json'), 'utf8')
    expect(json).not.toContain('abcdef1')
    expect(githubWarnings(result.failed)).toEqual([
      '::warning title=Service map::no-such-set: There is no set called "no-such-set".'
    ])
  })
})
