/**
 * Lists the page components this prototype can really use, straight from what
 * is installed and wired up, so the match-the-design skill never offers a
 * component that renders unstyled or never starts its script.
 *
 * For every component it records: the macro and its import line, whether the
 * component's script is started in src/client/javascripts/application.js,
 * whether its styles are loaded by src/client/stylesheets/application.scss,
 * and a set template that already uses it.
 *
 * Run from the repo root:
 *   node .claude/skills/match-the-design/scripts/components-we-have.js
 *     prints the inventory
 *   node .claude/skills/match-the-design/scripts/components-we-have.js --write
 *     replaces the generated part of references/components-we-have.md
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const LIBRARIES = Object.freeze([
  {
    id: 'govuk',
    title: 'GOV.UK Frontend',
    packageName: 'govuk-frontend',
    componentsDir: 'node_modules/govuk-frontend/dist/govuk/components',
    importPrefix: 'govuk/components',
    wholeStylesheet: 'govuk-frontend'
  },
  {
    id: 'moj',
    title: 'MoJ Frontend',
    packageName: '@ministryofjustice/frontend',
    componentsDir: 'node_modules/@ministryofjustice/frontend/moj/components',
    importPrefix: 'moj/components',
    wholeStylesheet: '@ministryofjustice/frontend'
  },
  {
    id: 'app',
    title: "This prototype's own",
    packageName: null,
    componentsDir: 'src/server/common/components',
    importPrefix: '',
    wholeStylesheet: null
  }
])

export const CLIENT_ENTRY = 'src/client/javascripts/application.js'
export const STYLES_ENTRY = 'src/client/stylesheets/application.scss'
export const SETS_DIR = 'src/server/app/sets'
export const EXTRA_PACKAGES = Object.freeze(['accessible-autocomplete'])
export const GENERATED_START = '<!-- components-we-have:start -->'
export const GENERATED_END = '<!-- components-we-have:end -->'

const MACRO_PATTERN = /\{%-?\s*macro\s+([A-Za-z]\w*)\s*\(/
const IMPORT_PATTERN = /\{%-?\s*from\s+"[^"]+"\s+import\s+([^%]+?)\s*-?%\}/g
const CREATE_ALL_PATTERN = /createAll\(\s*([A-Za-z]\w*)\s*\)/g
const USE_PATTERN = /@use\s+"([^"]+)"/g

const readText = (root, relativePath) => {
  const file = path.join(root, relativePath)
  return existsSync(file) ? readFileSync(file, 'utf8') : ''
}

/** 'character-count' -> 'CharacterCount', the class name a script exports. */
export const pascalCase = (folder) =>
  folder
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

/** The installed version of a package, or null when it is not installed. */
export const installedVersion = (root, packageName) => {
  const text = readText(root, `node_modules/${packageName}/package.json`)
  if (!text) {
    return null
  }
  return JSON.parse(text).version ?? null
}

/** Every class name passed to createAll() in the client entry. */
export const startedScripts = (root) =>
  new Set(
    [...readText(root, CLIENT_ENTRY).matchAll(CREATE_ALL_PATTERN)].map(
      (match) => match[1]
    )
  )

/** Every module the stylesheet entry pulls in with @use. */
export const loadedStylesheets = (root) =>
  [...readText(root, STYLES_ENTRY).matchAll(USE_PATTERN)].map(
    (match) => match[1]
  )

const isStyled = (library, folder, stylesheets) => {
  if (library.id === 'app') {
    return true
  }
  return stylesheets.some(
    (used) =>
      used === library.wholeStylesheet ||
      used.includes(`/components/${folder}/`) ||
      used.endsWith(`/components/${folder}`)
  )
}

const listFiles = (dir, extension) => {
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Macro name -> the set templates that import it, as repo-relative paths in
 * alphabetical order.
 */
export const macroUsage = (root) => {
  const usage = new Map()
  for (const file of listFiles(path.join(root, SETS_DIR), '.njk')) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(IMPORT_PATTERN)) {
      for (const name of match[1].split(',').map((part) => part.trim())) {
        const files = usage.get(name) ?? []
        files.push(path.relative(root, file).split(path.sep).join('/'))
        usage.set(name, files)
      }
    }
  }
  return usage
}

const componentFolders = (root, library) => {
  const dir = path.join(root, library.componentsDir)
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

const macroOf = (root, library, folder) => {
  const text = readText(root, `${library.componentsDir}/${folder}/macro.njk`)
  return MACRO_PATTERN.exec(text)?.[1] ?? null
}

const importPathOf = (library, folder) =>
  library.importPrefix
    ? `${library.importPrefix}/${folder}/macro.njk`
    : `${folder}/macro.njk`

const scriptStateOf = (root, library, folder, started) => {
  const script = `${library.componentsDir}/${folder}/${folder}.mjs`
  const clientScript = `src/client/javascripts/components/${folder}.js`
  const hasScript =
    library.id === 'app'
      ? existsSync(path.join(root, clientScript))
      : existsSync(path.join(root, script))
  if (!hasScript) {
    return 'none'
  }
  return started.has(pascalCase(folder)) ? 'started' : 'not-started'
}

/**
 * Everything the reference needs, read from the repo at `root`.
 *
 * @param {string} root - the repo root.
 * @returns {{ versions: object, libraries: Array<object> }}
 */
export const readInventory = (root) => {
  const started = startedScripts(root)
  const stylesheets = loadedStylesheets(root)
  const usage = macroUsage(root)
  const versions = {}
  for (const packageName of [
    ...LIBRARIES.map((library) => library.packageName).filter(Boolean),
    ...EXTRA_PACKAGES
  ]) {
    versions[packageName] = installedVersion(root, packageName)
  }
  const libraries = LIBRARIES.map((library) => ({
    id: library.id,
    title: library.title,
    components: componentFolders(root, library)
      .map((folder) => ({ folder, macro: macroOf(root, library, folder) }))
      .filter(({ macro }) => macro !== null)
      .map(({ folder, macro }) => ({
        folder,
        macro,
        importLine: `{% from "${importPathOf(library, folder)}" import ${macro} %}`,
        script: scriptStateOf(root, library, folder, started),
        styled: isStyled(library, folder, stylesheets),
        usedIn: usage.get(macro) ?? []
      }))
  }))
  return { versions, libraries }
}

const SCRIPT_WORDS = {
  none: 'No script needed',
  started: 'Script started',
  'not-started': 'Script NOT started'
}

const usedInWords = (files) => {
  if (files.length === 0) {
    return 'Not used in any set yet'
  }
  const more = files.length - 1
  return more > 0
    ? `Used in \`${files[0]}\` and ${more} more`
    : `Used in \`${files[0]}\``
}

/** One markdown bullet per component. */
export const renderComponent = (component) =>
  [
    `- \`${component.macro}\`: ${SCRIPT_WORDS[component.script]}.`,
    component.styled ? '' : ' Styles NOT loaded.',
    ` ${usedInWords(component.usedIn)}.`,
    `\n  \`${component.importLine}\``
  ].join('')

const versionLine = (versions) =>
  `Installed: ${Object.entries(versions)
    .map(([name, version]) => `${name} ${version ?? 'not installed'}`)
    .join(', ')}.`

/** The generated part of references/components-we-have.md. */
export const renderInventory = (inventory) =>
  [
    versionLine(inventory.versions),
    ...inventory.libraries.flatMap((library) => [
      '',
      `### ${library.title}`,
      '',
      ...library.components.map(renderComponent)
    ])
  ].join('\n')

/**
 * Replaces the text between the generated markers of `document` with
 * `generated`. Throws when either marker is missing, so a hand edit that
 * removed one is noticed rather than overwritten.
 */
export const replaceGenerated = (document, generated) => {
  const start = document.indexOf(GENERATED_START)
  const end = document.indexOf(GENERATED_END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Could not find the ${GENERATED_START} and ${GENERATED_END} markers`
    )
  }
  return [
    document.slice(0, start + GENERATED_START.length),
    '\n\n',
    generated,
    '\n\n',
    document.slice(end)
  ].join('')
}

export const REFERENCE_FILE =
  '.claude/skills/match-the-design/references/components-we-have.md'

/** Runs the command and returns the text to print. */
export const run = (argv, { root = process.cwd() } = {}) => {
  const generated = renderInventory(readInventory(root))
  if (!argv.includes('--write')) {
    return generated
  }
  const file = path.join(root, REFERENCE_FILE)
  writeFileSync(file, replaceGenerated(readFileSync(file, 'utf8'), generated))
  return `Updated ${REFERENCE_FILE}.`
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(run(process.argv.slice(2)))
}
