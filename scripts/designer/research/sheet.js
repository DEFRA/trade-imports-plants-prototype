/**
 * The participant sheet for a research session: a single static HTML page a
 * facilitator can print or keep open. `buildSheet` is pure; `writeSheet` reads
 * the release's files and writes `.cache/designer/research/<set>/sheet.html`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { isKebabCase } from '../../new-set/names.js'
import {
  readRelease,
  readResearchMode,
  SESSION_FILE,
  setDirOf
} from './research-mode.js'

export const LOCAL_URL = 'http://localhost:3103'
export const SHEET_DIR = '.cache/designer/research'

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const trimSlash = (url) => url.replace(/\/+$/, '')

/**
 * Where a task starts. A task with an example opens the stable example link,
 * which lands on the page the example stopped at. A task without one starts
 * on the release's dashboard.
 */
export const taskLink = (baseUrl, setId, task) =>
  task.example
    ? `${trimSlash(baseUrl)}/examples/${setId}/${task.example}`
    : `${trimSlash(baseUrl)}/${setId}`

/**
 * Checks `research-session.json` and returns plain-English problems.
 * @param {unknown} session
 * @returns {string[]}
 */
export const sessionProblems = (session) => {
  if (!session || typeof session !== 'object') {
    return [`${SESSION_FILE} must be a JSON object.`]
  }
  if (!Array.isArray(session.tasks) || session.tasks.length === 0) {
    return [`${SESSION_FILE} has no tasks. Add one for each research task.`]
  }
  return session.tasks.flatMap((task, index) => {
    const name = `Task ${index + 1}`
    const problems = []
    if (typeof task?.title !== 'string' || task.title.trim() === '') {
      problems.push(`${name} has no title.`)
    }
    if (task?.example !== undefined && !isKebabCase(String(task.example))) {
      problems.push(
        `${name}'s example "${task.example}" is not an example id (lower-case words joined by hyphens).`
      )
    }
    return problems
  })
}

const linkCell = (url) =>
  url
    ? `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`
    : '<em>Deployed address not known yet</em>'

const taskRows = ({ setId, tasks, localUrl, deployedUrl }) =>
  tasks
    .map(
      (task, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(task.title)}</strong>${
          task.startsOn
            ? `<br><span class="hint">Starts on: ${escapeHtml(task.startsOn)}</span>`
            : ''
        }${task.notes ? `<br><span class="hint">${escapeHtml(task.notes)}</span>` : ''}</td>
        <td>${linkCell(taskLink(localUrl, setId, task))}</td>
        <td>${linkCell(deployedUrl ? taskLink(deployedUrl, setId, task) : null)}</td>
      </tr>`
    )
    .join('')

const researchModeSection = (research) =>
  research.rules.length > 0
    ? `<h2>Errors switched off (research mode on)</h2>
    <p>Participants will not see these errors. The real service shows them.</p>
    <ul>${research.rules
      .map(
        (rule) =>
          `<li><strong>${escapeHtml(rule.page)}</strong>: ${escapeHtml(rule.now)}</li>`
      )
      .join('')}</ul>`
    : `<h2>Errors</h2>
    <p>Research mode is off. Participants see the same errors as in the real service.</p>`

const CHECKLIST = [
  'Your changes were merged to main the day before (the deployed prototype updates only after merge).',
  'The deployed prototype shows your changes (open each task link once).',
  'Errors behave as you chose (research mode on or off, see above).',
  'Phone width checked (npm run designer:show -- --set SET --pages all --mobile).',
  'Welsh is not needed for this session, or has been checked.',
  'Reset done before the first participant.',
  'Reset done between participants.'
]

/**
 * The sheet's HTML.
 * @param {object} data
 * @param {string} data.setId
 * @param {{ title?: string, sessionDate?: string, tasks: object[] }} data.session
 * @param {{ rules: object[] }} data.research
 * @param {object|null} [data.release]
 * @param {string} data.localUrl
 * @param {string|null} [data.deployedUrl]
 * @param {Date} data.generatedAt
 */
export const buildSheet = ({
  setId,
  session,
  research,
  release = null,
  localUrl,
  deployedUrl = null,
  generatedAt
}) => {
  const title = session.title ?? `Research session: ${setId}`
  const when = session.sessionDate
    ? `<p>Session: ${escapeHtml(session.sessionDate)}</p>`
    : ''
  const about = release?.description
    ? `<p>${escapeHtml(release.description)}</p>`
    : ''
  const chooser = (base) => (base ? `${trimSlash(base)}/` : null)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0b0c0c; margin: 0 auto; max-width: 960px; padding: 20px; line-height: 1.4; }
    h1 { font-size: 32px; margin-bottom: 8px; }
    h2 { font-size: 24px; margin-top: 32px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #b1b4b6; padding: 8px; text-align: left; vertical-align: top; }
    a { color: #1d70b8; word-break: break-all; }
    .hint { color: #505a5f; }
    .warning { border-left: 5px solid #d4351c; padding: 8px 16px; }
    ul.checklist { list-style: none; padding-left: 0; }
    ul.checklist li::before { content: "\\2610  "; }
    @media print { a { color: #0b0c0c; text-decoration: none; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="hint">Design release: ${escapeHtml(setId)}. Sheet made ${escapeHtml(generatedAt.toISOString().slice(0, 10))}.</p>
  ${when}
  ${about}

  <h2>Tasks</h2>
  <p>Each link opens the page where the task starts. The links keep working after the prototype restarts.</p>
  <table>
    <thead><tr><th>#</th><th>Task</th><th>On your computer</th><th>Deployed</th></tr></thead>
    <tbody>${taskRows({ setId, tasks: session.tasks, localUrl, deployedUrl })}
    </tbody>
  </table>

  ${researchModeSection(research)}

  <h2>Signing in</h2>
  <ul>
    <li><strong>On your computer</strong> (<code>npm run dev</code>): you are signed in straight away. There is no name or password.</li>
    <li><strong>Deployed prototype</strong>: sign in through the Defra ID stub and pick any of its test users. Every test user sees the same example notifications.</li>
  </ul>

  <h2>Reset between participants</h2>
  <p class="warning">Every participant using a task link opens the same example notification. Reset puts the examples back as they were.</p>
  <ol>
    <li>Open the prototypes page: ${linkCell(chooser(localUrl))} or ${linkCell(chooser(deployedUrl))}</li>
    <li>Under ${escapeHtml(setId)}, select <strong>Reset this prototype’s data</strong>.</li>
  </ol>
  <p><strong>Reset clears the data for everyone</strong> using this release on the same prototype, including anyone else in a session at the same time.</p>

  <h2>Before the session</h2>
  <ul class="checklist">${CHECKLIST.map((item) => `<li>${escapeHtml(item.replace('SET', setId))}</li>`).join('')}</ul>
</body>
</html>
`
}

/**
 * Reads the release's session file, builds the sheet and writes it.
 * @returns {{ ok: boolean, lines: string[], file?: string }}
 */
export const writeSheet = (
  repoRoot,
  setId,
  { deployedUrl = null, localUrl = LOCAL_URL, now = new Date() } = {}
) => {
  const sessionFile = path.join(repoRoot, setDirOf(setId), SESSION_FILE)
  if (!existsSync(sessionFile)) {
    return {
      ok: false,
      lines: [
        `There is no ${setDirOf(setId)}/${SESSION_FILE}. Write it first: a title and one entry per task.`
      ]
    }
  }
  let session
  try {
    session = JSON.parse(readFileSync(sessionFile, 'utf8'))
  } catch (error) {
    return {
      ok: false,
      lines: [`${SESSION_FILE} is not valid JSON: ${error.message}`]
    }
  }
  const problems = sessionProblems(session)
  if (problems.length > 0) {
    return { ok: false, lines: problems }
  }
  const deployed = deployedUrl ?? session.deployedUrl ?? null
  const html = buildSheet({
    setId,
    session,
    research: readResearchMode(repoRoot, setId),
    release: readRelease(repoRoot, setId),
    localUrl,
    deployedUrl: deployed,
    generatedAt: now
  })
  const dir = path.join(repoRoot, SHEET_DIR, setId)
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'sheet.html')
  writeFileSync(file, html)
  return {
    ok: true,
    file,
    lines: [
      `Sheet written: ${path.relative(repoRoot, file)}`,
      ...session.tasks.map(
        (task, index) =>
          `  ${index + 1}. ${task.title}: ${taskLink(localUrl, setId, task)}`
      ),
      ...(deployed
        ? []
        : [
            'The deployed address is not known, so the sheet leaves it blank. Add "deployedUrl" to the session file, or pass --deployed-url <address>.'
          ])
    ]
  }
}
