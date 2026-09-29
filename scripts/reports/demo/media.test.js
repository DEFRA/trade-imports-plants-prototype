import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { publishMedia, publishModelMedia } from './media.js'

/**
 * Playwright's own HTML report names every attachment it holds
 * `data/<sha1 of the file's content>.<ext>` — confirmed against a real
 * report this checkout made (`.cache/designer/walkthrough/report/data/`).
 * This computes that same name independently, with `node:crypto` directly
 * rather than through the code under test, so a real report's naming is what
 * this test pins, not `publishMedia`'s own idea of it.
 */
const playwrightReportName = (content, ext) =>
  `${createHash('sha1').update(content).digest('hex')}${ext}`

describe('publishMedia', () => {
  let root
  let siteDir
  let sourceDir

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'demo-media-'))
    siteDir = join(root, 'site')
    sourceDir = join(root, 'test-results', 'some-test')
    mkdirSync(sourceDir, { recursive: true })
    mkdirSync(join(siteDir, 'tests', 'data'), { recursive: true })
  })

  it('Should link to the copy the Playwright report already holds, without copying again', () => {
    const content = Buffer.from('a real video, honestly')
    const sourceFile = join(sourceDir, 'video.webm')
    writeFileSync(sourceFile, content)
    const reportName = playwrightReportName(content, '.webm')
    writeFileSync(join(siteDir, 'tests', 'data', reportName), content)

    const result = publishMedia(sourceFile, siteDir)

    expect(result).toEqual({ url: `tests/data/${reportName}`, copied: false })
    expect(existsSync(join(siteDir, 'media'))).toBe(false)
  })

  it('Should copy a file the report does not already hold, named the same way', () => {
    const content = Buffer.from('a fresh page picture')
    const sourceFile = join(sourceDir, '01-Origin.jpg')
    writeFileSync(sourceFile, content)
    const expectedName = playwrightReportName(content, '.jpg')

    const result = publishMedia(sourceFile, siteDir)

    expect(result).toEqual({ url: `media/${expectedName}`, copied: true })
    expect(readFileSync(join(siteDir, 'media', expectedName))).toEqual(content)
  })

  it('Should name two different files apart, even with the same extension', () => {
    const fileA = join(sourceDir, 'a.jpg')
    const fileB = join(sourceDir, 'b.jpg')
    writeFileSync(fileA, 'one picture')
    writeFileSync(fileB, 'a different picture')

    expect(publishMedia(fileA, siteDir).url).not.toBe(
      publishMedia(fileB, siteDir).url
    )
  })
})

describe('publishModelMedia', () => {
  let root
  let siteDir
  let sourceDir

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'demo-media-model-'))
    siteDir = join(root, 'site')
    sourceDir = join(root, 'test-results')
    mkdirSync(sourceDir, { recursive: true })
    mkdirSync(join(siteDir, 'tests', 'data'), { recursive: true })
  })

  const model = (video, pageFile) => ({
    sets: [
      {
        id: 'plants-working',
        featured: [
          {
            name: 'Submitted',
            video,
            trace: join(sourceDir, 'trace.zip'),
            pages: [{ caption: 'Origin', url: pageFile }]
          }
        ],
        other: []
      }
    ]
  })

  it('Should rewrite a story’s video and page pictures to their published urls, and leave trace alone', () => {
    const videoFile = join(sourceDir, 'video.webm')
    const pageFile = join(sourceDir, '01-Origin.jpg')
    writeFileSync(videoFile, 'a video')
    writeFileSync(pageFile, 'a page')

    const published = publishModelMedia(model(videoFile, pageFile), siteDir)
    const [story] = published.sets[0].featured

    expect(story.video).toMatch(/^media\//)
    expect(story.pages[0].url).toMatch(/^media\//)
    expect(story.trace).toBe(join(sourceDir, 'trace.zip'))
  })

  it('Should leave a missing file’s path alone rather than fail the whole page', () => {
    const published = publishModelMedia(
      model(join(sourceDir, 'missing.webm'), null),
      siteDir
    )

    expect(published.sets[0].featured[0].video).toBe(
      join(sourceDir, 'missing.webm')
    )
  })
})
