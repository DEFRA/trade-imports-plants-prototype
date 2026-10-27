import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildHandoff, HandoffError } from './build.js'
import { commitAll, makeRepo, removeRepo, writeFiles } from './fixture-repo.js'

const TIMEOUT_MS = 120_000
const SETS = 'src/server/app/sets'
const REAL = `${SETS}/high-risk-plants`
const RELEASE = `${SETS}/plants-working`
const ORIGIN = 'journeys/linear/features/origin/template.njk'
const HUB = 'journeys/linear/features/hub/template.njk'

const realTemplate = (heading) =>
  `{% extends "shared/layout.njk" %}\n\n{% block content %}\n  <h1 class="govuk-heading-l">${heading}</h1>\n{% endblock %}\n`

const MANDATES = `# Mandates

## m-2026-10-27-1

- Date: 2026-10-27
- Words: try a callout on the origin page
- Scope: origin
`

const pattern = (status, extra = '') => `# Release patterns

## Callout

${extra}- Kind: Custom
- Pages: origin
- Classes: app-plants-working-callout
- Files: assets/styles.scss
- Why not GOV.UK or MoJ:
  - GOV.UK: Inset text. No icon.
  - MoJ: Banner. Too loud.
- Need or hypothesis: traders notice the rule.
- Research round: Round 3 (12 Nov 2026)
- Findings: none yet
- Asked by: "try a callout on the origin page" (m-2026-10-27-1)
- Status: ${status}
`

const handOver = (root) => buildHandoff({ root, set: 'plants-working' })

describe('designer:handoff with release patterns', () => {
  let root

  beforeEach(() => {
    root = makeRepo()
    writeFiles(root, {
      [`${REAL}/set.js`]: "export const SET_ID = 'high-risk-plants'\n",
      [`${REAL}/${ORIGIN}`]: realTemplate('Where did it grow?'),
      [`${REAL}/${HUB}`]: realTemplate('Your notification')
    })
    commitAll(root, 'The real journey')
    writeFiles(root, {
      [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
      [`${RELEASE}/release.json`]: JSON.stringify({
        id: 'plants-working',
        from: 'high-risk-plants'
      }),
      [`${RELEASE}/layout.njk`]:
        '{% extends "shared/layout.njk" %}\n{% block head %}{{ super() }}{% endblock %}\n',
      [`${RELEASE}/assets/styles.scss`]:
        '.app-plants-working-callout { margin: 0; }\n',
      [`${RELEASE}/mandates.md`]: MANDATES,
      [`${RELEASE}/patterns.md`]: pattern('Open'),
      [`${RELEASE}/${ORIGIN}`]:
        '{% extends "plants-working/layout.njk" %}\n\n{% block content %}\n  <h1 class="govuk-heading-l">Where did it grow?</h1>\n  <div class="app-plants-working-callout">Check the rule</div>\n{% endblock %}\n',
      [`${RELEASE}/${HUB}`]:
        '{% extends "plants-working/layout.njk" %}\n\n{% block content %}\n  <h1 class="govuk-heading-l">Your import notification</h1>\n{% endblock %}\n'
    })
  })

  afterEach(() => {
    removeRepo(root)
  })

  it(
    'Should turn the release layout back into the shared one, and leave out a page that uses a release class',
    () => {
      const report = handOver(root)

      expect(report.files.map((file) => file.path)).toEqual([`${REAL}/${HUB}`])
      expect(report.patch).toContain(
        '+  <h1 class="govuk-heading-l">Your import notification</h1>'
      )
      expect(report.patch).not.toMatch(
        /(plants-working|high-risk-plants)\/layout\.njk/
      )
      expect(report.patch).not.toMatch(/app-[a-z-]+-callout/)
      expect(report.leftOut).toEqual([
        {
          path: `${RELEASE}/${ORIGIN}`,
          reason:
            'It uses the release pattern classes app-high-risk-plants-callout. The pattern goes to the real team as a request in the brief, never as code, so they build this page their own way.'
        }
      ])
      expect(report.cannotShip.patternRequests.map(({ name }) => name)).toEqual(
        ['Callout']
      )
    },
    TIMEOUT_MS
  )

  it(
    'Should refuse while a pattern is still an Option',
    () => {
      writeFiles(root, { [`${RELEASE}/patterns.md`]: pattern('Option') })

      expect(() => handOver(root)).toThrow(
        new HandoffError(
          'plants-working has release patterns to settle in patterns.md before it can be handed over:\n- "Callout" is still an Option. Choose it (make it Open) or drop it (close it) first.'
        )
      )
    },
    TIMEOUT_MS
  )

  it(
    'Should refuse a copied pattern with no mandate recorded in this release',
    () => {
      const copied = '- Copied from: plants-dr2 on 27 October 2026\n'
      writeFiles(root, {
        [`${RELEASE}/mandates.md`]: MANDATES.replace(
          '- Date:',
          `${copied}- Date:`
        ),
        [`${RELEASE}/patterns.md`]: pattern('Open', copied)
      })

      expect(() => handOver(root)).toThrow(
        'plants-working has release patterns to settle in patterns.md before it can be handed over:\n- "Callout" was copied from plants-dr2 on 27 October 2026. Confirm you still want it: record a mandate in this release and add it as a second "Asked by" line.'
      )
    },
    TIMEOUT_MS
  )

  it(
    'Should hand over a copied pattern once this release records a mandate for it',
    () => {
      const copied = '- Copied from: plants-dr2 on 27 October 2026\n'
      writeFiles(root, {
        [`${RELEASE}/mandates.md`]: `${MANDATES.replace('- Date:', `${copied}- Date:`)}\n## m-2026-10-28-1\n\n- Date: 2026-10-28\n- Words: keep the callout\n- Scope: origin\n`,
        [`${RELEASE}/patterns.md`]: pattern('Open', copied).replace(
          '- Status:',
          '- Asked by: "keep the callout" (m-2026-10-28-1)\n- Status:'
        )
      })

      expect(handOver(root).cannotShip.patternRequests).toHaveLength(1)
    },
    TIMEOUT_MS
  )

  it(
    'Should leave out a script that names a release class',
    () => {
      writeFiles(root, {
        [`${REAL}/journeys/linear/features/hub/hint.js`]:
          'export const hint = true\n'
      })
      commitAll(root, 'A real hint')
      writeFiles(root, {
        [`${RELEASE}/journeys/linear/features/hub/hint.js`]:
          "export const hint = 'app-plants-working-callout'.length > 0\n"
      })

      const report = handOver(root)

      expect(report.leftOut.map(({ path }) => path)).toContain(
        `${RELEASE}/journeys/linear/features/hub/hint.js`
      )
      expect(report.patch).not.toMatch(/app-[a-z-]+-callout/)
    },
    TIMEOUT_MS
  )
})
