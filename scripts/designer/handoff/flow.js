/**
 * The journey facts a story needs beyond the patch: the page order before and
 * after the change (read with the same logic as `designer:release orders`),
 * the gate and condition lines that changed, and one row per validation rule
 * on the changed pages, with its English and Welsh error.
 *
 * Everything but `readJourneyFlow` is a pure function over strings.
 */
import { readOrders } from '../release/orders.js'
import { copyLeaves } from './copy-table.js'

const REAL_JOURNEY = 'high-risk-plants'
const MAX_GATE_LINES = 12

const code = (text) => `{{${text}}}`

const markChanged = (list, changed) =>
  list.length
    ? list.map((slug) => (changed.has(slug) ? code(slug) : slug)).join(' > ')
    : '(none)'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const touches = (lists, changed) =>
  lists.some((list) => list.some((slug) => changed.has(slug)))

const byId = (items) => new Map((items ?? []).map((item) => [item.id, item]))

const groupPages = (group) => group.rows.flatMap((row) => row.pages)

/**
 * The order rows that differ, or that hold a changed page: the first pass,
 * each Continue section and each task list group. `before` is null when it is
 * not known (a release made from the placeholder, or the real journey itself).
 *
 * @param {object|null} before - `readOrders` for the real journey.
 * @param {object} after - `readOrders` for the release.
 * @param {string[]} changedSlugs - the changed pages' addresses.
 * `moved` is true when the order differs, false when it is the same, and null
 * when the order before is not known.
 *
 * @returns {{ order: string, before: string, after: string, moved: boolean|null }[]}
 */
export const flowRows = (before, after, changedSlugs) => {
  const changed = new Set(changedSlugs)
  const unknown = '(not known)'
  const rows = []
  const add = (order, beforeList, afterList) => {
    const lists = [beforeList ?? [], afterList ?? []]
    const moved = before ? !same(beforeList, afterList) : null
    if (moved || touches(lists, changed)) {
      rows.push({
        order,
        before: beforeList ? markChanged(beforeList, changed) : unknown,
        after: afterList ? markChanged(afterList, changed) : '(removed)',
        moved
      })
    }
  }
  add(
    'First pass, a new notification',
    before ? before.firstPass : null,
    after.firstPass
  )
  const beforeSections = byId(before?.sections)
  const afterSections = byId(after.sections)
  for (const id of new Set([
    ...afterSections.keys(),
    ...beforeSections.keys()
  ])) {
    add(
      `Continue, section ${id}`,
      before ? (beforeSections.get(id)?.pages ?? []) : null,
      afterSections.get(id)?.pages ?? null
    )
  }
  const beforeGroups = byId(before?.groups)
  const afterGroups = byId(after.groups)
  for (const id of new Set([...afterGroups.keys(), ...beforeGroups.keys()])) {
    const was = beforeGroups.get(id)
    const now = afterGroups.get(id)
    add(
      `Task list group ${id}`,
      before ? (was ? groupPages(was) : []) : null,
      now ? groupPages(now) : null
    )
  }
  return rows
}

const GATE_FILE = /\/obligations\/|\/journeys\/linear\/flow\//
const GATE_WORDS =
  /gate|applyTo|requires|within|scope|when|skip|condition|status:|RUN_STEPS|pages:/i

const COMMENT_LINE = /^(\/\/|\/\*|\*)/

const lineSet = (text) =>
  new Set(
    (text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !COMMENT_LINE.test(line))
  )

/**
 * The lines about gates, conditions and page order that a change adds or
 * removes in the obligation model or the flow files.
 *
 * @param {{ path: string, before: string|null, after: string|null }[]} changes
 * @returns {{ file: string, added: string[], removed: string[] }[]}
 */
export const gateChangesOf = (changes) =>
  changes
    .filter((change) => GATE_FILE.test(change.path))
    .filter((change) => !/\.(test|fit\.spec)\.js$/.test(change.path))
    .map((change) => {
      const before = lineSet(change.before)
      const after = lineSet(change.after)
      const pick = (from, other) =>
        [...from]
          .filter((line) => !other.has(line) && GATE_WORDS.test(line))
          .slice(0, MAX_GATE_LINES)
      return {
        file: change.path,
        added: pick(after, before),
        removed: pick(before, after)
      }
    })
    .filter((row) => row.added.length || row.removed.length)

/** The validator factories in `src/server/app/lib/validate/`. */
const VALIDATORS = [
  'requiredText',
  'requiredExactDigits',
  'optionalText',
  'maxText',
  'requiredMaxText',
  'requiredEmail',
  'pattern',
  'postcode',
  'vehicleReg',
  'ukPhone',
  'oneOf',
  'requiredOneOf',
  'integerInRange',
  'requiredIntegerInRange',
  'dateParts',
  'dateText',
  'dateTextInRange',
  'requiredDateText',
  'requiredDateTextInRange',
  'requiredTime'
]

/** The rule a factory checks when it takes one message. */
const FACTORY_RULE = {
  requiredText: 'Must be answered',
  optionalText: 'Optional',
  maxText: 'Must not be too long',
  pattern: 'Must be in the expected format',
  postcode: 'Must be a real postcode',
  vehicleReg: 'Must be a vehicle registration',
  ukPhone: 'Must be a UK phone number',
  oneOf: 'If answered, must be one of the options',
  requiredOneOf: 'Must be answered with one of the options',
  integerInRange: 'Must be a whole number in the allowed range',
  dateParts: 'Must be a real date',
  dateText: 'Must be a real date'
}

/** The rule behind each named message (`messages: { required, … }`). */
const MESSAGE_RULE = {
  required: 'Must be answered',
  invalid: 'Must be real and in the right form',
  invalidMessage: 'Must be real and in the right form',
  range: 'Must be within the allowed range',
  rangeMessage: 'Must be within the allowed range',
  maxLength: 'Must not be too long',
  format: 'Must be in the right format',
  length: 'Must be the right number of digits',
  digitsOnly: 'Must be digits only',
  message: 'Must be a whole number in the allowed range'
}

const COPY_REF = /^copy((?:\.[A-Za-z_$][\w$]*)+)$/
const STRING = /^(['"`])([\s\S]*)\1$/

/** The text between a call's brackets, from the `(` at `open`. */
const callArguments = (source, open) => {
  let depth = 0
  let quote = null
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (char === '\\') {
        index += 1
      } else if (char === quote) {
        quote = null
      }
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char
    } else if ('([{'.includes(char)) {
      depth += 1
    } else if (')]}'.includes(char)) {
      depth -= 1
      if (depth === 0) {
        return source.slice(open + 1, index)
      }
    }
  }
  return null
}

/** Splits an argument list at its top-level commas. */
const splitTopLevel = (text) => {
  const parts = []
  let depth = 0
  let quote = null
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (char === '\\') {
        index += 1
      } else if (char === quote) {
        quote = null
      }
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char
    } else if ('([{'.includes(char)) {
      depth += 1
    } else if (')]}'.includes(char)) {
      depth -= 1
    } else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, index).trim())
      start = index + 1
    }
  }
  parts.push(text.slice(start).trim())
  return parts.filter(Boolean)
}

/** `export const NAME = 'value'` and `const NAME = 'value'`, as a map. */
export const stringConstantsIn = (sources) => {
  const constants = {}
  for (const source of sources) {
    for (const match of source.matchAll(
      /(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])([^'"\n]*)\2/g
    )) {
      constants[match[1]] = match[3]
    }
  }
  return constants
}

const fieldName = (argument, constants) => {
  const literal = STRING.exec(argument ?? '')
  if (literal) {
    return literal[2]
  }
  return constants[argument] ?? argument ?? '(unknown)'
}

/** A message expression as `{ key }` (a copy leaf) or `{ text }` (a literal). */
const messageOf = (expression) => {
  const trimmed = expression.trim()
  const copyRef = COPY_REF.exec(trimmed)
  if (copyRef) {
    return { key: copyRef[1].slice(1) }
  }
  const literal = STRING.exec(trimmed)
  if (literal) {
    return { text: literal[2] }
  }
  return null
}

const namedMessages = (argumentText) =>
  [
    ...argumentText.matchAll(
      /\b(required|invalid|invalidMessage|range|rangeMessage|maxLength|format|length|digitsOnly|message)\s*:\s*(copy(?:\.[A-Za-z_$][\w$]*)+|'[^'\n]*'|"[^"\n]*")/g
    )
  ].map((match) => ({ name: match[1], message: messageOf(match[2]) }))

/**
 * Every validation rule a page's code sets up with the `lib/validate`
 * factories: one entry per field and message, with the message as a copy key
 * (`errors.arrivalDate.required`) or as literal text.
 *
 * @param {string[]} sources - the page's JavaScript files, not its copy.
 * @returns {{ field: string, rule: string, key?: string, text?: string }[]}
 */
export const validationCallsIn = (sources) => {
  const constants = stringConstantsIn(sources)
  const calls = []
  const pattern = new RegExp(`\\b(${VALIDATORS.join('|')})\\s*\\(`, 'g')
  for (const source of sources) {
    for (const match of source.matchAll(pattern)) {
      const argumentText = callArguments(
        source,
        match.index + match[0].length - 1
      )
      if (argumentText !== null) {
        const [first, ...rest] = splitTopLevel(argumentText)
        const field = fieldName(first, constants)
        const named = namedMessages(rest.join(','))
        if (named.length) {
          named
            .filter((item) => item.message)
            .forEach((item) =>
              calls.push({
                field,
                rule: MESSAGE_RULE[item.name],
                ...item.message
              })
            )
        } else {
          const message = rest.map(messageOf).find(Boolean)
          calls.push({
            field,
            rule: FACTORY_RULE[match[1]] ?? 'Checked when the page is sent',
            ...(message ?? {})
          })
        }
      }
    }
  }
  return calls
}

const showMessage = (call, leaves) => {
  if (call.key) {
    return leaves?.[call.key] ?? `(no words at ${call.key})`
  }
  return call.text ?? '(set in code)'
}

/**
 * One row per validation rule on one page: the field, the rule, and the
 * English and Welsh error. Any other `errors.*` words in the page's copy (a
 * check the page makes in its own code) get a row too, so no error message is
 * missed.
 *
 * @param {{ page: string, sources: string[], en: string|null, cy: string|null }} feature
 * @returns {{ page: string, field: string, rule: string, english: string, welsh: string }[]}
 */
export const validationRowsFor = ({ page, sources, en, cy }) => {
  const english = copyLeaves(en) ?? {}
  const welsh = copyLeaves(cy) ?? {}
  const calls = validationCallsIn(sources)
  const used = new Set(calls.map((call) => call.key).filter(Boolean))
  const rows = calls.map((call) => ({
    page,
    key: call.key ?? null,
    field: call.field,
    rule: call.rule,
    english: String(showMessage(call, english)),
    welsh: call.key
      ? String(showMessage(call, welsh))
      : '(the same words, set in code: not translated)'
  }))
  for (const key of Object.keys(english)) {
    if (key.startsWith('errors.') && !used.has(key)) {
      rows.push({
        page,
        key,
        field: key.split('.')[1],
        rule: 'Checked in the page’s own code',
        english: String(english[key]),
        welsh: String(welsh[key] ?? '(no Welsh)')
      })
    }
  }
  return rows
}

/**
 * The page order before and after, read from the sets on disk. Returns
 * `{ rows, before, error }`; a set whose flow cannot be loaded gives an error
 * in place of rows, and the brief says so.
 */
export const readJourneyFlow = async (root, report, read = readOrders) => {
  const changedSlugs = report.pages.flatMap((page) => page.slugs)
  const knowsBefore = report.mode === 'release' && !report.placeholder
  try {
    const after = await read(report.set, { repoRoot: root })
    const before = knowsBefore
      ? await read(REAL_JOURNEY, { repoRoot: root })
      : null
    return {
      rows: flowRows(before, after, changedSlugs),
      before: knowsBefore ? 'the real journey (high-risk-plants) now' : null,
      error: null
    }
  } catch (error) {
    return {
      rows: [],
      before: null,
      error: String(error.message).split('\n')[0]
    }
  }
}
