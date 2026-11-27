import { dashboardPath, hubRoutePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { journeySections } from '../../../../../../flow/journey-flow.js'
import {
  rowEntry,
  rowGatePasses,
  taskRowsOfSection,
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
import { rowStatus } from '../../flow/task-rows.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { hubPage } from './page.js'

const view = `${TEMPLATES}/features/hub/template`

const fromOverview = (href) => kit.withTrail(href, [kit.TRAIL_START.overview])

const copy = copyFor({ en, cy })

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
  journeySections().find((section) => section.id === REVIEW_ROW_ID)

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
    href: fromOverview(sectionEntry(REVIEW_ROW_ID, scope, journeyId)),
    status: statusTag(
      sectionStatus(section, answers, scope.inScope, evaluation)
    )
  }
}

const isHiddenRow = (row, status) => row.conditional && status === NA

const blockedRowItem = (base) => ({ ...base, status: CANNOT_START_STATUS })

const openRowItem = (base, row, scope, status, journeyId) => ({
  ...base,
  href: fromOverview(rowEntry(row, scope, journeyId)),
  status: statusTag(status)
})

const buildTaskRowItem = (row, answers, scope, evaluation, journeyId) => {
  const { title, hint } = copy.rows[row.id]
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

const buildTaskGroups = (answers, scope, evaluation, journeyId) =>
  journeySections()
    .map((section) => ({ section, rows: taskRowsOfSection(section) }))
    .filter(({ rows }) => rows.length > 0)
    .map(({ section, rows }) => ({
      id: section.id,
      caption: copy.groups[section.id],
      items: rows
        .map((row) =>
          buildTaskRowItem(row, answers, scope, evaluation, journeyId)
        )
        .filter(Boolean)
    }))

const buildReviewGroup = (answers, scope, evaluation, journeyId) => ({
  id: 'check-and-submit',
  caption: copy.groups['check-and-submit'],
  items: [
    buildReviewItem(
      copy.rows[REVIEW_ROW_ID],
      answers,
      scope,
      evaluation,
      journeyId
    )
  ]
})

const buildGroups = (answers, scope, evaluation, journeyId) =>
  [
    ...buildTaskGroups(answers, scope, evaluation, journeyId),
    buildReviewGroup(answers, scope, evaluation, journeyId)
  ].filter((group) => group.items.length > 0)

const handler = async (request, h) => {
  const { journeyId } = request.params
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
  {
    method: 'GET',
    path: hubRoutePath(),
    options: kit.pageRouteOptions(hubPage),
    handler
  }
]
