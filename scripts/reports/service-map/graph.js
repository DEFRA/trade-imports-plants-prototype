/**
 * A set's journey as data: every page, the arrows between them with each
 * branch's condition in plain words, the task-list groups as lanes, the
 * questions (obligations) each page asks, and the model's own proofs.
 *
 * Built by asking the real engine, not by reading source: the set is
 * installed in this process (`install-set.js`), the answer states that
 * matter are enumerated from the obligations' gate metadata (`states.js`),
 * and for each state the real navigation functions say where each page goes.
 *
 * The output holds only facts derived from the set's own files: no dates,
 * commit, absolute path or picture address. Every array has a fixed order,
 * so the same checkout always gives the same bytes (`serialiseGraph`).
 */
import { REPO_ROOT } from '../../designer/lib/repo.js'
import {
  PLACEHOLDER_SET,
  REAL_JOURNEY_SET,
  releaseInfo
} from '../../designer/lib/sets.js'
import { REAL_JOURNEY_TITLE } from '../demo/model.js'
import { installSet } from './install-set.js'
import { isOpaque, probeGate } from './probe-scope.js'
import {
  ANY_OTHER_ANSWER,
  READY_FLAG,
  answeredFlag,
  conditionOrNull,
  conditionOver,
  opaqueCondition,
  statesOf
} from './states.js'
import {
  HUB_ROUTE,
  copyOfRoute,
  fieldLabelFor,
  humanise,
  labelsFor,
  pageRoute,
  readFeatureIndex,
  titleOfRoute
} from './titles.js'

export const SCHEMA_VERSION = 1

/** The journey id every address is built with: the route's own placeholder. */
export const JOURNEY_ID = '{journeyId}'

export const HUB_ID = 'hub'

/** The value given to a question that only has to be answered, not chosen. */
const PLACEHOLDER_ANSWER = 'answered'

export const EDGE_KINDS = Object.freeze([
  'start',
  'first-pass',
  'continue',
  'task-list',
  'within-task',
  'change'
])

const WITHIN_TASK_NOTE = 'Opened from this page (a link, not Continue)'

const unique = (values) => [...new Set(values)]

const setFacts = (setId, root) => {
  if (setId === REAL_JOURNEY_SET) {
    return { id: setId, title: REAL_JOURNEY_TITLE, kind: 'real', frozen: false }
  }
  const info = releaseInfo(setId, { root })
  return {
    id: setId,
    title: info?.title ?? humanise(setId),
    kind: setId === PLACEHOLDER_SET ? 'placeholder' : 'release',
    frozen: info?.frozen === true
  }
}

const gateValuesOf = (meta) => {
  const values = []
  if (Object.hasOwn(meta, 'value')) {
    values.push(meta.value)
  }
  try {
    values.push(...(meta.values ?? []))
  } catch {
    // An allow-list read lazily from a service that is not there: no values.
  }
  return values
}

const reasonsOf = (meta) =>
  (meta.whenTrue?.reasons ?? meta.reasons ?? [])
    .map((reason) => reason?.explanation)
    .filter((text) => typeof text === 'string')

/** The flow pages in order, with the hub straight after the last page of the
 * opening run (or after the first section when there is no run). */
const orderedPages = (inst, hasHub) => {
  const flow = inst.sections.flatMap((section) =>
    section.pages.map((page) => ({ page, section }))
  )
  if (!hasHub) {
    return flow
  }
  const runIndexes = inst.runSteps
    .map((step) => flow.findIndex((entry) => entry.page.id === step.id))
    .filter((index) => index !== -1)
  const firstSectionEnd = (inst.sections[0]?.pages.length ?? 1) - 1
  const after =
    runIndexes.length > 0 ? Math.max(...runIndexes) : firstSectionEnd
  const hub = { page: { id: HUB_ID, slug: null }, section: null, isHub: true }
  return [...flow.slice(0, after + 1), hub, ...flow.slice(after + 1)]
}

const resolveRoute = (entry, index, titles) => {
  if (entry.isHub) {
    return HUB_ROUTE
  }
  const route = pageRoute(entry.page)
  if (titles.byRoute.has(route)) {
    return route
  }
  return index === 0 && titles.byRoute.has('/') ? '/' : route
}

const readDecisions = (ctx) => {
  const { obligations, platform, pageTitle, copyOfPage, flowIndex } = ctx
  const byId = new Map(
    obligations.map((obligation) => [obligation.id, obligation])
  )
  const gated = obligations
    .filter((obligation) => typeof obligation.applyTo === 'function')
    .map((obligation) => {
      const meta = platform.helpers.obligationMetadata(obligation)
      return {
        obligation,
        meta,
        gates: (meta.dependsOn ?? [])
          .map((id) => byId.get(id))
          .filter((gate) => gate && gate !== obligation)
      }
    })
  const routing = gated.flatMap(({ obligation, meta, gates }) =>
    gates
      .filter((gate) => !obligation.within && !gate.within)
      .map((gate) => ({ obligation, meta, gate }))
  )
  const field = gated.flatMap(({ obligation, meta, gates }) =>
    gates
      .filter((gate) => obligation.within || gate.within)
      .map((gate) => ({ obligation, meta, gate }))
  )
  const names = unique(routing.map(({ gate }) => gate.name)).toSorted(
    (a, b) =>
      flowIndex(platform.dispatch.pageOfObligation(a)) -
        flowIndex(platform.dispatch.pageOfObligation(b)) ||
      obligations.findIndex((o) => o.name === a) -
        obligations.findIndex((o) => o.name === b)
  )
  const decisions = names.map((name) => {
    const pageId = platform.dispatch.pageOfObligation(name) ?? null
    const values = unique(
      routing
        .filter(({ gate }) => gate.name === name)
        .flatMap(({ meta }) => gateValuesOf(meta))
    )
    const labels = labelsFor(copyOfPage(pageId), values)
    const typed = (key) => values.find((value) => String(value) === key) ?? key
    const domain = labels
      ? [
          ...Object.keys(labels).map(typed),
          ...values.filter((value) => !Object.hasOwn(labels, String(value)))
        ]
      : [...values, ANY_OTHER_ANSWER]
    return {
      id: name,
      kind: 'decision',
      obligation: name,
      question: pageTitle(pageId) ?? humanise(name),
      page: pageId,
      values: domain.map((value) => ({
        value,
        label:
          labels?.[String(value)] ??
          (value === ANY_OTHER_ANSWER ? 'any other answer' : humanise(value))
      }))
    }
  })
  return {
    decisions,
    field,
    unexplainedRules: gated
      .filter(({ meta }) => meta.dependsOn === undefined)
      .map(({ obligation }) => obligation.name)
  }
}

const baseAnswers = (obligations, platform, decisionNames) =>
  Object.fromEntries(
    obligations
      .filter(
        (obligation) =>
          !obligation.within &&
          platform.obligationSource.ENFORCED_AT_CONTINUE.has(obligation.name) &&
          !decisionNames.has(obligation.name)
      )
      .map((obligation) => [obligation.name, PLACEHOLDER_ANSWER])
  )

const answersFor = (assignment, base, dimensions) => {
  const answers = { ...base }
  for (const dim of dimensions) {
    if (dim.kind === 'decision') {
      answers[dim.obligation] = assignment[dim.id]
    } else if (dim.kind === 'answered' && assignment[dim.id]) {
      answers[dim.obligation] = PLACEHOLDER_ANSWER
    }
  }
  return answers
}

const makeScopeOf = (platform) => (answers, ready) => {
  const evaluation = platform.evaluation.evaluateAnswers(answers)
  const scope = platform.scope.makeScopeFromEvaluation(evaluation, answers)
  return {
    answers,
    evaluation,
    scope:
      ready === undefined
        ? scope
        : { ...scope, readyForCheckYourAnswers: ready }
  }
}

const flagDimensions = (
  reads,
  { decisionNames, base, obligations, pageTitle, platform }
) => {
  const dims = []
  if (reads.some((read) => read.ready)) {
    dims.push({
      id: READY_FLAG,
      kind: 'ready',
      question: 'Every task is complete',
      values: [
        { value: false, label: 'Not every task is complete' },
        { value: true, label: 'Every task is complete' }
      ]
    })
  }
  const answered = unique(reads.flatMap((read) => read.answered)).filter(
    (name) =>
      !decisionNames.has(name) &&
      !Object.hasOwn(base, name) &&
      obligations.some(
        (obligation) => obligation.name === name && !obligation.within
      )
  )
  for (const name of answered) {
    const pageId = platform.dispatch.pageOfObligation(name)
    dims.push({
      id: answeredFlag(name),
      kind: 'answered',
      obligation: name,
      question: pageTitle(pageId) ?? humanise(name),
      values: [
        { value: false, label: 'Not answered yet' },
        { value: true, label: 'Answered' }
      ]
    })
  }
  return dims
}

const groupObservations = (observations) => {
  const groups = new Map()
  for (const observation of observations) {
    const key = `${observation.from}\u0000${observation.kind}\u0000${observation.row ?? ''}`
    if (!groups.has(key)) {
      groups.set(key, {
        from: observation.from,
        kind: observation.kind,
        row: observation.row ?? null,
        targets: new Map()
      })
    }
    const targets = groups.get(key).targets
    if (!targets.has(observation.to)) {
      targets.set(observation.to, new Set())
    }
    targets.get(observation.to).add(observation.state)
  }
  return [...groups.values()]
}

const sameStates = (a, b) =>
  a.size === b.size && [...a].every((state) => b.has(state))

/**
 * The service map graph for one installed set. Runs inside the set's
 * context.
 *
 * @param {object} inst - from installSet.
 * @param {object} titles - from readFeatureIndex.
 * @param {object} set - `{ id, title, kind, frozen }`.
 * @returns {object} the graph.
 */
export const graphOf = (inst, titles, set) => {
  const { platform } = inst
  const { pagePath, hubPath, dashboardPath } = platform.paths
  const { pageGatePasses, sectionGatePasses } = platform.gates
  const { nextInSection, rowEntry, rowGatePasses, sectionEntry } =
    platform.navigation
  const obligations = platform.manifest.obligations()
  const hasHub = inst.taskRows.length > 0 || inst.groups.length > 0

  const entries = orderedPages(inst, hasHub)
  const flowEntries = entries.filter((entry) => !entry.isHub)
  const positionOf = new Map(
    entries.map((entry, index) => [entry.page.id, index])
  )
  const flowIndex = (pageId) =>
    flowEntries.findIndex((entry) => entry.page.id === pageId)
  const routeOf = new Map(
    entries.map((entry) => [
      entry.page.id,
      resolveRoute(entry, flowIndex(entry.page.id), titles)
    ])
  )
  const titleOf = new Map(
    entries.map((entry) => {
      const title = titleOfRoute(titles, routeOf.get(entry.page.id))
      return [
        entry.page.id,
        title
          ? { title, source: 'copy' }
          : {
              title: entry.isHub ? 'Task list' : humanise(entry.page.id),
              source: 'guessed'
            }
      ]
    })
  )
  const pageTitle = (pageId) => (pageId ? titleOf.get(pageId)?.title : null)
  const copyOfPage = (pageId) =>
    pageId && routeOf.has(pageId)
      ? copyOfRoute(titles, routeOf.get(pageId))
      : null

  const pageOfUrl = new Map()
  for (const { page } of flowEntries) {
    if (page.slug) {
      pageOfUrl.set(pagePath(JOURNEY_ID, page.slug), page.id)
    }
  }
  const landing =
    flowEntries.find(({ page }) => page.slug === '') ?? flowEntries[0]
  if (landing) {
    pageOfUrl.set(dashboardPath(), landing.page.id)
  }
  if (hasHub) {
    pageOfUrl.set(hubPath(JOURNEY_ID), HUB_ID)
  }
  const toPage = (url) => pageOfUrl.get(url) ?? `(address ${url})`

  const { decisions, field, unexplainedRules } = readDecisions({
    obligations,
    platform,
    pageTitle,
    copyOfPage,
    flowIndex
  })
  const decisionNames = new Set(
    decisions.map((decision) => decision.obligation)
  )
  const base = baseAnswers(obligations, platform, decisionNames)
  const scopeOf = makeScopeOf(platform)

  const customGates = [
    ...inst.sections
      .filter((section) => typeof section.gate === 'function')
      .map((section) => ({
        kind: 'section',
        id: section.id,
        gate: section.gate
      })),
    ...flowEntries
      .filter(({ page }) => typeof page.gate === 'function')
      .map(({ page }) => ({ kind: 'page', id: page.id, gate: page.gate }))
  ]
  const probeScopes = statesOf(decisions).map(
    (assignment) => scopeOf(answersFor(assignment, base, decisions)).scope
  )
  const reads = customGates.map((custom) => ({
    ...custom,
    reads: probeGate(custom.gate, probeScopes)
  }))
  const flags = flagDimensions(
    reads.map((read) => read.reads),
    { decisionNames, base, obligations, pageTitle, platform }
  )
  const dimensions = [...decisions, ...flags]
  const hasReady = flags.some((flag) => flag.kind === 'ready')
  const states = statesOf(dimensions).map((assignment) => ({
    assignment,
    ...scopeOf(
      answersFor(assignment, base, dimensions),
      hasReady ? assignment[READY_FLAG] : undefined
    )
  }))
  const assignments = states.map((state) => state.assignment)
  const condition = (holds, applies) =>
    conditionOver({ states: assignments, dimensions, holds, applies })

  const opaqueSections = new Set(
    reads
      .filter((read) => read.kind === 'section' && isOpaque(read.reads))
      .map((read) => read.id)
  )
  const opaquePages = new Set(
    reads
      .filter((read) => read.kind === 'page' && isOpaque(read.reads))
      .map((read) => read.id)
  )
  const hasOpaqueGate = (pageId) => {
    const entry = flowEntries.find(({ page }) => page.id === pageId)
    return Boolean(
      entry && (opaquePages.has(pageId) || opaqueSections.has(entry.section.id))
    )
  }

  const shownIn = new Map(
    entries.map((entry) => [
      entry.page.id,
      states.map(({ scope }) =>
        entry.isHub
          ? true
          : sectionGatePasses(entry.section, scope) &&
            pageGatePasses(entry.page, scope)
      )
    ])
  )
  const shownWhenOf = new Map(
    entries.map((entry) => {
      const shown = shownIn.get(entry.page.id)
      const raw = condition((index) => shown[index])
      const words =
        raw.kind === 'values' && hasOpaqueGate(entry.page.id)
          ? opaqueCondition(raw)
          : raw
      return [entry.page.id, words]
    })
  )

  const observations = []
  const lastPage = flowEntries.length > 1 ? flowEntries.at(-1).page.id : null

  const edges = []
  if (flowEntries.length > 1 && landing) {
    const empty = scopeOf({}, hasReady ? false : undefined).scope
    let target = null
    for (const step of inst.runSteps) {
      target = step.target?.(empty, JOURNEY_ID) ?? null
      if (target) {
        break
      }
    }
    if (!target && hasHub) {
      target = hubPath(JOURNEY_ID)
    }
    if (target) {
      edges.push({
        from: landing.page.id,
        to: toPage(target),
        kind: 'start',
        condition: null
      })
    }
  }

  for (const step of inst.runSteps) {
    const shown = shownIn.get(step.id)
    if (!shown) {
      continue
    }
    states.forEach(({ scope }, index) => {
      if (shown[index]) {
        const url =
          platform.journeyFlow.journeyNextRunTarget(
            step.id,
            scope,
            JOURNEY_ID
          ) ?? hubPath(JOURNEY_ID)
        observations.push({
          from: step.id,
          kind: 'first-pass',
          state: index,
          to: toPage(url)
        })
      }
    })
  }

  const landingSection = inst.sections[0]
  for (const { page, section } of flowEntries) {
    if (section === landingSection || page.id === lastPage) {
      continue
    }
    const shown = shownIn.get(page.id)
    states.forEach(({ scope }, index) => {
      if (shown[index]) {
        observations.push({
          from: page.id,
          kind: 'continue',
          state: index,
          to: toPage(nextInSection(page.id, scope, JOURNEY_ID))
        })
      }
    })
  }

  const rowIds = hasHub
    ? inst.groups.length > 0
      ? inst.groups.flatMap((group) => group.rows)
      : inst.taskRows.map((row) => row.id)
    : []
  const rowVisible = new Map()
  for (const rowId of rowIds) {
    const taskRow = inst.taskRows.find((row) => row.id === rowId)
    const section = taskRow
      ? null
      : inst.sections.find((candidate) => candidate.id === rowId)
    const visible = states.map(({ answers, scope, evaluation }, index) => {
      if (taskRow) {
        const status = platform.journeyFlow.journeyRowStatus(
          taskRow,
          answers,
          scope.inScope,
          evaluation
        )
        if (taskRow.conditional && status === platform.status.NA) {
          return false
        }
        if (rowGatePasses(taskRow, scope)) {
          observations.push({
            from: HUB_ID,
            kind: 'task-list',
            row: rowId,
            state: index,
            to: toPage(rowEntry(taskRow, scope, JOURNEY_ID))
          })
        }
        return true
      }
      if (section && sectionGatePasses(section, scope)) {
        observations.push({
          from: HUB_ID,
          kind: 'task-list',
          row: rowId,
          state: index,
          to: toPage(sectionEntry(section.id, scope, JOURNEY_ID))
        })
      }
      return true
    })
    rowVisible.set(rowId, visible)
  }

  const groups = groupObservations(observations)
  const firstPassOf = new Map(
    groups
      .filter((group) => group.kind === 'first-pass')
      .map((group) => [group.from, group])
  )
  for (const group of groups) {
    const shown = shownIn.get(group.from)
    const applies = (index) => (shown ? shown[index] : true)
    for (const [to, stateSet] of group.targets) {
      if (group.kind === 'continue') {
        const same = firstPassOf.get(group.from)?.targets.get(to)
        if (same && sameStates(same, stateSet)) {
          continue
        }
      }
      const raw = condition((index) => stateSet.has(index), applies)
      const words =
        raw.kind === 'values' && hasOpaqueGate(to) ? opaqueCondition(raw) : raw
      edges.push({
        from: group.from,
        to,
        kind: group.kind,
        ...(group.row ? { row: group.row } : {}),
        condition: conditionOrNull(words)
      })
    }
  }

  const reached = new Set(edges.map((edge) => edge.to))
  for (const { page } of flowEntries) {
    if (page.id === landing?.page.id || reached.has(page.id)) {
      continue
    }
    const row = inst.taskRows.find((candidate) =>
      candidate.pages.some((rowPage) => rowPage.id === page.id)
    )
    const position = row
      ? row.pages.findIndex((rowPage) => rowPage.id === page.id)
      : -1
    if (position > 0) {
      edges.push({
        from: row.pages[position - 1].id,
        to: page.id,
        kind: 'within-task',
        condition: conditionOrNull(shownWhenOf.get(page.id)),
        note: WITHIN_TASK_NOTE
      })
    }
  }

  const walked = [...platform.obligationSource.walkObligations()]
  const templatePathOf = new Map(
    walked.map(({ templatePath, obligation }) => [
      obligation.name,
      templatePath
    ])
  )
  const ownerOf = (name) =>
    platform.dispatch.pageOfObligation(templatePathOf.get(name) ?? name) ?? null

  const lastSection = inst.sections.at(-1)
  const checkPage =
    inst.sections.length > 1 &&
    typeof lastSection.gate === 'function' &&
    lastSection.pages.length > 1
      ? lastSection.pages[0].id
      : null
  const askedWhenOf = (obligation) =>
    obligation.within || typeof obligation.applyTo !== 'function'
      ? null
      : conditionOrNull(
          condition((index) => states[index].scope.inScope.has(obligation.name))
        )
  const fulfilsOf = (pageId) =>
    walked
      .filter(({ obligation }) => ownerOf(obligation.name) === pageId)
      .map(({ obligation }) => ({
        name: obligation.name,
        label: fieldLabelFor(copyOfPage(pageId), obligation.name),
        status: obligation.status ?? null,
        system: obligation.system === true,
        gated: typeof obligation.applyTo === 'function',
        within: obligation.within?.name ?? null,
        askedWhen: askedWhenOf(obligation)
      }))
  if (checkPage) {
    const lastIds = new Set(lastSection.pages.map((page) => page.id))
    for (const { page } of flowEntries) {
      const asks = fulfilsOf(page.id).some((item) => !item.system)
      if (!lastIds.has(page.id) && asks) {
        edges.push({
          from: checkPage,
          to: page.id,
          kind: 'change',
          condition: conditionOrNull(shownWhenOf.get(page.id))
        })
      }
    }
  }

  const position = (pageId) => positionOf.get(pageId) ?? entries.length
  const rowOrder = (edge) => (edge.row ? rowIds.indexOf(edge.row) : -1)
  edges.sort(
    (a, b) =>
      position(a.from) - position(b.from) ||
      EDGE_KINDS.indexOf(a.kind) - EDGE_KINDS.indexOf(b.kind) ||
      rowOrder(a) - rowOrder(b) ||
      position(a.to) - position(b.to)
  )

  const hubCopy = copyOfRoute(titles, HUB_ROUTE)
  const lanes = lanesOf(inst, {
    hasHub,
    hubCopy,
    rowIds,
    rowCondition: (rowId) => {
      const visible = rowVisible.get(rowId)
      return visible
        ? conditionOrNull(condition((index) => visible[index]))
        : null
    }
  })
  const laneOf = new Map()
  const rowOfPage = new Map()
  for (const lane of lanes) {
    for (const pageId of lane.pages) {
      laneOf.set(pageId, lane.id)
    }
    for (const row of lane.rows) {
      for (const pageId of row.pages) {
        if (!rowOfPage.has(pageId)) {
          rowOfPage.set(pageId, row.id)
        }
      }
    }
  }

  const fieldConditionsOf = (pageId) =>
    field
      .filter(({ obligation }) => ownerOf(obligation.name) === pageId)
      .map(({ obligation, meta, gate }) => {
        const copy = copyOfPage(pageId)
        const values = unique(gateValuesOf(meta))
        const labels = labelsFor(copy, values)
        const ordered = labels
          ? [
              ...Object.keys(labels).filter((key) =>
                values.some((value) => String(value) === key)
              ),
              ...values
                .map(String)
                .filter((value) => !Object.hasOwn(labels, value))
            ]
          : values.map(String)
        const label = fieldLabelFor(copy, obligation.name)
        const decision = fieldLabelFor(copy, gate.name).toLowerCase()
        const words = ordered.map((value) => `“${labels?.[value] ?? value}”`)
        const list =
          words.length > 1
            ? `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`
            : (words[0] ?? 'nothing')
        return {
          field: obligation.name,
          label,
          decision: gate.name,
          values: ordered,
          when: `the ${decision} is ${list}`,
          text: `${label}: asked when the ${decision} is ${list}`
        }
      })

  const pages = entries.map((entry) => {
    const id = entry.page.id
    const owned = walked
      .map(({ obligation }) => obligation)
      .filter((obligation) => ownerOf(obligation.name) === id)
    const why = unique(
      owned
        .filter(
          (obligation) =>
            !obligation.within && typeof obligation.applyTo === 'function'
        )
        .flatMap((obligation) =>
          reasonsOf(platform.helpers.obligationMetadata(obligation))
        )
    )
    return {
      id,
      slug: entry.page.slug ?? null,
      route: routeOf.get(id),
      title: titleOf.get(id).title,
      titleSource: titleOf.get(id).source,
      lane: laneOf.get(id) ?? null,
      row: rowOfPage.get(id) ?? null,
      section: entry.section?.id ?? null,
      shownWhen: shownWhenOf.get(id),
      why,
      needsFirst: entry.isHub
        ? []
        : platform.prerequisites.pagePrerequisites(id).map((name) => ({
            obligation: name,
            page: ownerOf(name)
          })),
      fulfils: entry.isHub ? [] : fulfilsOf(id),
      fieldConditions: entry.isHub ? [] : fieldConditionsOf(id),
      terminal: id === lastPage
    }
  })

  const reachedAfter = new Set(edges.map((edge) => edge.to))
  const unreachedPages = flowEntries
    .map(({ page }) => page.id)
    .filter(
      (id) =>
        id !== landing?.page.id &&
        (!reachedAfter.has(id) || shownWhenOf.get(id).kind === 'never')
    )

  const flowRoutes = new Set(routeOf.values())
  const outsideTheFlow = unique(
    inst.allRoutes
      .filter(
        (route) =>
          [route.method]
            .flat()
            .some((method) =>
              ['GET', '*'].includes(String(method).toUpperCase())
            ) && !flowRoutes.has(route.path)
      )
      .map((route) => route.path)
  )
    .toSorted((a, b) => a.localeCompare(b))
    .map((route) => {
      const title = titleOfRoute(titles, route)
      return {
        route,
        title:
          title ?? humanise(route.split('/').filter(Boolean).at(-1) ?? route),
        titleSource: title ? 'copy' : 'guessed'
      }
    })

  const proofs = proofsOf({
    platform,
    obligations,
    states,
    field,
    base,
    flowEntries,
    scopeOf,
    hasReady
  })

  const conditional = edges.filter(
    (edge) => edge.condition && edge.kind !== 'change'
  )
  return {
    schemaVersion: SCHEMA_VERSION,
    set,
    counts: {
      pages: pages.length,
      branches: conditional.length,
      decisions: decisions.length,
      obligations: obligations.length,
      fieldConditions: pages.reduce(
        (total, page) => total + page.fieldConditions.length,
        0
      ),
      unreachedPages: unreachedPages.length
    },
    decisions: decisions.map(({ id, obligation, question, page, values }) => ({
      id,
      obligation,
      question,
      page,
      values
    })),
    flags: flags.map(({ id, kind, question, values }) => ({
      id,
      kind,
      question,
      values
    })),
    lanes,
    pages,
    edges,
    ends: lastPage ? [lastPage] : [],
    unreachedPages,
    outsideTheFlow,
    unexplainedRules,
    proofs
  }
}

const laneTitle = (section, inst) => {
  const caption = section.pages[0]
    ? inst.platform.journeyFlow.journeySectionCaption(section.pages[0].id)
    : undefined
  return typeof caption === 'string' ? caption : humanise(section.id)
}

const lanesOf = (inst, { hasHub, hubCopy, rowIds, rowCondition }) => {
  const sectionPages = (section) => section.pages.map((page) => page.id)
  if (inst.groups.length === 0) {
    return inst.sections.map((section, index) => ({
      id: section.id,
      title: laneTitle(section, inst),
      rows: [],
      pages: [
        ...sectionPages(section),
        ...(index === 0 && hasHub ? [HUB_ID] : [])
      ]
    }))
  }
  const placed = new Set()
  const rowOf = (rowId) => {
    const taskRow = inst.taskRows.find((row) => row.id === rowId)
    const section = inst.sections.find((candidate) => candidate.id === rowId)
    const pages = taskRow
      ? taskRow.pages.map((page) => page.id)
      : section
        ? sectionPages(section)
        : []
    return {
      id: rowId,
      title: hubCopy?.rows?.[rowId]?.title ?? humanise(rowId),
      conditional: taskRow?.conditional === true,
      shownWhen: rowCondition(rowId),
      pages
    }
  }
  const first = inst.sections[0]
  const start = {
    id: 'start',
    title: 'Start',
    rows: [],
    pages: [...(first ? sectionPages(first) : []), ...(hasHub ? [HUB_ID] : [])]
  }
  start.pages.forEach((id) => placed.add(id))
  const groupLanes = inst.groups.map((group) => {
    const rows = group.rows.filter((rowId) => rowIds.includes(rowId)).map(rowOf)
    const pages = unique(rows.flatMap((row) => row.pages)).filter(
      (id) => !placed.has(id)
    )
    pages.forEach((id) => placed.add(id))
    return {
      id: group.id,
      title: hubCopy?.groups?.[group.id] ?? humanise(group.id),
      rows,
      pages
    }
  })
  const leftOver = inst.sections
    .map((section) => ({
      id: `section-${section.id}`,
      title: laneTitle(section, inst),
      rows: [],
      pages: sectionPages(section).filter((id) => !placed.has(id))
    }))
    .filter((lane) => lane.pages.length > 0)
  return [start, ...groupLanes, ...leftOver]
}

const fieldStatesOf = ({ field, base, states }) => {
  const chainOf = (obligation) =>
    obligation ? [...chainOf(obligation.within), obligation] : []
  const byGate = new Map()
  for (const { gate, meta } of field) {
    if (!byGate.has(gate.name)) {
      byGate.set(gate.name, { gate, values: [] })
    }
    byGate.get(gate.name).values.push(...gateValuesOf(meta))
  }
  const answers = []
  for (const { gate, values } of byGate.values()) {
    const groups = chainOf(gate.within)
    for (const value of unique(values)) {
      for (const state of states) {
        const nested = groups.reduceRight(
          (inner, group) => ({ [group.name]: [inner] }),
          { [gate.name]: value }
        )
        answers.push({ ...base, ...state.answers, ...nested })
      }
    }
  }
  return answers
}

const proofsOf = ({
  platform,
  obligations,
  states,
  field,
  base,
  flowEntries,
  scopeOf,
  hasReady
}) => {
  const witnesses = platform.reachability.proveWithWitnesses(obligations)
  const nameOf = new Map(
    obligations.map((obligation) => [obligation.id, obligation.name])
  )
  const answerStates = [
    ...states.map((state) => state.answers),
    ...fieldStatesOf({ field, base, states })
  ]
  const pagesFor = (answers) => {
    const shown = new Set()
    for (const ready of hasReady ? [false, true] : [undefined]) {
      const { scope } = scopeOf(answers, ready)
      for (const { page, section } of flowEntries) {
        if (
          platform.gates.sectionGatePasses(section, scope) &&
          platform.gates.pageGatePasses(page, scope)
        ) {
          shown.add(page.id)
        }
      }
    }
    return [...shown]
  }
  const flowProblems = platform.flowReachability.proveFlowReachability({
    answerStates,
    pagesFor
  })
  const unreachable = witnesses.unreachable.map((id) => nameOf.get(id) ?? id)
  return {
    dependencyGraph:
      unreachable.length === 0 && witnesses.errors.length === 0
        ? 'proved'
        : 'problems',
    unreachableObligations: unreachable,
    gateErrors: witnesses.errors.map((error) => ({
      obligation: nameOf.get(error.obligationId) ?? error.obligationId,
      reason: error.reason
    })),
    flowReachability: flowProblems.map((problem) => ({
      obligation: problem.obligation,
      page: problem.pageId ?? null,
      reason: problem.reason
    })),
    scopeCompleteness: platform.flowReachability.proveScopeCompleteness({
      answerStates
    })
  }
}

/**
 * Installs `setId` from `root` and builds its graph.
 *
 * @param {string} setId
 * @param {{ root?: string }} [options]
 * @returns {Promise<object>}
 */
export const buildGraph = async (setId, { root = REPO_ROOT } = {}) => {
  const inst = await installSet(setId, { root })
  const titles = await readFeatureIndex(inst.journeyDir)
  return inst.within(() => graphOf(inst, titles, setFacts(inst.setId, root)))
}

/** The graph as the bytes `service-map.json` holds. */
export const serialiseGraph = (graph) => `${JSON.stringify(graph, null, 2)}\n`
