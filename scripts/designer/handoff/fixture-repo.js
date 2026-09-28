/**
 * Throwaway git repositories for the hand-off tests. Each lives under the
 * system temp folder and is removed by the caller with `removeRepo`.
 * Only imported by `*.test.js` files.
 */
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { git } from './git.js'

export const PROTOTYPE_ROOT = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../..'
)

export const makeRepo = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'handoff-test-'))
  git(['init', '-q', '-b', 'main'], { cwd: root })
  return root
}

export const removeRepo = (root) =>
  rmSync(root, { recursive: true, force: true })

export const writeFiles = (root, files) => {
  for (const [filePath, content] of Object.entries(files)) {
    const target = path.join(root, filePath)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
}

export const readFile = (root, filePath) =>
  readFileSync(path.join(root, filePath), 'utf8')

export const editFile = (root, filePath, from, to) => {
  const content = readFile(root, filePath)
  if (!content.includes(from)) {
    throw new Error(`${filePath} does not contain ${from}`)
  }
  writeFiles(root, { [filePath]: content.replace(from, to) })
}

export const commitAll = (root, message) => {
  git(['add', '-A'], { cwd: root })
  git(
    [
      '-c',
      'user.name=Handoff test',
      '-c',
      'user.email=handoff-test@example.com',
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-q',
      '-m',
      message
    ],
    { cwd: root }
  )
  return git(['rev-parse', 'HEAD'], { cwd: root }).trim()
}

const TRANSPORTERS = 'src/server/app/services/transporters'

/**
 * A prototype-owned service in the shape the prototype builds them: index.js
 * picks stub or client by mode and exports NEEDS_A_REAL_SERVICE and CONTRACT,
 * client.js calls an address from the environment, and stub.js keeps its one
 * prototype-only import.
 */
export const TRANSPORTERS_SERVICE = Object.freeze({
  [`${TRANSPORTERS}/index.js`]: `import { isStubDataMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

export const NEEDS_A_REAL_SERVICE =
  'A transporter register: search, read, add and delete an organisation’s saved transporters. Plants-frontend has none.'

export const TRANSPORTER_TYPES = Object.freeze(['commercial', 'private'])

export const CONTRACT = {
  service: 'transporters',
  owner: 'new-api',
  baseUrlEnv: 'TRADE_IMPORTS_TRANSPORTERS_URL',
  operations: [
    {
      name: 'listTransporters',
      method: 'GET',
      path: '/organisations/{orgId}/transporters',
      params: ['orgId', 'search', 'page'],
      returns: '{ results, total, page, totalPages, pageSize }',
      errors: []
    },
    {
      name: 'createTransporter',
      method: 'POST',
      path: '/organisations/{orgId}/transporters',
      params: ['orgId', 'fields'],
      returns: 'the saved transporter',
      errors: ['400 with a problem body naming each field to fix']
    }
  ],
  record: {
    fields: [
      { name: 'name', type: 'string', required: true },
      {
        name: 'transporterType',
        type: 'string',
        required: true,
        enum: TRANSPORTER_TYPES
      },
      { name: 'approvalNumber', type: 'string', required: false }
    ]
  },
  examples: [
    { id: 'haulage-ltd', name: 'Haulage Ltd', transporterType: 'commercial' }
  ],
  openQuestions: ['Can one organisation see another organisation’s transporters?']
}

const impl = () => (isStubDataMode() ? stub : client)

export const listTransporters = (...args) => impl().listTransporters(...args)

export const createTransporter = (...args) => impl().createTransporter(...args)
`,
  [`${TRANSPORTERS}/client.js`]: `const baseUrl = () => process.env.TRADE_IMPORTS_TRANSPORTERS_URL

export const listTransporters = async (orgId, { search = '', page = 1 } = {}) => {
  const response = await fetch(
    \`\${baseUrl()}/organisations/\${orgId}/transporters?search=\${encodeURIComponent(search)}&page=\${page}\`
  )
  return response.json()
}

export const createTransporter = async (orgId, fields) => {
  const response = await fetch(\`\${baseUrl()}/organisations/\${orgId}/transporters\`, {
    method: 'POST',
    body: JSON.stringify(fields)
  })
  return response.json()
}
`,
  [`${TRANSPORTERS}/stub.js`]: `import { createFakeStore } from '../../../prototype-support/fake-store.js'

const store = createFakeStore({ name: 'transporters', starters: [] })

export const listTransporters = async (orgId) => ({ results: store.visible(orgId) })

export const createTransporter = async (orgId, fields) => store.add(orgId, fields)
`
})

/** overrides.json with the transporters service as its own `ours` line. */
export const OVERRIDES_WITH_TRANSPORTERS = JSON.stringify({
  ours: ['src/server/app/services/transporters/**', 'handoffs/**'],
  patched: [],
  deleted: []
})

/** Copies the real high-risk-plants set from this checkout into `root`. */
export const copyRealJourney = (root) =>
  cpSync(
    path.join(PROTOTYPE_ROOT, 'src/server/app/sets/high-risk-plants'),
    path.join(root, 'src/server/app/sets/high-risk-plants'),
    { recursive: true }
  )
