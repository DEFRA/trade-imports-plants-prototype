import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { parseArgs } from './cli.js'
import { isKebabCase, sentenceCase } from './names.js'
import {
  PLACEHOLDER_TEMPLATE,
  copyRoutesFile,
  copySetFiles,
  planCopy
} from './copy-set.js'
import { registerSet } from './register-set.js'
import { addOwnedPaths, ownedPathsOf } from './update-overrides.js'
import { addDescription } from './describe-set.js'
import { injectDesignerRecords } from './designer-records.js'
import {
  PURPOSES,
  currentCommit,
  placeholderDescription,
  readReleaseRecord,
  rootUuidMap,
  upstreamCommitOf,
  writeReleaseRecord
} from './release-record.js'

export const REPO_ROOT = path.resolve(
  fileURLToPath(import.meta.url),
  '../../..'
)

/** Ids that would sit on top of a path the prototype host already serves. */
const RESERVED_IDS = new Set(['auth', 'examples', 'health', 'public', 'reset'])

const USAGE =
  'Usage: npm run new:set -- <set-id> [--from <set-id>] [--describe "<one line for the chooser>"] [--title "<its name on the chooser>"] [--purpose working|frozen|research]'

/** A refusal whose message is written for the person who ran the command. */
export class ScaffoldRefused extends Error {}

export const pathsFor = (repoRoot, setId) => ({
  setDir: path.join(repoRoot, 'src/server/app/sets', setId),
  routesFile: path.join(repoRoot, `src/server/app/routes-${setId}.js`)
})

const validate = ({ setId, from, purpose }, repoRoot) => {
  if (!setId || setId.startsWith('--')) {
    throw new ScaffoldRefused(USAGE)
  }
  if (!isKebabCase(setId)) {
    throw new ScaffoldRefused(
      `"${setId}" is not kebab-case — use lower-case words separated by hyphens, e.g. "plants-dr2".`
    )
  }
  if (RESERVED_IDS.has(setId)) {
    throw new ScaffoldRefused(
      `"${setId}" is already a path the prototype uses — choose a different id, e.g. "plants-${setId}".`
    )
  }
  if (!PURPOSES.includes(purpose)) {
    throw new ScaffoldRefused(
      `"${purpose}" is not a purpose — use one of: ${PURPOSES.join(', ')}.`
    )
  }
  const target = pathsFor(repoRoot, setId)
  if (existsSync(target.setDir)) {
    throw new ScaffoldRefused(
      `"${setId}" already exists at src/server/app/sets/${setId} — choose a different id.`
    )
  }
  const template = pathsFor(repoRoot, from)
  if (!existsSync(template.setDir) || !existsSync(template.routesFile)) {
    throw new ScaffoldRefused(
      `No set "${from}" to copy — expected src/server/app/sets/${from} and src/server/app/routes-${from}.js.`
    )
  }
}

const writeDocsPointer = (setDir, { setId, root }) => {
  mkdirSync(path.join(setDir, 'docs'), { recursive: true })
  writeFileSync(
    path.join(setDir, 'docs/README.md'),
    `How to change this release's pages: follow the recipes in \`src/server/app/sets/${root}/docs/\`, using \`${setId}\` wherever they say \`${root}\`.\n`
  )
}

/**
 * Makes a new set — a design release when copied from the real journey or
 * from another release — mounts it, marks its files as the prototype's in
 * `overrides.json`, describes it on the chooser and records where it came
 * from in `sets/<id>/release.json`.
 *
 * A copy of the real journey leaves out the journey's own tests, browser
 * specs, docs and requirement digests (see `copy-set.js#planCopy`).
 *
 * @returns {{ setId: string, from: string, skipped: Array<{ path: string, reason: string }>, release: object, records: string }}
 */
export const scaffoldSet = (
  { setId, from, describe, title, purpose },
  { repoRoot = REPO_ROOT, now = new Date() } = {}
) => {
  validate({ setId, from, purpose }, repoRoot)

  const template = pathsFor(repoRoot, from)
  const target = pathsFor(repoRoot, setId)
  const templateRecord = readReleaseRecord(template.setDir)
  const root = templateRecord?.root ?? from
  const createdAt = now.toISOString()
  const uuidMap = new Map()

  const { keep, skipped } = planCopy(template.setDir, {
    fromId: from,
    routesFile: template.routesFile,
    purpose
  })
  copySetFiles(template.setDir, target.setDir, keep, {
    fromId: from,
    newId: setId,
    uuidMap
  })
  copyRoutesFile(template.routesFile, target.routesFile, {
    fromId: from,
    newId: setId,
    uuidMap
  })

  const isRelease = from !== PLACEHOLDER_TEMPLATE
  if (isRelease) {
    writeDocsPointer(target.setDir, { setId, root })
  }
  const records = isRelease
    ? injectDesignerRecords(target.routesFile, { repoRoot })
    : 'unavailable'

  registerSet(path.join(repoRoot, 'src/server/prototype-sets/index.js'), {
    setId
  })
  addOwnedPaths(path.join(repoRoot, 'overrides.json'), ownedPathsOf(setId))

  const description = describe ?? placeholderDescription(from, createdAt)
  addDescription(
    path.join(repoRoot, 'src/server/prototype-sets/descriptions.js'),
    { setId, text: description }
  )

  const release = {
    id: setId,
    from,
    root,
    fromCommit: currentCommit(repoRoot),
    upstreamCommit: upstreamCommitOf(repoRoot),
    createdAt,
    purpose,
    frozen: purpose === 'frozen',
    description,
    ...(title ? { title } : {}),
    uuidMap: rootUuidMap(uuidMap, templateRecord)
  }
  writeReleaseRecord(target.setDir, release)

  return { setId, from, skipped, release, records }
}

const skippedSummary = (skipped) => {
  if (skipped.length === 0) {
    return []
  }
  const counts = Object.groupBy(skipped, ({ reason }) => reason)
  const lines = Object.entries(counts).map(
    ([reason, files]) =>
      `  - ${reason}: ${files.length} ${files.length === 1 ? 'file' : 'files'}`
  )
  const testOnly = (counts['used only by tests'] ?? []).map(
    ({ path: file }) => `      ${file}`
  )
  return [
    '',
    'Left out of the copy (the real journey keeps them):',
    ...lines,
    ...(testOnly.length ? ['    Used only by tests:', ...testOnly] : [])
  ]
}

const nextSteps = ({ setId, from }) => {
  const url = `http://localhost:3103/${setId}`
  const steps = [
    'Run `npm run designer:format` to tidy the new lines in src/server/prototype-sets/.',
    `Start the prototype with \`npm run dev\` and open ${url}`,
    `If its example notifications are missing, sign in, open http://localhost:3103/ and press "Reset this prototype’s data" under ${sentenceCase(setId)}.`,
    `See every page with \`npm run designer:show -- --set ${setId} --pages all\`.`
  ]
  if (from === PLACEHOLDER_TEMPLATE) {
    steps.push(
      `Replace src/server/app/sets/${setId}/journeys/linear/features/welcome/ with your journey.`
    )
  }
  return [
    '',
    'Next steps:',
    ...steps.map((step, index) => `  ${index + 1}. ${step}`)
  ]
}

/**
 * `npm run new:set -- <set-id> [--from <set-id>] [--describe "<text>"]
 * [--purpose working|frozen|research]`. See PROTOTYPE.md and
 * docs/designers/design-releases.md for what to do with the result.
 */
export const run = (argv, options) => {
  try {
    const result = scaffoldSet(parseArgs(argv), options)
    console.log(
      `Made "${result.setId}" from "${result.from}": everything in src/server/app/sets/${result.setId}/ is yours.`
    )
    console.log(
      [...skippedSummary(result.skipped), ...nextSteps(result)].join('\n')
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2))
}
