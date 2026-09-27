import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeFixtureTree } from './fixture-tree.js'
import { buildReport, renderReport, writeReport } from './report.js'

const REPORT_FILE = '.cache/designer/words/plants-working/index.html'
const STYLESHEET =
  '../../../../node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css'
const TRANSLATED_CELL =
  '<td class="govuk-table__cell" lang="cy">Cadw a pharhau</td>'
const MARKED_CELL =
  '<strong class="govuk-tag govuk-tag--orange">[Welsh needed]</strong> Consignment parties'
const SAME_CELL =
  '<strong class="govuk-tag govuk-tag--red">Same as English</strong> Consignor or exporter'

let tree

beforeAll(() => {
  tree = makeFixtureTree()
})

afterAll(() => {
  tree.remove()
})

const reportOn = (setId) => buildReport({ root: tree.root, setId })

describe('buildReport', () => {
  it('Should group the copy by feature in journey order, shared chrome last', async () => {
    const report = await reportOn('plants-working')
    expect(report.groups.map((group) => group.title)).toEqual([
      'consignor-select',
      'check-answers (pages: notification-view)',
      'hub',
      'section-captions (pages: consignor-select)',
      'Shared by every set (the header, footer, buttons, errors)'
    ])
  })

  it('Should count the Welsh that still needs a translator', async () => {
    const report = await reportOn('plants-working')
    expect(report.counts).toEqual({
      total: 8,
      marked: 1,
      sameAsEnglish: 1,
      missing: 0
    })
  })

  it('Should refuse a set that does not exist', async () => {
    await expect(reportOn('no-such-set')).rejects.toThrow(
      "There is no set called 'no-such-set'"
    )
  })
})

describe('renderReport', () => {
  it('Should show English and Welsh side by side and highlight Welsh needed', async () => {
    const html = renderReport(await reportOn('plants-working'), 'govuk.css')
    expect(html).toContain('<link rel="stylesheet" href="govuk.css">')
    expect(html).toContain(MARKED_CELL)
    expect(html).toContain(SAME_CELL)
    expect(html).toContain(TRANSLATED_CELL)
    expect(html).toContain('8 strings. 2 need Welsh')
  })

  it('Should escape the words so they cannot break the page', () => {
    const row = {
      keyPath: 'k',
      file: 'f',
      line: 1,
      en: '<script>',
      cy: 'Cy & co',
      welsh: 'translated'
    }
    const report = {
      setId: 'x',
      counts: { total: 1, marked: 0, sameAsEnglish: 0, missing: 0 },
      groups: [{ title: 'a <b>', rows: [row] }]
    }
    const html = renderReport(report, 'govuk.css')
    expect(html).toContain('a &lt;b&gt;')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Cy &amp; co')
  })
})

describe('writeReport', () => {
  it('Should write the page under .cache/designer/words/<set>/', async () => {
    const root = tree.root
    const { file } = await writeReport({ root, setId: 'plants-working' })
    expect(file).toBe(path.join(root, REPORT_FILE))
    expect(existsSync(file)).toBe(true)
    expect(readFileSync(file, 'utf8')).toContain(STYLESHEET)
  })
})
