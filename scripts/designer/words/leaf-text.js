/** The marker a Welsh string carries until a translator supplies the Welsh. */
export const WELSH_NEEDED = '[Welsh needed]'

const BACKTICK = '`'
const CURLY_APOSTROPHES = /[‘’]/g
const CURLY_QUOTES = /[“”]/g

const isTemplateLiteral = (body) =>
  body.startsWith(BACKTICK) && body.endsWith(BACKTICK)

/**
 * The words a copy leaf shows. A string is itself. A function (copy that
 * takes values, like a day count) is shown as the body of its template, with
 * the `${…}` placeholders left in so a reader can see where values go.
 */
export const leafText = (value) => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value !== 'function') {
    return ''
  }
  const source = String(value)
  const arrow = source.indexOf('=>')
  const body = (arrow === -1 ? source : source.slice(arrow + 2)).trim()
  return isTemplateLiteral(body) ? body.slice(1, -1) : body
}

/**
 * Where a Welsh leaf stands against its English leaf:
 * - 'missing': there is no Welsh leaf at this key
 * - 'marked': it carries the [Welsh needed] marker
 * - 'same-as-english': it is byte-identical to the English, so nobody
 *   translated it
 * - 'translated': anything else
 */
export const welshStatus = (en, cy) => {
  if (cy === undefined || cy === null) {
    return 'missing'
  }
  const cyText = leafText(cy)
  if (cyText.includes(WELSH_NEEDED)) {
    return 'marked'
  }
  return cyText === leafText(en) ? 'same-as-english' : 'translated'
}

/** Lower case, with curly apostrophes and quotes made straight, for matching. */
export const normalise = (text) => {
  const lower = String(text).toLowerCase()
  return lower.replace(CURLY_APOSTROPHES, "'").replace(CURLY_QUOTES, '"')
}

export const containsText = (haystack, needle) =>
  normalise(haystack).includes(normalise(needle))

const childOf = (node, key) =>
  node !== null && typeof node === 'object' ? node[key] : undefined

const keysOf = (keyPath) => keyPath.split('.')

/** The value at a dotted key path inside a nested copy object. */
export const valueAt = (node, keyPath) => keysOf(keyPath).reduce(childOf, node)
