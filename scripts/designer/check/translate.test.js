import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  attribute,
  filesNamedIn,
  NOT_YOURS,
  SIGNATURES,
  translate,
  UNKNOWN
} from './translate.js'

const RELEASE_COPY =
  'src/server/app/sets/plants-working/journeys/linear/features/origin/copy/copy.cy.js'

/**
 * One fixture per signature, each shaped like the real output of the tool
 * that prints it. `changed` is what git status would list for the designer.
 */
const FIXTURES = {
  syntax: `file:///repo/${RELEASE_COPY}:4
  hint: 'Where the plants grew
        ^^^^^^^^^^^^^^^^^^^^^^
SyntaxError: Invalid or unexpected token`,
  prettier: `Checking formatting...
[warn] ${RELEASE_COPY}
[warn] Code style issues found in the above file. Run Prettier with --write to fix.`,
  'copy-shape': `AssertionError: copy-shape: plants-working has copy problems:
origin: The Welsh file has no \`hint\`. Add it to copy.cy.js.`,
  'copy-parity': `FAIL  src/server/app/copy-parity.test.js > copy parity — cy mirrors en structurally > Should give cy the same paths, leaf kinds and function arities as en
AssertionError: origin: cy paths must equal en paths: expected [ 'heading' ] to deeply equal [ 'heading', 'hint' ]`,
  'copy-convention': `FAIL  src/server/app/copy-convention.test.js > copy convention — every feature owns its copy > Should give transporter a copy/ folder with copy.en.js, copy.cy.js and copy.test.js
AssertionError: transporter must carry its Welsh copy: expected [ 'copy.en.js' ] to include 'copy.cy.js'`,
  contract: `FAIL  src/server/app/contract.test.js > controller <-> model commit contract > Should commit exactly what origin collects
AssertionError: expected [ 'countryOfOrigin', 'regionOfOrigin' ] to deeply equal [ 'countryOfOrigin' ]`,
  'no-orphans': `  warn no-orphans: src/server/app/sets/plants-working/journeys/linear/features/transporter/controller.js

x 1 dependency violations (0 errors, 1 warnings). 412 modules, 1210 dependencies cruised.`,
  'set-isolation': `  error set-isolation: src/server/app/sets/plants-working/journeys/linear/features/origin/controller.js → src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js

x 1 dependency violations (1 errors, 0 warnings).`,
  'obligation-purity': `Error: Model purity violated — display logic does not live in the model: no obligation may carry a display key (label, title, titleKey, hint, legend, widget). Offending paths: obligations[transporterName].label`,
  'collected-by-no-page': `Error: Obligations collected by no page: transporterName, transporterPhone
    at assertFullCoverage (src/server/app/flow/dispatch.js:92:11)`,
  'owned-by-no-feature': `Error: obligations owned by no feature: transporterName
    at createFulfilmentRegistry (src/server/app/bridge/fulfilment-registry.js:160:11)`,
  'obligation-identity': `Error: binding for "transporterName" must import its obligation object from the manifest`,
  'example-stopped': `Error: Example 'late arrival' stopped at arrival-details: the page said 'Enter the date the consignment will arrive'`,
  'port-in-use': `Error: listen EADDRINUSE: address already in use 0.0.0.0:3103
    at Server.setupListenHandle [as _listen2] (node:net:1937:16)`,
  'browser-missing': `Error: browserType.launch: Executable doesn't exist at /Users/designer/Library/Caches/ms-playwright/chromium_headless_shell-1200/chrome-mac/headless_shell
Looks like Playwright was just installed or updated.`,
  'no-set-context': `Error: No set context — no active set, and 2 sets are mounted (high-risk-plants, plants-working)
    at currentSetId (src/server/app/shared/set-context.js:59:11)`,
  'set-not-configured': `Error: Set "plants-working" mounted without configuring: journey flow (configureJourneyFlow)`,
  'set-not-mounted': `AssertionError: release-render: these sets have a folder but are not mounted in src/server/prototype-sets/index.js: plants-working`,
  'page-does-not-open': `AssertionError: release-render: plants-working has pages that do not open:
The 'transporter' page showed the error page (404): no route answers it.`,
  template: `njk-check: src/server/app/sets/plants-working/journeys/linear/features/origin/template.njk: expected block end in if statement [Line 12, Column 5]`,
  'webpack-404': `console error: Failed to load resource
response 404: http://localhost:3003/public/stylesheets/plants-working.min.css`,
  lint: `/repo/src/server/app/sets/plants-working/journeys/linear/features/origin/controller.js
  12:7  error  'unused' is assigned a value but never used  no-unused-vars

✖ 1 problem (1 error, 0 warnings)`,
  'failing-test': ` FAIL  src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.test.js > origin copy > Should ask where the plants were grown
AssertionError: expected 'Country of origin' to be 'Where were the plants grown?'`
}

const CHANGED = [RELEASE_COPY]

describe('translate — one fixture per signature', () => {
  it('Should have a fixture for every signature and no stray fixtures', () => {
    expect(Object.keys(FIXTURES).sort()).toEqual(
      SIGNATURES.map((signature) => signature.id).sort()
    )
  })

  it.each(SIGNATURES.map((signature) => [signature.id, signature]))(
    'Should explain %s in plain English with a fix and a skill',
    (id, signature) => {
      const findings = translate(FIXTURES[id], { changedPaths: CHANGED })

      expect(findings.map((finding) => finding.id)).toContain(id)
      const finding = findings.find((found) => found.id === id)
      expect(finding.title).toBe(signature.title)
      expect(finding.cause.length).toBeGreaterThan(10)
      expect(finding.fix.length).toBeGreaterThan(10)
      expect(finding.skill).toMatch(/^[a-z-]+$/)
      expect(finding.evidence.length).toBeGreaterThan(0)
    }
  )
})

describe('translate — the details that matter', () => {
  it('Should name the missing answers when a page collects nothing for them', () => {
    const [finding] = translate(FIXTURES['collected-by-no-page'])

    expect(finding.cause).toBe(
      'The model asks for an answer that no page collects: transporterName, transporterPhone.'
    )
  })

  it('Should name the page an example stopped at and what the page said', () => {
    const [finding] = translate(FIXTURES['example-stopped'])

    expect(finding.cause).toBe(
      "An example notification could not get past the 'arrival-details' page, usually because a required question changed. The page said: 'Enter the date the consignment will arrive'."
    )
    expect(finding.skill).toBe('example-data')
  })

  it("Should read the release render's own stopped-example sentence too", () => {
    const [finding] = translate(
      "The example 'warePotatoes' stopped at 'origin' (it answered 200)."
    )

    expect(finding.id).toBe('example-stopped')
    expect(finding.cause).toContain("the 'origin' page")
  })

  it('Should name the port in use', () => {
    const [finding] = translate(FIXTURES['port-in-use'])

    expect(finding.cause).toContain('port 3103')
  })

  it("Should read Playwright's own port-in-use message", () => {
    const [finding] = translate(
      'Error: http://localhost:3003/health is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.'
    )

    expect(finding.id).toBe('port-in-use')
    expect(finding.cause).toContain('port 3003')
  })

  it('Should prefer a specific explanation over the generic failing test', () => {
    const findings = translate(FIXTURES['copy-parity'])

    expect(findings.map((finding) => finding.id)).toEqual(['copy-parity'])
  })

  it('Should fall back to a plain unknown finding', () => {
    const [finding] = translate('Something odd happened', {
      changedPaths: CHANGED
    })

    expect(finding.id).toBe('unknown')
    expect(finding.fix).toContain('what does this error mean')
  })
})

describe('translate — whose failure is it', () => {
  it('Should call a failure in a file the designer changed theirs', () => {
    const [finding] = translate(FIXTURES.prettier, { changedPaths: CHANGED })

    expect(finding.attribution).toBe('yours')
  })

  it('Should call a failure elsewhere in the same release theirs', () => {
    const [finding] = translate(FIXTURES['no-orphans'], {
      changedPaths: CHANGED
    })

    expect(finding.attribution).toBe('yours')
  })

  it('Should call a failure in an untouched real-service file not theirs', () => {
    const [finding] = translate(FIXTURES['failing-test'], {
      changedPaths: CHANGED
    })

    expect(finding.attribution).toBe('not-yours')
    expect(NOT_YOURS).toMatch(/^Not caused by your change: tell the maintainer/)
  })

  it('Should call every failure not theirs when they changed nothing', () => {
    expect(attribute('anything at all', [])).toBe('not-yours')
  })

  it('Should call a failure that names their set but no file theirs', () => {
    expect(attribute(FIXTURES['set-not-configured'], CHANGED)).toBe('yours')
  })

  it('Should leave a failure that names nothing unclear', () => {
    expect(attribute('Error: something broke', CHANGED)).toBe('unclear')
  })
})

describe('docs/designers/checks-and-errors.md', () => {
  const doc = readFileSync(
    new URL('../../../docs/designers/checks-and-errors.md', import.meta.url),
    'utf8'
  )
  const errorSection = doc.slice(doc.indexOf('## Every error the check'))
  const headings = [...errorSection.matchAll(/^### (.+)$/gm)].map(
    (match) => match[1]
  )

  it('Should explain every error the check translates, in the same order', () => {
    expect(headings).toEqual([
      ...SIGNATURES.map((signature) => signature.title),
      UNKNOWN.title
    ])
  })

  it('Should name the skill that fixes each error', () => {
    for (const signature of SIGNATURES) {
      const section = errorSection.slice(
        errorSection.indexOf(`### ${signature.title}`)
      )
      const nextHeading = section.indexOf('\n### ', 1)
      const body = nextHeading === -1 ? section : section.slice(0, nextHeading)

      expect(body, signature.title).toContain(`Skill: \`${signature.skill}\``)
    }
  })
})

describe('filesNamedIn', () => {
  it('Should find relative and absolute repo files, once each', () => {
    expect(
      filesNamedIn(
        `/Users/designer/prototype/${RELEASE_COPY}\n[warn] ${RELEASE_COPY}\nscripts/designer/check/cli.js:3`
      )
    ).toEqual([RELEASE_COPY, 'scripts/designer/check/cli.js'])
  })

  it('Should ignore files inside node_modules', () => {
    expect(
      filesNamedIn('at node_modules/@hapi/hapi/lib/src/core.js:10')
    ).toEqual([])
  })
})
