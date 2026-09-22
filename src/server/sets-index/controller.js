import { serverWideBase } from '../app/shared/kit.js'
/**
 * Turns a set id into the row the chooser renders. The id is the only fact a
 * set has to publish for this page, so a new prototype appears here purely by
 * mounting — there is no list to keep in step.
 */
const rowFor = (setId) => ({
  setId,
  href: `/${setId}`,
  text: setId
    .split('-')
    .join(' ')
    .replace(/^./, (first) => first.toUpperCase())
})

export const setsIndexController = (mountedSetIds) => ({
  options: { auth: false },
  handler: (_request, h) =>
    h.view('sets-index/template', {
      ...serverWideBase('Prototypes'),
      heading: 'Prototypes',
      body: 'This service hosts more than one prototype. Choose one to open it.',
      sets: mountedSetIds().toSorted().map(rowFor)
    })
})
