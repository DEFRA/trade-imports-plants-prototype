/**
 * The facts about this prototype that more than one designer tool needs:
 * its GitHub repository, where it is deployed (null until it is), the real
 * service it mirrors, and where hand-offs go. They live once, in
 * scripts/designer/prototype.json, so a new deployed address is one edit.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { REPO_ROOT } from './repo.js'

export const PROTOTYPE_CONFIG_PATH = 'scripts/designer/prototype.json'

const EMPTY = Object.freeze({
  repository: null,
  cloneUrl: null,
  deployedUrl: null,
  realService: {},
  handOff: {},
  maintainer: null
})

/**
 * The prototype's facts, with every key present. A missing or unreadable
 * file answers the empty shape, so a tool never fails over it.
 */
export const readPrototypeConfig = ({ root = REPO_ROOT } = {}) => {
  const file = path.join(root, PROTOTYPE_CONFIG_PATH)
  if (!existsSync(file)) {
    return { ...EMPTY }
  }
  try {
    return { ...EMPTY, ...JSON.parse(readFileSync(file, 'utf8')) }
  } catch {
    return { ...EMPTY }
  }
}
