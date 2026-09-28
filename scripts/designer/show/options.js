/**
 * `npm run designer:show -- [options]`, parsed. No filesystem and no
 * process: argv in, `{ options, problems }` out, so every rule here is unit
 * tested. Each problem is one plain sentence a designer can act on.
 */

export const USAGE = [
  'Usage: npm run designer:show -- --set <set-id> [options]',
  '',
  'Options:',
  '  --pages changed|all|<pages>  which pages (default: changed). Name pages by',
  '                               their address, comma-separated, for example',
  '                               arrival-details,origin,dashboard. `chooser` is',
  '                               the list of sets at http://localhost:3103/',
  '  --url <address>              also picture any address in the set, as in the',
  '                               browser bar after the set name, for example',
  '                               "?status=submitted" (the dashboard, filtered),',
  '                               "notifications/{notification}/transporter-select/add"',
  '                               ({notification} is the one the pictures filled in)',
  '                               or "/" (starting with / means the whole prototype).',
  '                               Repeat it for more addresses',
  '  --examples <slugs>           also picture where each example link lands,',
  '                               comma-separated, for example submitted,amended',
  '  --each-example               picture a page once for every example that',
  '                               reaches it, so both sides of a question show',
  '  --no-examples                picture the dashboard empty (no example',
  '                               notifications), as a new user sees it',
  '  --before                     also show your last saved version (commit)',
  '  --before-commit <commit>     compare with that saved version instead of the',
  '                               last one, for example HEAD~1 after an undo',
  '  --errors                     also show each form with its error messages',
  '  --mobile                     also show each page at phone width (320px)',
  '  --reference <page>=<image>   put a Figma frame or screenshot beside a page',
  '                               (PNG, JPEG, GIF, WebP or SVG)',
  '  --compare <set-id>           put the same pages from another set beside yours',
  '  --video                      record a walkthrough of the whole journey',
  '  --open                       open the gallery in your browser when done',
  '  --help                       show this help'
].join('\n')

const FLAGS = Object.freeze({
  '--before': 'before',
  '--errors': 'errors',
  '--mobile': 'mobile',
  '--video': 'video',
  '--open': 'open',
  '--each-example': 'eachExample',
  '--help': 'help',
  '-h': 'help'
})

const NEGATED = Object.freeze({ '--no-examples': 'examples' })

const VALUE_OPTIONS = new Set([
  '--set',
  '--pages',
  '--reference',
  '--compare',
  '--url',
  '--examples',
  '--before-commit'
])

const PAGE_MODES = new Set(['changed', 'all'])

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')

/**
 * Turns `--pages` values into `{ mode, keys }`. `changed` and `all` are
 * modes; anything else is a list of page names. `changed` with names
 * (`changed,dashboard`) shows the changed pages and those pages too. Several
 * `--pages` options add up.
 */
export const parsePages = (values) => {
  if (values.length === 0) {
    return { mode: 'changed', keys: [] }
  }
  const items = values.flatMap(splitList)
  const modes = items.filter((item) => PAGE_MODES.has(item))
  if (modes.includes('all')) {
    return { mode: 'all', keys: [] }
  }
  const keys = [...new Set(items.filter((item) => !PAGE_MODES.has(item)))]
  if (keys.length === 0 || modes.includes('changed')) {
    return { mode: 'changed', keys }
  }
  return { mode: 'list', keys }
}

/** `arrival-details=designs/arrival.png` as `{ page, image }`, or null. */
export const parseReference = (value) => {
  const at = value.indexOf('=')
  if (at <= 0 || at === value.length - 1) {
    return null
  }
  return { page: value.slice(0, at).trim(), image: value.slice(at + 1).trim() }
}

const emptyOptions = () => ({
  set: null,
  pages: { mode: 'changed', keys: [] },
  before: false,
  beforeCommit: null,
  errors: false,
  mobile: false,
  video: false,
  open: false,
  help: false,
  eachExample: false,
  examples: true,
  compare: null,
  references: [],
  urls: [],
  exampleLinks: []
})

const readValue = (argv, index, name, problems) => {
  const inline = argv[index].includes('=') && argv[index].startsWith(`${name}=`)
  if (inline) {
    return { value: argv[index].slice(name.length + 1), consumed: 1 }
  }
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('--')) {
    problems.push(`${name} needs a value after it.`)
    return { value: null, consumed: 1 }
  }
  return { value, consumed: 2 }
}

const optionName = (arg) => {
  const name = arg.split('=')[0]
  return VALUE_OPTIONS.has(name) ? name : arg
}

const applyValue = (options, name, value, pageValues, problems) => {
  if (name === '--set') {
    options.set = value
  } else if (name === '--compare') {
    options.compare = value
  } else if (name === '--pages') {
    pageValues.push(value)
  } else if (name === '--url') {
    options.urls.push(value.trim())
  } else if (name === '--examples') {
    options.exampleLinks.push(...splitList(value))
  } else if (name === '--before-commit') {
    options.before = true
    options.beforeCommit = value.trim()
  } else {
    const reference = parseReference(value)
    if (reference) {
      options.references.push(reference)
    } else {
      problems.push(
        `--reference needs a page and an image, like --reference arrival-details=designs/arrival.png (got "${value}").`
      )
    }
  }
}

/**
 * Parses the arguments after `--`.
 *
 * @param {string[]} argv
 * @returns {{ options: object, problems: string[] }}
 */
export const parseShowArgs = (argv) => {
  const options = emptyOptions()
  const problems = []
  const pageValues = []
  let index = 0
  while (index < argv.length) {
    const arg = argv[index]
    const name = optionName(arg)
    if (FLAGS[arg]) {
      options[FLAGS[arg]] = true
      index += 1
    } else if (NEGATED[arg]) {
      options[NEGATED[arg]] = false
      index += 1
    } else if (VALUE_OPTIONS.has(name)) {
      const { value, consumed } = readValue(argv, index, name, problems)
      if (value !== null) {
        applyValue(options, name, value, pageValues, problems)
      }
      index += consumed
    } else if (arg.startsWith('-')) {
      problems.push(`"${arg}" is not an option designer:show knows.`)
      index += 1
    } else if (options.set === null) {
      options.set = arg
      index += 1
    } else {
      problems.push(`"${arg}" was not expected. Put page names after --pages.`)
      index += 1
    }
  }
  options.pages = parsePages(pageValues)
  if (options.compare !== null && options.compare === options.set) {
    problems.push('--compare needs a different set from --set.')
  }
  return { options, problems }
}
