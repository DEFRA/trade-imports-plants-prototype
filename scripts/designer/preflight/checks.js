/**
 * The rules behind designer:preflight, kept free of the filesystem and the
 * network so each one is unit tested. Each check answers with a status and
 * one plain sentence:
 * - `ok`: nothing to do
 * - `fix`: something must be done before the prototype will run, and what
 * - `busy`: port 3103 is taken (usually by the prototype itself); nothing is
 *   stopped, the designer decides
 */

export const DESIGNER_PORT = 3103
export const INSTALL_COMMAND = 'npx --yes npm@11.6.2 ci'
export const BROWSER_INSTALL_COMMAND = 'npm run playwright:install'

const versionParts = (version) =>
  String(version)
    .trim()
    .replace(/^v/, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10))

/** Node on this computer against the version in .nvmrc. */
export const checkNode = (current, wanted) => {
  if (!wanted) {
    return { id: 'node', status: 'ok', message: `Node ${current}.` }
  }
  const [haveMajor] = versionParts(current)
  const [wantMajor] = versionParts(wanted)
  const wantedText = String(wanted).trim().replace(/^v/, '')
  if (haveMajor !== wantMajor) {
    return {
      id: 'node',
      status: 'fix',
      message: `This prototype needs Node ${wantedText}, and this computer has Node ${current}. If you use nvm, run: nvm install (then open a new terminal).`
    }
  }
  return {
    id: 'node',
    status: 'ok',
    message:
      current === wantedText
        ? `Node ${current}, the version this prototype expects.`
        : `Node ${current}. The prototype expects ${wantedText}; the same major version works.`
  }
}

const SKIPPED_ENTRY = (entry) =>
  entry.optional === true || entry.link === true || entry.peer === true

/**
 * The packages package-lock.json lists that are missing from, or a different
 * version in, what npm last installed (node_modules/.package-lock.json).
 * Compares contents, not file dates: switching branches rewrites the lock
 * file's date without changing what it says. Optional packages (built for
 * other kinds of computer) are skipped.
 *
 * @returns {string[]} the package paths that differ.
 */
export const packagesDrift = (lock, installed) => {
  const wanted = lock?.packages ?? {}
  const have = installed?.packages ?? {}
  return Object.entries(wanted)
    .filter(([name, entry]) => name !== '' && !SKIPPED_ENTRY(entry))
    .filter(([name, entry]) => have[name]?.version !== entry.version)
    .map(([name]) => name)
}

/**
 * Whether the packages are installed and match package-lock.json.
 *
 * @param {object} state - `{ installed, drift }`: installed is false when
 *   node_modules/.package-lock.json is missing; drift is from packagesDrift.
 */
export const checkPackages = ({ installed, drift = [] }) => {
  if (!installed) {
    return {
      id: 'packages',
      status: 'fix',
      message: `The prototype's packages are not installed. Run: ${INSTALL_COMMAND}`
    }
  }
  if (drift.length > 0) {
    const examples = drift
      .slice(0, 3)
      .map((name) => name.replace(/^node_modules\//, ''))
      .join(', ')
    return {
      id: 'packages',
      status: 'fix',
      message: `${drift.length} installed package(s) do not match the package list (for example ${examples}). Run: ${INSTALL_COMMAND}`
    }
  }
  return {
    id: 'packages',
    status: 'ok',
    message: 'Packages are installed and match the package list.'
  }
}

/** Whether the browser used for pictures and walk-throughs is installed. */
export const checkBrowser = ({
  packagesInstalled,
  browserPath,
  browserFound
}) => {
  if (!packagesInstalled) {
    return {
      id: 'browser',
      status: 'fix',
      message: `Cannot check the picture-taking browser until the packages are installed. After installing, run: ${BROWSER_INSTALL_COMMAND}`
    }
  }
  if (!browserFound) {
    return {
      id: 'browser',
      status: 'fix',
      message: `The browser designer:show uses is not installed${browserPath ? ` (looked for ${browserPath})` : ''}. Run: ${BROWSER_INSTALL_COMMAND}`
    }
  }
  return {
    id: 'browser',
    status: 'ok',
    message: 'The picture-taking browser (Chromium) is installed.'
  }
}

/**
 * The listening process from `lsof -nP -iTCP:<port> -sTCP:LISTEN -Fpc`
 * output: lines starting `p` (process id) and `c` (command name).
 */
export const parseLsof = (output) => {
  const holder = { pid: null, command: null }
  for (const line of String(output ?? '').split('\n')) {
    if (line.startsWith('p') && holder.pid === null) {
      holder.pid = Number.parseInt(line.slice(1), 10)
    } else if (line.startsWith('c') && holder.command === null) {
      holder.command = line.slice(1).trim()
    } else {
      // other fields (file descriptors, names) are not needed
    }
  }
  return holder.pid === null ? null : holder
}

/**
 * Whether port 3103 is free, and if not, who holds it.
 *
 * @param {object} state - `{ free, holder, answersLikeThePrototype }`.
 */
export const checkPort = ({ free, holder, answersLikeThePrototype }) => {
  if (free) {
    return {
      id: 'port',
      status: 'ok',
      message: `Port ${DESIGNER_PORT} is free, ready for npm run dev.`
    }
  }
  const who = holder
    ? `${holder.command ?? 'a program'} (process ${holder.pid})`
    : 'another program'
  const likely = answersLikeThePrototype
    ? `It answers like the prototype, so the prototype is probably already running at http://localhost:${DESIGNER_PORT}.`
    : 'It may be the prototype started in another terminal, or a different program.'
  return {
    id: 'port',
    status: 'busy',
    holder: holder ?? null,
    message: `Port ${DESIGNER_PORT} is in use by ${who}. ${likely} Nothing has been stopped.`
  }
}

const LABELS = {
  node: 'Node',
  packages: 'Packages',
  browser: 'Browser',
  port: `Port ${DESIGNER_PORT}`
}

const MARKS = { ok: 'OK', fix: 'Needs doing', busy: 'In use' }

/** The results as lines a designer reads. */
export const formatResults = (results) =>
  results.map(
    (result) =>
      `${MARKS[result.status] ?? result.status} - ${LABELS[result.id] ?? result.id}: ${result.message}`
  )

/** 1 when anything must be done before the prototype can run, else 0. */
export const exitCodeFor = (results) =>
  results.some((result) => result.status === 'fix') ? 1 : 0
