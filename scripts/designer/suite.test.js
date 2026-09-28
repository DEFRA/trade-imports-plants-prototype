import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
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
  '.claude/rules/',
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
  repoPath.startsWith('.claude/rules/')

const designerFacingFiles = repoFiles.filter(isDesignerFacing)
const designerFacingMarkdown = designerFacingFiles.filter((repoPath) =>
  repoPath.endsWith('.md')
)

// The designer's agent layer (routing, steps files and workflows) is the
// workspace's `prototype` skill. This repo carries none of it.
const WORKSPACE = '~/git/defra/trade-imports-workspace/'
const WORKSPACE_SKILL = `${WORKSPACE}.claude/skills/prototype/SKILL.md`
const AGENT_LAYER_FOLDERS = ['.claude/skills/', '.claude/workflows/']

// The workspace is on disk when this repo is its repos/ checkout. CI and a
// designer with only this repo have no workspace, so existence is skipped.
const insideWorkspace = existsSync(path.resolve(REPO_ROOT, '../../tim'))
const resolveTildePath = (tildePath) =>
  path.join(os.homedir(), tildePath.slice('~/'.length))

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
    expect(designerFacingMarkdown.length).toBeGreaterThan(0)
  })

  test('every suite file is the prototype’s own, so the weekly update never touches it', () => {
    const notOurs = repoFiles
      .filter(isSuiteFile)
      .filter((repoPath) => classifyPath(repoPath, overrides) !== 'ours')
    expect(notOurs).toEqual([])
  })

  // Nested skills under the workspace's repos/ never load from the workspace
  // root, so any skill or workflow here would be dead weight that drifts.
  test('this repo carries no skills or workflows of its own', () => {
    const agentLayerFiles = repoFiles.filter((repoPath) =>
      AGENT_LAYER_FOLDERS.some((folder) => repoPath.startsWith(folder))
    )
    expect(agentLayerFiles).toEqual([])
    const agentLayerEntries = overrides.ours.filter((pattern) =>
      AGENT_LAYER_FOLDERS.some((folder) => pattern.startsWith(folder))
    )
    expect(agentLayerEntries).toEqual([])
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

    test('AGENTS.md sends routing to the workspace prototype skill by its full path', () => {
      expect(agentsMd).toContain(`\`${WORKSPACE_SKILL}\``)
      if (insideWorkspace) {
        expect(existsSync(resolveTildePath(WORKSPACE_SKILL))).toBe(true)
      }
    })

    // The routing has one home, the workspace skill's references/ROUTING.md.
    // A second copy here would drift from it.
    test('AGENTS.md is the repo contract and holds no routing of its own', () => {
      expect(agentsMd).toContain('## Load-bearing rules')
      for (const heading of [
        '## Working out what they want',
        '## Outcomes',
        '## Phrases',
        '## Workflows',
        '## Routing'
      ]) {
        expect(agentsMd).not.toContain(heading)
      }
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

  // A designer file may name a skill only as the workspace's own, by its
  // full tilde path: a bare .claude/skills/ path points at a folder this
  // repo no longer has.
  test('every skill a designer file names is the workspace prototype skill, by its full path', () => {
    const offending = []
    for (const repoPath of designerFacingFiles) {
      const text = readRepoFile(repoPath)
      for (const match of text.matchAll(/\.claude\/skills\/([a-z-]+)/g)) {
        const isWorkspacePath =
          match.index >= WORKSPACE.length &&
          text.slice(match.index - WORKSPACE.length, match.index) === WORKSPACE
        if (!isWorkspacePath || match[1] !== 'prototype') {
          offending.push(`${repoPath}: .claude/skills/${match[1]}`)
        }
      }
    }
    expect(offending).toEqual([])
  })

  // A path inside a longer one (a workspace tilde path such as
  // ~/git/defra/trade-imports-workspace/.claude/rules/gds.md) is not this
  // repo's: the workspace-path test below checks those.
  test('every suite file a designer file names by path exists', () => {
    const SUITE_PATH =
      /(?<![\w/.-])(?:docs\/designers\/[\w/-]+\.md|\.claude\/rules\/[\w.-]+\.md|scripts\/designer\/[\w/-]+\.js|src\/server\/prototype-[a-z]+\/[\w/-]+\.js)(?!\w)/g
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
    const allowlists = new Set(['.claude/settings.json'])
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

  // Designers now open Claude Code at the trade-imports workspace root, so a
  // designer file may point there — but only in the one form every tool and
  // skill in this suite already resolves: the full tilde path. A bare
  // mention ("trade-imports-workspace" with no "~/git/defra/" in front) is
  // still wrong, because it names nothing a designer with only this repo, or
  // one deployed to CDP, could ever open. The one other form allowed is the
  // GitHub address the workspace is cloned from. The existence half needs
  // the workspace on disk as a sibling checkout, so it is skipped in CI (and
  // for any designer who genuinely has only this repo).
  test('every workspace path a designer file names uses the ~/git/defra/trade-imports-workspace/ form, and exists once the workspace is a sibling checkout', () => {
    const BARE_MENTION =
      /(?<!~\/git\/defra\/|github\.com\/DEFRA\/)trade-imports-workspace/
    const TILDE_PATH = /~\/git\/defra\/trade-imports-workspace\/[\w./-]+/g
    const bareMentions = []
    const missing = []
    for (const repoPath of designerFacingFiles) {
      const text = readRepoFile(repoPath)
      if (BARE_MENTION.test(text)) {
        bareMentions.push(repoPath)
      }
      if (!insideWorkspace) {
        continue
      }
      for (const [named] of text.matchAll(TILDE_PATH)) {
        const tildePath = named.replace(/\.+$/, '')
        if (!existsSync(resolveTildePath(tildePath))) {
          missing.push(`${repoPath}: ${tildePath}`)
        }
      }
    }
    expect(bareMentions).toEqual([])
    expect(missing).toEqual([])
  })
})
