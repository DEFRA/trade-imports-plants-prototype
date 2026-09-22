export const TEMPLATES = 'sample-journey/journeys/linear'
export const LAYOUT = 'shared/layout.njk'

// Its own names, so a draft held by this set is invisible to high-risk-plants
// and vice versa. Two sets sharing a cookie name would share the list behind it.
export const SESSION_COOKIE_NAMES = {
  knownJourneys: 'sampleJourneyKnownJourneys',
  openingRun: 'sampleJourneyOpeningRun',
  flowOnlyAnswers: 'sampleJourneyFlowOnlyAnswers'
}
