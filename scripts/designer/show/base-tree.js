/**
 * The "before" copy of the prototype for `designer:show -- --before`: the
 * last commit unpacked with `git archive`, with node_modules and .public
 * linked to the real ones. The working tree is never touched: no stash, no
 * checkout, no reset. Each commit is unpacked once and reused; only the
 * newest few are kept.
 *
 * The copies live in the computer's temporary folder, not in the repo. A
 * copy holds every test file of that commit, and vitest only skips
 * node_modules and .git: a copy under .cache/ would make `npm test` (and the
 * pre-commit hook) run the whole suite a second time against old code.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { gitEnv } from '../lib/git-env.js'

/** Where designer:show writes its galleries, inside the repo (git ignores it). */
export const DESIGNER_CACHE = '.cache/designer'
export const READY_MARKER = '.designer-base-ready'
const SHORT_SHA_LENGTH = 12
const REPO_KEY_LENGTH = 10
const BASE_COPIES_KEPT = 3
const LINKED = ['node_modules', '.public']

/** The folder name for a commit's copy. */
export const baseFolderName = (sha) => `base-${sha.slice(0, SHORT_SHA_LENGTH)}`

/**
 * The folder that holds this checkout's "before" copies: one per checkout,
 * so two clones of the prototype never share or delete each other's.
 */
export const baseCacheDir = (root, temporary = tmpdir()) =>
  path.join(
    temporary,
    'plants-prototype-designer-show',
    createHash('sha256')
      .update(path.resolve(root))
      .digest('hex')
      .slice(0, REPO_KEY_LENGTH)
  )

/** The copies to delete so that only the newest `keep` remain, `current` always kept. */
export const baseFoldersToPrune = (folders, current, keep = BASE_COPIES_KEPT) =>
  folders
    .filter((folder) => folder.name !== current)
    .sort((a, b) => b.time - a.time)
    .slice(Math.max(keep - 1, 0))
    .map((folder) => folder.name)

const unpack = (root, sha, target) =>
  new Promise((resolve, reject) => {
    const archive = spawn('git', ['archive', '--format=tar', sha], {
      cwd: root,
      env: gitEnv(),
      stdio: ['ignore', 'pipe', 'pipe']
    })
    const extract = spawn('tar', ['-x', '-f', '-', '-C', target], {
      stdio: ['pipe', 'ignore', 'pipe']
    })
    let failure = ''
    archive.stderr.on('data', (chunk) => {
      failure += chunk
    })
    extract.stderr.on('data', (chunk) => {
      failure += chunk
    })
    archive.stdout.pipe(extract.stdin)
    archive.once('error', reject)
    extract.once('error', reject)
    extract.once('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(`Could not unpack your last saved version: ${failure}`)
        )
      }
    })
  })

const prune = (cacheDir, current) => {
  const folders = readdirSync(cacheDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('base-'))
    .map((entry) => ({
      name: entry.name,
      time: statSync(path.join(cacheDir, entry.name)).mtimeMs
    }))
  for (const name of baseFoldersToPrune(folders, current)) {
    rmSync(path.join(cacheDir, name), { recursive: true, force: true })
  }
}

/**
 * A ready-to-run copy of the prototype at commit `sha`.
 *
 * @param {string} root - the prototype's folder.
 * @param {string} sha - the commit.
 * @param {object} [options] - `{ cacheDir }`, where copies are kept
 *   (default: baseCacheDir(root)).
 * @returns {Promise<string>} the copy's folder.
 */
export const prepareBaseTree = async (
  root,
  sha,
  { cacheDir = baseCacheDir(root) } = {}
) => {
  const name = baseFolderName(sha)
  const target = path.join(cacheDir, name)
  if (existsSync(path.join(target, READY_MARKER))) {
    return target
  }
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  await unpack(root, sha, target)
  const linkType = process.platform === 'win32' ? 'junction' : 'dir'
  for (const linked of LINKED) {
    const source = path.join(root, linked)
    if (existsSync(source)) {
      symlinkSync(source, path.join(target, linked), linkType)
    }
  }
  writeFileSync(
    path.join(target, READY_MARKER),
    `${JSON.stringify({ sha, root, createdAt: new Date().toISOString() })}\n`
  )
  prune(cacheDir, name)
  return target
}
