/**
 * Throwaway git repositories for the hand-off tests. Each lives under the
 * system temp folder and is removed by the caller with `removeRepo`.
 * Only imported by `*.test.js` files.
 */
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { git } from './git.js'

export const PROTOTYPE_ROOT = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../..'
)

export const makeRepo = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'handoff-test-'))
  git(['init', '-q', '-b', 'main'], { cwd: root })
  return root
}

export const removeRepo = (root) =>
  rmSync(root, { recursive: true, force: true })

export const writeFiles = (root, files) => {
  for (const [filePath, content] of Object.entries(files)) {
    const target = path.join(root, filePath)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
}

export const readFile = (root, filePath) =>
  readFileSync(path.join(root, filePath), 'utf8')

export const editFile = (root, filePath, from, to) => {
  const content = readFile(root, filePath)
  if (!content.includes(from)) {
    throw new Error(`${filePath} does not contain ${from}`)
  }
  writeFiles(root, { [filePath]: content.replace(from, to) })
}

export const commitAll = (root, message) => {
  git(['add', '-A'], { cwd: root })
  git(
    [
      '-c',
      'user.name=Handoff test',
      '-c',
      'user.email=handoff-test@example.com',
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-q',
      '-m',
      message
    ],
    { cwd: root }
  )
  return git(['rev-parse', 'HEAD'], { cwd: root }).trim()
}

/** Copies the real high-risk-plants set from this checkout into `root`. */
export const copyRealJourney = (root) =>
  cpSync(
    path.join(PROTOTYPE_ROOT, 'src/server/app/sets/high-risk-plants'),
    path.join(root, 'src/server/app/sets/high-risk-plants'),
    { recursive: true }
  )
