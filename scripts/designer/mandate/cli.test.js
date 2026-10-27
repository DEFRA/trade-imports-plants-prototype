import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { checkReleaseAssets } from '../check/release-assets.js'
import { makeFixtureRepo } from '../lib/test-support.js'
import { run } from './cli.js'
import { DESIGNER_NOTE_MARKER } from './record.js'

const MANDATES = 'src/server/app/sets/plants-working/mandates.md'
const WORDS =
  "give me 3 options for this page; you can make reasonable use of new components or designs if GOV.UK doesn't fit"

describe('#designer:mandate', () => {
  let fixture
  let workspaceRoot

  const runAs = (argv, today = '2026-10-27') =>
    run(argv, { root: fixture.root, workspaceRoot, today })

  const parsed = (result) => JSON.parse(result.output)

  const markAsDesigner = () =>
    writeFileSync(
      path.join(workspaceRoot, 'CLAUDE.local.md'),
      `${DESIGNER_NOTE_MARKER}\nYou are working with a designer.\n<!-- tim:designer-note end -->\n`
    )

  beforeEach(() => {
    fixture = makeFixtureRepo({ git: true })
    workspaceRoot = mkdtempSync(path.join(tmpdir(), 'designer-workspace-'))
  })

  afterEach(() => {
    fixture.cleanup()
    rmSync(workspaceRoot, { recursive: true, force: true })
  })

  describe('record', () => {
    it('Should refuse, and write nothing, when the workspace does not mark a designer', () => {
      const result = runAs([
        'record',
        '--set',
        'plants-working',
        '--words',
        WORDS
      ])

      expect(result.status).toBe(1)
      expect(parsed(result).problem).toBe(
        "Only a designer's session can record a mandate, and this workspace does not mark you as a designer. Build the nearest GOV.UK option and log a design gap instead."
      )
      expect(() => readFileSync(path.join(fixture.root, MANDATES))).toThrow(
        /ENOENT/
      )
    })

    it("Should write the designer's words verbatim under a new id and print it", () => {
      markAsDesigner()

      const result = runAs([
        'record',
        '--set',
        'plants-working',
        '--words',
        WORDS,
        '--scope',
        'the dashboard'
      ])

      expect(result.status).toBe(0)
      expect(parsed(result).mandate).toEqual({
        id: 'm-2026-10-27-1',
        set: 'plants-working',
        date: '2026-10-27',
        words: WORDS,
        scope: 'the dashboard',
        file: MANDATES
      })
      expect(readFileSync(path.join(fixture.root, MANDATES), 'utf8')).toBe(
        `# Mandates\n\n## m-2026-10-27-1\n\n- Date: 2026-10-27\n- Words: ${WORDS}\n- Scope: the dashboard\n`
      )
    })

    it('Should keep earlier mandates and number the next one on the same day', () => {
      markAsDesigner()
      runAs(['record', '--set', 'plants-working', '--words', 'first ask'])

      const second = runAs([
        'record',
        '--set',
        'plants-working',
        '--words',
        'second ask'
      ])

      expect(parsed(second).mandate.id).toBe('m-2026-10-27-2')
      expect(readFileSync(path.join(fixture.root, MANDATES), 'utf8')).toBe(
        [
          '# Mandates',
          '',
          '## m-2026-10-27-1',
          '',
          '- Date: 2026-10-27',
          '- Words: first ask',
          '- Scope: the whole release (not given)',
          '',
          '## m-2026-10-27-2',
          '',
          '- Date: 2026-10-27',
          '- Words: second ask',
          '- Scope: the whole release (not given)',
          ''
        ].join('\n')
      )
    })

    it('Should refuse a frozen release', () => {
      markAsDesigner()

      const result = runAs(['record', '--set', 'plants-dr2', '--words', WORDS])

      expect(result.status).toBe(1)
      expect(parsed(result).problem).toBe(
        'plants-dr2 is frozen. Start a working release from it, then record the mandate there.'
      )
    })

    it('Should refuse the real journey', () => {
      markAsDesigner()

      const result = runAs([
        'record',
        '--set',
        'high-risk-plants',
        '--words',
        WORDS
      ])

      expect(parsed(result).problem).toBe(
        'high-risk-plants is not a design release, so it has no release patterns. Start a design release from it first.'
      )
    })

    it('Should refuse a record with no words', () => {
      const result = runAs(['record', '--set', 'plants-working'])

      expect(result.status).toBe(1)
      expect(parsed(result).problem).toBe('record needs --words.')
    })
  })

  describe('record, then a pattern that quotes it', () => {
    it('Should pass the release check, and fail a run under the mandate that adds one more', () => {
      markAsDesigner()
      const recorded = parsed(
        runAs(['record', '--set', 'plants-working', '--words', WORDS])
      ).mandate
      fixture.commitAll('the designer recorded a mandate')
      const pattern = (status) =>
        [
          '## Card options',
          '',
          '- Kind: Custom',
          '- Pages: dashboard',
          '- Classes: app-plants-working-card',
          '- Files: assets/styles.scss',
          '- Why not GOV.UK or MoJ:',
          '  - GOV.UK: Summary card. No status colour.',
          '  - MoJ: Badge. Not a card.',
          '- Need or hypothesis: (proposed: confirm) traders spot late ones faster.',
          '- Research round: Round 3 (12 Nov 2026)',
          '- Findings: none yet',
          `- Asked by: "${WORDS}" (${recorded.id})`,
          `- Status: ${status}`,
          ''
        ].join('\n')
      fixture.write(
        'src/server/app/sets/plants-working/assets/styles.scss',
        '.app-plants-working-card {\n  margin: 0;\n}\n'
      )
      fixture.write(
        'src/server/app/sets/plants-working/patterns.md',
        pattern('Open')
      )

      expect(
        checkReleaseAssets('plants-working', { root: fixture.root }).problems
      ).toEqual([])
      expect(
        checkReleaseAssets('plants-working', {
          root: fixture.root,
          since: 'HEAD',
          mandate: recorded.id
        }).problems.map(({ message }) => message)
      ).toEqual([
        '"Card options" is new, so its status is Option until the designer chooses it.'
      ])
    })
  })

  describe('show', () => {
    it('Should print a recorded mandate', () => {
      markAsDesigner()
      runAs([
        'record',
        '--set',
        'plants-working',
        '--words',
        WORDS,
        '--scope',
        'the dashboard'
      ])

      const result = runAs([
        'show',
        '--set',
        'plants-working',
        '--id',
        'm-2026-10-27-1'
      ])

      expect(result.status).toBe(0)
      expect(parsed(result).mandate).toEqual({
        id: 'm-2026-10-27-1',
        set: 'plants-working',
        date: '2026-10-27',
        words: WORDS,
        scope: 'the dashboard',
        copiedFrom: ''
      })
    })

    it('Should refuse an id the release does not hold', () => {
      const result = runAs([
        'show',
        '--set',
        'plants-working',
        '--id',
        'm-2026-10-27-9'
      ])

      expect(result.status).toBe(1)
      expect(parsed(result).problem).toBe(
        'plants-working has no mandate m-2026-10-27-9 in mandates.md. Record it with designer:mandate record first.'
      )
    })
  })
})
