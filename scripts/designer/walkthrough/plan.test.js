import { describe, expect, it } from 'vitest'

import {
  BROKEN_STORY_NAME,
  ERROR_STORY_HEADLINE,
  ERROR_STORY_NAME,
  ERROR_STORY_SLUG,
  FALLBACK_HEADLINE,
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
  featured: null,
  headline: null,
  ...overrides
})

// Featured 1, 2, 3, in file order, so the featured-first sort keeps the same
// order as before featured existed: the tests below can still read top to
// bottom as "in order" while proving the featured fields are carried too.
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
      steps: WALK.slice(0, 1),
      featured: 1,
      headline: 'Start a notification'
    }),
    example({
      story: 'A trader sends the notification.',
      featured: 2,
      headline: 'Send a notification from start to finish'
    }),
    example({
      label: 'Another organisation’s',
      slug: 'another-organisation',
      organisationId: 'example-organisation-b',
      featured: 3,
      headline: 'Another organisation’s'
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

    // Neither example is featured on purpose, so the first one falls back to
    // featured 1 and sorts ahead of the second, with the error story between
    // them (see "Should feature the first example when nothing is featured").
    expect(set.stories.map((story) => story.name)).toEqual([
      'Submitted (submitted)',
      ERROR_STORY_NAME,
      'Submitted (submitted-again)'
    ])
  })

  it('Should feature the first example that submits when nothing is featured on purpose', () => {
    const [set] = planWalkthroughs({
      sets: [
        {
          ...release,
          examples: [
            example({ slug: 'a', label: 'A' }),
            example({ slug: 'b', label: 'B' })
          ]
        }
      ]
    })

    expect(set.stories[0]).toMatchObject({
      slug: 'a',
      featured: 1,
      headline: FALLBACK_HEADLINE
    })
    expect(set.stories.find((story) => story.slug === 'b')).toMatchObject({
      featured: null
    })
  })

  it('Should default a featured example’s headline to its label', () => {
    const [set] = planWalkthroughs({
      sets: [
        {
          ...release,
          examples: [example({ featured: 1, headline: null })]
        }
      ]
    })

    expect(set.stories[0].headline).toBe('Submitted')
  })

  it('Should put featured stories first, in position order, then the rest in file order', () => {
    const [set] = planWalkthroughs({
      sets: [
        {
          ...release,
          examples: [
            example({ slug: 'first-in-file', featured: null }),
            example({ slug: 'featured-two', featured: 2 }),
            example({ slug: 'second-in-file', featured: null }),
            example({ slug: 'featured-one', featured: 1 })
          ]
        }
      ]
    })

    expect(set.stories.map((story) => story.slug)).toEqual([
      'featured-one',
      'featured-two',
      ERROR_STORY_SLUG,
      'first-in-file',
      'second-in-file'
    ])
  })

  it('Should feature the error story one place after the highest featured position', () => {
    const [set] = planWalkthroughs({
      sets: [
        {
          ...release,
          examples: [example({ featured: 3, headline: 'Third' })]
        }
      ]
    })

    const errors = set.stories.find((story) => story.kind === 'errors')
    expect(errors).toMatchObject({
      featured: 4,
      headline: ERROR_STORY_HEADLINE
    })
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
