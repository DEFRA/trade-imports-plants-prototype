import { NA, FULFILLED, OPTIONAL, statusOf } from '../bridge/status/index.js'
import { collectsOf } from './dispatch.js'
import { journeyRowStatus, journeyTaskRows } from './journey-flow.js'

export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))

export const sectionStatus = (section, answers, inScope, evaluation) =>
  statusOf(sectionObligationIds(section), answers, inScope, evaluation)

/** The three statuses that leave nothing for the trader to do. The review
 * page's outstanding-row test applies this same predicate, so "no outstanding
 * row" and "ready for Check your answers" cannot drift apart. */
export const rowReady = (status) =>
  status === FULFILLED || status === NA || status === OPTIONAL

export const readyForCheckYourAnswers = (answers, inScope, evaluation) =>
  journeyTaskRows().every((row) =>
    rowReady(journeyRowStatus(row, answers, inScope, evaluation))
  )
