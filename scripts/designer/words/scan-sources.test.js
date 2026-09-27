import { describe, expect, it } from 'vitest'

import { pinnedHits, templateHits } from './scan-sources.js'

const TEMPLATE = [
  '{% extends "shared/layout.njk" %}',
  '{% block journeyContent %}',
  '  <h1 class="govuk-heading-l">{{ heading }}</h1>',
  '  <p class="govuk-body">Tell us who is sending the plants.</p>',
  '  {{ govukButton({',
  '    text: "Send the plants"',
  '  }) }}',
  '  {# Plants comment #}',
  '{% endblock %}'
].join('\n')

describe('templateHits', () => {
  it('Should find words written between HTML tags', () => {
    expect(templateHits(TEMPLATE, 'who is sending')).toEqual([
      { line: 4, text: 'Tell us who is sending the plants.' }
    ])
  })

  it('Should find a quoted string inside a macro call that spans lines', () => {
    expect(templateHits(TEMPLATE, 'send the plants')).toEqual([
      { line: 6, text: 'Send the plants' }
    ])
  })

  it('Should ignore comments and variable names', () => {
    expect(templateHits(TEMPLATE, 'plants comment')).toEqual([])
    expect(templateHits(TEMPLATE, 'heading')).toEqual([])
  })

  it('Should report a line once however many fragments match', () => {
    expect(templateHits(TEMPLATE, 'plants')).toEqual([
      { line: 4, text: 'Tell us who is sending the plants.' },
      { line: 6, text: 'Send the plants' }
    ])
  })
})

describe('pinnedHits', () => {
  const TEST = [
    "import { copy } from './copy/consignment-parties.js'",
    "expect(caption).toBe('Consignment parties')",
    "expect(cy).toBe('Partïon y llwyth')"
  ].join('\n')

  it('Should find each line that pins the English or the Welsh', () => {
    const texts = ['consignment parties', 'Partïon y llwyth']
    expect(pinnedHits(TEST, texts)).toEqual([
      { line: 2, text: "expect(caption).toBe('Consignment parties')" },
      { line: 3, text: "expect(cy).toBe('Partïon y llwyth')" }
    ])
  })

  it('Should match curly and straight apostrophes alike', () => {
    const curly = "expect(x).toBe('What’s this')"
    const hits = pinnedHits(curly, ["What's this"])
    expect(hits).toEqual([{ line: 1, text: curly }])
  })
})
