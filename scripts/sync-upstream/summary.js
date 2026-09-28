/**
 * Builds the markdown summary for a sync run. Pure string building - no git,
 * no filesystem - so the PR body and the dry-run report come from the same
 * function.
 */

const listOrNone = (items) =>
  items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- none'

const checkLine = ({ name, passed, detail }) =>
  `- ${passed ? '✅' : '❌'} ${name}${detail ? ` - ${detail}` : ''}`

/**
 * The prototype-owned services the real service now has too, each named
 * once, from the rules the sync applied.
 *
 * @param {Array<{ rule: string, service?: string }>} [appliedRules]
 * @returns {string[]} the service names, in the order first met.
 */
export const arrivedServices = (appliedRules = []) => [
  ...new Set(
    appliedRules
      .filter(({ rule }) => rule === 'service-arrived')
      .map(({ service }) => service)
  )
]

/** The maintainer's instruction for one service the real service now has. */
export const serviceArrivedLine = (service) => {
  const folder = `src/server/app/services/${service}`
  return (
    `\`${service}\`: the real plants service now has \`${folder}/\`. ` +
    'The prototype kept its own copy for now. Retire it: ' +
    `run \`npm run designer:service -- retire ${service}\` on a maintain/ branch, ` +
    `then take the real one with \`git checkout upstream/main -- ${folder}\`, ` +
    'and check every page that used the prototype one.'
  )
}

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
    const arrived = arrivedServices(appliedRules)
    if (arrived.length > 0) {
      lines.push(
        '## Real services that arrived',
        listOrNone(arrived.map(serviceArrivedLine)),
        ''
      )
    }
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
 * A clean sync (no conflicts, every check passed, no real service arrived
 * over a prototype-owned one) gets no label and opens ready for review;
 * anything else is flagged for a person to finish.
 */
export const pullRequestDecision = ({
  conflictedPaths,
  checks,
  arrivedServices: arrived = []
}) => {
  const draft =
    conflictedPaths.length > 0 || !allChecksPassed(checks) || arrived.length > 0
  return { draft, label: draft ? NEEDS_PERSON_LABEL : undefined }
}
