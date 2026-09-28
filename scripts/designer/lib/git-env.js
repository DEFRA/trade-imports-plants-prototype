/**
 * The environment every designer `git` call runs with: the caller's, minus
 * the `GIT_*` variables.
 *
 * Inside a hook git exports `GIT_INDEX_FILE` (and sometimes `GIT_DIR` and
 * `GIT_WORK_TREE`). A pathspec commit (`git commit -- <paths>` or
 * `git commit --only`) points `GIT_INDEX_FILE` at a temporary
 * `.git/next-index-NNNN.lock`. The pre-commit hook runs the unit tests, and
 * any git they start in a throwaway repo would inherit that variable and
 * fail with "Unable to create .../next-index-NNNN.lock.lock". Every git call
 * names its repo with `cwd`, so dropping the variables is always safe.
 */
import process from 'node:process'

export const gitEnv = (env = process.env) =>
  Object.fromEntries(
    Object.entries(env).filter(([name]) => !name.startsWith('GIT_'))
  )
