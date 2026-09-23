/**
 * The boot-time completeness check.
 *
 * Several sets share one process, so a set that forgets a `configure*` call
 * does not fail — it answers from the seam's unconfigured default and renders
 * an empty dashboard to a reader, while the other sets carry on as normal.
 * These cases pin the refusal that replaces that: naming the set and the seam,
 * at mount, before the server can start.
 */
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { assertSetMounted, mountSet } from './set-mount.js'
import { feature, scalar } from './bridge/fulfilment-bindings.js'
import { configureFulfilmentRegistry } from './bridge/fulfilment-registry.js'
import { buildDispatch } from './flow/dispatch.js'
import { configureJourneyFlow } from './flow/journey-flow.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { registerJourneyCookie } from './engine/journey.js'
import { registerSetMount, withSetContext } from './shared/set-context.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import { createServer } from '../server.js'
import { SET_ID as HIGH_RISK_PLANTS } from './sets/high-risk-plants/set.js'
import { SET_ID as SAMPLE_JOURNEY } from './sets/sample-journey/set.js'
import {
  dispatchPages,
  groups,
  obligations,
  records,
  shipmentReference
} from '../../../test/fixtures/second-set.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve({}))
}))

const DETAILS = 'details'
const LAYOUT = 'shared/layout.njk'

const journeyFlow = {
  sections: [{ id: DETAILS, pages: [{ id: DETAILS, slug: DETAILS }] }],
  taskRows: [],
  rowStatus: () => 'notStarted',
  nextRunTarget: () => null,
  flowOnlyKeys: [],
  entryGuardTarget: async () => null,
  layout: LAYOUT
}

const cookieNamesFor = (setId) => ({
  knownJourneys: `${setId}KnownJourneys`,
  openingRun: `${setId}OpeningRun`,
  flowOnlyAnswers: `${setId}FlowOnlyAnswers`
})

/** The labels the seams themselves use, which are the labels the refusal names. */
const SEAM = {
  obligationSet: 'Obligation set',
  fulfilmentRegistry: 'Fulfilment registry',
  journeyFlow: 'journey flow',
  dispatch: 'dispatch',
  records: 'records',
  session: 'session'
}

/**
 * The same seams `set-mount.js` requires, each wired the way the smallest real
 * gateway wires it. Ordered: the fulfilment registry and the dispatch index
 * are both built against the obligation set, so that one goes first.
 */
const SEAMS = [
  [
    SEAM.obligationSet,
    (setId) => configureObligationSet(setId, { obligations, groups })
  ],
  [
    SEAM.fulfilmentRegistry,
    (setId) =>
      configureFulfilmentRegistry(setId, [
        feature(DETAILS, [
          scalar({
            field: shipmentReference.name,
            obligation: shipmentReference
          })
        ])
      ])
  ],
  [SEAM.journeyFlow, (setId) => configureJourneyFlow(setId, journeyFlow)],
  [SEAM.dispatch, (setId) => buildDispatch(setId, dispatchPages)],
  [SEAM.records, (setId) => configureRecords(setId, records)],
  [
    SEAM.session,
    (setId) => configureSession(setId, sessionStub, cookieNamesFor(setId))
  ]
]

const baseOf = (setId) => `/${setId}`

/**
 * A gateway with nothing in it but the wiring: no routes, no templates. What
 * it skips, and whether it registers its cookies before or after the session
 * seam, is what each case varies.
 */
const setPlugin = (setId, { skip = [], cookiesFirst = false } = {}) => ({
  plugin: {
    name: setId,
    register: async (server) => {
      registerSetMount(setId, baseOf(setId))
      await withSetContext(setId, async () => {
        if (cookiesFirst) {
          registerJourneyCookie(server, { base: baseOf(setId) })
        }
        for (const [label, wire] of SEAMS) {
          if (!skip.includes(label)) {
            wire(setId)
          }
        }
        if (!cookiesFirst) {
          registerJourneyCookie(server, { base: baseOf(setId) })
        }
      })
    }
  }
})

const mount = (setId, options) =>
  mountSet(Hapi.server(), setPlugin(setId, options), {
    setId,
    base: baseOf(setId)
  })

describe('mounting a set — a set that configured every seam', () => {
  it('Should mount', async () => {
    await expect(mount('complete-set')).resolves.toBeUndefined()
  })
})

describe('mounting a set — a set that skipped a seam', () => {
  it.each([
    {
      seam: SEAM.records,
      configure: 'configureRecords',
      skip: [SEAM.records]
    },
    {
      seam: SEAM.session,
      configure: 'configureSession',
      skip: [SEAM.session]
    },
    {
      seam: SEAM.journeyFlow,
      configure: 'configureJourneyFlow',
      skip: [SEAM.journeyFlow]
    },
    {
      seam: SEAM.dispatch,
      configure: 'buildDispatch',
      skip: [SEAM.dispatch]
    },
    {
      seam: SEAM.fulfilmentRegistry,
      configure: 'configureFulfilmentRegistry',
      skip: [SEAM.fulfilmentRegistry]
    },
    {
      // The registry and the dispatch index are both built from the obligation
      // set and each throws on its own without it, so a set that skips the
      // obligation set skips those two as well.
      seam: SEAM.obligationSet,
      configure: 'configureObligationSet',
      skip: [SEAM.obligationSet, SEAM.fulfilmentRegistry, SEAM.dispatch]
    }
  ])(
    'Should refuse to mount a set with no $seam seam',
    async ({ seam, configure, skip }) => {
      const setId = `no-${configure}-set`

      // The set and the seam both by name: with several sets mounted, which
      // set broke the boot is the fact a reader of the crash needs first.
      await expect(mount(setId, { skip })).rejects.toThrow(
        new RegExp(`"${setId}".*${seam} \\(${configure}\\)`, 's')
      )
    }
  )

  it('Should name every seam a set skipped, not only the first', async () => {
    const setId = 'no-store-set'

    await expect(
      mount(setId, { skip: [SEAM.records, SEAM.session] })
    ).rejects.toThrow(
      /records \(configureRecords\), session \(configureSession\)/
    )
  })

  it('Should say why an unconfigured seam is worth refusing to boot over', async () => {
    await expect(
      mount('silent-set', { skip: [SEAM.journeyFlow] })
    ).rejects.toThrow(/renders an empty page instead of failing/)
  })
})

describe('mounting a set — seams configured out of order', () => {
  it('Should refuse a set that registered its journey cookies before its session seam', async () => {
    const setId = 'cookies-first-set'

    // registerJourneyCookie reads its names from the session seam, so running
    // it first registers the shared defaults and the set then reads cookies
    // the server never registered — silent until a reader loses their draft.
    await expect(mount(setId, { cookiesFirst: true })).rejects.toThrow(
      new RegExp(
        `"${setId}".*${setId}KnownJourneys.*registerJourneyCookie\\(\\) must run after configureSession\\(\\)`,
        's'
      )
    )
  })
})

describe('mounting a set — the shipped sets', () => {
  let server

  beforeAll(async () => {
    // The real composition root, so this fails if either shipped gateway stops
    // configuring a seam — the check is worth nothing if it only ever sees
    // sets this file wrote.
    server = await createServer()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it.each([HIGH_RISK_PLANTS, SAMPLE_JOURNEY])(
    'Should mount %s with every seam configured',
    (setId) => {
      expect(() => assertSetMounted(server, setId)).not.toThrow()
    }
  )
})
