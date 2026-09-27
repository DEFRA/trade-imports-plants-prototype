import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { featureOfPath, pagesForChangedPaths, pagesOf } from './flow.js'
import { REPO_ROOT } from './repo.js'
import { makeFixtureRepo } from './test-support.js'

const RELEASE = 'src/server/app/sets/plants-working'
const FEATURES = `${RELEASE}/journeys/linear/features`

describe('pagesOf', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo()
  })
  afterAll(() => fixture.cleanup())

  it("Should list a set's pages in flow order with their feature folders", async () => {
    expect(await pagesOf('plants-working', { root: fixture.root })).toEqual([
      {
        sectionId: 'start',
        id: 'dashboard',
        slug: '',
        feature: 'dashboard',
        route: '/'
      },
      {
        sectionId: 'origin',
        id: 'origin',
        slug: 'origin',
        feature: 'origin',
        route: '/notifications/{journeyId}/origin'
      },
      {
        sectionId: 'arrival',
        id: 'arrival-details',
        slug: 'arrival-details',
        feature: 'arrival-details',
        route: '/notifications/{journeyId}/arrival-details'
      },
      {
        sectionId: 'review',
        id: 'notification-view',
        slug: 'notification-view',
        feature: 'check-answers',
        route: '/notifications/{journeyId}/notification-view'
      },
      {
        sectionId: 'review',
        id: 'confirmation',
        slug: 'confirmation',
        feature: 'confirmation',
        route: '/notifications/{journeyId}/confirmation'
      }
    ])
  })

  it('Should answer an empty list for a set with no flow', async () => {
    fixture.write('src/server/app/sets/bare/set.js', 'export {}\n')
    expect(await pagesOf('bare', { root: fixture.root })).toEqual([])
  })
})

describe('featureOfPath', () => {
  it.each([
    [`${FEATURES}/origin/copy/copy.en.js`, 'origin'],
    [`${FEATURES}/check-answers/template.njk`, 'check-answers'],
    [`${FEATURES}/evaluation.js`, null],
    [`${RELEASE}/journeys/linear/flow/flow.js`, null],
    ['src/server/app/shared/layout.njk', null]
  ])('Should find the feature of %s', (filePath, feature) => {
    expect(featureOfPath(filePath)).toBe(feature)
  })
})

describe('pagesForChangedPaths on fixture diffs', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo()
  })
  afterAll(() => fixture.cleanup())

  const idsFor = async (paths) =>
    (await pagesForChangedPaths(paths, { root: fixture.root })).map(
      ({ setId, id }) => `${setId}:${id}`
    )

  const EVERY_PAGE = [
    'plants-working:dashboard',
    'plants-working:origin',
    'plants-working:arrival-details',
    'plants-working:notification-view',
    'plants-working:confirmation',
    'plants-working:hub'
  ]

  it("Should map a feature's copy and template to that feature's page", async () => {
    expect(
      await idsFor([
        `${FEATURES}/origin/copy/copy.en.js`,
        `${FEATURES}/origin/copy/copy.cy.js`,
        `${FEATURES}/origin/template.njk`
      ])
    ).toEqual(['plants-working:origin'])
  })

  it('Should keep journey order and list each page once', async () => {
    expect(
      await idsFor([
        `${FEATURES}/confirmation/template.njk`,
        `${FEATURES}/origin/template.njk`,
        `${FEATURES}/confirmation/copy/copy.en.js`
      ])
    ).toEqual(['plants-working:origin', 'plants-working:confirmation'])
  })

  it('Should handle the hub, dashboard, check answers and confirmation by name', async () => {
    expect(await idsFor([`${FEATURES}/hub/template.njk`])).toEqual([
      'plants-working:hub'
    ])
    expect(await idsFor([`${FEATURES}/dashboard/template.njk`])).toEqual([
      'plants-working:dashboard'
    ])
    expect(await idsFor([`${FEATURES}/check-answers/copy/copy.en.js`])).toEqual(
      ['plants-working:notification-view']
    )
    expect(await idsFor([`${FEATURES}/confirmation/template.njk`])).toEqual([
      'plants-working:confirmation'
    ])
  })

  it('Should treat shared copy, captions, layout and the flow as every page of the set', async () => {
    expect(
      await idsFor([
        `${RELEASE}/journeys/linear/flow/section-captions/copy/copy.en.js`
      ])
    ).toEqual(EVERY_PAGE)
    expect(await idsFor([`${RELEASE}/journeys/linear/flow/flow.js`])).toEqual(
      EVERY_PAGE
    )
    expect(await idsFor([`${FEATURES}/evaluation.js`])).toEqual(EVERY_PAGE)
    expect(
      await idsFor([`${RELEASE}/journeys/linear/flow/fixtures/happy-path.json`])
    ).toEqual(EVERY_PAGE)
    expect(await idsFor(['src/server/app/routes-plants-working.js'])).toEqual(
      EVERY_PAGE
    )
  })

  it('Should treat a feature folder with no page of its own as every page', async () => {
    expect(await idsFor([`${FEATURES}/review/lateness.js`])).toEqual(EVERY_PAGE)
  })

  it('Should find no page for tests, specs, docs and release notes', async () => {
    expect(
      await idsFor([
        `${FEATURES}/origin/controller.test.js`,
        `${FEATURES}/origin/origin.fit.spec.js`,
        `${RELEASE}/docs/README.md`,
        `${RELEASE}/release.json`,
        `${RELEASE}/design-gaps.md`
      ])
    ).toEqual([])
  })

  it('Should find no page for anything outside a set', async () => {
    expect(
      await idsFor([
        'src/server/app/shared/layout.njk',
        'src/server/app/engine/journey.js',
        'package.json',
        'overrides.json'
      ])
    ).toEqual([])
  })

  it('Should report pages per set when a diff spans sets', async () => {
    expect(
      await idsFor([
        `${FEATURES}/origin/template.njk`,
        'src/server/app/sets/sample-journey/journeys/linear/features/welcome/template.njk'
      ])
    ).toEqual(['plants-working:origin', 'sample-journey:welcome'])
  })

  it('Should never add the hub to a one-page set', async () => {
    expect(
      await idsFor([
        'src/server/app/sets/sample-journey/journeys/linear/flow/flow.js'
      ])
    ).toEqual(['sample-journey:welcome'])
  })
})

describe('pagesOf on the real journey', () => {
  it('Should find the origin page in its origin feature', async () => {
    const pages = await pagesOf('high-risk-plants', { root: REPO_ROOT })
    expect(pages).toContainEqual(
      expect.objectContaining({ id: 'origin', feature: 'origin' })
    )
    expect(pages[0]).toMatchObject({ id: 'dashboard', route: '/' })
  })
})
