/**
 * `npm run designer:preflight [-- --json] [-- --wait]`: is this computer
 * ready to run the prototype? Checks Node against .nvmrc, the installed
 * packages, the browser designer:show uses, and whether port 3103 is free
 * (and if not, which program holds it). It never stops or changes anything.
 *
 * `--wait` instead waits (up to two minutes) for a prototype started with
 * `npm run dev` to answer on port 3103, then prints its address.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT } from '../lib/repo.js'
import { isPortFree } from '../show/server.js'
import {
  DESIGNER_PORT,
  checkBrowser,
  checkNode,
  checkPackages,
  checkPort,
  exitCodeFor,
  formatResults,
  packagesDrift,
  parseLsof
} from './checks.js'

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

/** Runs every check. */
export const runChecks = async (root = REPO_ROOT) => {
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
      : []
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
    })
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
  const results = await runChecks()
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
