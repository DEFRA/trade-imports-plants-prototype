/**
 * Prints a designer:check result: a plain pass or fail table, the lines
 * behind any warning or failure, then each failure in plain English with its
 * fix and the skill that fixes it.
 */
import { NOT_YOURS } from './translate.js'

const RESULT_WORDS = {
  pass: 'Passed',
  warn: 'Check',
  fail: 'FAILED',
  skipped: 'Not run'
}

const TIER_WORDS = {
  quick: 'quick check',
  full: 'full check (the same as the pre-commit hook)',
  walk: 'full check and a browser walk of every journey'
}

const MAX_DETAILS = 12

const pad = (text, width) => text.padEnd(width, ' ')

const table = (steps) => {
  const titleWidth = Math.max(...steps.map((step) => step.title.length))
  const resultWidth = Math.max(
    ...Object.values(RESULT_WORDS).map((word) => word.length)
  )
  return steps.map(
    (step) =>
      `  ${pad(RESULT_WORDS[step.status] ?? step.status, resultWidth)}  ${pad(step.title, titleWidth)}  ${step.summary}`
  )
}

const detailBlock = (step) => {
  const shown = step.details.slice(0, MAX_DETAILS)
  const more = step.details.length - shown.length
  return [
    '',
    `${step.title}:`,
    ...shown.map((line) => `  - ${line}`),
    ...(more > 0 ? [`  - and ${more} more (see the log)`] : [])
  ]
}

const findingBlock = (finding, index) => [
  '',
  `${index + 1}. ${finding.title} (${finding.step})`,
  `   What happened: ${finding.cause}`,
  ...(finding.where?.length > 0
    ? ['   Where:', ...finding.where.map((line) => `     - ${line}`)]
    : []),
  `   How to fix it: ${finding.fix}`,
  `   Skill that fixes it: ${finding.skill}`,
  ...(finding.attribution === 'not-yours' ? [`   ${NOT_YOURS}`] : [])
]

const verdict = (result) => {
  if (!result.ok) {
    const count = result.findings.length
    return `Result: ${count} ${count === 1 ? 'problem' : 'problems'} to fix before this can be saved.`
  }
  return result.tier === 'quick'
    ? 'Result: the quick check passed.'
    : 'Result: everything passed. A commit made now will pass the pre-commit hook.'
}

/**
 * @param {object} result - what runCheck returns.
 * @param {{logPath: string}} options - the repo-relative log file.
 * @returns {string} the whole report.
 */
export const formatReport = (result, { logPath }) => {
  const withDetails = result.steps.filter(
    (step) =>
      (step.status === 'fail' || step.status === 'warn') &&
      step.details?.length > 0
  )
  const needsFull =
    result.tier === 'quick' && result.suggestion?.tier !== 'quick'
  return [
    `Checked ${result.setId}: ${TIER_WORDS[result.tier]}`,
    '',
    ...table(result.steps),
    ...withDetails.flatMap(detailBlock),
    ...(result.findings.length > 0 ? ['', 'What went wrong:'] : []),
    ...result.findings.flatMap(findingBlock),
    '',
    verdict(result),
    ...(needsFull ? [`Next: ${result.suggestion.reason}`] : []),
    `Full log: ${logPath}`
  ].join('\n')
}

/** The same result as JSON, for skills and workflows. */
export const formatJson = (result, { logPath }) =>
  JSON.stringify({ ...result, log: logPath }, null, 2)
