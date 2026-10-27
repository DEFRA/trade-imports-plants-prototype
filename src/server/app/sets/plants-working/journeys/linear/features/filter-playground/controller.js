import { dashboardPath, setBase } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { COMMODITY_TYPES, ORIGINS, consignments } from './consignments.js'
import { filterPlaygroundPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/filter-playground/template`

const copy = copyFor({ en, cy })

const playgroundRoutePath = () => `/${page.slug}`
const playgroundPath = () => `${setBase()}${playgroundRoutePath()}`

const keepAllowed = (value, allowed) =>
  [value ?? []].flat().filter((chosen) => allowed.includes(chosen))

const keywordOf = (value) => (typeof value === 'string' ? value.trim() : '')

const checkboxItems = (values, chosen, labels) =>
  values.map((value) => ({
    value,
    text: labels[value],
    checked: chosen.includes(value)
  }))

const matchesKeyword = (keyword, consignment) => {
  const wanted = keyword.toLowerCase()
  return [consignment.reference, consignment.commodity].some((text) =>
    text.toLowerCase().includes(wanted)
  )
}

const matches = (filters) => (consignment) =>
  (filters.keyword === '' || matchesKeyword(filters.keyword, consignment)) &&
  (filters.types.length === 0 || filters.types.includes(consignment.type)) &&
  (filters.origins.length === 0 || filters.origins.includes(consignment.origin))

const isFiltered = (filters) =>
  filters.keyword !== '' ||
  filters.types.length > 0 ||
  filters.origins.length > 0

const toResult = (consignment) => ({
  commodity: consignment.commodity,
  reference: consignment.reference,
  type: copy.types.labels[consignment.type],
  origin: copy.origins.labels[consignment.origin]
})

const playgroundGet = (request, h) => {
  const filters = {
    keyword: keywordOf(request.query?.keyword),
    types: keepAllowed(request.query?.type, COMMODITY_TYPES),
    origins: keepAllowed(request.query?.origin, ORIGINS)
  }
  const shown = consignments.filter(matches(filters))

  return h.view(view, {
    ...kit.base(copy.title, { page, backLink: dashboardPath() }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    filterAction: playgroundPath(),
    clearHref: isFiltered(filters) ? playgroundPath() : null,
    keyword: filters.keyword,
    typeItems: checkboxItems(COMMODITY_TYPES, filters.types, copy.types.labels),
    originItems: checkboxItems(ORIGINS, filters.origins, copy.origins.labels),
    resultsCount: copy.results.count(shown.length),
    results: shown.map(toResult)
  })
}

export const routes = [
  {
    method: 'GET',
    path: playgroundRoutePath(),
    options: kit.routeOptions,
    handler: playgroundGet
  }
]
