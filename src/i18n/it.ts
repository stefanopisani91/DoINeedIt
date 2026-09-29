import type { QuestionId } from '@/data/questions';
import type { CategoryId } from '@/engine';

/** "l’8%", "l’80%", "l’11%", but "il 18%" and "il 100%": the article follows the sound of the number. */
function percentWithArticle(percent: number): string {
  const vowelSound =
    percent === 1 || percent === 8 || percent === 11 || (percent >= 80 && percent <= 89);
  return `${vowelSound ? 'l’' : 'il '}${percent}%`;
}

export interface QuestionCopy {
  text: string;
  hint?: string;
}

export interface CategoryCopy {
  label: string;
  description: string;
}

export interface ExampleCopy {
  title: string;
  note?: string;
}

/**
 * All user-facing copy, in Italian. Every other language must have exactly
 * this shape: `Copy` is derived from this object, so the type checker
 * reports a missing or extra key in `en.ts`.
 */
export const it = {
  lang: 'it',
  /** Locale for dates and prices. */
  locale: 'it-IT',
  app: {
    name: 'DoINeedIt',
    tagline: 'Ti serve davvero?',
    documentTitle: 'DoINeedIt · Ti serve davvero?',
    description:
      'Ti serve davvero? Incolla il link di un prodotto, rispondi a poche domande e scopri quanto ti serve quell’acquisto.',
    nav: {
      label: 'Navigazione principale',
      home: 'I miei oggetti',
      homeShort: 'Oggetti',
      new: 'Nuova valutazione',
      newShort: 'Nuova',
      insights: 'Insight',
      settings: 'Impostazioni',
      settingsShort: 'Impostazioni',
    },
    skipToContent: 'Salta al contenuto',
    footer: 'I tuoi dati restano nel tuo browser. Nessun account, nessun tracciamento.',
    privacyLink: 'Privacy',
    version: (version: string) => `Versione ${version}`,
  },
  /** Document titles, one per page; the home keeps the full app title. */
  pages: {
    new: 'Nuova valutazione',
    wishlist: 'Lista dei desideri',
    evaluate: 'Domande',
    item: 'Dettaglio',
    shared: 'Condivisione',
    settings: 'Impostazioni',
    privacy: 'Privacy',
    insights: 'Insight',
    notFound: 'Pagina non trovata',
  },
  update: {
    available: 'È disponibile una nuova versione di DoINeedIt.',
    reload: 'Aggiorna',
    later: 'Più tardi',
  },
  answers: { yes: 'Sì', no: 'No', maybe: 'Forse' },
  verdict: {
    buy: {
      label: 'Ti serve davvero',
      short: 'Serve',
      lead: 'Le risposte dicono che risolve un bisogno reale.',
    },
    wait: {
      label: 'Rimanda e riconsidera',
      short: 'Rimanda',
      lead: 'Il quadro è incerto: aspettare costa poco.',
    },
    skip: { label: 'Non ti serve', short: 'Non serve', lead: 'Il desiderio c’è, il bisogno no.' },
  },
  dimensions: {
    utility: 'Utilità reale',
    urgency: 'Urgenza',
    alternatives: 'Alternative',
    impulse: 'Freddezza',
    budget: 'Budget',
  },
  dimensionHints: {
    utility: 'Quanto lo useresti davvero',
    urgency: 'Quanto è urgente averlo',
    alternatives: 'Quanto è difficile fare a meno di comprarlo nuovo',
    impulse: 'Quanto la scelta è ragionata e non d’impulso',
    budget: 'Quanto è sostenibile per il tuo budget',
  },
  suggestions: {
    buy: [
      'Confronta il prezzo su almeno un altro negozio prima di ordinare.',
      'Controlla se esiste una versione precedente che costa meno e fa lo stesso lavoro.',
      'Compra la versione base: gli extra si aggiungono dopo, se servono davvero.',
    ],
    wait: [
      'Metti il prodotto in una lista e torna a guardarlo tra 30 giorni.',
      'Nel frattempo prova ad arrangiarti con quello che hai: spesso basta.',
      'Cerca lo stesso prodotto usato o in prestito, poi decidi.',
    ],
    skip: [
      'Chiudi la scheda: il desiderio passa in fretta, i soldi restano.',
      'Se torna in mente tra un mese, rivaluta con calma.',
      'Segna quanto avresti speso: a fine anno la somma sorprende.',
    ],
  },
  categories: {
    tech: { label: 'Tecnologia', description: 'Telefoni, cuffie, PC, gadget' },
    home: { label: 'Casa', description: 'Arredo, pulizia, giardino' },
    kitchen: { label: 'Cucina', description: 'Elettrodomestici e utensili' },
    clothing: { label: 'Abbigliamento', description: 'Vestiti, scarpe, accessori' },
    sport: { label: 'Sport e hobby', description: 'Attrezzatura, fai da te, giochi' },
    media: { label: 'Libri e media', description: 'Libri, videogiochi, film' },
    health: { label: 'Salute e bellezza', description: 'Cura personale, integratori' },
    other: { label: 'Altro', description: 'Tutto il resto' },
  } satisfies Record<CategoryId, CategoryCopy>,
  questions: {
    own_similar: {
      text: 'Hai già qualcosa che svolge la stessa funzione?',
      hint: 'Conta anche se è di un’altra marca, più vecchio o meno bello.',
    },
    own_works: {
      text: 'Quello che hai già funziona ancora bene?',
      hint: 'Se ti basta per l’uso che ne fai, rispondi sì.',
    },
    new_different: {
      text: 'Il nuovo prodotto fa qualcosa di davvero diverso che ti serve?',
      hint: 'Una funzione concreta che userai, non una scheda tecnica migliore.',
    },
    concrete_need: {
      text: 'Risponde a un’esigenza concreta che hai già adesso?',
      hint: 'Non a un “potrebbe servire un giorno”.',
    },
    weekly_use: { text: 'Lo useresti almeno una volta a settimana nei prossimi tre mesi?' },
    problem_soon: {
      text: 'Se non lo comprassi, avresti un problema concreto entro un mese?',
      hint: 'Un problema reale: tempo perso, soldi spesi, qualcosa che non puoi fare.',
    },
    impulse_today: {
      text: 'Hai deciso di comprarlo oggi, sull’onda di un’offerta, di un video o di un consiglio?',
    },
    budget_sacrifice: {
      text: 'Per pagarlo dovresti intaccare i risparmi, pagare a rate o rinunciare a qualcosa che avevi già programmato?',
      hint: 'Se lo paghi con i soldi del mese senza pensarci, rispondi no.',
    },
    tech_unsupported: {
      text: 'Il dispositivo che usi oggi è rotto, insopportabilmente lento o senza più aggiornamenti?',
    },
    tech_daily_diff: { text: 'La differenza rispetto a quello che hai la noteresti ogni giorno?' },
    tech_extra_costs: {
      text: 'Per usarlo davvero servono accessori, abbonamenti o cavi da comprare a parte?',
    },
    home_daily_annoy: { text: 'Risolve un fastidio che senti quasi ogni giorno in casa?' },
    home_prettier: { text: 'È una versione più bella o più nuova di qualcosa che possiedi già?' },
    home_special_only: { text: 'Lo useresti solo in occasioni speciali o quando hai ospiti?' },
    kitchen_frequency: { text: 'Prepari quel tipo di piatto almeno ogni due settimane?' },
    kitchen_same_result: {
      text: 'Puoi ottenere lo stesso risultato con un attrezzo che hai già?',
      hint: 'Una pentola, un frullatore, il forno che hai già.',
    },
    kitchen_reach: {
      text: 'Avrebbe un posto a portata di mano, senza finire in fondo a un armadio?',
    },
    clothing_similar: {
      text: 'Hai già un capo simile, per lo stesso uso o dello stesso colore?',
    },
    clothing_combos: { text: 'Lo abbineresti con almeno tre cose che hai già nell’armadio?' },
    clothing_one_event: { text: 'Lo compri per una sola occasione?' },
    sport_consistent: { text: 'Pratichi quell’attività con costanza da almeno tre mesi?' },
    sport_limit: {
      text: 'L’attrezzatura che hai ti limita davvero nei risultati o nella sicurezza?',
    },
    sport_try_first: { text: 'Puoi provarlo o noleggiarlo prima di comprarlo?' },
    media_backlog: {
      text: 'Hai già più di tre libri, giochi o film comprati e non ancora finiti?',
    },
    media_library: { text: 'Lo trovi in biblioteca o in un abbonamento che paghi già?' },
    media_this_month: { text: 'Lo inizieresti entro un mese?' },
    health_professional: {
      text: 'Te l’ha consigliato un medico, un farmacista o un altro professionista?',
    },
    health_finishing: { text: 'Hai già un prodotto simile che stai ancora finendo?' },
    health_reviews: {
      text: 'Hai letto pareri indipendenti, non solo la descrizione del venditore?',
    },
    local_cheaper: {
      text: 'C’è un negozio nella tua città che vende un prodotto molto simile a un prezzo molto inferiore?',
    },
    borrow_rent_used: { text: 'Potresti prenderlo in prestito, noleggiarlo o comprarlo usato?' },
    replace_broken: { text: 'Sostituisce qualcosa di rotto, perso o che non puoi più usare?' },
    budget_month_spent: {
      text: 'Questo mese hai già fatto altri acquisti non indispensabili?',
      hint: 'Conta tutto quello che non era una necessità.',
    },
    budget_regret: {
      text: 'Se tra un mese rivedessi questa spesa sull’estratto conto, ti darebbe fastidio?',
    },
    wanted_before: { text: 'Lo desideravi già da più di due settimane?' },
    full_price_later: { text: 'Lo compreresti lo stesso a prezzo pieno tra due mesi?' },
    wait_30_days: { text: 'Se aspettassi 30 giorni, ne sentiresti la mancanza?' },
    recommend_friend: { text: 'Lo consiglieresti a un amico nella tua identica situazione?' },
    pay_30_more: { text: 'Lo compreresti anche se costasse il 30% in più?' },
  } satisfies Record<QuestionId, QuestionCopy>,
  examples: {
    headphones: {
      title: 'Cuffie Bluetooth over-ear con cancellazione del rumore',
      note: 'Viste in un video, le mie funzionano ancora benissimo.',
    },
    airfryer: { title: 'Friggitrice ad aria 5,5 L con doppio cestello' },
    shoes: {
      title: 'Scarpe da corsa ammortizzate, ricambio del modello che uso',
      note: 'Le vecchie hanno 900 km e mi fanno male al ginocchio.',
    },
  } satisfies Record<'headphones' | 'airfryer' | 'shoes', ExampleCopy>,
  home: {
    title: 'Incolla il link di un prodotto',
    subtitle:
      'Amazon o qualsiasi altro negozio. Poche domande sincere e un punteggio che dice quanto ti serve davvero. Senza account, senza registrazione.',
    placeholder: 'https://www.amazon.it/dp/…',
    submit: 'Valuta',
    clearField: 'Svuota il campo',
    manualLink: 'Inserisci il prodotto a mano',
    wishlistLink: 'Importa una lista dei desideri',
    invalidLink: 'Non riconosco questo link. Incolla l’indirizzo completo del prodotto.',
    listTitle: 'I miei oggetti',
    library: {
      search: 'Cerca tra i tuoi oggetti',
      searchPlaceholder: 'Nome, nota o categoria',
      clearSearch: 'Svuota la ricerca',
      verdictFilter: 'Filtra per verdetto',
      all: 'Tutti',
      category: 'Categoria',
      allCategories: 'Tutte le categorie',
      sort: 'Ordina',
      sortOptions: {
        recent: 'Più recenti',
        'score-desc': 'Necessità più alta',
        'score-asc': 'Necessità più bassa',
        'price-desc': 'Prezzo più alto',
        'price-asc': 'Prezzo più basso',
      },
      shown: (shown: number, total: number) => `${shown} su ${total} mostrati`,
      reset: 'Azzera i filtri',
    },
    summary: {
      title: 'In sintesi',
      evaluated: (n: number): string => (n === 1 ? 'valutazione' : 'valutazioni'),
      stopped: (n: number): string => (n === 1 ? 'impulso fermato' : 'impulsi fermati'),
      unspent: 'non spesi',
      toReconsider: 'da ripensare',
      otherCurrencies: (n: number) => (n === 1 ? '+ 1 altra valuta' : `+ ${n} altre valute`),
      distribution: (buy: number, wait: number, skip: number) =>
        `${buy} serve, ${wait} rimanda, ${skip} non serve`,
    },
    card: { hasNote: 'Con nota' },
    noResults: {
      title: 'Nessun oggetto corrisponde',
      body: 'Prova a cambiare la ricerca o a togliere un filtro.',
    },
    empty: {
      title: 'Nessun oggetto valutato, per ora',
      body: 'Incolla un link qui sopra e rispondi alle domande. Oppure guarda come funziona con qualche esempio.',
      examples: 'Carica tre esempi',
    },
    count: (n: number) => (n === 1 ? '1 oggetto' : `${n} oggetti`),
    queue: {
      title: 'Da valutare',
      body: 'Prodotti presi da una lista dei desideri. Ognuno passa dalle domande, uno alla volta.',
      evaluate: 'Valuta',
      discard: 'Scarta',
      fromList: (list: string) => `Dalla lista «${list}»`,
    },
  },
  newItem: {
    title: 'Di cosa si tratta?',
    loading: 'Leggo la pagina del prodotto…',
    previewOk: (site: string) =>
      `Ho letto titolo, foto e prezzo da ${site}. Correggi quello che vuoi.`,
    fromQueue: 'Preso dalla tua lista dei desideri. Controlla i dati e scegli la categoria.',
    reasons: {
      blocked: 'Amazon non ha permesso di leggere la pagina questa volta. Inserisci i dati a mano.',
      'not-found': 'La pagina del prodotto non esiste più. Puoi inserire i dati a mano.',
      unsupported:
        'Questo link non porta a una pagina di prodotto che so leggere. Inserisci i dati a mano.',
      unparsable: 'Non ho trovato titolo e foto nella pagina. Inserisci i dati a mano.',
      unreachable: 'Il negozio non ha risposto in tempo. Inserisci i dati a mano o riprova.',
      network: 'Sembra che tu sia offline. Puoi comunque inserire i dati a mano.',
      'invalid-url': 'Il link non è valido. Inserisci i dati a mano.',
      wishlist: 'Questo link è una lista dei desideri Amazon, non un prodotto.',
      none: 'Descrivi il prodotto: bastano poche parole.',
    },
    importWishlist: 'Importa la lista',
    retry: 'Riprova la lettura automatica',
    skipPreview: 'Inserisci i dati a mano senza aspettare',
    slow: 'Il negozio è lento a rispondere… puoi inserire i dati a mano senza aspettare.',
    priceInvalid: 'Prezzo non valido: usa solo numeri, es. 49,90.',
    fields: {
      title: 'Nome del prodotto',
      titlePlaceholder: 'Es. Cuffie Bluetooth con cancellazione del rumore',
      price: 'Prezzo (facoltativo)',
      pricePlaceholder: 'Es. 49,90',
      imageUrl: 'Indirizzo di un’immagine (facoltativo)',
      imagePlaceholder: 'https://…',
      category: 'Categoria',
      categoryHint: 'La categoria giusta aggiunge tre domande su misura.',
    },
    titleRequired: 'Scrivi almeno il nome del prodotto.',
    start: 'Inizia le domande',
    back: 'Annulla',
  },
  wishlist: {
    title: 'Importa una lista dei desideri',
    intro:
      'Incolla il link di una lista dei desideri Amazon pubblica: scegli tu quali prodotti valutare, uno alla volta, con le stesse domande.',
    placeholder: 'https://www.amazon.it/hz/wishlist/ls/…',
    submit: 'Leggi la lista',
    invalidLink: 'Non riconosco questo link. Incolla l’indirizzo di una lista dei desideri Amazon.',
    loading: 'Leggo la lista…',
    found: (n: number, list: string | null) =>
      `${n === 1 ? 'Un prodotto' : `${n} prodotti`}${list ? ` nella lista «${list}»` : ' nella lista'}.`,
    partial: {
      blocked:
        'Amazon ha interrotto la lettura prima della fine: gli altri prodotti della lista vanno aggiunti a mano, oppure riprova tra poco.',
      limit:
        'La lista è più lunga di quanto riesco a leggere in una volta: gli altri prodotti vanno aggiunti a mano.',
    },
    products: 'Prodotti della lista',
    selectAll: 'Seleziona tutti',
    deselectAll: 'Deseleziona tutti',
    add: (n: number) =>
      n === 1 ? 'Aggiungi 1 prodotto da valutare' : `Aggiungi ${n} prodotti da valutare`,
    selectOne: 'Seleziona almeno un prodotto.',
    alreadyQueued: 'già da valutare',
    alreadyEvaluated: 'già valutato',
    noPrice: 'prezzo non disponibile',
    reasons: {
      blocked:
        'Amazon non ha permesso di leggere la lista questa volta. Riprova tra poco, oppure inserisci i prodotti a mano.',
      private: 'La lista è privata o non è più disponibile: posso leggere solo le liste pubbliche.',
      'not-found': 'La lista non esiste o è stata eliminata.',
      unparsable: 'Non sono riuscito a leggere i prodotti della lista.',
      unreachable: 'Amazon non ha risposto in tempo. Riprova.',
      unsupported: 'Il link non porta a una lista dei desideri Amazon.',
      'invalid-url': 'Il link non è valido.',
      network: 'Sembra che tu sia offline. Riprova quando torni in rete.',
    },
    retry: 'Riprova',
    back: 'Torna all’inizio',
  },
  questionnaire: {
    progress: (n: number, max: number) => `Domanda ${n} · al massimo ${max}`,
    back: 'Domanda precedente',
    cancel: 'Interrompi',
    shortcuts: 'Scorciatoie: 1 sì · 2 no · 3 forse · ⌫ domanda precedente',
    missingDraft: 'Non c’è nessun prodotto da valutare. Incolla un link per iniziare.',
    missingDraftManual: 'Inserisci il prodotto a mano',
    stageHint: {
      1: 'Le domande di base',
      2: 'Qualche domanda in più, perché il quadro non è ancora chiaro',
      3: 'Ultime domande di spareggio',
    },
    stepperLabel: 'Avanzamento del questionario',
    stages: { 1: 'Base', 2: 'Approfondimento', 3: 'Spareggio' },
    evaluating: 'Stai valutando',
    dimensionOf: (dimension: string) => `Pesa su «${dimension}»`,
    confirmCancel: {
      title: 'Interrompere la valutazione?',
      body: (n: number) =>
        n === 1 ? 'Perderai la risposta data finora.' : `Perderai le ${n} risposte date finora.`,
      confirm: 'Interrompi',
      keep: 'Continua a rispondere',
    },
    resume: {
      text: (title: string, n: number) =>
        `Hai una valutazione in corso: «${title}», ${n === 1 ? '1 risposta data' : `${n} risposte date`}.`,
      continue: 'Riprendi',
      discard: 'Scarta la valutazione in corso',
    },
  },
  result: {
    scoreLabel: 'necessità d’acquisto',
    confidence: (n: number) => `Affidabilità ${n}%`,
    answered: (n: number, maybe: number) =>
      maybe > 0 ? `${n} risposte, di cui ${maybe} “forse”` : `${n} risposte`,
    why: 'Perché',
    driversEmpty: 'Hai risposto “forse” a tutto: il punteggio resta in mezzo.',
    budgetShare: (percent: number, budget?: string) =>
      `Costa ${percentWithArticle(percent)} del tuo budget mensile${budget ? ` di ${budget}` : ''}`,
    contributionFor: 'a favore',
    contributionAgainst: 'contro',
    contributionNeutral: 'neutro',
    budgetMissing: {
      setBudget: 'Con un budget mensile il prezzo pesa nel punteggio.',
      link: 'Imposta il budget',
      addPrice:
        'Questo prodotto non ha un prezzo: aggiungilo quando lo rivaluti e peserà sul tuo budget mensile.',
    },
    dimensionsTitle: 'I parametri',
    noData: 'Nessuna domanda su questo aspetto',
    suggestionsTitle: 'Cosa farei',
    answersTitle: 'Le tue risposte',
    noteLabel: 'Una nota per il te del futuro',
    notePlaceholder: 'Es. le mie cuffie vecchie hanno ancora la batteria buona…',
    noteSaved: 'Nota salvata',
    thresholdsHint: 'Sotto 40 non serve, da 70 serve davvero',
    actions: {
      reevaluate: 'Rivaluta',
      share: 'Copia link',
      shared: 'Link copiato',
      shareNative: 'Condividi',
      open: 'Apri la pagina',
      delete: 'Elimina',
      deleteTitle: 'Eliminare questo oggetto?',
      deleteConfirm: 'Eliminare questo oggetto? Non si può annullare.',
      deleteYes: 'Sì, elimina',
      deleteNo: 'Annulla',
    },
    evaluatedOn: (date: string) => `Valutato il ${date}`,
    notFound: 'Questo oggetto non esiste o è stato eliminato.',
  },
  decision: {
    title: 'Cosa hai fatto poi?',
    body: 'Registra l’esito: i numeri in Insight raccontano quanto hai davvero risparmiato.',
    group: 'Esito della decisione',
    bought: 'Comprato',
    skipped: 'Non comprato',
    pending: 'Ancora in attesa',
    pricePaid: 'Prezzo pagato (facoltativo)',
    savePrice: 'Salva il prezzo',
    decidedOn: (date: string, outcome: string) => `Deciso il ${date}: ${outcome.toLowerCase()}`,
    notSpent: (amount: string) => `${amount} non spesi`,
    spent: (amount: string) => `${amount} spesi`,
    sharedOutcome: (outcome: string) => `Poi deciso: ${outcome.toLowerCase()}`,
  },
  coolingOff: {
    until: (date: string, days: number) =>
      days === 1
        ? `Ripensaci il ${date} · manca 1 giorno`
        : `Ripensaci il ${date} · mancano ${days} giorni`,
    expired: 'I 30 giorni sono passati: decidi con calma.',
    badge: (days: number) =>
      days === 1 ? 'Ripensaci tra 1 giorno' : `Ripensaci tra ${days} giorni`,
    ready: 'Pronto per il ripensamento',
    sectionTitle: 'Da ripensare',
    sectionBody: 'Sono passati 30 giorni dal verdetto «Rimanda». Ti manca ancora?',
    none: 'Nessun oggetto in attesa di ripensamento.',
  },
  history: {
    title: 'Valutazioni precedenti',
    count: (n: number) => (n === 1 ? '1 valutazione precedente' : `${n} valutazioni precedenti`),
    delta: (points: number, date: string) =>
      `${points > 0 ? `+${points}` : points} punti rispetto al ${date}`,
    same: (date: string) => `Stesso punteggio del ${date}`,
  },
  shared: {
    title: 'Valutazione condivisa',
    body: 'Qualcuno ha condiviso con te questa valutazione. Puoi salvarla tra i tuoi oggetti.',
    save: 'Salva nei miei oggetti',
    saved: 'Salvato',
    invalid: 'Il link non contiene una valutazione valida.',
    answersTitle: 'Le risposte date',
    noteLabel: 'Nota di chi ha condiviso',
    evaluateYourself: 'Valuta anche tu',
    sharedOn: (date: string) => `Condivisa il ${date}`,
  },
  insights: {
    title: 'I tuoi numeri',
    intro: 'Cosa dicono le tue valutazioni, messe insieme. Restano nel tuo browser.',
    empty: 'Valuta almeno un prodotto per vedere qualcosa qui.',
    evaluations: 'Valutazioni',
    notSpent: 'Soldi non spesi',
    notSpentHint: 'Prezzo degli oggetti non comprati o con verdetto «Non ti serve».',
    spent: 'Spesi',
    impulsesLabel: 'Impulsi fermati',
    impulses: (n: number) => (n === 1 ? '1 impulso fermato' : `${n} impulsi fermati`),
    averageScore: 'Necessità media',
    maybeShare: (percent: number) => `${percent}% di «forse»`,
    verdictsChart: 'I verdetti',
    monthsChart: 'Valutazioni per mese',
    categoriesChart: 'Per categoria',
    budgetTitle: 'Il budget di questo mese',
    budgetMonth: (spent: string, budget: string) =>
      `Questo mese hai comprato per ${spent} su un budget di ${budget}.`,
    budgetNone: 'Imposta un budget mensile per confrontarlo con quanto compri davvero.',
    showData: 'Mostra i dati in tabella',
    unpriced: (n: number) =>
      n === 1
        ? '1 oggetto senza prezzo non entra nelle somme.'
        : `${n} oggetti senza prezzo non entrano nelle somme.`,
    mixedCurrencies: 'Le somme sono separate per valuta.',
    table: {
      month: 'Mese',
      count: 'Valutazioni',
      verdict: 'Verdetto',
      category: 'Categoria',
      amount: 'Importo',
      share: 'Quota',
    },
  },
  settings: {
    title: 'Impostazioni',
    themeTitle: 'Aspetto',
    themeBody:
      'Scegli se l’app è chiara o scura. «Come il sistema» segue l’impostazione del dispositivo.',
    themeLabel: 'Tema',
    themeSystem: 'Come il sistema',
    themeLight: 'Chiaro',
    themeDark: 'Scuro',
    languageTitle: 'Lingua',
    languageBody:
      'L’interfaccia segue la lingua del browser. Qui puoi sceglierla tu: è un’impostazione di questo browser e non viene esportata. Le valutazioni già fatte si leggono nella lingua scelta.',
    languageLabel: 'Lingua dell’interfaccia',
    languageAuto: 'Come il browser',
    languageNames: { it: 'Italiano', en: 'English' },
    dataTitle: 'I tuoi dati',
    dataBody:
      'Tutto quello che valuti resta in questo browser. Per portarlo su un altro dispositivo esporta un file e importalo lì.',
    export: 'Esporta un file',
    exportCsv: 'Esporta in CSV',
    dataHint: 'Il file JSON si può reimportare; il CSV si apre in un foglio di calcolo.',
    import: 'Importa un file',
    imported: (n: number, skipped: number) =>
      `${n === 1 ? 'Importato 1 oggetto' : `Importati ${n} oggetti`}${skipped > 0 ? `, ${skipped} scartati perché non validi` : ''}.`,
    importError: {
      'invalid-json': 'Il file non è un file JSON valido.',
      'invalid-format': 'Il file non contiene valutazioni di DoINeedIt.',
    },
    examples: 'Carica gli esempi',
    examplesLoaded: (n: number) => (n === 0 ? 'Gli esempi ci sono già.' : `Caricati ${n} esempi.`),
    clear: 'Cancella tutto',
    clearTitle: 'Cancellare tutti gli oggetti valutati?',
    clearConfirm: 'Cancellare tutti gli oggetti valutati? Non si può annullare.',
    clearYes: 'Sì, cancella tutto',
    clearNo: 'Annulla',
    cleared: 'Tutto cancellato.',
    budgetTitle: 'Il tuo budget',
    budgetBody:
      'Quanto puoi spendere ogni mese per gli acquisti non indispensabili. Il prezzo di ogni prodotto viene confrontato con questa cifra e pesa nel punteggio. È un’impostazione di questo browser: ogni valutazione ricorda il budget con cui è stata fatta, e quello viaggia con la valutazione anche nei file esportati e nei link condivisi.',
    budgetLabel: 'Budget mensile in euro',
    budgetPlaceholder: 'Es. 300',
    budgetSave: 'Salva il budget',
    budgetRemove: 'Rimuovi',
    budgetCurrent: (amount: string) => `Budget attuale: ${amount} al mese.`,
    budgetNone: 'Nessun budget impostato: il prezzo non pesa nel punteggio.',
    budgetSaved: (amount: string) => `Budget mensile salvato: ${amount}.`,
    budgetRemoved: 'Budget rimosso.',
    budgetInvalid: 'Scrivi un importo maggiore di zero.',
    infoTitle: 'Informazioni',
    version: (app: string, engine: number) => `Versione ${app} · motore ${engine}`,
    installTitle: 'Installa l’app',
    installBody:
      'Si apre a schermo intero, funziona offline e su Android compare nel menu Condividi.',
    install: 'Installa',
    installIos: 'Su iPhone e iPad: Condividi → Aggiungi a schermata Home.',
    installed: 'L’app è già installata.',
    aboutTitle: 'Come funziona',
    aboutBody:
      'Ogni risposta sposta un punteggio da 0 a 100: le risposte più importanti pesano di più, “forse” lascia il punteggio a metà. Le domande di base bastano quando il verdetto è chiaro; se resta in bilico, ne arrivano altre, mirate alla categoria, fino a un massimo di una ventina. Con un budget mensile impostato, anche il prezzo pesa.',
    privacy: 'Informativa sulla privacy',
    source: 'Codice sorgente',
  },
  welcome: {
    title: 'Come funziona, in breve',
    steps: [
      'Incolla il link di un prodotto, o descrivilo a mano.',
      'Rispondi sincero a poche domande: sì, no, forse.',
      'Leggi il verdetto e, se è «rimanda», lascia passare trenta giorni.',
    ],
    privacy: 'Tutto resta in questo browser: nessun account, nessun tracciamento.',
    dismiss: 'Ho capito',
  },
  csv: {
    columns: {
      title: 'Prodotto',
      category: 'Categoria',
      price: 'Prezzo',
      currency: 'Valuta',
      score: 'Necessità',
      verdict: 'Verdetto',
      confidence: 'Affidabilità',
      answers: 'Risposte',
      maybe: 'Forse',
      evaluatedAt: 'Valutato il',
      budget: 'Budget',
      budgetShare: 'Quota del budget',
      decision: 'Esito',
      decidedAt: 'Deciso il',
      pricePaid: 'Prezzo pagato',
      note: 'Nota',
      link: 'Link',
    },
  },
  privacy: {
    title: 'Privacy',
    intro: 'In due parole: i tuoi dati non escono dal tuo dispositivo.',
    sections: [
      {
        heading: 'Cosa salvo',
        body: 'I prodotti che valuti, le risposte che dai, il punteggio, le note, l’esito delle decisioni, i prodotti in attesa di valutazione, il budget mensile, la lingua e il tema. Tutto resta nella memoria del tuo browser (localStorage), su questo dispositivo.',
      },
      {
        heading: 'Cosa non faccio',
        body: 'Nessun account, nessun cookie di profilazione, nessuno strumento di analisi, nessun invio dei tuoi dati a un server mio o di terzi.',
      },
      {
        heading: 'Il link del prodotto',
        body: 'Quando incolli un link, una piccola funzione sul server legge una sola volta la pagina pubblica del prodotto, di Amazon o di un altro negozio, per ricavare titolo, foto e prezzo, come fa l’anteprima di un link in una chat. Lo stesso vale per una lista dei desideri pubblica: ne legge i prodotti visibili e basta. Il link non viene memorizzato.',
      },
      {
        heading: 'I link condivisi',
        body: 'Quando copi il link di una valutazione, i dati viaggiano dentro il link stesso, dopo il simbolo #. Chi lo apre li legge nel proprio browser; nessun server li riceve.',
      },
      {
        heading: 'Cancellare tutto',
        body: 'Dalle impostazioni puoi esportare o cancellare tutti i dati in un tocco. Anche svuotare i dati del sito dal browser li elimina.',
      },
    ],
  },
  notFound: {
    title: 'Pagina non trovata',
    body: 'L’indirizzo potrebbe essere sbagliato, o la pagina è stata spostata.',
    back: 'Torna all’inizio',
    new: 'Nuova valutazione',
  },
  common: {
    back: 'Indietro',
    close: 'Chiudi',
    cancel: 'Annulla',
    loading: 'Un momento…',
    optional: 'facoltativo',
  },
};

export type Copy = typeof it;
