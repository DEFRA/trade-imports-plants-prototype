import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { GLOBS, prettierArgs, summarise } from './cli.js'

describe('designer:format', () => {
  it('Should tidy the same files as npm run format', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
    )
    const format = packageJson.scripts.format
    for (const glob of GLOBS) {
      expect(format).toContain(`"${glob}"`)
    }
  })

  it('Should ask Prettier to write and list only what it changed', () => {
    expect(prettierArgs()).toEqual(
      expect.arrayContaining(['--write', '--list-different'])
    )
  })

  it('Should name each file it tidied', () => {
    expect(summarise('a.js\nb.md\n')).toEqual([
      'Tidied 2 files:',
      '  a.js',
      '  b.md'
    ])
  })

  it('Should say so when nothing needed tidying', () => {
    expect(summarise('')).toEqual(['Every file was already tidy.'])
  })
})
