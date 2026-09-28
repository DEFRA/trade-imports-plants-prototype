import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { existingSet } from './sets.js'

const JOURNEY = 'journeys/linear'

const importIfThere = async (file) =>
  existsSync(file) ? import(pathToFileURL(file).href) : null

/**
 * The four orders a page's place shows up in (see
 * docs/designers/recipes/move-a-page.md), read from a set's own files:
 *
 * 1. the first pass: `RUN_STEPS` in `flow/run.js`
 * 2. Continue: the sections in `flow/flow.js`
 * 3. the task list: `GROUPS` in `features/hub/controller.js` and the rows in
 *    `flow/task-rows.js`
 * 4. check your answers: built in code in
 *    `features/check-answers/view-model/index.js`, so it is named, not read
 *
 * Pages are shown by their address (`consignors/select`).
 *
 * @returns {Promise<{ firstPass: string[], sections: object[], groups: object[] }>}
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
  const rowPages = new Map(
    (rows?.taskRows ?? []).map((row) => [
      row.id,
      row.pages.map((page) => page.slug || page.id)
    ])
  )
  return {
    firstPass: (run?.RUN_STEPS ?? []).map(
      (step) => slugOf.get(step.id) ?? step.id
    ),
    sections: sections.map((section) => ({
      id: section.id,
      pages: section.pages.map((page) => page.slug || page.id)
    })),
    groups: (hub?.GROUPS ?? []).map((group) => ({
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
    '1. First pass, a new notification (flow/run.js RUN_STEPS):',
    `   ${orders.firstPass.map(marked).join(' > ')}`,
    ...(wanted.length
      ? [`   ${positions(orders.firstPass, wanted).join('; ')}.`]
      : []),
    '',
    '2. Continue, after the first pass (flow/flow.js sections; Continue stays inside a section):',
    ...orders.sections.map(
      (section) => `   ${section.id}: ${section.pages.map(marked).join(' > ')}`
    ),
    '',
    '3. The task list (features/hub/controller.js GROUPS, rows from flow/task-rows.js):',
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
