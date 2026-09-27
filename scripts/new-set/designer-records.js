import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RECORDS_IMPORT =
  "import { records } from './services/persistence/records/index.js'"
const CONFIGURE_RECORDS = 'configureRecords(SET_ID, records)'
const WRAPPED = 'designerRecords('

/**
 * Where the prototype's records wrapper (the fake-a-service deliverable) may
 * live, and how a gateway in `src/server/app/` imports it from there. The
 * second place is its fallback if the first is refused by the architecture
 * checks.
 */
const CANDIDATES = [
  {
    file: 'src/server/prototype-services/records/index.js',
    specifier: '../prototype-services/records/index.js'
  },
  {
    file: 'src/server/app/prototype-services/records/index.js',
    specifier: './prototype-services/records/index.js'
  }
]

const wrapperIn = (repoRoot) =>
  CANDIDATES.find(({ file }) => {
    const path = join(repoRoot, file)
    return (
      existsSync(path) &&
      /export\s+(?:const|function|async function)\s+designerRecords\b/.test(
        readFileSync(path, 'utf8')
      )
    )
  })

/**
 * Wraps a design release's records store in `designerRecords`, so its
 * dashboard gets the prototype's filters and counts and, in development,
 * keeps its data across a restart.
 *
 * @returns {'injected' | 'already' | 'unavailable'} what happened: the
 *   gateway already wraps it (a copy of a release), or the wrapper is not in
 *   this checkout (the release then uses the plain stub store).
 */
export const injectDesignerRecords = (routesFilePath, { repoRoot }) => {
  const content = readFileSync(routesFilePath, 'utf8')
  if (content.includes(WRAPPED)) {
    return 'already'
  }
  const wrapper = wrapperIn(repoRoot)
  if (
    !wrapper ||
    !content.includes(RECORDS_IMPORT) ||
    !content.includes(CONFIGURE_RECORDS)
  ) {
    return 'unavailable'
  }
  writeFileSync(
    routesFilePath,
    content
      .replace(
        RECORDS_IMPORT,
        `${RECORDS_IMPORT}\nimport { designerRecords } from '${wrapper.specifier}'`
      )
      .replace(
        CONFIGURE_RECORDS,
        'configureRecords(SET_ID, designerRecords(SET_ID, records))'
      )
  )
  return 'injected'
}
