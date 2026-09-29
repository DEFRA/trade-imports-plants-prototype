/**
 * What a hand-written gate reads. A page or section can carry its own
 * `gate: (scope) => …` closure instead of the gate the engine derives from
 * the obligations; the map cannot read the closure's body, so it runs it
 * against a recording stand-in for the real scope and notes every property
 * and every `has()` or `answered()` question it asks.
 *
 * Known reads get fixed wording (`readyForCheckYourAnswers` is "every task
 * is complete"); anything else leaves the gate marked as a rule in the
 * page's code, never guessed at.
 */

const KNOWN_PROPERTIES = new Set([
  'readyForCheckYourAnswers',
  'has',
  'answered',
  'inScope'
])

const sorted = (set) => [...set].toSorted((a, b) => a.localeCompare(b))

/**
 * Runs `gate` against each scope through a recording proxy.
 *
 * @param {(scope: object) => unknown} gate
 * @param {object[]} scopes - real scopes, one per answer state.
 * @returns {{ ready: boolean, inScope: boolean, has: string[],
 *   answered: string[], other: string[] }} what the gate read; `other` is
 *   every read the map has no words for.
 */
export const probeGate = (gate, scopes) => {
  let ready = false
  let inScope = false
  const has = new Set()
  const answered = new Set()
  const other = new Set()
  const recordingProxy = (scope) =>
    new Proxy(scope, {
      get(target, property, receiver) {
        if (typeof property !== 'string') {
          return Reflect.get(target, property, receiver)
        }
        if (property === 'has') {
          return (id) => {
            has.add(String(id))
            return target.has(id)
          }
        }
        if (property === 'answered') {
          return (id) => {
            answered.add(String(id))
            return target.answered(id)
          }
        }
        if (property === 'readyForCheckYourAnswers') {
          ready = true
        } else if (property === 'inScope') {
          inScope = true
        } else if (!KNOWN_PROPERTIES.has(property)) {
          other.add(property)
        }
        return Reflect.get(target, property, receiver)
      }
    })
  for (const scope of scopes) {
    try {
      gate(recordingProxy(scope))
    } catch {
      other.add('(the rule stopped with an error)')
    }
  }
  return {
    ready,
    inScope,
    has: sorted(has),
    answered: sorted(answered),
    other: sorted(other)
  }
}

/** True when a gate read something the map has no words for. */
export const isOpaque = (reads) => reads.other.length > 0
