import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { describeShot, pickScreenshots, shotLabel } from './screenshots.js'

const KB = 1024

describe('describeShot', () => {
  it('Should read a designer:show file name', () => {
    expect(
      describeShot('commodities-details--before--errors--mobile.png')
    ).toEqual({
      page: 'commodities-details',
      version: 'before',
      state: 'errors',
      width: 'mobile'
    })
  })

  it('Should ignore a file named some other way', () => {
    expect(describeShot('walk.png')).toBeNull()
  })
})

describe('shotLabel', () => {
  it('Should describe a picture in plain words', () => {
    expect(
      shotLabel({ version: 'now', state: 'errors', width: 'mobile' })
    ).toBe('after, error messages, phone width')
  })

  it('Should call the real journey beside a release "real service today"', () => {
    expect(
      shotLabel({ version: 'compare', state: 'page', width: 'desktop' })
    ).toBe('real service today')
  })
})

describe('pickScreenshots', () => {
  let gallery

  const shot = (name, bytes) =>
    writeFileSync(path.join(gallery, name), Buffer.alloc(bytes))

  beforeEach(() => {
    gallery = mkdtempSync(path.join(tmpdir(), 'handoff-gallery-'))
  })

  afterEach(() => {
    rmSync(gallery, { recursive: true, force: true })
  })

  it('Should pick the changed pages, before then now, desktop before phone', () => {
    shot('arrival-details--now--page--mobile.png', KB)
    shot('arrival-details--now--page--desktop.png', KB)
    shot('arrival-details--before--page--desktop.png', KB)
    shot('origin--now--page--desktop.png', KB)
    shot('commodities-details--now--page--desktop.png', KB)

    const { picked } = pickScreenshots(gallery, [
      'arrival-details',
      'commodities/details'
    ])

    expect(picked.map((item) => [item.fileName, item.slug])).toEqual([
      ['arrival-details--before--page--desktop.png', 'arrival-details'],
      ['arrival-details--now--page--desktop.png', 'arrival-details'],
      ['arrival-details--now--page--mobile.png', 'arrival-details'],
      ['commodities-details--now--page--desktop.png', 'commodities/details']
    ])
  })

  it('Should stop before the total passes the cap and list what it left out', () => {
    shot('origin--before--page--desktop.png', 600 * KB)
    shot('origin--now--page--desktop.png', 600 * KB)
    shot('origin--now--errors--desktop.png', 600 * KB)

    const result = pickScreenshots(gallery, ['origin'], 1300 * KB)

    expect(result.picked).toHaveLength(2)
    expect(result.skipped.map((item) => item.relative)).toEqual([
      'origin--now--errors--desktop.png'
    ])
    expect(result.totalBytes).toBe(1200 * KB)
  })

  it('Should say when there is no gallery', () => {
    expect(
      pickScreenshots(path.join(gallery, 'missing'), ['origin']).found
    ).toBe(false)
  })
})
