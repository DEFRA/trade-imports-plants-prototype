/**
 * An advisory pass over changed English copy, for the wording habits GDS
 * plain English style flags most often. It never fails a check: the
 * designer's own words always win. It only reads `copy.en.js` (never
 * `copy.cy.js`, which is not written in English) and only leaf strings, not
 * function bodies (a parameterised leaf's template text still matters, so
 * its source is read as a string).
 *
 * See https://www.gov.uk/guidance/content-design/writing-for-gov-uk — this
 * mirrors a handful of its most mechanical rules, not the whole guide.
 */
const PLEASE = /\bplease\b/i
const CLICK = /\bclick\b/i
const EXCLAMATION = /!(?!\s*$)|!$/
const AMPERSAND_IN_SENTENCE = /[a-z] & [a-z]/i
const VALID_INVALID = /\b(?:valid|invalid)\b/i
// GOV.UK asks for an instruction ("Enter your name"), not a description of
// what the field wants ("Your name is required") or a passive refusal.
const ERROR_VERB_MISSING =
  /\b(?:is required|must be provided|was not provided)\b/i

/** Names that keep their capitals in sentence case, so they never count
 * towards Title Case. */
const PROPER_NOUNS =
  /\b(?:Great Britain|Northern Ireland|United Kingdom|European Union|England|Scotland|Wales|Welsh|English|Defra|GOV\.UK|(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day|January|February|March|April|May|June|July|August|September|October|November|December)\b/g

/** A heading reads Title Case when more than one word starts with a capital
 * and it is not one all-capitals acronym or a name. A crude, deliberately
 * generous test: it only flags at least two separately-capitalised words,
 * once proper nouns are set aside. */
const looksTitleCase = (text) => {
  const words = text.replace(PROPER_NOUNS, '').trim().split(/\s+/)
  const capitalised = words.filter((word) => /^[A-Z][a-z]/.test(word))
  return words.length > 1 && capitalised.length > 1
}

const RULES = [
  {
    id: 'please',
    test: (text) => PLEASE.test(text),
    advice: () =>
      '"Please" is not needed on GOV.UK: an instruction reads as one without it.'
  },
  {
    id: 'click',
    test: (text) => CLICK.test(text),
    advice: () =>
      '"Click" assumes a mouse. Say "select" so it reads right on every device.'
  },
  {
    id: 'exclamation',
    test: (text) => EXCLAMATION.test(text),
    advice: () => 'An exclamation mark reads as shouting. Use a full stop.'
  },
  {
    id: 'ampersand',
    test: (text) => AMPERSAND_IN_SENTENCE.test(text),
    advice: () =>
      'Write "and" in a sentence. "&" is for a title or a label only.'
  },
  {
    id: 'valid-invalid',
    test: (text) => VALID_INVALID.test(text),
    advice: () =>
      '"Valid"/"invalid" describe the system\'s judgement, not what the user did. Say what to do instead, for example "Enter a valid postcode" only when there is no plainer way to say it.'
  },
  {
    id: 'error-verb',
    test: (text) => ERROR_VERB_MISSING.test(text),
    advice: () =>
      'An error message reads as an instruction ("Enter your name"), not a description of what went wrong ("Name is required").'
  }
]

/** A heading key: the leaf's own name is `title`, `heading` or `legend` (the
 * three GOV.UK asks to stay in sentence case). */
const isHeadingKey = (keyPath) =>
  /(?:^|\.)(?:title|heading|legend)$/.test(keyPath)

/**
 * Every advisory line for one English leaf.
 *
 * @param {string} keyPath - the dotted path (`add.title`).
 * @param {string|Function} value - the leaf's own value: a plain string, or
 * a parameterised leaf's function (its source is read as text).
 * @returns {string[]} zero or more plain-English advisory lines.
 */
export const advisoryLinesFor = (keyPath, value) => {
  const text = String(value)
  const lines = RULES.filter((rule) => rule.test(text)).map(
    (rule) => `${keyPath}: ${rule.advice()}`
  )
  if (isHeadingKey(keyPath) && looksTitleCase(text)) {
    lines.push(
      `${keyPath}: "${text}" reads as Title Case. GOV.UK headings use sentence case ("Add a transporter", not "Add A Transporter").`
    )
  }
  return lines
}

/**
 * Every advisory line for a `copy.en.js` module's leaves.
 *
 * @param {{ path: string, value: * }[]} englishLeaves - from
 * `copy-leaves.js`'s `leaves()`.
 * @returns {string[]} plain-English advisory lines, one rule finding per
 * line, in leaf order.
 */
export const advisoryLinesForCopy = (englishLeaves) =>
  englishLeaves.flatMap(({ path: keyPath, value }) =>
    advisoryLinesFor(keyPath, value)
  )
