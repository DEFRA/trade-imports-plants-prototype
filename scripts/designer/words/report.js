import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  SECTION_CAPTIONS,
  loadLeaves,
  setCopyFiles,
  sharedCopyFile
} from './copy-modules.js'
import { describeLeaf, pagesOfLeaf } from './find.js'
import { WELSH_NEEDED } from './leaf-text.js'
import { pageMap } from './pages.js'
import { listSets, setInfo } from './repo.js'

const NOT_IN_FLOW = Number.MAX_SAFE_INTEGER

const escapeHtml = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const featureOrder = (feature, leaves, map) => {
  if (feature === SECTION_CAPTIONS) {
    return NOT_IN_FLOW - 1
  }
  const positions = leaves
    .flatMap((leaf) => pagesOfLeaf(leaf, map))
    .map((pageId) => map.flowOrder.indexOf(pageId))
    .filter((position) => position !== -1)
  return positions.length > 0 ? Math.min(...positions) : NOT_IN_FLOW - 2
}

const groupTitle = (feature, pages) =>
  pages.length > 0 && pages.join(', ') !== feature
    ? `${feature} (pages: ${pages.join(', ')})`
    : feature

const countOf = (rows, status) =>
  rows.filter((row) => row.welsh === status).length

/**
 * The English and Welsh of every copy string in a set, grouped by feature in
 * the order the journey reaches them, with the shared chrome last.
 *
 * @param {{ root: string, setId: string }} options
 */
export const buildReport = async ({ root, setId }) => {
  if (!listSets(root).includes(setId)) {
    throw new Error(
      `There is no set called '${setId}'. The sets are: ${listSets(root).join(', ')}.`
    )
  }
  const map = await pageMap(root, setId)
  const setLeaves = (
    await Promise.all(setCopyFiles(root, setId).map((f) => loadLeaves(root, f)))
  ).flat()
  const sharedLeaves = (
    await Promise.all(sharedCopyFile(root).map((f) => loadLeaves(root, f)))
  ).flat()
  const features = [...new Set(setLeaves.map((leaf) => leaf.feature))]
  const setGroups = features
    .map((feature) => {
      const leaves = setLeaves.filter((leaf) => leaf.feature === feature)
      const pages = [...new Set(leaves.flatMap((l) => pagesOfLeaf(l, map)))]
      return {
        title: groupTitle(feature, pages),
        order: featureOrder(feature, leaves, map),
        rows: leaves.map((leaf) => describeLeaf(leaf, map))
      }
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
  const groups = [
    ...setGroups,
    ...(sharedLeaves.length > 0
      ? [
          {
            title: 'Shared by every set (the header, footer, buttons, errors)',
            order: NOT_IN_FLOW,
            rows: sharedLeaves.map((leaf) => describeLeaf(leaf, null))
          }
        ]
      : [])
  ]
  const rows = groups.flatMap((group) => group.rows)
  return {
    setId,
    info: setInfo(root, setId),
    groups,
    counts: {
      total: rows.length,
      marked: countOf(rows, 'marked'),
      sameAsEnglish: countOf(rows, 'same-as-english'),
      missing: countOf(rows, 'missing')
    }
  }
}

const welshCell = (row) => {
  const text = escapeHtml(row.cy ?? '')
  if (row.welsh === 'marked') {
    return `<td class="govuk-table__cell app-welsh-needed"><strong class="govuk-tag govuk-tag--orange">${escapeHtml(WELSH_NEEDED)}</strong> ${text.replace(escapeHtml(WELSH_NEEDED), '').trim()}</td>`
  }
  if (row.welsh === 'same-as-english') {
    return `<td class="govuk-table__cell app-welsh-needed"><strong class="govuk-tag govuk-tag--red">Same as English</strong> ${text}</td>`
  }
  if (row.welsh === 'missing') {
    return '<td class="govuk-table__cell app-welsh-needed"><strong class="govuk-tag govuk-tag--red">No Welsh</strong></td>'
  }
  return `<td class="govuk-table__cell" lang="cy">${text}</td>`
}

const rowHtml = (row) =>
  [
    '<tr class="govuk-table__row">',
    `<td class="govuk-table__cell"><code>${escapeHtml(row.keyPath)}</code><br><span class="govuk-body-s">${escapeHtml(row.file)}:${row.line}</span></td>`,
    `<td class="govuk-table__cell" lang="en">${escapeHtml(row.en)}</td>`,
    welshCell(row),
    '</tr>'
  ].join('')

const groupHtml = (group) =>
  [
    `<h2 class="govuk-heading-m">${escapeHtml(group.title)}</h2>`,
    '<table class="govuk-table"><thead class="govuk-table__head"><tr class="govuk-table__row">',
    '<th scope="col" class="govuk-table__header app-key">Where</th>',
    '<th scope="col" class="govuk-table__header">English</th>',
    '<th scope="col" class="govuk-table__header">Welsh</th>',
    '</tr></thead><tbody class="govuk-table__body">',
    ...group.rows.map(rowHtml),
    '</tbody></table>'
  ].join('\n')

/**
 * The report as a static HTML page styled with GOV.UK Frontend classes. The
 * stylesheet is linked from `node_modules`, so the page is readable without
 * it too.
 *
 * @param {object} report - from `buildReport`.
 * @param {string} stylesheetHref - where the page finds govuk-frontend's CSS.
 * @returns {string} the HTML.
 */
export const renderReport = (report, stylesheetHref) => {
  const { setId, counts } = report
  const needed = counts.marked + counts.sameAsEnglish + counts.missing
  return [
    '<!doctype html>',
    '<html lang="en" class="govuk-template">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>English and Welsh: ${escapeHtml(setId)}</title>`,
    `<link rel="stylesheet" href="${escapeHtml(stylesheetHref)}">`,
    '<style>body{font-family:arial,sans-serif}.app-welsh-needed{background:#fff7bf}.app-key{width:30%}</style>',
    '</head>',
    '<body class="govuk-template__body"><div class="govuk-width-container"><main class="govuk-main-wrapper">',
    `<h1 class="govuk-heading-xl">English and Welsh: ${escapeHtml(setId)}</h1>`,
    `<p class="govuk-body">${counts.total} strings. ${needed} need Welsh: ${counts.marked} marked ${escapeHtml(WELSH_NEEDED)}, ${counts.sameAsEnglish} the same as the English, ${counts.missing} with no Welsh at all.</p>`,
    '<p class="govuk-body">The prototype always shows English, so this page is the only place to read the Welsh. Rows highlighted in yellow need a translator.</p>',
    ...report.groups.map(groupHtml),
    '</main></div></body>',
    '</html>',
    ''
  ].join('\n')
}

/** Where the report for a set is written. */
export const reportPath = (root, setId) =>
  path.join(root, '.cache', 'designer', 'words', setId, 'index.html')

/**
 * Build, render and write the report, returning its path.
 *
 * @param {{ root: string, setId: string }} options
 */
export const writeReport = async ({ root, setId }) => {
  const report = await buildReport({ root, setId })
  const file = reportPath(root, setId)
  const stylesheet = path
    .relative(
      path.dirname(file),
      path.join(
        root,
        'node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css'
      )
    )
    .split(path.sep)
    .join('/')
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, renderReport(report, stylesheet))
  return { file, report }
}
