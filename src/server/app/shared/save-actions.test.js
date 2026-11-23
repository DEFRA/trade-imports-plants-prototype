import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import {
  documentOf,
  trimmedTextOf
} from '../../common/test-helpers/document-of.js'
import { copy as sharedEn } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderActions = (args) =>
  environment.renderString(
    `{% from "shared/save-actions.njk" import saveActions %}{{ saveActions(${args}) }}`,
    { hubHref: '/notifications/journey-1/hub', copy: sharedEn.saveActions }
  )

const withReturnControls = '{ hubHref: hubHref, copy: copy }'
const withoutReturnControls =
  '{ hubHref: hubHref, copy: copy, showReturnControls: false }'

const EXIT_NAME_ATTRIBUTE = 'name="exit"'
const BUTTON_GROUP = 'class="govuk-button-group"'

describe('#saveActions', () => {
  it('Should end a page the hub links to with the primary and both return controls', () => {
    const html = renderActions(withReturnControls)

    expect(html).toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).toContain('href="/notifications/journey-1/hub"')
  })

  it('Should put Cancel and return to overview on its own line below the two buttons', () => {
    const [group, afterGroup] =
      renderActions(withReturnControls).split('</div>')

    expect(group).toContain(BUTTON_GROUP)
    expect(group).toContain(sharedEn.saveActions.saveAndContinue)
    expect(group).toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(group).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(afterGroup).toContain(sharedEn.saveActions.cancelAndReturnToHub)
  })

  it('Should submit the hub exit the controllers read from the secondary button', () => {
    const html = renderActions(withReturnControls)

    const secondary = html
      .split('<button')
      .find((fragment) =>
        fragment.includes(sharedEn.saveActions.saveAndReturnToHub)
      )

    expect(secondary).toContain(EXIT_NAME_ATTRIBUTE)
    expect(secondary).toContain('value="hub"')
  })

  it('Should end a page reached from another page with the primary alone', () => {
    const html = renderActions(withoutReturnControls)

    expect(html).toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).not.toContain(EXIT_NAME_ATTRIBUTE)
  })

  it('Should keep the button group so the primary sits with whatever follows it', () => {
    expect(renderActions(withoutReturnControls)).toContain(BUTTON_GROUP)
  })

  it('Should let a page reached from another page name its own primary and show it alone', () => {
    const html = renderActions(
      '{ hubHref: hubHref, primary: { text: "Save and finish", name: "action", value: "finish" }, copy: copy, showReturnControls: false }'
    )

    expect(html).toContain('Save and finish')
    expect(html).not.toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
  })

  it('Should put the buttons it is given straight after the primary, inside the group, before Save and return to overview', () => {
    const group = documentOf(
      renderActions(
        '{ hubHref: hubHref, buttonsAfterPrimary: [{ text: "Extra one", href: "/one", classes: "govuk-button--secondary" }, { text: "Extra two", href: "/two", classes: "govuk-button--warning" }], copy: copy }'
      )
    ).querySelector('.govuk-button-group')
    const controls = [...group.children]

    expect(controls.map(trimmedTextOf)).toEqual([
      sharedEn.saveActions.saveAndContinue,
      'Extra one',
      'Extra two',
      sharedEn.saveActions.saveAndReturnToHub
    ])
    expect(controls[1].tagName).toBe('A')
    expect(controls[1].getAttribute('href')).toBe('/one')
    expect(controls[1].classList.contains('govuk-button')).toBe(true)
    expect(controls[1].classList.contains('govuk-button--secondary')).toBe(true)
    expect(controls[2].tagName).toBe('A')
    expect(controls[2].getAttribute('href')).toBe('/two')
    expect(controls[2].classList.contains('govuk-button')).toBe(true)
    expect(controls[2].classList.contains('govuk-button--warning')).toBe(true)
  })

  it('Should keep the return controls when a hub-linked page names its own primary', () => {
    const html = renderActions(
      '{ hubHref: hubHref, primary: { text: "Save and finish", name: "action", value: "finish" }, copy: copy }'
    )

    expect(html).toContain('Save and finish')
    expect(html).toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).toContain(EXIT_NAME_ATTRIBUTE)
  })
})
