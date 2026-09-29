/**
 * Renders the service map pages with nunjucks and the real govuk-frontend
 * macros, configured the way `scripts/reports/demo/render.js` configures
 * them: one map page per set, an index of every set's map, and a page for a
 * set whose map could not be built. This file turns the graph into plain
 * display strings so `template.njk` has nothing to work out.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'

import { TAG } from '../demo/model.js'
import { escapeXml, renderDiagram, swatchSvg } from './layout.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const GOVUK_FRONTEND_DIST = path.resolve(
  HERE,
  '../../../node_modules/govuk-frontend/dist/'
)
const HUB_ID = 'hub'

let sharedEnvironment = null

const environment = () => {
  if (!sharedEnvironment) {
    sharedEnvironment = new nunjucks.Environment(
      new nunjucks.FileSystemLoader([GOVUK_FRONTEND_DIST, HERE]),
      {
        autoescape: true,
        throwOnUndefined: false,
        trimBlocks: true,
        lstripBlocks: true
      }
    )
  }
  return sharedEnvironment
}

const plural = (count, word, words = `${word}s`) =>
  `${count} ${count === 1 ? word : words}`

/** The tag a set's map carries, in the demo page's own words. */
export const tagOf = (set, { changed = false } = {}) => {
  if (set.kind === 'real') {
    return TAG.realJourney
  }
  if (changed) {
    return TAG.changed
  }
  return set.frozen ? TAG.frozen : TAG.release
}

const listHtml = (items) =>
  items.length === 0
    ? ''
    : items.length === 1
      ? `<p class="govuk-body govuk-!-margin-bottom-0">${items[0]}</p>`
      : `<ul class="govuk-list govuk-list--bullet govuk-!-margin-bottom-0">${items
          .map((item) => `<li>${item}</li>`)
          .join('')}</ul>`

const shownWhenText = (condition) => {
  if (!condition || condition.kind === 'always') {
    return 'Always'
  }
  if (condition.kind === 'never') {
    return 'Never: no answer the map tried reaches it'
  }
  return `Only if ${condition.when}`
}

const KIND_WORDS = Object.freeze({
  start: 'Start a new notification',
  'first-pass': 'The first time through',
  continue: 'Continue',
  'task-list': 'From the task list',
  'within-task': 'A link on the page',
  change: 'Change link'
})

const pageLink = (page) =>
  page
    ? `<a class="govuk-link" href="#page-${escapeXml(page.id)}">${escapeXml(page.title)}</a>`
    : 'a page the map does not know'

const numberBadge = (number) =>
  number ? `<span class="app-service-map__branch-number">${number}</span>` : ''

const outgoingLine = (edge, { pageById, numberOf, rowTitle }) => {
  const target = pageLink(pageById.get(edge.to))
  const when = edge.condition ? ` if ${escapeXml(edge.condition.when)}` : ''
  const badge = numberBadge(numberOf.get(edge))
  if (edge.kind === 'task-list') {
    return `${badge}Row “${escapeXml(rowTitle(edge.row))}” opens ${target}${when}`
  }
  if (edge.kind === 'within-task') {
    return `${badge}${escapeXml(edge.note ?? KIND_WORDS['within-task'])}: ${target}${when}`
  }
  return `${badge}${KIND_WORDS[edge.kind]}: ${target}${when}`
}

const STATUS_WORDS = Object.freeze({
  mandatory: 'must be answered',
  optional: 'optional'
})

const questionLine = (item, page) => {
  const field = page.fieldConditions.find(
    (candidate) => candidate.field === item.name
  )
  const when = item.askedWhen?.when ?? field?.when
  const status = item.status
    ? (STATUS_WORDS[item.status] ?? item.status)
    : 'a list: the questions below are asked for each one'
  const label = item.label ?? item.name
  const notes = [
    label.toLowerCase().includes(`(${status})`) ? null : status,
    item.within ? 'for each entry in the list' : null
  ].filter(Boolean)
  return `${escapeXml(label)}${notes.length ? ` (${escapeXml(notes.join(', '))})` : ''}${
    when ? `: only if ${escapeXml(when)}` : ''
  }`
}

const questionLines = (page) =>
  page.fulfils
    .filter((item) => !item.system)
    .map((item) => questionLine(item, page))

const pictureHtml = (page, screen) => {
  if (!screen?.picture) {
    return `<p class="govuk-body govuk-!-margin-bottom-0">No picture yet. ${escapeXml(screen?.note ?? '')}</p>`
  }
  const errors = screen.errorPicture
    ? `<p class="govuk-body govuk-!-margin-top-2 govuk-!-margin-bottom-0"><a class="govuk-link" href="${escapeXml(screen.errorPicture)}">What it says when nothing is filled in</a></p>`
    : ''
  return `<a href="${escapeXml(screen.picture)}"><img class="app-service-map__thumbnail" src="${escapeXml(screen.picture)}" alt="${escapeXml(page.title)}" loading="lazy"></a>${errors}`
}

const row = (key, html) =>
  html ? { key: { text: key }, value: { html } } : null

const pageCard = (page, context) => {
  const { pageById, screens, edges } = context
  const screen = screens[page.id]
  const outgoing = edges.filter(
    (edge) => edge.from === page.id && edge.kind !== 'change'
  )
  const incoming = edges.filter(
    (edge) => edge.to === page.id && edge.kind !== 'change'
  )
  const cameFrom = [
    ...new Map(
      incoming.map((edge) => [edge.from, pageLink(pageById.get(edge.from))])
    ).values()
  ]
  const rows = [
    row('Picture', pictureHtml(page, screen)),
    row('Address', `<code>${escapeXml(page.route)}</code>`),
    row('Shown', escapeXml(shownWhenText(page.shownWhen))),
    row('Why', listHtml(page.why.map(escapeXml))),
    row(
      'Answer first',
      listHtml(page.needsFirst.map((need) => pageLink(pageById.get(need.page))))
    ),
    row(
      'Where it goes next',
      page.terminal
        ? escapeXml('This is the end of the journey.')
        : listHtml(outgoing.map((edge) => outgoingLine(edge, context)))
    ),
    row(
      'Change links',
      listHtml(
        edges
          .filter((edge) => edge.from === page.id && edge.kind === 'change')
          .map(
            (edge) =>
              `${pageLink(pageById.get(edge.to))}${edge.condition ? ` (only if ${escapeXml(edge.condition.when)})` : ''}`
          )
      )
    ),
    row('Reached from', listHtml(cameFrom)),
    row('Questions on this page', listHtml(questionLines(page))),
    row(
      'Seen in',
      listHtml(
        (screen?.stories ?? []).map((story) =>
          escapeXml(story.headline ?? story.name)
        )
      )
    )
  ].filter(Boolean)
  return {
    id: page.id,
    card: { title: { text: page.title, headingLevel: 4 } },
    rows
  }
}

const problemsOf = (graph, pageById) => {
  const problems = []
  const { proofs } = graph
  const labels = new Map(
    graph.pages.flatMap((page) =>
      page.fulfils.map((item) => [item.name, item.label ?? item.name])
    )
  )
  const named = (name) => `“${labels.get(name) ?? name}”`
  if (proofs.unreachableObligations.length > 0) {
    problems.push(
      `${plural(proofs.unreachableObligations.length, 'question')} can never be asked: ${proofs.unreachableObligations.map(named).join(', ')}.`
    )
  }
  for (const error of proofs.gateErrors) {
    problems.push(
      `The rule for ${error.obligation} cannot be opened: ${error.reason}`
    )
  }
  for (const problem of proofs.flowReachability) {
    problems.push(
      problem.page
        ? `${named(problem.obligation)} must be answered, but for some answers its page, ${pageById.get(problem.page)?.title ?? problem.page}, is not shown, so it can never be answered.`
        : `${named(problem.obligation)} must be answered, but no page asks it.`
    )
  }
  if (proofs.scopeCompleteness.length > 0) {
    problems.push(
      `${plural(proofs.scopeCompleteness.length, 'question')} never came up in any answers the map tried: ${proofs.scopeCompleteness.map(named).join(', ')}.`
    )
  }
  if (graph.unexplainedRules.length > 0) {
    problems.push(
      `${plural(graph.unexplainedRules.length, 'rule')} the map cannot read, so it may miss a branch: ${graph.unexplainedRules.join(', ')}.`
    )
  }
  for (const id of graph.unreachedPages) {
    problems.push(`No arrow reaches ${pageById.get(id)?.title ?? id}.`)
  }
  return problems
}

// The answers that send someone a different way: each decision's value, and
// each question a page's own rule asks "is it answered yet?" of. Every task
// being complete is not an answer, so it is left out.
const routeAnswers = (graph) =>
  graph.counts.decisions +
  (graph.flags ?? []).filter((flag) => flag.kind === 'answered').length

// Only the line styles this map draws are in its key.
const keyRows = (hubTitle, graph) =>
  [
    {
      kind: 'first-pass',
      drawn: (edge) => ['first-pass', 'start'].includes(edge.kind),
      text: 'The first time through a new notification, one question after another'
    },
    {
      kind: 'continue',
      drawn: (edge) => edge.kind === 'continue' && edge.to !== HUB_ID,
      text: 'Continue, when coming back to a task later'
    },
    {
      kind: 'task-list',
      drawn: (edge) => edge.kind === 'task-list',
      text: `From the task list (${hubTitle})`
    },
    {
      kind: 'within-task',
      drawn: (edge) => edge.kind === 'within-task',
      text: 'A link on the page, not its Continue button'
    },
    {
      kind: 'first-pass',
      conditional: true,
      drawn: (edge) => edge.condition && edge.kind !== 'change',
      text: 'Only for some answers: the number in the circle says which, below'
    }
  ]
    .filter(({ drawn }) => graph.edges.some(drawn))
    .map(({ kind, conditional, text }) => ({
      key: {
        html: `<span class="app-service-map__swatch">${swatchSvg({ kind, conditional })}</span>`
      },
      value: { text }
    }))

/**
 * Renders one set's map page.
 *
 * @param {object} page
 * @param {object} page.graph - from graph.js.
 * @param {Record<string, object>} page.screens - page id to its screen, with
 *   picture addresses relative to the map page.
 * @param {string[]} [page.changedPages] - page ids this pull request changes.
 * @param {boolean} [page.changed] - whether this pull request changes the set.
 * @param {string} [page.sha] - the short commit the site was made from.
 * @returns {string} the HTML.
 */
export const renderMapPage = ({
  graph,
  screens,
  changedPages = [],
  changed = false,
  sha = ''
}) => {
  const pageById = new Map(graph.pages.map((page) => [page.id, page]))
  const hubTitle = pageById.get(HUB_ID)?.title ?? 'the task list'
  const { svg, layout } = renderDiagram(graph, { screens, changedPages })
  const numberOf = new Map(
    layout.numbered.map((item) => [item.edge, item.number])
  )
  const rowTitles = new Map(
    graph.lanes.flatMap((lane) =>
      lane.rows.map((item) => [item.id, item.title])
    )
  )
  const context = {
    pageById,
    screens,
    edges: graph.edges,
    numberOf,
    rowTitle: (id) => rowTitles.get(id) ?? id
  }
  const withoutPicture = graph.pages.filter(
    (page) => !screens[page.id]?.picture
  )
  return environment().render('template.njk', {
    mapPage: true,
    set: graph.set,
    tag: tagOf(graph.set, { changed }),
    svg,
    counts: [
      { key: { text: 'Pages' }, value: { text: String(graph.counts.pages) } },
      {
        key: { text: 'Branches' },
        value: {
          text:
            graph.counts.branches === 0
              ? 'None: every answer goes the same way'
              : `${graph.counts.branches}, from ${plural(routeAnswers(graph), 'answer that changes', 'answers that change')} the route`
        }
      },
      {
        key: { text: 'Questions' },
        value: { text: String(graph.counts.obligations) }
      },
      {
        key: { text: 'Pages with no picture yet' },
        value: { text: String(withoutPicture.length) }
      }
    ],
    problems: problemsOf(graph, pageById),
    keyRows: keyRows(hubTitle, graph),
    hubTitle,
    backToHub: graph.edges.some(
      (edge) => edge.kind === 'continue' && edge.to === HUB_ID
    ),
    changeLinks: graph.edges.some((edge) => edge.kind === 'change'),
    branches: layout.numbered.map((item) => ({
      number: item.number,
      from: pageById.get(item.edge.from)?.title ?? item.edge.from,
      to: pageById.get(item.edge.to)?.title ?? item.edge.to,
      when: item.edge.condition.when
    })),
    lanes: graph.lanes.map((lane) => ({
      id: lane.id,
      title: lane.title,
      cards: lane.pages
        .map((id) => pageById.get(id))
        .filter(Boolean)
        .map((page) => pageCard(page, context))
    })),
    withoutPicture: withoutPicture.map((page) => ({
      id: page.id,
      title: page.title,
      note: screens[page.id]?.note ?? ''
    })),
    outsideTheFlow: graph.outsideTheFlow,
    guessedTitles: graph.pages
      .filter((page) => page.titleSource !== 'copy')
      .map((page) => ({ id: page.id, title: page.title })),
    sha
  })
}

/**
 * Renders the index of every set's map.
 *
 * @param {{ maps: Array<{ id: string, title: string, tag: string,
 *   problem?: string|null }>, sha?: string }} page
 * @returns {string}
 */
export const renderIndexPage = ({ maps, sha = '' }) =>
  environment().render('template.njk', { indexPage: true, maps, sha })

/**
 * Renders the page for a set whose map could not be built.
 *
 * @param {{ setId: string, message: string, sha?: string }} page
 * @returns {string}
 */
export const renderProblemPage = ({ setId, message, sha = '' }) =>
  environment().render('template.njk', {
    problemPage: true,
    set: { id: setId, title: setId },
    message,
    sha
  })
