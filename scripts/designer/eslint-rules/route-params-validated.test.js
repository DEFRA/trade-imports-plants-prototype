import { RuleTester } from 'eslint'

import { routeParamsValidated } from './route-params-validated.js'

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' }
})

ruleTester.run('route-params-validated', routeParamsValidated, {
  valid: [
    // No parameter in the path: nothing to validate.
    {
      code: `export const routes = [
        { method: 'GET', path: '/transporters', options: kit.routeOptions, handler: list }
      ]`
    },
    // Inline options with validate.params.
    {
      code: `export const routes = [
        {
          method: 'GET',
          path: '/transporters/{transporterId}/delete',
          options: {
            validate: { params: transporterIdParams, failAction: refuse }
          },
          handler: showDelete
        }
      ]`
    },
    // Options resolved from a local const that validates params.
    {
      code: `const transporterIdRouteOptions = {
        ...routeOptions,
        validate: { params: transporterIdParams, failAction: refuse }
      }
      export const routes = [
        {
          method: 'POST',
          path: '/transporters/{transporterId}/delete',
          options: transporterIdRouteOptions,
          handler: remove
        }
      ]`
    },
    // Options imported from a sibling file, trusted by its name (the
    // ins-frontend addressIdRouteOptions / transporterIdRouteOptions
    // convention): this rule cannot see inside that file.
    {
      code: `import { transporterIdRouteOptions } from '../transporter-id-params.js'
      export const routes = [
        {
          method: 'GET',
          path: '/transporters/{transporterId}/delete',
          options: transporterIdRouteOptions,
          handler: showDelete
        }
      ]`
    }
  ],
  invalid: [
    // Plain options with no validate at all.
    {
      code: `export const routes = [
        {
          method: 'GET',
          path: '/transporters/{transporterId}/delete',
          options: kit.routeOptions,
          handler: showDelete
        }
      ]`,
      errors: [{ messageId: 'missingValidation' }]
    },
    // No options property at all.
    {
      code: `export const routes = [
        { method: 'GET', path: '/transporters/{transporterId}/delete', handler: showDelete }
      ]`,
      errors: [{ messageId: 'missingValidation' }]
    },
    // A local const options object with no validate property.
    {
      code: `const routeOptions = { auth: 'session' }
      export const routes = [
        {
          method: 'GET',
          path: '/transporters/{transporterId}/delete',
          options: routeOptions,
          handler: showDelete
        }
      ]`,
      errors: [{ messageId: 'missingValidation' }]
    },
    // An imported options object whose name gives no reason to trust it.
    {
      code: `import { routeOptions } from '../../shared/kit.js'
      export const routes = [
        {
          method: 'GET',
          path: '/transporters/{transporterId}/delete',
          options: routeOptions,
          handler: showDelete
        }
      ]`,
      errors: [{ messageId: 'missingValidation' }]
    }
  ]
})
