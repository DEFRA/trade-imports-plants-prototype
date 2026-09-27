const DEFAULT_TEMPLATE = 'sample-journey'
const DEFAULT_PURPOSE = 'working'

const valueAfter = (args, flag) => {
  const flagAt = args.indexOf(flag)
  return flagAt === -1 ? undefined : args[flagAt + 1]
}

/**
 * `npm run new:set -- <set-id> [--from <set-id>] [--describe "<text>"]
 * [--purpose working|frozen|research]`, parsed. No filesystem, no process —
 * just argv in, options out.
 */
export const parseArgs = (argv) => {
  const [setId, ...rest] = argv
  return {
    setId,
    from: valueAfter(rest, '--from') ?? DEFAULT_TEMPLATE,
    describe: valueAfter(rest, '--describe'),
    purpose: valueAfter(rest, '--purpose') ?? DEFAULT_PURPOSE
  }
}
