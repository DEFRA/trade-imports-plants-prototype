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

export const previousRunTarget = () => null

export const entryGuardTarget = async () => null
