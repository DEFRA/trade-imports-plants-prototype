import { existsSync } from 'node:fs'
import path from 'node:path'
import { addDescription } from '../../new-set/describe-set.js'
import { pathsFor, scaffoldSet } from '../../new-set/index.js'
import { writeReleaseRecord } from '../../new-set/release-record.js'
import { ReleaseRefused, existingSet, refuseNonRelease } from './sets.js'

const DESCRIPTIONS_FILE = 'src/server/prototype-sets/descriptions.js'

/** The working release a freeze makes when not told what to call it. */
export const defaultWorkingId = (setId) => `${setId}-working`

/**
 * Freezes a design release — nobody changes it again, so it stays a stable
 * record of what was designed — and makes a new working release from it to
 * carry on in.
 *
 * The working release is made first: if its id is refused, nothing is
 * frozen. `frozenDescribe` and `frozenTitle` replace the frozen release's own
 * chooser line and name, the last chance to change them; `describe` and
 * `title` are the new working release's.
 *
 * @returns {{ frozen: string, working: string, alreadyFrozen: boolean, skipped: object[] }}
 */
export const freezeRelease = (
  setId,
  {
    as,
    describe,
    frozenDescribe,
    title,
    frozenTitle,
    repoRoot,
    now = new Date()
  }
) => {
  refuseNonRelease(setId, 'freeze')
  const release = existingSet(repoRoot, setId)
  if (!release.record) {
    throw new ReleaseRefused(
      `"${setId}" has no release record (release.json), so it was not made as a design release. Make a new release from it instead: npm run new:set -- <new-id> --from ${setId}`
    )
  }
  const working = as ?? defaultWorkingId(setId)
  if (existsSync(pathsFor(repoRoot, working).setDir)) {
    throw new ReleaseRefused(
      `"${working}" already exists. Choose a name for the new working release with --as <new-id>.`
    )
  }

  const { skipped } = scaffoldSet(
    { setId: working, from: setId, describe, title, purpose: 'working' },
    { repoRoot, now }
  )

  const alreadyFrozen = Boolean(release.record.frozen)
  if (!alreadyFrozen) {
    writeReleaseRecord(release.setDir, {
      ...release.record,
      ...(frozenDescribe ? { description: frozenDescribe } : {}),
      ...(frozenTitle ? { title: frozenTitle } : {}),
      purpose: 'frozen',
      frozen: true,
      frozenAt: now.toISOString()
    })
    if (frozenDescribe) {
      addDescription(path.join(repoRoot, DESCRIPTIONS_FILE), {
        setId,
        text: frozenDescribe
      })
    }
  }
  return { frozen: setId, working, alreadyFrozen, skipped }
}
