import { SET_BASE } from '../app/sets/high-risk-plants/set.js'
import { createSeedClient } from './http-client.js'
import { resolveFields } from './resolve-fields.js'
import { HIGH_RISK_PLANTS_SCENARIOS } from './scenarios.js'

const HTTP_STATUS_FOUND = 302
const CREATE_URL = `${SET_BASE}/notifications`
const CHECK_ANSWERS_SLUG = 'notification-view'
const journeyUrl = (journeyId, slug) =>
  `${SET_BASE}/notifications/${journeyId}/${slug}`

const JOURNEY_ID_PATTERN = new RegExp(`^${SET_BASE}/notifications/([^/]+)/`)

const journeyIdFromRedirect = (response) => {
  const location = response.headers.location
  const match =
    typeof location === 'string' && location.match(JOURNEY_ID_PATTERN)
  if (!match) {
    throw new Error(
      `Seeding the high-risk-plants set expected a redirect carrying a journey id, got ${response.statusCode} ${location ?? ''}`
    )
  }
  return match[1]
}

const assertRedirected = (response, step) => {
  if (response.statusCode !== HTTP_STATUS_FOUND) {
    throw new Error(
      `Seeding the high-risk-plants set failed at "${step}": ${response.statusCode} ${response.result}`
    )
  }
}

/**
 * One seeded notification, driven through the real high-risk-plants routes —
 * the same `state.commit`/records calls a trader's own submission takes —
 * rather than written straight into the store, so it can never describe a
 * shape the journey itself would refuse to save.
 *
 * @returns {Promise<string>} the seeded notification's reference number.
 */
const runScenario = async (client, scenario) => {
  const created = await client.post(CREATE_URL, {})
  assertRedirected(created, 'start')
  const journeyId = journeyIdFromRedirect(created)

  for (const step of scenario.steps) {
    const response = await client.post(
      journeyUrl(journeyId, step.slug),
      resolveFields(step)
    )
    assertRedirected(response, step.slug)
  }

  if (scenario.submit) {
    assertRedirected(
      await client.post(journeyUrl(journeyId, CHECK_ANSWERS_SLUG), {}),
      CHECK_ANSWERS_SLUG
    )
    assertRedirected(
      await client.post(journeyUrl(journeyId, 'declaration'), {
        declaration: 'confirmed'
      }),
      'declaration'
    )
  }

  if (scenario.amend) {
    assertRedirected(
      await client.post(journeyUrl(journeyId, 'amend'), {}),
      'amend'
    )
  }

  return journeyId
}

/**
 * Seeds the high-risk-plants set's example notifications for one
 * organisation, signed in as it the same way `fit/sign-in.js` does.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} organisationId
 * @returns {Promise<string[]>} the seeded notifications' reference numbers.
 */
export const seedHighRiskPlantsFor = async (server, organisationId) => {
  const client = createSeedClient(server)
  await client.get(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
  // A GET before any POST, to confirm the session actually signed in and
  // rendered this set's dashboard before the seed starts writing to it.
  await client.get(SET_BASE)

  const journeyIds = []
  for (const scenario of HIGH_RISK_PLANTS_SCENARIOS) {
    journeyIds.push(await runScenario(client, scenario))
  }
  return journeyIds
}
