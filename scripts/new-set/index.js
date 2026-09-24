import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { parseArgs } from './cli.js'
import { isKebabCase } from './names.js'
import { copyRoutesFile, copySetTree } from './copy-set.js'
import { registerSet } from './register-set.js'
import { addOwnedPaths } from './update-overrides.js'

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')

const fail = (message) => {
  console.error(message)
  process.exitCode = 1
}

const nextSteps = (setId) =>
  [
    '',
    'Next steps:',
    '  1. Run `npm run format` — the new mount in prototype-sets/index.js is not prettier-formatted yet.',
    '  2. Run `npm test` and `npm run test:fit` — the new set should boot and appear on the chooser at /.',
    `  3. Replace src/server/app/sets/${setId}/journeys/linear/features/welcome/ with the real journey.`,
    `  4. Give it a description in src/server/prototype-sets/descriptions.js — see PROTOTYPE.md.`
  ].join('\n')

/**
 * `npm run new:set -- <set-id> [--from <template-set-id>]` — scaffolds a new
 * prototype set from a template set (`sample-journey` by default), mounts it
 * via `prototype-sets/index.js` and marks its files as prototype-owned in
 * `overrides.json`. See PROTOTYPE.md for what to do with the result.
 */
export const run = (argv) => {
  const { setId, from } = parseArgs(argv)

  if (!setId) {
    fail('Usage: npm run new:set -- <set-id> [--from <template-set-id>]')
    return
  }
  if (!isKebabCase(setId)) {
    fail(
      `"${setId}" is not kebab-case — use lower-case words separated by hyphens, e.g. "citrus-fruit".`
    )
    return
  }

  const setsDir = path.join(REPO_ROOT, 'src/server/app/sets')
  const newSetDir = path.join(setsDir, setId)
  const templateDir = path.join(setsDir, from)
  const templateRoutesFile = path.join(
    REPO_ROOT,
    `src/server/app/routes-${from}.js`
  )
  const newRoutesFile = path.join(
    REPO_ROOT,
    `src/server/app/routes-${setId}.js`
  )

  if (existsSync(newSetDir)) {
    fail(
      `"${setId}" already exists at src/server/app/sets/${setId} — choose a different id.`
    )
    return
  }
  if (!existsSync(templateDir) || !existsSync(templateRoutesFile)) {
    fail(
      `No template set "${from}" found — expected src/server/app/sets/${from} and src/server/app/routes-${from}.js.`
    )
    return
  }

  copySetTree(templateDir, newSetDir, { fromId: from, newId: setId })
  copyRoutesFile(templateRoutesFile, newRoutesFile, {
    fromId: from,
    newId: setId
  })
  registerSet(path.join(REPO_ROOT, 'src/server/prototype-sets/index.js'), {
    setId
  })
  addOwnedPaths(path.join(REPO_ROOT, 'overrides.json'), [
    `src/server/app/sets/${setId}/**`,
    `src/server/app/routes-${setId}.js`
  ])

  console.log(`Scaffolded "${setId}" from "${from}".`)
  console.log(nextSteps(setId))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2))
}
