import path from 'node:path'

import nunjucks from 'nunjucks'
import { describe, expect, it } from 'vitest'

import * as globals from '../../src/config/nunjucks/globals/globals.js'
import { nunjucksConfig } from '../../src/config/nunjucks/nunjucks.js'

const repoRoot = path.join(import.meta.dirname, '../..')
const fixtureSets = path.join(import.meta.dirname, 'fixtures/sets')

const appEnvironment = nunjucksConfig.options.compileOptions.environment
const appSearchPaths = appEnvironment.loaders.flatMap(
  (loader) => loader.searchPaths ?? []
)

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(
    [...appSearchPaths, fixtureSets].map((searchPath) =>
      path.resolve(repoRoot, searchPath)
    )
  ),
  {
    autoescape: appEnvironment.opts.autoescape,
    trimBlocks: appEnvironment.opts.trimBlocks,
    lstripBlocks: appEnvironment.opts.lstripBlocks
  }
)
for (const [name, global] of Object.entries(globals)) {
  environment.addGlobal(name, global)
}

describe("the app's template search paths", () => {
  it('Should find a release layout by its set id, under src/server/app/sets', () => {
    expect(appSearchPaths).toContain(path.join(repoRoot, 'src/server/app/sets'))
  })
})

const render = (page) =>
  environment.render(page, { getAssetPath: (asset) => `/public/${asset}` })

const stylesheetsIn = (html) =>
  [...html.matchAll(/<link href="([^"]+)" rel="stylesheet">/g)].map(
    ([, href]) => href
  )

const moduleScriptsIn = (html) =>
  [...html.matchAll(/<script type="module" src="([^"]+)">/g)].map(
    ([, src]) => src
  )

describe('a release page that extends its release layout', () => {
  const html = render('alpha/pages/callout.njk')

  it('Should load the release styles after the application styles', () => {
    expect(stylesheetsIn(html)).toEqual([
      '/public/stylesheets/application.scss',
      '/public/release-alpha.css'
    ])
  })

  it('Should load the release script after the application script', () => {
    expect(moduleScriptsIn(html)).toEqual([
      '/public/application.js',
      '/public/release-alpha.js'
    ])
  })

  it('Should keep the shared page content', () => {
    expect(html).toContain('class="app-alpha-callout"')
    expect(html).toContain('govuk-header')
    expect(html).toContain('govuk-footer')
  })
})

describe('a page that extends the shared layout', () => {
  it.each([
    ['a page in the release that has assets', 'alpha/pages/plain.njk'],
    ['a page in a release with no assets', 'plain/pages/start.njk']
  ])('Should load only the application bundle on %s', (_, page) => {
    const html = render(page)

    expect(stylesheetsIn(html)).toEqual([
      '/public/stylesheets/application.scss'
    ])
    expect(moduleScriptsIn(html)).toEqual(['/public/application.js'])
  })
})
