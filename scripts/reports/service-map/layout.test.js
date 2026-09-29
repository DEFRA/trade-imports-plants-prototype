import { describe, expect, it } from 'vitest'

import {
  GRID,
  computeLayout,
  placeTags,
  renderDiagram,
  wrapWords
} from './layout.js'

const IF_PLANTS = {
  kind: 'values',
  when: '“Type” is “Plants”',
  text: 'If “Type” is “Plants”',
  clauses: [{ type: ['plants'] }]
}
const IF_POTATOES = { ...IF_PLANTS, clauses: [{ type: ['potatoes'] }] }

const page = (id, extra = {}) => ({
  id,
  title: `Page ${id}`,
  titleSource: 'copy',
  shownWhen: { kind: 'always' },
  terminal: false,
  ...extra
})

/** Three lanes: a start page and the hub, a question that branches, and
 * two pages one of which is only sometimes asked. */
const GRAPH = {
  set: { id: 'fixture', title: 'Fixture' },
  counts: { pages: 5, branches: 3 },
  decisions: [{ id: 'type' }],
  lanes: [
    { id: 'start', title: 'Start', rows: [], pages: ['start', 'hub'] },
    { id: 'one', title: '1. One', rows: [], pages: ['type'] },
    { id: 'two', title: '2. Two', rows: [], pages: ['a', 'b'] }
  ],
  pages: [
    page('start'),
    page('hub', { title: 'Overview' }),
    page('type'),
    page('a', { shownWhen: IF_PLANTS }),
    page('b', { terminal: true })
  ],
  edges: [
    { from: 'start', to: 'type', kind: 'start', condition: null },
    { from: 'type', to: 'a', kind: 'first-pass', condition: IF_PLANTS },
    { from: 'type', to: 'b', kind: 'first-pass', condition: IF_POTATOES },
    { from: 'a', to: 'b', kind: 'first-pass', condition: null },
    { from: 'a', to: 'hub', kind: 'continue', condition: null },
    {
      from: 'hub',
      to: 'a',
      kind: 'task-list',
      row: 'a',
      condition: IF_PLANTS
    },
    { from: 'type', to: 'start', kind: 'change', condition: null }
  ]
}

const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height

const markerBox = ({ at: [x, y] }) => ({
  x: x - GRID.markerRadius,
  y: y - GRID.markerRadius,
  width: GRID.markerRadius * 2,
  height: GRID.markerRadius * 2
})

describe('computeLayout', () => {
  const layout = computeLayout(GRAPH)

  it('Should put each lane in a column and each page under the one before it', () => {
    expect(
      layout.cards.map(({ id, lane, index, x, y }) => ({
        id,
        lane,
        index,
        x,
        y
      }))
    ).toEqual([
      { id: 'start', lane: 0, index: 0, x: 24, y: 120 },
      { id: 'hub', lane: 0, index: 1, x: 24, y: 400 },
      { id: 'type', lane: 1, index: 0, x: 354, y: 120 },
      { id: 'a', lane: 2, index: 0, x: 684, y: 120 },
      { id: 'b', lane: 2, index: 1, x: 684, y: 400 }
    ])
    expect([layout.width, layout.height]).toEqual([983, 674])
  })

  it('Should draw a straight line to the next page in a lane and route the rest through the gutters', () => {
    const route = (from, to) =>
      layout.arrows.find(
        (arrow) => arrow.edge.from === from && arrow.edge.to === to
      )
    expect(route('a', 'b').points).toEqual([
      [794, 330],
      [794, 400]
    ])
    expect(route('type', 'a').points).toEqual([
      [574, 239],
      [590, 239],
      [590, 239],
      [684, 239]
    ])
    expect(route('hub', 'a').route).toBe('hub')
  })

  it('Should show Continue back to the task list as a tag, not an arrow, and never draw Change links', () => {
    expect(layout.backToHub.map((item) => item.edge.from)).toEqual(['a'])
    expect(layout.arrows.some((arrow) => arrow.edge.kind === 'change')).toBe(
      false
    )
  })

  it('Should number every conditional arrow, with no number on a card or another number', () => {
    expect(layout.numbered.map((item) => item.number)).toEqual([1, 2, 3])
    const boxes = layout.numbered.map(markerBox)
    boxes.forEach((box, index) => {
      boxes
        .slice(index + 1)
        .forEach((other) => expect(overlaps(box, other)).toBe(false))
      layout.cards.forEach((card) => expect(overlaps(box, card)).toBe(false))
    })
  })
})

describe('renderDiagram', () => {
  it('Should give the same SVG every time, with a card for every page and a placeholder where there is no picture', () => {
    const screens = { start: { picture: '../../media/start.jpg' } }
    const first = renderDiagram(GRAPH, { screens, changedPages: ['type'] }).svg
    expect(renderDiagram(GRAPH, { screens, changedPages: ['type'] }).svg).toBe(
      first
    )
    for (const item of GRAPH.pages) {
      expect(first).toContain(`id="card-${item.id}"`)
    }
    expect(first).toContain('href="../../media/start.jpg"')
    expect(first.match(/No picture yet/g)).toHaveLength(4)
    expect(first).toContain('Sometimes asked')
    expect(first).toContain('>Changed<')
    expect(first).toContain('>End<')
    expect(first).toContain('↩ Overview')
  })
})

describe('the Sometimes asked tag', () => {
  const cardOf = (svg, id) =>
    svg.slice(
      svg.indexOf(`id="card-${id}"`),
      svg.indexOf('</a>', svg.indexOf(`id="card-${id}"`))
    )

  it('Should mark a page a rule shows only once another question is answered, but not one shown once every task is complete', () => {
    const graph = {
      ...GRAPH,
      flags: [
        { id: 'ready', kind: 'ready' },
        { id: 'answered:x', kind: 'answered' }
      ],
      pages: GRAPH.pages.map((item) =>
        item.id === 'b'
          ? {
              ...item,
              shownWhen: { kind: 'values', clauses: [{ ready: [true] }] }
            }
          : item.id === 'type'
            ? {
                ...item,
                shownWhen: {
                  kind: 'values',
                  clauses: [{ 'answered:x': [true] }]
                }
              }
            : item
      )
    }
    const { svg } = renderDiagram(graph, { screens: {} })
    expect(cardOf(svg, 'type')).toContain('Sometimes asked')
    expect(cardOf(svg, 'b')).not.toContain('Sometimes asked')
  })
})

describe('placeTags', () => {
  it('Should keep every tag inside its card, starting a new row when one would run over', () => {
    const card = { x: 100, y: 200, height: GRID.cardHeight }
    const placed = placeTags(card, [
      { text: 'Sometimes asked' },
      { text: 'Changed' },
      { text: 'Not reached' }
    ])
    for (const { x, width } of placed) {
      expect(x).toBeGreaterThanOrEqual(card.x + 10)
      expect(x + width).toBeLessThanOrEqual(card.x + GRID.cardWidth - 10)
    }
    placed.forEach((tag, index) =>
      placed
        .slice(index + 1)
        .forEach((other) =>
          expect(
            overlaps({ ...tag, height: 18 }, { ...other, height: 18 })
          ).toBe(false)
        )
    )
    expect(new Set(placed.map((tag) => tag.y)).size).toBe(2)
  })
})

describe('wrapWords', () => {
  it('Should wrap at word boundaries and end an overlong title with an ellipsis', () => {
    expect(
      wrapWords('Has the consignment arrived in Great Britain?', 27, 3)
    ).toEqual(['Has the consignment arrived', 'in Great Britain?'])
    expect(wrapWords('one two three four five six', 7, 2)).toEqual([
      'one two',
      'three…'
    ])
  })
})
