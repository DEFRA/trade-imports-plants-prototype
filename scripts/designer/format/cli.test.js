import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GLOBS, prettierArgs, summarise, tidyAll } from './cli.js'

describe('designer:format on real files', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'designer-format-'))
    writeFileSync(
      path.join(root, '.prettierrc.json'),
      '{ "semi": false, "singleQuote": true }\n'
    )
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should name every file it changed, Markdown tables included', () => {
    writeFileSync(path.join(root, 'untidy.js'), 'const a   =  "b"\n')
    writeFileSync(
      path.join(root, 'gaps.md'),
      '# Gaps\n\n| Page | Gap |\n|---|---|\n| origin | a long gap |\n'
    )
    writeFileSync(path.join(root, 'tidy.js'), "const a = 'b'\n")

    const { lines } = tidyAll({ root })

    expect(lines[0]).toBe('Tidied 2 files:')
    expect(
      lines
        .slice(1)
        .map((line) => line.trim())
        .sort()
    ).toEqual(['gaps.md', 'untidy.js'])
    expect(readFileSync(path.join(root, 'untidy.js'), 'utf8')).toBe(
      "const a = 'b'\n"
    )
  })

  it('Should say every file was tidy when none changed', () => {
    writeFileSync(path.join(root, 'tidy.js'), "const a = 'b'\n")

    expect(tidyAll({ root }).lines).toEqual(['Every file was already tidy.'])
  })
})

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
