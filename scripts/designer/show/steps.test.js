import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_PATH,
  journeyIdOfPath,
  journeyPath,
  readScenarios,
  resolveStepFields
} from './steps.js'

const folders = []

const makeSetFolder = (fixture) => {
  const folder = mkdtempSync(path.join(tmpdir(), 'designer-steps-'))
  folders.push(folder)
  if (fixture) {
    const file = path.join(folder, FIXTURE_PATH)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(fixture))
  }
  return folder
}

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

describe('readScenarios', () => {
  it('Should read every scenario in fixture order, with its name', () => {
    const folder = makeSetFolder({
      warePotatoes: {
        useCase: 'Ware potatoes',
        steps: [{ slug: 'origin', fields: {} }]
      },
      seedPotatoes: { useCase: 'Seed potatoes', steps: [] }
    })
    expect(readScenarios(folder)).toEqual([
      {
        name: 'warePotatoes',
        useCase: 'Ware potatoes',
        steps: [{ slug: 'origin', fields: {} }]
      },
      { name: 'seedPotatoes', useCase: 'Seed potatoes', steps: [] }
    ])
  })

  it('Should answer no scenarios for a set with no fixture', () => {
    expect(readScenarios(makeSetFolder())).toEqual([])
  })
})

describe('resolveStepFields', () => {
  it('Should turn a relative date into a real one and every value into text', () => {
    const today = new Date(2026, 8, 27)
    expect(
      resolveStepFields(
        {
          slug: 'arrival-details',
          fields: {
            arrivalDate: { daysFromToday: 7 },
            quantity: 250,
            arrivalTime: '14:30'
          }
        },
        today
      )
    ).toEqual({
      arrivalDate: '4/10/2026',
      quantity: '250',
      arrivalTime: '14:30'
    })
  })

  it('Should count backwards for a date in the past', () => {
    expect(
      resolveStepFields(
        { fields: { arrivalDate: { daysFromToday: -1 } } },
        new Date(2026, 0, 1)
      )
    ).toEqual({ arrivalDate: '31/12/2025' })
  })

  it('Should cope with a step that has no fields', () => {
    expect(resolveStepFields({ slug: 'commodities' })).toEqual({})
  })
})

describe('journey paths', () => {
  it('Should build the address of a page in a notification', () => {
    expect(journeyPath('/plants-working', 'abc', 'origin')).toBe(
      '/plants-working/notifications/abc/origin'
    )
    expect(journeyPath('/plants-working', 'abc')).toBe(
      '/plants-working/notifications/abc'
    )
  })

  it('Should read the notification id out of an address', () => {
    expect(
      journeyIdOfPath(
        '/plants-working',
        '/plants-working/notifications/abc/commodities/details?index=0'
      )
    ).toBe('abc')
    expect(
      journeyIdOfPath('/plants-working', '/plants-working/notifications/abc')
    ).toBe('abc')
    expect(
      journeyIdOfPath('/plants-working', '/high-risk-plants/notifications/abc')
    ).toBeNull()
    expect(journeyIdOfPath('/plants-working', '/plants-working')).toBeNull()
  })
})
