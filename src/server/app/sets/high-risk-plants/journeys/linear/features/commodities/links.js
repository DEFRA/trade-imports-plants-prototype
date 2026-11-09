import { pagePath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import { commodityTypePage } from '../commodity-type/page.js'
import { commoditiesPage, commodityDetailsPage } from './page.js'

const hrefWith = (request, slug, entries) => {
  const path = pagePath(request.params.journeyId, slug)
  const search = new URLSearchParams(entries).toString()
  return kit.withChangeContext(request, search ? `${path}?${search}` : path)
}

/**
 * The list page, optionally reporting how many lines a commodity-type change
 * removed.
 *
 * @param {object} request - the Hapi request.
 * @param {object} [options]
 * @param {number} [options.removed] - the number of lines dropped.
 * @returns {string} the href.
 */
export const listHref = (request, { removed } = {}) =>
  hrefWith(
    request,
    commoditiesPage.slug,
    removed === undefined ? [] : [['removed', String(removed)]]
  )

/**
 * The entry page, editing one line when given its index and adding a new one
 * otherwise.
 *
 * @param {object} request - the Hapi request.
 * @param {object} [options]
 * @param {number} [options.index] - the positional index of the line to edit.
 * @returns {string} the href.
 */
export const detailsHref = (request, { index } = {}) =>
  hrefWith(
    request,
    commodityDetailsPage.slug,
    index === undefined ? [] : [['index', String(index)]]
  )

/**
 * The entry question the group hangs off — where the entry page sends a trader
 * whose commodity type answers no category, and its Back link before the
 * collection holds a line.
 *
 * @param {object} request - the Hapi request.
 * @returns {string} the href.
 */
export const commodityTypeHref = (request) =>
  hrefWith(request, commodityTypePage.slug, [])
