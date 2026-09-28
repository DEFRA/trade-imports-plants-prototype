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
import { buildSheet, sessionProblems, taskLink, writeSheet } from './sheet.js'

const SET = 'plants-research-arrival-202610'
const SESSION = {
  title: 'Arrival dates research',
  sessionDate: '2 October 2026',
  tasks: [
    {
      title: 'Tell us when the plants arrive',
      example: 'arrival-task',
      startsOn: 'arrival-details'
    },
    { title: 'Start a new notification' }
  ]
}
const RULES = [
  {
    page: 'arrival-details',
    file: 'x',
    now: 'Leave the arrival date blank',
    real: 'Asks for it'
  }
]

const sheet = (overrides = {}) =>
  buildSheet({
    setId: SET,
    session: SESSION,
    research: { rules: [] },
    localUrl: 'http://localhost:3103',
    deployedUrl: 'https://prototype.example/',
    generatedAt: new Date('2026-09-27T10:00:00Z'),
    ...overrides
  })

describe('taskLink', () => {
  it('Should open the stable example link when the task has an example', () => {
    expect(
      taskLink('http://localhost:3103/', SET, { example: 'arrival-task' })
    ).toBe(`http://localhost:3103/examples/${SET}/arrival-task`)
  })

  it('Should open the release dashboard when the task has no example', () => {
    expect(taskLink('http://localhost:3103', SET, {})).toBe(
      `http://localhost:3103/${SET}`
    )
  })
})

describe('buildSheet', () => {
  it('Should give one local and one deployed link per task', () => {
    const html = sheet()
    expect(html).toContain(
      `href="http://localhost:3103/examples/${SET}/arrival-task"`
    )
    expect(html).toContain(
      `href="https://prototype.example/examples/${SET}/arrival-task"`
    )
    expect(html).toContain(`href="https://prototype.example/${SET}"`)
    expect(html).toContain('Starts on: arrival-details')
  })

  it('Should explain signing in, Reset and the checklist', () => {
    const html = sheet()
    expect(html).toContain('Defra ID stub')
    expect(html).toContain('Reset this prototype’s data')
    expect(html).toContain('Reset clears the data for everyone')
    expect(html).toContain('merged to main the day before')
    expect(html).toContain(
      `npm run designer:show -- --set ${SET} --pages all --mobile`
    )
  })

  it('Should list the errors research mode switches off', () => {
    const html = sheet({ research: { rules: RULES } })
    expect(html).toContain('Errors switched off (research mode on)')
    expect(html).toContain(
      'participants can leave the arrival date blank (the real service: asks for it)'
    )
  })

  it('Should say errors are realistic when research mode is off', () => {
    expect(sheet()).toContain('Research mode is off')
  })

  it('Should say when the deployed address is not known', () => {
    expect(sheet({ deployedUrl: null })).toContain(
      'Deployed address not known yet'
    )
  })

  it('Should escape what the designer wrote', () => {
    const html = sheet({
      session: { tasks: [{ title: '<script>alert(1)</script>' }] }
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('sessionProblems', () => {
  it('Should accept a well-formed session', () => {
    expect(sessionProblems(SESSION)).toEqual([])
  })

  it('Should ask for tasks when there are none', () => {
    expect(sessionProblems({ tasks: [] })).toHaveLength(1)
  })

  it('Should name a task with no title or a malformed example id', () => {
    const tasks = [{ title: '' }, { title: 'x', example: 'Bad Id' }]
    expect(sessionProblems({ tasks })).toEqual([
      'Task 1 has no title.',
      'Task 2\'s example "Bad Id" is not an example id (lower-case words joined by hyphens).'
    ])
  })
})

describe('writeSheet', () => {
  let repoRoot

  beforeEach(() => {
    repoRoot = mkdtempSync(path.join(tmpdir(), 'research-sheet-'))
    mkdirSync(path.join(repoRoot, 'src/server/app/sets', SET), {
      recursive: true
    })
  })

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true })
  })

  it('Should refuse when the release has no session file', () => {
    const result = writeSheet(repoRoot, SET)
    expect(result.ok).toBe(false)
    expect(result.lines[0]).toContain('research-session.json')
  })

  it('Should write the sheet into the cache folder', () => {
    writeFileSync(
      path.join(repoRoot, 'src/server/app/sets', SET, 'research-session.json'),
      JSON.stringify(SESSION)
    )
    const result = writeSheet(repoRoot, SET, {
      deployedUrl: 'https://prototype.example'
    })
    expect(result.ok).toBe(true)
    expect(result.file).toBe(
      path.join(repoRoot, '.cache/designer/research', SET, 'sheet.html')
    )
    expect(readFileSync(result.file, 'utf8')).toContain(
      'Tell us when the plants arrive'
    )
  })

  const writeSession = () =>
    writeFileSync(
      path.join(repoRoot, 'src/server/app/sets', SET, 'research-session.json'),
      JSON.stringify(SESSION)
    )

  it("Should take the deployed address from the prototype's own record", () => {
    writeSession()
    mkdirSync(path.join(repoRoot, 'scripts/designer'), { recursive: true })
    writeFileSync(
      path.join(repoRoot, 'scripts/designer/prototype.json'),
      JSON.stringify({ deployedUrl: 'https://recorded.example' })
    )
    const result = writeSheet(repoRoot, SET)
    expect(readFileSync(result.file, 'utf8')).toContain(
      'https://recorded.example/'
    )
    expect(result.lines.join('\n')).not.toContain('not deployed yet')
  })

  it('Should say the prototype is not deployed yet, and how to run the sessions instead', () => {
    writeSession()
    const result = writeSheet(repoRoot, SET)
    expect(result.lines.at(-1)).toBe(
      'The prototype is not deployed yet (scripts/designer/prototype.json has no "deployedUrl"), so the sheet leaves the deployed links blank. Run the sessions from this computer with npm run dev, or pass --deployed-url <address>.'
    )
  })
})
