import { randomUUID } from 'node:crypto'
import { camelCase, sentenceCase } from './names.js'

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

const replaceAll = (content, from, to) =>
  from ? content.split(from).join(to) : content

/**
 * A copied template file's content, rewritten from the template set's id to
 * the new one — every shape the id appears in: the kebab-case id itself (a
 * path fragment, `SET_ID`'s literal), its camelCase form (a cookie name, an
 * exported plugin binding) and its sentence-case form (the placeholder
 * page's heading and body).
 *
 * Every obligation id the template declares is also replaced with a freshly
 * generated one, so two sets scaffolded from the same template never share
 * an obligation id.
 */
export const transformContent = (content, { fromId, newId }) => {
  const rewritten = replaceAll(
    replaceAll(
      replaceAll(content, fromId, newId),
      camelCase(fromId),
      camelCase(newId)
    ),
    sentenceCase(fromId),
    sentenceCase(newId)
  )
  return rewritten.replace(UUID_PATTERN, () => randomUUID())
}

/** A copied template path — a directory or file name — rewritten the same
 * way, but only ever needs the kebab-case id: nothing in a path is ever
 * camelCase or sentence case. */
export const transformPath = (path, { fromId, newId }) =>
  replaceAll(path, fromId, newId)
