import { dashboardPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as routing from '../../../../services/commodity-routing/index.js'
import { conversation, entriesUpTo, findPath } from '../find/conversation.js'
import { answerText } from '../find/told.js'
import { placeholderRoutePath } from './links.js'
import { placeholderNotificationPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * A placeholder for a notification this prototype does not hold a journey
 * for: live animals (CHED-A), germinal products (CHED-P) and plants and plant
 * products (CHED-PP).
 *
 * It is the notification's overview page and nothing behind it. It shows the
 * routing answers already filled in as completed tasks, and the rest of the
 * notification as tasks still to do. Nothing is stored: like the routing
 * pages, the answers travel in the address, so the page is a picture of where
 * routing would land rather than a draft the dashboard could list.
 */
const view = `${TEMPLATES}/features/placeholder-notification/template`

const copy = copyFor({ en, cy })

const COMMODITY_TASK = 'commodity'
const ORIGIN_TASK = 'origin'
const COMPLETED = 'completed'
const NOT_STARTED = 'notStarted'
const CANNOT_START = 'cannotStart'

// The one task that differs by notification: what the goods are, in detail.
const DETAIL_TASK = {
  [routing.CHED_A]: 'animals',
  [routing.CHED_P]: 'germinal',
  [routing.CHED_PP]: 'plants'
}

const CERTIFICATE_TASK = {
  [routing.CHED_A]: 'healthCertificate',
  [routing.CHED_P]: 'healthCertificate',
  [routing.CHED_PP]: 'phytosanitaryCertificate'
}

const groupsFor = (type) => [
  {
    id: 'consignment',
    tasks: [COMMODITY_TASK, ORIGIN_TASK, DETAIL_TASK[type]]
  },
  { id: 'arrival', tasks: ['arrival', 'destination'] },
  { id: 'parties', tasks: ['consignor', 'consignee'] },
  { id: 'documents', tasks: [CERTIFICATE_TASK[type]] },
  { id: 'submit', tasks: ['check'] }
]

// What routing already knows for a task, in words — undefined for a task the
// trader still has to do.
const filledFor = (task, talk) => {
  if (task === COMMODITY_TASK) {
    return copy.commodity(talk.commodity.name, talk.commodity.code)
  }
  const origin = talk.answers[routing.ORIGIN]
  return task === ORIGIN_TASK && origin
    ? answerText(routing.ORIGIN, origin)
    : undefined
}

const statusFor = (task, filled) => {
  if (filled) {
    return { text: copy.statuses[COMPLETED] }
  }
  const status = task === 'check' ? CANNOT_START : NOT_STARTED
  return {
    tag: { text: copy.statuses[status], classes: 'govuk-tag--blue' }
  }
}

const taskItem = (task, talk) => {
  const filled = filledFor(task, talk)
  return {
    title: { text: copy.tasks[task] },
    hint: filled ? { text: copy.filledIn(filled) } : undefined,
    status: statusFor(task, filled)
  }
}

const get = async (request, h) => {
  const { type } = request.params
  const talk = await conversation(request.query)
  // The page only stands for the notification the answers really lead to.
  const leadsHere =
    routing.placeholderNotifications().includes(type) &&
    talk.destination === type
  if (!leadsHere) {
    return h.redirect(findPath(entriesUpTo(talk)))
  }
  const answersHref = findPath(entriesUpTo(talk))
  return h.view(view, {
    ...kit.base(copy.types[type], { backLink: answersHref, page }),
    copy,
    heading: copy.types[type],
    groups: groupsFor(type).map(({ id, tasks }) => ({
      id,
      caption: copy.groups[id],
      items: tasks.map((task) => taskItem(task, talk))
    })),
    answersHref,
    dashboardHref: dashboardPath()
  })
}

export const routes = [
  {
    method: 'GET',
    path: placeholderRoutePath(),
    options: kit.routeOptions,
    handler: get
  }
]
