export const USAGE = [
  'Usage:',
  '  npm run designer:words -- find "<words>" [--set <set-id>] [--json]',
  '  npm run designer:words -- report <set-id> [--json]'
].join('\n')

const COMMANDS = new Set(['find', 'report'])

const readFlag = (rest, flag) => {
  const at = rest.indexOf(flag)
  return at === -1 ? undefined : rest[at + 1]
}

const isPositional = (value, index, all) =>
  !value.startsWith('--') && all[index - 1] !== '--set'

const withoutFlags = (rest) => rest.filter(isPositional)

/**
 * `designer:words` arguments, parsed. No filesystem, no process: argv in,
 * `{ command, text, setId, json }` or `{ error }` out.
 *
 * @param {string[]} argv - the arguments after the script name.
 */
export const parseWordsArgs = (argv) => {
  const [command, ...rest] = argv
  if (!COMMANDS.has(command)) {
    return { error: `Say what to do: find or report.\n${USAGE}` }
  }
  const json = rest.includes('--json')
  if (rest.includes('--set') && readFlag(rest, '--set') === undefined) {
    return { error: `--set needs a set id after it.\n${USAGE}` }
  }
  const [positional] = withoutFlags(rest)
  if (command === 'report') {
    return positional
      ? { command, setId: positional, json }
      : { error: `Say which set to report on.\n${USAGE}` }
  }
  if (!positional || positional.trim() === '') {
    return { error: `Say which words to find, in quotes.\n${USAGE}` }
  }
  return { command, text: positional, setId: readFlag(rest, '--set'), json }
}
