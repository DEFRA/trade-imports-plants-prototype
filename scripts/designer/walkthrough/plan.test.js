import { describe, expect, it } from 'vitest'

import {
  BROKEN_STORY_NAME,
  ERROR_STORY_NAME,
  onlySetsFrom,
  planWalkthroughs,
  readSets,
  setTitle,
  slugOf,
  unknownSets
} from './plan.js'

const WALK = [
  { slug: 'commodity-type', fields: { commodityType: 'potatoes' } },
  { slug: 'origin', fields: { countryOfOrigin: 'ES' } }
]

const example = (overrides) => ({
  label: 'Submitted',
  slug: 'submitted',
  fixture: 'happy-path/seedPotatoes',
  useCase: 'Seed potatoes from the Netherlands',
  steps: WALK,
  through: null,
  submit: true,
  amend: false,
  cancelAmend: false,
  delete: false,
  organisationId: null,
  story: null,
  ...overrides
})

const realJourney = {
  id: 'high-risk-plants',
  release: { kind: 'real-journey' },
  hasHappyPath: true,
  scenarios: [{ name: 'seedPotatoes', useCase: 'Seed potatoes', steps: WALK }],
  examples: [
    example({
      label: 'Draft, just started',
      slug: 'draft-just-started',
      through: 'origin',
      submit: false,
      steps: WALK.slice(0, 1)
    }),
    example({ story: 'A trader sends the notification.' }),
    example({
      label: 'Another organisation’s',
      slug: 'another-organisation',
      organisationId: 'example-organisation-b'
    })
  ]
}

const release = {
  id: 'plants-working',
  release: { kind: 'release', title: 'Working release' },
  hasHappyPath: true,
  scenarios: [],
  examples: [example({})]
}

const placeholder = {
  id: 'sample-journey',
  release: { kind: 'placeholder' },
  hasHappyPath: false,
  scenarios: [],
  examples: []
}

describe('planWalkthroughs', () => {
  it('Should walk the real journey first, then each release, and never the placeholder', () => {
    const plan = planWalkthroughs({ sets: [release, placeholder, realJourney] })

    expect(plan.map(({ setId, title }) => [setId, title])).toEqual([
      ['high-risk-plants', 'The real journey (high-risk-plants)'],
      ['plants-working', 'Working release (plants-working)']
    ])
  })

  it('Should make one story per example, in order, then the error-messages story', () => {
    const [set] = planWalkthroughs({ sets: [realJourney] })

    expect(set.stories.map((story) => [story.kind, story.name])).toEqual([
      ['example', 'Draft, just started'],
      ['example', 'Submitted'],
      ['example', 'Another organisation’s'],
      ['errors', ERROR_STORY_NAME]
    ])
  })

  it('Should tell each story with its own sentence, or else the fixture’s use case', () => {
    const [set] = planWalkthroughs({ sets: [realJourney] })

    expect(set.stories[1].story).toBe('A trader sends the notification.')
    expect(set.stories[0].story).toBe('Seed potatoes from the Netherlands')
  })

  it('Should carry what each example does and who made it', () => {
    const [set] = planWalkthroughs({ sets: [realJourney] })

    expect(set.stories[0]).toMatchObject({
      slug: 'draft-just-started',
      through: 'origin',
      submit: false,
      fixture: 'happy-path/seedPotatoes',
      madeBy: null
    })
    expect(set.stories[2].madeBy).toBe('example-organisation-b')
  })

  it('Should show the error messages on the first example that answers every page', () => {
    const [set] = planWalkthroughs({ sets: [realJourney] })

    expect(set.stories.at(-1).steps).toEqual(WALK)
  })

  it('Should fall back to the first scenario for the error messages when every example stops part way', () => {
    const [set] = planWalkthroughs({
      sets: [{ ...realJourney, examples: [realJourney.examples[0]] }]
    })

    expect(set.stories.at(-1)).toMatchObject({
      kind: 'errors',
      steps: WALK,
      fixture: 'happy-path/seedPotatoes'
    })
  })

  it('Should make one story per scenario when a set has scenarios but no examples', () => {
    const [set] = planWalkthroughs({
      sets: [{ ...realJourney, examples: [] }]
    })

    expect(set.stories[0]).toMatchObject({
      kind: 'example',
      name: 'Seed potatoes',
      slug: 'seed-potatoes',
      submit: true
    })
  })

  it('Should turn examples that cannot be read into one story that says why', () => {
    const [set] = planWalkthroughs({
      sets: [
        {
          ...release,
          examples: [],
          examplesProblem: 'The examples in x need fixing'
        }
      ]
    })

    expect(set.stories).toEqual([
      {
        kind: 'broken',
        name: BROKEN_STORY_NAME,
        slug: 'broken',
        message: 'The examples in x need fixing'
      }
    ])
  })

  it('Should give two examples with the same label different names', () => {
    const [set] = planWalkthroughs({
      sets: [
        {
          ...release,
          examples: [example({}), example({ slug: 'submitted-again' })]
        }
      ]
    })

    expect(set.stories.map((story) => story.name)).toEqual([
      'Submitted (submitted)',
      'Submitted (submitted-again)',
      ERROR_STORY_NAME
    ])
  })

  it('Should walk only the sets asked for', () => {
    const plan = planWalkthroughs({
      sets: [realJourney, release],
      only: ['plants-working']
    })

    expect(plan.map((set) => set.setId)).toEqual(['plants-working'])
  })
})

describe('unknownSets', () => {
  it('Should name every set asked for that cannot be walked', () => {
    expect(
      unknownSets(
        [realJourney, placeholder],
        ['high-risk-plants', 'sample-journey', 'nope']
      )
    ).toEqual(['sample-journey', 'nope'])
  })
})

describe('onlySetsFrom', () => {
  it.each([
    [undefined, null],
    ['', null],
    ['plants-working', ['plants-working']],
    [' a , b ,', ['a', 'b']]
  ])('Should read %j as %j', (value, expected) => {
    expect(onlySetsFrom(value)).toEqual(expected)
  })
})

describe('setTitle', () => {
  it('Should name a release made before it had a title after its id', () => {
    expect(setTitle('plants-research', { kind: 'release' })).toBe(
      'Plants research (plants-research)'
    )
  })
})

describe('slugOf', () => {
  it('Should turn a scenario name into a slug', () => {
    expect(slugOf('warePotatoesLate')).toBe('ware-potatoes-late')
  })
})

describe('readSets', () => {
  it('Should read the real journey’s examples from this checkout, each with its use case', () => {
    const sets = readSets()
    const real = sets.find((set) => set.id === 'high-risk-plants')

    expect(real.hasHappyPath).toBe(true)
    expect(real.examplesProblem).toBeUndefined()
    expect(real.examples.length).toBeGreaterThan(0)
    expect(real.examples[0].useCase).toEqual(expect.any(String))
    expect(sets.find((set) => set.id === 'sample-journey').hasHappyPath).toBe(
      false
    )
  })
})
