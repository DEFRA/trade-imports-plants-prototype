import { hubPath, pagePath } from '../shared/paths.js'
import { pageGatePasses } from './gates.js'
import { journeySections, journeyTaskRows } from './journey-flow.js'

const sectionOfPage = (pageId) =>
  journeySections().find((section) =>
    section.pages.some((page) => page.id === pageId)
  )

export const sectionEntry = (sectionId, scope, journeyId) => {
  const section = journeySections().find(
    (candidate) => candidate.id === sectionId
  )
  const page = section?.pages.find((candidate) =>
    pageGatePasses(candidate, scope)
  )
  return page ? pagePath(journeyId, page.slug) : hubPath(journeyId)
}

export const rowEntry = (row, scope, journeyId) => {
  const page = row.pages.find((candidate) => pageGatePasses(candidate, scope))
  return page ? pagePath(journeyId, page.slug) : hubPath(journeyId)
}

/** Whether the hub can open a task row at all — true when any of its pages is
 * reachable, which is exactly the question `rowEntry` answers when it picks the
 * page to link to. Not the first page alone: a row whose opening question is
 * out of scope for this notification still has to be enterable when a later
 * page in it is asked of everyone. */
export const rowGatePasses = (row, scope) =>
  row.pages.some((page) => pageGatePasses(page, scope))

const nextSectionPage = (pageId, scope) => {
  const section = sectionOfPage(pageId)
  if (!section) {
    return undefined
  }
  const index = section.pages.findIndex((page) => page.id === pageId)
  return section.pages
    .slice(index + 1)
    .find((page) => pageGatePasses(page, scope))
}

const taskRowOfPage = (pageId) =>
  journeyTaskRows().find((row) => row.pages.some((page) => page.id === pageId))

const staysInTaskRow = (row, page) =>
  !row || row.pages.some((candidate) => candidate.id === page.id)

/** Where a save goes outside the opening run: on to the next page of the same
 * task row, otherwise back to the hub. A page outside every task row keeps its
 * section's order. */
export const nextInTaskRow = (pageId, scope, journeyId) => {
  const next = nextSectionPage(pageId, scope)
  return next && staysInTaskRow(taskRowOfPage(pageId), next)
    ? pagePath(journeyId, next.slug)
    : hubPath(journeyId)
}
