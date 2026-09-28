import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { parseKitArgs, runKit } from './cli.js'
import {
  copyKitPage,
  currentFolder,
  findKitClones,
  includesOf,
  pagesIn,
  SETTING_FILE
} from './kit.js'

let home
let repoRoot
let clone

const write = (file, content) => {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
}

beforeEach(() => {
  home = mkdtempSync(path.join(os.tmpdir(), 'designer-kit-'))
  repoRoot = path.join(home, 'git', 'workspace', 'repos', 'plants-prototype')
  mkdirSync(repoRoot, { recursive: true })
  clone = path.join(home, 'git', 'defra-design', 'GB-notification-service')
  const views = path.join(clone, 'app', 'views')
  write(path.join(views, 'transporter.html'), '<h1>Old transporter</h1>')
  write(
    path.join(views, 'design-release-2.1', 'transporter.html'),
    '<h1>Transporter</h1>\n{% include "partials/design-release-2.1/actions.html" %}'
  )
  write(
    path.join(views, 'design-release-2.1', 'arrival.html'),
    '<h1>Arrival</h1>'
  )
  write(
    path.join(views, 'partials', 'design-release-2.1', 'actions.html'),
    '{% include "partials/status.html" %}<button>Continue</button>'
  )
  write(path.join(views, 'partials', 'status.html'), '<strong>Draft</strong>')
  mkdirSync(path.join(views, 'design-release-2'), { recursive: true })
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('the old prototype', () => {
  it('Should find a clone near the prototype, without searching the whole disk', () => {
    expect(findKitClones({ repoRoot, home })).toEqual([clone])
  })

  it('Should find nothing when there is no clone', () => {
    rmSync(clone, { recursive: true, force: true })
    expect(findKitClones({ repoRoot, home })).toEqual([])
  })

  it('Should take the last design-release folder as current when git has no history', () => {
    expect(currentFolder(clone)).toBe('design-release-2.1')
    expect(pagesIn(clone, 'design-release-2.1')).toEqual([
      'arrival',
      'transporter'
    ])
  })

  it('Should read the partials a page includes', () => {
    expect(
      includesOf('{% include "partials/a.html" %} {%- include \'b.html\' %}')
    ).toEqual(['partials/a.html', 'b.html'])
  })

  it('Should copy a page and every partial it pulls in, in one go', () => {
    const copied = copyKitPage({
      repoRoot,
      clone,
      page: 'transporter',
      folder: 'design-release-2.1',
      release: 'plants-working',
      slug: 'transporter-select'
    })

    const dir = '.cache/designer/port/plants-working/transporter-select'
    expect(copied.source).toBe(`${dir}/source.html`)
    expect(copied.partials).toEqual([
      `${dir}/included/partials/design-release-2.1/actions.html`,
      `${dir}/included/partials/status.html`
    ])
    expect(readFileSync(path.join(repoRoot, copied.source), 'utf8')).toContain(
      '<h1>Transporter</h1>'
    )
    expect(copied.missing).toEqual([])
  })

  it('Should name the pages when the page does not exist', () => {
    expect(() =>
      copyKitPage({
        repoRoot,
        clone,
        page: 'transport',
        folder: 'design-release-2.1',
        release: 'plants-working'
      })
    ).toThrow('Its pages are: arrival, transporter.')
  })
})

describe('designer:kit', () => {
  it('Should read a command, a page and flags', () => {
    expect(
      parseKitArgs([
        'copy',
        'transporter',
        '--release',
        'plants-working',
        '--saved'
      ])
    ).toEqual({
      command: 'copy',
      target: 'transporter',
      flags: { release: 'plants-working', saved: true }
    })
  })

  it('Should remember a clone it was given, and use it next time', () => {
    const given = runKit(['find', '--clone', clone], repoRoot)
    expect(given.code).toBe(0)
    expect(readFileSync(path.join(repoRoot, SETTING_FILE), 'utf8').trim()).toBe(
      clone
    )
    const pages = runKit(['pages'], repoRoot)
    expect(pages.lines).toContain('  transporter')
  })

  it('Should refuse a folder that is not the old prototype', () => {
    const result = runKit(['find', '--clone', repoRoot], repoRoot)
    expect(result.code).toBe(1)
    expect(result.lines[0]).toContain('has no app/views folder')
  })
})
