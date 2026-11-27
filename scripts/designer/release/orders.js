import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { existingSet } from './sets.js'

const JOURNEY = 'journeys/linear'

const importIfThere = async (file) =>
  existsSync(file) ? import(pathToFileURL(file).href) : null

const inTaskRow = (taskRows, page) =>
  taskRows.some((row) => row.pages.some((rowPage) => rowPage.id === page.id))

const journeySteps = (sections, taskRows) =>
  sections
    .flatMap((section) => section.pages)
    .filter((page) => !page.subPage && inTaskRow(taskRows, page))
    .map((page) => page.slug || page.id)

const REVIEW_ROW_ID = 'review'

/**
 * The task list's groups for a hub that declares no `GROUPS`.
 *
 * @param {object[]} sections - the set's `flow/flow.js` sections.
 * @param {object[]} taskRows - the set's `flow/task-rows.js` rows.
 * @returns {{ id: string, rows: string[] }[]} each section holding task rows,
 * with its row ids in page order, then `check-and-submit` holding `review`
 * when the set has a `review` section.
 */
export const sectionGroups = (sections, taskRows) => {
  const groups = sections
    .map((section) => {
      const indexIn = (row) =>
        section.pages.findIndex((page) => page.id === row.pages[0].id)
      return {
        id: section.id,
        rows: taskRows
          .filter((row) => indexIn(row) !== -1)
          .sort((rowA, rowB) => indexIn(rowA) - indexIn(rowB))
          .map((row) => row.id)
      }
    })
    .filter((group) => group.rows.length > 0)
  const hasReview = sections.some((section) => section.id === REVIEW_ROW_ID)
  return hasReview
    ? [...groups, { id: 'check-and-submit', rows: [REVIEW_ROW_ID] }]
    : groups
}

/**
 * The four orders a page's place shows up in (see
 * docs/designers/recipes/move-a-page.md), read from a set's own files:
 *
 * 1. the first pass: `RUN_STEPS` in `flow/run.js`; in a set with no
 *    `flow/run.js`, every task-list page in `flow/flow.js` order, which is
 *    where Save and continue goes in such a set
 * 2. Continue: the sections in `flow/flow.js`
 * 3. the task list: `GROUPS` in `features/hub/controller.js`, else each
 *    section that holds task rows, with the rows in `flow/task-rows.js`
 * 4. check your answers: built in code in
 *    `features/check-answers/view-model/index.js`, so it is named, not read
 *
 * Pages are shown by their address (`consignors/select`).
 *
 * @returns {Promise<{ savesThrough: 'run'|'journey', firstPass: string[], sections: object[], groups: object[] }>}
 * `savesThrough` is `run` for a set with `flow/run.js`, else `journey`.
 */
export const readOrders = async (setId, { repoRoot }) => {
  const set = existingSet(repoRoot, setId)
  const journey = path.join(set.setDir, JOURNEY)
  const flow = await importIfThere(path.join(journey, 'flow/flow.js'))
  const sections = flow?.sections ?? []
  const slugOf = new Map(
    sections.flatMap((section) =>
      section.pages.map((page) => [page.id, page.slug || page.id])
    )
  )
  const run = await importIfThere(path.join(journey, 'flow/run.js'))
  const rows = await importIfThere(path.join(journey, 'flow/task-rows.js'))
  const hub = await importIfThere(
    path.join(journey, 'features/hub/controller.js')
  )
  const taskRows = rows?.taskRows ?? []
  const rowPages = new Map(
    taskRows.map((row) => [
      row.id,
      row.pages.map((page) => page.slug || page.id)
    ])
  )
  return {
    savesThrough: run ? 'run' : 'journey',
    firstPass: run
      ? run.RUN_STEPS.map((step) => slugOf.get(step.id) ?? step.id)
      : journeySteps(sections, taskRows),
    sections: sections.map((section) => ({
      id: section.id,
      pages: section.pages.map((page) => page.slug || page.id)
    })),
    groups: (hub?.GROUPS ?? sectionGroups(sections, taskRows)).map((group) => ({
      id: group.id,
      rows: group.rows.map((rowId) => ({
        id: rowId,
        pages: rowPages.get(rowId) ?? []
      }))
    }))
  }
}

const mark = (wanted) => (slug) => (wanted.includes(slug) ? `*${slug}*` : slug)

const positions = (list, wanted) =>
  wanted
    .filter((slug) => list.includes(slug))
    .map((slug) => `${slug} is number ${list.indexOf(slug) + 1}`)

/**
 * The four orders as plain lines. Pages named in `wanted` are marked
 * `*like-this*`, and their places in the first pass are spelt out, so "is it
 * already where the designer wants it?" can be answered before any edit.
 */
export const formatOrders = (setId, orders, wanted = []) => {
  const marked = mark(wanted)
  const lines = [
    `The four orders in ${setId}${wanted.length ? ` (the pages you named are marked *like this*)` : ''}:`,
    '',
    orders.savesThrough === 'run'
      ? '1. First pass, a new notification (flow/run.js RUN_STEPS):'
      : '1. First pass, a new notification (every task list page, in flow/flow.js order):',
    `   ${orders.firstPass.map(marked).join(' > ')}`,
    ...(wanted.length
      ? [`   ${positions(orders.firstPass, wanted).join('; ')}.`]
      : []),
    '',
    orders.savesThrough === 'run'
      ? '2. Continue, after the first pass (flow/flow.js sections; Continue stays inside a section):'
      : '2. Continue, after the first pass (flow/flow.js sections; Continue goes on into the next section):',
    ...orders.sections.map(
      (section) => `   ${section.id}: ${section.pages.map(marked).join(' > ')}`
    ),
    '',
    '3. The task list (features/hub/controller.js GROUPS, else the sections; rows from flow/task-rows.js):',
    ...orders.groups.map(
      (group, index) =>
        `   ${index + 1}. ${group.id}: ${group.rows
          .map((row) =>
            row.pages.length
              ? `${row.id} (${row.pages.map(marked).join(', ')})`
              : row.id
          )
          .join(', ')}`
    ),
    '',
    '4. Check your answers: its cards are built in code, in',
    '   journeys/linear/features/check-answers/view-model/index.js. Read the order of the',
    '   card and row calls there, or picture it: npm run designer:show -- --set',
    `   ${setId} --pages notification-view`
  ]
  return lines.join('\n')
}
