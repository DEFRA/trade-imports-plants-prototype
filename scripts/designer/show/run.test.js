import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeFixtureRepo } from '../lib/test-support.js'
import { parseShowArgs } from './options.js'
import {
  CHOOSER_KEY,
  ShowProblem,
  addressesFor,
  countPictures,
  galleryKeys,
  nothingChangedMessage,
  planShow
} from './run.js'

const FEATURES = 'src/server/app/sets/plants-working/journeys/linear/features'
const FIXTURE =
  'src/server/app/sets/plants-working/journeys/linear/flow/fixtures/happy-path.json'

const optionsFrom = (argv) => {
  const { options, problems } = parseShowArgs(argv)
  expect(problems).toEqual([])
  return options
}

const runWith = (names) => ({
  run: { results: new Map(names.map((name) => [name, {}])) }
})

describe('addressesFor', () => {
  it('Should keep the chooser when it is named beside all', () => {
    const options = optionsFrom([
      '--set',
      'plants-working',
      '--pages',
      'all,dashboard,chooser'
    ])

    expect(addressesFor(options)).toEqual([{ key: CHOOSER_KEY, address: '/' }])
  })

  it('Should list the chooser, each example link and each address, in that order', () => {
    const options = optionsFrom([
      '--set',
      'plants-working',
      '--pages',
      'chooser,origin',
      '--examples',
      'submitted,amended',
      '--url',
      '?status=submitted'
    ])
    expect(addressesFor(options)).toEqual([
      { key: CHOOSER_KEY, address: '/' },
      {
        key: 'example:submitted',
        address: '/examples/plants-working/submitted'
      },
      { key: 'example:amended', address: '/examples/plants-working/amended' },
      { key: '?status=submitted', address: '?status=submitted' }
    ])
  })

  it('Should list nothing when only journey pages are asked for', () => {
    expect(
      addressesFor(
        optionsFrom(['--set', 'plants-working', '--pages', 'origin'])
      )
    ).toEqual([])
  })
})

describe('galleryKeys', () => {
  it('Should keep the plain name of a page no example photographed separately', () => {
    expect(
      galleryKeys(['origin', 'hub'], [runWith(['origin', 'hub'])], [])
    ).toEqual(['origin', 'hub'])
  })

  it('Should swap a page for its one-per-example names, each once', () => {
    const runs = [
      runWith(['origin@potatoes', 'origin@plants', 'hub']),
      runWith(['origin@potatoes'])
    ]
    expect(galleryKeys(['origin', 'hub'], runs, [])).toEqual([
      'origin@potatoes',
      'origin@plants',
      'hub'
    ])
  })

  it('Should put every extra address after the pages', () => {
    expect(
      galleryKeys(
        ['origin'],
        [runWith(['origin'])],
        [
          { key: CHOOSER_KEY, address: '/' },
          {
            key: 'example:submitted',
            address: '/examples/plants-working/submitted'
          }
        ]
      )
    ).toEqual(['origin', CHOOSER_KEY, 'example:submitted'])
  })
})

describe('countPictures', () => {
  it('Should count every picture except the Figma frames put beside them', () => {
    const manifest = {
      pages: [
        {
          captures: [
            { variant: 'now' },
            { variant: 'before' },
            { variant: 'reference' }
          ]
        },
        { captures: [{ variant: 'compare' }] },
        { captures: [] }
      ]
    }
    expect(countPictures(manifest)).toBe(3)
  })
})

describe('nothingChangedMessage', () => {
  it('Should say how to name pages when nothing unsaved shows on a page', () => {
    const message = nothingChangedMessage(
      optionsFrom(['--set', 'plants-working', '--before'])
    )
    expect(message).toContain(
      'None of your changes show on a page in plants-working'
    )
    expect(message).toContain('--pages all')
    expect(message).toContain('--before-commit HEAD~1')
  })

  it('Should show how to compare named pages after a save', () => {
    const message = nothingChangedMessage(
      optionsFrom(['--set', 'plants-working', '--compare', 'high-risk-plants'])
    )
    expect(message).toContain('--pages <pages> --compare high-risk-plants')
    expect(message).not.toContain('--before-commit')
  })
})

describe('planShow', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo()
    fixture.write(
      FIXTURE,
      `${JSON.stringify({
        potatoes: {
          steps: [
            { slug: 'origin', fields: {} },
            { slug: 'arrival-details', fields: {} }
          ]
        }
      })}\n`
    )
    fixture.write('designs/origin.png', 'not really a picture')
  })
  afterAll(() => fixture.cleanup())

  const plan = (argv) => planShow(optionsFrom(argv), { root: fixture.root })

  const refusal = async (argv) => {
    const error = await plan(argv).catch((caught) => caught)
    expect(error).toBeInstanceOf(ShowProblem)
    return error.message
  }

  it('Should ask for a set and name one that is not the placeholder', async () => {
    const message = await refusal([])
    expect(message).toContain('Say which set to show')
    expect(message).toContain('--set high-risk-plants')
    expect(message).toContain('sample-journey')
  })

  it('Should refuse a set that does not exist, and list the ones that do', async () => {
    expect(await refusal(['--set', 'plants-nope'])).toBe(
      'There is no set called "plants-nope". The sets are: high-risk-plants, plants-dr2, plants-working, sample-journey.'
    )
  })

  it('Should refuse a --compare set that does not exist', async () => {
    expect(
      await refusal([
        '--set',
        'plants-working',
        '--pages',
        'origin',
        '--compare',
        'plants-old'
      ])
    ).toContain('There is no set called "plants-old"')
  })

  it('Should refuse a page the set does not have, and list its pages', async () => {
    expect(
      await refusal(['--set', 'plants-working', '--pages', 'transport'])
    ).toBe(
      'There is no page called "transport" in plants-working. Its pages are: dashboard, origin, arrival-details, hub, notification-view, confirmation.'
    )
  })

  it('Should refuse a reference for a page the set does not have', async () => {
    expect(
      await refusal([
        '--set',
        'plants-working',
        '--reference',
        'transport=designs/origin.png'
      ])
    ).toContain(
      '--reference names a page "transport" that plants-working does not have'
    )
  })

  it('Should refuse a reference image that cannot be found', async () => {
    expect(
      await refusal([
        '--set',
        'plants-working',
        '--reference',
        'origin=designs/missing.png'
      ])
    ).toContain('Cannot find the reference image designs/missing.png')
  })

  it('Should put named pages in journey order, whatever order they were asked for in', async () => {
    const planned = await plan([
      '--set',
      'plants-working',
      '--pages',
      'confirmation,task-list,origin'
    ])
    expect(planned.wanted).toEqual(['origin', 'hub', 'confirmation'])
    expect(planned.addresses).toEqual([])
    expect(planned.plan.hub).toBe(true)
    expect(planned.plan.unreached).toEqual([])
  })

  it('Should show every page for --pages all', async () => {
    const planned = await plan(['--set', 'plants-working', '--pages', 'all'])
    expect(planned.wanted).toEqual([
      'dashboard',
      'origin',
      'arrival-details',
      'hub',
      'notification-view',
      'confirmation'
    ])
  })

  it('Should add the page a reference is for, and find the image beside the prototype', async () => {
    const planned = await plan([
      '--set',
      'plants-working',
      '--pages',
      'dashboard',
      '--reference',
      'origin=designs/origin.png'
    ])
    expect(planned.wanted).toEqual(['dashboard', 'origin'])
    expect(planned.references).toEqual([
      { key: 'origin', file: expect.stringContaining('designs/origin.png') }
    ])
  })

  it('Should take the chooser as an address, not a page of the set', async () => {
    const planned = await plan([
      '--set',
      'plants-working',
      '--pages',
      'chooser'
    ])
    expect(planned.wanted).toEqual([])
    expect(planned.addresses).toEqual([{ key: CHOOSER_KEY, address: '/' }])
  })

  it('Should make the first example finish when an address needs its notification', async () => {
    const planned = await plan([
      '--set',
      'plants-working',
      '--pages',
      'origin',
      '--url',
      'notifications/{notification}/transporter-select/add'
    ])
    expect(planned.plan.runs[0]).toMatchObject({
      scenario: 'potatoes',
      finish: true
    })
  })

  it('Should find no changed pages outside git, rather than fail', async () => {
    const planned = await plan(['--set', 'plants-working'])
    expect(planned.changedFiles).toEqual([])
    expect(planned.wanted).toEqual([])
  })
})

describe('planShow with --pages changed', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo({ git: true })
    fixture.write(
      `${FEATURES}/origin/template.njk`,
      '<h1>Where the plants came from</h1>\n'
    )
  })
  afterAll(() => fixture.cleanup())

  const plan = (argv) => planShow(optionsFrom(argv), { root: fixture.root })

  it('Should picture only the pages an unsaved change shows on', async () => {
    const planned = await plan(['--set', 'plants-working'])
    expect(planned.changedFiles).toEqual([`${FEATURES}/origin/template.njk`])
    expect(planned.wanted).toEqual(['origin'])
  })

  it('Should add named pages to the changed ones', async () => {
    const planned = await plan([
      '--set',
      'plants-working',
      '--pages',
      'changed,dashboard'
    ])
    expect(planned.wanted).toEqual(['dashboard', 'origin'])
  })

  it('Should find nothing to picture when the change is in another set', async () => {
    const planned = await plan(['--set', 'plants-dr2'])
    expect(planned.wanted).toEqual([])
    expect(planned.addresses).toEqual([])
  })
})
