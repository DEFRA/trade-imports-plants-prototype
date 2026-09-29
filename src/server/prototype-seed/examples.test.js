import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeEach, describe, expect, it } from 'vitest'

import { exampleSourceFor, loadExamples } from './examples.js'
import { happyPathFileFor, loadFixturePool } from './fixtures.js'
import { defaultExamples } from './scenarios/default.js'
import { examples as highRiskPlantsExamples } from './scenarios/high-risk-plants.js'
import { hasSeeder, seederFor } from './index.js'

const REAL_HAPPY_PATH = fileURLToPath(
  new URL(
    '../app/sets/high-risk-plants/journeys/linear/flow/fixtures/happy-path.json',
    import.meta.url
  )
)

const RELEASE = 'plants-release-test'
const HIGH_RISK_PLANTS = 'high-risk-plants'
const SAMPLE_JOURNEY = 'sample-journey'
const DRAFT_MIDWAY = 'draft-midway'

/** A throwaway tree shaped like the repo: a set with the real happy path,
 * an empty scenarios folder and an empty named-fixtures folder. */
const scaffold = () => {
  const root = mkdtempSync(join(tmpdir(), 'prototype-seed-'))
  const folders = {
    appSets: join(root, 'sets'),
    scenarios: join(root, 'scenarios'),
    namedFixtures: join(root, 'fixtures')
  }
  const happyPath = happyPathFileFor(RELEASE, folders.appSets)
  mkdirSync(join(happyPath, '..'), { recursive: true })
  writeFileSync(happyPath, readFileSync(REAL_HAPPY_PATH))
  mkdirSync(folders.scenarios)
  // Scenario files are ES modules, as they are under the repo's package.json.
  writeFileSync(join(folders.scenarios, 'package.json'), '{ "type": "module" }')
  mkdirSync(folders.namedFixtures)
  return folders
}

describe('which examples a set has', () => {
  describe('seederFor', () => {
    it('Should seed high-risk-plants from its own scenario file', () => {
      expect(exampleSourceFor(HIGH_RISK_PLANTS)).toBe('scenarios')
      expect(seederFor(HIGH_RISK_PLANTS)).toBeTypeOf('function')
    })

    it('Should seed nothing for a set with no happy path and no scenario file', () => {
      expect(exampleSourceFor(SAMPLE_JOURNEY)).toBeNull()
      expect(seederFor(SAMPLE_JOURNEY)).toBeUndefined()
      expect(hasSeeder(SAMPLE_JOURNEY)).toBe(false)
    })

    it('Should refuse anything that is not a set id', () => {
      expect(exampleSourceFor('../high-risk-plants')).toBeNull()
      expect(exampleSourceFor('default')).toBeNull()
      expect(hasSeeder(undefined)).toBe(false)
    })
  })

  describe('a design release with a happy path and no scenario file', () => {
    let folders

    beforeEach(() => {
      folders = scaffold()
    })

    it('Should fall back to the default examples, with a late one from the late fixture', () => {
      expect(exampleSourceFor(RELEASE, folders)).toBe('default')

      const examples = loadExamples(RELEASE, folders)

      expect(
        examples.map(({ slug, status, through }) => ({ slug, status, through }))
      ).toEqual([
        {
          slug: 'draft-just-started',
          status: 'draft',
          through: 'commodities/details'
        },
        {
          slug: DRAFT_MIDWAY,
          status: 'draft',
          through: 'destinations/select'
        },
        { slug: 'submitted', status: 'submitted', through: null },
        { slug: 'amended', status: 'amended', through: null },
        { slug: 'submitted-late', status: 'submitted', through: null }
      ])
    })

    it('Should use the release’s own scenario file once it has one', () => {
      writeFileSync(
        join(folders.scenarios, `${RELEASE}.js`),
        "export const examples = [{ label: 'Late', slug: 'late', fixture: 'warePotatoesLate', submit: true }]\n"
      )

      expect(exampleSourceFor(RELEASE, folders)).toBe('scenarios')
      expect(loadExamples(RELEASE, folders).map(({ slug }) => slug)).toEqual([
        'late'
      ])
    })

    it('Should name the scenario file when an example in it is wrong', () => {
      writeFileSync(
        join(folders.scenarios, `${RELEASE}.js`),
        "export const examples = [{ label: 'Wrong', slug: 'wrong', fixture: 'noSuchFixture' }]\n"
      )

      expect(() => loadExamples(RELEASE, folders)).toThrow(
        `The examples in src/server/prototype-seed/scenarios/${RELEASE}.js need fixing`
      )
    })

    it('Should read the release’s named fixtures alongside its happy path', () => {
      mkdirSync(join(folders.namedFixtures, RELEASE))
      writeFileSync(
        join(folders.namedFixtures, RELEASE, 'extra.json'),
        JSON.stringify({
          seedPotatoesToFelixstowe: {
            from: 'seedPotatoes',
            answers: { 'arrival-details': { proposedPlaceOfLanding: 'GB FXT' } }
          }
        })
      )
      writeFileSync(
        join(folders.scenarios, `${RELEASE}.js`),
        "export const examples = [{ label: 'Felixstowe', slug: 'felixstowe', fixture: 'seedPotatoesToFelixstowe' }]\n"
      )

      const [example] = loadExamples(RELEASE, folders)

      expect(Object.keys(loadFixturePool(RELEASE, folders))).toEqual([
        'happy-path',
        'extra'
      ])
      expect(
        example.steps.find((step) => step.slug === 'arrival-details').fields
          .proposedPlaceOfLanding
      ).toBe('GB FXT')
    })
  })

  describe(HIGH_RISK_PLANTS, () => {
    it('Should give a copy of high-risk-plants the same first four examples', () => {
      const defaults = defaultExamples(loadFixturePool(HIGH_RISK_PLANTS))

      expect(
        defaults.map(({ slug, fixture, through, submit, amend }) => ({
          slug,
          fixture: fixture.name,
          through,
          submit,
          amend
        }))
      ).toEqual(
        highRiskPlantsExamples
          .slice(0, defaults.length)
          .map(({ slug, fixture, through, submit, amend }) => ({
            slug,
            fixture,
            through,
            submit,
            amend
          }))
      )
    })

    it('Should load every high-risk-plants example without a problem', () => {
      expect(loadExamples(HIGH_RISK_PLANTS).map(({ slug }) => slug)).toEqual(
        highRiskPlantsExamples.map(({ slug }) => slug)
      )
    })
  })

  describe('featured journeys', () => {
    it('Should mark the default examples 1, 2 and 3, with a headline each', () => {
      const defaults = loadExamples(RELEASE, scaffold())

      expect(
        defaults
          .filter((example) => example.featured !== null)
          .map(({ slug, featured, headline }) => ({ slug, featured, headline }))
      ).toEqual([
        {
          slug: DRAFT_MIDWAY,
          featured: 2,
          headline: 'Save a notification and come back to it later'
        },
        {
          slug: 'submitted',
          featured: 1,
          headline: 'Send a notification from start to finish'
        },
        {
          slug: 'amended',
          featured: 3,
          headline: 'Change a notification after sending it'
        }
      ])
    })

    it('Should mark high-risk-plants’ own four featured examples', () => {
      const featured = loadExamples(HIGH_RISK_PLANTS)
        .filter((example) => example.featured !== null)
        .map(({ slug, featured: position }) => ({ slug, featured: position }))

      expect(featured).toEqual([
        { slug: DRAFT_MIDWAY, featured: 2 },
        { slug: 'submitted', featured: 1 },
        { slug: 'amended', featured: 3 },
        { slug: 'copied', featured: 4 }
      ])
    })
  })
})
