/**
 * Copies each walkthrough video and page picture onto the built site,
 * without duplicating what the Playwright HTML report (`tests/`, copied
 * alongside the demo page) already holds: a Playwright HTML report names
 * every attachment it stores as `data/<sha1 of the file's content><ext>`, so
 * a file with that same name under `tests/data/` is that same file already
 * published. Only a file the report does not already hold is copied, to
 * `media/<sha1><ext>`.
 *
 * The fallback copy means the page never breaks either way: whichever
 * `tests/data/` naming a future Playwright version uses, a file this
 * function cannot find there is copied instead, at the cost of one more
 * file on disk. `media.test.js` pins today's naming against a real HTML
 * report, so a Playwright change shows up there as a failed test rather
 * than as a broken video on the demo page.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const sha1Of = (file) =>
  createHash('sha1').update(readFileSync(file)).digest('hex')

/**
 * Where `sourceFile` should be linked from on the built site.
 *
 * @param {string} sourceFile - an absolute path under the walkthrough's
 *   `--results` folder.
 * @param {string} siteDir - the site's root folder (holds `tests/` and,
 *   once this runs, `media/`).
 * @returns {{ url: string, copied: boolean }} `url` is relative to the site
 *   root, with no leading slash, so the page works from a plain folder too.
 */
export const publishMedia = (sourceFile, siteDir) => {
  const ext = path.extname(sourceFile)
  const hash = sha1Of(sourceFile)
  const reportCopy = path.join(siteDir, 'tests', 'data', `${hash}${ext}`)
  if (existsSync(reportCopy)) {
    return { url: `tests/data/${hash}${ext}`, copied: false }
  }
  const mediaFile = path.join(siteDir, 'media', `${hash}${ext}`)
  mkdirSync(path.dirname(mediaFile), { recursive: true })
  copyFileSync(sourceFile, mediaFile)
  return { url: `media/${hash}${ext}`, copied: true }
}

/** `publishMedia`, but a file that cannot be read is left as it was rather
 * than breaking the whole page. */
const publish = (file, siteDir) => {
  if (!file) {
    return null
  }
  try {
    return publishMedia(file, siteDir).url
  } catch {
    return file
  }
}

const publishStory = (story, siteDir) => ({
  ...story,
  video: publish(story.video, siteDir),
  pages: story.pages.map((page) => ({
    ...page,
    url: publish(page.url, siteDir)
  }))
})

/**
 * Publishes every video and page picture a demo-page model refers to,
 * rewriting each url in place. `trace` is left alone: it is only ever
 * opened from inside the copied Playwright report (`tests/`), which already
 * carries it, never linked straight off the demo page.
 *
 * @param {{ sets: object[] }} model - from `model.js`'s `buildModel`.
 * @param {string} siteDir
 * @returns {{ sets: object[] }}
 */
export const publishModelMedia = (model, siteDir) => ({
  sets: model.sets.map((set) => ({
    ...set,
    featured: set.featured.map((story) => publishStory(story, siteDir)),
    other: set.other.map((story) => publishStory(story, siteDir))
  }))
})
