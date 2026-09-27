import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { parseWordsArgs } from './args.js'
import { findWords } from './find.js'
import { formatFind } from './format.js'
import { REPO_ROOT } from './repo.js'
import { writeReport } from './report.js'

/**
 * Run one `designer:words` command and return what to print and the exit
 * code. Kept apart from `process` so it can be tested.
 *
 * @param {string[]} argv - the arguments after the script name.
 * @param {string} [root] - the repo root.
 * @returns {Promise<{ output: string, code: number }>}
 */
export const runWords = async (argv, root = REPO_ROOT) => {
  const parsed = parseWordsArgs(argv)
  if (parsed.error) {
    return { output: parsed.error, code: 1 }
  }
  try {
    if (parsed.command === 'find') {
      const result = await findWords({
        root,
        text: parsed.text,
        setId: parsed.setId
      })
      return {
        output: parsed.json
          ? JSON.stringify(result, null, 2)
          : formatFind(result),
        code: 0
      }
    }
    const { file, report } = await writeReport({ root, setId: parsed.setId })
    const relative = path.relative(root, file).split(path.sep).join('/')
    const { counts } = report
    return {
      output: parsed.json
        ? JSON.stringify({ file: relative, counts }, null, 2)
        : [
            `Wrote the English and Welsh side by side to ${relative}`,
            `${counts.total} strings: ${counts.marked} marked [Welsh needed], ` +
              `${counts.sameAsEnglish} the same as the English, ` +
              `${counts.missing} with no Welsh.`,
            'Open it in a browser to read the Welsh.'
          ].join('\n'),
      code: 0
    }
  } catch (error) {
    return { output: error.message, code: 1 }
  }
}

const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isEntryPoint) {
  const { output, code } = await runWords(process.argv.slice(2))
  process.stdout.write(`${output}\n`)
  process.exitCode = code
}
