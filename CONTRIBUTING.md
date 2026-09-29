# Guida allo sviluppo

Come lavoro su questo repository. Il [README](README.md) spiega il prodotto e il motore decisionale; qui ci sono comandi, architettura, convenzioni e roadmap. Da leggere per intero prima di toccare il codice.

**Stato:** progetto concluso con la versione 1.1.0 (tag `v1.1.0`). I punti aperti della roadmap restano possibili sviluppi futuri: chi riprende il lavoro parte da qui.

## Comandi

```bash
npm install
npm run dev          # Vite + funzione edge servita in locale su /api/preview (plugin in vite.config.ts)
npm run check        # lint + format:check + typecheck + test + build: deve passare prima di ogni push, senza avvisi
npm run test:e2e     # Playwright; se la versione di Chromium installata non è quella attesa: PLAYWRIGHT_CHROMIUM_PATH=<eseguibile>
npm run icons        # rigenera le icone PNG da public/favicon.svg (usa il Chromium di Playwright)
```

## Architettura

- `src/engine/`: motore puro, senza dipendenze da React o dal DOM. `scoring.ts` calcola punteggio, dimensioni, affidabilità, driver e la componente automatica del budget (quota prezzo/budget a fasce, `budgetShare` e `budgetImpact`); `flow.ts` sceglie la prossima domanda (stage 1 sempre completo, stop anticipato, approfondimento con le domande di categoria per prime, spareggio) e salta le domande sul budget quando il prezzo è trascurabile. Le soglie e le fasce stanno in `config.ts`. La quota prezzo/budget entra nel motore come `budgetShare` (in `FlowState` e come ultimo argomento di `evaluate`); il motore non sa nulla di valute o impostazioni. Ogni modifica va coperta in `engine.test.ts`; se cambiano le regole di calcolo, alzare `ENGINE_VERSION`.
- `src/data/questions.ts`: le domande sono dati. Un follow-up (`showIf`) va dichiarato subito dopo la domanda da cui dipende. Ogni categoria ha esattamente tre domande dedicate di stage 2; `other` nessuna. Le domande sulla dimensione `budget` sono tre, generiche, con polarità `skip`, una sola di stage 1. Il test di integrità della banca domande fa rispettare queste regole.
- `src/storage/`: stato in zustand con persistenza su localStorage (`doineedit:v1`, versione 2 con migrazione in `store.ts`), schema zod per import e link condivisi, bozza in sessionStorage, impostazioni (`settings.ts`, chiave `doineedit:settings`, solo il budget mensile per ora) che non entrano in export e link. Se cambia la forma di `Item`, aggiornare `schema.ts`, gli esempi e `STORAGE_VERSION` con una migrazione. Ogni `Item` porta con sé il budget con cui è stato valutato (`budget`) e il risultato la componente automatica (`result.budget`).
- `src/lib/amazon-url.ts` è l'unica fonte di verità per riconoscere i link Amazon; la usa anche la funzione edge.
- `netlify/edge-functions/preview.ts` legge la pagina prodotto; `netlify/lib/amazon-parser.ts` è il parser puro (pattern sul testo, niente DOM: l'edge ha un budget CPU di pochi millisecondi), testato con fixture sintetiche. Segue i redirect solo verso host Amazon, non memorizza nulla, riprova fino a tre volte davanti a una pagina captcha e poi risponde `blocked`. Deve restare una edge function: dalle funzioni serverless classiche (AWS) Amazon risponde con un captcha, dall'edge no. Il runtime è Deno: solo API web standard e import relativi con estensione `.ts`.
- `src/ui/`: pagine e componenti; tutti i testi passano da `src/i18n/it.ts`. Tailwind 4, mobile-first, tema chiaro/scuro automatico, focus visibile, target touch di almeno 44 px.
- **PWA.** Il manifest è un file statico, `public/manifest.webmanifest`, così è servito anche in sviluppo e verificato dagli e2e; dichiara le icone e lo `share_target` (GET su `/new` con i parametri `url`, `text`, `title`). Il service worker lo genera `vite-plugin-pwa` (Workbox, configurato in `vite.config.ts`) solo nella build di produzione: `npm run dev` e gli e2e non lo vedono mai. Precarica l'app shell (HTML, JS, CSS, icone, esempi) con fallback di navigazione su `index.html` e `/api/*` escluso; nessuna cache runtime per l'anteprima e per le immagini dei prodotti. L'aggiornamento è in modalità `prompt`: `src/ui/components/UpdateBanner.tsx` registra il worker, ricontrolla quando l'app torna in primo piano e propone di ricaricare, mai in automatico, perché le risposte del questionario vivono in memoria. Il banner tiene sempre montata la sua area `role="status"` e ne cambia solo il contenuto, così i lettori di schermo annunciano l'avviso. Il link condiviso arriva a `/new` e `src/lib/share-target.ts` decide che fare: se tra `url`, `text` e `title` c'è un link (vince il primo trovato, in quest'ordine), la pagina lo sostituisce con il canonico `/new?url=…` (replace, così il tasto indietro non torna sull'URL di condivisione); altrimenti inserimento manuale con il testo come titolo, su una riga sola e tagliato a `MAX_TITLE_LENGTH` senza spezzare i caratteri. Le icone in `public/icons/` si rigenerano con `npm run icons` quando cambia `public/favicon.svg`: la 192 e la 512 `any` sono il favicon com'è, la 512 `maskable` e la 180 per iOS hanno lo sfondo a tutto campo e il disegno nella zona sicura centrale.
- **Test.** Vitest gira in ambiente `node`; i file che hanno bisogno del DOM lo chiedono con il commento `/** @vitest-environment jsdom */` in testa (lo storage, i componenti con Testing Library). Ogni file ha il suo stato dei moduli (`isolate: true`), perché gli store zustand sono singleton. I componenti che usano il service worker si testano simulando `virtual:pwa-register/react`, come in `UpdateBanner.test.tsx`: negli e2e il worker non esiste.

## Convenzioni

- TypeScript strict, `import type` per i tipi, niente `any`.
- Interfaccia e documentazione in italiano; codice, commenti e messaggi di commit in inglese.
- Commit brevi all'imperativo ("Add budget dimension"), senza trailer di nessun tipo (Signed-off-by, Co-authored-by e simili). Autore dei commit: Stefano Pisani `<stepun3@gmail.com>`, impostato con `git config` nel repository prima del primo commit.
- Si lavora direttamente su `main`, senza pull request.
- Il push si fa una volta sola, a fine sessione di lavoro, con `npm run check` verde ed e2e verdi se il flusso è cambiato. `git status` pulito, nessun file temporaneo.
- Il README va aggiornato quando cambia il comportamento del motore o della funzione edge, e i suoi "Limiti noti" quando cambia ciò che l'app sa fare.
- Versioni: `version` in `package.json` segue il semver; a fine sessione, dopo push e pubblicazione, il commit pubblicato riceve un tag annotato `vX.Y.Z`, pushato su `origin`.

## Pubblicazione

Il repository non è collegato a Netlify di proposito, per non consumare minuti di build a ogni push: la pubblicazione è manuale, a fine sessione, sul progetto `do-i-need-it-now` (id `2c0890d9-adff-4eb7-b66f-256075cebcdd`, https://do-i-need-it-now.netlify.app), con accesso pubblico senza login del team. Il vecchio progetto `do-i-need-it` (https://do-i-need-it.netlify.app, su un altro account) è fermo a una versione precedente alla 1.1.0 e non riceve più pubblicazioni. Dopo la pubblicazione: controllare la home, una pagina interna (fallback SPA) e `/api/preview?url=` con un link amazon.it reale.

## Roadmap

1. **Criterio budget**: fatto. Budget mensile nelle impostazioni, prezzo confrontato con il budget a fasce, tre domande sul peso della spesa, barra tra i parametri del risultato. I dettagli sono nel README.
2. **PWA**: fatto (1.1.0). App installabile, offline per l'app shell, `share_target` per ricevere i link dal menu Condividi di Android, avviso di nuova versione. I dettagli sono nella sezione Architettura.
3. **Anteprima generica** (Open Graph) per i link di altri negozi. Aperto.
4. **Import di wishlist pubbliche**, best effort. Aperto.
5. **Interfaccia in inglese**: le stringhe sono già centralizzate in `src/i18n/it.ts`. Aperto.
