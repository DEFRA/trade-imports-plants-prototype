import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { copy as en } from '../copy/copy.en.js'
import { commodityTableRows } from './table-rows.js'

const copy = en.list

describe('#commodityTableRows', () => {
  it('Should give each commodity its category, genus or variety and quantity, then a Change link and a Remove button', () => {
    const [[category, genusOrVariety, quantity, actions]] = commodityTableRows(
      [
        {
          position: 2,
          category: 'Plants for planting',
          genusOrVariety: 'Picea (spruce)',
          quantity: '40',
          changeHref: '/notifications/journey-1/details?index=1',
          removeAction: 'remove:1'
        }
      ],
      copy
    )

    const cell = JSDOM.fragment(actions.html)
    const link = cell.querySelector('a')
    const button = cell.querySelector('button')

    expect([category, genusOrVariety, quantity]).toEqual([
      { text: 'Plants for planting' },
      { text: 'Picea (spruce)' },
      { text: '40' }
    ])
    expect(link.getAttribute('href')).toBe(
      '/notifications/journey-1/details?index=1'
    )
    expect(link.textContent).toBe(`Change ${copy.changeHidden(2)}`)
    expect(button.getAttribute('name')).toBe('action')
    expect(button.getAttribute('value')).toBe('remove:1')
    expect(button.textContent.replace(/\s+/g, ' ').trim()).toBe(
      `Remove ${copy.removeHidden(2)}`
    )
  })

  it('Should give no rows when no commodity has been added', () => {
    expect(commodityTableRows([], copy)).toEqual([])
  })
})
