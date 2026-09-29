/**
 * Which walkthrough picture shows each page of the service map. The report
 * is read by the caller and passed in; the only file access here is listing
 * a story's own output folder, and that is injectable.
 *
 * The walkthrough spec (fit/walkthroughs/) pictures every page as it
 * arrives, as `<NN>-<page key>.jpg` in the story's output folder (the key is
 * the page's address with `/` made `-`, or `dashboard`, `task-list`,
 * `notification-view`…), and the empty form's error summary as
 * `<NN>-<page key>-errors.jpg`. It attaches each one named
 * `<NN> <page heading>`; Playwright keeps its own copy of an attachment under
 * `attachments/`, named after that heading, and the report points at the
 * copy. So the key is read from the spec's file with the same number beside
 * the `attachments/` folder.
 *
 * The best picture of a page, deterministically: not an error picture; not
 * one whose heading differs from the page's title (the walkthrough was sent
 * on elsewhere), when that title came from the page's copy; from a story
 * that walked to the end before one that stopped; featured stories first, in
 * their featured order; then by story name, then step number.
 */
import { readdirSync } from 'node:fs'
import path from 'node:path'

import { fileSafe } from '../../designer/show/manifest.js'
import { ALIASES, HUB_KEY, pageKey } from '../../designer/show/targets.js'
import { annotationsOf, specsOf } from '../../designer/walkthrough/verdict.js'
import { reRootedPath } from '../demo/model.js'

const PICTURE_FILE = /^(\d{2,})-(.+)\.jpe?g$/i
const ATTACHMENT_NAME = /^(\d+) (.+)$/
const ERRORS_SUFFIX = '-errors'
const WALKTHROUGH_TAG = 'walkthrough'
const FEATURED_TAG = 'featured'
const WALKTHROUGHS_PROJECT = 'walkthroughs'
const WALKED = new Set(['expected', 'flaky'])

export const EMPTY_FORM_STEP = 'What it says when nothing is filled in'

const canonicalKey = (key) => ALIASES[key] ?? key

/** The key a map page's pictures are filed under. */
export const pictureKeyOf = (page) =>
  page.id === HUB_KEY ? HUB_KEY : fileSafe(pageKey(page))

const listFolder = (folder) => {
  try {
    return readdirSync(folder).toSorted((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

/**
 * The walkthrough spec's own file name for a picture: the picture's own
 * name when it already has the `<NN>-<key>.jpg` shape, else the file with
 * the same number beside the `attachments/` folder Playwright copied it
 * into (the `-errors` one for an empty-form picture).
 *
 * @param {string} file - the picture's path.
 * @param {{ number: number, errors: boolean }} picture
 * @param {(folder: string) => string[]} [listDir]
 * @returns {string|null}
 */
export const specFileNameOf = (
  file,
  { number, errors },
  listDir = listFolder
) => {
  const folder = path.dirname(file)
  if (path.basename(folder) !== 'attachments') {
    return PICTURE_FILE.test(path.basename(file)) ? path.basename(file) : null
  }
  return (
    listDir(path.dirname(folder)).find((name) => {
      const match = PICTURE_FILE.exec(name)
      return (
        match !== null &&
        Number(match[1]) === number &&
        match[2].endsWith(ERRORS_SUFFIX) === errors
      )
    }) ?? null
  )
}

const annotationValue = (annotations, type) =>
  annotations.find((annotation) => annotation.type === type)?.description ??
  null

const outputDirOf = (report) =>
  (report?.config?.projects ?? []).find(
    (project) => project.name === WALKTHROUGHS_PROJECT
  )?.outputDir ?? null

const storyOf = (spec) => {
  const test = spec.tests?.[0] ?? {}
  const result = (test.results ?? []).at(-1)
  const annotations = annotationsOf(test, result)
  const featured = annotationValue(annotations, 'Featured')
  return {
    name: spec.title,
    headline: annotationValue(annotations, 'Headline') ?? spec.title,
    featured: featured === null ? null : Number(featured),
    status: WALKED.has(test.status)
      ? 'walked'
      : test.status === 'skipped'
        ? 'skipped'
        : 'stopped',
    attachments: result?.attachments ?? []
  }
}

/**
 * Every picture in one set's walkthrough stories, each with the page key
 * it shows.
 *
 * @param {object|null} report - the walkthrough Playwright JSON report.
 * @param {{ setId: string, resultsDir?: string,
 *   listDir?: (folder: string) => string[] }} options
 * @returns {object[]}
 */
export const picturesOf = (
  report,
  { setId, resultsDir = '', listDir = listFolder }
) => {
  const roots = { outputDir: outputDirOf(report), resultsDir }
  return specsOf(report?.suites)
    .filter((spec) => (spec.tags ?? []).includes(WALKTHROUGH_TAG))
    .filter((spec) =>
      (spec.tags ?? []).some(
        (tag) =>
          tag === setId && tag !== WALKTHROUGH_TAG && tag !== FEATURED_TAG
      )
    )
    .map(storyOf)
    .flatMap((story) =>
      story.attachments.flatMap((attachment) => {
        const named = ATTACHMENT_NAME.exec(attachment.name ?? '')
        const file = reRootedPath(attachment.path, roots)
        if (!named || !file || !/^image\//.test(attachment.contentType ?? '')) {
          return []
        }
        const number = Number(named[1])
        const heading = named[2]
        const errors = heading === EMPTY_FORM_STEP
        const fileName = specFileNameOf(file, { number, errors }, listDir)
        const match = fileName ? PICTURE_FILE.exec(fileName) : null
        if (!match) {
          return []
        }
        const rawKey = match[2]
        const key = errors ? rawKey.slice(0, -ERRORS_SUFFIX.length) : rawKey
        return [
          {
            key: canonicalKey(key),
            errors,
            heading,
            story: story.name,
            headline: story.headline,
            featured: story.featured,
            status: story.status,
            stepNumber: number,
            path: file
          }
        ]
      })
    )
}

const byPreference = (a, b) =>
  (a.status === 'walked' ? 0 : 1) - (b.status === 'walked' ? 0 : 1) ||
  (a.featured === null ? 1 : 0) - (b.featured === null ? 1 : 0) ||
  (a.featured ?? 0) - (b.featured ?? 0) ||
  a.story.localeCompare(b.story, 'en') ||
  a.stepNumber - b.stepNumber

const noPictureNote = (page) =>
  page.shownWhen?.kind === 'values'
    ? `${page.title} is only shown if ${page.shownWhen.when}: add an example that answers that way.`
    : `No example reaches ${page.title} yet: add one that walks to it.`

/**
 * Each map page's best picture, its empty-form picture, the stories that
 * reach it, and why a picture was passed over.
 *
 * @param {object[]} pages - the graph's pages.
 * @param {object[]} pictures - from picturesOf.
 * @returns {Record<string, { picture: string|null, errorPicture: string|null,
 *   heading: string|null, stories: Array<{ name: string, headline: string }>,
 *   warnings: string[], note: string|null }>}
 */
export const screensFor = (pages, pictures) =>
  Object.fromEntries(
    pages.map((page) => {
      const key = pictureKeyOf(page)
      const mine = pictures.filter((picture) => picture.key === key)
      const shots = mine.filter((picture) => !picture.errors)
      const matching = shots
        .filter(
          (picture) =>
            page.titleSource !== 'copy' || picture.heading === page.title
        )
        .toSorted(byPreference)
      const dropped = shots.length - matching.length
      const best = matching[0] ?? null
      const errorShot =
        mine.filter((picture) => picture.errors).toSorted(byPreference)[0] ??
        null
      const stories = [
        ...new Map(
          matching.map((picture) => [
            picture.story,
            { name: picture.story, headline: picture.headline }
          ])
        ).values()
      ]
      return [
        page.id,
        {
          picture: best?.path ?? null,
          errorPicture: errorShot?.path ?? null,
          heading: best?.heading ?? null,
          stories,
          warnings:
            dropped > 0
              ? [
                  `${dropped} picture(s) filed under this page showed a different one (the walkthrough was sent on elsewhere), so were not used.`
                ]
              : [],
          note: best ? null : noPictureNote(page)
        }
      ]
    })
  )

/**
 * The same screens with every picture path passed through `publish` (which
 * returns the address to use on the page, or null).
 */
export const publishScreens = (screens, publish) =>
  Object.fromEntries(
    Object.entries(screens).map(([id, screen]) => [
      id,
      {
        ...screen,
        picture: screen.picture ? publish(screen.picture) : null,
        errorPicture: screen.errorPicture ? publish(screen.errorPicture) : null
      }
    ])
  )
