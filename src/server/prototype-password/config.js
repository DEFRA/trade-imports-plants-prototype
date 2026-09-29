import convict from 'convict'

/**
 * The prototype password's own settings, kept apart from the real service's
 * `src/config/config.js` so the weekly update from plants-frontend never
 * meets them.
 *
 * Set as a CDP secret on the deployed prototype. Unset, the prototype is open
 * to anyone who reaches it, as it always has been.
 */
export const prototypePasswordConfig = convict({
  password: {
    doc: 'The shared password a visitor must enter before seeing any page of the prototype. Empty turns the password page off.',
    format: String,
    default: '',
    env: 'PROTOTYPE_PASSWORD',
    sensitive: true
  }
})

prototypePasswordConfig.validate({ allowed: 'strict' })
