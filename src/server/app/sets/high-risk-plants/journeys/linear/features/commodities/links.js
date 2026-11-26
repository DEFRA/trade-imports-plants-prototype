import { pagePath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import { commodityTypePage } from '../commodity-type/page.js'
import { commoditiesPage, commodityDetailsPage } from './page.js'

const pathWith = (journeyId, slug, entries) => {
  const path = pagePath(journeyId, slug)
  const search = new URLSearchParams(entries).toString()
  return search ? `${path}?${search}` : path
}

const hrefWith = (request, slug, entries) =>
  kit.carryTrail(request, pathWith(request.params.journeyId, slug, entries))

export const listHref = (request) => hrefWith(request, commoditiesPage.slug, [])

/**
 * The list page after a commodity-type change removed lines, with the commodity
 * type page added to the trail.
 *
 * @param {object} request - the Hapi request.
 * @param {number} removed - the number of lines dropped.
 * @returns {string} the href.
 */
export const listHrefAfterTypeChange = (request, removed) =>
  kit.pushTrail(
    request,
    pathWith(request.params.journeyId, commoditiesPage.slug, [
      ['removed', String(removed)]
    ]),
    commodityTypePage.slug
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
 * whose commodity type answers no category.
 *
 * @param {object} request - the Hapi request.
 * @returns {string} the href, carrying the request's trail without its newest place.
 */
export const commodityTypeHref = (request) =>
  kit.withTrail(
    pathWith(request.params.journeyId, commodityTypePage.slug, []),
    kit.requestTrail(request).slice(0, -1)
  )

export const detailsPath = (journeyId, index) =>
  pathWith(journeyId, commodityDetailsPage.slug, [['index', String(index)]])
