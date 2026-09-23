import { DELETED } from '../../../../../engine/persistence/records.js'
import { marshal } from '../marshal/document.js'
import { marshalListItem } from '../marshal/list-item.js'
import { LIST_PAGE_SIZE, sortByCreatedAt, validPage } from '../list-query.js'

export const makeLoad =
  ({ journeys }) =>
  async ({ journeyId } = {}) => {
    if (journeyId == null) {
      return undefined
    }
    const journey = journeys.get(journeyId)
    return journey ? structuredClone(marshal(journey)) : undefined
  }

export const makeList =
  ({ journeys }) =>
  async ({
    journeyIds = [],
    page = 1,
    sort = 'arrivalDate,desc',
    referenceNumber
  } = {}) => {
    const resolvedPage = validPage(page)
    const documents = journeyIds
      .map((journeyId) => journeys.get(journeyId))
      .filter((journey) => journey && journey.status !== DELETED)
      .filter((journey) => !referenceNumber || journey.id === referenceNumber)
    const rows = (await Promise.all(documents.map(marshalListItem))).sort(
      sortByCreatedAt(sort)
    )
    const totalElements = rows.length
    const totalPages = Math.ceil(totalElements / LIST_PAGE_SIZE)
    const offset = (resolvedPage - 1) * LIST_PAGE_SIZE

    return {
      rows: structuredClone(rows.slice(offset, offset + LIST_PAGE_SIZE)),
      page: resolvedPage,
      size: LIST_PAGE_SIZE,
      totalElements,
      totalPages
    }
  }

export const makeHas =
  ({ journeys }) =>
  async (journeyId) =>
    journeys.has(journeyId)
