import { welcomePage } from '../features/welcome/page.js'

export const FLOW_ONLY_KEYS = []

export const sections = [{ id: 'welcome', pages: [welcomePage] }]

export const taskRows = []

export const rowStatus = () => 'notStarted'

/** One page and no flow, so there is never a next target to run to. */
export const nextRunTarget = () => null

/** Nothing to guard: the set's only page is its entry page. */
export const entryGuardTarget = async () => null
