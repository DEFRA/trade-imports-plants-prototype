/**
 * Builds the markdown summary for a sync run. Pure string building - no git,
 * no filesystem - so the PR body and the dry-run report come from the same
 * function.
 */

const listOrNone = (items) =>
  items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- none'

const checkLine = ({ name, passed, detail }) =>
  `- ${passed ? '✅' : '❌'} ${name}${detail ? ` - ${detail}` : ''}`

export const buildSummary = ({
  branch,
  mergedCommits,
  appliedRules,
  conflictedPaths,
  checks,
  merged
}) => {
  const lines = [
    `# Upstream sync - ${branch}`,
    '',
    merged
      ? 'upstream/main was already merged. Nothing to do.'
      : `Merged ${mergedCommits.length} upstream commit(s).`,
    ''
  ]

  if (!merged) {
    lines.push(
      '## Upstream commits merged',
      listOrNone(
        mergedCommits.map(({ hash, subject }) => `\`${hash}\` ${subject}`)
      ),
      '',
      '## Rules applied',
      listOrNone(
        appliedRules.map(({ path, rule }) => `\`${path}\` -> ${rule}`)
      ),
      '',
      '## Conflicts',
      conflictedPaths.length > 0
        ? listOrNone(conflictedPaths)
        : '- none - the merge resolved cleanly',
      '',
      '## Checks',
      listOrNone(checks.map(checkLine))
    )
  }

  return lines.join('\n') + '\n'
}

export const allChecksPassed = (checks) => checks.every((check) => check.passed)

export const NEEDS_PERSON_LABEL = 'needs-person'

/**
 * Whether the PR needs a person: the same condition that makes it a draft.
 * A clean sync (no conflicts, every check passed) gets no label and opens
 * ready for review; anything else is flagged for a person to finish.
 */
export const pullRequestDecision = ({ conflictedPaths, checks }) => {
  const draft = conflictedPaths.length > 0 || !allChecksPassed(checks)
  return { draft, label: draft ? NEEDS_PERSON_LABEL : undefined }
}
