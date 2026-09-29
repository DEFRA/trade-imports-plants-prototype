import { findFixture } from './fixtures.js'

/**
 * The shape of one example, checked when the examples load so a mistake is
 * reported in plain English before any page is replayed.
 *
 *   {
 *     label: 'Submitted late',            what the designer calls it
 *     slug: 'submitted-late',             its stable id, used in example links
 *     fixture: 'warePotatoesLate',        or { file: 'extra', name: '…' }
 *     through: 'origin',                  stop on this page, leaving it to fill in
 *                                         (no through and no submit: every page
 *                                         answered, ready to check and submit)
 *     answers: {                          change single answers in the fixture
 *       'arrival-details': { proposedPlaceOfLanding: 'GB FXT' }
 *     },
 *     submit: true,                       send it (check answers, declaration)
 *     amend: true,                        then start an amendment
 *     cancelAmend: true,                  then cancel the amendment
 *     delete: true,                       then delete it
 *     copy: 'submitted',                  start from another example's answers
 *     organisationId: 'example-organisation-b',  made by, and shown to, this
 *                                         organisation only
 *     story: 'A trader whose potatoes arrived yesterday sends the
 *             notification late.'         why the example exists, in one or
 *                                         two plain sentences. The seed ignores
 *                                         it; the walkthrough report shows it
 *     featured: 1,                        on the demo page, in this position
 *                                         (1 = first). At most 4 per set; the
 *                                         seed ignores it
 *     headline: 'Send a notification      the demo page's title for it.
 *       from start to finish'             Defaults to `label`. The seed
 *                                         ignores it
 *   }
 *
 * Every example is also a story in the walkthrough report
 * (fit/walkthroughs/): its label is the story's name, so write it for
 * someone who has never seen the prototype. `featured` and `headline` choose
 * what the stakeholder demo page shows first (docs/designers/example-data.md,
 * "Featured journeys").
 */

export const EXAMPLE_KEYS = Object.freeze([
  'label',
  'slug',
  'fixture',
  'through',
  'answers',
  'submit',
  'amend',
  'cancelAmend',
  'delete',
  'copy',
  'organisationId',
  'story',
  'featured',
  'headline'
])

const ACTIONS = Object.freeze(['submit', 'amend', 'cancelAmend', 'delete'])

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_FEATURED = 4

export const DRAFT = 'draft'
export const SUBMITTED = 'submitted'
export const AMENDED = 'amended'
export const DELETED = 'deleted'

/** An example list that cannot be used, with every problem found in it. */
export class ExampleGrammarError extends Error {
  constructor(source, problems) {
    const lines = problems.map((problem) => '- ' + problem).join('\n')
    super(`The examples in ${source} need fixing:\n${lines}`)
    this.name = 'ExampleGrammarError'
    this.problems = problems
  }
}

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const nameOf = (raw, index) =>
  isText(raw?.label)
    ? `Example ${index + 1} ('${raw.label}')`
    : `Example ${index + 1}`

const isAnswerValue = (value) =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  (isPlainObject(value) && Number.isInteger(value.daysFromToday))

/**
 * The fixture's steps with single answers changed.
 *
 * A field is changed on every step for that page that already sends it; a
 * field the page never sent is added to the last step for that page. A page the
 * walk never visits is a problem, because the answer would never be sent.
 *
 * @param {object[]} steps - the walk, `{ slug, fields }` per page.
 * @param {object} answers - new answers by page slug, then field.
 * @returns {{ steps: object[], problems: string[] }} the changed walk.
 */
const pagesVisited = (steps) =>
  [...new Set(steps.map((step) => step.slug))].join(', ')

const setAnswer = (forPage, field, value) => {
  const sending = forPage.filter((step) =>
    Object.hasOwn(step.fields ?? {}, field)
  )
  for (const step of sending.length > 0 ? sending : forPage.slice(-1)) {
    step.fields = { ...step.fields, [field]: value }
  }
}

const answerPage = (changed, slug, fields) => {
  const forPage = changed.filter((step) => step.slug === slug)
  if (forPage.length === 0) {
    return [
      `changes answers on the '${slug}' page, which this walk never visits. It visits: ${pagesVisited(changed)}`
    ]
  }
  if (!isPlainObject(fields)) {
    return [`gives answers for '${slug}' that are not { field: value } pairs`]
  }
  const problems = []
  for (const [field, value] of Object.entries(fields)) {
    if (isAnswerValue(value)) {
      setAnswer(forPage, field, value)
    } else {
      problems.push(
        `gives '${field}' on '${slug}' a value that is not text, a number or { daysFromToday: n }`
      )
    }
  }
  return problems
}

export const applyAnswers = (steps, answers) => {
  const changed = structuredClone(steps)
  const problems = Object.entries(answers ?? {}).flatMap(([slug, fields]) =>
    answerPage(changed, slug, fields)
  )
  return { steps: changed, problems }
}

const stepsOfFixture = (pool, found) => {
  const { fixture } = found
  if (Array.isArray(fixture?.steps)) {
    return { steps: fixture.steps, late: fixture.late === true }
  }
  if (isText(fixture?.from)) {
    const base = findFixture(pool, fixture.from)
    if (base.problem || !Array.isArray(base.fixture?.steps)) {
      return {
        problem: `uses the fixture '${found.name}', whose 'from' names '${fixture.from}', which is not a fixture with steps`
      }
    }
    const { steps, problems } = applyAnswers(
      base.fixture.steps,
      fixture.answers
    )
    return problems.length > 0
      ? { problem: `uses the fixture '${found.name}', which ${problems[0]}` }
      : { steps, late: base.fixture.late === true }
  }
  return {
    problem: `uses the fixture '${found.name}', which has neither 'steps' nor 'from'`
  }
}

const unknownKeyProblems = (raw) =>
  Object.keys(raw)
    .filter((key) => !EXAMPLE_KEYS.includes(key))
    .map(
      (key) =>
        `has '${key}', which an example cannot have. It can have: ${EXAMPLE_KEYS.join(', ')}`
    )

const identityProblems = (raw, slugsSoFar) => {
  const problems = []
  if (!isText(raw.label)) {
    problems.push("has no label. Give it one, like label: 'Submitted late'")
  }
  const slugOk = isText(raw.slug) && SLUG_PATTERN.test(raw.slug)
  if (!slugOk) {
    problems.push(
      "needs a slug of lower-case words joined by hyphens, like slug: 'submitted-late'. It is the example's stable link"
    )
  }
  if (slugOk && slugsSoFar.has(raw.slug)) {
    problems.push(
      `uses the slug '${raw.slug}', which another example already uses`
    )
  }
  if (raw.organisationId !== undefined && !isText(raw.organisationId)) {
    problems.push(
      "has an organisationId that is not text, like organisationId: 'example-organisation-b'"
    )
  }
  if (raw.story !== undefined && !isText(raw.story)) {
    problems.push(
      "has a story that is not text. Write one or two plain sentences, like story: 'A trader whose potatoes arrived yesterday sends the notification late.'"
    )
  }
  return problems
}

const featuredProblems = (raw, usedFeatured) => {
  const problems = []
  if (raw.featured !== undefined) {
    const inRange =
      Number.isInteger(raw.featured) &&
      raw.featured >= 1 &&
      raw.featured <= MAX_FEATURED
    if (!inRange) {
      problems.push(
        `has a featured position that is not a whole number from 1 to ${MAX_FEATURED}, like featured: 1`
      )
    } else if (usedFeatured.has(raw.featured)) {
      problems.push(
        `is featured at position ${raw.featured}, which '${usedFeatured.get(raw.featured)}' already uses`
      )
    } else {
      usedFeatured.set(raw.featured, raw.label ?? 'this example')
    }
  }
  if (raw.headline !== undefined) {
    if (!isText(raw.headline)) {
      problems.push(
        "has a headline that is not text, like headline: 'Send a notification from start to finish'"
      )
    }
    if (raw.featured === undefined) {
      problems.push(
        'gives a headline but is not featured, so the headline would never show'
      )
    }
  }
  return problems
}

const actionProblems = (raw) => {
  const problems = ACTIONS.filter(
    (action) => raw[action] !== undefined && typeof raw[action] !== 'boolean'
  ).map((action) => `sets ${action} to something other than true or false`)
  if (raw.amend && !raw.submit) {
    problems.push('amends a notification it never submits. Add submit: true')
  }
  if (raw.cancelAmend && !raw.amend) {
    problems.push(
      'cancels an amendment it never starts. Add amend: true (and submit: true)'
    )
  }
  if (raw.through !== undefined && (raw.submit || raw.amend)) {
    problems.push(
      "both stops on a page ('through') and is submitted. Choose one: an example that stops part way is a draft"
    )
  }
  return problems
}

/**
 * Where the example's walk comes from: its own fixture, or a copy of an
 * earlier example's walk.
 */
const walkOf = (raw, { pool, earlier }) => {
  if (raw.copy !== undefined && raw.fixture !== undefined) {
    return {
      problem:
        "has both 'fixture' and 'copy'. A copy takes its answers from the example it copies, so remove 'fixture'"
    }
  }
  if (raw.copy !== undefined) {
    const source = earlier.get(raw.copy)
    return source
      ? {
          steps: source.walk,
          late: source.late,
          fixture: source.fixture,
          copyOf: raw.copy
        }
      : {
          problem: `copies '${raw.copy}', which is not the slug of an example above it`
        }
  }
  if (raw.fixture === undefined) {
    return {
      problem:
        "has no fixture. Name one from the set's happy path, like fixture: 'warePotatoes'"
    }
  }
  const found = findFixture(pool, raw.fixture)
  if (found.problem) {
    return { problem: found.problem }
  }
  const walk = stepsOfFixture(pool, found)
  return walk.problem
    ? walk
    : { ...walk, fixture: `${found.file}/${found.name}`, copyOf: null }
}

const cutAt = (steps, through) => {
  if (through === undefined) {
    return { steps }
  }
  const stop = steps.findIndex((step) => step.slug === through)
  if (stop === -1) {
    return {
      problem: `stops at '${through}', which this walk never visits. It visits: ${pagesVisited(steps)}`
    }
  }
  return { steps: steps.slice(0, stop) }
}

/**
 * What the notification will be once the example has been made.
 *
 * @param {object} example - a checked example.
 * @returns {string} `draft`, `submitted`, `amended` or `deleted`.
 */
export const statusOf = (example) => {
  if (example.delete) {
    return DELETED
  }
  if (example.amend && !example.cancelAmend) {
    return AMENDED
  }
  return example.submit ? SUBMITTED : DRAFT
}

const checkOne = (raw, context) => {
  if (!isPlainObject(raw)) {
    return { problems: ['is not a { ... } object'] }
  }
  const problems = [
    ...unknownKeyProblems(raw),
    ...identityProblems(raw, context.earlier),
    ...actionProblems(raw),
    ...featuredProblems(raw, context.usedFeatured)
  ]
  const walk = walkOf(raw, context)
  if (walk.problem) {
    return { problems: [...problems, walk.problem] }
  }
  const answered = applyAnswers(walk.steps, raw.answers)
  problems.push(...answered.problems)
  const cut = cutAt(answered.steps, raw.through)
  if (cut.problem) {
    problems.push(cut.problem)
  }
  if (problems.length > 0) {
    return { problems }
  }
  const example = {
    label: raw.label,
    slug: raw.slug,
    fixture: walk.fixture,
    copyOf: walk.copyOf,
    late: walk.late,
    walk: answered.steps,
    steps: cut.steps,
    through: raw.through ?? null,
    submit: raw.submit === true,
    amend: raw.amend === true,
    cancelAmend: raw.cancelAmend === true,
    delete: raw.delete === true,
    organisationId: raw.organisationId ?? null,
    story: raw.story ?? null,
    featured: raw.featured ?? null,
    headline: raw.headline ?? raw.label
  }
  return { problems, example: { ...example, status: statusOf(example) } }
}

/**
 * Checks a set's examples and turns each into the walk the seed replays.
 *
 * @param {unknown} raw - the `examples` list a scenario file exports.
 * @param {object} context
 * @param {Record<string, Record<string, object>>} context.pool - the set's
 * fixtures, from `loadFixturePool`.
 * @param {string} context.source - where the examples came from, for messages.
 * @returns {object[]} the checked examples, in order.
 * @throws {ExampleGrammarError} naming every problem at once.
 */
export const validateExamples = (raw, { pool, source }) => {
  if (!Array.isArray(raw)) {
    throw new ExampleGrammarError(source, [
      'The file must export a list: export const examples = [ { … }, { … } ]'
    ])
  }
  const earlier = new Map()
  const usedFeatured = new Map()
  const problems = []
  raw.forEach((item, index) => {
    const checked = checkOne(item, { pool, earlier, usedFeatured })
    for (const problem of checked.problems) {
      problems.push(`${nameOf(item, index)} ${problem}.`)
    }
    // A refused example still claims its slug, so a repeat is still caught.
    const slug = checked.example?.slug ?? (isText(item?.slug) && item.slug)
    if (slug) {
      earlier.set(slug, checked.example)
    }
  })
  const declaredFeatured = raw.filter(
    (item) => isPlainObject(item) && item.featured !== undefined
  ).length
  if (declaredFeatured > MAX_FEATURED) {
    problems.push(
      `The examples feature ${declaredFeatured}: the demo page shows ${MAX_FEATURED} at most, plus what happens when something is missing.`
    )
  }
  if (problems.length > 0) {
    throw new ExampleGrammarError(source, problems)
  }
  return [...earlier.values()]
}
