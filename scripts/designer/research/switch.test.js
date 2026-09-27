import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { statusOf, turnOff, turnOn } from './switch.js'

const SET = 'plants-research-arrival-202610'
const SET_DIR = `src/server/app/sets/${SET}`
const CONTROLLER = 'journeys/linear/features/arrival-details/controller.js'
const TEMPLATE = 'journeys/linear/features/arrival-details/template.njk'
const STRICT = 'const fields = () => compose(requiredDateTextInRange(DATE))\n'
const RELAXED = 'const fields = () => compose(dateTextInRange(DATE))\n'
const LOG = `# Research mode for ${SET}

| Page | File | What participants can now do | What the real service does |
|---|---|---|---|
| arrival-details | ${CONTROLLER} | Leave the arrival date blank | Asks for the arrival date |
`

let repoRoot

const git = (...args) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()

const write = (relative, content) => {
  const file = path.join(repoRoot, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
}

const read = (relative) => readFileSync(path.join(repoRoot, relative), 'utf8')

const subjects = () => git('log', '--format=%s').split('\n')

const filesInHead = () =>
  git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n')

const relaxArrivalDetails = () => {
  write(`${SET_DIR}/${CONTROLLER}`, RELAXED)
  write(`${SET_DIR}/research-mode.md`, LOG)
}

beforeEach(() => {
  repoRoot = mkdtempSync(path.join(tmpdir(), 'research-switch-'))
  git('init', '--quiet', '--initial-branch', 'main')
  const hooks = path.join(repoRoot, '.git', 'no-hooks')
  mkdirSync(hooks)
  git('config', 'user.name', 'Research Test')
  git('config', 'user.email', 'research@example.com')
  git('config', 'commit.gpgsign', 'false')
  git('config', 'core.hooksPath', hooks)
  write(`${SET_DIR}/${CONTROLLER}`, STRICT)
  write(`${SET_DIR}/${TEMPLATE}`, '')
  write('src/server/app/sets/high-risk-plants/set.js', '')
  git('add', '.')
  git('commit', '--quiet', '-m', 'Start design release')
})

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true })
})

describe('turnOn', () => {
  it('Should save the relaxed rules and the log as one titled commit', () => {
    relaxArrivalDetails()
    const result = turnOn(repoRoot, SET)
    expect(result.ok).toBe(true)
    expect(subjects()[0]).toBe(`Research mode on for ${SET}`)
    expect(filesInHead()).toEqual([
      `${SET_DIR}/${CONTROLLER}`,
      `${SET_DIR}/research-mode.md`
    ])
    expect(git('status', '--porcelain')).toBe('')
  })

  it('Should leave changes that are not save rules out of the commit', () => {
    relaxArrivalDetails()
    write(`${SET_DIR}/research-session.json`, '{}')
    const result = turnOn(repoRoot, SET)
    expect(result.ok).toBe(true)
    expect(filesInHead()).not.toContain(`${SET_DIR}/research-session.json`)
    expect(result.lines.join('\n')).toContain('left unsaved')
  })

  it('Should refuse high-risk-plants', () => {
    const result = turnOn(repoRoot, 'high-risk-plants')
    expect(result.ok).toBe(false)
    expect(result.lines[0]).toContain('real journey')
    expect(subjects()).toHaveLength(1)
  })

  it('Should refuse a frozen release', () => {
    write(`${SET_DIR}/release.json`, JSON.stringify({ frozen: true }))
    git('add', '.')
    git('commit', '--quiet', '-m', 'Freeze')
    relaxArrivalDetails()
    const result = turnOn(repoRoot, SET)
    expect(result.ok).toBe(false)
    expect(result.lines[0]).toContain('frozen')
  })

  it('Should refuse without a research-mode log', () => {
    write(`${SET_DIR}/${CONTROLLER}`, RELAXED)
    const result = turnOn(repoRoot, SET)
    expect(result.ok).toBe(false)
    expect(result.lines[0]).toContain('research-mode.md')
  })

  it('Should refuse a changed controller the log does not name', () => {
    relaxArrivalDetails()
    write(`${SET_DIR}/journeys/linear/features/origin/controller.js`, 'x\n')
    const result = turnOn(repoRoot, SET)
    expect(result.ok).toBe(false)
    expect(result.lines).toContain(
      '  - journeys/linear/features/origin/controller.js'
    )
    expect(subjects()).toHaveLength(1)
  })

  it('Should refuse while research mode is already on', () => {
    relaxArrivalDetails()
    turnOn(repoRoot, SET)
    const result = turnOn(repoRoot, SET)
    expect(result.ok).toBe(false)
    expect(result.lines[0]).toContain('already on')
  })
})

describe('turnOff', () => {
  it('Should revert the research-mode commit and remove the log', () => {
    relaxArrivalDetails()
    turnOn(repoRoot, SET)
    const result = turnOff(repoRoot, SET)
    expect(result.ok).toBe(true)
    expect(subjects()[0]).toBe(`Revert "Research mode on for ${SET}"`)
    expect(read(`${SET_DIR}/${CONTROLLER}`)).toBe(STRICT)
    const log = path.join(repoRoot, SET_DIR, 'research-mode.md')
    expect(existsSync(log)).toBe(false)
    expect(result.lines.join('\n')).toContain('Leave the arrival date blank')
  })

  it('Should allow research mode on again after it was turned off', () => {
    relaxArrivalDetails()
    turnOn(repoRoot, SET)
    turnOff(repoRoot, SET)
    relaxArrivalDetails()
    expect(turnOn(repoRoot, SET).ok).toBe(true)
    expect(statusOf(repoRoot, SET).lines[0]).toContain('is on')
  })

  it('Should say so when research mode is not on', () => {
    const result = turnOff(repoRoot, SET)
    expect(result.ok).toBe(false)
    expect(result.lines[0]).toContain('not on')
  })

  it('Should refuse while the release has unsaved changes', () => {
    relaxArrivalDetails()
    turnOn(repoRoot, SET)
    write(`${SET_DIR}/${TEMPLATE}`, 'x')
    const result = turnOff(repoRoot, SET)
    expect(result.ok).toBe(false)
    expect(result.lines[0]).toContain('unsaved changes')
    expect(subjects()[0]).toBe(`Research mode on for ${SET}`)
  })

  it('Should leave the tree clean when a later change clashes', () => {
    relaxArrivalDetails()
    turnOn(repoRoot, SET)
    write(`${SET_DIR}/${CONTROLLER}`, 'const fields = () => compose()\n')
    git('commit', '--quiet', '-am', 'A later change to the same line')
    const result = turnOff(repoRoot, SET)
    expect(result.ok).toBe(false)
    expect(result.lines[0]).toContain('could not be switched off')
    expect(git('status', '--porcelain')).toBe('')
  })
})

describe('statusOf', () => {
  it('Should say research mode is off in a fresh release', () => {
    expect(statusOf(repoRoot, SET).lines[0]).toContain('is off')
  })

  it('Should say research mode is being prepared when the log is unsaved', () => {
    write(`${SET_DIR}/research-mode.md`, LOG)
    expect(statusOf(repoRoot, SET).lines[0]).toContain('being prepared')
  })
})
