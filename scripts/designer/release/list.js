import {
  byChooserOrder,
  longDate,
  releaseInfoFor
} from '../../../src/server/prototype-sets/releases.js'
import { setIdsIn, setsDirOf } from './sets.js'

/**
 * Every set in the checkout with what a designer needs to pick one: what
 * kind it is, what it was made from and when, whether it is frozen, whether
 * research mode is on and how many design gaps it has logged. In the
 * chooser's order.
 */
export const listReleases = (repoRoot) =>
  setIdsIn(repoRoot)
    .map((setId) => releaseInfoFor(setId, { setsDir: setsDirOf(repoRoot) }))
    .toSorted(byChooserOrder)
    .map((info) => ({
      id: info.setId,
      purpose: info.tag,
      from: info.from ?? '-',
      madeOn: info.createdAt ? longDate(info.createdAt) : '-',
      frozen: info.frozen ? 'yes' : 'no',
      researchMode: info.researchMode ? 'on' : 'off',
      designGaps: info.designGaps
    }))

const COLUMNS = [
  ['id', 'Release'],
  ['purpose', 'Kind'],
  ['from', 'Made from'],
  ['madeOn', 'Made on'],
  ['frozen', 'Frozen'],
  ['researchMode', 'Research mode'],
  ['designGaps', 'Design gaps']
]

/** The list as a plain text table. */
export const formatList = (rows) => {
  const cells = [
    COLUMNS.map(([, heading]) => heading),
    ...rows.map((row) => COLUMNS.map(([key]) => String(row[key])))
  ]
  const widths = COLUMNS.map((_, column) =>
    Math.max(...cells.map((line) => line[column].length))
  )
  return cells
    .map((line) =>
      line
        .map((cell, column) => cell.padEnd(widths[column]))
        .join('  ')
        .trimEnd()
    )
    .join('\n')
}
