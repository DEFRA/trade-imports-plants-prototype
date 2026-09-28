import { RuleTester } from 'eslint'

import { postHandlerValidates } from './post-handler-validates.js'

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' }
})

ruleTester.run('post-handler-validates', postHandlerValidates, {
  valid: [
    // A GET handler is never checked.
    {
      code: `const list = async (request, h) => h.view('list')
      export const routes = [{ method: 'GET', path: '/x', handler: list }]`
    },
    // The named POST handler calls validate().
    {
      code: `const add = async (request, h) => {
        const { errors, value } = validate(rules, request.payload)
        if (errors) {
          return h.view('add', { errors }).code(400)
        }
        return h.redirect('/x')
      }
      export const routes = [{ method: 'POST', path: '/x/add', handler: add }]`
    },
    // An inline arrow handler that calls validate().
    {
      code: `export const routes = [{
        method: 'POST',
        path: '/x/add',
        handler: async (request, h) => {
          const { errors } = validate(rules, request.payload)
          return errors ? h.view('add', { errors }) : h.redirect('/x')
        }
      }]`
    },
    // A route array method containing POST among others, still checked,
    // and this one validates.
    {
      code: `const add = (request, h) => {
        validate(rules, request.payload)
      }
      export const routes = [{ method: ['GET', 'POST'], path: '/x', handler: add }]`
    },
    // A confirmation that reads no payload has no answer to validate.
    {
      code: `const remove = async (request, h) => {
        await service.remove(request.params.id)
        return h.redirect('/x')
      }
      export const routes = [{ method: 'POST', path: '/x/delete', handler: remove }]`
    }
  ],
  invalid: [
    // The named POST handler never calls validate().
    {
      code: `const add = async (request, h) => {
        const created = await service.create(request.payload)
        return h.redirect('/x')
      }
      export const routes = [{ method: 'POST', path: '/x/add', handler: add }]`,
      errors: [{ messageId: 'missingValidate' }]
    },
    // An inline arrow handler that saves the payload with no validate() call.
    {
      code: `export const routes = [{
        method: 'POST',
        path: '/x/add',
        handler: async (request, h) => {
          await service.create(request.payload)
          return h.redirect('/x')
        }
      }]`,
      errors: [{ messageId: 'missingValidate' }]
    }
  ]
})
