import { dashboardPath, hubRoutePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
import {
  rowEntry,
  rowGatePasses,
  sectionEntry
} from '../../../../../../flow/navigation.js'
import { sectionGatePasses } from '../../../../../../flow/gates.js'
import * as state from '../../../../../../engine/index.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../../../../../bridge/status/index.js'
import { sectionStatus } from '../../../../../../flow/section-status.js'
import { rowStatus, taskRowById } from '../../flow/task-rows.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/hub/template`

const copy = copyFor({ en, cy })

/**
 * The numbered task-list groups, in the order the hub renders them, each
 * naming the task rows it holds. A task row arrives with the section that owns
 * it, and a group with no rows is not rendered.
 */
export const GROUPS = [
  { id: 'about-the-consignment', rows: ['commodities', 'origin'] },
  { id: 'arrival-and-destination', rows: ['arrival', 'destination'] },
  {
    id: 'consignment-parties',
    rows: ['consignor', 'identificationNumbers', 'contact']
  },
  { id: 'check-and-submit', rows: ['review'] }
]

const REVIEW_ROW_ID = 'review'

const STATUS_TAG = {
  [FULFILLED]: {
    tag: { text: copy.statuses.completed, classes: 'govuk-tag--green' }
  },
  [OPTIONAL]: { text: copy.statuses.optional },
  [IN_PROGRESS]: {
    tag: { text: copy.statuses.inProgress, classes: 'govuk-tag--light-blue' }
  },
  [NOT_STARTED]: {
    tag: { text: copy.statuses.notYetStarted, classes: 'govuk-tag--blue' }
  }
}

const statusTag = (status) => STATUS_TAG[status] ?? STATUS_TAG[NOT_STARTED]

const CANNOT_START_STATUS = {
  text: copy.statuses.cannotStartYet,
  classes: 'govuk-task-list__status--cannot-start-yet'
}

const reviewSection = () =>
  sections.find((section) => section.id === REVIEW_ROW_ID)

const buildReviewItem = (
  { title, hint },
  answers,
  scope,
  evaluation,
  journeyId
) => {
  const section = reviewSection()
  const base = {
    title: { text: title },
    ...(hint ? { hint: { text: hint } } : {})
  }
  if (!sectionGatePasses(section, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return {
    ...base,
    href: sectionEntry(REVIEW_ROW_ID, scope, journeyId),
    status: statusTag(
      sectionStatus(section, answers, scope.inScope, evaluation)
    )
  }
}

const isHiddenRow = (row, status) => row.conditional && status === NA

const blockedRowItem = (base) => ({ ...base, status: CANNOT_START_STATUS })

const openRowItem = (base, row, scope, status, journeyId) => ({
  ...base,
  href: rowEntry(row, scope, journeyId),
  status: statusTag(status)
})

const buildRowItem = (id, answers, scope, evaluation, journeyId) => {
  const { title, hint } = copy.rows[id]
  if (id === REVIEW_ROW_ID) {
    return buildReviewItem(
      { title, hint },
      answers,
      scope,
      evaluation,
      journeyId
    )
  }
  const row = taskRowById(id)
  const status = rowStatus(row, answers, scope.inScope, evaluation)
  if (isHiddenRow(row, status)) {
    return null
  }
  const base = {
    title: { text: title },
    ...(hint ? { hint: { text: hint } } : {})
  }
  return rowGatePasses(row, scope)
    ? openRowItem(base, row, scope, status, journeyId)
    : blockedRowItem(base)
}

const buildGroups = (answers, scope, evaluation, journeyId) =>
  GROUPS.map((group) => ({
    id: group.id,
    caption: copy.groups[group.id],
    items: group.rows
      .map((id) => buildRowItem(id, answers, scope, evaluation, journeyId))
      .filter(Boolean)
  })).filter((group) => group.items.length > 0)

const handler = async (request, h) => {
  const { journeyId } = request.params
  await completeOpeningRun(request, h, journeyId)
  const { journey, answers, scope, evaluation } = await state.get(request, h)

  return h.view(view, {
    ...kit.base(copy.title, { backLink: dashboardPath(), journey }),
    heading: copy.title,
    copy,
    groups: buildGroups(answers, scope, evaluation, journeyId),
    dashboardHref: dashboardPath()
  })
}

export const routes = [
  { method: 'GET', path: hubRoutePath(), options: kit.routeOptions, handler }
]
