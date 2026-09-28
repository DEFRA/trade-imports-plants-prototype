/**
 * `npm run designer:save -- -m "<first line>" [-m "<body>"]`: saves what is
 * staged as one commit. The pre-commit checks print hundreds of lines (a
 * coverage table), so their output goes to `.cache/designer/commit.log` and
 * this prints one line when the save worked, or the end of the log when it
 * did not. It works from any folder, needs no shell redirect, and never
 * skips the checks.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { gitEnv } from '../lib/git-env.js'
import { REPO_ROOT } from '../lib/repo.js'

export const LOG_FILE = '.cache/designer/commit.log'
const TAIL_LINES = 60
const MAX_BUFFER = 64 * 1024 * 1024

export const USAGE = [
  'Usage:',
  '  npm run designer:save -- -m "<first line>" [-m "<body>"]',
  '  npm run designer:save -- --no-edit   (finish a merge with its own message)',
  'Stage each file by name with git add first.'
].join('\n')

const REFUSED = new Set(['--no-verify', '-n', '--amend', '-a', '--all'])

/**
 * The save's arguments, parsed: the messages, or `noEdit` to finish a merge.
 * No filesystem, no process.
 *
 * @returns {{ messages: string[], noEdit: boolean } | { error: string }}
 */
export const parseSaveArgs = (argv) => {
  const messages = []
  let noEdit = false
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (REFUSED.has(arg)) {
      return {
        error: `${arg} is not allowed: every save runs the checks, and only what you staged is saved.`
      }
    }
    if (arg === '-m') {
      const message = argv[index + 1]
      if (!message || message.trim() === '') {
        return { error: `-m needs a message after it.\n${USAGE}` }
      }
      messages.push(message)
      index++
    } else if (arg === '--no-edit') {
      noEdit = true
    } else {
      return {
        error: `"${arg}" is not something designer:save takes. Stage files with git add, not by naming them here.\n${USAGE}`
      }
    }
  }
  if (messages.length === 0 && !noEdit) {
    return { error: `Say what the save is with -m "<first line>".\n${USAGE}` }
  }
  return { messages, noEdit }
}

const git = (root, args) =>
  spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: gitEnv(),
    maxBuffer: MAX_BUFFER
  })

const nothingStaged = (root) =>
  git(root, ['diff', '--cached', '--quiet']).status === 0 &&
  git(root, ['rev-parse', '--verify', '--quiet', 'MERGE_HEAD']).status !== 0

const tail = (text) => text.trimEnd().split('\n').slice(-TAIL_LINES)

/**
 * Commits what is staged, with the checks, and writes their output to the
 * log.
 *
 * @returns {{ code: number, lines: string[] }}
 */
export const save = (argv, { root = REPO_ROOT } = {}) => {
  const parsed = parseSaveArgs(argv)
  if (parsed.error) {
    return { code: 1, lines: [parsed.error] }
  }
  if (nothingStaged(root)) {
    return {
      code: 1,
      lines: [
        'Nothing is staged, so nothing was saved. Stage each file by name with git add, then save again.'
      ]
    }
  }
  const args = [
    'commit',
    ...parsed.messages.flatMap((message) => ['-m', message]),
    ...(parsed.noEdit ? ['--no-edit'] : [])
  ]
  const result = git(root, args)
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const logPath = path.join(root, LOG_FILE)
  mkdirSync(path.dirname(logPath), { recursive: true })
  writeFileSync(logPath, output)
  if (result.status !== 0) {
    return {
      code: 1,
      lines: [
        `Nothing was saved: the checks before saving failed. The last ${TAIL_LINES} lines of ${LOG_FILE}:`,
        '',
        ...tail(output),
        '',
        'Fix what it says (the check-my-change skill explains every failure), stage the fix, and save again. Never skip the checks.'
      ]
    }
  }
  const saved = git(root, ['log', '-1', '--format=%h %s']).stdout.trim()
  const files = git(root, ['show', '--name-only', '--format=', 'HEAD'])
    .stdout.split('\n')
    .filter(Boolean).length
  return {
    code: 0,
    lines: [
      `Saved ${saved} (${files} file${files === 1 ? '' : 's'}). The checks passed. Full output: ${LOG_FILE}`
    ]
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { code, lines } = save(process.argv.slice(2))
  console.log(lines.join('\n'))
  process.exitCode = code
}
