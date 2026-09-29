import type { Copy } from './it';

/** All user-facing copy, in English. Same shape as `it`, checked by the types. */
export const en: Copy = {
  lang: 'en',
  locale: 'en-GB',
  app: {
    name: 'DoINeedIt',
    tagline: 'Do you really need it?',
    documentTitle: 'DoINeedIt · Do you really need it?',
    description:
      'Do you really need it? Paste a product link, answer a few questions and find out how much you actually need that purchase.',
    nav: { label: 'Main navigation', home: 'My items', settings: 'Settings' },
    footer: 'Your data stays in your browser. No account, no tracking.',
    privacyLink: 'Privacy',
  },
  update: {
    available: 'A new version of DoINeedIt is available.',
    reload: 'Update',
    later: 'Later',
  },
  answers: { yes: 'Yes', no: 'No', maybe: 'Maybe' },
  verdict: {
    buy: { label: 'You really need it', short: 'Need it' },
    wait: { label: 'Wait and reconsider', short: 'Wait' },
    skip: { label: 'You don’t need it', short: 'Skip it' },
  },
  dimensions: {
    utility: 'Real usefulness',
    urgency: 'Urgency',
    alternatives: 'Alternatives',
    impulse: 'Cool-headedness',
    budget: 'Budget',
  },
  dimensionHints: {
    utility: 'How much you would actually use it',
    urgency: 'How urgent it is to have it',
    alternatives: 'How hard it is to avoid buying it new',
    impulse: 'How considered, rather than impulsive, the choice is',
    budget: 'How affordable it is for your budget',
  },
  suggestions: {
    buy: [
      'Compare the price in at least one other shop before ordering.',
      'Check whether a previous version costs less and does the same job.',
      'Buy the basic version: extras can be added later, if you really need them.',
    ],
    wait: [
      'Put the product in a list and look at it again in 30 days.',
      'In the meantime, make do with what you have: it is often enough.',
      'Look for the same product second-hand or on loan, then decide.',
    ],
    skip: [
      'Close the tab: the urge passes quickly, the money stays.',
      'If it comes back to mind in a month, reconsider it calmly.',
      'Write down what you would have spent: the yearly total is surprising.',
    ],
  },
  categories: {
    tech: { label: 'Technology', description: 'Phones, headphones, PCs, gadgets' },
    home: { label: 'Home', description: 'Furniture, cleaning, garden' },
    kitchen: { label: 'Kitchen', description: 'Appliances and utensils' },
    clothing: { label: 'Clothing', description: 'Clothes, shoes, accessories' },
    sport: { label: 'Sport and hobbies', description: 'Equipment, DIY, games' },
    media: { label: 'Books and media', description: 'Books, video games, films' },
    health: { label: 'Health and beauty', description: 'Personal care, supplements' },
    other: { label: 'Other', description: 'Everything else' },
  },
  questions: {
    own_similar: {
      text: 'Do you already own something that does the same job?',
      hint: 'It counts even if it is another brand, older or less nice.',
    },
    own_works: {
      text: 'Does what you already have still work well?',
      hint: 'If it is enough for the use you make of it, answer yes.',
    },
    new_different: {
      text: 'Does the new product do something really different that you need?',
      hint: 'A concrete feature you will use, not a better spec sheet.',
    },
    concrete_need: {
      text: 'Does it meet a concrete need you have right now?',
      hint: 'Not a “might come in handy one day”.',
    },
    weekly_use: { text: 'Would you use it at least once a week over the next three months?' },
    problem_soon: {
      text: 'If you did not buy it, would you have a concrete problem within a month?',
      hint: 'A real problem: time lost, money spent, something you cannot do.',
    },
    impulse_today: {
      text: 'Did you decide to buy it today, on the wave of a deal, a video or a recommendation?',
    },
    budget_sacrifice: {
      text: 'To pay for it, would you have to dip into savings, pay in instalments or give up something you had already planned?',
      hint: 'If you can pay it from this month’s money without thinking, answer no.',
    },
    tech_unsupported: {
      text: 'Is the device you use today broken, unbearably slow or no longer updated?',
    },
    tech_daily_diff: { text: 'Would you notice the difference from what you have every day?' },
    tech_extra_costs: {
      text: 'To really use it, do you need accessories, subscriptions or cables bought separately?',
    },
    home_daily_annoy: { text: 'Does it solve an annoyance you feel almost every day at home?' },
    home_prettier: { text: 'Is it a nicer or newer version of something you already own?' },
    home_special_only: { text: 'Would you use it only on special occasions or with guests?' },
    kitchen_frequency: { text: 'Do you cook that kind of dish at least every two weeks?' },
    kitchen_same_result: {
      text: 'Can you get the same result with a tool you already have?',
      hint: 'A pot, a blender, the oven you already have.',
    },
    kitchen_reach: {
      text: 'Would it have a spot within reach, instead of ending up at the back of a cupboard?',
    },
    clothing_similar: {
      text: 'Do you already have a similar garment, for the same use or in the same colour?',
    },
    clothing_combos: {
      text: 'Would you pair it with at least three things already in your wardrobe?',
    },
    clothing_one_event: { text: 'Are you buying it for a single occasion?' },
    sport_consistent: {
      text: 'Have you practised that activity consistently for at least three months?',
    },
    sport_limit: {
      text: 'Does the equipment you have really limit your results or your safety?',
    },
    sport_try_first: { text: 'Can you try it or rent it before buying it?' },
    media_backlog: {
      text: 'Do you already have more than three books, games or films bought and not yet finished?',
    },
    media_library: {
      text: 'Can you find it in a library or in a subscription you already pay for?',
    },
    media_this_month: { text: 'Would you start it within a month?' },
    health_professional: {
      text: 'Was it recommended by a doctor, a pharmacist or another professional?',
    },
    health_finishing: { text: 'Do you already have a similar product you are still finishing?' },
    health_reviews: {
      text: 'Have you read independent opinions, not just the seller’s description?',
    },
    local_cheaper: {
      text: 'Is there a shop in your town selling a very similar product for much less?',
    },
    borrow_rent_used: { text: 'Could you borrow it, rent it or buy it second-hand?' },
    replace_broken: {
      text: 'Does it replace something broken, lost or that you can no longer use?',
    },
    budget_month_spent: {
      text: 'Have you already made other non-essential purchases this month?',
      hint: 'Count everything that was not a necessity.',
    },
    budget_regret: {
      text: 'If you saw this expense on your statement in a month, would it bother you?',
    },
    wanted_before: { text: 'Have you wanted it for more than two weeks?' },
    full_price_later: { text: 'Would you still buy it at full price in two months?' },
    wait_30_days: { text: 'If you waited 30 days, would you miss it?' },
    recommend_friend: { text: 'Would you recommend it to a friend in exactly your situation?' },
    pay_30_more: { text: 'Would you buy it even if it cost 30% more?' },
  },
  examples: {
    headphones: {
      title: 'Over-ear Bluetooth headphones with noise cancelling',
      note: 'Saw them in a video, mine still work perfectly.',
    },
    airfryer: { title: '5.5 L air fryer with dual basket' },
    shoes: {
      title: 'Cushioned running shoes, replacement for the model I use',
      note: 'The old ones have 900 km on them and hurt my knee.',
    },
  },
  home: {
    title: 'Paste a product link',
    subtitle:
      'Amazon or any other shop. A few honest questions and a score that says how much you really need it. No account, no sign-up.',
    placeholder: 'https://www.amazon.co.uk/dp/…',
    submit: 'Evaluate',
    manualLink: 'No link? Enter the product by hand',
    wishlistLink: 'Have an Amazon wish list? Import it',
    invalidLink: 'I don’t recognise this link. Paste the full address of the product.',
    listTitle: 'My items',
    empty: {
      title: 'No items evaluated yet',
      body: 'Paste a link above and answer the questions. Or see how it works with a few examples.',
      examples: 'Load three examples',
    },
    count: (n: number) => (n === 1 ? '1 item' : `${n} items`),
    queue: {
      title: 'To evaluate',
      body: 'Products taken from a wish list. Each one goes through the questions, one at a time.',
      evaluate: 'Evaluate',
      discard: 'Discard',
      fromList: (list: string) => `From the list “${list}”`,
    },
  },
  newItem: {
    title: 'What is it?',
    loading: 'Reading the product page…',
    previewOk: (site: string) =>
      `I read title, picture and price from ${site}. Correct anything you like.`,
    fromQueue: 'Taken from your wish list. Check the details and choose a category.',
    reasons: {
      blocked: 'Amazon did not let me read the page this time. Enter the details by hand.',
      'not-found': 'The product page no longer exists. You can enter the details by hand.',
      unsupported:
        'This link does not lead to a product page I can read. Enter the details by hand.',
      unparsable: 'I could not find a title and a picture on the page. Enter the details by hand.',
      unreachable: 'The shop did not answer in time. Enter the details by hand or try again.',
      network: 'You seem to be offline. You can still enter the details by hand.',
      'invalid-url': 'The link is not valid. Enter the details by hand.',
      wishlist: 'This link is an Amazon wish list, not a product.',
      none: 'Describe the product: a few words are enough.',
    },
    importWishlist: 'Import the list',
    retry: 'Try the automatic reading again',
    fields: {
      title: 'Product name',
      titlePlaceholder: 'E.g. Bluetooth headphones with noise cancelling',
      price: 'Price (optional)',
      pricePlaceholder: 'E.g. 49.90',
      imageUrl: 'Image address (optional)',
      imagePlaceholder: 'https://…',
      category: 'Category',
    },
    titleRequired: 'Write at least the product name.',
    start: 'Start the questions',
    back: 'Cancel',
  },
  wishlist: {
    title: 'Import a wish list',
    intro:
      'Paste the link of a public Amazon wish list: you choose which products to evaluate, one at a time, with the same questions.',
    placeholder: 'https://www.amazon.co.uk/hz/wishlist/ls/…',
    submit: 'Read the list',
    invalidLink: 'I don’t recognise this link. Paste the address of an Amazon wish list.',
    loading: 'Reading the list…',
    found: (n: number, list: string | null) =>
      `${n === 1 ? 'One product' : `${n} products`}${list ? ` in the list “${list}”` : ' in the list'}.`,
    partial:
      'Amazon stopped the reading before the end: the other products of the list must be added by hand.',
    products: 'Products in the list',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    add: (n: number) => (n === 1 ? 'Add 1 product to evaluate' : `Add ${n} products to evaluate`),
    selectOne: 'Select at least one product.',
    alreadyQueued: 'already to evaluate',
    alreadyEvaluated: 'already evaluated',
    noPrice: 'price not available',
    reasons: {
      blocked:
        'Amazon did not let me read the list this time. Try again shortly, or enter the products by hand.',
      private: 'The list is private or no longer available: I can only read public lists.',
      'not-found': 'The list does not exist or has been deleted.',
      unparsable: 'I could not read the products of the list.',
      unreachable: 'Amazon did not answer in time. Try again.',
      unsupported: 'The link does not lead to an Amazon wish list.',
      'invalid-url': 'The link is not valid.',
      network: 'You seem to be offline. Try again when you are back online.',
    },
    retry: 'Try again',
    back: 'Back to the start',
  },
  questionnaire: {
    progress: (n: number, max: number) => `Question ${n} · at most ${max}`,
    back: 'Previous question',
    cancel: 'Stop',
    shortcuts: 'Shortcuts: 1 yes · 2 no · 3 maybe',
    missingDraft: 'There is no product to evaluate. Paste a link to start.',
    stageHint: {
      1: 'The core questions',
      2: 'A few more questions, because the picture is not clear yet',
      3: 'Last tie-break questions',
    },
  },
  result: {
    scoreLabel: 'purchase necessity',
    confidence: (n: number) => `Confidence ${n}%`,
    answered: (n: number, maybe: number) =>
      maybe > 0 ? `${n} answers, ${maybe} of them “maybe”` : `${n} answers`,
    why: 'Why',
    driversEmpty: 'You answered “maybe” to everything: the score stays in the middle.',
    budgetShare: (percent: number, budget?: string) =>
      `It costs ${percent}% of your monthly budget${budget ? ` of ${budget}` : ''}`,
    contributionFor: 'in favour',
    contributionAgainst: 'against',
    contributionNeutral: 'neutral',
    budgetMissing: {
      setBudget: 'With a monthly budget the price weighs in the score.',
      link: 'Set the budget',
      addPrice:
        'This product has no price: add it when you re-evaluate it and it will weigh on your monthly budget.',
    },
    dimensionsTitle: 'The parameters',
    noData: 'No question on this aspect',
    suggestionsTitle: 'What I would do',
    answersTitle: 'Your answers',
    noteLabel: 'A note for your future self',
    notePlaceholder: 'E.g. my old headphones still have a good battery…',
    actions: {
      reevaluate: 'Re-evaluate',
      share: 'Copy link',
      shared: 'Link copied',
      open: 'Open the page',
      delete: 'Delete',
      deleteConfirm: 'Delete this item? This cannot be undone.',
    },
    evaluatedOn: (date: string) => `Evaluated on ${date}`,
    notFound: 'This item does not exist or has been deleted.',
  },
  shared: {
    title: 'Shared evaluation',
    body: 'Someone shared this evaluation with you. You can save it among your items.',
    save: 'Save to my items',
    saved: 'Saved',
    invalid: 'The link does not contain a valid evaluation.',
  },
  settings: {
    title: 'Settings',
    languageTitle: 'Language',
    languageBody:
      'The interface follows the browser language. You can choose it here: it is a setting of this browser and is not exported. Evaluations already made are shown in the chosen language.',
    languageLabel: 'Interface language',
    languageAuto: 'Same as the browser',
    languageNames: { it: 'Italiano', en: 'English' },
    dataTitle: 'Your data',
    dataBody:
      'Everything you evaluate stays in this browser. To move it to another device, export a file and import it there.',
    export: 'Export a file',
    import: 'Import a file',
    imported: (n: number, skipped: number) =>
      `${n === 1 ? 'Imported 1 item' : `Imported ${n} items`}${skipped > 0 ? `, ${skipped} skipped because not valid` : ''}.`,
    importError: {
      'invalid-json': 'The file is not a valid JSON file.',
      'invalid-format': 'The file does not contain DoINeedIt evaluations.',
    },
    examples: 'Load the examples',
    examplesLoaded: (n: number) =>
      n === 0 ? 'The examples are already there.' : `Loaded ${n} examples.`,
    clear: 'Delete everything',
    clearConfirm: 'Delete every evaluated item? This cannot be undone.',
    cleared: 'Everything deleted.',
    budgetTitle: 'Your budget',
    budgetBody:
      'How much you can spend each month on non-essential purchases. The price of each product is compared with this figure and weighs in the score. It is a setting of this browser: each evaluation remembers the budget it was made with, and that travels with the evaluation in exported files and shared links.',
    budgetLabel: 'Monthly budget in euro',
    budgetPlaceholder: 'E.g. 300',
    budgetSave: 'Save the budget',
    budgetRemove: 'Remove',
    budgetCurrent: (amount: string) => `Current budget: ${amount} a month.`,
    budgetNone: 'No budget set: the price does not weigh in the score.',
    budgetSaved: (amount: string) => `Monthly budget saved: ${amount}.`,
    budgetRemoved: 'Budget removed.',
    budgetInvalid: 'Write an amount greater than zero.',
    aboutTitle: 'How it works',
    aboutBody:
      'Each answer moves a score from 0 to 100: the most important answers weigh more, “maybe” leaves the score halfway. The core questions are enough when the verdict is clear; if it hangs in the balance, more follow, aimed at the category, up to about twenty. With a monthly budget set, the price weighs too.',
    privacy: 'Privacy policy',
    source: 'Source code',
  },
  privacy: {
    title: 'Privacy',
    sections: [
      {
        heading: 'What I store',
        body: 'The products you evaluate, the answers you give, the score, the notes, the products waiting to be evaluated, the monthly budget and the language. Everything stays in your browser’s memory (localStorage), on this device.',
      },
      {
        heading: 'What I don’t do',
        body: 'No account, no profiling cookies, no analytics tools, no sending of your data to a server of mine or of third parties.',
      },
      {
        heading: 'The product link',
        body: 'When you paste a link, a small function on the server reads the public product page once, on Amazon or another shop, to get title, picture and price, the way a link preview in a chat does. The same goes for a public wish list: it reads the visible products and nothing more. The link is not stored.',
      },
      {
        heading: 'Shared links',
        body: 'When you copy the link of an evaluation, the data travels inside the link itself, after the # symbol. Whoever opens it reads it in their own browser; no server receives it.',
      },
      {
        heading: 'Deleting everything',
        body: 'From the settings you can export or delete all the data in one tap. Clearing the site data from the browser deletes it too.',
      },
    ],
  },
  notFound: { title: 'Page not found', back: 'Back to the start' },
  common: { back: 'Back', close: 'Close', loading: 'One moment…' },
};
