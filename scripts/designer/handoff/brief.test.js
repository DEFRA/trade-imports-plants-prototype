import { describe, expect, it } from 'vitest'
import {
  briefOutline,
  isStoryReady,
  longDate,
  renderBriefJira,
  renderBriefMarkdown,
  renderTicketDescriptionJira,
  storyOf
} from './brief.js'
import { describeService } from './contract.js'
import { TRANSPORTERS_SERVICE } from './fixture-repo.js'

const FEATURES = 'src/server/app/sets/high-risk-plants/journeys/linear/features'
const COPY_EN = `${FEATURES}/arrival-details/copy/copy.en.js`
const COPY_CY = COPY_EN.replace('copy.en.js', 'copy.cy.js')
const COPY_TEST = COPY_EN.replace('copy.en.js', 'copy.test.js')

const TRANSPORTERS = (() => {
  const { proposed, ...service } = describeService(
    'transporters',
    (filePath) => TRANSPORTERS_SERVICE[filePath] ?? null,
    [`${FEATURES}/transporter/controller.js`]
  )
  return { ...service, proposedFiles: proposed.map((file) => file.path) }
})()

const REPORT = {
  set: 'plants-working',
  mode: 'release',
  placeholder: false,
  briefOnly: null,
  chain: [{ releaseId: 'plants-working', fromId: 'high-risk-plants' }],
  baseRef: 'a'.repeat(40),
  applyRef: 'HEAD',
  files: [{ path: COPY_EN, status: 'changed' }],
  leftOut: [
    {
      path: 'src/server/app/sets/plants-working/journeys/linear/features/extra/controller.js',
      reason: 'Uses code that only exists in the prototype.'
    }
  ],
  pages: [
    {
      feature: 'arrival-details',
      slugs: ['arrival-details'],
      files: [
        { path: COPY_EN, status: 'changed' },
        { path: COPY_CY, status: 'changed' }
      ],
      copy: [
        {
          language: 'en',
          key: 'time.hint',
          before: 'Use the 24-hour clock. For example, 14:30.',
          after: 'Use the 24-hour clock, for example 14:30.'
        }
      ]
    }
  ],
  applyCheck: { ok: true, empty: false, message: 'The patch applies cleanly.' },
  upstreamApplyCheck: null,
  wordsOnly: false,
  drift: { ref: 'b'.repeat(40), overlapping: [], elsewhere: [] },
  testImpact: [
    {
      text: 'Use the 24-hour clock. For example, 14:30.',
      file: COPY_TEST,
      line: 89
    }
  ],
  specImpact: [],
  specSources: { workspace: true },
  specCapabilities: ['journey-pages/arrival-details'],
  servicesToBuild: [],
  gateChanges: [],
  validation: [
    {
      page: 'arrival-details',
      field: 'arrivalTime',
      rule: 'Must be answered',
      english: 'Enter the expected time of arrival',
      welsh: 'Rhowch yr amser cyrraedd disgwyliedig'
    }
  ],
  journeyFlow: { rows: [], before: 'the real journey', error: null },
  cannotShip: {
    services: [
      {
        file: 'src/server/app/sets/plants-working/journeys/linear/features/extra/controller.js',
        specifier: '../../../../../../../prototype-data/index.js',
        kind: 'prototype-data',
        name: 'index'
      }
    ],
    welshNeeded: [
      {
        file: COPY_CY,
        line: 24,
        english: 'Use the 24-hour clock, for example 14:30.'
      }
    ],
    designGaps: [{ page: 'dashboard', why: 'No chip component' }],
    researchRules: []
  },
  recipes: ['add-a-field']
}

const META = {
  title: 'Clearer arrival time hint',
  why: 'Traders were unsure about the time format.',
  as: 'a trader notifying the arrival of potatoes',
  want: 'to know how to write the arrival time',
  soThat: 'I enter it right the first time',
  criteria: [
    {
      title: null,
      steps: [
        { keyword: 'Given', text: 'I am on the Arrival details page' },
        { keyword: 'When', text: 'I look at the time question' },
        {
          keyword: 'Then',
          text: 'the hint says "Use the 24-hour clock, for example 14:30."'
        }
      ]
    }
  ],
  links: ['https://github.com/DEFRA/trade-imports-plants-prototype/pull/12'],
  date: '2026-09-27',
  branch: 'feat/EUDPA-456-arrival-hint',
  designBranch: 'design/plants-working-arrival-hint',
  installCommand: 'npx --yes npm@11.6.2 ci',
  prototype: {
    repository: 'DEFRA/trade-imports-plants-prototype',
    cloneUrl: 'https://github.com/DEFRA/trade-imports-plants-prototype.git',
    deployedUrl: null
  },
  examples: [{ slug: 'complete', label: 'Complete' }],
  screenshots: [
    {
      slug: 'arrival-details',
      state: 'before',
      fileName: 'arrival-details--before.png'
    }
  ],
  skippedScreenshots: []
}

const markdownOf = (report = REPORT, meta = META) =>
  renderBriefMarkdown(briefOutline(report, meta))
const jiraOf = (report = REPORT, meta = META) =>
  renderBriefJira(briefOutline(report, meta))

describe('longDate', () => {
  it('Should write a date the GOV.UK way', () => {
    expect(longDate('2026-09-27')).toBe('27 September 2026')
  })
})

describe('the story block', () => {
  it('Should start the Jira text with the summary and the story, in the EUDPA shape', () => {
    expect(jiraOf()).toMatch(
      /^\*Summary:\* Clearer arrival time hint\n\n\*As\* a trader notifying the arrival of potatoes,\n\*I want\* to know how to write the arrival time,\n\*So that\* I enter it right the first time\n\n\*Description\*\n\nTraders were unsure about the time format\.\n/
    )
  })

  it('Should write the acceptance criteria as Given, When and Then', () => {
    expect(jiraOf()).toContain(
      '+*Acceptance Criteria*+\n*Given* I am on the Arrival details page\n*When* I look at the time question\n*Then* the hint says "Use the 24-hour clock, for example 14:30."'
    )
    expect(markdownOf()).toContain(
      '**Acceptance criteria**\n\n- **Given** I am on the Arrival details page\n- **When** I look at the time question'
    )
  })

  it('Should put the tech notes in a panel: patch, drift, services, tests, recipe and branch', () => {
    const jira = jiraOf()
    const panel = jira.slice(
      jira.indexOf('{panel:title=Tech Notes'),
      jira.indexOf('{panel}\n') + 7
    )

    expect(panel).toMatch(/^\{panel:title=Tech Notes\|bgColor=#deebff\}\n/)
    expect(panel).toContain('* Repos: trade-imports-plants-frontend.')
    expect(panel).toContain(
      '* Patch: upstream.patch applies cleanly to the prototype’s copy of the real journey, plants-frontend itself was not checked.'
    )
    expect(panel).toContain(
      '* Drift: The real journey has not changed since the release was made.'
    )
    expect(panel).toContain('* Services: none new.')
    expect(panel).toContain('* Tests: ')
    expect(panel).toContain(
      '* Recipe: {{src/server/app/sets/high-risk-plants/docs/add-a-field.md}} (plants-frontend, named)'
    )
    expect(panel).toContain(
      '* Branch: {{feat/EUDPA-456-arrival-hint}} in trade-imports-plants-frontend.'
    )
  })

  it('Should keep placeholders for the words the designer did not give, and name them', () => {
    const story = storyOf(REPORT, {
      ...META,
      as: null,
      soThat: ' ',
      criteria: null
    })

    expect(story.as).toBe('[Who is this for? In the designer’s own words.]')
    expect(story.placeholders).toEqual([
      'As (who it is for)',
      'So that (why they need it)',
      'Acceptance criteria'
    ])
    expect(jiraOf(REPORT, { ...META, as: null })).toContain(
      '*As* \\[Who is this for? In the designer’s own words.\\],'
    )
  })

  it('Should show drafted criteria the designer has not confirmed as a draft, and name them', () => {
    const draft = { ...META, criteriaDraft: true }
    const story = storyOf(REPORT, draft)

    expect(story.criteriaSource).toBe(
      'a draft, not yet confirmed by the designer'
    )
    expect(story.placeholders).toEqual([
      'Acceptance criteria (a draft: confirm with the designer)'
    ])
    expect(jiraOf(REPORT, draft)).toContain(
      '+*Draft Acceptance Criteria, to confirm*+\n*Given* I am on the Arrival details page'
    )
    expect(markdownOf(REPORT, draft)).toContain(
      '**Draft acceptance criteria, to confirm**\n\n- **Given**'
    )
  })

  it('Should write the criteria for a change of words only', () => {
    const story = storyOf(
      { ...REPORT, wordsOnly: true },
      { ...META, criteria: null }
    )

    expect(story.criteriaSource).toBe('generated from the changed words')
    expect(story.placeholders).toEqual([])
    expect(story.scenarios[0].steps[2].text).toBe(
      'they read "Use the 24-hour clock, for example 14:30."'
    )
  })
})

describe('See the prototype', () => {
  const markdown = markdownOf()

  it('Should list the links given and a link to each changed page', () => {
    expect(markdown).toContain(
      '- https://github.com/DEFRA/trade-imports-plants-prototype/pull/12'
    )
    expect(markdown).toContain(
      'Arrival details page, with the "complete" example: http://localhost:3103/examples/plants-working/complete?page=arrival-details'
    )
  })

  it('Should always say how to run it locally, from the workspace checkout, never a fresh clone', () => {
    expect(markdown).toContain(
      [
        '### Run it on your own computer',
        '',
        '1. `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype switch design/plants-working-arrival-hint`',
        '2. `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run dev`',
        '3. Open `http://localhost:3103/examples/plants-working/complete?page=arrival-details`'
      ].join('\n')
    )
    expect(markdown).not.toContain('git clone')
  })

  it('Should say a design branch that is not on GitHub yet must be pushed first', () => {
    expect(
      markdownOf(REPORT, { ...META, designBranchOnGitHub: false })
    ).toContain(
      '1. `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype switch design/plants-working-arrival-hint` (this branch is not on GitHub yet: ask the designer to push it first)'
    )
  })

  it('Should use the deployed address once prototype.json has one', () => {
    const deployed = markdownOf(REPORT, {
      ...META,
      prototype: { ...META.prototype, deployedUrl: 'https://plants.example' }
    })

    expect(deployed).toContain(
      '- The deployed prototype: https://plants.example/plants-working'
    )
    expect(deployed).toContain(
      'https://plants.example/examples/plants-working/complete?page=arrival-details'
    )
  })
})

describe('Journey flow', () => {
  it('Should show the before and after order of the changed pages', () => {
    const markdown = markdownOf({
      ...REPORT,
      journeyFlow: {
        rows: [
          {
            order: 'First pass, a new notification',
            before: 'origin > {{arrival-details}}',
            after: '{{arrival-details}} > origin'
          }
        ],
        before: 'the real journey (high-risk-plants) now',
        error: null
      },
      gateChanges: [
        {
          file: 'obligations/sections/arrival.js',
          added: ["applyTo: equalsGate(commodityType, 'plants')"],
          removed: []
        }
      ]
    })

    expect(markdown).toContain(
      '| First pass, a new notification | origin > `arrival-details` | `arrival-details` > origin |'
    )
    expect(markdown).toContain(
      "- `obligations/sections/arrival.js` adds `applyTo: equalsGate(commodityType, 'plants')`"
    )
  })

  it('Should say so when the order does not change', () => {
    expect(markdownOf()).toContain(
      '## Journey flow\n\nThe page order does not change.'
    )
  })

  it('Should not show a table or ask for the journey tests when the changed page keeps its place', () => {
    const markdown = markdownOf({
      ...REPORT,
      journeyFlow: {
        rows: [
          {
            order: 'First pass, a new notification',
            before: '{{origin}} > arrival-details',
            after: '{{origin}} > arrival-details',
            moved: false
          }
        ],
        before: 'the real journey (high-risk-plants) now',
        error: null
      }
    })

    expect(markdown).toContain(
      '## Journey flow\n\nThe page order does not change.'
    )
    expect(markdown).not.toContain('test:fit:journeys')
    expect(markdown).not.toContain('journey-flow-and-gates')
  })
})

describe('Validation', () => {
  it('Should put a new rule first and mark it', () => {
    const markdown = markdownOf({
      ...REPORT,
      pages: [
        {
          ...REPORT.pages[0],
          copy: [
            ...REPORT.pages[0].copy,
            {
              language: 'en',
              key: 'errors.grownUnderGlass',
              before: null,
              after: 'Select yes if the plants were grown under glass'
            }
          ]
        }
      ],
      validation: [
        ...REPORT.validation,
        {
          page: 'arrival-details',
          key: 'errors.grownUnderGlass',
          field: 'grownUnderGlass',
          rule: 'Must be answered',
          english: 'Select yes if the plants were grown under glass',
          welsh:
            '[Welsh needed] Select yes if the plants were grown under glass'
        }
      ]
    })
    const table = markdown.slice(markdown.indexOf('| Page | Field |'))

    expect(markdown).toContain('1 rule(s) are new or changed')
    expect(table.indexOf('New: Must be answered')).toBeGreaterThan(-1)
    expect(table.indexOf('`grownUnderGlass`')).toBeLessThan(
      table.indexOf('`arrivalTime`')
    )
  })

  it('Should give one row per rule with the English and Welsh error', () => {
    expect(markdownOf()).toContain(
      '| arrival-details | `arrivalTime` | Must be answered | Enter the expected time of arrival | Rhowch yr amser cyrraedd disgwyliedig |'
    )
    expect(jiraOf()).toContain(
      '||Page||Field||Rule||English error||Welsh error||'
    )
  })
})

describe('Service to build', () => {
  const report = {
    ...REPORT,
    files: [
      ...REPORT.files,
      {
        path: 'src/server/app/services/transporters/index.js',
        status: 'added',
        proposed: true
      }
    ],
    servicesToBuild: [TRANSPORTERS]
  }
  const markdown = markdownOf(report)

  it('Should say where it goes, what travels and what the story asks for', () => {
    expect(markdown).toContain('## Service to build: transporters')
    expect(markdown).toContain(
      'It goes in `src/server/app/services/transporters/` in plants-frontend'
    )
    expect(markdown).toContain(
      'marked proposed, with the prototype’s isStubDataMode() written as plants-frontend’s isStubMode()'
    )
    expect(markdown).toContain(
      'The story asks for the backend endpoint (its address in `TRADE_IMPORTS_TRANSPORTERS_URL`) and for `client.js` to be hardened.'
    )
  })

  it('Should name the stub’s one prototype-only import', () => {
    expect(markdown).toContain(
      '`stub.js` is not in the patch: its one prototype-only import is `src/server/prototype-support/fake-store.js`'
    )
  })

  it('Should list the operations, the record fields, the examples and the open questions from CONTRACT', () => {
    expect(markdown).toContain(
      '| `createTransporter` | `POST /organisations/{orgId}/transporters` | orgId, fields | the saved transporter | 400 with a problem body naming each field to fix |'
    )
    expect(markdown).toContain(
      '| `transporterType` | string | Yes | commercial, private |'
    )
    expect(markdown).toContain(
      '- {"id":"haulage-ltd","name":"Haulage Ltd","transporterType":"commercial"}'
    )
    expect(markdown).toContain(
      '- Which backend owns this data? The prototype proposes a new API.'
    )
    expect(markdown).toContain(
      '- Are `GET /organisations/{orgId}/transporters`, `POST /organisations/{orgId}/transporters` the right REST noun endpoints for it?'
    )
    expect(markdown).toContain(
      '- Can one organisation see another organisation’s transporters?'
    )
  })

  it('Should escape the curly brackets of a path in Jira', () => {
    expect(jiraOf(report)).toContain(
      '{{POST /organisations/\\{orgId\\}/transporters}}'
    )
  })

  it('Should name the service in the tech notes and in what cannot ship yet', () => {
    expect(jiraOf(report)).toContain(
      '* Services: build {{src/server/app/services/transporters}} (see "Service to build").'
    )
    expect(jiraOf(report)).toContain(
      '* Repos: trade-imports-plants-frontend; a new API, owner to be agreed.'
    )
    expect(markdown).toContain(
      '- `src/server/app/services/transporters` is a new service, proposed in the patch.'
    )
  })
})

describe('Tests to add and the note for the developer or agent', () => {
  const markdown = markdownOf()

  it('Should list the tests to add, ending with the required checks', () => {
    expect(markdown).toContain('## Tests to add')
    expect(markdown).toContain(
      'Update the 1 test line(s) that still expect the old words (listed under Detail).'
    )
    expect(markdown).toContain('`npm run test:high-risk-plants`')
  })

  it('Should send the developer to build it in the workspace’s plants-frontend checkout, on the story’s branch, with the recipe, then spec-catchup/spec-cover, then code-style and review', () => {
    expect(markdown).toContain(
      'Build it properly in `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` on `feat/EUDPA-456-arrival-hint`'
    )
    expect(markdown).toContain(
      '`.claude/skills/frontend-change/SKILL.md`, target high-risk-plants-frontend'
    )
    expect(markdown).toContain(
      'following `src/server/app/sets/high-risk-plants/docs/add-a-field.md`'
    )
    expect(markdown).toContain('`.claude/skills/spec-catchup/SKILL.md`')
    expect(markdown).toContain('`.claude/skills/spec-cover/SKILL.md`')
    expect(markdown).toContain('`openspec/specs/plants` in the workspace')
    expect(markdown).toContain('`.claude/skills/code-style/SKILL.md`')
    expect(markdown).toContain('`.claude/skills/review/SKILL.md`')
    expect(markdown).toContain(
      '`openspec/specs/plants/journey-pages/arrival-details/spec.md` with `openspec/coverage/plants/journey-pages/arrival-details/coverage.json`'
    )
    const developerSection = markdown.slice(
      markdown.indexOf('## For the developer or agent'),
      markdown.indexOf('\n\n---')
    )
    expect(developerSection).not.toContain(
      'in a clone of trade-imports-plants-frontend'
    )
  })

  it('Should send a new service through requirements-pipeline as a full-stack story, naming the owner repo, and skip the recipe route', () => {
    const withService = markdownOf({
      ...REPORT,
      servicesToBuild: [TRANSPORTERS]
    })

    expect(withService).toContain(
      '`.claude/skills/requirements-pipeline/SKILL.md`'
    )
    expect(withService).toContain('a new service, not one recipe')
    expect(withService).toContain('a new API, owner to be agreed')
    expect(withService).not.toContain(
      '`.claude/skills/frontend-change/SKILL.md`'
    )
  })

  it('Should send a ruling conflict through requirements-pipeline for the product owner to settle', () => {
    const withConflict = markdownOf({
      ...REPORT,
      rulingConflicts: [
        {
          service: 'transporters',
          matchedTerm: 'transporter',
          source: 'src/server/app/sets/high-risk-plants/docs/services.md'
        }
      ]
    })

    expect(withConflict).toContain(
      '`.claude/skills/requirements-pipeline/SKILL.md`'
    )
    expect(withConflict).toContain('clashes with a standing ruling')
    expect(withConflict).toContain(
      'Ruling conflict: transporters matches "transporter"'
    )
  })
})

describe('the Detail', () => {
  const markdown = markdownOf()

  it('Should follow a rule, with the date and the release', () => {
    expect(markdown).toContain(
      '---\n\n## Detail\n\nHand-off from the plants prototype, 27 September 2026. Design release plants-working, made from high-risk-plants.'
    )
  })

  it('Should list the Welsh still needed', () => {
    expect(markdown).toContain(
      `- \`${COPY_CY}\` line 24 (once the patch is applied): "Use the 24-hour clock, for example 14:30."`
    )
  })

  it('Should list the test that pins the old words', () => {
    expect(markdown).toContain(
      `- \`${COPY_TEST}\` line 89: "Use the 24-hour clock. For example, 14:30."`
    )
  })

  it('Should show the copy change as old and new English', () => {
    expect(markdown).toContain(
      '| `time.hint` | Use the 24-hour clock. For example, 14:30. | Use the 24-hour clock, for example 14:30. |'
    )
  })

  it('Should show the before screenshot for the page', () => {
    expect(markdown).toContain(
      '![arrival-details: before](screenshots/arrival-details--before.png)'
    )
  })

  it('Should name what cannot ship and what was left out', () => {
    expect(markdown).toContain(
      'imports `../../../../../../../prototype-data/index.js`, the prototype’s extra example data.'
    )
    expect(markdown).toContain(
      'Design gap: page: dashboard; why: No chip component'
    )
    expect(markdown).toContain('Uses code that only exists in the prototype.')
  })

  it.each([
    [
      'with the note after "Content note:"',
      {
        page: 'task-list',
        'what the design wants':
          'Content note: The group also holds identification numbers.',
        'closest option built':
          'No change: the words are as the designer asked',
        why: 'Content designer to review',
        frame: 'None'
      }
    ],
    [
      'with the note in the next cell',
      {
        page: 'task-list',
        'what the design wants': 'Content note',
        'closest option built': 'The group also holds identification numbers.',
        why: 'Content designer to review',
        frame: 'None'
      }
    ]
  ])(
    'Should list a content note as a plain note, not a design gap (%s)',
    (_shape, note) => {
      const brief = markdownOf({
        ...REPORT,
        cannotShip: { ...REPORT.cannotShip, designGaps: [note] }
      })

      expect(brief).toContain(
        '## Content notes\n\n- Task list: The group also holds identification numbers. (Content designer to review)'
      )
      expect(brief).not.toContain('Design gap: page: task-list')
    }
  )

  it('Should head each page with the name designers use, then its id', () => {
    const brief = markdownOf({
      ...REPORT,
      pages: [
        { ...REPORT.pages[0], feature: 'hub', slugs: ['hub'] },
        {
          ...REPORT.pages[0],
          feature: 'check-answers',
          slugs: ['notification-view']
        }
      ]
    })

    expect(brief).toContain('### Task list (hub)')
    expect(brief).toContain('### Check your answers (notification-view)')
  })

  it('Should explain both ways the change can land', () => {
    expect(markdown).toContain('`git apply --3way upstream.patch`')
    expect(markdown).toContain('The prototype never pushes to plants-frontend.')
  })

  it('Should use Jira headings and tables, and escape the Welsh marker', () => {
    const jira = jiraOf()

    expect(jira).toContain('h2. Welsh needed')
    expect(jira).toContain('||Key||Old English||New English||')
    expect(jira).toContain('\\[Welsh needed\\]')
    expect(jira).toContain(`* {{${COPY_TEST}}} line 89`)
  })
})

describe('brief only', () => {
  const report = {
    ...REPORT,
    briefOnly: {
      reason:
        'It was made from the sample-journey placeholder, not the real journey, so there is no real page to patch.'
    },
    placeholder: true,
    files: [],
    applyCheck: { ok: true, empty: true, briefOnly: true, message: 'x' }
  }
  const markdown = markdownOf(report, { ...META, examples: [] })

  it('Should say there is no patch, and why, in the tech notes and how to apply', () => {
    expect(markdown).toContain(
      '- Patch: No patch. It was made from the sample-journey placeholder'
    )
    expect(markdown).toContain(
      '## How to apply\n\nThere is no patch. It was made from the sample-journey placeholder'
    )
    expect(markdown).not.toContain('git apply --3way upstream.patch')
  })

  it('Should still give the story, the way to run it and the developer note', () => {
    expect(markdown).toContain(
      '**As** a trader notifying the arrival of potatoes,'
    )
    expect(markdown).toContain(
      'plants-working has no example notifications to link to.'
    )
    expect(markdown).toContain('3. Open `http://localhost:3103/plants-working`')
    expect(markdown).toContain(
      'There is no patch: build it from this story and the pictures.'
    )
  })
})

describe('isStoryReady', () => {
  it('Should be ready when there are no placeholders and the criteria are not a draft', () => {
    expect(isStoryReady({ placeholders: [], criteriaDraft: false })).toBe(true)
  })

  it('Should not be ready with a placeholder left, or an unconfirmed draft', () => {
    expect(
      isStoryReady({
        placeholders: ['As (who it is for)'],
        criteriaDraft: false
      })
    ).toBe(false)
    expect(isStoryReady({ placeholders: [], criteriaDraft: true })).toBe(false)
  })
})

describe('renderTicketDescriptionJira', () => {
  it('Should drop the Summary line and every "(attach ...)" suffix', () => {
    const blocks = briefOutline(REPORT, META)
    const description = renderTicketDescriptionJira(blocks)

    expect(description).not.toMatch(/^\*Summary:\*/)
    expect(description).not.toContain('(attach')
    expect(description).toContain('*As* a trader notifying')
  })
})

describe('workspace plants-frontend apply check', () => {
  it('Should say when the patch also applies to the workspace’s own plants-frontend checkout', () => {
    const markdown = markdownOf({
      ...REPORT,
      plantsFrontendApplyCheck: { ref: 'origin/main', ok: true }
    })

    expect(markdown).toContain(
      "also applies cleanly to the workspace's own `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` (its origin/main)"
    )
  })

  it('Should say when it does not, so a developer knows to merge by hand there too', () => {
    const markdown = markdownOf({
      ...REPORT,
      plantsFrontendApplyCheck: { ref: 'origin/main', ok: false }
    })

    expect(markdown).toContain('merge by hand there too')
  })
})
