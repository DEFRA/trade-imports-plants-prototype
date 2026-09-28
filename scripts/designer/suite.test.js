import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { classifyPath } from '../sync-upstream/rules.js'
import { PLACEHOLDER_SET, REAL_JOURNEY_SET } from './lib/sets.js'

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')

const readRepoFile = (repoPath) =>
  readFileSync(path.join(REPO_ROOT, repoPath), 'utf8')

const overrides = JSON.parse(readRepoFile('overrides.json'))
const packageJson = JSON.parse(readRepoFile('package.json'))
const claudeMd = readRepoFile('CLAUDE.md')
const agentsMd = readRepoFile('AGENTS.md')
const prototypeMd = readRepoFile('PROTOTYPE.md')

// The old home of the fake services, spelt in two halves so this file does
// not name it either.
const OLD_FAKES_FOLDER = ['prototype', 'services'].join('-')

// A prototype-owned service is a folder under src/server/app/services/ that
// has its own line in ours. Every other folder there is the real service's.
const PROTOTYPE_SERVICE_ENTRY = /^src\/server\/app\/services\/([\w-]+)\/\*\*$/
const prototypeServiceEntries = overrides.ours.filter((pattern) =>
  PROTOTYPE_SERVICE_ENTRY.test(pattern)
)

// Tracked plus new-but-unstaged files, so the suite is checked before it is
// committed, the same way scripts/sync-upstream/overrides.test.js does it.
const repoFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  { cwd: REPO_ROOT, encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter((repoPath) => existsSync(path.join(REPO_ROOT, repoPath)))

const SUITE_PREFIXES = [
  '.claude/skills/',
  '.claude/rules/',
  '.claude/workflows/',
  'docs/designers/',
  'scripts/designer/',
  'src/server/prototype-checks/',
  'src/server/prototype-data/',
  'src/server/prototype-support/',
  ...prototypeServiceEntries.map((pattern) => pattern.replace(/\*\*$/, '')),
  'handoffs/'
]
const SUITE_FILES = ['CLAUDE.md', 'AGENTS.md', 'fit/designer-sets.fit.spec.js']

const isSuiteFile = (repoPath) =>
  SUITE_FILES.includes(repoPath) ||
  SUITE_PREFIXES.some((prefix) => repoPath.startsWith(prefix))

// Everything a designer, or the agent working for one, reads.
const isDesignerFacing = (repoPath) =>
  ['CLAUDE.md', 'AGENTS.md', 'PROTOTYPE.md', 'handoffs/README.md'].includes(
    repoPath
  ) ||
  repoPath.startsWith('docs/designers/') ||
  repoPath.startsWith('.claude/skills/') ||
  repoPath.startsWith('.claude/rules/') ||
  repoPath.startsWith('.claude/workflows/')

const designerFacingFiles = repoFiles.filter(isDesignerFacing)
const designerFacingMarkdown = designerFacingFiles.filter((repoPath) =>
  repoPath.endsWith('.md')
)

const SKILLS_DIR = path.join(REPO_ROOT, '.claude/skills')
const skillNames = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const workflowNames = readdirSync(path.join(REPO_ROOT, '.claude/workflows'))
  .filter((file) => file.endsWith('.js') && !file.endsWith('.test.js'))
  .map((file) => file.replace(/\.js$/, ''))
  .sort()

const frontmatterOf = (text) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text)
  return match ? match[1] : ''
}

const frontmatterField = (frontmatter, field) => {
  const match = new RegExp(`^${field}:\\s*(.*)$`, 'm').exec(frontmatter)
  return match ? match[1].trim().replace(/^'|'$/g, '') : ''
}

// The rows of the markdown table that follows a heading in a document.
const tableRowsUnder = (text, heading) => {
  const start = text.indexOf(heading)
  if (start === -1) {
    return []
  }
  const rest = text.slice(start + heading.length).split('\n')
  const rows = []
  let inTable = false
  for (const line of rest) {
    if (line.startsWith('|')) {
      inTable = true
      rows.push(line)
    } else if (inTable || line.startsWith('#')) {
      break
    }
  }
  return rows
}

const quotedPhrasesIn = (line) => line.match(/"[^"]+"/g) ?? []

const SHIPPED_SETS = new Set([REAL_JOURNEY_SET, PLACEHOLDER_SET])

/**
 * Whether a named path sits inside a design release (any set other than the
 * real journey and the placeholder), or is a release's gateway. Designer docs
 * name those paths as examples (plants-working, a-set). Whether a release with
 * that id happens to exist on this branch changes nothing: a fresh
 * plants-working never has design-gaps.md or a ported page.
 */
const namesAnExampleSet = (named) => {
  const inSet =
    /^src\/server\/app\/(?:sets\/|routes-)([\w-]+?)(?:\/|\.js$)/.exec(named)
  return inSet !== null && !SHIPPED_SETS.has(inSet[1])
}

describe('the designer suite', () => {
  test('finds the files it checks', () => {
    expect(skillNames.length).toBeGreaterThan(0)
    expect(workflowNames.length).toBeGreaterThan(0)
    expect(designerFacingMarkdown.length).toBeGreaterThan(0)
  })

  test('every suite file is the prototype’s own, so the weekly update never touches it', () => {
    const notOurs = repoFiles
      .filter(isSuiteFile)
      .filter((repoPath) => classifyPath(repoPath, overrides) !== 'ours')
    expect(notOurs).toEqual([])
  })

  test('every skill folder is declared in overrides.json', () => {
    const undeclared = skillNames.filter(
      (name) => !overrides.ours.includes(`.claude/skills/${name}/**`)
    )
    expect(undeclared).toEqual([])
  })

  describe.each(skillNames)('the %s skill', (name) => {
    const skillMd = readRepoFile(`.claude/skills/${name}/SKILL.md`)
    const frontmatter = frontmatterOf(skillMd)
    const description = frontmatterField(frontmatter, 'description')

    test('has a name that matches its folder', () => {
      expect(frontmatterField(frontmatter, 'name')).toBe(name)
    })

    test('says when to use it and what it is not for', () => {
      expect(description).toContain('Use when')
      expect(description).toContain('NOT for')
    })

    // Hosts that never load skills still reach a skill's steps, because the
    // routing in AGENTS.md names each steps file by path.
    test('is in the AGENTS.md phrase table by its steps file, with at least 3 phrases', () => {
      const row = tableRowsUnder(agentsMd, '## Phrases').find((line) =>
        line.includes(`\`.claude/skills/${name}/SKILL.md\``)
      )
      expect(row, `no AGENTS.md phrase row for ${name}`).toBeDefined()
      expect(quotedPhrasesIn(row).length).toBeGreaterThanOrEqual(3)
    })
  })

  test('every workflow is in the AGENTS.md workflow table', () => {
    const rows = tableRowsUnder(agentsMd, '## Workflows')
    const missing = workflowNames.filter(
      (name) => !rows.some((line) => line.includes(`\`${name}\``))
    )
    expect(missing).toEqual([])
  })

  describe('the front door', () => {
    test('CLAUDE.md imports AGENTS.md, so every host reads the same rules and routing', () => {
      expect(claudeMd.split('\n')[0]).toBe('@AGENTS.md')
    })

    test('CLAUDE.md holds no rules or routing of its own', () => {
      for (const heading of [
        '## Load-bearing rules',
        '## Working out what they want',
        '## Outcomes',
        '## Phrases',
        '## Routing'
      ]) {
        expect(claudeMd).not.toContain(heading)
      }
    })

    test('AGENTS.md names every skill by its steps file', () => {
      const unnamed = skillNames.filter(
        (name) => !agentsMd.includes(`.claude/skills/${name}/SKILL.md`)
      )
      expect(unnamed).toEqual([])
    })

    test('AGENTS.md works out what they want before its tables', () => {
      const intent = agentsMd.indexOf('## Working out what they want')
      expect(intent).toBeGreaterThan(-1)
      expect(intent).toBeLessThan(agentsMd.indexOf('## Outcomes'))
      expect(agentsMd.indexOf('## Outcomes')).toBeLessThan(
        agentsMd.indexOf('## Phrases')
      )
    })

    test('AGENTS.md carries the design handle, and never stalls on "nothing fits"', () => {
      expect(agentsMd).toContain(
        'If the designer says "use the design skill" or "design", follow Working out what they want. This works with or without skills.'
      )
      expect(agentsMd).not.toMatch(/When nothing fits/i)
    })

    test('every outcome names a steps file or a command to run', () => {
      const rows = tableRowsUnder(agentsMd, '## Outcomes').slice(2)
      expect(rows.length).toBeGreaterThanOrEqual(8)
      const vague = rows.filter(
        (line) =>
          !/\.claude\/skills\/[a-z-]+\/SKILL\.md|`design-session`/.test(line)
      )
      expect(vague).toEqual([])
    })

    test('the design skill is a handle with no routing table of its own', () => {
      const skill = readRepoFile('.claude/skills/design/SKILL.md')
      expect(skill).toContain('Working out what they want')
      expect(skill.split('\n').some((line) => line.startsWith('|'))).toBe(false)
    })
  })

  // Designers say what they want; they never need a skill name. A table
  // with a Skill column teaches them that names matter.
  test.each([
    'PROTOTYPE.md',
    'docs/designers/README.md',
    'docs/designers/your-first-hour.md'
  ])('%s shows no skill-name column', (repoPath) => {
    const headers = readRepoFile(repoPath)
      .split('\n')
      .filter((line) => line.startsWith('|') && !/^\|[\s|:-]+\|$/.test(line))
      .flatMap((line) => line.split('|').map((cell) => cell.trim()))
    expect(headers).not.toContain('Skill')
    expect(headers.filter((cell) => /^`[a-z]+(-[a-z]+)+`$/.test(cell))).toEqual(
      []
    )
  })

  test('PROTOTYPE.md stays a short guide that says how close it is to the real service', () => {
    expect(prototypeMd.split('\n').length).toBeLessThanOrEqual(130)
    expect(prototypeMd).toContain('## How close is this to the real service?')
    expect(prototypeMd).toContain('use the design skill')
  })

  test('each prototype-owned service has its own line in ours, and no real service folder does', () => {
    expect(overrides.ours).not.toContain('src/server/app/services/**')
    const realServiceFolders = new Set(
      overrides.patched
        .map((entry) =>
          /^src\/server\/app\/services\/([\w-]+)\//.exec(entry.path)
        )
        .filter(Boolean)
        .map((match) => match[1])
    )
    const claimed = prototypeServiceEntries
      .map((pattern) => PROTOTYPE_SERVICE_ENTRY.exec(pattern)[1])
      .filter((name) => realServiceFolders.has(name))
    expect(claimed).toEqual([])
  })

  test(`no file outside src/server/prototype-support names ${OLD_FAKES_FOLDER}`, () => {
    const naming = repoFiles
      .filter(
        (repoPath) => !repoPath.startsWith('src/server/prototype-support/')
      )
      .filter(
        (repoPath) => !/\.(png|jpe?g|gif|webp|ico|woff2?)$/.test(repoPath)
      )
      .filter((repoPath) => readRepoFile(repoPath).includes(OLD_FAKES_FOLDER))
    expect(naming).toEqual([])
  })

  test('every designer:* script runs a file that exists', () => {
    const designerScripts = Object.entries(packageJson.scripts).filter(
      ([name]) => name.startsWith('designer:')
    )
    expect(designerScripts.length).toBeGreaterThan(0)
    for (const [name, command] of designerScripts) {
      const match = /^node (\S+)$/.exec(command)
      expect(match, `${name} is not "node <file>"`).not.toBeNull()
      expect(existsSync(path.join(REPO_ROOT, match[1])), name).toBe(true)
    }
  })

  test('every "npm run" a designer file mentions is a real script', () => {
    const unknown = []
    for (const repoPath of designerFacingFiles) {
      const text = readRepoFile(repoPath)
      for (const [, name] of text.matchAll(/npm run ([a-z][\w:-]*)/g)) {
        if (!packageJson.scripts[name]) {
          unknown.push(`${repoPath}: npm run ${name}`)
        }
      }
    }
    expect(unknown).toEqual([])
  })

  test('every skill a designer file names by folder exists', () => {
    const unknown = []
    for (const repoPath of designerFacingFiles) {
      const text = readRepoFile(repoPath)
      for (const [, name] of text.matchAll(/\.claude\/skills\/([a-z-]+)/g)) {
        if (!skillNames.includes(name)) {
          unknown.push(`${repoPath}: .claude/skills/${name}`)
        }
      }
    }
    expect(unknown).toEqual([])
  })

  test('every suite file a designer file names by path exists', () => {
    const SUITE_PATH =
      /(?:docs\/designers\/[\w/-]+\.md|\.claude\/(?:rules|workflows)\/[\w.-]+\.(?:md|js)|scripts\/designer\/[\w/-]+\.js|src\/server\/prototype-[a-z]+\/[\w/-]+\.js)(?!\w)/g
    const missing = []
    for (const repoPath of designerFacingFiles) {
      const text = readRepoFile(repoPath)
      for (const [named] of text.matchAll(SUITE_PATH)) {
        if (!existsSync(path.join(REPO_ROOT, named))) {
          missing.push(`${repoPath}: ${named}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  // A designer makes plants-working first (AGENTS.md rule 9). The check below
  // must not start failing the moment that folder exists, or no save is
  // possible on the designer's branch.
  test.each([
    ['src/server/app/sets/plants-working/design-gaps.md', true],
    ['src/server/app/sets/plants-working/x/template.njk', true],
    ['src/server/app/sets/a-set/set.js', true],
    ['src/server/app/routes-plants-working.js', true],
    ['src/server/app/sets/high-risk-plants/set.js', false],
    ['src/server/app/sets/sample-journey/set.js', false],
    ['src/server/app/routes-high-risk-plants.js', false],
    ['src/server/app/engine/index.js', false]
  ])(
    'treats %s as an example path: %s, whatever releases exist',
    (named, expected) => {
      expect(namesAnExampleSet(named)).toBe(expected)
    }
  )

  // The weekly update can rename or delete any file the real service owns. A
  // skill that still names the old path would send the agent to a file that
  // is gone, so the sync pull request's npm test fails here instead.
  test('every real-service file a designer file names by path exists', () => {
    const SOURCE_PATH =
      /(?<![\w/.-])src\/(?:server|client)\/[\w/.-]+\.(?:js|njk|md|scss|json)(?![\w/])/g
    const missing = []
    for (const repoPath of designerFacingFiles) {
      const text = readRepoFile(repoPath)
      for (const [named] of text.matchAll(SOURCE_PATH)) {
        if (namesAnExampleSet(named)) {
          continue
        }
        if (!existsSync(path.join(REPO_ROOT, named))) {
          missing.push(`${repoPath}: ${named}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  // The weekly update bumps package.json's packageManager. Every install
  // command a designer is told to run must bump with it, or it installs an
  // npm the lockfile rejects.
  test('every npm version a designer file names is the one package.json pins', () => {
    const pinned = packageJson.packageManager.split('+')[0]
    const stale = []
    const allowlists = new Set([
      'scripts/designer/hooks/settings-proposal.json',
      '.claude/settings.json'
    ])
    for (const repoPath of [
      ...designerFacingFiles,
      ...repoFiles.filter((repoPath) => allowlists.has(repoPath))
    ]) {
      const text = readRepoFile(repoPath)
      for (const [named] of text.matchAll(/npm@\d+\.\d+\.\d+/g)) {
        if (named !== pinned) {
          stale.push(`${repoPath}: ${named} (package.json pins ${pinned})`)
        }
      }
    }
    expect(stale).toEqual([])
  })

  test('every relative link in a designer document resolves', () => {
    const broken = []
    for (const repoPath of designerFacingMarkdown) {
      const text = readRepoFile(repoPath)
      for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const file = target.split('#')[0]
        const isExternal = /^[a-z]+:/.test(file)
        if (file === '' || isExternal) {
          continue
        }
        const resolved = path.join(REPO_ROOT, path.dirname(repoPath), file)
        if (!existsSync(resolved)) {
          broken.push(`${repoPath}: ${target}`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  test('no designer file points outside this repo', () => {
    const forbidden = [
      /trade-imports-workspace/,
      /\btim /,
      /(^|[^\w-])tools\//m,
      /openspec/i,
      /~\/git\/defra/
    ]
    const offending = designerFacingFiles.filter((repoPath) => {
      const text = readRepoFile(repoPath)
      return forbidden.some((pattern) => pattern.test(text))
    })
    expect(offending).toEqual([])
  })
})
