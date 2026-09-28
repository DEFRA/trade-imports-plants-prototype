/**
 * A Hapi route whose path takes a `{param}` must validate that parameter, so
 * a made-up id 404s instead of reaching the handler (see
 * `trade-imports-ins-frontend`'s `addressIdRouteOptions` for the pattern:
 * `options.validate.params`, with a `failAction` that throws `Boom.notFound`).
 *
 * Looks for an object literal that reads as a Hapi route (it has both
 * `method` and `path`). When `path` is a string or a no-substitution
 * template literal naming a `{param}`, the same object's `options` must
 * resolve — inline, through a local `const` it names, or through an
 * imported one whose name says what it does (`transporterIdRouteOptions`,
 * `addressIdRouteOptions`) — to an object literal with a `validate.params`
 * property. An imported binding by that convention is trusted rather than
 * followed into its own file, the same trade-off a single-file AST rule
 * already makes for every cross-file reference.
 */
const PARAM_PATTERN = /\{[a-zA-Z0-9_]+\}/
const TRUSTED_IMPORTED_OPTIONS_NAME = /IdRouteOptions$/

const staticPathOf = (node) => {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked).join('')
  }
  return null
}

const propertyNamed = (objectExpression, name) =>
  objectExpression.properties.find(
    (property) =>
      property.type === 'Property' &&
      !property.computed &&
      (property.key.name === name || property.key.value === name)
  )

const isRouteObject = (node) =>
  node.type === 'ObjectExpression' &&
  propertyNamed(node, 'method') &&
  propertyNamed(node, 'path')

/** Whether an object literal validates its params: a `validate` property
 * that is itself an object with a `params` property. */
const validatesParams = (objectExpression) => {
  const validate = propertyNamed(objectExpression, 'validate')
  if (!validate || validate.value.type !== 'ObjectExpression') {
    return false
  }
  return Boolean(propertyNamed(validate.value, 'params'))
}

/** Whether an identifier's binding is an ES module import. */
const isImportBinding = (variable) =>
  variable?.defs.some((def) => def.type === 'ImportBinding')

/** The object literal an `options` value resolves to: itself when it is
 * already one, or the initialiser of a same-file `const` it names. Null for
 * an import that does not follow the trusted naming convention: neither
 * validated nor refused, just not statically checkable here. */
const resolveOptionsObject = (optionsValue, scope) => {
  if (optionsValue.type === 'ObjectExpression') {
    return optionsValue
  }
  if (optionsValue.type !== 'Identifier') {
    return null
  }
  const variable = scope.references.find(
    (reference) => reference.identifier === optionsValue
  )?.resolved
  if (isImportBinding(variable)) {
    return null
  }
  const declarator = variable?.defs.find(
    (def) => def.node.type === 'VariableDeclarator'
  )?.node
  return declarator?.init?.type === 'ObjectExpression' ? declarator.init : null
}

const isTrustedImport = (optionsValue, scope) => {
  if (
    optionsValue.type !== 'Identifier' ||
    !TRUSTED_IMPORTED_OPTIONS_NAME.test(optionsValue.name)
  ) {
    return false
  }
  const variable = scope.references.find(
    (reference) => reference.identifier === optionsValue
  )?.resolved
  return isImportBinding(variable)
}

export const routeParamsValidated = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'A route path with a {param} must validate it, so a made-up id 404s instead of reaching the handler.'
    },
    schema: [],
    messages: {
      missingValidation:
        'The route path "{{path}}" takes a parameter but has no options.validate.params. Add a Joi params schema with a failAction that throws Boom.notFound, so a made-up id 404s instead of reaching the handler.'
    }
  },
  create(context) {
    return {
      ObjectExpression(node) {
        if (!isRouteObject(node)) {
          return
        }
        const pathProperty = propertyNamed(node, 'path')
        const path = staticPathOf(pathProperty.value)
        if (!path || !PARAM_PATTERN.test(path)) {
          return
        }
        const optionsProperty = propertyNamed(node, 'options')
        const scope = context.sourceCode.getScope(node)
        if (optionsProperty && isTrustedImport(optionsProperty.value, scope)) {
          return
        }
        const resolved = optionsProperty
          ? resolveOptionsObject(optionsProperty.value, scope)
          : null
        if (!resolved || !validatesParams(resolved)) {
          context.report({
            node: pathProperty,
            messageId: 'missingValidation',
            data: { path }
          })
        }
      }
    }
  }
}
