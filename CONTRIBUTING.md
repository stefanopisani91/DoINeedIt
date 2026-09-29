# Guida allo sviluppo

Come lavoro su questo repository. Il [README](README.md) spiega il prodotto e il motore decisionale; qui ci sono comandi, architettura, convenzioni e roadmap. Da leggere per intero prima di toccare il codice.

## Comandi

```bash
npm install
npm run dev          # Vite + funzione edge servita in locale su /api/preview (plugin in vite.config.ts)
npm run check        # lint + format:check + typecheck + test + build: deve passare prima di ogni push
npm run test:e2e     # Playwright; con un Chromium già installato: PLAYWRIGHT_CHROMIUM_PATH=<eseguibile>
```

## Architettura

- `src/engine/`: motore puro, senza dipendenze da React o dal DOM. `scoring.ts` calcola punteggio, dimensioni, affidabilità e driver; `flow.ts` sceglie la prossima domanda (stage 1 sempre completo, stop anticipato, approfondimento con le domande di categoria per prime, spareggio). Le soglie stanno in `config.ts`. Ogni modifica va coperta in `engine.test.ts`.
- `src/data/questions.ts`: le domande sono dati. Un follow-up (`showIf`) va dichiarato subito dopo la domanda da cui dipende. Ogni categoria ha esattamente tre domande dedicate di stage 2; `other` nessuna. Il test di integrità della banca domande fa rispettare queste regole.
- `src/storage/`: stato in zustand con persistenza su localStorage (`doineedit:v1`), schema zod per import e link condivisi, bozza in sessionStorage. Se cambia la forma di `Item`, aggiornare `schema.ts`, gli esempi e `STORAGE_VERSION` con una migrazione.
- `src/lib/amazon-url.ts` è l'unica fonte di verità per riconoscere i link Amazon; la usa anche la funzione edge.
- `netlify/edge-functions/preview.ts` legge la pagina prodotto; `netlify/lib/amazon-parser.ts` è il parser puro (pattern sul testo, niente DOM: l'edge ha un budget CPU di pochi millisecondi), testato con fixture sintetiche. Segue i redirect solo verso host Amazon, non memorizza nulla, riprova fino a tre volte davanti a una pagina captcha e poi risponde `blocked`. Deve restare una edge function: dalle funzioni serverless classiche (AWS) Amazon risponde con un captcha, dall'edge no. Il runtime è Deno: solo API web standard e import relativi con estensione `.ts`.
- `src/ui/`: pagine e componenti; tutti i testi passano da `src/i18n/it.ts`. Tailwind 4, mobile-first, tema chiaro/scuro automatico, focus visibile, target touch di almeno 44 px.

## Convenzioni

- TypeScript strict, `import type` per i tipi, niente `any`.
- Interfaccia e documentazione in italiano; codice, commenti e messaggi di commit in inglese.
- Commit brevi all'imperativo ("Add budget dimension"), senza trailer di nessun tipo (Signed-off-by, Co-authored-by e simili). Autore dei commit: Stefano Pisani `<stepun3@gmail.com>`, impostato con `git config` nel repository prima del primo commit.
- Si lavora direttamente su `main`, senza pull request.
- Il push si fa una volta sola, a fine sessione di lavoro, con `npm run check` verde ed e2e verdi se il flusso è cambiato. `git status` pulito, nessun file temporaneo.
- Il README va aggiornato quando cambia il comportamento del motore o della funzione edge.

## Pubblicazione

Il repository non è collegato a Netlify di proposito, per non consumare minuti di build a ogni push: la pubblicazione è manuale, a fine sessione, sul progetto `do-i-need-it` (id `8fd72bae-3927-4b60-8103-9c01aa56a0eb`, team `barcetrip`). Dopo la pubblicazione: controllare la home, una pagina interna (fallback SPA) e `/api/preview?url=` con un link amazon.it reale.

## Roadmap

1. **Criterio budget**: nuova dimensione `budget` (già prevista nei tipi del motore) con un budget mensile impostato dall'utente nelle impostazioni, il prezzo del prodotto messo a confronto con quel budget e due o tre domande sul peso della spesa. Il parametro compare tra le barre del risultato e pesa nel punteggio.
2. **PWA** con `share_target` per ricevere i link dal menu Condividi di Android.
3. **Anteprima generica** (Open Graph) per i link di altri negozi.
4. **Import di wishlist pubbliche**, best effort.
5. **Interfaccia in inglese**: le stringhe sono già centralizzate.
