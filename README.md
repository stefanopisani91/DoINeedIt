# DoINeedIt · Ti serve davvero?

Un'app web che mi aiuta a non comprare cose inutili. Incollo il link di un prodotto Amazon, rispondo a poche domande sincere (sì, no, forse) e ottengo un punteggio da 0 a 100 che dice quanto mi serve davvero quell'acquisto. Ogni prodotto valutato resta salvato con foto, prezzo e verdetto, così a fine mese vedo quanti impulsi ho fermato.

**Demo:** https://do-i-need-it.netlify.app

Ho costruito DoINeedIt come progetto dimostrativo: volevo un caso reale, piccolo ma completo, per mostrare come ragiono su un problema di sprechi e come lo trasformo in un prodotto funzionante, testato e pubblicato.

## Come funziona

1. **Incollo un link** (o descrivo il prodotto a mano). Una funzione edge legge una sola volta la pagina pubblica del prodotto e ricava titolo, foto e prezzo, come fa l'anteprima di un link in una chat. Se Amazon non risponde, inserisco i dati a mano: l'app funziona comunque.
2. **Scelgo la categoria** (tecnologia, casa, cucina, abbigliamento, sport e hobby, libri e media, salute e bellezza, altro).
3. **Rispondo alle domande.** Sono poche se il quadro è chiaro, di più se resta incerto.
4. **Leggo il verdetto:** percentuale di necessità, giudizio in tre fasce, quattro parametri, le risposte che hanno pesato di più e qualche consiglio pratico.

### Il motore decisionale

Il cuore dell'app è un motore deterministico, senza intelligenza artificiale a runtime: ogni risultato è spiegabile e coperto da test.

- Ogni domanda è un dato, non codice: testo, peso (1–3), dimensione (utilità reale, urgenza, alternative, freddezza; budget è già predisposto) e polarità. Con polarità `need` un "sì" aumenta la necessità; con polarità `skip` la riduce ("Hai già qualcosa che svolge la stessa funzione?").
- "Sì" vale +1, "no" vale −1, "forse" vale 0 ma pesa nel denominatore: tira il punteggio verso il centro e quindi verso altre domande.
- Punteggio = 50 + 50 · Σ(valore · peso) / Σ(peso delle domande risposte).
- Il flusso è adattivo. Le domande di base sono sempre sette al massimo (alcune sono follow-up condizionali: se possiedo già qualcosa di simile, mi chiede se funziona ancora). Se dopo le domande di base il punteggio è già oltre 75 o sotto 25, si ferma. Altrimenti passa all'approfondimento, prima con tre domande specifiche della categoria, poi con quelle generiche, e si ferma appena il quadro diventa chiaro. Se resta tra 40 e 60, tre domande di spareggio.
- Verdetto: ≥ 70 "Ti serve davvero", 40–69 "Rimanda e riconsidera", < 40 "Non ti serve". L'affidabilità combina distanza dal centro, quota di "forse" e numero di risposte.

Esempio con le cinque domande di base: non possiedo nulla di simile (+3), risponde a un'esigenza concreta (+3), lo userei ogni settimana (+2), problema entro un mese: forse (0, ma pesa 2), non è un acquisto d'impulso (+2). Totale 10 su 12 → 50 + 50 · 10/12 = **92%**, verdetto "Ti serve davvero", nessuna domanda in più.

## Privacy

Tutto resta nel browser: niente account, niente database, niente strumenti di analisi. I dati si esportano e importano come file JSON, e ogni valutazione ha un link condivisibile in cui i dati viaggiano dopo il `#`, quindi non raggiungono mai un server.

## Stack

- **React 19 + TypeScript** (strict), **Vite**, **Tailwind CSS 4**, **React Router**, **zustand** per lo stato persistente, **zod** per validare import e link condivisi.
- **Netlify Edge Functions** per la lettura della pagina prodotto (`netlify/edge-functions/preview.ts`), con parser dedicato senza DOM e protezione contro i redirect fuori da Amazon. Ho scelto l'edge dopo aver misurato che alle funzioni serverless classiche, che girano su indirizzi AWS, Amazon risponde con una pagina di verifica, mentre alla rete edge serve la pagina vera.
- **Vitest** + Testing Library per motore, parser e storage; **Playwright** per i flussi end-to-end su mobile e desktop.
- **ESLint**, **Prettier**, **GitHub Actions** per lint, tipi, test e build a ogni push; deploy automatico su Netlify.

## Struttura

```
src/engine/      motore decisionale puro (tipi, punteggio, flusso adattivo)
src/data/        domande, categorie, esempi
src/lib/         riconoscimento link Amazon, link condivisibili, formattazione
src/storage/     stato persistente, schema, export/import
src/api/         client della funzione di anteprima
src/ui/          pagine e componenti
src/i18n/it.ts   tutti i testi dell'interfaccia
netlify/         funzione edge e parser della pagina Amazon
tests/e2e/       test Playwright
```

## Avvio in locale

```bash
npm install
npm run dev          # http://localhost:5173, con la funzione servita su /api/preview
npm test             # test unitari
npm run test:e2e     # test end-to-end (serve Chromium: npx playwright install chromium)
npm run check        # lint + tipi + test + build, quello che gira in CI
```

Comandi, architettura e convenzioni sono in [CONTRIBUTING.md](CONTRIBUTING.md).

## Limiti noti

- Amazon non offre un'API pubblica gratuita e a volte risponde alle richieste automatiche con una pagina di verifica. In quel caso l'app lo dice e passa all'inserimento manuale. Non memorizzo nulla di ciò che leggo.
- Le liste dei desideri e i link di altri negozi per ora vanno inseriti a mano.
- I dati sono legati al browser: cambiando dispositivo bisogna esportare e importare il file.

## Roadmap

- [ ] Criterio **budget**: peso della spesa sul mio budget mensile come quinto parametro.
- [ ] App installabile (PWA) e ricezione dei link dal menu Condividi di Android.
- [ ] Anteprima generica per altri negozi tramite meta tag Open Graph.
- [ ] Import di una lista dei desideri pubblica.
- [ ] Interfaccia in inglese.

## Licenza

MIT. Vedi [LICENSE](LICENSE).
