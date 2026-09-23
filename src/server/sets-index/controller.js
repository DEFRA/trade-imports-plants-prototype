import { serverWideBase } from '../app/shared/kit.js'
/**
 * Turns a mounted set's `[setId, prefix]` pair into the row the chooser
 * renders. A set publishes nothing for this page beyond the mount it already
 * registers, so a new prototype appears here purely by mounting — there is no
 * list to keep in step. The link is the prefix the set actually mounted under,
 * read back rather than rebuilt from the id.
 */
const rowFor = ([setId, prefix]) => ({
  setId,
  href: prefix,
  text: setId
    .split('-')
    .join(' ')
    .replace(/^./, (first) => first.toUpperCase())
})

export const setsIndexController = (mountedSets) => ({
  // `try`, not `false`: the chooser stays reachable signed out, but a request
  // that carries a session still reads it, so the service navigation renders
  // signed in — Log out included.
  options: { auth: { mode: 'try' } },
  handler: (_request, h) =>
    // The template lives at `src/server/app/sets-index/template.njk`, apart
    // from this controller, because `src/config/nunjucks/nunjucks.js` resolves
    // Vision's view root at `server/app`.
    h.view('sets-index/template', {
      ...serverWideBase('Prototypes'),
      heading: 'Prototypes',
      body: 'This service hosts more than one prototype. Choose one to open it.',
      sets: mountedSets()
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(rowFor)
    })
})
