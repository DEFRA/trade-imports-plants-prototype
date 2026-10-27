import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { revParse } from '../lib/git.js'
import { allowRepoScaleWork, makeFixtureRepo } from '../lib/test-support.js'
import { checkReleaseAssets } from './release-assets.js'

allowRepoScaleWork()

const SET = 'plants-working'
const DIR = `src/server/app/sets/${SET}`
const PAGE = `${DIR}/journeys/linear/features/origin/template.njk`
const PATTERNS = `${DIR}/patterns.md`
const MANDATES = `${DIR}/mandates.md`

const STYLES = `@use "govuk-frontend/dist/govuk/base" as *;
@use "pkg:@ministryofjustice/frontend/moj/components/filter/filter";
@use "commodity-search";
`

const COMMODITY_SEARCH_SASS = `@use "govuk-frontend/dist/govuk/base" as *;

.app-plants-working-commodity-search {
  padding: govuk-spacing(3);
  border-left: 5px solid govuk-colour("blue");

  &__results {
    margin: 0;
  }

  p {
    color: govuk-colour("black");
  }
}

@include govuk-media-query($from: tablet) {
  .app-plants-working-commodity-search {
    padding: govuk-spacing(6);
  }
}
`

const SCRIPTS = `import { createAll, Tabs } from 'govuk-frontend'
import { Filter } from '@ministryofjustice/frontend'
import { CommoditySearch } from './commodity-search.js'

createAll(Tabs)
createAll(Filter)
createAll(CommoditySearch)
`

const LAYOUT = `{% extends "shared/layout.njk" %}

{% block head %}
  {{ super() }}
  <link href="{{ getAssetPath('release-${SET}.css') }}" rel="stylesheet">
{% endblock %}

{% block bodyEnd %}
  {{ super() }}
  <script type="module" src="{{ getAssetPath('release-${SET}.js') }}"></script>
{% endblock %}
`

const PAGE_TEMPLATE = `{% extends "${SET}/layout.njk" %}

{% block content %}
  <ul class="app-task-list">
    <li class="app-task-list__item">Origin</li>
  </ul>
  <div class="app-plants-working-commodity-search" data-module="app-plants-working-commodity-search">
    <ul class="app-plants-working-commodity-search__results"></ul>
  </div>
{% endblock %}
`

const MANDATE_WORDS =
  "build the commodity search as designed, we're testing it in round 3"

const MANDATES_TEXT = `# Mandates

## m-2026-10-27-1

- Date: 2026-10-27
- Words: ${MANDATE_WORDS}
- Scope: commodity-search

## m-2026-10-27-2

- Date: 2026-10-27
- Words: can the dashboard tabs and the filter actually work?
- Scope: (agent's reading) dashboard
`

const PATTERNS_TEXT = `# Release patterns

## Commodity search

- Kind: Custom
- Pages: origin
- Classes: app-plants-working-commodity-search
- Files: assets/styles.scss, assets/_commodity-search.scss, assets/commodity-search.js, assets/scripts.js
- Why not GOV.UK or MoJ:
  - GOV.UK: Select with autocomplete. No results list.
  - MoJ: Search. No results list.
- Need or hypothesis: traders find a code faster by typing part of the plant name.
- Research round: Round 3 (12 Nov 2026)
- Findings: none yet
- Asked by: "${MANDATE_WORDS}" (m-2026-10-27-1)
- Status: Open

## Tabs and filter on the dashboard

- Kind: Switch on
- Components: govuk Tabs, moj Filter
- Pages: dashboard
- Files: assets/scripts.js, assets/styles.scss
- Asked by: "can the dashboard tabs and the filter actually work?" (m-2026-10-27-2)
- Status: Open
`

const writeRelease = (fixture) => {
  fixture.write(
    'src/client/stylesheets/components/_task-list.scss',
    '.app-task-list {\n  &__item {\n    margin: 0;\n  }\n}\n'
  )
  fixture.write(`${DIR}/assets/styles.scss`, STYLES)
  fixture.write(`${DIR}/assets/_commodity-search.scss`, COMMODITY_SEARCH_SASS)
  fixture.write(`${DIR}/assets/scripts.js`, SCRIPTS)
  fixture.write(
    `${DIR}/assets/commodity-search.js`,
    'export class CommoditySearch {\n  constructor($root) {\n    this.$root = $root\n  }\n}\n'
  )
  fixture.write(
    `${DIR}/assets/commodity-search.test.js`,
    "import { expect, it } from 'vitest'\nimport { CommoditySearch } from './commodity-search.js'\n\nit('Should attach to the search', () => {\n  expect(new CommoditySearch(null)).toBeDefined()\n})\n"
  )
  fixture.write(`${DIR}/layout.njk`, LAYOUT)
  fixture.write(PAGE, PAGE_TEMPLATE)
  fixture.write(PATTERNS, PATTERNS_TEXT)
  fixture.write(MANDATES, MANDATES_TEXT)
}

describe('checkReleaseAssets', () => {
  let fixture
  beforeEach(() => {
    fixture = makeFixtureRepo({ git: true })
    writeRelease(fixture)
    fixture.commitAll('the release with its patterns')
  })
  afterEach(() => fixture.cleanup())

  const check = (options = {}) =>
    checkReleaseAssets(SET, { root: fixture.root, ...options })
  const messages = (options) =>
    check(options).problems.map(({ file, message }) => `${file}: ${message}`)

  it('Should pass a release whose patterns are prefixed, recorded and asked for', () => {
    expect(check()).toEqual({ problems: [], patterns: 2, assets: 5 })
  })

  it('Should pass a set with no styles, scripts or patterns of its own', () => {
    expect(checkReleaseAssets('plants-dr2', { root: fixture.root })).toEqual({
      problems: [],
      patterns: 0,
      assets: 0
    })
  })

  describe('the assets folder', () => {
    it('Should refuse a file that is not Sass or a script', () => {
      fixture.write(`${DIR}/assets/logo.png`, 'not really a picture')

      expect(messages()).toEqual([
        `${DIR}/assets/logo.png: Your release's assets hold only Sass and script files. Move logo.png out.`
      ])
    })

    it('Should ask for a test beside a script module', () => {
      fixture.remove(`${DIR}/assets/commodity-search.test.js`)

      expect(messages()).toEqual([
        `${DIR}/assets/commodity-search.js: Add assets/commodity-search.test.js showing the page works without the script, and that the script attaches to it.`
      ])
    })

    it('Should ask for scripts.test.js once scripts.js does more than switch components on', () => {
      fixture.write(
        `${DIR}/assets/scripts.js`,
        `${SCRIPTS}document.body.classList.add('js-ready')\n`
      )

      expect(messages()).toEqual([
        `${DIR}/assets/scripts.js: Add assets/scripts.test.js showing the page works without the script, and that the script attaches to it.`
      ])
    })

    it('Should ask for every asset to be on the Files line of a pattern', () => {
      fixture.write(
        `${DIR}/assets/_spare.scss`,
        '.app-plants-working-commodity-search { margin: 0; }\n'
      )

      expect(messages()).toEqual([
        `${DIR}/assets/_spare.scss: Add assets/_spare.scss to the Files line of its pattern in patterns.md, so everyone can see why it exists.`
      ])
    })

    it('Should ask for Sass outside the assets folder to move into it', () => {
      fixture.write(`${DIR}/journeys/linear/features/origin/origin.scss`, '')

      expect(messages()).toEqual([
        `${DIR}/journeys/linear/features/origin/origin.scss: Nothing loads Sass from here. Move it into ${DIR}/assets/.`
      ])
    })
  })

  describe('switched-on components', () => {
    it('Should ask for a GOV.UK component a script switches on to be recorded', () => {
      fixture.write(
        `${DIR}/assets/scripts.js`,
        SCRIPTS.replace('Tabs }', 'Tabs, Accordion }').concat(
          'createAll(Accordion)\n'
        )
      )

      expect(messages()).toEqual([
        `${PATTERNS}: Your release switches on govuk accordion. Add it to the Components line of a Switch on entry in patterns.md.`
      ])
    })

    it('Should ask for an MoJ component the Sass loads to be recorded', () => {
      fixture.write(
        `${DIR}/assets/styles.scss`,
        `${STYLES}@use "@ministryofjustice/frontend/moj/components/sortable-table/sortable-table";\n`
      )

      expect(messages()).toEqual([
        `${PATTERNS}: Your release switches on moj sortabletable. Add it to the Components line of a Switch on entry in patterns.md.`
      ])
    })

    it('Should refuse initAll, which switches on everything unrecorded', () => {
      fixture.write(
        `${DIR}/assets/scripts.js`,
        SCRIPTS.replace('createAll, Tabs', 'createAll, initAll, Tabs')
      )

      expect(messages()).toEqual([
        `${DIR}/assets/scripts.js: It imports initAll, which switches on every component at once. Switch each component on with createAll, so each one is recorded.`
      ])
    })
  })

  describe('pattern entries', () => {
    it('Should ask for a missing research round', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace('- Research round: Round 3 (12 Nov 2026)\n', '')
      )

      expect(messages()).toEqual([
        `${PATTERNS}: Add a "Research round" line to "Commodity search".`
      ])
    })

    it('Should ask for a missing reason', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace(/- Need or hypothesis: [^\n]+\n/, '')
      )

      expect(messages()).toEqual([
        `${PATTERNS}: Add a "Need or hypothesis" line to "Commodity search".`
      ])
    })

    it('Should ask for a kind it knows', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace('- Kind: Switch on', '- Kind: Enable')
      )

      expect(messages()).toContain(
        `${PATTERNS}: "Tabs and filter on the dashboard" needs a Kind line: "- Kind: Switch on" or "- Kind: Custom".`
      )
    })

    it('Should ask for a status it knows', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace('- Status: Open\n\n', '- Status: Done\n\n')
      )

      expect(messages()).toEqual([
        `${PATTERNS}: "Commodity search" has the status "Done". Use Option, Open, or "Closed: " and how it closed.`
      ])
    })

    it('Should ask which MoJ component a custom pattern was checked against', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace('  - MoJ: Search. No results list.\n', '')
      )

      expect(messages()).toEqual([
        `${PATTERNS}: "Commodity search" does not say which MoJ component was checked. Say which GOV.UK and which MoJ component you checked, and why each did not fit, as "  - GOV.UK: …" and "  - MoJ: …" lines under "Why not GOV.UK or MoJ".`
      ])
    })

    it('Should refuse an empty rung line', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace(
          'GOV.UK: Select with autocomplete. No results list.',
          'GOV.UK: none'
        )
      )

      expect(messages()).toEqual([
        expect.stringContaining(
          'does not say which GOV.UK component was checked'
        )
      ])
    })

    it('Should refuse a quote that is not in the mandate it cites', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace(`"${MANDATE_WORDS}"`, '"build whatever you like"')
      )

      expect(messages()).toEqual([
        `${PATTERNS}: "Commodity search" is asked for by "build whatever you like" (m-2026-10-27-1), which is not word for word in a mandate in mandates.md. Asked by must quote a recorded mandate, then its id in brackets. Ask the designer, then run designer:mandate record.`
      ])
    })

    it('Should refuse a quote citing a mandate that was never recorded', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace('(m-2026-10-27-1)', '(m-2026-10-27-9)')
      )

      expect(messages()).toEqual([
        expect.stringContaining('is not word for word in a mandate')
      ])
    })

    it('Should leave a copied entry to trace to the release it came from', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace(
          `"${MANDATE_WORDS}"`,
          '"words from the first release"'
        ).replace(
          '- Status: Open\n\n',
          '- Copied from: plants-dr2 on 2026-10-27\n- Status: Open\n\n'
        )
      )

      expect(messages()).toEqual([])
    })

    it('Should not ask a closed entry to trace its quote', () => {
      fixture.write(
        PATTERNS,
        PATTERNS_TEXT.replace(
          `"${MANDATE_WORDS}"`,
          '"words since lost"'
        ).replace(
          '- Status: Open\n\n',
          '- Status: Closed: dropped after round 3, traders preferred the list\n\n'
        )
      )

      expect(messages()).toEqual([])
    })
  })

  describe('mandates', () => {
    it('Should accept a new mandate added after the earlier ones', () => {
      fixture.write(
        MANDATES,
        `${MANDATES_TEXT}\n## m-2026-10-28-1\n\n- Date: 2026-10-28\n- Words: try a summary card\n- Scope: check-answers\n`
      )

      expect(messages()).toEqual([])
    })

    it('Should refuse a recorded mandate that changed', () => {
      fixture.write(
        MANDATES,
        MANDATES_TEXT.replace(MANDATE_WORDS, 'build anything at all')
      )

      expect(messages()).toEqual([
        expect.stringContaining('is not word for word in a mandate'),
        `${MANDATES}: The mandate m-2026-10-27-1 was changed or removed. mandates.md only gains entries. Put the old entry back.`
      ])
    })

    it('Should compare mandates with the commit the run started from', () => {
      const start = revParse('HEAD', { root: fixture.root })
      fixture.write(MANDATES, '# Mandates\n')
      fixture.commitAll('mandates emptied')

      expect(messages({ since: start })).toContain(
        `${MANDATES}: The mandate m-2026-10-27-2 was changed or removed. mandates.md only gains entries. Put the old entry back.`
      )
    })
  })

  describe('classes', () => {
    it("Should ask for a class without the release's prefix to be renamed", () => {
      fixture.write(
        PAGE,
        PAGE_TEMPLATE.replace(
          '<ul class="app-task-list">',
          '<ul class="app-search-box">'
        )
      )

      expect(messages()).toEqual([
        `${PAGE}: Rename app-search-box to app-plants-working-<name>, so it cannot clash with the real service.`
      ])
    })

    it("Should accept the real service's own classes and their elements", () => {
      expect(messages()).toEqual([])
    })

    it('Should ask for a prefixed class no pattern lists', () => {
      fixture.write(
        PAGE,
        PAGE_TEMPLATE.replace(
          '<ul class="app-task-list">',
          '<ul class="app-plants-working-summary">'
        )
      )

      expect(messages()).toEqual([
        `${PAGE}: Add app-plants-working-summary to the Classes line of its pattern in patterns.md.`
      ])
    })

    it('Should ask for a prefixed class in a controller to be recorded too', () => {
      fixture.write(
        `${DIR}/journeys/linear/features/origin/controller.js`,
        "export const wrapper = 'app-plants-working-wrapper'\n"
      )

      expect(messages()).toEqual([
        `${DIR}/journeys/linear/features/origin/controller.js: Add app-plants-working-wrapper to the Classes line of its pattern in patterns.md.`
      ])
    })
  })

  describe('styles stay on their pattern', () => {
    it('Should refuse a rule that styles bare elements', () => {
      fixture.write(
        `${DIR}/assets/_commodity-search.scss`,
        `${COMMODITY_SEARCH_SASS}\nbody {\n  margin: 0;\n}\n`
      )

      expect(messages()).toEqual([
        `${DIR}/assets/_commodity-search.scss: The rule "body" could style pages beyond your pattern. Start each rule with an app-plants-working- class, so it only styles your pattern.`
      ])
    })

    it('Should refuse a lone GOV.UK selector beside a prefixed one', () => {
      fixture.write(
        `${DIR}/assets/_commodity-search.scss`,
        `${COMMODITY_SEARCH_SASS}\n.app-plants-working-commodity-search, .govuk-button {\n  margin: 0;\n}\n`
      )

      expect(messages()).toEqual([
        expect.stringContaining('The rule ".govuk-button" could style pages')
      ])
    })

    it('Should refuse a colour written by hand', () => {
      fixture.write(
        `${DIR}/assets/_commodity-search.scss`,
        COMMODITY_SEARCH_SASS.replace('govuk-colour("black")', '#0b0c0c')
      )

      expect(messages()).toEqual([
        `${DIR}/assets/_commodity-search.scss: "color: #0b0c0c" writes a colour by hand. Use govuk-colour() or a GOV.UK functional colour, such as govuk-functional-colour(text).`
      ])
    })

    it('Should refuse styles on the shared header, even inside a pattern', () => {
      fixture.write(
        `${DIR}/assets/_commodity-search.scss`,
        `${COMMODITY_SEARCH_SASS}\n.app-plants-working-commodity-search .govuk-header__link {\n  margin: 0;\n}\n`
      )

      expect(messages()).toEqual([
        `${DIR}/assets/_commodity-search.scss: ".app-plants-working-commodity-search .govuk-header__link" styles the shared chrome. The header, service navigation, phase banner and footer are shared by every set. Log the change you want in design-gaps.md instead.`
      ])
    })

    it('Should refuse a script that reaches for the shared footer', () => {
      fixture.write(
        `${DIR}/assets/commodity-search.js`,
        "export const footer = () => document.querySelector('.govuk-footer')\n"
      )

      expect(messages()).toEqual([
        expect.stringContaining('It names a shared-chrome class.')
      ])
    })
  })

  describe("the real service's files", () => {
    it('Should refuse Sass that loads from src/client', () => {
      fixture.write(
        `${DIR}/assets/styles.scss`,
        `${STYLES}@use "../../../../client/stylesheets/components/task-list";\n`
      )

      expect(messages()).toEqual([
        `${DIR}/assets/styles.scss: It loads "../../../../client/stylesheets/components/task-list". Your release's styles and scripts can use only GOV.UK Frontend, MoJ Frontend and files in your release's assets folder. Copy what you need into assets/ instead: src/client belongs to the real service.`
      ])
    })

    it('Should refuse a script that imports a package other than GOV.UK or MoJ Frontend', () => {
      fixture.write(
        `${DIR}/assets/scripts.js`,
        `import debounce from 'lodash/debounce.js'\n${SCRIPTS}`
      )

      expect(messages()).toEqual([
        expect.stringContaining('It loads "lodash/debounce.js".')
      ])
    })

    it.each([
      'src/client/stylesheets/application.scss',
      'webpack.config.js',
      'src/server/app/shared/layout.njk'
    ])(
      'Should refuse a change to %s while working in a design release',
      (repoPath) => {
        expect(messages({ changedPaths: [repoPath], branch: 'main' })).toEqual([
          expect.stringMatching(
            new RegExp(
              `^${repoPath}: It belongs to the real service and holds .+ Undo the change, then put your release's own styles and scripts in ${DIR}/assets/, or log what you need in design-gaps.md.$`
            )
          )
        ])
      }
    )

    it("Should leave a maintainer's change on a chore branch to the ownership step", () => {
      expect(
        messages({
          changedPaths: ['src/client/javascripts/application.js'],
          branch: 'chore/NO_JIRA-tidy'
        })
      ).toEqual([])
    })
  })

  describe('the release layout', () => {
    it('Should refuse a layout that changes another block', () => {
      fixture.write(
        `${DIR}/layout.njk`,
        `${LAYOUT}\n{% block header %}{% endblock %}\n`
      )

      expect(messages()).toEqual([
        `${DIR}/layout.njk: It changes the "header" block. Your release layout can only add your styles and script. The header and footer stay shared.`
      ])
    })

    it('Should refuse a layout that drops what every page loads', () => {
      fixture.write(
        `${DIR}/layout.njk`,
        LAYOUT.replace('{% block head %}\n  {{ super() }}', '{% block head %}')
      )

      expect(messages()).toEqual([
        `${DIR}/layout.njk: Its "head" block leaves out {{ super() }}, which keeps what every page already loads. Your release layout can only add your styles and script. The header and footer stay shared.`
      ])
    })

    it('Should refuse a layout that does not extend the shared one', () => {
      fixture.write(
        `${DIR}/layout.njk`,
        LAYOUT.replace('shared/layout.njk', 'govuk/template.njk')
      )

      expect(messages()).toEqual([
        `${DIR}/layout.njk: It must extend "shared/layout.njk". Your release layout can only add your styles and script. The header and footer stay shared.`
      ])
    })

    it('Should refuse a page that extends another set’s layout', () => {
      fixture.write(
        PAGE,
        PAGE_TEMPLATE.replace(`${SET}/layout.njk`, 'plants-dr2/layout.njk')
      )

      expect(messages()).toEqual([
        `${PAGE}: It extends "plants-dr2/layout.njk". Extend shared/layout.njk, or your release's own plants-working/layout.njk.`
      ])
    })
  })

  describe('inline styles and scripts', () => {
    it.each([
      ['<p style="color: red">Hi</p>', 'a style attribute'],
      ['<style>p { color: red; }</style>', 'an inline <style> element'],
      ['<script>alert(1)</script>', 'an inline <script> element']
    ])('Should refuse %s in a page', (markup, what) => {
      fixture.write(
        PAGE,
        PAGE_TEMPLATE.replace('{% endblock %}', `${markup}\n{% endblock %}`)
      )

      expect(messages()).toEqual([
        `${PAGE}: It has ${what}. The security settings block inline styles and scripts. Put them in your release's assets instead.`
      ])
    })
  })

  describe('a run with no designer’s mandate', () => {
    const start = () => revParse('HEAD', { root: fixture.root })

    it('Should pass when the run added no pattern', () => {
      const since = start()
      fixture.write(PAGE, PAGE_TEMPLATE.replace('Origin', 'Where it grew'))

      expect(messages({ since, noNewPatterns: true })).toEqual([])
    })

    it('Should refuse a change to the assets, even one that is recorded', () => {
      const since = start()
      fixture.write(
        `${DIR}/assets/_commodity-search.scss`,
        COMMODITY_SEARCH_SASS.replace('govuk-spacing(3)', 'govuk-spacing(4)')
      )

      expect(messages({ since, noNewPatterns: true })).toEqual([
        `${DIR}/assets/_commodity-search.scss: It changed. This run has no designer’s mandate, so it cannot add a pattern. Build the nearest option and log a design gap.`
      ])
    })

    it('Should refuse a change to patterns.md, layout.njk or mandates.md', () => {
      const since = start()
      fixture.write(PATTERNS, `${PATTERNS_TEXT}\n`)
      fixture.write(`${DIR}/layout.njk`, `${LAYOUT}\n`)
      fixture.write(MANDATES, `${MANDATES_TEXT}\n`)

      expect(
        messages({ since, noNewPatterns: true }).map(
          (line) => line.split(':')[0]
        )
      ).toEqual([`${DIR}/layout.njk`, MANDATES, PATTERNS])
    })

    it('Should refuse a new class, while keeping the classes already there', () => {
      const since = start()
      fixture.write(
        PAGE,
        PAGE_TEMPLATE.replace(
          '<ul class="app-task-list">',
          '<ul class="app-plants-working-commodity-search__results app-plants-working-extra">'
        )
      )

      expect(messages({ since, noNewPatterns: true })).toEqual([
        `${PAGE}: Add app-plants-working-extra to the Classes line of its pattern in patterns.md.`,
        `${PAGE}: It adds the class app-plants-working-extra. This run has no designer’s mandate, so it cannot add a pattern. Build the nearest option and log a design gap.`
      ])
    })

    it('Should refuse a run with no commit to compare with', () => {
      expect(messages({ noNewPatterns: true })).toEqual([
        '--since: Refusing new patterns needs the commit the run started from. Add --since <commit>.'
      ])
    })

    it('Should refuse a commit that does not exist', () => {
      expect(messages({ since: 'no-such-commit' })).toEqual([
        '--since: There is no commit "no-such-commit". Pass the commit this run started from.'
      ])
    })
  })
})
