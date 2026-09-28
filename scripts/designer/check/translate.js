/**
 * Turns raw tool output (Prettier, ESLint, dependency-cruiser, vitest,
 * Playwright, the server's own boot guards) into plain English: what went
 * wrong, how to fix it, and which skill fixes it.
 *
 * Each signature is a pattern that failure output is known to contain. The
 * table is the single source for docs/designers/checks-and-errors.md, and
 * translate.test.js holds one real-shaped fixture per signature.
 *
 * A failure is also attributed: when every file or set it names is one the
 * designer did not touch, it is reported as "not caused by your change" so
 * the designer tells the maintainer instead of chasing it. It is never hidden.
 */

const SET_PATH = /src\/server\/app\/sets\/([a-z0-9-]+)\//
const ROUTES_PATH = /src\/server\/app\/routes-([a-z0-9-]+)\.js/
// A repo-relative file, alone or at the end of an absolute path (ESLint and
// Prettier print absolute ones). Paths inside node_modules are not ours.
const REPO_FILE =
  /(?:^|[\s'"(`/])((?:src|scripts|fit|test|docs|\.claude)\/[\w./@-]+\.[a-z]+)/g
const DEPENDENCY_PATH = /node_modules\//
const EVIDENCE_LINES = 4

/**
 * The known failure signatures, most specific first. `cause` and `fix` may
 * be functions of the RegExp match. `generic` signatures are only reported
 * when nothing more specific matched.
 */
export const SIGNATURES = [
  {
    id: 'syntax',
    title: 'A typing slip in a file',
    pattern:
      /SyntaxError[^\n]*|Unexpected token[^\n]*|Unterminated string constant|missing \) after argument list/,
    cause:
      'A file has a typing slip: usually a missing quote, comma or bracket.',
    fix: 'Open the file named in the log at the line shown and close the quote or bracket. In copy files, every piece of text needs a quote at each end and a comma after it.',
    skill: 'change-the-words'
  },
  {
    id: 'prettier',
    title: 'Code layout',
    pattern:
      /Code style issues found[^\n]*|\[warn\] \S+\.(?:js|cjs|md|json)\b|Prettier could not tidy[^\n]*/,
    cause:
      'The layout of some files (spaces, quotes, line breaks) does not match the house style. The pre-commit hook refuses the commit until it does.',
    fix: 'Run the check again: its first step tidies every file you changed. If the files named are ones you did not change, run `npm run designer:format`.',
    skill: 'check-my-change'
  },
  {
    id: 'copy-shape',
    title: 'English and Welsh words do not match',
    pattern:
      /copy-shape:[^\n]*|The Welsh file has no `[^`]+`|There is no copy\.cy\.js[^\n]*/,
    cause:
      'The English and Welsh copy files in your design release are not the same shape: a key is missing, empty, or the Welsh is a straight copy of the English.',
    fix: "Add the missing key to copy.cy.js. If you do not have the Welsh yet, write '[Welsh needed] ' followed by the English. Keep exactly the same keys in both files.",
    skill: 'change-the-words'
  },
  {
    id: 'copy-parity',
    title: 'Real journey English and Welsh do not match',
    pattern:
      /copy parity[^\n]*|cy paths must equal en paths|leaf kind must match|function arity must match|must be translated \(or allowlisted\)/,
    cause:
      "The real journey's English and Welsh copy files differ in shape, or a Welsh text is the same as the English.",
    fix: 'Give copy.cy.js the same keys as copy.en.js and translate every text. The real journey does not accept [Welsh needed]: make the change in your design release, or get the Welsh before it is handed off.',
    skill: 'change-the-words'
  },
  {
    id: 'copy-convention',
    title: 'A page is missing its copy files',
    pattern:
      /copy convention[^\n]*|must own its copy|must carry its Welsh copy|must test its copy|must keep its copy files in copy\/|: \S+ must be copy\b/,
    cause:
      'A feature folder with a template is missing its copy files, or a piece of text is empty.',
    fix: 'Every feature with a template needs copy/copy.en.js and copy/copy.cy.js (the real journey also needs copy/copy.test.js). No text can be empty.',
    skill: 'change-the-words'
  },
  {
    id: 'service-contract',
    title: "A stand-in service's CONTRACT cannot be read",
    pattern:
      /Should read the CONTRACT of (?:src\/server\/app\/services\/)?([a-z0-9-]+)(?:\/index\.js)? as data/,
    cause: (match) =>
      `The hand-off reads the CONTRACT in src/server/app/services/${match[1]}/index.js as data, without running it, and could not.`,
    fix: 'Write CONTRACT with plain values only (text, numbers, true or false, lists and objects), in index.js itself. It must not use a name index.js imports, such as client.MAX_LENGTH or [...client.TYPES]: copy the values in, or declare them as constants in index.js. It must list at least one operation. index.js and client.js must import nothing from prototype-support/ or prototype-data/: only stub.js may.',
    skill: 'fake-a-service'
  },
  {
    id: 'contract',
    title: 'A real journey page saves the wrong answers',
    pattern:
      /controller <-> model commit contract[^\n]*|src\/server\/app\/contract\.test\.js/,
    cause:
      'In the real journey, a page saves different answers from the ones its controller says it collects (its meta.collects).',
    fix: 'This test only covers the real journey (high-risk-plants). Make the change in your design release instead. On a handoff branch, add the page to src/server/app/contract.test.js.',
    skill: 'change-the-journey'
  },
  {
    id: 'no-orphans',
    title: 'A file nothing uses',
    pattern: /no-orphans[^\n]*/,
    cause: 'A JavaScript file is not used by anything.',
    fix: "Import it where it is needed (a new page's controller goes in the features index.js), or delete it if you meant to remove it.",
    skill: 'change-the-journey'
  },
  {
    id: 'set-isolation',
    title: 'One set uses another set',
    pattern: /set-isolation[^\n]*|journey-isolation[^\n]*/,
    cause:
      'A file in one set imports a file from another set. Each set must stand on its own.',
    fix: 'Copy what you need into your own set instead of importing it. To bring a change from one release to another, ask to carry it across.',
    skill: 'design-release'
  },
  {
    id: 'obligation-purity',
    title: 'Display words in the model',
    pattern:
      /Model purity violated[^\n]*|obligation-purity[^\n]*|obligation model purity/,
    cause:
      'A label, hint, title or other display text was put in the model (the obligations files). The model only says what is collected.',
    fix: "Move the words into the page's copy files and use them in the template.",
    skill: 'change-the-journey'
  },
  {
    id: 'collected-by-no-page',
    title: 'An answer no page asks for',
    pattern: /Obligations collected by no page: ([^\n]+)/,
    cause: (match) =>
      `The model asks for an answer that no page collects: ${match[1].trim()}.`,
    fix: "Add the answer's name to a page's meta.collects in its controller, or remove it from the set's obligations.",
    skill: 'change-the-journey'
  },
  {
    id: 'owned-by-no-feature',
    title: 'An answer no feature reads back',
    pattern: /obligations owned by no feature: ([^\n]+)/,
    cause: (match) =>
      `An answer in the model has no feature binding that reads it back: ${match[1].trim()}.`,
    fix: "Add a binding for it in the feature's evaluation.js (the add-a-field recipe shows how), or remove it from the obligations.",
    skill: 'change-the-journey'
  },
  {
    id: 'obligation-identity',
    title: 'A binding made its own copy of an answer',
    pattern:
      /binding for "([^"]+)" must import its obligation object from the manifest/,
    cause: (match) =>
      `The binding for "${match[1]}" made its own copy of an obligation instead of importing the real one.`,
    fix: "Import the obligation from the set's obligations files and pass that object to the binding.",
    skill: 'change-the-journey'
  },
  {
    id: 'example-stopped',
    title: 'An example could not get through a page',
    pattern:
      /Example '([^']+)' stopped at ([^\s:]+)(?:: the page said '([^']*)')?|The example '([^']*)' stopped at '([^']+)'|Seeding the (\S+) set failed at "([^"]+)"/,
    cause: (match) => {
      const page = match[2] ?? match[5] ?? match[7]
      const said = match[3] ? ` The page said: '${match[3]}'.` : ''
      return `An example notification could not get past the '${page}' page, usually because a required question changed.${said}`
    },
    fix: "Update the example's answers for that page (the set's flow/fixtures/happy-path.json, or its example scenario) so it passes the page. Then press Reset on the chooser.",
    skill: 'example-data'
  },
  {
    id: 'port-in-use',
    title: 'The port is already in use',
    pattern:
      /EADDRINUSE[^\n]*?:(\d+)|http:\/\/localhost:(\d+)\/\S* is already used/,
    cause: (match) =>
      `Something is already running on port ${match[1] ?? match[2]}. It is probably the prototype, or the real plants service, started earlier.`,
    fix: 'Use the copy that is already running, or stop it first. Ask before stopping anything you did not start yourself.',
    skill: 'run-the-prototype'
  },
  {
    id: 'browser-missing',
    title: 'The test browser is not installed',
    pattern: /Executable doesn't exist at[^\n]*/,
    cause:
      'The browser the checks drive (Playwright Chromium) is not installed.',
    fix: 'Run `npm run playwright:install` once, then run the check again.',
    skill: 'run-the-prototype'
  },
  {
    id: 'no-set-context',
    title: 'Code ran outside its set',
    pattern: /No set context[^\n]*?(\d+) sets are mounted[^\n]*/,
    cause: (match) =>
      `Some code tried to work out which set it belongs to outside a page request, while ${match[1]} sets are mounted.`,
    fix: 'This is usually a call at the top of a file, which runs when the file loads, instead of inside a controller function. Move it inside the function. If it happens in a file you did not change, tell the maintainer.',
    skill: 'change-the-journey'
  },
  {
    id: 'set-not-configured',
    title: 'A set is missing part of its set-up',
    pattern:
      /mounted without configuring[^\n]*|mounted without its journey cookies[^\n]*|not configured for set "[^"]+"/,
    cause:
      'A set started without one of the pieces every set must set up in its routes file.',
    fix: 'Compare src/server/app/routes-<your set>.js with routes-high-risk-plants.js and put back what is missing. new:set writes this file: do not edit it by hand.',
    skill: 'design-release'
  },
  {
    id: 'set-not-mounted',
    title: 'A set is not on the chooser',
    pattern: /have a folder but are not mounted[^\n]*/,
    cause: 'A set has a folder but the prototype does not load it.',
    fix: 'Make design releases with `npm run new:set`, which mounts them. To mount one by hand, copy the lines for another set in src/server/prototype-sets/index.js.',
    skill: 'design-release'
  },
  {
    id: 'page-does-not-open',
    title: 'A page does not open',
    pattern:
      /release-render:[^\n]*|showed the error page \(\d+\)[^\n]*|sent the visitor outside the set[^\n]*/,
    cause: 'A page in the set does not open, or shows the error page.',
    fix: "If you added a page, register its controller routes in the set's features index.js as well as flow.js (the add-a-page recipe shows how). If a page shows the error page, its template or controller has a mistake: the log shows the error just before this line.",
    skill: 'change-the-journey'
  },
  {
    id: 'template',
    title: 'A page template has a mistake',
    pattern:
      /njk-check:[^\n]*|Template render error[^\n]*|template not found[^\n]*|unknown block tag[^\n]*|expected block end[^\n]*/i,
    cause:
      'A page template (.njk) has a mistake, or includes a file that does not exist.',
    fix: 'Open the template named in the log at the line shown. Check that every {% %} tag is closed and every include, import or extends path is spelt correctly.',
    skill: 'match-the-design'
  },
  {
    id: 'webpack-404',
    title: 'Styles or scripts are missing',
    pattern:
      /response 404: \S*\/public\/\S*|Webpack assets-manifest\.json not found|Module not found: Error: Can't resolve[^\n]*/,
    cause:
      "The prototype's styles or scripts were not built, or a page asks for one that does not exist.",
    fix: 'Run `npm run build:frontend` (npm run dev does this for you). Never add webpack entries or client scripts: if a page needs one, log it in design-gaps.md and tell the maintainer.',
    skill: 'run-the-prototype'
  },
  {
    id: 'frozen-release',
    title: 'A frozen release was changed',
    pattern: /frozen-release: ([a-z0-9-]+) was frozen in ([0-9a-f]+)[^\n]*/,
    cause: (match) =>
      `${match[1]} was frozen in ${match[2]}, so nothing in it may change, but some of its files did.`,
    fix: 'Undo the edits to the frozen release (say "undo that" and name the files), then make the change in a working release made from it. To have a change in a frozen release, carry it in before you freeze.',
    skill: 'design-release'
  },
  {
    id: 'lint',
    title: 'A code rule is broken',
    generic: true,
    pattern:
      /✖ \d+ problems? \(\d+ errors?[^\n]*|^\s*\d+:\d+\s+error\s+[^\n]*/m,
    cause:
      'A code rule was broken, for example an unused name, a missing import, a repeated piece of text or a very long function.',
    fix: 'Say "fix the lint errors" and Claude will read each rule named under "Where" and fix it. Many are fixed by `npm run lint:js:fix`. A rule about a long or complicated function (sonarjs/cognitive-complexity, sonarjs/cyclomatic-complexity) means splitting the code you added into a small helper function in the same file.',
    skill: 'check-my-change',
    where: (text) => eslintProblems(text)
  },
  {
    id: 'failing-test',
    title: 'A test failed',
    generic: true,
    pattern: /FAIL\s+(\S+\.test\.js)[^\n]*/,
    cause: (match) => `A test failed: ${match[1]}.`,
    fix: 'Read the lines under FAIL in the log. If the test belongs to the real journey (high-risk-plants), your change probably altered words or behaviour it pins: make the change in your design release instead.',
    skill: 'check-my-change'
  }
]

/** What the check says about a failure no signature matches. */
export const UNKNOWN = {
  id: 'unknown',
  title: 'Something the check does not recognise',
  cause:
    'Something failed that this check does not have a plain explanation for yet.',
  fix: 'Open the log file named below and read the first error. Or say "what does this error mean" and paste the lines.',
  skill: 'check-my-change'
}

const textOf = (value, match) =>
  typeof value === 'function' ? value(match) : value

const MAX_WHERE = 8
const ESLINT_FILE = /^(?:\/|[A-Za-z]:\\)\S+\.[cm]?js$/
const ESLINT_PROBLEM = /^\s+(\d+):\d+\s+error\s+(.+?)\s{2,}(\S+)\s*$/

const repoPathOf = (absolute) => {
  const named = filesNamedIn(absolute.replaceAll('\\', '/'))
  return named[0] ?? absolute
}

/**
 * Every ESLint error in stylish output, as "file:line rule: message", with
 * the file repo-relative. At most the first eight.
 */
export const eslintProblems = (text) => {
  const problems = []
  let file = null
  for (const line of String(text).split('\n')) {
    if (ESLINT_FILE.test(line.trim())) {
      file = repoPathOf(line.trim())
      continue
    }
    const problem = ESLINT_PROBLEM.exec(line)
    if (problem && file) {
      problems.push(`${file}:${problem[1]} ${problem[3]}: ${problem[2]}`)
    }
  }
  return problems.slice(0, MAX_WHERE)
}

const lineRangeAround = (output, index) => {
  const start = output.lastIndexOf('\n', index) + 1
  const lines = output.slice(start).split('\n')
  return lines.slice(0, EVIDENCE_LINES).join('\n')
}

const setIdOf = (repoPath) =>
  SET_PATH.exec(repoPath)?.[1] ?? ROUTES_PATH.exec(repoPath)?.[1]

/** Repo-relative files named in a piece of output. */
export const filesNamedIn = (text) =>
  text
    .split('\n')
    .filter((line) => !DEPENDENCY_PATH.test(line))
    .flatMap((line) => [...line.matchAll(REPO_FILE)].map((match) => match[1]))
    .filter((file, index, all) => all.indexOf(file) === index)

/**
 * Whether a failure is the designer's own: 'yours' when it names a file they
 * changed (or a file in a set they changed), 'not-yours' when every file it
 * names is one they did not touch, or when they changed nothing at all, and
 * 'unclear' when it names no file.
 */
export const attribute = (evidence, changedPaths) => {
  if (changedPaths.length === 0) {
    return 'not-yours'
  }
  const changedSets = new Set(changedPaths.map(setIdOf).filter(Boolean))
  const touched = (file) =>
    changedPaths.includes(file) || changedSets.has(setIdOf(file))
  const files = filesNamedIn(evidence)
  if (files.length > 0) {
    return files.some(touched) ? 'yours' : 'not-yours'
  }
  const namesChangedSet = [...changedSets].some((setId) =>
    new RegExp(`\\b${setId}\\b`).test(evidence)
  )
  return namesChangedSet ? 'yours' : 'unclear'
}

const findingFrom = (signature, match, output, changedPaths) => {
  const evidence = lineRangeAround(output, match.index)
  return {
    id: signature.id,
    title: signature.title,
    cause: textOf(signature.cause, match),
    fix: textOf(signature.fix, match),
    skill: signature.skill,
    evidence: evidence.trim(),
    files: filesNamedIn(evidence),
    where: signature.where ? signature.where(output) : [],
    attribution: attribute(signature.where ? output : evidence, changedPaths)
  }
}

/**
 * Translates one step's failure output into plain-English findings.
 *
 * @param {string} output - everything the failing step printed.
 * @param {{changedPaths?: string[]}} [options] - the paths the designer has
 * changed (from git status), for attribution.
 * @returns {object[]} one finding per matching signature, or a single
 * 'unknown' finding when nothing matched.
 */
export const translate = (output, { changedPaths = [] } = {}) => {
  const text = String(output ?? '')
  const matched = SIGNATURES.map((signature) => ({
    signature,
    match: signature.pattern.exec(text)
  })).filter(({ match }) => match)

  const specific = matched.filter(({ signature }) => !signature.generic)
  const chosen = specific.length > 0 ? specific : matched
  if (chosen.length === 0) {
    return [
      {
        ...UNKNOWN,
        evidence: text.trim().split('\n').slice(0, EVIDENCE_LINES).join('\n'),
        files: filesNamedIn(text),
        attribution: attribute(text, changedPaths)
      }
    ]
  }
  return chosen.map(({ signature, match }) =>
    findingFrom(signature, match, text, changedPaths)
  )
}

/** The sentence shown under a finding that the designer did not cause. */
export const NOT_YOURS =
  'Not caused by your change: tell the maintainer. It still has to be fixed before anything can be saved.'
