/**
 * `npm run designer:preflight [-- --json] [-- --share] [-- --wait]`: is this
 * computer ready to run the prototype? Checks Node against .nvmrc, the
 * installed packages, the browser designer:show uses, and whether port 3103
 * is free (and if not, which program holds it). Then what saving and sharing
 * need: git's name and email, the `upstream` remote hand-offs fetch, and the
 * GitHub command line. It never stops or changes anything.
 *
 * `--share` also asks GitHub whether gh is signed in and whether this
 * computer may send branches (`git push --dry-run`, which sends nothing).
 * Those need the network, so the everyday check leaves them out.
 *
 * `--wait` instead waits (up to two minutes) for a prototype started with
 * `npm run dev` to answer on port 3103, then prints its address.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { readPrototypeConfig } from '../lib/prototype-config.js'
import { REPO_ROOT } from '../lib/repo.js'
import { isPortFree } from '../show/server.js'
import {
  DESIGNER_PORT,
  UPSTREAM_REMOTE,
  checkBrowser,
  checkGitHubCli,
  checkGitIdentity,
  checkNode,
  checkPackages,
  checkPort,
  checkPush,
  checkUpstreamRemote,
  exitCodeFor,
  formatResults,
  installHintFor,
  packagesDrift,
  parseLsof
} from './checks.js'

const NETWORK_TIMEOUT_MS = 20_000

const WAIT_TIMEOUT_MS = 120_000
const WAIT_POLL_MS = 500
const PROTOTYPE_URL = `http://localhost:${DESIGNER_PORT}`

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const readNvmrc = (root) => {
  const file = path.join(root, '.nvmrc')
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null
}

/**
 * Whether this checkout sits inside the trade-imports workspace: a sibling
 * `tim` folder two directories up (`<workspace>/repos/<this repo>`). Reading
 * the filesystem is as far as this goes; nothing here imports tim.
 */
const isInsideWorkspace = (root) => existsSync(path.resolve(root, '../../tim'))

const browserState = async (packagesInstalled) => {
  if (!packagesInstalled) {
    return { packagesInstalled, browserPath: null, browserFound: false }
  }
  try {
    const { chromium } = await import('@playwright/test')
    const browserPath = chromium.executablePath()
    return {
      packagesInstalled,
      browserPath,
      browserFound: existsSync(browserPath)
    }
  } catch {
    return { packagesInstalled, browserPath: null, browserFound: false }
  }
}

const portHolder = () => {
  try {
    return parseLsof(
      execFileSync(
        'lsof',
        ['-nP', `-iTCP:${DESIGNER_PORT}`, '-sTCP:LISTEN', '-Fpc'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      )
    )
  } catch {
    return null
  }
}

const answersLikeThePrototype = async () => {
  try {
    const response = await fetch(`${PROTOTYPE_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Runs a command without ever waiting on a password prompt: `{ ok, output }`,
 * or `{ ok: false, detail }` with the first line it complained with (null
 * when it is not installed).
 */
const attempt = (command, args, { root, timeout } = {}) => {
  try {
    const output = execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1' }
    })
    return { ok: true, output: output.trim(), detail: null }
  } catch (error) {
    const detail = String(error.stderr ?? '')
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line !== '')
    return { ok: false, output: null, detail: detail ?? null }
  }
}

const outputOf = (command, args, options) =>
  attempt(command, args, options).output

const gitConfig = (key, root) =>
  outputOf('git', ['config', '--get', key], { root }) || null

/** What saving, sharing and handing off need from git and GitHub. */
const shareChecks = (root, { share, insideWorkspace }) => {
  const config = readPrototypeConfig({ root })
  const ghInstalled = outputOf('gh', ['--version'], { root }) !== null
  const results = [
    checkGitIdentity({
      name: gitConfig('user.name', root),
      email: gitConfig('user.email', root)
    }),
    checkUpstreamRemote({
      fetchUrl: outputOf('git', ['remote', 'get-url', UPSTREAM_REMOTE], {
        root
      }),
      pushUrl: outputOf(
        'git',
        ['remote', 'get-url', '--push', UPSTREAM_REMOTE],
        { root }
      ),
      cloneUrl: config.realService.cloneUrl,
      insideWorkspace
    }),
    checkGitHubCli({
      installed: ghInstalled,
      signedIn:
        share && ghInstalled
          ? attempt('gh', ['auth', 'status'], {
              root,
              timeout: NETWORK_TIMEOUT_MS
            }).ok
          : null
    })
  ]
  if (share) {
    const push = attempt(
      'git',
      [
        'push',
        '--dry-run',
        '--quiet',
        'origin',
        'HEAD:refs/heads/designer-preflight-check'
      ],
      { root, timeout: NETWORK_TIMEOUT_MS }
    )
    results.push(
      checkPush({
        canPush: push.ok,
        detail: push.detail,
        repository: config.repository ?? 'the prototype'
      })
    )
  }
  return results
}

/** Runs every check. */
export const runChecks = async (root = REPO_ROOT, { share = false } = {}) => {
  const insideWorkspace = isInsideWorkspace(root)
  const installedList = readJson(
    path.join(root, 'node_modules/.package-lock.json')
  )
  const installed = installedList !== null
  const packages = checkPackages({
    installed,
    drift: installed
      ? packagesDrift(
          readJson(path.join(root, 'package-lock.json')),
          installedList
        )
      : [],
    installCommand: installHintFor({
      packageManager: readJson(path.join(root, 'package.json'))?.packageManager,
      insideWorkspace
    })
  })
  const free = await isPortFree(DESIGNER_PORT)
  return [
    checkNode(process.versions.node, readNvmrc(root)),
    packages,
    checkBrowser(await browserState(installed)),
    checkPort({
      free,
      holder: free ? null : portHolder(),
      answersLikeThePrototype: free ? false : await answersLikeThePrototype()
    }),
    ...shareChecks(root, { share, insideWorkspace })
  ]
}

const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** Waits for the prototype on port 3103 to answer. */
export const waitForPrototype = async (timeoutMs = WAIT_TIMEOUT_MS) => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await answersLikeThePrototype()) {
      return true
    }
    await delay(WAIT_POLL_MS)
  }
  return false
}

export const main = async (argv) => {
  if (argv.includes('--wait')) {
    if (await waitForPrototype()) {
      console.log(`The prototype is running: ${PROTOTYPE_URL}`)
      return 0
    }
    console.error(
      `The prototype did not answer on ${PROTOTYPE_URL} within two minutes. Look at the npm run dev output for the first error.`
    )
    return 1
  }
  const results = await runChecks(REPO_ROOT, {
    share: argv.includes('--share')
  })
  if (argv.includes('--json')) {
    console.log(
      JSON.stringify({ results, exitCode: exitCodeFor(results) }, null, 2)
    )
  } else {
    console.log(formatResults(results).join('\n'))
  }
  return exitCodeFor(results)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
