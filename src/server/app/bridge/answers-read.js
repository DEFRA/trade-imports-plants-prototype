// Optional set-owned sanitiser for answers on the read path. Default is identity.
// A set configures its own clearer from routes.js so that, for example, deleted
// address-book references drop out of fulfilment and evaluation without the
// engine importing sets/**.

let sanitizeAnswersForRead = async (_request, answers) => answers

export const configureAnswersForRead = (sanitize) => {
  sanitizeAnswersForRead = sanitize
}

export const answersForRead = (request, answers) =>
  sanitizeAnswersForRead(request, answers)
