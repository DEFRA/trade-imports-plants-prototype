/**
 * The answer states the service map walks, and the plain-English conditions
 * it writes for them. Pure: no engine, no files.
 *
 * A dimension is one thing the journey's routing depends on:
 *
 * - `decision`: an answer another obligation's gate reads, such as "What are
 *   you importing?", with its values in the order the page offers them;
 * - `ready`: whether every task is complete (read by a hand-written gate,
 *   such as the check your answers section's);
 * - `answered`: whether one question has been answered (read by a
 *   hand-written gate through `scope.answered()`).
 *
 * The states are every combination of every dimension's values. A condition
 * is the set of states in which something holds, minimised: a dimension
 * whose value never changes the outcome is dropped, and what is left is
 * written as values per dimension, in the order the page offers them.
 */
import { ServiceMapProblem } from './install-set.js'

/** More states than this and the map would be unreadable anyway. */
export const MAX_STATES = 256

/** The value a decision is given for "an answer no gate names". */
export const ANY_OTHER_ANSWER = '(any other answer)'

export const READY_FLAG = 'everyTaskComplete'

/** The dimension id for "has `name` been answered". */
export const answeredFlag = (name) => `answered:${name}`

const valueKey = (value) => JSON.stringify(value)

/**
 * Every combination of the dimensions' values, as `{ [dimensionId]: value }`
 * objects, in dimension order (the last dimension varies fastest).
 *
 * @param {Array<{ id: string, values: Array<{ value: unknown }> }>} dimensions
 * @returns {object[]}
 * @throws {ServiceMapProblem} when there would be more than MAX_STATES.
 */
export const statesOf = (dimensions) => {
  const size = dimensions.reduce((total, dim) => total * dim.values.length, 1)
  if (size > MAX_STATES) {
    throw new ServiceMapProblem(
      `The journey's pages depend on too many answers at once (${dimensions
        .map((dim) => dim.question ?? dim.id)
        .join(
          ', '
        )}): ${size} combinations, more than the ${MAX_STATES} a readable map can show.`
    )
  }
  return dimensions.reduce(
    (states, dim) =>
      states.flatMap((state) =>
        dim.values.map(({ value }) => ({ ...state, [dim.id]: value }))
      ),
    [{}]
  )
}

const keyWithout = (state, dimensions, skip) =>
  dimensions
    .filter((dim) => dim.id !== skip)
    .map((dim) => valueKey(state[dim.id]))
    .join('|')

const dependsOn = (dim, { states, dimensions, holds, cared }) => {
  const groups = new Map()
  for (const index of cared) {
    const key = keyWithout(states[index], dimensions, dim.id)
    const outcome = holds(index)
    if (!groups.has(key)) {
      groups.set(key, outcome)
    } else if (groups.get(key) !== outcome) {
      return true
    }
  }
  return false
}

const projectionKey = (state, dims) =>
  dims.map((dim) => valueKey(state[dim.id])).join('|')

const collides = (dims, { states, holds, cared }) => {
  const seen = new Map()
  for (const index of cared) {
    const key = projectionKey(states[index], dims)
    const outcome = holds(index)
    if (seen.has(key) && seen.get(key) !== outcome) {
      return true
    }
    seen.set(key, outcome)
  }
  return false
}

const relevantDimensions = (context) => {
  const { dimensions } = context
  const relevant = dimensions.filter((dim) => dependsOn(dim, context))
  // Two dimensions can each look irrelevant on their own where some states
  // are "don't care"; add dimensions back, in order, until the projection
  // says one thing per combination.
  for (const dim of dimensions) {
    if (!collides(relevant, context)) {
      break
    }
    if (!relevant.includes(dim)) {
      relevant.push(dim)
    }
  }
  return dimensions.filter((dim) => relevant.includes(dim))
}

const domainIndex = (dim, value) =>
  dim.values.findIndex((option) => valueKey(option.value) === valueKey(value))

const sortValues = (dim, values) =>
  [...values].toSorted((a, b) => domainIndex(dim, a) - domainIndex(dim, b))

const differsInOne = (a, b, dims) => {
  const differing = dims.filter(
    (dim) =>
      valueKey(sortValues(dim, a[dim.id])) !==
      valueKey(sortValues(dim, b[dim.id]))
  )
  return differing.length === 1 ? differing[0] : null
}

const clauseKey = (clause, dims) =>
  dims.map((dim) => valueKey(sortValues(dim, clause[dim.id]))).join('|')

const contains = (outer, inner, dims) =>
  dims.every((dim) =>
    inner[dim.id].every((value) =>
      outer[dim.id].some((other) => valueKey(other) === valueKey(value))
    )
  )

/**
 * The fewest clauses that cover exactly the given one-value clauses: every
 * widest clause two narrower ones can be joined into (joined when they
 * differ in one answer only, so no clause ever covers a state outside the
 * set), then the widest first until every state is covered.
 */
const mergeClauses = (clauses, dims) => {
  const all = new Map(
    clauses.map((clause) => [clauseKey(clause, dims), clause])
  )
  let frontier = [...all.values()]
  while (frontier.length > 0) {
    const next = []
    const known = [...all.values()]
    for (const a of frontier) {
      for (const b of known) {
        const dim = a === b ? null : differsInOne(a, b, dims)
        if (dim) {
          const joined = {
            ...a,
            [dim.id]: sortValues(dim, [
              ...new Map(
                [...a[dim.id], ...b[dim.id]].map((value) => [
                  valueKey(value),
                  value
                ])
              ).values()
            ])
          }
          const key = clauseKey(joined, dims)
          if (!all.has(key)) {
            all.set(key, joined)
            next.push(joined)
          }
        }
      }
    }
    frontier = next
  }
  const widest = [...all.values()].filter(
    (clause) =>
      ![...all.values()].some(
        (other) =>
          other !== clause &&
          contains(other, clause, dims) &&
          clauseKey(other, dims) !== clauseKey(clause, dims)
      )
  )
  const size = (clause) =>
    dims.reduce((total, dim) => total * clause[dim.id].length, 1)
  const uncovered = [...clauses]
  const chosen = []
  while (uncovered.length > 0) {
    const best = widest
      .map((clause) => ({
        clause,
        covers: uncovered.filter((tuple) => contains(clause, tuple, dims))
          .length
      }))
      .toSorted(
        (a, b) => b.covers - a.covers || size(b.clause) - size(a.clause)
      )[0]
    chosen.push(best.clause)
    for (let index = uncovered.length - 1; index >= 0; index -= 1) {
      if (contains(best.clause, uncovered[index], dims)) {
        uncovered.splice(index, 1)
      }
    }
  }
  return withoutOverlaps(chosen, clauses, dims)
}

/**
 * Narrows each chosen clause by any value whose states another clause
 * already covers, so no state is said twice ("Potatoes and every task is
 * complete; or Wood", not "Potatoes or Wood and every task is complete; or
 * Wood").
 */
const withoutOverlaps = (chosen, tuples, dims) => {
  const result = chosen.map((clause) => ({ ...clause }))
  result.forEach((clause, index) => {
    for (const dim of dims) {
      for (const value of [...clause[dim.id]]) {
        if (clause[dim.id].length === 1) {
          break
        }
        const narrowed = { ...clause, [dim.id]: [value] }
        const others = result.filter((_, other) => other !== index)
        const coveredElsewhere = tuples
          .filter((tuple) => contains(narrowed, tuple, dims))
          .every((tuple) =>
            others.some((other) => contains(other, tuple, dims))
          )
        if (coveredElsewhere) {
          clause[dim.id] = clause[dim.id].filter(
            (kept) => valueKey(kept) !== valueKey(value)
          )
        }
      }
    }
  })
  return result
}

const withoutFullDomains = (clause, dims) =>
  Object.fromEntries(
    dims
      .filter((dim) => clause[dim.id].length < dim.values.length)
      .map((dim) => [dim.id, sortValues(dim, clause[dim.id])])
  )

const clauseOrder = (dims) => (a, b) => {
  for (const dim of dims) {
    const left = a[dim.id] ? domainIndex(dim, a[dim.id][0]) : -1
    const right = b[dim.id] ? domainIndex(dim, b[dim.id][0]) : -1
    if (left !== right) {
      return left - right
    }
  }
  return 0
}

const labelOf = (dim, value) =>
  dim.values.find((option) => valueKey(option.value) === valueKey(value))
    ?.label ?? String(value)

const quoted = (text) => `“${text}”`

const partWhen = (dim, values) => {
  if (dim.kind === 'ready') {
    return values[0] ? 'every task is complete' : 'not every task is complete'
  }
  if (dim.kind === 'answered') {
    return values[0]
      ? `${quoted(dim.question)} is answered`
      : `${quoted(dim.question)} is not answered yet`
  }
  return `${quoted(dim.question)} is ${values
    .map((value) => quoted(labelOf(dim, value)))
    .join(' or ')}`
}

/**
 * A condition's words, without "If": `“What are you importing?” is
 * “Potatoes (seed or ware)”`. Clauses are joined by "; or", the parts of one
 * clause by "and".
 *
 * @param {Array<Record<string, unknown[]>>} clauses
 * @param {object[]} dimensions
 * @returns {string}
 */
export const whenText = (clauses, dimensions) =>
  clauses
    .map((clause) =>
      dimensions
        .filter((dim) => clause[dim.id])
        .map((dim) => partWhen(dim, clause[dim.id]))
        .join(' and ')
    )
    .join('; or ')

/**
 * The condition under which `holds` is true, over the states `applies` is
 * true for (the rest are "don't care").
 *
 * @param {object} input
 * @param {object[]} input.states - from statesOf.
 * @param {object[]} input.dimensions
 * @param {(index: number) => boolean} input.holds
 * @param {(index: number) => boolean} [input.applies]
 * @returns {{ kind: 'always' } | { kind: 'never' } | { kind: 'values',
 *   when: string, text: string, clauses: object[], values?: object }}
 */
export const conditionOver = ({
  states,
  dimensions,
  holds,
  applies = () => true
}) => {
  const cared = states.map((_, index) => index).filter(applies)
  const yes = cared.filter(holds)
  if (yes.length === 0) {
    return { kind: 'never' }
  }
  if (yes.length === cared.length) {
    return { kind: 'always' }
  }
  const dims = relevantDimensions({ states, dimensions, holds, cared })
  const unique = new Map()
  for (const index of yes) {
    const state = states[index]
    const key = projectionKey(state, dims)
    if (!unique.has(key)) {
      unique.set(
        key,
        Object.fromEntries(dims.map((dim) => [dim.id, [state[dim.id]]]))
      )
    }
  }
  const clauses = mergeClauses([...unique.values()], dims)
    .map((clause) => withoutFullDomains(clause, dims))
    .filter((clause) => Object.keys(clause).length > 0)
    .toSorted(clauseOrder(dims))
  if (clauses.length === 0) {
    return { kind: 'always' }
  }
  const when = whenText(clauses, dimensions)
  return {
    kind: 'values',
    when,
    text: `If ${when}`,
    clauses,
    ...(clauses.length === 1 ? { values: clauses[0] } : {})
  }
}

/** A condition, or null when it always holds. */
export const conditionOrNull = (condition) =>
  condition.kind === 'always' ? null : condition

/**
 * A condition marked as depending on a rule the map cannot read: the states
 * it holds in are kept, but the words say so plainly.
 */
export const opaqueCondition = (condition) => ({
  ...condition,
  kind: 'opaque',
  when: 'a rule in the page’s code allows it',
  text: 'If a rule in the page’s code allows it'
})
