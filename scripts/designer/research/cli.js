/**
 * `npm run designer:research -- <command> <set-id> [options]`
 *
 *   on <set-id>        save the relaxed rules as "Research mode on for <set-id>"
 *   off <set-id>       revert that commit: every error comes back
 *   status <set-id>    say whether research mode is on, and what it relaxes
 *   sheet <set-id>     write .cache/designer/research/<set-id>/sheet.html
 *                      [--deployed-url <address>] [--local-url <address>]
 *
 * See docs/designers/research-sessions.md and the research-session skill.
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { isKebabCase } from '../../new-set/names.js'
import { writeSheet, LOCAL_URL } from './sheet.js'
import { statusOf, turnOff, turnOn } from './switch.js'

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..')

export const USAGE = [
  'Usage: npm run designer:research -- <on|off|status|sheet> <set-id>',
  '       npm run designer:research -- sheet <set-id> [--deployed-url <address>]'
].join('\n')

const COMMANDS = new Set(['on', 'off', 'status', 'sheet'])

/**
 * @param {string[]} argv
 * @returns {{ command?: string, setId?: string, deployedUrl: string|null, localUrl: string }}
 */
export const parseArgs = (argv) => {
  const positional = []
  let deployedUrl = null
  let localUrl = LOCAL_URL
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--deployed-url') {
      deployedUrl = argv[++index] ?? null
    } else if (arg === '--local-url') {
      localUrl = argv[++index] ?? LOCAL_URL
    } else {
      positional.push(arg)
    }
  }
  const [command, setId] = positional
  return { command, setId, deployedUrl, localUrl }
}

/**
 * Runs one command and returns its exit code.
 * @param {string[]} argv
 * @param {object} [io]
 * @param {string} [io.repoRoot]
 * @param {(line: string) => void} [io.print]
 */
export const run = (
  argv,
  { repoRoot = REPO_ROOT, print = (line) => console.log(line) } = {}
) => {
  const { command, setId, deployedUrl, localUrl } = parseArgs(argv)
  if (!COMMANDS.has(command) || !setId) {
    print(USAGE)
    return 1
  }
  if (!isKebabCase(setId)) {
    print(
      `"${setId}" is not a design release id (lower-case words joined by hyphens).`
    )
    return 1
  }
  const handlers = {
    on: () => turnOn(repoRoot, setId),
    off: () => turnOff(repoRoot, setId),
    status: () => statusOf(repoRoot, setId),
    sheet: () => writeSheet(repoRoot, setId, { deployedUrl, localUrl })
  }
  const result = handlers[command]()
  result.lines.forEach((line) => print(line))
  return result.ok ? 0 : 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = run(process.argv.slice(2))
}
