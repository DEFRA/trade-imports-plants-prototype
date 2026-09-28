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

import { classifyPath, oursAction } from './rules.js'
import {
  arrivedServices,
  buildSummary,
  pullRequestDecision
} from './summary.js'
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

const DEFAULT_GIT = Object.freeze({
  statusPorcelain,
  removePath,
  restoreOurs
})

/** Carries out what `oursAction` decided for one `ours` path. */
const applyOurs = (touchedPath, decision, git) => {
  const keep =
    decision.action === 'service-arrived' ? decision.keep : decision.action
  if (keep === 'remove') {
    git.removePath(touchedPath)
  } else if (keep === 'checkout-ours') {
    git.restoreOurs(touchedPath, { conflicted: true })
  } else if (keep === 'checkout-head') {
    git.restoreOurs(touchedPath, { conflicted: false })
  } else {
    // `leave`: a file git does not track; the merge never touched it.
  }
}

/**
 * Applies overrides.json to every path the merge touched: deleted paths are
 * removed, `ours` paths keep our side (see `oursAction`), everything else is
 * left as the merge made it.
 *
 * @param {object} overrides - overrides.json, parsed.
 * @param {object} [git] - the git calls, swappable in tests.
 * @returns {Array<{ path: string, rule: string, service?: string }>} what
 * happened to each path; `rule` is `service-arrived` when the real service
 * added a path inside a prototype-owned service folder.
 */
export const applyOverrideRules = (overrides, git = DEFAULT_GIT) =>
  git.statusPorcelain().map(({ code, path: touchedPath }) => {
    const rule = classifyPath(touchedPath, overrides)
    if (rule === 'deleted') {
      git.removePath(touchedPath)
      return { path: touchedPath, rule }
    }
    if (rule !== 'ours') {
      return { path: touchedPath, rule }
    }
    const decision = oursAction(code, touchedPath, overrides)
    applyOurs(touchedPath, decision, git)
    return decision.action === 'service-arrived'
      ? {
          path: touchedPath,
          rule: 'service-arrived',
          service: decision.service
        }
      : { path: touchedPath, rule }
  })

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
  checks,
  appliedRules
}) => {
  pushBranch(branch)
  const { draft, label } = pullRequestDecision({
    conflictedPaths,
    checks,
    arrivedServices: arrivedServices(appliedRules)
  })
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
  setRepoRoot(REPO_ROOT)
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
      checks,
      appliedRules
    })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
