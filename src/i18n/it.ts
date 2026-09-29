/** All user-facing copy, in Italian. Kept in one place to make a second language easy. */
export const it = {
  app: {
    name: 'DoINeedIt',
    tagline: 'Ti serve davvero?',
    nav: { home: 'I miei oggetti', settings: 'Impostazioni' },
    footer: 'I tuoi dati restano nel tuo browser. Nessun account, nessun tracciamento.',
    privacyLink: 'Privacy',
  },
  answers: { yes: 'Sì', no: 'No', maybe: 'Forse' },
  verdict: {
    buy: { label: 'Ti serve davvero', short: 'Serve' },
    wait: { label: 'Rimanda e riconsidera', short: 'Rimanda' },
    skip: { label: 'Non ti serve', short: 'Non serve' },
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
    budget: 'Quanto pesa sul tuo budget',
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
  home: {
    title: 'Incolla il link di un prodotto Amazon',
    subtitle:
      'Poche domande sincere e un punteggio che dice quanto ti serve davvero. Senza account, senza registrazione.',
    placeholder: 'https://www.amazon.it/dp/…',
    submit: 'Valuta',
    manualLink: 'Non hai un link? Inserisci il prodotto a mano',
    invalidLink: 'Non riconosco questo link. Incolla l’indirizzo completo del prodotto.',
    listTitle: 'I miei oggetti',
    empty: {
      title: 'Nessun oggetto valutato, per ora',
      body: 'Incolla un link qui sopra e rispondi alle domande. Oppure guarda come funziona con qualche esempio.',
      examples: 'Carica tre esempi',
    },
    count: (n: number) => (n === 1 ? '1 oggetto' : `${n} oggetti`),
  },
  newItem: {
    title: 'Di cosa si tratta?',
    loading: 'Leggo la pagina del prodotto…',
    previewOk: 'Ho letto titolo, foto e prezzo dalla pagina. Correggi quello che vuoi.',
    reasons: {
      blocked: 'Amazon non ha permesso di leggere la pagina questa volta. Inserisci i dati a mano.',
      'not-found': 'La pagina del prodotto non esiste più. Puoi inserire i dati a mano.',
      unsupported:
        'Per ora leggo in automatico solo le pagine dei singoli prodotti Amazon. Inserisci i dati a mano.',
      unparsable: 'Non sono riuscito a leggere la pagina. Inserisci i dati a mano.',
      unreachable: 'Amazon non ha risposto in tempo. Inserisci i dati a mano o riprova.',
      network: 'Sembra che tu sia offline. Puoi comunque inserire i dati a mano.',
      'invalid-url': 'Il link non è valido. Inserisci i dati a mano.',
      none: 'Descrivi il prodotto: bastano poche parole.',
    },
    retry: 'Riprova la lettura automatica',
    fields: {
      title: 'Nome del prodotto',
      titlePlaceholder: 'Es. Cuffie Bluetooth con cancellazione del rumore',
      price: 'Prezzo (facoltativo)',
      pricePlaceholder: 'Es. 49,90',
      imageUrl: 'Indirizzo di un’immagine (facoltativo)',
      imagePlaceholder: 'https://…',
      category: 'Categoria',
    },
    titleRequired: 'Scrivi almeno il nome del prodotto.',
    start: 'Inizia le domande',
    back: 'Annulla',
  },
  questionnaire: {
    progress: (n: number, max: number) => `Domanda ${n} · al massimo ${max}`,
    back: 'Domanda precedente',
    cancel: 'Interrompi',
    shortcuts: 'Scorciatoie: 1 sì · 2 no · 3 forse',
    missingDraft: 'Non c’è nessun prodotto da valutare. Incolla un link per iniziare.',
    stageHint: {
      1: 'Le domande di base',
      2: 'Qualche domanda in più, perché il quadro non è ancora chiaro',
      3: 'Ultime domande di spareggio',
    },
  },
  result: {
    scoreLabel: 'necessità d’acquisto',
    confidence: (n: number) => `Affidabilità ${n}%`,
    answered: (n: number, maybe: number) =>
      maybe > 0 ? `${n} risposte, di cui ${maybe} “forse”` : `${n} risposte`,
    why: 'Perché',
    driversEmpty: 'Hai risposto “forse” a tutto: il punteggio resta in mezzo.',
    dimensionsTitle: 'I parametri',
    noData: 'Nessuna domanda su questo aspetto',
    suggestionsTitle: 'Cosa farei',
    answersTitle: 'Le tue risposte',
    noteLabel: 'Una nota per il te del futuro',
    notePlaceholder: 'Es. le mie cuffie vecchie hanno ancora la batteria buona…',
    actions: {
      reevaluate: 'Rivaluta',
      share: 'Copia link',
      shared: 'Link copiato',
      open: 'Apri la pagina',
      delete: 'Elimina',
      deleteConfirm: 'Eliminare questo oggetto? Non si può annullare.',
    },
    evaluatedOn: (date: string) => `Valutato il ${date}`,
    notFound: 'Questo oggetto non esiste o è stato eliminato.',
  },
  shared: {
    title: 'Valutazione condivisa',
    body: 'Qualcuno ha condiviso con te questa valutazione. Puoi salvarla tra i tuoi oggetti.',
    save: 'Salva nei miei oggetti',
    saved: 'Salvato',
    invalid: 'Il link non contiene una valutazione valida.',
  },
  settings: {
    title: 'Impostazioni',
    dataTitle: 'I tuoi dati',
    dataBody:
      'Tutto quello che valuti resta in questo browser. Per portarlo su un altro dispositivo esporta un file e importalo lì.',
    export: 'Esporta un file',
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
    clearConfirm: 'Cancellare tutti gli oggetti valutati? Non si può annullare.',
    cleared: 'Tutto cancellato.',
    aboutTitle: 'Come funziona',
    aboutBody:
      'Ogni risposta sposta un punteggio da 0 a 100: le risposte più importanti pesano di più, “forse” lascia il punteggio a metà. Le domande di base bastano quando il verdetto è chiaro; se resta in bilico, ne arrivano altre, mirate alla categoria, fino a un massimo di una ventina.',
    privacy: 'Informativa sulla privacy',
    source: 'Codice sorgente',
  },
  privacy: {
    title: 'Privacy',
    sections: [
      {
        heading: 'Cosa salvo',
        body: 'I prodotti che valuti, le risposte che dai, il punteggio e le note. Tutto resta nella memoria del tuo browser (localStorage), su questo dispositivo.',
      },
      {
        heading: 'Cosa non faccio',
        body: 'Nessun account, nessun cookie di profilazione, nessuno strumento di analisi, nessun invio dei tuoi dati a un server mio o di terzi.',
      },
      {
        heading: 'Il link Amazon',
        body: 'Quando incolli un link, una piccola funzione sul server legge una sola volta la pagina pubblica del prodotto per ricavare titolo, foto e prezzo, come fa l’anteprima di un link in una chat. Il link non viene memorizzato.',
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
  notFound: { title: 'Pagina non trovata', back: 'Torna all’inizio' },
  common: { back: 'Indietro', close: 'Chiudi', loading: 'Un momento…' },
} as const;

export type Copy = typeof it;
