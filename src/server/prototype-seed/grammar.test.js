import { describe, expect, it } from 'vitest'

import {
  applyAnswers,
  ExampleGrammarError,
  statusOf,
  validateExamples
} from './grammar.js'

const DETAILS = 'commodities/details'
const WARE_POTATOES = 'ware-potatoes'

const walk = [
  { slug: 'commodity-type', fields: { commodityType: 'potatoes' } },
  { slug: DETAILS, fields: { category: WARE_POTATOES } },
  {
    slug: DETAILS,
    fields: { index: '0', category: WARE_POTATOES, quantity: '250' }
  },
  { slug: 'origin', fields: { countryOfOrigin: 'ES' } },
  {
    slug: 'arrival-details',
    fields: {
      arrivalDate: { daysFromToday: 7 },
      proposedPlaceOfLanding: 'GB DVR'
    }
  }
]

const pool = {
  'happy-path': {
    potatoes: { late: false, steps: walk },
    latePotatoes: { late: true, steps: walk }
  },
  extra: {
    potatoesToFelixstowe: {
      from: 'latePotatoes',
      answers: { 'arrival-details': { proposedPlaceOfLanding: 'GB FXT' } }
    },
    potatoes: { steps: walk }
  }
}

const SOURCE = 'src/server/prototype-seed/scenarios/test-set.js'

const check = (examples) => validateExamples(examples, { pool, source: SOURCE })

const problemsOf = (examples) => {
  try {
    check(examples)
  } catch (error) {
    expect(error).toBeInstanceOf(ExampleGrammarError)
    return error.problems
  }
  throw new Error('expected the examples to be refused')
}

describe('the example grammar', () => {
  it('Should turn a fixture into the walk the seed replays', () => {
    const [example] = check([
      {
        label: 'Submitted',
        slug: 'submitted',
        fixture: { file: 'happy-path', name: 'potatoes' },
        submit: true
      }
    ])

    expect(example).toMatchObject({
      slug: 'submitted',
      fixture: 'happy-path/potatoes',
      steps: walk,
      through: null,
      submit: true,
      organisationId: null,
      status: 'submitted'
    })
  })

  it('Should stop a walk before the page named in through', () => {
    const [example] = check([
      {
        label: 'At origin',
        slug: 'at-origin',
        fixture: 'latePotatoes',
        through: 'origin'
      }
    ])

    expect(example.steps.map((step) => step.slug)).toEqual([
      'commodity-type',
      DETAILS,
      DETAILS
    ])
    expect(example.through).toBe('origin')
    expect(example.status).toBe('draft')
  })

  it('Should change single answers without a new fixture', () => {
    const [example] = check([
      {
        label: 'From Cyprus',
        slug: 'from-cyprus',
        fixture: 'latePotatoes',
        answers: {
          origin: { countryOfOrigin: 'CY' },
          [DETAILS]: { quantity: '500' }
        }
      }
    ])

    expect(example.steps[3].fields).toEqual({ countryOfOrigin: 'CY' })
    // Only the step that already sends `quantity` changes.
    expect(example.steps[1].fields).toEqual({ category: WARE_POTATOES })
    expect(example.steps[2].fields.quantity).toBe('500')
  })

  it('Should use a named fixture layered over the happy path', () => {
    const [example] = check([
      {
        label: 'To Felixstowe',
        slug: 'to-felixstowe',
        fixture: 'potatoesToFelixstowe'
      }
    ])

    expect(example.steps.at(-1).fields.proposedPlaceOfLanding).toBe('GB FXT')
    expect(example.fixture).toBe('extra/potatoesToFelixstowe')
  })

  it('Should copy an earlier example’s whole walk, with its own changes on top', () => {
    const [, copied] = check([
      {
        label: 'Stopped early',
        slug: 'early',
        fixture: 'latePotatoes',
        through: 'origin'
      },
      {
        label: 'Copy',
        slug: 'copied',
        copy: 'early',
        answers: { origin: { countryOfOrigin: 'CY' } }
      }
    ])

    expect(copied.steps).toHaveLength(walk.length)
    expect(copied.steps[3].fields.countryOfOrigin).toBe('CY')
    expect(copied.copyOf).toBe('early')
    expect(copied.status).toBe('draft')
  })

  it('Should know what each kind of example ends up as', () => {
    expect(statusOf({ submit: true })).toBe('submitted')
    expect(statusOf({ submit: true, amend: true })).toBe('amended')
    expect(statusOf({ submit: true, amend: true, cancelAmend: true })).toBe(
      'submitted'
    )
    expect(statusOf({ delete: true })).toBe('deleted')
    expect(statusOf({})).toBe('draft')
  })

  it('Should keep an organisation on the example', () => {
    const [example] = check([
      {
        label: 'Theirs',
        slug: 'theirs',
        fixture: 'latePotatoes',
        organisationId: 'org-b'
      }
    ])

    expect(example.organisationId).toBe('org-b')
  })

  it('Should carry a story sentence, for the walkthrough report', () => {
    const [told, untold] = check([
      {
        label: 'Late',
        slug: 'late',
        fixture: 'latePotatoes',
        story: 'A trader whose potatoes arrived yesterday sends it late.'
      },
      { label: 'Plain', slug: 'plain', fixture: 'latePotatoes' }
    ])

    expect(told.story).toBe(
      'A trader whose potatoes arrived yesterday sends it late.'
    )
    expect(untold.story).toBeNull()
  })

  it('Should feature an example, with a headline that defaults to its label', () => {
    const [example] = check([
      {
        label: 'Submitted',
        slug: 'submitted',
        fixture: 'latePotatoes',
        featured: 1
      }
    ])

    expect(example.featured).toBe(1)
    expect(example.headline).toBe('Submitted')
  })

  it('Should use the given headline over the label', () => {
    const [example] = check([
      {
        label: 'Submitted',
        slug: 'submitted',
        fixture: 'latePotatoes',
        featured: 1,
        headline: 'Send a notification from start to finish'
      }
    ])

    expect(example.headline).toBe('Send a notification from start to finish')
  })

  it('Should leave an unfeatured example with no featured position', () => {
    const [example] = check([
      { label: 'Plain', slug: 'plain', fixture: 'latePotatoes' }
    ])

    expect(example.featured).toBeNull()
  })

  it('Should add a field a page never sent to that page’s last step', () => {
    const { steps, problems } = applyAnswers(walk, {
      [DETAILS]: { potatoVariety: 'Maris Piper' }
    })

    expect(problems).toEqual([])
    expect(steps[1].fields.potatoVariety).toBeUndefined()
    expect(steps[2].fields.potatoVariety).toBe('Maris Piper')
    expect(walk[2].fields.potatoVariety).toBeUndefined()
  })
})

describe('the example grammar, refusing examples written wrongly', () => {
  it('Should name every problem at once, each with its example', () => {
    const problems = problemsOf([
      { slug: 'no-label', fixture: 'latePotatoes' },
      { label: 'Bad slug', slug: 'Bad Slug', fixture: 'latePotatoes' }
    ])

    expect(problems).toEqual([
      "Example 1 has no label. Give it one, like label: 'Submitted late'.",
      expect.stringContaining("Example 2 ('Bad slug') needs a slug")
    ])
  })

  it('Should refuse a fixture that does not exist, listing the ones that do', () => {
    expect(
      problemsOf([{ label: 'Missing', slug: 'missing', fixture: 'nope' }])[0]
    ).toContain("names the fixture 'nope'")
  })

  it('Should ask which file when a fixture name is in two files', () => {
    expect(
      problemsOf([{ label: 'Both', slug: 'both', fixture: 'potatoes' }])[0]
    ).toContain(
      "Say which with fixture: { file: 'happy-path', name: 'potatoes' }"
    )
  })

  it('Should refuse a through page the walk never visits', () => {
    expect(
      problemsOf([
        {
          label: 'Nowhere',
          slug: 'nowhere',
          fixture: 'latePotatoes',
          through: 'hub'
        }
      ])[0]
    ).toContain("stops at 'hub', which this walk never visits")
  })

  it('Should refuse answers for a page the walk never visits', () => {
    expect(
      problemsOf([
        {
          label: 'Answers',
          slug: 'answers',
          fixture: 'latePotatoes',
          answers: { declaration: { declaration: 'confirmed' } }
        }
      ])[0]
    ).toContain("changes answers on the 'declaration' page")
  })

  it('Should refuse stopping on a page and submitting together', () => {
    expect(
      problemsOf([
        {
          label: 'Both',
          slug: 'both',
          fixture: 'latePotatoes',
          through: 'origin',
          submit: true
        }
      ])[0]
    ).toContain("both stops on a page ('through') and is submitted")
  })

  it('Should refuse an amendment that is never submitted, and a cancel that never amends', () => {
    expect(
      problemsOf([
        {
          label: 'Amend',
          slug: 'amend',
          fixture: 'latePotatoes',
          amend: true
        },
        {
          label: 'Cancel',
          slug: 'cancel',
          fixture: 'latePotatoes',
          submit: true,
          cancelAmend: true
        }
      ])
    ).toEqual([
      expect.stringContaining('amends a notification it never submits'),
      expect.stringContaining('cancels an amendment it never starts')
    ])
  })

  it('Should refuse a copy of an example that is not above it', () => {
    expect(
      problemsOf([{ label: 'Copy', slug: 'copy', copy: 'later' }])[0]
    ).toContain("copies 'later', which is not the slug of an example above it")
  })

  it('Should refuse a repeated slug and an unknown key', () => {
    expect(
      problemsOf([
        { label: 'One', slug: 'same', fixture: 'latePotatoes' },
        { label: 'Two', slug: 'same', fixture: 'latePotatoes', colour: 'red' }
      ])
    ).toEqual([
      expect.stringContaining("has 'colour', which an example cannot have"),
      expect.stringContaining(
        "uses the slug 'same', which another example already uses"
      )
    ])
  })

  it('Should refuse a story that is not text', () => {
    expect(
      problemsOf([
        { label: 'Story', slug: 'story', fixture: 'latePotatoes', story: 42 }
      ])[0]
    ).toContain('has a story that is not text')
  })

  it('Should say where the examples came from', () => {
    expect(() => check({})).toThrow(`The examples in ${SOURCE} need fixing`)
  })

  it('Should refuse a featured position outside 1 to 4', () => {
    expect(
      problemsOf([
        { label: 'Zero', slug: 'zero', fixture: 'latePotatoes', featured: 0 }
      ])[0]
    ).toContain(
      'has a featured position that is not a whole number from 1 to 4'
    )
  })

  it('Should refuse two examples that share one featured position', () => {
    expect(
      problemsOf([
        {
          label: 'First',
          slug: 'first',
          fixture: 'latePotatoes',
          featured: 1
        },
        {
          label: 'Second',
          slug: 'second',
          fixture: 'latePotatoes',
          featured: 1
        }
      ])[0]
    ).toContain("is featured at position 1, which 'First' already uses")
  })

  it('Should refuse more than 4 featured examples', () => {
    const examples = [1, 2, 3, 4].map((featured) => ({
      label: `Example ${featured}`,
      slug: `example-${featured}`,
      fixture: 'latePotatoes',
      featured
    }))
    examples.push({
      label: 'Fifth',
      slug: 'fifth',
      fixture: 'latePotatoes',
      featured: 5
    })

    expect(problemsOf(examples)).toContainEqual(
      'The examples feature 5: the demo page shows 4 at most, plus what happens when something is missing.'
    )
  })

  it('Should refuse a headline without a featured position', () => {
    expect(
      problemsOf([
        {
          label: 'Told',
          slug: 'told',
          fixture: 'latePotatoes',
          headline: 'A headline'
        }
      ])[0]
    ).toContain('gives a headline but is not featured')
  })

  it('Should refuse a headline that is not text', () => {
    expect(
      problemsOf([
        {
          label: 'Told',
          slug: 'told',
          fixture: 'latePotatoes',
          featured: 1,
          headline: 42
        }
      ])[0]
    ).toContain('has a headline that is not text')
  })
})
