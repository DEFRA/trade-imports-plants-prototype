import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'

export const TABS = Object.freeze({
  inProgress: Object.freeze([DRAFT, AMEND]),
  drafts: Object.freeze([DRAFT]),
  completed: Object.freeze([SUBMITTED])
})
