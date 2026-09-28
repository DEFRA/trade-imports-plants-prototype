import { describe, expect, it } from 'vitest'
import {
  findPinnedStrings,
  findPrototypeImports,
  findPrototypeServiceImports,
  findWelshMarkers,
  isTestFile,
  literalsIn,
  matchingRemovedVocabulary,
  ownedServicesFrom,
  parseDesignGaps,
  parseResearchRules,
  relativeImportsOf,
  removalVocabularyFrom,
  removedLiterals
} from './impact.js'

describe('removedLiterals', () => {
  it('Should list a copy string that was replaced', () => {
    const before = "hint: 'Use the 24-hour clock. For example, 14:30.'"
    const after = "hint: 'Use the 24-hour clock, for example 14:30.'"

    expect(removedLiterals(before, after)).toEqual([
      'Use the 24-hour clock. For example, 14:30.'
    ])
  })

  it('Should not list a string that is still there', () => {
    const before = "title: 'Arrival details',\nhint: 'Old hint'"
    const after = "title: 'Arrival details',\nhint: 'New hint'"

    expect(removedLiterals(before, after)).toEqual(['Old hint'])
  })

  it('Should read visible text and attribute values in a template', () => {
    const before =
      '<h1 class="govuk-heading-l">{{ copy.title }}</h1>\n<p>Check the details</p>'
    const after = '<h1 class="govuk-heading-xl">{{ copy.title }}</h1>'

    expect(removedLiterals(before, after, { template: true })).toEqual([
      'govuk-heading-l',
      'Check the details'
    ])
  })

  it('Should ignore short and number-only strings', () => {
    expect([...literalsIn("a: 'ok', b: '1234', c: 'Real words'")]).toEqual([
      'Real words'
    ])
  })
})

describe('findPinnedStrings', () => {
  it('Should find each test line that still expects the old words', () => {
    const tests = {
      'src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.test.js':
        "it('x', () => {\n  expect(copy.time.hint).toBe('Use the 24-hour clock. For example, 14:30.')\n})",
      'fit/other.fit.spec.js': "await expect(page).toHaveText('Something else')"
    }

    expect(
      findPinnedStrings(['Use the 24-hour clock. For example, 14:30.'], tests)
    ).toEqual([
      {
        text: 'Use the 24-hour clock. For example, 14:30.',
        file: 'src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.test.js',
        line: 2
      }
    ])
  })

  it('Should list a line once, with the longest old words on it', () => {
    const tests = {
      'copy.test.js': "expect(caption).toBe('Consignment parties')"
    }

    expect(
      findPinnedStrings(['Consignment', 'Consignment parties'], tests)
    ).toEqual([{ text: 'Consignment parties', file: 'copy.test.js', line: 1 }])
  })

  it('Should find nothing when no test pins the words', () => {
    expect(findPinnedStrings(['Unpinned'], { 'a.test.js': 'nothing' })).toEqual(
      []
    )
  })
})

describe('isTestFile', () => {
  it.each([
    ['features/origin/copy/copy.test.js', true],
    ['features/origin/origin.fit.spec.js', true],
    ['fit/set-base.js', true],
    ['features/origin/copy/copy.en.js', false],
    ['features/origin/template.njk', false]
  ])('Should classify %s as a test: %s', (filePath, expected) => {
    expect(isTestFile(filePath)).toBe(expected)
  })
})

describe('findPrototypeImports', () => {
  it('Should find an import of the prototype’s stub plumbing', () => {
    const source =
      "import { createFakeStore } from '../../../../../../../prototype-support/fake-store.js'\nconst x = 1"

    expect(findPrototypeImports('controller.js', source)).toEqual([
      {
        file: 'controller.js',
        specifier: '../../../../../../../prototype-support/fake-store.js',
        kind: 'prototype-support',
        name: 'fake-store'
      }
    ])
  })

  it('Should find a dynamic import of prototype data', () => {
    const source = "const rows = await import('../prototype-data/index.js')"

    expect(findPrototypeImports('a.js', source)).toEqual([
      expect.objectContaining({ kind: 'prototype-data', name: 'index' })
    ])
  })

  it('Should find nothing in a file that uses only services', () => {
    const source = [
      "import { ports } from '../../services/ports/index.js'",
      "import * as transporters from '../../services/transporters/index.js'"
    ].join('\n')

    expect(findPrototypeImports('a.js', source)).toEqual([])
  })
})

describe('ownedServicesFrom', () => {
  it('Should name only the services folders with their own ours line', () => {
    const overrides = {
      ours: [
        'src/server/app/services/transporters/**',
        'src/server/app/services/templates/**',
        'src/server/prototype-support/**',
        'src/server/app/services/**',
        'src/server/app/services/countries/index.js'
      ]
    }

    expect([...ownedServicesFrom(overrides)]).toEqual([
      'transporters',
      'templates'
    ])
  })

  it('Should name none when overrides.json is missing', () => {
    expect(ownedServicesFrom(null).size).toBe(0)
  })
})

describe('findPrototypeServiceImports', () => {
  const PAGE =
    'src/server/app/sets/plants-working/journeys/linear/features/transporter/controller.js'

  it('Should find an import of a prototype-owned service by where it resolves', () => {
    const source = [
      "import * as transporters from '../../../../../../services/transporters/index.js'",
      "import { originLabel } from '../../../../../../services/countries/index.js'"
    ].join('\n')

    expect(
      findPrototypeServiceImports(PAGE, source, new Set(['transporters']))
    ).toEqual([
      {
        file: PAGE,
        kind: 'prototype-service',
        name: 'transporters',
        dir: 'src/server/app/services/transporters',
        imports: 'src/server/app/services/transporters/index.js'
      }
    ])
  })

  it('Should not count a real service, even one with the same folder depth', () => {
    const source =
      "import * as ports from '../../../../../../services/ports/index.js'"

    expect(
      findPrototypeServiceImports(PAGE, source, new Set(['transporters']))
    ).toEqual([])
  })
})

describe('findWelshMarkers', () => {
  it('Should list each Welsh needed marker with its English', () => {
    const source =
      "export const copy = {\n  title: 'Manylion cyrraedd',\n  hint: '[Welsh needed] Use the 24-hour clock, for example 14:30.'\n}"

    expect(findWelshMarkers('copy.cy.js', source)).toEqual([
      {
        file: 'copy.cy.js',
        key: 'hint',
        line: 3,
        english: 'Use the 24-hour clock, for example 14:30.'
      }
    ])
  })

  it('Should give the words of a string nested in an object, never code', () => {
    const source = [
      'export const copy = {',
      '  types: [',
      "    { value: 'private', text: '[Welsh needed] Private transporter' },",
      "    { value: 'org', text: '[Welsh needed] Enter a name or organisation name' }",
      '  ],',
      '  hint:',
      "    '[Welsh needed] A long hint the formatter put on its own line'",
      '}'
    ].join('\n')

    expect(
      findWelshMarkers('copy.cy.js', source).map((marker) => [
        marker.key,
        marker.line,
        marker.english
      ])
    ).toEqual([
      ['types[0].text', 3, 'Private transporter'],
      ['types[1].text', 4, 'Enter a name or organisation name'],
      ['hint', 7, 'A long hint the formatter put on its own line']
    ])
  })
})

describe('relativeImportsOf', () => {
  it('Should resolve relative imports against the file’s folder', () => {
    const source = [
      "import { render } from '../transporter-picker/render.js'",
      "import { kit } from '../../../../shared/kit.js'",
      "import govuk from 'govuk-frontend'"
    ].join('\n')

    expect(
      relativeImportsOf(
        'src/server/app/sets/x/features/add/controller.js',
        source
      )
    ).toEqual([
      'src/server/app/sets/x/features/transporter-picker/render.js',
      'src/server/app/shared/kit.js'
    ])
  })
})

describe('parseDesignGaps', () => {
  it('Should read each row of the design gaps table', () => {
    const markdown = [
      '# Design gaps',
      '',
      '| Page | What the design wants | Closest option built | Why |',
      '| --- | --- | --- | --- |',
      '| dashboard | Blue status chips | govuk-tag--blue | No chip component |'
    ].join('\n')

    expect(parseDesignGaps(markdown)).toEqual([
      {
        page: 'dashboard',
        'what the design wants': 'Blue status chips',
        'closest option built': 'govuk-tag--blue',
        why: 'No chip component'
      }
    ])
  })

  it('Should read a list when there is no table', () => {
    expect(parseDesignGaps('- Sticky footer bar')).toEqual([
      { gap: 'Sticky footer bar' }
    ])
  })

  it('Should give nothing for a release with no file', () => {
    expect(parseDesignGaps(null)).toEqual([])
  })
})

describe('removalVocabularyFrom', () => {
  it('Should read the service names immediately before "service(s)" in a sentence that says one was removed', () => {
    const text =
      'The reason-for-import/purpose service and the transport and transporter services were removed because this journey asks no such question.'

    expect(removalVocabularyFrom(text)).toEqual([
      'reason-for-import/purpose',
      'transporter'
    ])
  })

  it('Should also read a sentence that says a service is unused, not just "removed"', () => {
    const text =
      'no plants source asks a reason-for-import or purpose question, so the platform commercial-transporters services are likewise unused.'

    expect(removalVocabularyFrom(text)).toEqual(['commercial-transporters'])
  })

  it('Should give nothing when no sentence mentions a removal', () => {
    expect(
      removalVocabularyFrom('Countries and ports serve stub data.')
    ).toEqual([])
  })

  it('Should give nothing for empty or missing text', () => {
    expect(removalVocabularyFrom(null)).toEqual([])
    expect(removalVocabularyFrom('')).toEqual([])
  })
})

describe('matchingRemovedVocabulary', () => {
  it('Should match a plural service name against the singular word a removal recorded', () => {
    expect(matchingRemovedVocabulary('transporters', ['transporter'])).toBe(
      'transporter'
    )
  })

  it('Should match a service name that is part of a longer removed term', () => {
    expect(
      matchingRemovedVocabulary('transporters', ['commercial-transporters'])
    ).toBe('commercial-transporters')
  })

  it('Should find no match for an unrelated service', () => {
    expect(matchingRemovedVocabulary('countries', ['transporter'])).toBe(
      undefined
    )
  })
})

describe('parseResearchRules', () => {
  it('Should list each relaxed rule as plain text', () => {
    const markdown =
      '# Research mode\n\n- arrival-details: the arrival date is not required'

    expect(parseResearchRules(markdown)).toEqual([
      'arrival-details: the arrival date is not required'
    ])
  })
})
