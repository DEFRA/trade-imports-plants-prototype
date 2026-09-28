/**
 * A prototype-owned service's `index.js` and `client.js` are the files that
 * travel to plants-frontend on a hand-off (`scripts/designer/handoff/contract.js`
 * `describeService`'s `proposed`). Neither may import the prototype's own
 * plumbing (`src/server/prototype-support/`), because plants-frontend has no
 * such folder: an import that slips in only fails once someone applies the
 * patch. `stub.js` is exempt: it never travels.
 *
 * Wired in `eslint.config.js` to
 * `src/server/app/services/*\/{index,client}.js`.
 */
const PROTOTYPE_SUPPORT = 'prototype-support'

export const serviceBarrelImports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'A service’s index.js and client.js must not import prototype-support: they travel to plants-frontend, which has no such folder.'
    },
    schema: [],
    messages: {
      prototypeImport:
        'This file imports "{{source}}". index.js and client.js travel to plants-frontend on a hand-off, and plants-frontend has no prototype-support folder. Keep the prototype-only import in stub.js.'
    }
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (typeof source === 'string' && source.includes(PROTOTYPE_SUPPORT)) {
          context.report({
            node: node.source,
            messageId: 'prototypeImport',
            data: { source }
          })
        }
      }
    }
  }
}
