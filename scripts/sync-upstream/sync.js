#!/usr/bin/env node
/**
 * Syncs this prototype from trade-imports-plants-frontend.
 *
 * Fetches upstream/main, merges it onto a dated branch, applies the rules in
 * overrides.json (deleted paths stay deleted, our paths always win, every
 * other path merges normally), runs the same checks CI does, writes a
 * markdown summary and - only with --push - opens a PR for a person to
 * finish anything left conflicted.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { classifyPath } from './rules.js'
import { buildSummary, pullRequestDecision } from './summary.js'
import { runAllChecks } from './checks.js'
import {
  commit,
  createPullRequest,
  createSyncBranch,
  currentBranch,
  ensureLabel,
  ensureUpstreamRemote,
  fetchUpstreamMain,
  isUnmerged,
  mergeUpstream,
  mergedCommitLog,
  pushBranch,
  removePath,
  restoreOurs,
  setRepoRoot,
  stageAll,
  statusPorcelain,
  upstreamAlreadyMerged
} from './git.js'

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')

setRepoRoot(REPO_ROOT)

const parseArgs = (argv) => {
  const push = argv.includes('--push')
  const summaryIndex = argv.indexOf('--summary')
  const summaryPath = summaryIndex === -1 ? undefined : argv[summaryIndex + 1]
  return { push, summaryPath }
}

const loadOverrides = () =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, 'overrides.json'), 'utf8'))

const branchNameForToday = () => {
  const isoDate = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length)
  return `sync/upstream-${isoDate}`
}

const applyOverrideRules = (overrides) => {
  const touched = statusPorcelain()
  return touched.map(({ code, path: touchedPath }) => {
    const rule = classifyPath(touchedPath, overrides)
    if (rule === 'deleted') {
      removePath(touchedPath)
    } else if (rule === 'ours') {
      restoreOurs(touchedPath, { conflicted: isUnmerged(code) })
    }
    return { path: touchedPath, rule }
  })
}

const remainingConflicts = () =>
  statusPorcelain()
    .filter(({ code }) => isUnmerged(code))
    .map(({ path: conflictedPath }) => conflictedPath)

const writeSummary = (summaryPath, summaryText) => {
  if (summaryPath) {
    writeFileSync(summaryPath, summaryText)
  } else {
    process.stdout.write(summaryText)
  }
}

const openPullRequest = ({
  branch,
  summaryPath,
  summaryText,
  conflictedPaths,
  checks
}) => {
  pushBranch(branch)
  const { draft, label } = pullRequestDecision({ conflictedPaths, checks })
  if (label) {
    ensureLabel(label, {
      color: 'd73a4a',
      description:
        "Needs a person to look at this - the sync couldn't finish it alone"
    })
  }
  const bodyFile =
    summaryPath ?? path.join(REPO_ROOT, '.sync-upstream-summary.md')
  if (!summaryPath) {
    writeFileSync(bodyFile, summaryText)
  }
  createPullRequest({
    title: `Sync upstream/main - ${branch}`,
    bodyFile,
    draft,
    label,
    branch
  })
}

const main = () => {
  const { push, summaryPath } = parseArgs(process.argv.slice(2))

  ensureUpstreamRemote()
  fetchUpstreamMain()

  if (upstreamAlreadyMerged()) {
    writeSummary(
      summaryPath,
      buildSummary({
        branch: currentBranch(),
        mergedCommits: [],
        appliedRules: [],
        conflictedPaths: [],
        checks: [],
        merged: true
      })
    )
    return
  }

  const branch = createSyncBranch(branchNameForToday())
  const mergedCommits = mergedCommitLog()
  mergeUpstream()

  const overrides = loadOverrides()
  const appliedRules = applyOverrideRules(overrides)
  const conflictedPaths = remainingConflicts()

  stageAll()
  commit(
    conflictedPaths.length > 0
      ? `chore: sync upstream/main (conflicts in ${conflictedPaths.length} file(s))`
      : 'chore: sync upstream/main'
  )

  const checks = runAllChecks(REPO_ROOT)
  const summaryText = buildSummary({
    branch,
    mergedCommits,
    appliedRules,
    conflictedPaths,
    checks,
    merged: false
  })
  writeSummary(summaryPath, summaryText)

  if (push) {
    openPullRequest({
      branch,
      summaryPath,
      summaryText,
      conflictedPaths,
      checks
    })
  }
}

main()
