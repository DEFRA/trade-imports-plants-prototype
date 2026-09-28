import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HandoffError } from './build.js'
import {
  outputDir,
  parseArgs,
  parseStatusArgs,
  readCriteria,
  recordHandoffStatus,
  resolveOptions,
  runStatus,
  setStatusLines
} from './cli.js'

describe('parseArgs', () => {
  it('Should read the release, features and slug', () => {
    expect(
      parseArgs([
        '--set',
        'plants-working',
        '--features',
        'origin,arrival-details',
        '--slug',
        'arrival-hint'
      ])
    ).toEqual({
      set: 'plants-working',
      features: ['origin', 'arrival-details'],
      recipes: [],
      links: [],
      slug: 'arrival-hint'
    })
  })

  it('Should accept name=value and repeated recipes', () => {
    expect(
      parseArgs([
        '--set=plants-working',
        '--recipe',
        'add-a-field',
        '--recipe=add-a-branch',
        '--all',
        '--dry-run'
      ])
    ).toEqual({
      set: 'plants-working',
      features: [],
      recipes: ['add-a-field', 'add-a-branch'],
      links: [],
      all: true,
      dryRun: true
    })
  })

  it('Should read the story options, repeated links and brief only', () => {
    expect(
      parseArgs([
        '--set',
        'plants-working',
        '--as',
        'a trader importing plants',
        '--want',
        'to say the plants were grown under glass',
        '--so-that',
        'the inspector knows before they arrive',
        '--criteria',
        '.cache/designer/handoff/glass.criteria.txt',
        '--link',
        'https://github.com/DEFRA/trade-imports-plants-prototype/tree/design/plants-working-glass',
        '--link=https://github.com/DEFRA/trade-imports-plants-prototype/pull/12?a=1,2',
        '--brief-only'
      ])
    ).toEqual({
      set: 'plants-working',
      features: [],
      recipes: [],
      as: 'a trader importing plants',
      want: 'to say the plants were grown under glass',
      soThat: 'the inspector knows before they arrive',
      criteria: '.cache/designer/handoff/glass.criteria.txt',
      links: [
        'https://github.com/DEFRA/trade-imports-plants-prototype/tree/design/plants-working-glass',
        'https://github.com/DEFRA/trade-imports-plants-prototype/pull/12?a=1,2'
      ],
      briefOnly: true
    })
  })

  it('Should refuse an option it does not know', () => {
    expect(() => parseArgs(['--push'])).toThrow(HandoffError)
  })

  it('Should refuse an option with no value', () => {
    expect(() => parseArgs(['--set', '--all'])).toThrow('--set needs a value.')
  })

  it('Should mark drafted criteria, and refuse the mark with no criteria file', () => {
    expect(
      parseArgs(['--set', 'a', '--criteria', 'c.txt', '--criteria-draft'])
    ).toMatchObject({ criteria: 'c.txt', criteriaDraft: true })
    expect(() => parseArgs(['--set', 'a', '--criteria-draft'])).toThrow(
      '--criteria-draft needs --criteria <file> too.'
    )
  })

  it('Should refuse --features with --all', () => {
    expect(() => parseArgs(['--set', 'a', '--all', '--features', 'b'])).toThrow(
      'Use --features or --all, not both.'
    )
  })
})

describe('resolveOptions', () => {
  it('Should default the slug to the set and build the folder name', () => {
    const resolved = resolveOptions({
      set: 'plants-working',
      date: '2026-09-27'
    })

    expect(resolved.folderName).toBe('2026-09-27-plants-working')
    expect(resolved.title).toBe(
      'Plants working: hand-off from the plants prototype'
    )
  })

  it('Should ask for a release when none is given', () => {
    expect(() => resolveOptions({})).toThrow(
      'Say which design release to hand over'
    )
  })

  it('Should refuse a slug that cannot be a folder name', () => {
    expect(() =>
      resolveOptions({ set: 'plants-working', slug: '../../etc' })
    ).toThrow('cannot be a folder name')
  })

  it('Should refuse a date in another format', () => {
    expect(() =>
      resolveOptions({ set: 'plants-working', date: '27/09/2026' })
    ).toThrow('--date must look like 2026-09-27')
  })
})

describe('readCriteria', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'handoff-criteria-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should read the criteria file from the repo root', () => {
    writeFileSync(
      path.join(root, 'glass.txt'),
      'Given I am on the page\nWhen I continue\nThen I see the next page\n'
    )

    expect(readCriteria(root, 'glass.txt')).toHaveLength(1)
  })

  it('Should give no criteria when none were named', () => {
    expect(readCriteria(root, undefined)).toBeNull()
  })

  it('Should say plainly when the file is missing or wrong', () => {
    expect(() => readCriteria(root, 'missing.txt')).toThrow(
      new HandoffError(
        'There is no criteria file at missing.txt. Write the acceptance criteria there first, as Given, When and Then lines.'
      )
    )
    writeFileSync(path.join(root, 'bad.txt'), 'It works\n')
    expect(() => readCriteria(root, 'bad.txt')).toThrow(HandoffError)
  })
})

describe('outputDir', () => {
  const resolved = { folderName: '2026-09-27-plants-working' }

  it('Should write to handoffs/ normally', () => {
    expect(outputDir('/repo', resolved)).toBe(
      path.join('/repo', 'handoffs', '2026-09-27-plants-working')
    )
  })

  it('Should write to the ignored cache for a dry run', () => {
    expect(outputDir('/repo', { ...resolved, dryRun: true })).toBe(
      path.join('/repo', '.cache/designer/handoff', '2026-09-27-plants-working')
    )
  })
})

describe('setStatusLines', () => {
  const brief = ['# Clearer arrival time hint', '', '**As** a trader,'].join(
    '\n'
  )

  it('Should insert a new status block directly under the title', () => {
    expect(setStatusLines(brief, { Status: 'sent', Ticket: 'EUDPA-123' })).toBe(
      [
        '# Clearer arrival time hint',
        '',
        'Status: sent',
        'Ticket: EUDPA-123',
        '',
        '**As** a trader,'
      ].join('\n')
    )
  })

  it('Should merge into an existing block, field by field, never duplicating it', () => {
    const withStatus = setStatusLines(brief, {
      Status: 'sent',
      Ticket: 'EUDPA-123'
    })

    expect(
      setStatusLines(withStatus, {
        Branch: 'feat/EUDPA-123-arrival-hint'
      })
    ).toBe(
      [
        '# Clearer arrival time hint',
        '',
        'Status: sent',
        'Ticket: EUDPA-123',
        'Branch: feat/EUDPA-123-arrival-hint',
        '',
        '**As** a trader,'
      ].join('\n')
    )
  })

  it('Should give the markdown back unchanged when there is no title line', () => {
    expect(setStatusLines('no title here', { Status: 'sent' })).toBe(
      'no title here'
    )
  })
})

describe('recordHandoffStatus', () => {
  const readme = '# Hand-offs\n\nEach folder here is a hand-off.\n'

  it('Should add the "Keeping track" table on its first use', () => {
    expect(
      recordHandoffStatus(readme, {
        folderName: '2026-09-27-arrival-time-hint',
        ticket: 'EUDPA-123',
        branch: 'feat/EUDPA-123-arrival-time-hint'
      })
    ).toBe(
      [
        readme,
        '| Hand-off | Ticket | Branch |',
        '| --- | --- | --- |',
        '| 2026-09-27-arrival-time-hint | EUDPA-123 | feat/EUDPA-123-arrival-time-hint |',
        ''
      ].join('\n')
    )
  })

  it('Should add a new row under the table when one already exists', () => {
    const withTable = recordHandoffStatus(readme, {
      folderName: '2026-09-27-arrival-time-hint',
      ticket: 'EUDPA-123',
      branch: 'feat/EUDPA-123-arrival-time-hint'
    })

    expect(
      recordHandoffStatus(withTable, {
        folderName: '2026-09-28-other-change',
        ticket: 'EUDPA-456',
        branch: 'feat/EUDPA-456-other-change'
      })
    ).toContain(
      '| 2026-09-28-other-change | EUDPA-456 | feat/EUDPA-456-other-change |'
    )
  })

  it('Should update a hand-off already in the table, never duplicating its row', () => {
    const withTable = recordHandoffStatus(readme, {
      folderName: '2026-09-27-arrival-time-hint',
      ticket: 'EUDPA-123',
      branch: 'feat/EUDPA-123-arrival-time-hint'
    })

    const updated = recordHandoffStatus(withTable, {
      folderName: '2026-09-27-arrival-time-hint',
      ticket: 'EUDPA-123',
      branch: 'feat/EUDPA-123-arrival-time-hint-v2'
    })

    expect(
      updated.split('\n').filter((line) => line.includes('2026-09-27'))
    ).toEqual([
      '| 2026-09-27-arrival-time-hint | EUDPA-123 | feat/EUDPA-123-arrival-time-hint-v2 |'
    ])
  })
})

describe('parseStatusArgs', () => {
  it('Should read --dir', () => {
    expect(parseStatusArgs(['--dir', 'handoffs/2026-09-27-x'])).toEqual({
      dir: 'handoffs/2026-09-27-x'
    })
  })

  it('Should read --json alongside --dir', () => {
    expect(
      parseStatusArgs(['--dir', 'handoffs/2026-09-27-x', '--json'])
    ).toEqual({ dir: 'handoffs/2026-09-27-x', json: true })
  })

  it('Should ask for --dir when it is missing', () => {
    expect(() => parseStatusArgs([])).toThrow(
      'Say which hand-off folder: status --dir handoffs/<folder>.'
    )
  })

  it('Should refuse an option it does not know', () => {
    expect(() => parseStatusArgs(['--push'])).toThrow(HandoffError)
  })
})

describe('runStatus', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'handoff-status-'))
    mkdirSync(path.join(root, 'handoffs/2026-09-27-arrival-time-hint'), {
      recursive: true
    })
    writeFileSync(
      path.join(root, 'handoffs/README.md'),
      '# Hand-offs\n\nEach folder here is a hand-off.\n'
    )
    writeFileSync(
      path.join(root, 'handoffs/2026-09-27-arrival-time-hint/brief.md'),
      '# Clearer arrival time hint\n\n**As** a trader,\n'
    )
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should refuse a folder name that is not <yyyy-mm-dd>-<slug>', () => {
    mkdirSync(path.join(root, 'handoffs/not-a-date'), { recursive: true })

    expect(() => runStatus(root, { dir: 'handoffs/not-a-date' })).toThrow(
      /does not look like a hand-off folder/
    )
  })

  it('Should say plainly when ticket.created.json has not been written yet', () => {
    expect(() =>
      runStatus(root, { dir: 'handoffs/2026-09-27-arrival-time-hint' })
    ).toThrow(/There is no ticket\.created\.json/)
  })

  it('Should record the ticket and the real branch in the brief and in handoffs/README.md', () => {
    writeFileSync(
      path.join(
        root,
        'handoffs/2026-09-27-arrival-time-hint/ticket.created.json'
      ),
      JSON.stringify({
        key: 'EUDPA-123',
        url: 'https://example.atlassian.net/browse/EUDPA-123'
      })
    )

    const result = runStatus(root, {
      dir: 'handoffs/2026-09-27-arrival-time-hint'
    })

    expect(result).toMatchObject({
      ticket: 'EUDPA-123',
      branch: 'feat/EUDPA-123-arrival-time-hint'
    })
    const brief = readFileSync(
      path.join(root, 'handoffs/2026-09-27-arrival-time-hint/brief.md'),
      'utf8'
    )
    expect(brief).toContain('Ticket: EUDPA-123')
    expect(brief).toContain('Branch: feat/EUDPA-123-arrival-time-hint')
    const readme = readFileSync(path.join(root, 'handoffs/README.md'), 'utf8')
    expect(readme).toContain(
      '| 2026-09-27-arrival-time-hint | EUDPA-123 | feat/EUDPA-123-arrival-time-hint |'
    )
  })
})
