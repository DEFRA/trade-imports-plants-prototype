// Where the consignment comes from. One notification-level answer for
// potatoes, plants and wood alike: the statute names a different scope for
// each, but a notification carries one origin.
//
// The per-category narrowing — ware potatoes from four countries, conifer wood
// without bark from four others, everything else from an EU member State — is
// not a gate here. A gate reads its own frame, and `category` lives one frame
// down on each commodity line, so the narrowing is validated on the page
// against the set-owned commodities service instead.
export const countryOfOrigin = {
  id: '02b42a08-d197-406b-afc8-3d93f3ad918c',
  name: 'countryOfOrigin',
  status: 'mandatory'
}
