import { createRequire } from 'node:module'
import {
  createPath,
  dashboardPath,
  pagePath
} from '../../src/server/app/shared/paths.js'
import { seedFields } from '../../fit/seed-fields.js'
const happyPaths = createRequire(import.meta.url)(
  '../../src/server/app/sets/high-risk-plants/journeys/linear/flow/fixtures/happy-path.json'
)

const HTTP_FOUND = 302
const HTTP_OK = 200

const DECLARATION_SLUG = 'declaration'
const CONFIRMATION_SLUG = 'confirmation'
const DECLARATION_VALUE = 'confirmed'

// The browser smoke and Lighthouse seed the same five complete use cases.
export const SEED_SHAPES = happyPaths

const fieldsFor = (step, page) => {
  const fields = seedFields(step)
  // The real address book has generated ids; use a rendered choice there.
  // In stub mode the fixture's named party is available and stays selected.
  for (const name of ['placeOfDestination', 'consignor', 'contactAddress']) {
    if (fields[name]) {
      const choices = page.$(`input[type="radio"][name="${name}"]`)
      const matching = choices.filter(
        (index, input) => page.$(input).attr('value') === fields[name]
      )
      fields[name] = (matching.length ? matching : choices)
        .first()
        .attr('value')
      if (!fields[name]) {
        throw new Error(`Seed step ${step.slug} has no address to select`)
      }
    }
  }
  return fields
}

export const journeyIdIn = (location) => {
  const prefix = `${createPath()}/`
  if (!location?.startsWith(prefix)) {
    return ''
  }
  return location.slice(prefix.length).split(/[/?#]/)[0]
}

export const createNotification = async (client) => {
  const dashboard = await client.document(dashboardPath())
  const created = await client.submit(createPath(), {}, dashboard.crumb)
  const journeyId = journeyIdIn(created.location)
  if (created.status !== HTTP_FOUND || !journeyId) {
    throw new Error(
      `Could not create a notification (status ${created.status}, location ${created.location})`
    )
  }
  return journeyId
}

export const fillNotification = async (client, journeyId, shape) => {
  for (const step of shape.steps) {
    const path = pagePath(journeyId, step.slug)
    const page = await client.document(path)
    if (page.status !== HTTP_OK) {
      throw new Error(`Seed step ${step.slug} did not render (${page.status})`)
    }
    const posted = await client.submit(path, fieldsFor(step, page), page.crumb)
    if (posted.status !== HTTP_FOUND) {
      throw new Error(
        `Seed step ${step.slug} was rejected (${posted.status}) — the page's ` +
          'fields have moved on from what this seed sends'
      )
    }
  }
}

export const submitNotification = async (client, journeyId) => {
  const path = pagePath(journeyId, DECLARATION_SLUG)
  const page = await client.document(path)
  const posted = await client.submit(
    path,
    { declaration: DECLARATION_VALUE },
    page.crumb
  )
  const confirmation = pagePath(journeyId, CONFIRMATION_SLUG)
  if (posted.location !== confirmation) {
    throw new Error(
      `Declaration did not submit the notification (went to ${posted.location}, ` +
        `expected ${confirmation})`
    )
  }
}
