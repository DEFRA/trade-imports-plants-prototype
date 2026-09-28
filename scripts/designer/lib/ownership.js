/**
 * Whose file is this? The answer comes from the sync robot's own rules
 * (scripts/sync-upstream/rules.js and overrides.json), so it can never
 * disagree with what the weekly update actually does.
 *
 * - yours: in overrides.json `ours`. The weekly update never touches it.
 * - shared-on-purpose: named in overrides.json `patched`. The prototype
 *   changed it deliberately and says why.
 * - real-service: everything else. It belongs to plants-frontend and the
 *   weekly update merges upstream's changes into it.
 * - removed: in overrides.json `deleted`. The weekly update deletes it.
 */
import { classifyPath, matchesAnyGlob } from '../../sync-upstream/rules.js'
import { REPO_ROOT, readOverrides, toRepoPath } from './repo.js'
import { releaseInfo, setOfPath } from './sets.js'

export const OWNERS = Object.freeze({
  yours: 'yours',
  sharedOnPurpose: 'shared-on-purpose',
  realService: 'real-service',
  removed: 'removed'
})

export const SENTENCES = Object.freeze({
  yours: 'Yours: safe to change. The weekly update never touches it.',
  'shared-on-purpose':
    'Shared with the real service and changed on purpose here: change with care, and say why in overrides.json.',
  'real-service':
    'Belongs to the real service: the weekly update will clash with your change. Make it in your design release, or hand it to the real team.',
  removed: 'Removed by the weekly update: never edit.',
  frozen: 'This is a frozen release. Start a working release from it instead.',
  outside: 'Outside this prototype: the weekly update does not cover it.'
})

const ownerFromOverrides = (repoPath, overrides) => {
  const rule = classifyPath(repoPath, overrides)
  if (rule === 'deleted') {
    return OWNERS.removed
  }
  if (rule === 'ours') {
    return OWNERS.yours
  }
  const declaredPatched = overrides.patched.map((entry) => entry.path)
  return matchesAnyGlob(declaredPatched, repoPath)
    ? OWNERS.sharedOnPurpose
    : OWNERS.realService
}

/**
 * Who owns `filePath`: 'yours', 'shared-on-purpose', 'real-service' or
 * 'removed'. Pass `overrides` to classify against a parsed overrides.json
 * other than the one on disk, and `cwd` to resolve a relative path from
 * somewhere other than the repo root. Returns null for a path outside the
 * repo.
 */
export const ownerOf = (
  filePath,
  { root = REPO_ROOT, cwd = root, overrides = readOverrides({ root }) } = {}
) => {
  const repoPath = toRepoPath(filePath, { root, cwd })
  return repoPath ? ownerFromOverrides(repoPath, overrides) : null
}

/**
 * Everything the designer scripts need to know about one path:
 * `{ path, owner, setId, isRelease, frozen, sentence }`. `path` is
 * repo-relative (null outside the repo), `setId` is the set it sits in (or
 * null), `isRelease` is true for a design release (not the real journey or
 * the placeholder) and `frozen` for a frozen one. `sentence` is the plain
 * English verdict the designer sees.
 */
export const ownershipOf = (
  filePath,
  { root = REPO_ROOT, cwd = root, overrides = readOverrides({ root }) } = {}
) => {
  const repoPath = toRepoPath(filePath, { root, cwd })
  if (!repoPath) {
    return {
      path: null,
      input: filePath,
      owner: null,
      setId: null,
      isRelease: false,
      frozen: false,
      sentence: SENTENCES.outside
    }
  }
  const owner = ownerFromOverrides(repoPath, overrides)
  const setId = setOfPath(repoPath, { root })
  const info = setId ? releaseInfo(setId, { root }) : null
  const isRelease = info?.kind === 'release'
  const frozen = isRelease && info.frozen === true
  return {
    path: repoPath,
    input: filePath,
    owner,
    setId,
    isRelease,
    frozen,
    sentence: frozen ? SENTENCES.frozen : SENTENCES[owner]
  }
}

/**
 * One plain sentence saying whose file this is and the safe thing to do,
 * for example "Belongs to the real service: … Make it in your design
 * release, or hand it to the real team."
 */
export const explainOwner = (filePath, options) =>
  ownershipOf(filePath, options).sentence
