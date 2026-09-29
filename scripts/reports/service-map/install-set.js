/**
 * Installs one set's journey in this process, with no server: the same seams
 * a set's gateway (`src/server/app/routes-<id>.js`) configures when it
 * mounts, read from the set's own files, so the service map asks the real
 * engine where each page goes. Records, the session and cookies are left
 * unconfigured: the map never makes a request.
 *
 * Nothing here is set-specific. A design release is installed the same way
 * as the real journey, from its own folder, and the stores the platform keeps
 * are keyed by set, so one process can install and map every set in turn.
 *
 * The platform modules are imported from the same checkout as the set, so a
 * set's own relative imports and this installer always meet the same module
 * instances.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { REPO_ROOT } from '../../designer/lib/repo.js'
import { SETS_DIR } from '../../designer/lib/sets.js'

export const JOURNEY = 'journeys/linear'
const APP_DIR = 'src/server/app'

/** A set whose map cannot be drawn, said in one plain sentence. */
export class ServiceMapProblem extends Error {}

const PLATFORM_FILES = Object.freeze({
  setContext: 'shared/set-context.js',
  paths: 'shared/paths.js',
  readiness: 'bridge/readiness-config.js',
  sectionStatus: 'flow/section-status.js',
  manifest: 'model/obligations/manifest.js',
  registry: 'bridge/fulfilment-registry.js',
  journeyFlow: 'flow/journey-flow.js',
  dispatch: 'flow/dispatch.js',
  gates: 'flow/gates.js',
  navigation: 'flow/navigation.js',
  prerequisites: 'flow/prerequisites.js',
  obligationSource: 'bridge/obligation-source.js',
  evaluation: 'bridge/evaluation.js',
  scope: 'bridge/scope.js',
  status: 'bridge/status/index.js',
  helpers: 'model/obligations/helpers/index.js',
  reachability: 'model/analysis/reachability/index.js',
  flowReachability: 'analysis/flow-reachability/index.js'
})

const importFile = (file) => import(pathToFileURL(file).href)

const importIfThere = async (file) =>
  existsSync(file) ? importFile(file) : null

/**
 * The platform modules the map reads through, from `root`'s own
 * `src/server/app`.
 *
 * @param {{ root?: string }} [options]
 * @returns {Promise<Record<string, object>>}
 */
export const loadPlatform = async ({ root = REPO_ROOT } = {}) => {
  const platform = {}
  for (const [name, file] of Object.entries(PLATFORM_FILES)) {
    platform[name] = await importFile(path.join(root, APP_DIR, file))
  }
  return platform
}

const requiredFile = async (file, { setId, setDir, what }) => {
  if (!existsSync(file)) {
    throw new ServiceMapProblem(
      `${setId} has no ${what} (${path.relative(setDir, file)}), so its map cannot be drawn.`
    )
  }
  return importFile(file)
}

const noRunTarget = () => null
const noGuard = async () => null
const notStarted = () => 'notStarted'

/**
 * Installs `setId` and returns what the map reads: its flow, task rows,
 * opening run, hub groups and routes, the platform modules, and `within`,
 * which runs a function inside the set's context.
 *
 * @param {string} setId
 * @param {{ root?: string }} [options]
 * @returns {Promise<object>}
 * @throws {ServiceMapProblem} when the set or one of its required files is
 *   missing.
 */
export const installSet = async (setId, { root = REPO_ROOT } = {}) => {
  const setDir = path.join(root, SETS_DIR, setId)
  if (!existsSync(path.join(setDir, 'set.js'))) {
    throw new ServiceMapProblem(`There is no set called "${setId}".`)
  }
  const journeyDir = path.join(setDir, JOURNEY)
  const need = (relativePath, what) =>
    requiredFile(path.join(setDir, relativePath), { setId, setDir, what })
  const optional = (relativePath) =>
    importIfThere(path.join(journeyDir, relativePath))

  const platform = await loadPlatform({ root })
  const set = await need('set.js', 'set.js')
  const obligationSet = await need('obligations/index.js', 'obligations')
  const features = await need(`${JOURNEY}/features/index.js`, 'list of pages')
  const evaluation = await need(
    `${JOURNEY}/features/evaluation.js`,
    'evaluation bindings'
  )
  const flow = await need(`${JOURNEY}/flow/flow.js`, 'flow')
  const rows = (await optional('flow/task-rows.js')) ?? flow
  const run = (await optional('flow/run.js')) ?? flow
  const guard = (await optional('flow/entry-guard.js')) ?? flow
  const captions = await optional('flow/section-captions/index.js')
  const hub = await optional('features/hub/controller.js')
  const config = await optional('config.js')

  const { SET_ID, SET_BASE } = set
  platform.setContext.registerSetMount(SET_ID, SET_BASE)
  platform.readiness.configureReadyForCheckYourAnswers(
    SET_ID,
    platform.sectionStatus.readyForCheckYourAnswers
  )
  platform.manifest.configureObligationSet(SET_ID, obligationSet)
  platform.registry.configureFulfilmentRegistry(
    SET_ID,
    evaluation.featureEvaluationBindings
  )
  platform.journeyFlow.configureJourneyFlow(SET_ID, {
    sections: flow.sections,
    taskRows: rows.taskRows ?? [],
    rowStatus: rows.rowStatus ?? notStarted,
    nextRunTarget: run.nextRunTarget ?? noRunTarget,
    flowOnlyKeys: flow.FLOW_ONLY_KEYS ?? [],
    entryGuardTarget: guard.entryGuardTarget ?? noGuard,
    sectionCaption: captions?.sectionCaptionOf,
    layout: config?.LAYOUT
  })
  platform.dispatch.buildDispatch(SET_ID, features.dispatchPages ?? [])

  return {
    setId: SET_ID,
    setBase: SET_BASE,
    root,
    setDir,
    journeyDir,
    platform,
    sections: flow.sections ?? [],
    taskRows: rows.taskRows ?? [],
    runSteps: run.RUN_STEPS ?? [],
    groups: hub?.GROUPS ?? [],
    allRoutes: features.allRoutes ?? [],
    within: (fn) => platform.setContext.withSetContext(SET_ID, fn)
  }
}
