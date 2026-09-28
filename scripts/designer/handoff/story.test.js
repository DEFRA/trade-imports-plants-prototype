import { describe, expect, it } from 'vitest'

import {
  copyCriteria,
  CriteriaError,
  exampleLinks,
  parseCriteria,
  recipeDocPath,
  recipesFor,
  testsToAdd
} from './story.js'

describe('parseCriteria', () => {
  it('Should read each criterion as a block of Given, When and Then lines', () => {
    const text = [
      '# Drafted by Claude, confirmed by the designer',
      'Scenario: The plants were grown under glass',
      'Given I am on the reason for import page',
      'when I choose "Yes" for grown under glass',
      'Then I go to the next page',
      '',
      'Given I have not answered the question',
      'When I continue',
      'Then I see "Select yes if the plants were grown under glass"',
      'And the error summary links to the question'
    ].join('\n')

    expect(parseCriteria(text)).toEqual([
      {
        title: 'The plants were grown under glass',
        steps: [
          { keyword: 'Given', text: 'I am on the reason for import page' },
          { keyword: 'When', text: 'I choose "Yes" for grown under glass' },
          { keyword: 'Then', text: 'I go to the next page' }
        ]
      },
      {
        title: null,
        steps: [
          { keyword: 'Given', text: 'I have not answered the question' },
          { keyword: 'When', text: 'I continue' },
          {
            keyword: 'Then',
            text: 'I see "Select yes if the plants were grown under glass"'
          },
          { keyword: 'And', text: 'the error summary links to the question' }
        ]
      }
    ])
  })

  it('Should refuse a line that is not Given, When, Then, And or But', () => {
    expect(() => parseCriteria('Given a page\nThe user sees it')).toThrow(
      new CriteriaError(
        'Line 2 of the criteria file does not start with Given, When, Then, And or But: "The user sees it"'
      )
    )
  })

  it('Should refuse a criterion with no Then', () => {
    expect(() => parseCriteria('Given a page\nWhen I continue')).toThrow(
      'Acceptance criterion 1 has no "Then" line.'
    )
  })

  it('Should refuse an empty file', () => {
    expect(() => parseCriteria('# nothing yet\n')).toThrow(
      'has no acceptance criteria in it'
    )
  })
})

describe('copyCriteria', () => {
  const pages = [
    {
      feature: 'arrival-details',
      slugs: ['arrival-details'],
      copy: [
        {
          language: 'en',
          key: 'time.hint',
          before: 'Use the 24-hour clock. For example, 14:30.',
          after: 'Use the 24-hour clock, for example 14:30.'
        },
        { language: 'en', key: 'time.extra', before: 'Gone', after: null },
        {
          language: 'cy',
          key: 'time.hint',
          before: 'Hen',
          after: '[Welsh needed] Use the 24-hour clock, for example 14:30.'
        }
      ]
    }
  ]

  it('Should write one criterion per changed English string, and one for the Welsh', () => {
    const scenarios = copyCriteria(pages, () => 'Arrival details')

    expect(scenarios).toHaveLength(3)
    expect(scenarios[0].steps).toEqual([
      { keyword: 'Given', text: 'I am on the Arrival details page' },
      { keyword: 'When', text: 'the page shows the words for {{time.hint}}' },
      {
        keyword: 'Then',
        text: 'they read "Use the 24-hour clock, for example 14:30."'
      }
    ])
    expect(scenarios[1].steps[2].text).toBe('those words are no longer shown')
    expect(scenarios[2].steps[2].text).toBe(
      'they are in Welsh, with no [Welsh needed] marker left'
    )
  })
})

const REAL_FEATURES =
  'src/server/app/sets/high-risk-plants/journeys/linear/features'

const report = (overrides = {}) => ({
  recipes: [],
  pages: [],
  gateChanges: [],
  journeyFlow: { rows: [] },
  validation: [],
  servicesToBuild: [],
  testImpact: [],
  ...overrides
})

const NEW_PAGE = {
  feature: 'transporter',
  slugs: ['transporter'],
  files: [
    { path: `${REAL_FEATURES}/transporter/controller.js`, status: 'added' }
  ],
  copy: []
}

describe('recipesFor', () => {
  it('Should work out add-a-page for a new page and keep named recipes first', () => {
    expect(
      recipesFor(report({ recipes: ['add-a-field'], pages: [NEW_PAGE] }))
    ).toEqual({ named: ['add-a-field'], inferred: ['add-a-page'] })
  })

  it('Should work out journey-flow-and-gates when the order changes', () => {
    expect(
      recipesFor(report({ journeyFlow: { rows: [{ order: 'x' }] } })).inferred
    ).toEqual(['journey-flow-and-gates'])
  })
})

describe('recipeDocPath', () => {
  it.each([
    [
      'add-a-field',
      'plants-frontend',
      'src/server/app/sets/high-risk-plants/docs/add-a-field.md'
    ],
    ['move-a-page', 'plants-prototype', 'docs/designers/recipes/move-a-page.md']
  ])('Should find where %s is written down', (recipe, repo, docPath) => {
    expect(recipeDocPath(recipe)).toEqual({ repo, path: docPath })
  })
})

describe('testsToAdd', () => {
  it('Should ask for the unit, copy, contract and browser tests of a new page', () => {
    const [first] = testsToAdd(report({ pages: [NEW_PAGE] }))

    expect(first).toContain(
      `{{${REAL_FEATURES}/transporter/controller.test.js}}`
    )
    expect(first).toContain('{{src/server/app/contract.test.js}}')
    expect(first).toContain(
      `{{${REAL_FEATURES}/transporter/transporter.fit.spec.js}}`
    )
    expect(first).toContain('axe on the first render and the error state')
  })

  it('Should ask for a service test that mocks the network', () => {
    const items = testsToAdd(
      report({
        servicesToBuild: [
          { name: 'transporters', dir: 'src/server/app/services/transporters' }
        ]
      })
    )

    expect(items[0]).toBe(
      "Service transporters: {{src/server/app/services/transporters/transporters.test.js}} covering the stub's behaviour and client.js's wire mapping, with the network mocked by nock (as the address book's tests do)."
    )
  })

  it('Should always end with the checks the testing guide asks for', () => {
    expect(testsToAdd(report()).at(-1)).toContain(
      '{{PORT=3053 npm run test:fit:features}}'
    )
  })
})

describe('exampleLinks', () => {
  const examples = [
    { slug: 'other-org', organisationId: 'org-2' },
    { slug: 'stopped', through: 'origin' },
    { slug: 'complete' }
  ]

  it('Should link each changed page through an example any organisation can open', () => {
    expect(
      exampleLinks('http://localhost:3103', 'plants-working', examples, [
        'arrival-details',
        'consignors/select'
      ])
    ).toEqual([
      {
        page: 'arrival-details',
        example: 'complete',
        url: 'http://localhost:3103/examples/plants-working/complete?page=arrival-details'
      },
      {
        page: 'consignors/select',
        example: 'complete',
        url: 'http://localhost:3103/examples/plants-working/complete?page=consignors/select'
      }
    ])
  })

  it('Should give no links for a release with no examples', () => {
    expect(exampleLinks('http://x', 'set', [], ['origin'])).toEqual([])
  })
})
