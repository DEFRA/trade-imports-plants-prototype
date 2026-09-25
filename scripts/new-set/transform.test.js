import { describe, expect, it } from 'vitest'
import { transformContent, transformPath } from './transform.js'

const ARGS = { fromId: 'sample-journey', newId: 'test-fixtures' }

describe('transformContent', () => {
  it('Should rewrite the kebab-case id in a template path fragment', () => {
    const source = "export const TEMPLATES = 'sample-journey/journeys/linear'"

    expect(transformContent(source, ARGS)).toBe(
      "export const TEMPLATES = 'test-fixtures/journeys/linear'"
    )
  })

  it('Should rewrite the kebab-case id in an import path', () => {
    const source =
      "import { SET_BASE } from '../app/sets/sample-journey/set.js'"

    expect(transformContent(source, ARGS)).toBe(
      "import { SET_BASE } from '../app/sets/test-fixtures/set.js'"
    )
  })

  it('Should rewrite the camelCase form used for cookie names and plugin bindings', () => {
    const source =
      "knownJourneys: 'sampleJourneyKnownJourneys',\nexport const sampleJourney = {}"

    expect(transformContent(source, ARGS)).toBe(
      "knownJourneys: 'testFixturesKnownJourneys',\nexport const testFixtures = {}"
    )
  })

  it('Should rewrite the sentence-case placeholder heading', () => {
    const source = "h.view(view, { heading: 'Sample journey' })"

    expect(transformContent(source, ARGS)).toBe(
      "h.view(view, { heading: 'Test fixtures' })"
    )
  })

  it('Should replace every obligation UUID with a freshly generated one', () => {
    const source =
      "id: '9c1f5d3a-7b24-4e18-9a6d-0f3b8c2e5a71',\nname: 'consignmentReference'"

    const rewritten = transformContent(source, ARGS)

    expect(rewritten).not.toContain('9c1f5d3a-7b24-4e18-9a6d-0f3b8c2e5a71')
    expect(rewritten).toMatch(
      /id: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/
    )
  })

  it('Should leave content with none of the template id in it untouched', () => {
    const source =
      "export const welcomePage = { id: 'welcome', slug: 'welcome' }"

    expect(transformContent(source, ARGS)).toBe(source)
  })
})

describe('transformPath', () => {
  it('Should rewrite a directory name carrying the template id', () => {
    expect(transformPath('sample-journey', ARGS)).toBe('test-fixtures')
  })

  it('Should rewrite a file name carrying the template id', () => {
    expect(transformPath('routes-sample-journey.js', ARGS)).toBe(
      'routes-test-fixtures.js'
    )
  })

  it('Should leave a path with none of the template id in it untouched', () => {
    expect(transformPath('welcome/controller.js', ARGS)).toBe(
      'welcome/controller.js'
    )
  })
})
