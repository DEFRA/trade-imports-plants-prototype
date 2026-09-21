/**
 * SYNTHETIC FIXTURE — owned by the tests, not journey content.
 *
 * The journey-flow side of the fixture set: sections, task rows and the
 * flow-only key. Ordering here is the flow order the prerequisite rules
 * read, so `scalarsSection` first keeps `scalarField` a prerequisite of
 * everything downstream.
 */

import { statusOf } from '../../src/server/app/bridge/status/index.js'
import { collectsOf } from '../../src/server/app/flow/dispatch.js'
import { hubPath } from '../../src/server/app/shared/paths.js'
import {
  aggregatePage,
  blocksPage,
  blockSixPage,
  boundedPage,
  branchBCPage,
  branchBDPage,
  branchDPage,
  branchPage,
  detailsPage,
  flowOnlyPage,
  itemDetailPage,
  itemsPage,
  lookupPage,
  modeGatedPage,
  scalarsPage,
  selectorsPage,
  variantOnePage,
  variantTwoPage
} from './pages.js'

// A key the flow owns and the notification model does not carry. It is
// never a manifest obligation, so it is the shape that proves answer-key
// recognition admits more than the manifest.
export const FLOW_ONLY_KEY = 'flowOnlyKey'

export const FLOW_ONLY_KEYS = [FLOW_ONLY_KEY]

export const LAYOUT = 'shared/layout.njk'

export const sections = [
  { id: 'scalars', pages: [scalarsPage] },
  { id: 'items', pages: [itemsPage] },
  { id: 'itemDetail', pages: [itemDetailPage] },
  {
    id: 'branch',
    pages: [branchPage, branchBCPage, branchBDPage, branchDPage, detailsPage]
  },
  { id: 'blocks', pages: [blocksPage, aggregatePage] },
  {
    id: 'selectors',
    pages: [
      lookupPage,
      modeGatedPage,
      selectorsPage,
      variantOnePage,
      variantTwoPage
    ]
  },
  { id: 'blockSix', pages: [blockSixPage] },
  { id: 'bounded', pages: [boundedPage] },
  { id: 'flowOnly', pages: [flowOnlyPage] }
]

/**
 * The fixture's own section captions, in the shape a journey's
 * `flow/section-captions/` module exports: one entry per captioned section
 * listing its pages, never a string per page.
 *
 * Synthetic like the rest of this directory — the set under
 * `src/server/app/sets/` owns the real map and nothing here imports it, so
 * the engine suite stays journey-neutral. `itemsPage` is deliberately left
 * out so an uncaptioned page is covered too.
 */
export const CAPTIONS = { scalars: 'Scalars', itemDetail: 'Item detail' }

const captionSections = [
  { id: 'scalars', pages: [scalarsPage] },
  { id: 'itemDetail', pages: [itemDetailPage] }
]

const captionByPageId = new Map(
  captionSections.flatMap((section) =>
    section.pages.map((page) => [page.id, CAPTIONS[section.id]])
  )
)

/**
 * The caption a fixture page renders above its heading.
 *
 * @param {string} [pageId] - the page identity's `id`.
 * @returns {string|undefined} the section name, or undefined for a page the
 * fixture leaves uncaptioned.
 */
export const sectionCaptionOf = (pageId) => captionByPageId.get(pageId)

export const taskRows = [
  { id: 'scalars', pages: [scalarsPage] },
  {
    id: 'items',
    pages: [itemsPage],
    parts: [{ collection: 'itemCollection', except: ['nestedCollection'] }]
  },
  {
    id: 'itemDetail',
    pages: [itemDetailPage],
    parts: [{ collection: 'itemCollection', only: ['nestedCollection'] }]
  },
  { id: 'branch', pages: [branchPage, detailsPage] },
  {
    id: 'branchDependants',
    pages: [branchBCPage, branchBDPage, branchDPage],
    conditional: true
  },
  { id: 'blocks', pages: [blocksPage, aggregatePage] },
  { id: 'lookup', pages: [lookupPage] },
  { id: 'modeGated', pages: [modeGatedPage], conditional: true },
  {
    id: 'selectors',
    pages: [selectorsPage, variantOnePage, variantTwoPage]
  },
  { id: 'blockSix', pages: [blockSixPage] },
  { id: 'bounded', pages: [boundedPage] }
]

export const taskRowById = (id) => taskRows.find((row) => row.id === id)

export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

export const rowStatus = (row, answers, inScope, evaluation) =>
  statusOf(rowParts(row), answers, inScope, evaluation)

export const RUN_STEPS = []

export const nextRunTarget = (stepId, scope, journeyId) => {
  const index = RUN_STEPS.findIndex((step) => step.id === stepId)
  if (index === -1) {
    return null
  }
  for (const step of RUN_STEPS.slice(index + 1)) {
    const target = step.target(scope, journeyId)
    if (target) {
      return target
    }
  }
  return hubPath(journeyId)
}

export const entryGuardTarget = async () => null
