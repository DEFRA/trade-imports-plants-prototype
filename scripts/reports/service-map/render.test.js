import * as cheerio from 'cheerio'
import { beforeAll, describe, expect, it } from 'vitest'

import { buildGraph } from './graph.js'
import {
  renderIndexPage,
  renderMapPage,
  renderProblemPage,
  tagOf
} from './render.js'

describe('the service map page', () => {
  let graph
  let $

  beforeAll(async () => {
    graph = await buildGraph('high-risk-plants')
    const screens = Object.fromEntries(
      graph.pages.map((page) => [
        page.id,
        page.id === 'origin'
          ? { picture: '../../media/origin.jpg', stories: [], note: null }
          : {
              picture: null,
              stories: [],
              note: `Nothing reaches ${page.title}`
            }
      ])
    )
    $ = cheerio.load(renderMapPage({ graph, screens, sha: 'abc1234' }))
  })

  it('Should put every line style it draws in the key', () => {
    const key = $(
      'h3:contains("Key") + .govuk-summary-list .govuk-summary-list__value'
    )
      .map((_, element) => $(element).text().trim())
      .get()
    expect(key).toEqual([
      'The first time through a new notification, one question after another',
      'Continue, when coming back to a task later',
      'From the task list (Overview)',
      'A link on the page, not its Continue button',
      'Only for some answers: the number in the circle says which, below'
    ])
  })

  it('Should name the set and link back to the walkthroughs', () => {
    expect($('h1').text()).toContain('How the service works today')
    expect($('h1 .govuk-tag').text().trim()).toBe('Today’s service')
    expect($('.govuk-back-link').attr('href')).toBe('../../')
    expect($('link[rel=stylesheet]').attr('href')).toBe('../service-map.css')
  })

  it('Should show every page in the diagram and in the list', () => {
    for (const page of graph.pages) {
      expect($(`svg #card-${page.id}`).length).toBe(1)
      expect(
        $(`#page-${page.id} .govuk-summary-card__title`).text().trim()
      ).toBe(page.title)
    }
  })

  it('Should say in words when every numbered branch is followed', () => {
    const branches = $('li[id^=branch-]')
      .map((_, element) => $(element).text().replaceAll(/\s+/g, ' ').trim())
      .get()
    const conditional = graph.edges.filter(
      (edge) => edge.condition && edge.kind !== 'change'
    )
    expect(branches).toHaveLength(conditional.length)
    expect(branches[0]).toBe(
      '1 Origin of the import to Has the consignment arrived in Great Britain?: only if “What are you importing?” is “Plants for planting” or “Wood and cut trees”'
    )
    for (const edge of conditional) {
      expect(branches.some((text) => text.includes(edge.condition.when))).toBe(
        true
      )
    }
  })

  it('Should name each question by its label, with when it is asked', () => {
    const questionsOf = (pageId) =>
      $(`#page-${pageId} .govuk-summary-list__row`)
        .filter(
          (_, element) =>
            $(element).find('.govuk-summary-list__key').text().trim() ===
            'Questions on this page'
        )
        .find('li, p')
        .map((_, element) => $(element).text().replaceAll(/\s+/g, ' ').trim())
        .get()
    expect(questionsOf('commodity-type')).toEqual([
      'Commodity type (must be answered)'
    ])
    const commodities = questionsOf('commodities')
    expect(commodities).toContain(
      'Species (must be answered, for each entry in the list): only if the category is “Plants for planting” or “Trees for planting”'
    )
    expect(commodities.some((line) => line.startsWith('Species:'))).toBe(false)
    expect(questionsOf('identification-numbers')).toContain(
      'Consignment number (optional)'
    )
    expect(questionsOf('arrival-details')).toContain(
      'Arrival time (must be answered): only if “What are you importing?” is “Potatoes (seed or ware)”'
    )
  })

  it('Should name a question the model cannot reach by its label', () => {
    const broken = {
      ...graph,
      proofs: {
        ...graph.proofs,
        flowReachability: [
          {
            obligation: 'contactAddress',
            page: 'consignment-contact-select',
            reason: 'owning-page-unreachable-in-scope'
          }
        ]
      }
    }
    const page = cheerio.load(renderMapPage({ graph: broken, screens: {} }))
    expect(page('main').text().replaceAll(/\s+/g, ' ')).toContain(
      '“Contact address” must be answered, but for some answers its page, Contact address for consignment, is not shown, so it can never be answered.'
    )
  })

  it('Should list the pages no walkthrough reaches, and link the data files', () => {
    const missing = $('h2:contains("Pages no walkthrough reaches") + p + ul li')
    expect(missing.length).toBe(graph.pages.length - 1)
    expect($('a[href="service-map.json"]').length).toBe(1)
    expect($('a[href="screens.json"]').length).toBe(1)
    expect($('main').text()).toContain('Made from the code at abc1234')
  })
})

describe('a map with no branches or task list', () => {
  it('Should leave out the key lines and notes it does not draw', async () => {
    const sample = await buildGraph('sample-journey')
    const $ = cheerio.load(renderMapPage({ graph: sample, screens: {} }))
    const text = $('main').text().replaceAll(/\s+/g, ' ')
    expect(text).toContain('None: every answer goes the same way')
    expect(text).not.toContain('From the task list')
    expect(text).not.toContain('Only for some answers')
    expect(text).not.toContain('tag under a page means')
  })
})

describe('the other pages', () => {
  it('Should list every map on the index, saying which could not be drawn', () => {
    const $ = cheerio.load(
      renderIndexPage({
        maps: [
          { id: 'high-risk-plants', title: 'Today', tag: 'Today’s service' },
          { id: 'broken', title: 'broken', tag: 'x', problem: 'no flow' }
        ]
      })
    )
    expect($('main a[href="high-risk-plants/"]').text()).toBe('Today')
    expect($('main').text()).toContain('could not be drawn this time')
  })

  it('Should explain a map that could not be drawn', () => {
    const $ = cheerio.load(
      renderProblemPage({ setId: 'broken', message: 'it has no flow.' })
    )
    expect($('.govuk-warning-text').text()).toContain('it has no flow.')
  })

  it('Should tag a set the way the demo page does', () => {
    expect(tagOf({ kind: 'real' })).toBe('Today’s service')
    expect(tagOf({ kind: 'release', frozen: true })).toBe('Frozen')
    expect(tagOf({ kind: 'release' }, { changed: true })).toBe(
      'Changed in this pull request'
    )
  })
})
