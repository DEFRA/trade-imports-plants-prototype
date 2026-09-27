import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  GENERATED_END,
  GENERATED_START,
  REFERENCE_FILE,
  pascalCase,
  readInventory,
  renderComponent,
  renderInventory,
  replaceGenerated,
  run
} from './components-we-have.js'

const write = (root, relativePath, text) => {
  const file = path.join(root, relativePath)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, text)
}

const GOVUK = 'node_modules/govuk-frontend/dist/govuk/components'
const MOJ = 'node_modules/@ministryofjustice/frontend/moj/components'

const buildRepo = (root) => {
  write(root, 'node_modules/govuk-frontend/package.json', '{"version":"6.4.0"}')
  write(
    root,
    'node_modules/@ministryofjustice/frontend/package.json',
    '{"version":"10.0.1"}'
  )
  write(
    root,
    'node_modules/accessible-autocomplete/package.json',
    '{"version":"3.0.1"}'
  )
  write(root, `${GOVUK}/tag/macro.njk`, '{% macro govukTag(params) %}')
  write(root, `${GOVUK}/tabs/macro.njk`, '{% macro govukTabs(params) %}')
  write(root, `${GOVUK}/tabs/tabs.mjs`, 'export class Tabs {}')
  write(root, `${GOVUK}/radios/macro.njk`, '{% macro govukRadios(params) %}')
  write(root, `${GOVUK}/radios/radios.mjs`, 'export class Radios {}')
  write(root, `${GOVUK}/_index.scss`, '')
  write(
    root,
    `${MOJ}/date-picker/macro.njk`,
    '{% macro mojDatePicker(params) %}'
  )
  write(
    root,
    `${MOJ}/date-picker/date-picker.mjs`,
    'export class DatePicker {}'
  )
  write(root, `${MOJ}/filter/macro.njk`, '{% macro mojFilter(params) %}')
  write(
    root,
    'src/server/common/components/accessible-autocomplete/macro.njk',
    '{% macro appAccessibleAutocomplete(params) %}'
  )
  write(
    root,
    'src/client/javascripts/components/accessible-autocomplete.js',
    'export default class AccessibleAutocomplete {}'
  )
  write(
    root,
    'src/client/javascripts/application.js',
    [
      "import { createAll, Radios } from 'govuk-frontend'",
      'createAll(Radios)',
      'createAll(DatePicker)',
      'createAll(AccessibleAutocomplete)'
    ].join('\n')
  )
  write(
    root,
    'src/client/stylesheets/application.scss',
    [
      '@use "govuk-frontend";',
      '@use "@ministryofjustice/frontend/moj/components/date-picker/date-picker";'
    ].join('\n')
  )
  write(
    root,
    'src/server/app/sets/b-set/page/template.njk',
    '{% from "govuk/components/tag/macro.njk" import govukTag %}'
  )
  write(
    root,
    'src/server/app/sets/a-set/page/template.njk',
    '{% from "govuk/components/radios/macro.njk" import govukRadios, govukTag %}'
  )
}

const componentOf = (inventory, libraryId, macro) =>
  inventory.libraries
    .find((library) => library.id === libraryId)
    .components.find((component) => component.macro === macro)

describe('pascalCase', () => {
  it('Should turn a component folder into the class name its script exports', () => {
    expect(pascalCase('character-count')).toBe('CharacterCount')
    expect(pascalCase('tabs')).toBe('Tabs')
  })
})

describe('readInventory', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'components-we-have-'))
    buildRepo(root)
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should record the installed version of each library', () => {
    expect(readInventory(root).versions).toEqual({
      'govuk-frontend': '6.4.0',
      '@ministryofjustice/frontend': '10.0.1',
      'accessible-autocomplete': '3.0.1'
    })
  })

  it('Should say a component script is started only when createAll() is called for it', () => {
    const inventory = readInventory(root)
    expect(componentOf(inventory, 'govuk', 'govukRadios').script).toBe(
      'started'
    )
    expect(componentOf(inventory, 'govuk', 'govukTabs').script).toBe(
      'not-started'
    )
    expect(componentOf(inventory, 'govuk', 'govukTag').script).toBe('none')
    expect(
      componentOf(inventory, 'app', 'appAccessibleAutocomplete').script
    ).toBe('started')
  })

  it('Should say an MoJ component is styled only when its Sass is loaded', () => {
    const inventory = readInventory(root)
    expect(componentOf(inventory, 'moj', 'mojDatePicker').styled).toBe(true)
    expect(componentOf(inventory, 'moj', 'mojFilter').styled).toBe(false)
    expect(componentOf(inventory, 'govuk', 'govukTabs').styled).toBe(true)
  })

  it('Should list the set templates that import each macro, in path order', () => {
    const inventory = readInventory(root)
    expect(componentOf(inventory, 'govuk', 'govukTag').usedIn).toEqual([
      'src/server/app/sets/a-set/page/template.njk',
      'src/server/app/sets/b-set/page/template.njk'
    ])
    expect(componentOf(inventory, 'govuk', 'govukTabs').usedIn).toEqual([])
  })

  it('Should give the import line a template needs', () => {
    const inventory = readInventory(root)
    expect(componentOf(inventory, 'moj', 'mojDatePicker').importLine).toBe(
      '{% from "moj/components/date-picker/macro.njk" import mojDatePicker %}'
    )
    expect(
      componentOf(inventory, 'app', 'appAccessibleAutocomplete').importLine
    ).toBe(
      '{% from "accessible-autocomplete/macro.njk" import appAccessibleAutocomplete %}'
    )
  })
})

describe('renderComponent', () => {
  it('Should warn in capitals when a script is not started or styles are not loaded', () => {
    expect(
      renderComponent({
        macro: 'mojFilter',
        importLine:
          '{% from "moj/components/filter/macro.njk" import mojFilter %}',
        script: 'not-started',
        styled: false,
        usedIn: []
      })
    ).toBe(
      [
        '- `mojFilter`: Script NOT started. Styles NOT loaded. Not used in any set yet.',
        '  `{% from "moj/components/filter/macro.njk" import mojFilter %}`'
      ].join('\n')
    )
  })

  it('Should name the first template that uses a component and count the rest', () => {
    expect(
      renderComponent({
        macro: 'govukTag',
        importLine:
          '{% from "govuk/components/tag/macro.njk" import govukTag %}',
        script: 'none',
        styled: true,
        usedIn: ['a.njk', 'b.njk', 'c.njk']
      })
    ).toContain('No script needed. Used in `a.njk` and 2 more.')
  })
})

describe('renderInventory', () => {
  it('Should start with the installed versions and give each library a heading', () => {
    const text = renderInventory({
      versions: { 'govuk-frontend': '6.4.0', 'accessible-autocomplete': null },
      libraries: [{ id: 'govuk', title: 'GOV.UK Frontend', components: [] }]
    })
    expect(text).toBe(
      [
        'Installed: govuk-frontend 6.4.0, accessible-autocomplete not installed.',
        '',
        '### GOV.UK Frontend',
        ''
      ].join('\n')
    )
  })
})

describe('replaceGenerated', () => {
  it('Should replace only the text between the markers', () => {
    const document = `# Title\n\n${GENERATED_START}\n\nold\n\n${GENERATED_END}\n\nNotes\n`
    expect(replaceGenerated(document, 'new')).toBe(
      `# Title\n\n${GENERATED_START}\n\nnew\n\n${GENERATED_END}\n\nNotes\n`
    )
  })

  it('Should refuse a document that has lost a marker', () => {
    expect(() => replaceGenerated('# Title\n', 'new')).toThrow(/Could not find/)
  })
})

describe('run', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'components-we-have-'))
    buildRepo(root)
    write(
      root,
      REFERENCE_FILE,
      `Intro\n\n${GENERATED_START}\n\nstale\n\n${GENERATED_END}\n`
    )
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should print the inventory without writing anything', () => {
    expect(run([], { root })).toContain('### MoJ Frontend')
  })

  it('Should rewrite the generated part of the reference with --write', () => {
    expect(run(['--write'], { root })).toBe(`Updated ${REFERENCE_FILE}.`)
    const text = readFileSync(path.join(root, REFERENCE_FILE), 'utf8')
    expect(text).toContain('Installed: govuk-frontend 6.4.0')
    expect(text).not.toContain('stale')
    expect(text.startsWith('Intro')).toBe(true)
  })
})
