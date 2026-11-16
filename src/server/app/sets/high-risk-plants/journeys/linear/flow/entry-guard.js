import {
  createPath,
  dashboardPath,
  hubPath,
  pagePath,
  setBase
} from '../../../../../shared/paths.js'
import { isAnswered } from '../../../../../lib/answered.js'
import { get } from '../../../../../engine/read.js'
import {
  obligationByName,
  SYSTEM_POPULATED
} from '../../../../../bridge/obligation-source.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import { buildInsFrontendUrl } from '../../../../../../common/helpers/ins-frontend-url.js'

const journeyPrefix = () => `${setBase()}/notifications/`
const ACTION_SLUGS = new Set(['amend', 'cancel-amend', 'copy', 'delete'])

export const guardedJourneyPath = (path) => {
  const prefix = journeyPrefix()
  if (!path.startsWith(prefix) || path === createPath()) {
    return false
  }
  const [journeyId, ...slugParts] = path.slice(prefix.length).split('/')
  const slug = slugParts.join('/')
  if (ACTION_SLUGS.has(slug)) {
    return false
  }
  const isEntrySurface =
    slug === commodityTypePage.slug ||
    slug.startsWith(`${commodityTypePage.slug}/`)
  return Boolean(journeyId) && !isEntrySurface
}

const userEntered = (key) => {
  const obligation = obligationByName(key)
  return obligation !== undefined && !SYSTEM_POPULATED.has(key)
}

export const hasCommittedNotificationAnswers = (answers) =>
  Object.entries(answers ?? {}).some(
    ([key, value]) => userEntered(key) && isAnswered(value)
  )

export const leaveJourneyLink = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

export const insTypeQuestionUrl = () =>
  buildInsFrontendUrl('/notification-type')

export const entryGuardTarget = async (request, h) => {
  if (!guardedJourneyPath(request.path)) {
    return null
  }
  const { journey, answers } = await get(request, h)
  if (hasCommittedNotificationAnswers(answers)) {
    return null
  }
  request.logger.info(
    { journeyId: journey.journeyId, path: request.path },
    'No answer entered, sent to the first page'
  )
  return pagePath(request.params.journeyId, commodityTypePage.slug)
}
