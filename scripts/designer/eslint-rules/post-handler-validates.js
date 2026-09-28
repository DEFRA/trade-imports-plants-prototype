/**
 * A POST route in a design release's own feature must call `validate()`
 * (`src/server/app/lib/validate/index.js`) before it saves anything, so a
 * refused answer re-renders with the page's own `copy.errors` messages
 * rather than a service's raw English. Wired in `eslint.config.js` to
 * `src/server/app/sets/**`, except `high-risk-plants` (the real journey,
 * which validates the same way but is proven by its own suite already).
 *
 * A text search of the handler function's own source for a `validate(` call
 * — deliberately simple, in the spirit of a house-convention lint rather
 * than a full call-graph analysis. A handler that only ever delegates
 * validation to a helper it calls should call that helper `validate(...)`,
 * or name the check inline.
 */
const POST = 'POST'

const propertyNamed = (objectExpression, name) =>
  objectExpression.properties.find(
    (property) =>
      property.type === 'Property' &&
      !property.computed &&
      (property.key.name === name || property.key.value === name)
  )

const methodsOf = (methodValue) => {
  if (methodValue.type === 'Literal') {
    return [methodValue.value]
  }
  if (methodValue.type === 'ArrayExpression') {
    return methodValue.elements
      .filter((element) => element?.type === 'Literal')
      .map((element) => element.value)
  }
  return []
}

const isFunctionLike = (node) =>
  node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression'

/** Every top-level `const name = () => {}` / `function name() {}` in the
 * module, by name, so a route's `handler: name` can be traced back to its
 * body. */
const collectNamedFunctions = (program) => {
  const named = new Map()
  for (const statement of program.body) {
    if (statement.type === 'FunctionDeclaration' && statement.id?.name) {
      named.set(statement.id.name, statement)
      continue
    }
    if (statement.type !== 'VariableDeclaration') {
      continue
    }
    for (const declarator of statement.declarations) {
      if (
        declarator.id.type === 'Identifier' &&
        declarator.init &&
        isFunctionLike(declarator.init)
      ) {
        named.set(declarator.id.name, declarator.init)
      }
    }
  }
  return named
}

const callsValidate = (functionNode, sourceCode) =>
  /\bvalidate\s*\(/.test(sourceCode.getText(functionNode))

export const postHandlerValidates = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'A POST handler in a release must call validate(), so a refused answer shows the page’s own copy.errors messages.'
    },
    schema: [],
    messages: {
      missingValidate:
        'This POST handler never calls validate(). Validate the payload with lib/validate before saving, and turn its errors into copy.errors messages for the form.'
    }
  },
  create(context) {
    const sourceCode = context.sourceCode
    let named

    return {
      Program(node) {
        named = collectNamedFunctions(node)
      },
      ObjectExpression(node) {
        const methodProperty = propertyNamed(node, 'method')
        const handlerProperty = propertyNamed(node, 'handler')
        if (!methodProperty || !handlerProperty) {
          return
        }
        if (!methodsOf(methodProperty.value).includes(POST)) {
          return
        }
        const handlerValue = handlerProperty.value
        const handlerFunction = isFunctionLike(handlerValue)
          ? handlerValue
          : handlerValue.type === 'Identifier'
            ? named.get(handlerValue.name)
            : null
        if (!handlerFunction) {
          // Cannot trace the handler statically (for example a member
          // expression from another module): nothing to check here.
          return
        }
        if (!callsValidate(handlerFunction, sourceCode)) {
          context.report({
            node: handlerProperty,
            messageId: 'missingValidate'
          })
        }
      }
    }
  }
}
