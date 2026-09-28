import {
  ensureSeeded,
  findExample as findSeededExample,
  listExamples
} from '../prototype-seed/index.js'

/** A stable link to one example: it keeps working after a restart, when the
 * example's reference number has changed. */
export const exampleLink = (setId, slug) =>
  `/examples/${encodeURIComponent(setId)}/${encodeURIComponent(slug)}`

/**
 * The chooser's links to a set's examples, one per example the set seeds.
 *
 * @param {string} setId
 * @returns {Array<{ text: string, href: string }>}
 */
export const examplesFor = (setId) =>
  listExamples(setId).map(({ slug, label }) => ({
    text: label ?? slug,
    href: exampleLink(setId, slug)
  }))

/**
 * Where one example's journey is now — `{ journeyId, href, stopAt }` — or
 * undefined. Seeds the set first when nothing has seeded it since the server
 * started, so a link clicked straight after a restart still works.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 * @param {string} slug
 */
export const findExample = async (server, setId, slug) => {
  await ensureSeeded(server, setId)
  return findSeededExample(setId, slug)
}
