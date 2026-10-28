// PROVISIONAL COPY — a first draft for a design experiment. None of it has
// been through a content review, and the outcomes it describes have not been
// checked by policy.

/**
 * The routing pages: a short run of questions that works out which
 * notification an import needs, then the page that says so.
 *
 * `questions.commodity.titleBySector` and `destinations` are keyed by values
 * the set-owned commodity-routing service holds.
 */
export const copy = {
  caption: '[Welsh needed] Find the right notification',
  continue: '[Welsh needed] Continue',
  questions: {
    commodity: {
      title: '[Welsh needed] What are you importing?',
      titleBySector: {
        plants:
          '[Welsh needed] Which plants or plant products are you importing?',
        'live-animals': '[Welsh needed] Which live animals are you importing?',
        'germinal-products':
          '[Welsh needed] Which germinal products are you importing?'
      },
      hint: '[Welsh needed] Start typing a name or a commodity code, for example ‘horses’, ‘seed potatoes’ or ‘0602’. If you are not sure, choose a type of goods to see a shorter list.',
      hintBySector:
        '[Welsh needed] Start typing a name or a commodity code, or choose from the list.',
      placeholder: '[Welsh needed] Select what you are importing',
      noResults: '[Welsh needed] No commodities found',
      error: '[Welsh needed] Select what you are importing',
      sectorLabels: {
        plants: '[Welsh needed] Plants and plant products: show me the list',
        'live-animals': '[Welsh needed] Live animals: show me the list',
        'germinal-products':
          '[Welsh needed] Germinal products (semen, ova, embryos and hatching eggs): show me the list'
      },
      option: (name, code) => `[Welsh needed] ${name} (${code})`
    },
    origin: {
      title: '[Welsh needed] Which country are the goods coming from?',
      hint: '[Welsh needed] Start typing the name of the country.',
      placeholder: '[Welsh needed] Select a country',
      noResults: '[Welsh needed] No countries found',
      error: '[Welsh needed] Select the country the goods are coming from'
    },
    genus: {
      title: '[Welsh needed] Which plant or tree is it?',
      hint: '[Welsh needed] Some plants and trees have their own rules. Start typing the name, or choose ‘Another plant or tree’ if yours is not in the list.',
      placeholder: '[Welsh needed] Select a plant or tree',
      noResults:
        '[Welsh needed] No plants or trees found. Choose ‘Another plant or tree’.',
      other: '[Welsh needed] Another plant or tree',
      error: '[Welsh needed] Select which plant or tree it is'
    },
    bark: {
      title: '[Welsh needed] Does the wood have bark on it?',
      hint: '[Welsh needed] Select ‘Yes’ if any bark is left on the wood.',
      options: {
        'with-bark': '[Welsh needed] Yes, the wood has bark on it',
        'without-bark': '[Welsh needed] No, the bark has been removed'
      },
      error: '[Welsh needed] Select yes if the wood has bark on it'
    }
  },
  told: {
    heading: '[Welsh needed] What you have told us',
    commodity: '[Welsh needed] Importing',
    code: '[Welsh needed] Commodity code',
    origin: '[Welsh needed] Coming from',
    genus: '[Welsh needed] Plant or tree',
    bark: '[Welsh needed] Bark',
    change: '[Welsh needed] Change'
  },
  result: {
    startAgain: '[Welsh needed] Start again with different goods',
    start: '[Welsh needed] Start this notification',
    prefillHeading: '[Welsh needed] What we will fill in for you',
    prefillBody:
      '[Welsh needed] You will not be asked these questions again. You can change the answers in the notification.',
    prefill: {
      commodityType: '[Welsh needed] Type of goods',
      category: '[Welsh needed] Commodity',
      genus: '[Welsh needed] Genus',
      commodityCode: '[Welsh needed] Commodity code',
      countryOfOrigin: '[Welsh needed] Country of origin'
    },
    placeholder:
      '[Welsh needed] This notification is a placeholder in this prototype. You can start it to see your answers carried over, but you cannot fill in the rest or send it.'
  },
  destinations: {
    'plants-notification': {
      title: '[Welsh needed] You need to send a high-risk plants notification',
      body: '[Welsh needed] From what you have told us, these goods are high-risk plants, potatoes or wood from the EU. You must tell the plant health authorities about them with a high-risk plants notification.'
    },
    'ched-pp': {
      title:
        '[Welsh needed] You need to send a plants and plant products notification',
      body: '[Welsh needed] From what you have told us, these goods need a phytosanitary certificate and a plants and plant products notification (CHED-PP).'
    },
    'ched-a': {
      title: '[Welsh needed] You need to send a live animals notification',
      body: '[Welsh needed] From what you have told us, these goods are live animals. Live animals from any country need a live animals notification (CHED-A).'
    },
    'ched-p': {
      title: '[Welsh needed] You need to send a germinal products notification',
      body: '[Welsh needed] From what you have told us, these goods are germinal products. They need a notification for products of animal origin and germinal products (CHED-P).'
    },
    'no-notification': {
      title: '[Welsh needed] You do not need to send a notification',
      body: '[Welsh needed] From what you have told us, these goods are low risk from this country. You do not need to tell the plant health authorities about them before they arrive.'
    },
    prohibited: {
      title: '[Welsh needed] You cannot import these goods from this country',
      body: '[Welsh needed] From what you have told us, these goods are prohibited from this country. You can only import them from certain countries.'
    },
    'check-rules': {
      title: '[Welsh needed] Check the import rules for these goods',
      body: '[Welsh needed] From what you have told us, the high-risk plants notification does not cover these goods from this country. Check the plant health import rules before you import them.'
    }
  }
}
