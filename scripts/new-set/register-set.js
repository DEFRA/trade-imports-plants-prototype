import { readFileSync, writeFileSync } from 'node:fs'
import { camelCase, screamingSnakeCase } from './names.js'

const IMPORT_ANCHOR = "import { setsIndex } from '../sets-index/index.js'"
const REGISTER_ANCHOR = 'await server.register([setsIndex, adoptKnownJourneys])'

/**
 * Mounts a scaffolded set into `prototype-sets/index.js` — never `router.js`,
 * which stays a merge-safe single-line hook onto plants-frontend (see
 * PROTOTYPE.md). Both anchors are prototype-owned lines this file is expected
 * to carry; a missing one means the file has moved and the scaffold cannot
 * safely guess where to mount the new set.
 */
export const registerSet = (prototypeSetsIndexPath, { setId }) => {
  const pluginName = camelCase(setId)
  const baseConst = `${screamingSnakeCase(setId)}_BASE`
  const content = readFileSync(prototypeSetsIndexPath, 'utf8')

  if (!content.includes(IMPORT_ANCHOR) || !content.includes(REGISTER_ANCHOR)) {
    throw new Error(
      'prototype-sets/index.js has moved — new:set could not find where to mount the new set. Mount it by hand.'
    )
  }

  const importLines =
    `import { ${pluginName} } from '../app/routes-${setId}.js'\n` +
    `import { SET_BASE as ${baseConst} } from '../app/sets/${setId}/set.js'\n`
  const registerLines =
    `      await server.register(${pluginName}, {\n` +
    `        routes: { prefix: ${baseConst} }\n` +
    `      })\n      `

  const withImport = content.replace(IMPORT_ANCHOR, importLines + IMPORT_ANCHOR)
  const withRegister = withImport.replace(
    REGISTER_ANCHOR,
    registerLines + REGISTER_ANCHOR
  )
  writeFileSync(prototypeSetsIndexPath, withRegister)
}
