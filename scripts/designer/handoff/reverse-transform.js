/**
 * The reverse of `scripts/new-set/transform.js`: turns a design release's file
 * back into the file it was copied from, so the designer's change can be
 * expressed against the real journey's paths and ids.
 *
 * `new:set` rewrites the template id in three shapes (kebab, camel and
 * sentence case) and gives every obligation UUID a fresh value. Undoing that
 * needs the release id, the id it was made from, and a map from the release's
 * UUIDs back to the originals. Pure functions only: no git, no filesystem.
 */
import { camelCase, sentenceCase } from '../../new-set/names.js'

const UUID_SOURCE =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/** Every UUID in `content`, in the order they appear (repeats included). */
export const uuidsIn = (content) =>
  content.match(new RegExp(UUID_SOURCE, 'gi')) ?? []

const replaceAll = (content, from, to) =>
  from && from !== to ? content.split(from).join(to) : content

/**
 * Pairs the UUIDs of a release file with those of the file it was copied
 * from, by position. `new:set` replaces UUIDs one for one in order, so at the
 * moment of copying the n-th UUID of one file is the n-th of the other.
 * Returns null when the counts differ: the files are no longer in step and a
 * positional pairing would be a guess.
 */
export const pairUuidsByPosition = (releaseContent, fromContent) => {
  const releaseUuids = uuidsIn(releaseContent)
  const fromUuids = uuidsIn(fromContent)
  if (releaseUuids.length !== fromUuids.length) {
    return null
  }
  const pairs = {}
  releaseUuids.forEach((uuid, index) => {
    pairs[uuid.toLowerCase()] = fromUuids[index].toLowerCase()
  })
  return pairs
}

const countOccurrences = (uuids, texts) =>
  uuids.filter((uuid) =>
    texts.some((text) => text.toLowerCase().includes(uuid.toLowerCase()))
  ).length

/**
 * Normalises a recorded UUID map to point from the release's UUIDs to the
 * original ones, whichever way round it was written.
 *
 * `release.json` records `uuidMap` as `{ originalUuid: releaseUuid }` (the
 * direction `new:set` substitutes in), but an array of `{ from, to }` pairs
 * or the inverted object are accepted too. The direction is confirmed against
 * the release's own files: the side whose UUIDs actually occur there is the
 * release side.
 */
export const orientUuidMap = (uuidMap, releaseTexts = []) => {
  if (!uuidMap) {
    return {}
  }
  const entries = Array.isArray(uuidMap)
    ? uuidMap.map((pair) => [pair.from, pair.to])
    : Object.entries(uuidMap)
  const originals = entries.map(([original]) => original)
  const copies = entries.map(([, copy]) => copy)
  const keysAreReleaseSide =
    countOccurrences(originals, releaseTexts) >
    countOccurrences(copies, releaseTexts)
  const oriented = {}
  for (const [original, copy] of entries) {
    const [releaseUuid, fromUuid] = keysAreReleaseSide
      ? [original, copy]
      : [copy, original]
    oriented[releaseUuid.toLowerCase()] = fromUuid.toLowerCase()
  }
  return oriented
}

/**
 * One release file's content, rewritten back to the set it was made from:
 * the release id in all three shapes, then every UUID the map knows.
 * UUIDs the map does not know (a question the designer added) are kept.
 */
export const reverseContent = (
  content,
  { releaseId, fromId, uuidMap = {} }
) => {
  const renamed = replaceAll(
    replaceAll(
      replaceAll(content, releaseId, fromId),
      camelCase(releaseId),
      camelCase(fromId)
    ),
    sentenceCase(releaseId),
    sentenceCase(fromId)
  )
  return renamed.replace(
    new RegExp(UUID_SOURCE, 'gi'),
    (uuid) => uuidMap[uuid.toLowerCase()] ?? uuid
  )
}

/** A release path rewritten back to the set it was made from. */
export const reversePath = (filePath, { releaseId, fromId }) =>
  replaceAll(filePath, releaseId, fromId)

/**
 * Applies a chain of reversals in order: a release made from another release
 * is reversed one step at a time until it reaches the real journey.
 */
export const reverseThroughChain = (content, hops) =>
  hops.reduce((text, hop) => reverseContent(text, hop), content)

export const reversePathThroughChain = (filePath, hops) =>
  hops.reduce((current, hop) => reversePath(current, hop), filePath)
