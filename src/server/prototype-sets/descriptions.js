/**
 * A one-line description per prototype, keyed by set id.
 *
 * Prototype-owned metadata rather than something each set declares itself:
 * the chooser is the prototype host's page, not a set's, and a set mounts
 * with no obligation to describe itself for it. A set missing here still
 * lists on the chooser — it just carries no description.
 */
const DESCRIPTIONS = {
  'high-risk-plants':
    'The real high-risk plants and plant products notification journey.',
  'sample-journey':
    'A placeholder set, kept to prove the host can serve more than one prototype.'
}

export const descriptionFor = (setId) => DESCRIPTIONS[setId]
