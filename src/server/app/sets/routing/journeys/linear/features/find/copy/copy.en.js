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
  caption: 'Find the right notification',
  continue: 'Continue',
  questions: {
    commodity: {
      title: 'What are you importing?',
      titleBySector: {
        plants: 'Which plants or plant products are you importing?',
        'live-animals': 'Which live animals are you importing?',
        'germinal-products': 'Which germinal products are you importing?'
      },
      hint: 'Start typing a name or a commodity code, for example ‘horses’, ‘seed potatoes’ or ‘0602’. If you are not sure, choose a type of goods to see a shorter list.',
      hintBySector:
        'Start typing a name or a commodity code, or choose from the list.',
      placeholder: 'Select what you are importing',
      noResults: 'No commodities found',
      error: 'Select what you are importing',
      sectorLabels: {
        plants: 'Plants and plant products: show me the list',
        'live-animals': 'Live animals: show me the list',
        'germinal-products':
          'Germinal products (semen, ova, embryos and hatching eggs): show me the list'
      },
      option: (name, code) => `${name} (${code})`
    },
    origin: {
      title: 'Which country are the goods coming from?',
      hint: 'Start typing the name of the country.',
      placeholder: 'Select a country',
      noResults: 'No countries found',
      error: 'Select the country the goods are coming from'
    },
    genus: {
      title: 'Which plant or tree is it?',
      hint: 'Some plants and trees have their own rules. Start typing the name, or choose ‘Another plant or tree’ if yours is not in the list.',
      placeholder: 'Select a plant or tree',
      noResults: 'No plants or trees found. Choose ‘Another plant or tree’.',
      other: 'Another plant or tree',
      error: 'Select which plant or tree it is'
    },
    bark: {
      title: 'Does the wood have bark on it?',
      hint: 'Select ‘Yes’ if any bark is left on the wood.',
      options: {
        'with-bark': 'Yes, the wood has bark on it',
        'without-bark': 'No, the bark has been removed'
      },
      error: 'Select yes if the wood has bark on it'
    }
  },
  told: {
    heading: 'What you have told us',
    commodity: 'Importing',
    code: 'Commodity code',
    origin: 'Coming from',
    genus: 'Plant or tree',
    bark: 'Bark',
    change: 'Change'
  },
  result: {
    startAgain: 'Start again with different goods',
    start: 'Start this notification',
    prefillHeading: 'What we will fill in for you',
    prefillBody:
      'You will not be asked these questions again. You can change the answers in the notification.',
    prefill: {
      commodityType: 'Type of goods',
      category: 'Commodity',
      genus: 'Genus',
      commodityCode: 'Commodity code',
      countryOfOrigin: 'Country of origin'
    },
    placeholder:
      'This notification is a placeholder in this prototype. You can start it to see your answers carried over, but you cannot fill in the rest or send it.'
  },
  destinations: {
    'plants-notification': {
      title: 'You need to send a high-risk plants notification',
      body: 'From what you have told us, these goods are high-risk plants, potatoes or wood from the EU. You must tell the plant health authorities about them with a high-risk plants notification.'
    },
    'ched-pp': {
      title: 'You need to send a plants and plant products notification',
      body: 'From what you have told us, these goods need a phytosanitary certificate and a plants and plant products notification (CHED-PP).'
    },
    'ched-a': {
      title: 'You need to send a live animals notification',
      body: 'From what you have told us, these goods are live animals. Live animals from any country need a live animals notification (CHED-A).'
    },
    'ched-p': {
      title: 'You need to send a germinal products notification',
      body: 'From what you have told us, these goods are germinal products. They need a notification for products of animal origin and germinal products (CHED-P).'
    },
    'no-notification': {
      title: 'You do not need to send a notification',
      body: 'From what you have told us, these goods are low risk from this country. You do not need to tell the plant health authorities about them before they arrive.'
    },
    prohibited: {
      title: 'You cannot import these goods from this country',
      body: 'From what you have told us, these goods are prohibited from this country. You can only import them from certain countries.'
    },
    'check-rules': {
      title: 'Check the import rules for these goods',
      body: 'From what you have told us, the high-risk plants notification does not cover these goods from this country. Check the plant health import rules before you import them.'
    }
  }
}
