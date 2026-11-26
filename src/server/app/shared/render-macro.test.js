import { describe, expect, it } from 'vitest'

import { templateMacros } from './render-macro.js'

describe('#templateMacros', () => {
  it('Should render a macro of a template with the arguments it is given, escaping their text', () => {
    const { sectionCaption } = templateMacros('shared/section-caption.njk')

    expect(sectionCaption('Origin & route')).toBe(
      '<span class="govuk-caption-l">Origin &amp; route</span>'
    )
  })
})
