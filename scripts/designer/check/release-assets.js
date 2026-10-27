/**
 * The "Release styles and scripts" checks for one set. A design release may
 * carry its own Sass and scripts in `assets/`, loaded by its own
 * `layout.njk`, and each pattern there is recorded in `patterns.md`. These
 * checks keep that inside the release: recorded, prefixed, off the shared
 * chrome and away from the real service's own files.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { fileAt, matchesAt, pathsChangedSince, revParse } from '../lib/git.js'
import {
  ASSETS_DIR,
  listFieldOf,
  MANDATES_FILE,
  PATTERNS_FILE,
  readMandates,
  readPatterns,
  RELEASE_LAYOUT
} from '../lib/release-records.js'
import { SETS_DIR, releaseInfo, setDir } from '../lib/sets.js'
import {
  mandateHistoryProblems,
  patternEntryProblems
} from './release-entries.js'
import { classifyLoad, componentKey } from './release-loads.js'
import { readReleaseSass } from './release-sass.js'
import { readReleaseScript } from './release-scripts.js'

const problem = (file, message) => ({ file, message })

const toRepoPath = (root, file) =>
  path.relative(root, file).split(path.sep).join('/')

const filesUnder = (folder) =>
  existsSync(folder)
    ? readdirSync(folder, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
        .map((entry) => path.join(entry.parentPath, entry.name))
        .sort((first, second) => first.localeCompare(second))
    : []

const tokensIn = (text) => [
  ...new Set(
    [...text.matchAll(/(?<![\w$-])app-[a-z0-9][a-z0-9_-]*/g)].map(([token]) =>
      token.replace(/[-_]+$/, '')
    )
  )
]

const isTestFile = (file) => file.endsWith('.test.js')

/** The real service's own `app-*` names, which a release may always use. */
const realServiceNames = (root) => {
  const sources = [
    ['src/client/stylesheets', '.scss'],
    ['src/client/javascripts', '.js'],
    [`${SETS_DIR}/high-risk-plants`, '.njk'],
    ['src/server/app/shared', '.njk'],
    ['src/server/common/components', '.njk']
  ]
  return new Set(
    sources.flatMap(([folder, extension]) =>
      filesUnder(path.join(root, folder))
        .filter((file) => file.endsWith(extension))
        .flatMap((file) => tokensIn(readFileSync(file, 'utf8')))
    )
  )
}

const coveredBy = (names, token) =>
  names.has(token) ||
  [...names].some(
    (name) => token.startsWith(`${name}__`) || token.startsWith(`${name}--`)
  )

const releaseContext = (setId, { root, since, changedPaths, branch }) => {
  const setFolder = setDir(setId, { root })
  const setRepoDir = `${SETS_DIR}/${setId}`
  const assetsDir = path.join(setFolder, ASSETS_DIR)
  const scanned = new Set(['.njk', '.scss', '.js'])
  const files = filesUnder(setFolder).map((file) => ({
    file,
    repoPath: toRepoPath(root, file),
    text: scanned.has(path.extname(file)) ? readFileSync(file, 'utf8') : ''
  }))
  return {
    setId,
    root,
    since,
    changedPaths,
    branch,
    setFolder,
    setRepoDir,
    assetsDir,
    classPrefix: `app-${setId}-`,
    files,
    assets: files.filter(({ file }) =>
      file.startsWith(`${assetsDir}${path.sep}`)
    ),
    patterns: readPatterns(setFolder),
    mandates: readMandates(setFolder),
    realNames: realServiceNames(root),
    isRelease: releaseInfo(setId, { root })?.kind === 'release'
  }
}

const assetName = (context, file) =>
  path.relative(context.assetsDir, file).split(path.sep).join('/')

const listedFiles = (patterns) =>
  new Set(
    patterns.flatMap((entry) =>
      listFieldOf(entry, 'Files').map((file) =>
        file.replace(/^`|`$/g, '').replace(/^assets\//, '')
      )
    )
  )

const assetFileProblems = (context) => {
  const listed = listedFiles(context.patterns)
  const names = new Set(
    context.assets.map(({ file }) => assetName(context, file))
  )
  return context.assets.flatMap(({ file, repoPath, text }) => {
    const name = assetName(context, file)
    if (!['.scss', '.js'].includes(path.extname(name))) {
      return [
        problem(
          repoPath,
          `Your release's assets hold only Sass and script files. Move ${name} out.`
        )
      ]
    }
    if (isTestFile(name)) {
      return []
    }
    const found = []
    if (!listed.has(name)) {
      found.push(
        problem(
          repoPath,
          `Add assets/${name} to the Files line of its pattern in ${PATTERNS_FILE}, so everyone can see why it exists.`
        )
      )
    }
    const testName = name.replace(/\.js$/, '.test.js')
    const needsTest =
      name.endsWith('.js') &&
      (name !== 'scripts.js' || !readReleaseScript(text).onlySwitchesOn)
    if (needsTest && !names.has(testName)) {
      found.push(
        problem(
          repoPath,
          `Add assets/${testName} showing the page works without the script, and that the script attaches to it.`
        )
      )
    }
    return found
  })
}

const loadProblems = (context, { file, repoPath }, loads, language) =>
  loads
    .filter(
      (loaded) =>
        classifyLoad(loaded, {
          fromFile: file,
          assetsDir: context.assetsDir,
          language
        }).kind === 'outside'
    )
    .map((loaded) =>
      problem(
        repoPath,
        `It loads "${loaded}". Your release's styles and scripts can use only GOV.UK Frontend, MoJ Frontend and files in your release's assets folder. Copy what you need into assets/ instead: src/client belongs to the real service.`
      )
    )

const CHROME_FIX =
  'The header, service navigation, phase banner and footer are shared by every set. Log the change you want in design-gaps.md instead.'

const sassFileProblems = (context, asset) => {
  const read = readReleaseSass(asset.text, { classPrefix: context.classPrefix })
  return [
    ...loadProblems(context, asset, read.loads, 'sass'),
    ...read.strayRules.map((selector) =>
      problem(
        asset.repoPath,
        `The rule "${selector}" could style pages beyond your pattern. Start each rule with an ${context.classPrefix} class, so it only styles your pattern.`
      )
    ),
    ...read.rawColours.map((value) =>
      problem(
        asset.repoPath,
        `"${value}" writes a colour by hand. Use govuk-colour() or a GOV.UK functional colour, such as govuk-functional-colour(text).`
      )
    ),
    ...read.chromeSelectors.map((selector) =>
      problem(
        asset.repoPath,
        `"${selector}" styles the shared chrome. ${CHROME_FIX}`
      )
    )
  ]
}

const scriptFileProblems = (context, asset) => {
  const read = readReleaseScript(asset.text)
  if (read.parseError) {
    return [
      problem(
        asset.repoPath,
        `It could not be read: ${read.parseError}. Fix the typing slip at the line shown.`
      )
    ]
  }
  return [
    ...loadProblems(context, asset, read.imports, 'script'),
    ...(read.switchesOnAll
      ? [
          problem(
            asset.repoPath,
            'It imports initAll, which switches on every component at once. Switch each component on with createAll, so each one is recorded.'
          )
        ]
      : []),
    ...(read.namesChrome
      ? [
          problem(
            asset.repoPath,
            `It names a shared-chrome class. ${CHROME_FIX}`
          )
        ]
      : [])
  ]
}

const sassOutsideAssets = (context) =>
  context.files
    .filter(
      ({ file }) =>
        file.endsWith('.scss') &&
        !file.startsWith(`${context.assetsDir}${path.sep}`)
    )
    .map(({ repoPath }) =>
      problem(
        repoPath,
        `Nothing loads Sass from here. Move it into ${context.setRepoDir}/${ASSETS_DIR}/.`
      )
    )

const switchedOnComponents = (context) =>
  context.assets.flatMap((asset) => {
    if (isTestFile(asset.file)) {
      return []
    }
    if (asset.file.endsWith('.js')) {
      return readReleaseScript(asset.text).components
    }
    if (!asset.file.endsWith('.scss')) {
      return []
    }
    return readReleaseSass(asset.text, { classPrefix: context.classPrefix })
      .loads.map(
        (loaded) =>
          classifyLoad(loaded, {
            fromFile: asset.file,
            assetsDir: context.assetsDir,
            language: 'sass'
          }).component
      )
      .filter(Boolean)
  })

const recordedComponents = (patterns) =>
  new Set(
    patterns
      .filter((entry) => listFieldOf(entry, 'Kind').includes('Switch on'))
      .flatMap((entry) => listFieldOf(entry, 'Components'))
      .map((written) => /^(govuk|moj)\s+(.+)$/i.exec(written))
      .filter(Boolean)
      .map(([, library, name]) => componentKey(library, name))
  )

const componentProblems = (context) => {
  const recorded = recordedComponents(context.patterns)
  return [...new Set(switchedOnComponents(context))]
    .filter((component) => !recorded.has(component))
    .map((component) =>
      problem(
        `${context.setRepoDir}/${PATTERNS_FILE}`,
        `Your release switches on ${component}. Add it to the Components line of a Switch on entry in ${PATTERNS_FILE}.`
      )
    )
}

const listedClasses = (patterns) =>
  new Set(
    patterns.flatMap((entry) =>
      (entry.fields.Classes ?? []).flatMap((line) => tokensIn(line))
    )
  )

const classProblems = (context) => {
  const listed = listedClasses(context.patterns)
  return context.files.flatMap(({ repoPath, text }) =>
    tokensIn(text)
      .filter((token) => !coveredBy(context.realNames, token))
      .flatMap((token) => {
        if (!token.startsWith(context.classPrefix)) {
          return [
            problem(
              repoPath,
              `Rename ${token} to ${context.classPrefix}<name>, so it cannot clash with the real service.`
            )
          ]
        }
        return coveredBy(listed, token)
          ? []
          : [
              problem(
                repoPath,
                `Add ${token} to the Classes line of its pattern in ${PATTERNS_FILE}.`
              )
            ]
      })
  )
}

const EXTENDS = /{%-?\s*extends\s+["']([^"']+)["']/g

const layoutProblems = (context) => {
  const layout = context.files.find(
    ({ repoPath }) => repoPath === `${context.setRepoDir}/${RELEASE_LAYOUT}`
  )
  if (!layout) {
    return []
  }
  const allowedBlocks = new Set(['head', 'bodyEnd'])
  const layoutFix =
    'Your release layout can only add your styles and script. The header and footer stay shared.'
  const extended = [...layout.text.matchAll(EXTENDS)].map(([, name]) => name)
  const blocks = [
    ...layout.text.matchAll(
      /{%-?\s*block\s+(\w+)\s*-?%}([\s\S]*?){%-?\s*endblock/g
    )
  ]
  const found = []
  if (extended.length !== 1 || extended[0] !== 'shared/layout.njk') {
    found.push(`It must extend "shared/layout.njk". ${layoutFix}`)
  }
  for (const [, name, body] of blocks) {
    if (!allowedBlocks.has(name)) {
      found.push(`It changes the "${name}" block. ${layoutFix}`)
    } else if (!body.includes('super()')) {
      found.push(
        `Its "${name}" block leaves out {{ super() }}, which keeps what every page already loads. ${layoutFix}`
      )
    }
  }
  return found.map((message) => problem(layout.repoPath, message))
}

const templateProblems = (context) => {
  const inline = [
    [/<style[\s>]/i, 'an inline <style> element'],
    [/<script(?![^>]*\ssrc\s*=)[^>]*>/i, 'an inline <script> element'],
    [/\sstyle\s*=/i, 'a style attribute']
  ]
  const layoutRepoPath = `${context.setRepoDir}/${RELEASE_LAYOUT}`
  const knownLayouts = new Set([
    'shared/layout.njk',
    `${context.setId}/${RELEASE_LAYOUT}`
  ])
  return context.files
    .filter(({ repoPath }) => repoPath.endsWith('.njk'))
    .flatMap(({ repoPath, text }) => [
      ...inline
        .filter(([pattern]) => pattern.test(text))
        .map(([, what]) =>
          problem(
            repoPath,
            `It has ${what}. The security settings block inline styles and scripts. Put them in your release's assets instead.`
          )
        ),
      ...(repoPath === layoutRepoPath
        ? []
        : [...text.matchAll(EXTENDS)]
            .map(([, name]) => name)
            .filter((name) => !knownLayouts.has(name))
            .map((name) =>
              problem(
                repoPath,
                `It extends "${name}". Extend shared/layout.njk, or your release's own ${context.setId}/${RELEASE_LAYOUT}.`
              )
            ))
    ])
}

const sharedFileProblems = (context) => {
  const maintainerBranch = /^(?:chore|handoff)\//
  if (!context.isRelease || maintainerBranch.test(context.branch ?? '')) {
    return []
  }
  const sharedFiles = [
    [/^src\/client\//, 'styles and scripts every set loads'],
    [/^webpack\.config\.js$/, 'the build every set uses'],
    [
      /^src\/server\/app\/shared\/layout\.njk$/,
      'the header, navigation and footer'
    ]
  ]
  return context.changedPaths.flatMap((repoPath) =>
    sharedFiles
      .filter(([pattern]) => pattern.test(repoPath))
      .map(([, what]) =>
        problem(
          repoPath,
          `It belongs to the real service and holds ${what}. Undo the change, then put your release's own styles and scripts in ${context.setRepoDir}/${ASSETS_DIR}/, or log what you need in design-gaps.md.`
        )
      )
  )
}

const noNewPatternProblems = (context) => {
  const patternFiles = [
    `${ASSETS_DIR}/`,
    RELEASE_LAYOUT,
    PATTERNS_FILE,
    MANDATES_FILE
  ]
  const noMandateFix =
    'This run has no designer’s mandate, so it cannot add a pattern. Build the nearest option and log a design gap.'
  const options = { root: context.root }
  const changed = pathsChangedSince(context.since, context.setRepoDir, options)
  const touchedPatternFiles = changed.filter((repoPath) => {
    const inSet = repoPath.slice(context.setRepoDir.length + 1)
    return patternFiles.some((name) =>
      name.endsWith('/') ? inSet.startsWith(name) : inSet === name
    )
  })
  const before = new Set(
    matchesAt(
      context.since,
      'app-[a-z0-9][a-z0-9_-]*',
      context.setRepoDir,
      options
    )
  )
  const changedNow = new Set(changed)
  const newTokens = context.files
    .filter(({ repoPath }) => changedNow.has(repoPath))
    .flatMap(({ repoPath, text }) =>
      tokensIn(text)
        .filter(
          (token) => !before.has(token) && !coveredBy(context.realNames, token)
        )
        .map((token) => ({ repoPath, token }))
    )
  return [
    ...touchedPatternFiles.map((repoPath) =>
      problem(repoPath, `It changed. ${noMandateFix}`)
    ),
    ...newTokens.map(({ repoPath, token }) =>
      problem(repoPath, `It adds the class ${token}. ${noMandateFix}`)
    )
  ]
}

const historyBase = (context) =>
  revParse(context.since ?? 'HEAD', { root: context.root })

const mandateProblems = (context) => {
  const base = historyBase(context)
  if (!base) {
    return []
  }
  const earlier = fileAt(base, `${context.setRepoDir}/${MANDATES_FILE}`, {
    root: context.root
  })
  return mandateHistoryProblems(earlier, context.mandates, context)
}

/**
 * Runs every release-assets check on one set.
 *
 * @param {string} setId - the set to check.
 * @param {object} options
 * @param {string} options.root - the repo root.
 * @param {string[]} [options.changedPaths] - what git status lists.
 * @param {string|null} [options.branch] - the branch checked out.
 * @param {string} [options.since] - a commit to compare with: mandates.md
 * must only have grown since it (HEAD when not given).
 * @param {boolean} [options.noNewPatterns] - refuse, with `since`, any
 * change since that commit to the release's assets, layout, patterns or
 * mandates, and any new `app-` class.
 * @returns {{ problems: Array<{ file: string, message: string }>, patterns: number, assets: number }}
 */
export const checkReleaseAssets = (
  setId,
  { root, changedPaths = [], branch = null, since, noNewPatterns = false }
) => {
  const refused = (message) => ({
    problems: [problem('--since', message)],
    patterns: 0,
    assets: 0
  })
  if (noNewPatterns && !since) {
    return refused(
      'Refusing new patterns needs the commit the run started from. Add --since <commit>.'
    )
  }
  if (since && !revParse(since, { root })) {
    return refused(
      `There is no commit "${since}". Pass the commit this run started from.`
    )
  }
  const context = releaseContext(setId, { root, since, changedPaths, branch })
  const problems = [
    ...assetFileProblems(context),
    ...context.assets
      .filter(({ file }) => file.endsWith('.scss'))
      .flatMap((asset) => sassFileProblems(context, asset)),
    ...context.assets
      .filter(({ file }) => file.endsWith('.js') && !isTestFile(file))
      .flatMap((asset) => scriptFileProblems(context, asset)),
    ...sassOutsideAssets(context),
    ...componentProblems(context),
    ...patternEntryProblems(context.patterns, context.mandates, context),
    ...mandateProblems(context),
    ...classProblems(context),
    ...layoutProblems(context),
    ...templateProblems(context),
    ...sharedFileProblems(context),
    ...(noNewPatterns ? noNewPatternProblems(context) : [])
  ]
  return {
    problems,
    patterns: context.patterns.length,
    assets: context.assets.length
  }
}
