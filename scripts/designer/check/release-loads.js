/**
 * What a path loaded by a design release's Sass or script points at: GOV.UK
 * Frontend, MoJ Frontend, Sass's own modules, a file in the release's own
 * assets folder, or somewhere a release may not reach.
 */
import path from 'node:path'

const isPackage = (loaded, name) =>
  loaded === name || loaded.startsWith(`${name}/`)

/**
 * A component's name as `designer:check` compares it: the library, then the
 * name in lower case with no spaces or hyphens. `moj DatePicker`,
 * `moj Date picker` and the `date-picker` folder all read `moj datepicker`.
 */
export const componentKey = (library, name) =>
  `${library.toLowerCase()} ${name.toLowerCase().replaceAll(/[^a-z0-9]/g, '')}`

const libraryComponent = (loaded) => {
  const govuk = /^govuk-frontend\/dist\/govuk\/components\/([a-z-]+)/.exec(
    loaded
  )
  if (govuk) {
    return componentKey('govuk', govuk[1])
  }
  const moj = /^@ministryofjustice\/frontend\/moj\/components\/([a-z-]+)/.exec(
    loaded
  )
  return moj ? componentKey('moj', moj[1]) : undefined
}

/**
 * @param {string} written - the path as the file writes it.
 * @param {{ fromFile: string, assetsDir: string, language: 'sass' | 'script' }} options -
 * the absolute path of the file that loads it and of the release's assets
 * folder, and the file's language. Sass reads a bare name as a file beside
 * it; a script reads it as a package.
 * @returns {{ kind: 'library', component?: string } | { kind: 'own' } | { kind: 'outside' }}
 * `component` is set when the path is one GOV.UK or MoJ component.
 */
export const classifyLoad = (written, { fromFile, assetsDir, language }) => {
  const loaded = written.replace(/^pkg:/, '')
  if (
    isPackage(loaded, 'govuk-frontend') ||
    isPackage(loaded, '@ministryofjustice/frontend')
  ) {
    const component = libraryComponent(loaded)
    return component ? { kind: 'library', component } : { kind: 'library' }
  }
  if (language === 'sass' && loaded.startsWith('sass:')) {
    return { kind: 'library' }
  }
  if (language === 'script' && !/^\.{1,2}\//.test(loaded)) {
    return { kind: 'outside' }
  }
  const resolved = path.resolve(path.dirname(fromFile), loaded)
  const inside = path.relative(assetsDir, resolved)
  return inside.startsWith('..') || path.isAbsolute(inside)
    ? { kind: 'outside' }
    : { kind: 'own' }
}
