/**
 * The service map's diagram, laid out on a fixed grid and drawn as SVG.
 * Pure: the graph and the pictures in, a string out, the same every time.
 *
 * - Lanes are columns, left to right in the graph's lane order: Start, each
 *   task-list group, then anything left over.
 * - Each page is a card in its lane, in lane order: a picture of the top of
 *   the page, its title and small tags.
 * - Arrows are orthogonal. Down to the next card in a lane is a straight
 *   line; anything else leaves a card on its right, runs in the gutter to
 *   the right of its lane (each arrow in its own slot, so none overlap) and,
 *   when it has to cross more than one lane, along a bus under the cards.
 *   Arrows from the task list run along a bus above the cards.
 * - A Continue that goes back to the task list is a small "↩" tag under the
 *   card, not an arrow, so the diagram is not all lines into one card.
 * - Every conditional arrow is amber and carries a number; the words for
 *   each number are in the key and the list view beside the diagram.
 */

export const GRID = Object.freeze({
  margin: 24,
  headerHeight: 56,
  busHeight: 40,
  cardWidth: 220,
  cardHeight: 210,
  gutter: 110,
  verticalGap: 70,
  thumbnailHeight: 110,
  slotStep: 10,
  markerRadius: 10
})

const COLOURS = Object.freeze({
  text: '#0b0c0c',
  secondary: '#505a5f',
  border: '#b1b4b6',
  lane: '#f3f2f1',
  link: '#1d70b8',
  conditional: '#f47738',
  placeholder: '#e5e6e7',
  white: '#ffffff'
})

const TAGS = Object.freeze({
  sometimes: { text: 'Sometimes asked', fill: '#fcd6c3', colour: '#6e3619' },
  changed: { text: 'Changed', fill: '#bbd4ea', colour: '#0c2d4a' },
  end: { text: 'End', fill: '#cce2d8', colour: '#005a30' }
})

const DRAWN_KINDS = new Set([
  'start',
  'first-pass',
  'continue',
  'task-list',
  'within-task'
])

const TITLE_LINE_CHARACTERS = 27
const TITLE_LINES = 3
const CAPTION_LINE_CHARACTERS = 30
const HUB_ID = 'hub'

/** Text made safe for SVG and HTML. */
export const escapeXml = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * Words wrapped into lines of at most `width` characters, at most `lines`
 * of them, the last ending in "…" when the words do not fit.
 */
export const wrapWords = (text, width, lines) => {
  const result = []
  let current = ''
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= width || current === '') {
      current = next
    } else {
      result.push(current)
      current = word
    }
  }
  if (current) {
    result.push(current)
  }
  if (result.length <= lines) {
    return result
  }
  const kept = result.slice(0, lines)
  const last = kept[lines - 1]
  kept[lines - 1] = `${last.slice(0, Math.max(0, width - 1)).trimEnd()}…`
  return kept
}

const tagWidth = (text) => Math.round(text.length * 6) + 12

/** Where every card sits. */
const placeCards = (graph) => {
  const {
    margin,
    headerHeight,
    busHeight,
    cardWidth,
    cardHeight,
    gutter,
    verticalGap
  } = GRID
  const top = margin + headerHeight + busHeight
  const cards = new Map()
  graph.lanes.forEach((lane, laneIndex) => {
    lane.pages.forEach((pageId, index) => {
      cards.set(pageId, {
        id: pageId,
        lane: laneIndex,
        index,
        x: margin + laneIndex * (cardWidth + gutter),
        y: top + index * (cardHeight + verticalGap),
        width: cardWidth,
        height: cardHeight
      })
    })
  })
  return { cards, top }
}

// Arrows leave a card's right side a little below its middle and come back
// into it a little above, so an arrow in and an arrow out never share a
// point.
const PORT_OFFSET = 14
const midY = (card) => card.y + card.height / 2
const outRight = (card) => [card.x + card.width, midY(card) + PORT_OFFSET]
const inRight = (card) => [card.x + card.width, midY(card) - PORT_OFFSET]
const inLeft = (card) => [card.x, midY(card) + PORT_OFFSET]
const inLeftFromTaskList = (card) => [card.x, midY(card) - PORT_OFFSET]

const gutterX = (laneIndex, slot, count) => {
  const { margin, cardWidth, gutter, slotStep } = GRID
  const start = margin + laneIndex * (cardWidth + gutter) + cardWidth + 16
  const room = gutter - 44
  const step = count * slotStep > room ? room / Math.max(1, count) : slotStep
  return Math.round(start + slot * step)
}

const trunkX = (laneIndex) =>
  GRID.margin + laneIndex * (GRID.cardWidth + GRID.gutter) - 14

const routeKind = (edge, from, to) => {
  if (edge.from === HUB_ID && edge.kind === 'task-list') {
    return 'hub'
  }
  if (from.lane === to.lane && to.index === from.index + 1) {
    return 'straight'
  }
  if (from.lane === to.lane || to.lane === from.lane + 1) {
    return 'gutter'
  }
  return 'bus'
}

const segmentLength = ([ax, ay], [bx, by]) =>
  Math.abs(ax - bx) + Math.abs(ay - by)

/** The point `distance` back from the end of a polyline. */
const pointBack = (points, distance) => {
  let left = distance
  for (let index = points.length - 1; index > 0; index -= 1) {
    const end = points[index]
    const start = points[index - 1]
    const length = segmentLength(start, end)
    if (left <= length) {
      const ratio = length === 0 ? 0 : left / length
      return [
        Math.round(end[0] + (start[0] - end[0]) * ratio),
        Math.round(end[1] + (start[1] - end[1]) * ratio)
      ]
    }
    left -= length
  }
  return points[0]
}

const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height

const markerBox = ([x, y]) => {
  const r = GRID.markerRadius
  return { x: x - r, y: y - r, width: 2 * r, height: 2 * r }
}

/**
 * The diagram's geometry: every card, every arrow's points and every
 * number's place. Pure and exact, so tests can pin coordinates.
 *
 * @param {object} graph - from graph.js.
 * @returns {{ width: number, height: number, cards: object[],
 *   arrows: object[], backToHub: object[], numbered: object[] }}
 */
export const computeLayout = (graph) => {
  const { cards, top } = placeCards(graph)
  const bottom = Math.max(
    top,
    ...[...cards.values()].map((card) => card.y + card.height)
  )
  const drawable = graph.edges.filter(
    (edge) =>
      DRAWN_KINDS.has(edge.kind) &&
      cards.has(edge.from) &&
      cards.has(edge.to) &&
      !(edge.kind === 'continue' && edge.to === HUB_ID)
  )
  const routes = drawable.map((edge) => {
    const from = cards.get(edge.from)
    const to = cards.get(edge.to)
    return { edge, from, to, route: routeKind(edge, from, to) }
  })
  const gutterUse = new Map()
  const useGutter = (laneIndex, item) => {
    if (!gutterUse.has(laneIndex)) {
      gutterUse.set(laneIndex, [])
    }
    gutterUse.get(laneIndex).push(item)
  }
  const busUse = []
  for (const item of routes) {
    if (item.route === 'gutter') {
      useGutter(item.from.lane, item)
    } else if (item.route === 'bus') {
      useGutter(item.from.lane, item)
      busUse.push(item)
      const entryLane =
        item.to.lane > item.from.lane ? item.to.lane - 1 : item.to.lane
      item.entryLane = entryLane
      useGutter(entryLane, { ...item, entry: true })
    }
  }
  const slotOf = (laneIndex, item, entry = false) => {
    const list = gutterUse.get(laneIndex) ?? []
    const slot = list.findIndex(
      (candidate) =>
        candidate.edge === item.edge && Boolean(candidate.entry) === entry
    )
    return gutterX(laneIndex, slot, list.length)
  }
  const busY = (item) =>
    bottom +
    24 +
    busUse.findIndex((candidate) => candidate.edge === item.edge) *
      GRID.slotStep
  const hubBusY = top - GRID.busHeight / 2

  const hubCard = cards.get(HUB_ID)
  const arrows = routes.map((item) => {
    const { edge, from, to, route } = item
    let points
    if (route === 'straight') {
      const x = from.x + from.width / 2
      points = [
        [x, from.y + from.height],
        [x, to.y]
      ]
    } else if (route === 'gutter') {
      const x = slotOf(from.lane, item)
      const start = outRight(from)
      const end = to.lane === from.lane ? inRight(to) : inLeft(to)
      points = [start, [x, start[1]], [x, end[1]], end]
    } else if (route === 'bus') {
      const exitX = slotOf(from.lane, item)
      const entryX = slotOf(item.entryLane, item, true)
      const y = busY(item)
      const start = outRight(from)
      const end = to.lane > from.lane ? inLeft(to) : inRight(to)
      points = [
        start,
        [exitX, start[1]],
        [exitX, y],
        [entryX, y],
        [entryX, end[1]],
        end
      ]
    } else {
      const exitX = gutterX(hubCard.lane, 0, 1) - 8
      const entryX = to.lane === hubCard.lane ? exitX : trunkX(to.lane)
      const start = outRight(from)
      const end =
        to.lane === hubCard.lane ? inRight(to) : inLeftFromTaskList(to)
      points = [
        start,
        [exitX, start[1]],
        [exitX, hubBusY],
        [entryX, hubBusY],
        [entryX, end[1]],
        end
      ]
    }
    return { edge, route, points }
  })

  const numbered = []
  const taken = [...cards.values()].map((card) => ({
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height
  }))
  let number = 0
  for (const arrow of arrows) {
    if (!arrow.edge.condition) {
      continue
    }
    number += 1
    let place = pointBack(arrow.points, 24)
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      if (!taken.some((box) => overlaps(box, markerBox(place)))) {
        break
      }
      place = pointBack(arrow.points, 24 + attempt * 22)
    }
    taken.push(markerBox(place))
    arrow.number = number
    numbered.push({ number, edge: arrow.edge, at: place })
  }

  const backToHub = graph.edges
    .filter(
      (edge) =>
        edge.kind === 'continue' && edge.to === HUB_ID && cards.has(edge.from)
    )
    .map((edge) => {
      const card = cards.get(edge.from)
      return { edge, x: card.x + card.width, y: card.y + card.height + 6 }
    })

  const lanes = graph.lanes.length
  const width =
    GRID.margin * 2 +
    lanes * GRID.cardWidth +
    Math.max(0, lanes - 1) * GRID.gutter +
    GRID.gutter / 2
  const height = bottom + 24 + busUse.length * GRID.slotStep + GRID.margin + 16
  return {
    width: Math.round(width),
    height: Math.round(height),
    top,
    cards: [...cards.values()],
    arrows,
    backToHub,
    numbered
  }
}

// Arrows from the task list share their first stretch, so they stay blue
// whatever their condition: an amber one would be drawn over the others.
// Their number says when they apply.
const strokeOf = (edge) => {
  if (edge.kind === 'task-list') {
    return COLOURS.link
  }
  if (edge.condition) {
    return COLOURS.conditional
  }
  return edge.kind === 'continue' || edge.kind === 'within-task'
    ? COLOURS.secondary
    : COLOURS.text
}

const dashOf = (kind) =>
  kind === 'continue' ? '8 5' : kind === 'within-task' ? '2 4' : null

const widthOf = (kind) =>
  kind === 'task-list'
    ? 1.25
    : kind === 'first-pass' || kind === 'start'
      ? 2.5
      : 1.75

const markerIdOf = (stroke) => `arrow-${stroke.replace('#', '')}`

/** The small key swatch for a line style, as an inline SVG. */
export const swatchSvg = ({ kind, conditional = false }) => {
  const stroke = conditional
    ? COLOURS.conditional
    : strokeOf({ kind, condition: null })
  const dash = dashOf(kind)
  return `<svg width="48" height="12" viewBox="0 0 48 12" aria-hidden="true" focusable="false"><line x1="2" y1="6" x2="46" y2="6" stroke="${stroke}" stroke-width="${widthOf(kind)}"${dash ? ` stroke-dasharray="${dash}"` : ''}/></svg>`
}

// "Sometimes asked" means some answers skip the page. A page everyone
// reaches once every task is complete (check your answers) is not that.
const dependsOnAnAnswer = (condition, decisionIds) =>
  condition?.kind === 'opaque' ||
  (condition?.kind === 'values' &&
    condition.clauses.some((clause) =>
      Object.keys(clause).some((id) => decisionIds.has(id))
    ))

// A page with no picture already says so in its grey placeholder, so it gets
// no tag for it.
const tagsFor = (page, screen, { changed, decisionIds }) => [
  ...(dependsOnAnAnswer(page.shownWhen, decisionIds) ? [TAGS.sometimes] : []),
  ...(changed.has(page.id) ? [TAGS.changed] : []),
  ...(page.terminal ? [TAGS.end] : [])
]

/**
 * Where each of a card's tags sits: left to right along the card's foot, and
 * a tag that would run past the card's right edge starts a new row above.
 *
 * @param {{ x: number, y: number, height: number }} card
 * @param {Array<{ text: string }>} tags
 * @returns {Array<{ tag: object, x: number, y: number, width: number }>}
 */
export const placeTags = (card, tags) => {
  const left = card.x + 10
  const right = card.x + GRID.cardWidth - 10
  let x = left
  let y = card.y + card.height - 26
  return tags.map((tag) => {
    const width = tagWidth(tag.text)
    if (x > left && x + width > right) {
      x = left
      y -= 24
    }
    const placed = { tag, x, y, width }
    x += width + 6
    return placed
  })
}

const cardSvg = (card, page, screen, context) => {
  const { changed } = context
  const { cardWidth, thumbnailHeight } = GRID
  const href = screen?.picture ?? `#page-${page.id}`
  const thumbnail = screen?.picture
    ? `<image href="${escapeXml(screen.picture)}" x="${card.x + 10}" y="${card.y + 10}" width="${cardWidth - 20}" height="${thumbnailHeight}" preserveAspectRatio="xMidYMin slice"/>`
    : `<rect x="${card.x + 10}" y="${card.y + 10}" width="${cardWidth - 20}" height="${thumbnailHeight}" fill="${COLOURS.placeholder}"/><text x="${card.x + cardWidth / 2}" y="${card.y + 10 + thumbnailHeight / 2 + 5}" text-anchor="middle" font-size="13" fill="${COLOURS.secondary}">No picture yet</text>`
  const placedTags = placeTags(card, tagsFor(page, screen, context))
  // A second row of tags takes the title's last line.
  const tagRows = new Set(placedTags.map((placed) => placed.y)).size
  const lines = wrapWords(
    page.title,
    TITLE_LINE_CHARACTERS,
    tagRows > 1 ? TITLE_LINES - 1 : TITLE_LINES
  )
    .map(
      (line, index) =>
        `<text x="${card.x + 10}" y="${card.y + thumbnailHeight + 32 + index * 16}" font-size="13" font-weight="700" fill="${COLOURS.text}">${escapeXml(line)}</text>`
    )
    .join('')
  const tags = placedTags
    .map(
      ({ tag, x, y, width }) =>
        `<rect x="${x}" y="${y}" width="${width}" height="18" fill="${tag.fill}"/><text x="${x + 6}" y="${y + 13}" font-size="11" fill="${tag.colour}">${escapeXml(tag.text)}</text>`
    )
    .join('')
  const border = changed.has(page.id)
    ? `stroke="${COLOURS.link}" stroke-width="3"`
    : `stroke="${COLOURS.border}" stroke-width="1"`
  return `<a href="${escapeXml(href)}" id="card-${escapeXml(page.id)}"><title>${escapeXml(page.title)}</title><rect x="${card.x}" y="${card.y}" width="${card.width}" height="${card.height}" fill="${COLOURS.white}" ${border}/>${thumbnail}${lines}${tags}</a>`
}

const pathOf = (points) =>
  points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')

const arrowSvg = (arrow) => {
  const stroke = strokeOf(arrow.edge)
  const dash = dashOf(arrow.edge.kind)
  return `<path d="${pathOf(arrow.points)}" fill="none" stroke="${stroke}" stroke-width="${widthOf(arrow.edge.kind)}"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#${markerIdOf(stroke)})"/>`
}

const numberSvg = ({ number, at: [x, y] }) =>
  `<g><circle cx="${x}" cy="${y}" r="${GRID.markerRadius}" fill="${COLOURS.white}" stroke="${COLOURS.conditional}" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${COLOURS.text}">${number}</text></g>`

const backToHubSvg = ({ x, y }, hubTitle) => {
  const text = `↩ ${hubTitle}`
  const width = tagWidth(text)
  return `<g><rect x="${x - width}" y="${y}" width="${width}" height="18" fill="${COLOURS.white}" stroke="${COLOURS.secondary}" stroke-dasharray="3 2"/><text x="${x - width + 6}" y="${y + 13}" font-size="11" fill="${COLOURS.secondary}">${escapeXml(text)}</text></g>`
}

const laneSvg = (lane, laneIndex, { top, bottom }) => {
  const { margin, cardWidth, gutter } = GRID
  const x = margin + laneIndex * (cardWidth + gutter)
  const caption = wrapWords(lane.title, CAPTION_LINE_CHARACTERS, 2)
    .map(
      (line, index) =>
        `<text x="${x}" y="${margin + 16 + index * 18}" font-size="15" font-weight="700" fill="${COLOURS.text}">${escapeXml(line)}</text>`
    )
    .join('')
  return `<rect x="${x - 8}" y="${top - 12}" width="${cardWidth + 16}" height="${bottom - top + 24}" fill="${COLOURS.lane}"/>${caption}`
}

const arrowMarkers = () =>
  [COLOURS.text, COLOURS.secondary, COLOURS.link, COLOURS.conditional]
    .map(
      (colour) =>
        `<marker id="${markerIdOf(colour)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${colour}"/></marker>`
    )
    .join('')

/**
 * The diagram as an SVG string.
 *
 * @param {object} graph - from graph.js.
 * @param {object} [options]
 * @param {Record<string, object>} [options.screens] - page id to its screen
 *   (`picture` is the address to show).
 * @param {string[]} [options.changedPages] - page ids this pull request
 *   changes.
 * @returns {{ svg: string, layout: object }}
 */
export const renderDiagram = (
  graph,
  { screens = {}, changedPages = [] } = {}
) => {
  const layout = computeLayout(graph)
  const context = {
    changed: new Set(changedPages),
    decisionIds: new Set([
      ...graph.decisions.map((decision) => decision.id),
      ...(graph.flags ?? [])
        .filter((flag) => flag.kind === 'answered')
        .map((flag) => flag.id)
    ])
  }
  const pages = new Map(graph.pages.map((page) => [page.id, page]))
  const bottom = Math.max(
    layout.top,
    ...layout.cards.map((card) => card.y + card.height)
  )
  const hubTitle = pages.get(HUB_ID)?.title ?? 'Task list'
  const description = `${graph.counts.pages} pages in ${graph.lanes.length} groups, with ${graph.counts.branches} branches. The list under the diagram says the same in words.`
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="service-map-title service-map-desc" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" font-family="Arial, sans-serif">`,
    `<title id="service-map-title">How the pages connect: ${escapeXml(graph.set.title)}</title>`,
    `<desc id="service-map-desc">${escapeXml(description)}</desc>`,
    `<defs>${arrowMarkers()}</defs>`,
    graph.lanes
      .map((lane, index) => laneSvg(lane, index, { top: layout.top, bottom }))
      .join(''),
    layout.cards
      .map((card) =>
        cardSvg(card, pages.get(card.id), screens[card.id], context)
      )
      .join(''),
    layout.arrows.map(arrowSvg).join(''),
    layout.backToHub.map((item) => backToHubSvg(item, hubTitle)).join(''),
    layout.numbered.map(numberSvg).join(''),
    '</svg>'
  ].join('\n')
  return { svg, layout }
}
