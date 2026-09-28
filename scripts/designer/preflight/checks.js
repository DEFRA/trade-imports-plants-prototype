/**
 * The rules behind designer:preflight, kept free of the filesystem and the
 * network so each one is unit tested. Each check answers with a status and
 * one plain sentence:
 * - `ok`: nothing to do
 * - `fix`: something must be done before the prototype will run, and what
 * - `busy`: port 3103 is taken (usually by the prototype itself); nothing is
 *   stopped, the designer decides
 * - `todo`: the prototype runs, but saving, sharing or handing off will not
 *   work until this is done
 */

export const DESIGNER_PORT = 3103
export const BROWSER_INSTALL_COMMAND = 'npm run playwright:install'
export const UPSTREAM_REMOTE = 'upstream'
export const DISABLED_PUSH_URL = 'DISABLED'

// The same rule as scripts/npm-version.js: Corepack allows a `+sha512...`
// suffix, which npm itself rejects.
const NPM_SPEC = /^npm@\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

/**
 * The install command for package.json's `packageManager` (`npm@11.6.2`
 * becomes `npx --yes npm@11.6.2 ci`), so the weekly update's npm bump reaches
 * every designer without a code change. Plain `npm ci` when it names no npm.
 */
export const installCommandFor = (packageManager) => {
  const [spec] = String(packageManager ?? '').split('+')
  return NPM_SPEC.test(spec) ? `npx --yes ${spec} ci` : 'npm ci'
}

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
 * @param {object} state - `{ installed, drift, installCommand }`: installed
 *   is false when node_modules/.package-lock.json is missing; drift is from
 *   packagesDrift; installCommand is from installCommandFor.
 */
export const checkPackages = ({
  installed,
  drift = [],
  installCommand = 'npm ci'
}) => {
  if (!installed) {
    return {
      id: 'packages',
      status: 'fix',
      message: `The prototype's packages are not installed. Run: ${installCommand}`
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
      message: `${drift.length} installed package(s) do not match the package list (for example ${examples}). Run: ${installCommand}`
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

/**
 * Whether git knows who you are. Without a name and email, git refuses every
 * save.
 *
 * @param {object} state - `{ name, email }`, from git config (null when unset).
 */
export const checkGitIdentity = ({ name, email }) => {
  const missing = [
    ...(name ? [] : ['git config --global user.name "Your Name"']),
    ...(email ? [] : ['git config --global user.email "you@example.com"'])
  ]
  if (missing.length > 0) {
    return {
      id: 'git',
      status: 'todo',
      message: `Git does not know who you are yet, so it cannot save your work. Run: ${missing.join(' then ')} (use the email on your GitHub account).`
    }
  }
  return {
    id: 'git',
    status: 'ok',
    message: `Git saves your work as ${name} <${email}>.`
  }
}

/**
 * Whether the real service's code can be fetched for a hand-off, with no way
 * to send anything to it. A fresh clone has no `upstream` remote: remotes are
 * not copied by `git clone`.
 *
 * @param {object} state - `{ fetchUrl, pushUrl, cloneUrl }`: the remote's
 *   addresses (null when there is no such remote) and the real service's
 *   clone address from scripts/designer/prototype.json.
 */
export const checkUpstreamRemote = ({ fetchUrl, pushUrl, cloneUrl }) => {
  const addRemote = `git remote add ${UPSTREAM_REMOTE} ${cloneUrl}`
  const lockPush = `git remote set-url --push ${UPSTREAM_REMOTE} ${DISABLED_PUSH_URL}`
  if (!fetchUrl) {
    return {
      id: 'upstream',
      status: 'todo',
      commands: [addRemote, lockPush],
      message: `This copy cannot compare a hand-off with the real service (plants-frontend) yet. Run: ${addRemote} then ${lockPush} (the second stops anything ever being sent there).`
    }
  }
  if (pushUrl !== DISABLED_PUSH_URL) {
    return {
      id: 'upstream',
      status: 'todo',
      commands: [lockPush],
      message: `The real service (plants-frontend) can be fetched, but its send address is not locked. Run: ${lockPush}`
    }
  }
  return {
    id: 'upstream',
    status: 'ok',
    message:
      'The real service (plants-frontend) can be fetched for hand-offs, and nothing can be sent to it.'
  }
}

/**
 * Whether the GitHub command line (`gh`) is there and signed in, for opening
 * pull requests. Without it, share-my-change prints a link to open the pull
 * request in the browser instead.
 *
 * @param {object} state - `{ installed, signedIn }`; signedIn is null when it
 *   was not checked (only `--share` checks it).
 */
export const checkGitHubCli = ({ installed, signedIn = null }) => {
  if (!installed) {
    return {
      id: 'gh',
      status: 'todo',
      message:
        'The GitHub command line (gh) is not installed. Pull requests still work: Claude gives you a link to open one in your browser. To have Claude open them for you, install gh from https://cli.github.com, then run: gh auth login'
    }
  }
  if (signedIn === false) {
    return {
      id: 'gh',
      status: 'todo',
      message:
        'The GitHub command line (gh) is installed but not signed in. Run: gh auth login'
    }
  }
  return {
    id: 'gh',
    status: 'ok',
    message:
      signedIn === true
        ? 'The GitHub command line (gh) is installed and signed in.'
        : 'The GitHub command line (gh) is installed. Run designer:preflight -- --share to check it is signed in.'
  }
}

/**
 * Whether this computer can send a branch to the prototype on GitHub. Only
 * `--share` checks it, with `git push --dry-run`, which sends nothing.
 *
 * @param {object} state - `{ canPush, detail, repository }`.
 */
export const checkPush = ({ canPush, detail, repository }) => {
  if (canPush) {
    return {
      id: 'push',
      status: 'ok',
      message: `You can send branches to ${repository} on GitHub.`
    }
  }
  return {
    id: 'push',
    status: 'todo',
    message: `You cannot send branches to ${repository} on GitHub yet${detail ? ` (git said: ${detail})` : ''}. Ask the prototype maintainer for write access to the repository, and sign in to GitHub on this computer (gh auth login sets that up).`
  }
}

const LABELS = {
  node: 'Node',
  packages: 'Packages',
  browser: 'Browser',
  port: `Port ${DESIGNER_PORT}`,
  git: 'Git name and email',
  upstream: 'Real service for hand-offs',
  gh: 'GitHub command line',
  push: 'Sending to GitHub'
}

const MARKS = {
  ok: 'OK',
  fix: 'Needs doing',
  busy: 'In use',
  todo: 'Before you share'
}

/** The results as lines a designer reads. */
export const formatResults = (results) =>
  results.map(
    (result) =>
      `${MARKS[result.status] ?? result.status} - ${LABELS[result.id] ?? result.id}: ${result.message}`
  )

/**
 * 1 when anything must be done before the prototype can run, else 0. A
 * `todo` (saving, sharing, handing off) never stops the prototype running.
 */
export const exitCodeFor = (results) =>
  results.some((result) => result.status === 'fix') ? 1 : 0
