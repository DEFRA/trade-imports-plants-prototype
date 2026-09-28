import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/**
 * `npm run reports:merge -- <folder of blob reports>`: the FIT tests and the
 * walkthroughs, each run in its own pull request job, merged into the one
 * Playwright report CI publishes to GitHub Pages, with a JSON copy for the
 * pull request comment (scripts/reports/pr-comment.js). REPORT_TITLE names it.
 */
const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../..')

export default {
  testDir: repoRoot,
  reporter: [
    [
      'html',
      {
        outputFolder: path.join(repoRoot, 'playwright-report'),
        open: 'never',
        title: process.env.REPORT_TITLE ?? 'Plants prototype'
      }
    ],
    ['json', { outputFile: path.join(repoRoot, 'merged', 'report.json') }]
  ]
}
