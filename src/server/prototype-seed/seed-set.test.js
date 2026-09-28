import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createServer } from '../server.js'
import {
  AMEND,
  DELETED,
  DRAFT,
  records,
  SUBMITTED
} from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { copy as originCopy } from '../app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js'
import { createSeedClient } from './http-client.js'
import { loadExamples } from './examples.js'
import { validateExamples } from './grammar.js'
import { loadFixturePool } from './fixtures.js'
import { clearSeeded, recordExamples, recordSeeded } from './registry.js'
import { checkExamples, seedExample, seedSet } from './seed-set.js'

const SET_ID = 'high-risk-plants'
const DASHBOARD = `/${SET_ID}`
const VISITOR_ORGANISATION = 'visiting-organisation'
const OTHER_ORGANISATION = 'example-organisation-b'

const signedInClient = async (server, organisationId) => {
  const client = createSeedClient(server)
  await client.get(`/auth/stub-sign-in?organisationId=${organisationId}`)
  return client
}

const statusOf = async (journeyId) =>
  (await withSetContext(SET_ID, () => records.load({ journeyId })))?.status

/** The part of the dashboard that is one notification's card: from its
 * reference in the card title to the next card's title. */
const cardFor = (html, journeyId) => {
  const start = html.indexOf(journeyId)
  const next = html.indexOf('govuk-summary-card__title', start)
  return html.slice(start, next === -1 ? undefined : next)
}

describe('making a set’s examples by replaying its real pages', () => {
  let server
  let made
  const bySlug = (slug) => made.find((example) => example.slug === slug)

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    made = await seedSet(server, SET_ID)
    recordExamples(SET_ID, made)
    recordSeeded(
      SET_ID,
      made
        .filter(
          (example) =>
            example.organisationId === null && example.status !== 'deleted'
        )
        .map((example) => example.journeyId)
    )
  })

  afterAll(async () => {
    clearSeeded(SET_ID)
    await server.stop({ timeout: 0 })
  })

  it('Should make every example in the set’s scenario file, each with its stable slug', () => {
    expect(made.map((example) => example.slug)).toEqual(
      loadExamples(SET_ID).map((example) => example.slug)
    )
    expect(new Set(made.map((example) => example.journeyId)).size).toBe(
      made.length
    )
  })

  it('Should stop a draft on the page named in through, and that page should open', async () => {
    const example = bySlug('draft-just-started')
    const visitor = await signedInClient(server, VISITOR_ORGANISATION)

    const page = await visitor.get(example.href)

    expect(example.href).toBe(
      `${DASHBOARD}/notifications/${example.journeyId}/commodities/details`
    )
    expect(example.stopAt).toBe('commodities/details')
    expect(await statusOf(example.journeyId)).toBe(DRAFT)
    expect(page.statusCode).toBe(200)
  })

  it('Should submit and amend through the real check answers, declaration and amend routes', async () => {
    expect(await statusOf(bySlug('submitted').journeyId)).toBe(SUBMITTED)
    expect(bySlug('submitted').stopAt).toBe('confirmation')
    expect(await statusOf(bySlug('amended').journeyId)).toBe(AMEND)
  })

  it('Should show a late example’s late state on the dashboard', async () => {
    const late = bySlug('submitted-late')
    const onTime = bySlug('submitted')
    const visitor = await signedInClient(server, VISITOR_ORGANISATION)

    const dashboard = await visitor.get(DASHBOARD)

    expect(await statusOf(late.journeyId)).toBe(SUBMITTED)
    expect(cardFor(dashboard.result, late.journeyId)).toContain(
      'govuk-tag--red'
    )
    expect(cardFor(dashboard.result, onTime.journeyId)).not.toContain(
      'govuk-tag--red'
    )
  })

  it('Should cancel an amendment through the cancel-amend route, back to submitted', async () => {
    const example = bySlug('amendment-cancelled')

    expect(await statusOf(example.journeyId)).toBe(SUBMITTED)
    expect(example.href).toBe(
      `${DASHBOARD}/notifications/${example.journeyId}/notification-view?cancelled=1`
    )
  })

  it('Should delete through the delete route, landing on the dashboard’s deleted banner', async () => {
    const example = bySlug('deleted')

    expect(await statusOf(example.journeyId)).toBe(DELETED)
    expect(example.href).toBe(`${DASHBOARD}?deleted=1`)
    expect(example.stopAt).toBe('dashboard')
  })

  it('Should make a copy as a new draft with the copied answers and its own changes', async () => {
    const copied = bySlug('copied')
    const visitor = await signedInClient(server, VISITOR_ORGANISATION)

    const checkAnswers = await visitor.get(
      `${DASHBOARD}/notifications/${copied.journeyId}/notification-view`
    )

    expect(copied.journeyId).not.toBe(bySlug('submitted').journeyId)
    expect(await statusOf(copied.journeyId)).toBe(DRAFT)
    expect(checkAnswers.result).toContain('Felixstowe Port')
  })

  it('Should make another organisation’s example signed in to that organisation', async () => {
    const theirs = bySlug('another-organisation')
    const shared = bySlug('submitted')
    const them = await signedInClient(server, OTHER_ORGANISATION)
    const visitor = await signedInClient(server, VISITOR_ORGANISATION)

    const theirDashboard = await them.get(DASHBOARD)
    const visitorDashboard = await visitor.get(DASHBOARD)

    expect(theirs.organisationId).toBe(OTHER_ORGANISATION)
    expect(await statusOf(theirs.journeyId)).toBe(SUBMITTED)
    expect(theirDashboard.result).toContain(theirs.journeyId)
    expect(theirDashboard.result).toContain(shared.journeyId)
    expect(visitorDashboard.result).not.toContain(theirs.journeyId)
    expect(visitorDashboard.result).toContain(shared.journeyId)
  })

  describe('an example a page refuses', () => {
    const badOrigin = () =>
      validateExamples(
        [
          {
            label: 'Bad origin',
            slug: 'bad-origin',
            fixture: 'warePotatoes',
            answers: { origin: { countryOfOrigin: 'ZZ' } }
          }
        ],
        { pool: loadFixturePool(SET_ID), source: 'this test' }
      )

    it('Should say which page stopped it and what the page said', async () => {
      const [example] = badOrigin()

      await expect(seedExample(server, SET_ID, example)).rejects.toThrow(
        `Example 'Bad origin' stopped at origin: the page said '${originCopy.errors.countryRequired}'`
      )
    })

    it('Should report it and carry on with the rest when checking', async () => {
      const [bad] = badOrigin()
      const [good] = loadExamples(SET_ID)

      const results = await checkExamples(server, SET_ID, [bad, good])

      expect(results[0].stopped).toBe(
        `Example 'Bad origin' stopped at origin: the page said '${originCopy.errors.countryRequired}'`
      )
      expect(results[1].made.slug).toBe(good.slug)
    })
  })
})
