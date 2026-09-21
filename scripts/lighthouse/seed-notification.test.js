import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { load } from 'cheerio'
import { seedFields } from '../../fit/seed-fields.js'
const happyPaths = createRequire(import.meta.url)(
  '../../src/server/app/sets/high-risk-plants/journeys/linear/flow/fixtures/happy-path.json'
)
import { fillNotification, SEED_SHAPES } from './seed-notification.js'

describe('shared journey seeds', () => {
  it('selects an available real address when the stub party is absent', async () => {
    const submissions = []
    const client = {
      document: async () => ({
        status: 200,
        crumb: 'csrf-token',
        $: load('<input type="radio" name="consignor" value="real-address-id">')
      }),
      submit: async (...args) => {
        submissions.push(args)
        return { status: 302 }
      }
    }
    const step = SEED_SHAPES.plantsForPlanting.steps.find(
      ({ slug }) => slug === 'consignors/select'
    )
    await fillNotification(client, 'PHN-26-0001', { steps: [step] })
    expect(submissions).toEqual([
      [
        '/notifications/PHN-26-0001/consignors/select',
        { consignor: 'real-address-id' },
        'csrf-token'
      ]
    ])
    expect(step.fields.consignor).toBe('tech-imports-ltd')
  })

  it('uses the browser fixture for Lighthouse without a second set of shapes', () => {
    expect(SEED_SHAPES).toBe(happyPaths)
  })

  it('resolves arrival dates across year boundaries without mutating the fixture', () => {
    const today = new Date(2026, 11, 31, 12)
    const arrival = (shape) =>
      shape.steps.find(({ slug }) => slug === 'arrival-details')
    expect(
      seedFields(arrival(SEED_SHAPES.warePotatoes), today).arrivalDate
    ).toBe('7/1/2027')
    expect(
      seedFields(arrival(SEED_SHAPES.warePotatoesLate), today).arrivalDate
    ).toBe('30/12/2026')
    expect(arrival(SEED_SHAPES.warePotatoes).fields.arrivalDate).toEqual({
      daysFromToday: 7
    })
  })
})
