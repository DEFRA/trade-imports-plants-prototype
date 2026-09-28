/**
 * A set's example journeys: the scenarios in its
 * journeys/linear/flow/fixtures/happy-path.json. Every scenario is a list of
 * `{ slug, fields }` steps, the exact answers a trader would give on each
 * page. `designer:show` and the designer-sets FIT walk both replay them, so
 * neither ever describes an answer the journey itself would refuse.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const FIXTURE_PATH = 'journeys/linear/flow/fixtures/happy-path.json'

/** The happy-path fixture file for a set folder. */
export const fixtureFileOf = (setFolder) => path.join(setFolder, FIXTURE_PATH)

/**
 * The scenarios of a set, in the order the fixture lists them:
 * `[{ name, useCase, late, steps }]`. An empty list when the set has no
 * fixture (sample-journey, for example).
 */
export const readScenarios = (setFolder) => {
  const file = fixtureFileOf(setFolder)
  if (!existsSync(file)) {
    return []
  }
  const fixture = JSON.parse(readFileSync(file, 'utf8'))
  return Object.entries(fixture).map(([name, shape]) => ({
    name,
    ...shape,
    steps: Array.isArray(shape.steps) ? shape.steps : []
  }))
}

const formatDate = (date) =>
  `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`

/**
 * A step's fields ready to submit. A relative date such as
 * `{ "daysFromToday": 7 }` becomes a real "d/m/yyyy" date counted from
 * `today`, so the fixture stays valid tomorrow. Every other value is sent as
 * a string, the way a browser sends it.
 */
export const resolveStepFields = (step, today = new Date()) => {
  const fields = {}
  for (const [name, value] of Object.entries(step.fields ?? {})) {
    if (
      typeof value === 'object' &&
      value !== null &&
      'daysFromToday' in value
    ) {
      const date = new Date(today)
      date.setDate(date.getDate() + Number(value.daysFromToday))
      fields[name] = formatDate(date)
    } else {
      fields[name] = String(value)
    }
  }
  return fields
}

/** The path of a page inside one notification. */
export const journeyPath = (setBase, journeyId, slug) =>
  slug
    ? `${setBase}/notifications/${journeyId}/${slug}`
    : `${setBase}/notifications/${journeyId}`

/**
 * The notification id out of a path such as
 * `/plants-working/notifications/abc123/origin?x=1`, or null.
 */
export const journeyIdOfPath = (setBase, pathname) => {
  const prefix = `${setBase}/notifications/`
  if (typeof pathname !== 'string' || !pathname.startsWith(prefix)) {
    return null
  }
  const [id] = pathname.slice(prefix.length).split(/[/?#]/)
  return id || null
}
