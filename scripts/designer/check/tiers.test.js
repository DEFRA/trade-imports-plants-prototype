import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { STEP_TITLES, stepsFor, suggestTier } from './tiers.js'

const RELEASE = 'src/server/app/sets/plants-working/journeys/linear'

describe('stepsFor', () => {
  it('Should run the quick steps for a release', () => {
    expect(stepsFor('quick', 'plants-working')).toEqual([
      'tidy',
      'ownership',
      'copy',
      'copy-usage',
      'templates',
      'code-rules',
      'service-conformance',
      'gds-wording',
      'prototype-checks'
    ])
  })

  it("Should add the real journey's unit tests for high-risk-plants", () => {
    expect(stepsFor('quick', 'high-risk-plants')).toContain(
      'real-journey-tests'
    )
  })

  it('Should add the pre-commit hook steps for the full check', () => {
    expect(stepsFor('full', 'plants-working').slice(-3)).toEqual([
      'format-check',
      'lint',
      'unit-tests'
    ])
  })

  it('Should add the browser walk last', () => {
    expect(stepsFor('walk', 'plants-working').at(-1)).toBe('walk')
  })

  it('Should give every step a title', () => {
    for (const step of stepsFor('walk', 'high-risk-plants')) {
      expect(STEP_TITLES[step]).toEqual(expect.any(String))
    }
  })
})

describe('the full check matches the pre-commit hook', () => {
  it('Should run the same three commands the hook runs', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
    )

    expect(packageJson.scripts['git:pre-commit-hook']).toBe(
      'npm run format:check && npm run lint && npm test'
    )
  })
})

describe('suggestTier', () => {
  it('Should suggest quick for words and templates only', () => {
    expect(
      suggestTier([
        `${RELEASE}/features/origin/copy/copy.en.js`,
        `${RELEASE}/features/origin/copy/copy.cy.js`,
        `${RELEASE}/features/origin/template.njk`
      ]).tier
    ).toBe('quick')
  })

  it('Should suggest full when the flow or a controller changed', () => {
    const suggestion = suggestTier([
      `${RELEASE}/features/origin/copy/copy.en.js`,
      `${RELEASE}/flow/flow.js`
    ])

    expect(suggestion.tier).toBe('full')
    expect(suggestion.reason).toContain(`${RELEASE}/flow/flow.js`)
  })

  it('Should suggest quick when nothing changed', () => {
    expect(suggestTier([]).tier).toBe('quick')
  })
})
