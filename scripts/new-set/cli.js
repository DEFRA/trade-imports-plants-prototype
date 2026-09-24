const FROM_FLAG = '--from'
const DEFAULT_TEMPLATE = 'sample-journey'

/**
 * `npm run new:set -- <set-id> [--from <template-set-id>]`, parsed. No
 * filesystem, no process — just argv in, `{ setId, from }` out.
 */
export const parseArgs = (argv) => {
  const [setId, ...rest] = argv
  const flagAt = rest.indexOf(FROM_FLAG)
  const from = flagAt === -1 ? DEFAULT_TEMPLATE : rest[flagAt + 1]
  return { setId, from }
}
