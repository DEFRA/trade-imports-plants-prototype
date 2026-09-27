import { randomUUID } from 'node:crypto'
import { camelCase, sentenceCase } from './names.js'

export const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/**
 * Replaces `from` only where it stands as a name of its own: never inside a
 * longer word, so a short id like `plants-a` does not rewrite "Plants and".
 * A camelCase form may run straight into a capital (`sampleJourneyKnown…`),
 * so only a following lower-case letter or digit counts as the same word.
 */
const replaceWhole = (content, from, to) =>
  from
    ? content.replace(
        new RegExp(String.raw`(?<![A-Za-z0-9])${from}(?![a-z0-9])`, 'g'),
        () => to
      )
    : content

/**
 * Rewrites every shape a set id appears in — the kebab-case id itself (a path
 * fragment, `SET_ID`'s literal), its camelCase form (a cookie name, an
 * exported plugin binding) and its sentence-case form (the placeholder page's
 * heading and body). UUIDs are left alone.
 */
export const renameSetId = (content, { fromId, newId }) =>
  replaceWhole(
    replaceWhole(
      replaceWhole(content, fromId, newId),
      camelCase(fromId),
      camelCase(newId)
    ),
    sentenceCase(fromId),
    sentenceCase(newId)
  )

/**
 * A copied template file's content, rewritten from the template set's id to
 * the new one (see `renameSetId`).
 *
 * Every obligation id the template declares is also replaced with a freshly
 * generated one, so two sets scaffolded from the same template never share
 * an obligation id. Pass a `uuidMap` (a Map) to learn which old id became
 * which new one: the same old id then always becomes the same new id, across
 * every file that shares the map, and each pair is recorded in it.
 */
export const transformContent = (content, { fromId, newId, uuidMap }) =>
  renameSetId(content, { fromId, newId }).replace(UUID_PATTERN, (oldId) => {
    if (!uuidMap) {
      return randomUUID()
    }
    const key = oldId.toLowerCase()
    if (!uuidMap.has(key)) {
      uuidMap.set(key, randomUUID())
    }
    return uuidMap.get(key)
  })

/** A copied template path — a directory or file name — rewritten the same
 * way, but only ever needs the kebab-case id: nothing in a path is ever
 * camelCase or sentence case. */
export const transformPath = (path, { fromId, newId }) =>
  replaceWhole(path, fromId, newId)
