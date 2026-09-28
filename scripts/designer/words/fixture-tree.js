/* eslint-disable no-template-curly-in-string -- the fixtures are source text
   that holds template literals, written out as plain strings */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const RELEASE = 'src/server/app/sets/plants-working'
const RELEASE_LINEAR = `${RELEASE}/journeys/linear`
const REAL = 'src/server/app/sets/high-risk-plants'

/**
 * A small prototype tree: one design release (plants-working), a slice of
 * the real journey (high-risk-plants), the shared chrome, and the tests and
 * specs that pin the real journey's words. Written to a temporary folder so
 * no test runner or checker ever finds these files in the repo.
 */
export const FIXTURE_FILES = {
  'src/server/app/shared/copy.en.js': [
    'export const copy = {',
    '  saveActions: {',
    "    saveAndContinue: 'Save and continue'",
    '  }',
    '}',
    '',
    'export const validatorDefaults = {',
    '  maxLength: (max) => `Enter ${max} characters or fewer`',
    '}',
    ''
  ].join('\n'),
  'src/server/app/shared/copy.cy.js': [
    'export const copy = {',
    '  saveActions: {',
    "    saveAndContinue: 'Cadw a pharhau'",
    '  }',
    '}',
    '',
    'export const validatorDefaults = {',
    '  maxLength: (max) => `Rhowch ${max} nod neu lai`',
    '}',
    ''
  ].join('\n'),
  'src/server/app/shared/layout.njk':
    '<a href="#">Save and continue later</a>\n',
  [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
  [`${RELEASE}/release.json`]: JSON.stringify({
    purpose: 'working',
    frozen: false
  }),
  [`${RELEASE_LINEAR}/flow/flow.js`]: [
    "import { consignorPage } from '../features/consignor-select/page.js'",
    "import { notificationViewPage } from '../features/check-answers/page.js'",
    'export const sections = [',
    "  { id: 'parties', pages: [consignorPage] },",
    "  { id: 'review', pages: [notificationViewPage] }",
    ']',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/flow/section-captions/index.js`]: [
    "import { consignorPage } from '../../features/consignor-select/page.js'",
    'export const captionSections = [',
    "  { id: 'consignmentParties', pages: [consignorPage] }",
    ']',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/flow/section-captions/copy/copy.en.js`]: [
    'export const copy = {',
    '  sections: {',
    "    consignmentParties: 'Consignment parties'",
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/flow/section-captions/copy/copy.cy.js`]: [
    'export const copy = {',
    '  sections: {',
    "    consignmentParties: '[Welsh needed] Consignment parties'",
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/features/consignor-select/page.js`]:
    "export const consignorPage = { id: 'consignor-select', slug: 'consignors/select' }\n",
  [`${RELEASE_LINEAR}/features/consignor-select/copy/copy.en.js`]: [
    'export const copy = {',
    "  title: 'Consignor or exporter',",
    '  errors: {',
    "    consignor: 'Select the consignor or exporter'",
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/features/consignor-select/copy/copy.cy.js`]: [
    'export const copy = {',
    "  title: 'Consignor or exporter',",
    '  errors: {',
    "    consignor: 'Dewiswch yr anfonwr neu allforiwr'",
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/features/consignor-select/template.njk`]: [
    '{% block journeyContent %}',
    '  <h1 class="govuk-heading-l">{{ copy.title }}</h1>',
    '  <p class="govuk-body">Choose a consignor from your address book.</p>',
    '  {{ govukButton({',
    '    text: "Use this consignor"',
    '  }) }}',
    '  {# Consignor comment is not shown #}',
    '{% endblock %}',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/features/check-answers/page.js`]:
    "export const notificationViewPage = { id: 'notification-view', slug: 'notification-view' }\n",
  [`${RELEASE_LINEAR}/features/check-answers/view-model.js`]:
    "import { copy } from '../consignor-select/copy/copy.en.js'\nexport const label = copy.title\n",
  [`${RELEASE_LINEAR}/features/check-answers/copy/copy.en.js`]: [
    'export const copy = {',
    '  sections: {',
    "    parties: '3. Consignment parties'",
    '  },',
    '  late: {',
    '    warning: (days) => `Submit ${days} days before arrival.`',
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/features/check-answers/copy/copy.cy.js`]: [
    'export const copy = {',
    '  sections: {',
    "    parties: '3. Partïon y llwyth'",
    '  },',
    '  late: {',
    '    warning: (days) => `Cyflwynwch ${days} diwrnod cyn cyrraedd.`',
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/features/hub/copy/copy.en.js`]: [
    'export const copy = {',
    '  groups: {',
    "    'consignment-parties': '3. Consignment parties'",
    '  }',
    '}',
    '',
    "// AWAITING THE COPY PASS: 'Consignment",
    "// parties' is a new task list group.",
    ''
  ].join('\n'),
  [`${RELEASE_LINEAR}/features/hub/copy/copy.cy.js`]: [
    'export const copy = {',
    '  groups: {',
    "    'consignment-parties': '3. Partïon y llwyth'",
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${REAL}/set.js`]: "export const SET_ID = 'high-risk-plants'\n",
  [`${REAL}/journeys/linear/features/hub/copy/copy.en.js`]: [
    'export const copy = {',
    '  groups: {',
    "    'consignment-parties': '3. Consignment parties'",
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${REAL}/journeys/linear/features/hub/copy/copy.cy.js`]: [
    'export const copy = {',
    '  groups: {',
    "    'consignment-parties': '3. Partïon y llwyth'",
    '  }',
    '}',
    ''
  ].join('\n'),
  [`${REAL}/journeys/linear/features/hub/copy/copy.test.js`]: [
    "import { copy } from './copy.en.js'",
    "expect(copy.groups['consignment-parties']).toBe('3. Consignment parties')",
    "expect(cy.groups['consignment-parties']).toBe('3. Partïon y llwyth')",
    ''
  ].join('\n'),
  'src/server/app/shared/section-caption.test.js':
    "expect(render('Consignment parties')).toContain('Consignment parties')\n",
  'fit/journey.fit.spec.js':
    "await expect(page.getByText('Consignment parties')).toBeVisible()\n"
}

/**
 * Write the fixture tree to a fresh temporary folder.
 *
 * @returns {{ root: string, remove: () => void }}
 */
export const makeFixtureTree = (files = FIXTURE_FILES) => {
  const root = mkdtempSync(path.join(tmpdir(), 'designer-words-'))
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
  return {
    root,
    remove: () => rmSync(root, { recursive: true, force: true })
  }
}
