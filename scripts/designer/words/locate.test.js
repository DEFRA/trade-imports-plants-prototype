import { describe, expect, it } from 'vitest'

import { locateKeyLine } from './locate.js'

const SOURCE = [
  '// A comment at the top',
  'export const copy = {',
  '  late: {',
  "    title: 'Important'",
  '  },',
  "  title: 'Check your answers',",
  '  dateHints: {',
  '    potatoes:',
  "      'For example, 27/3/2026.',",
  "    'not-yet-arrived': 'For example, 27/3/2026'",
  '  }',
  '}',
  '',
  'export const validatorDefaults = {',
  "  title: 'Not the copy title'",
  '}'
].join('\n')

describe('locateKeyLine', () => {
  it('Should find a top-level key, not a nested key of the same name', () => {
    expect(locateKeyLine(SOURCE, 'copy', 'title')).toBe(6)
  })

  it('Should find a nested key inside its parent', () => {
    expect(locateKeyLine(SOURCE, 'copy', 'late.title')).toBe(4)
  })

  it('Should find a quoted key', () => {
    expect(locateKeyLine(SOURCE, 'copy', 'dateHints.not-yet-arrived')).toBe(10)
  })

  it('Should give the key line when Prettier wrapped the value', () => {
    expect(locateKeyLine(SOURCE, 'copy', 'dateHints.potatoes')).toBe(8)
  })

  it('Should look inside the named export only', () => {
    expect(locateKeyLine(SOURCE, 'validatorDefaults', 'title')).toBe(15)
  })

  it('Should stop at the deepest key it found', () => {
    expect(locateKeyLine(SOURCE, 'copy', 'late.missing')).toBe(3)
  })
})
