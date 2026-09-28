/**
 * Compiles every Nunjucks template in a set, and checks that every file a
 * template extends, includes or imports by name exists, using the same search
 * paths as src/config/nunjucks/nunjucks.js. A typing slip in a `{% %}` tag or
 * a misspelt include path is reported with the file and line, without
 * starting the server.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import nunjucks from 'nunjucks'

/** The folders the prototype's Nunjucks environment looks in, in order. */
export const templateSearchPaths = (root) => [
  path.join(root, 'node_modules/govuk-frontend/dist'),
  path.join(root, 'node_modules/@ministryofjustice/frontend'),
  path.join(root, 'src/server/common/components'),
  path.join(root, 'src/server/app'),
  path.join(root, 'src/server/app/sets')
]

const REFERENCE =
  /{%-?\s*(?:extends|include|import|from)\s+["']([^"']+)["']([^%]*)%}/g

/** The same options the prototype's own environment uses. */
const createEnvironment = () =>
  new nunjucks.Environment([], {
    autoescape: true,
    trimBlocks: true,
    lstripBlocks: true
  })

const toRepoPath = (root, file) =>
  path.relative(root, file).split(path.sep).join('/')

/** Every .njk file under a folder, sorted. */
export const templatesOf = (folder) =>
  readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.njk'))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort((first, second) => first.localeCompare(second))

const resolves = (name, file, searchPaths) => {
  if (name.startsWith('./') || name.startsWith('../')) {
    return existsSync(path.resolve(path.dirname(file), name))
  }
  return searchPaths.some((folder) => existsSync(path.join(folder, name)))
}

const compileProblem = (source, file, environment) => {
  try {
    // The fourth argument compiles now rather than on first render, so a
    // broken tag fails here.
    // eslint-disable-next-line no-new
    new nunjucks.Template(source, environment, file, true)
    return undefined
  } catch (error) {
    return error.message
      .replace('Template render error: ', '')
      .replace(`(${file})`, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

const missingReferences = (source, file, searchPaths) =>
  [...source.matchAll(REFERENCE)]
    .filter(([, , rest]) => !rest.includes('ignore missing'))
    .map(([, name]) => name)
    .filter((name) => !resolves(name, file, searchPaths))

/**
 * @param {string} file - an absolute .njk path.
 * @param {{root: string, environment?: object}} options - the repo root.
 * @returns {string[]} plain problems, each starting with the repo path.
 */
export const checkTemplate = (
  file,
  { root, environment = createEnvironment() }
) => {
  const source = readFileSync(file, 'utf8')
  const where = toRepoPath(root, file)
  const compileError = compileProblem(source, file, environment)
  const missing = missingReferences(source, file, templateSearchPaths(root))
  return [
    ...(compileError ? [`${where}: ${compileError}`] : []),
    ...missing.map(
      (name) =>
        `${where}: it uses "${name}", which does not exist. Check the spelling of the path.`
    )
  ]
}

/**
 * Checks every template in a set folder.
 *
 * @returns {{templates: number, problems: string[]}}
 */
export const checkSetTemplates = (setFolder, { root }) => {
  const environment = createEnvironment()
  const files = templatesOf(setFolder)
  return {
    templates: files.length,
    problems: files.flatMap((file) =>
      checkTemplate(file, { root, environment })
    )
  }
}
