import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { checkSetTemplates } from './templates.js'

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const SETS = path.join(REPO_ROOT, 'src/server/app/sets')

describe('checkSetTemplates on the sets in this prototype', () => {
  it.each(['high-risk-plants', 'sample-journey'])(
    'Should compile every template in %s and find every file they use',
    (setId) => {
      const result = checkSetTemplates(path.join(SETS, setId), {
        root: REPO_ROOT
      })

      expect(result.problems).toEqual([])
      expect(result.templates).toBeGreaterThan(0)
    }
  )
})

describe('checkSetTemplates on a broken release', () => {
  let root
  let setFolder

  const writeTemplate = (name, body) => {
    writeFileSync(path.join(setFolder, name), body)
  }

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'njk-check-'))
    setFolder = path.join(root, 'src/server/app/sets/plants-working')
    mkdirSync(path.join(root, 'src/server/app/shared'), { recursive: true })
    writeFileSync(path.join(root, 'src/server/app/shared/layout.njk'), '')
    mkdirSync(setFolder, { recursive: true })
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should pass a template that compiles and uses real files', () => {
    writeTemplate(
      'good.njk',
      '{% extends "shared/layout.njk" %}\n{% block content %}Hi{% endblock %}\n'
    )

    expect(checkSetTemplates(setFolder, { root })).toEqual({
      templates: 1,
      problems: []
    })
  })

  it('Should name the file of a tag that is never closed', () => {
    writeTemplate('broken.njk', '<p>\n{% if thing %}\nHello\n</p>\n')

    expect(checkSetTemplates(setFolder, { root }).problems).toEqual([
      'src/server/app/sets/plants-working/broken.njk: parseIf: expected elif, else, or endif, got end of file'
    ])
  })

  it('Should name the line of a broken tag', () => {
    writeTemplate('tag.njk', '<p>\n{% if thing %}\n{{ name }\n{% endif %}\n')

    const [problem] = checkSetTemplates(setFolder, { root }).problems

    expect(problem).toMatch(
      /^src\/server\/app\/sets\/plants-working\/tag\.njk: \[Line \d+, Column \d+\]/
    )
  })

  it('Should name an include that does not exist', () => {
    writeTemplate('typo.njk', '{% include "shared/layuot.njk" %}\n')

    expect(checkSetTemplates(setFolder, { root }).problems).toEqual([
      'src/server/app/sets/plants-working/typo.njk: it uses "shared/layuot.njk", which does not exist. Check the spelling of the path.'
    ])
  })

  it('Should allow an include marked ignore missing', () => {
    writeTemplate('optional.njk', '{% include "extra.njk" ignore missing %}\n')

    expect(checkSetTemplates(setFolder, { root }).problems).toEqual([])
  })
})
