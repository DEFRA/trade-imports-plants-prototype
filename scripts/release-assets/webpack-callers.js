const runsBareWebpack = (command) =>
  /(?:^|[\s;&|(])webpack(?=\s|$)/.test(command) &&
  !command.includes('--config webpack.prototype.config.js')

/**
 * The package.json scripts and Dockerfile lines that run webpack without the
 * prototype's config, and so would build without any release's styles and
 * scripts.
 *
 * @param {{ scripts: Record<string, string>, dockerfile: string }} sources
 * @returns {string[]} one description per caller, empty when there are none.
 */
export const bareWebpackCallers = ({ scripts, dockerfile }) => [
  ...Object.entries(scripts)
    .filter(([, command]) => runsBareWebpack(command))
    .map(([name, command]) => `package.json script "${name}": ${command}`),
  ...dockerfile
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => runsBareWebpack(line))
    .map(({ line, number }) => `Dockerfile line ${number}: ${line}`)
]
