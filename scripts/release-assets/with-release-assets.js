import { WebpackAssetsManifest } from 'webpack-assets-manifest'

import { releaseEntryName } from './releases.js'

const onlyOne = (matches, what) => {
  if (matches.length !== 1) {
    throw new Error(
      `webpack.prototype.config.js needs exactly one ${what} in webpack.config.js, and found ${matches.length}. Release styles and scripts cannot be built until it is updated to match.`
    )
  }
  return matches[0]
}

const findStylesRule = (rules) => {
  const rule = onlyOne(
    rules.filter(
      (candidate) =>
        candidate.test instanceof RegExp &&
        candidate.test.test('styles.scss') &&
        candidate.type === 'asset/resource'
    ),
    'Sass rule of type asset/resource'
  )
  if (typeof rule.generator?.filename !== 'string') {
    throw new Error(
      'webpack.prototype.config.js needs the Sass rule in webpack.config.js to name its CSS with a generator.filename string. Release styles cannot be built until it is updated to match.'
    )
  }
  return rule
}

const findSassLoader = (stylesRule) =>
  onlyOne(
    (stylesRule.use ?? []).filter((step) => step?.loader === 'sass-loader'),
    'sass-loader step in the Sass rule'
  )

const sassLoaderWithApplicationSettings = (sassLoader, releases) => {
  const applicationSettings = `@use "govuk-frontend/dist/govuk/base" as release-application-settings with (
  $govuk-assets-path: "/public/assets/",
  $govuk-include-default-font-face: false
);
`
  const releaseStyles = new Set(
    releases.map(({ styles }) => styles).filter(Boolean)
  )
  return {
    ...sassLoader,
    options: {
      ...sassLoader.options,
      additionalData: (content, loaderContext) =>
        releaseStyles.has(loaderContext.resourcePath)
          ? `${applicationSettings}${content}`
          : content
    }
  }
}

const findManifest = (plugins) =>
  onlyOne(
    plugins.filter((plugin) => plugin instanceof WebpackAssetsManifest),
    'WebpackAssetsManifest plugin'
  )

const entriesFor = (releases) =>
  Object.fromEntries(
    releases.map(({ id, scripts, styles }) => [
      releaseEntryName(id),
      { import: [scripts, styles].filter(Boolean) }
    ])
  )

const cssFilenameFor = (baseFilename, releases) => {
  const entryByStyles = new Map(
    releases
      .filter(({ styles }) => styles)
      .map(({ id, styles }) => [styles, releaseEntryName(id)])
  )
  return (pathData) => {
    const entryName = entryByStyles.get(pathData.module?.resource)
    return entryName ? baseFilename.replace('[name]', entryName) : baseFilename
  }
}

const keyWithReleaseStylesNamed = (entryNames, { key, value }) => {
  const builtFile = value.split('/').at(-1)
  const entryName = entryNames.find((name) => builtFile.startsWith(`${name}.`))
  return entryName && key.endsWith('.scss') && builtFile.endsWith('.css')
    ? `${entryName}.css`
    : key
}

/**
 * The base webpack config with one more entry per release: `release-<id>`,
 * built from the release's `assets/scripts.js` and `assets/styles.scss`. Its
 * CSS is written as `stylesheets/release-<id>.css` (hashed as the base hashes
 * its own) and its manifest keys are `release-<id>.css` and `release-<id>.js`.
 * Everything the base builds keeps its own names. A release stylesheet loads
 * GOV.UK Frontend with the application stylesheet's asset path
 * (`/public/assets/`) and, like it, declares no font faces.
 *
 * Throws at once when the base no longer has exactly one Sass asset rule with
 * a filename string and one sass-loader step, or exactly one assets manifest
 * plugin.
 *
 * @param {object} baseConfig - the real service's webpack config.
 * @param {Array<{ id: string, styles?: string, scripts?: string }>} releases
 * @returns {object} a new config; the base's own objects are not changed,
 * except that its manifest plugin learns the release keys.
 */
export const withReleaseAssets = (baseConfig, releases) => {
  const stylesRule = findStylesRule(baseConfig.module.rules)
  const sassLoader = findSassLoader(stylesRule)
  const manifest = findManifest(baseConfig.plugins)
  const entryNames = releases.map(({ id }) => releaseEntryName(id))

  manifest.hooks.customize.tap('ReleaseAssets', (entry) =>
    entry
      ? { ...entry, key: keyWithReleaseStylesNamed(entryNames, entry) }
      : entry
  )

  return {
    ...baseConfig,
    entry: { ...baseConfig.entry, ...entriesFor(releases) },
    module: {
      ...baseConfig.module,
      rules: baseConfig.module.rules.map((rule) =>
        rule === stylesRule
          ? {
              ...rule,
              generator: {
                ...rule.generator,
                filename: cssFilenameFor(rule.generator.filename, releases)
              },
              use: rule.use.map((step) =>
                step === sassLoader
                  ? sassLoaderWithApplicationSettings(sassLoader, releases)
                  : step
              )
            }
          : rule
      )
    }
  }
}
