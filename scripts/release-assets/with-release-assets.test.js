import { WebpackAssetsManifest } from 'webpack-assets-manifest'
import { describe, expect, it } from 'vitest'

import { withReleaseAssets } from './with-release-assets.js'

const sassRule = () => ({
  test: /\.scss$/,
  type: 'asset/resource',
  generator: { binary: false, filename: 'stylesheets/[name].css' }
})

const baseConfigWith = ({
  rules = [sassRule()],
  plugins = [new WebpackAssetsManifest()]
} = {}) => ({
  entry: { application: { import: ['./javascripts/application.js'] } },
  module: { rules },
  plugins
})

const releases = [
  {
    id: 'alpha',
    styles: '/sets/alpha/assets/styles.scss',
    scripts: '/sets/alpha/assets/scripts.js'
  },
  { id: 'beta', styles: '/sets/beta/assets/styles.scss' }
]

const cssFilenameOf = (config, resource) =>
  config.module.rules[0].generator.filename({ module: { resource } })

describe('withReleaseAssets', () => {
  it('Should add one entry per release beside the base entries', () => {
    const config = withReleaseAssets(baseConfigWith(), releases)

    expect(config.entry).toEqual({
      application: { import: ['./javascripts/application.js'] },
      'release-alpha': {
        import: [
          '/sets/alpha/assets/scripts.js',
          '/sets/alpha/assets/styles.scss'
        ]
      },
      'release-beta': { import: ['/sets/beta/assets/styles.scss'] }
    })
  })

  it('Should name each release stylesheet after its release and keep the base name for the rest', () => {
    const config = withReleaseAssets(baseConfigWith(), releases)

    expect(cssFilenameOf(config, '/sets/alpha/assets/styles.scss')).toBe(
      'stylesheets/release-alpha.css'
    )
    expect(cssFilenameOf(config, '/sets/beta/assets/styles.scss')).toBe(
      'stylesheets/release-beta.css'
    )
    expect(
      cssFilenameOf(config, '/src/client/stylesheets/application.scss')
    ).toBe('stylesheets/[name].css')
  })

  it('Should keep the base hashing in a release stylesheet name', () => {
    const rule = sassRule()
    rule.generator.filename = 'stylesheets/[name].[contenthash:7].min.css'
    const config = withReleaseAssets(
      baseConfigWith({ rules: [rule] }),
      releases
    )

    expect(cssFilenameOf(config, '/sets/beta/assets/styles.scss')).toBe(
      'stylesheets/release-beta.[contenthash:7].min.css'
    )
  })

  it('Should leave the base config entries and rules as they were', () => {
    const base = baseConfigWith()
    withReleaseAssets(base, releases)

    expect(Object.keys(base.entry)).toEqual(['application'])
    expect(base.module.rules[0].generator.filename).toBe(
      'stylesheets/[name].css'
    )
  })

  it.each([
    [
      'there is no Sass asset rule',
      { rules: [] },
      /exactly one Sass rule.*found 0/
    ],
    [
      'there are two Sass asset rules',
      { rules: [sassRule(), sassRule()] },
      /exactly one Sass rule.*found 2/
    ],
    [
      'the Sass rule names its CSS with a function',
      { rules: [{ ...sassRule(), generator: { filename: () => 'x.css' } }] },
      /generator\.filename string/
    ],
    [
      'there is no assets manifest plugin',
      { plugins: [] },
      /exactly one WebpackAssetsManifest plugin.*found 0/
    ],
    [
      'there are two assets manifest plugins',
      { plugins: [new WebpackAssetsManifest(), new WebpackAssetsManifest()] },
      /exactly one WebpackAssetsManifest plugin.*found 2/
    ]
  ])('Should refuse to build when %s', (_, parts, message) => {
    expect(() => withReleaseAssets(baseConfigWith(parts), releases)).toThrow(
      message
    )
  })
})
