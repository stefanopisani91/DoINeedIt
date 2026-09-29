# DoINeedIt · Ti serve davvero?

Un'app web che mi aiuta a non comprare cose inutili. Incollo il link di un prodotto Amazon, rispondo a poche domande sincere (sì, no, forse) e ottengo un punteggio da 0 a 100 che dice quanto mi serve davvero quell'acquisto. Ogni prodotto valutato resta salvato con foto, prezzo e verdetto, così a fine mese vedo quanti impulsi ho fermato.

**Demo:** https://do-i-need-it.netlify.app

Ho costruito DoINeedIt come progetto dimostrativo: volevo un caso reale, piccolo ma completo, per mostrare come ragiono su un problema di sprechi e come lo trasformo in un prodotto funzionante, testato e pubblicato.

## Come funziona

1. **Incollo un link** (o descrivo il prodotto a mano). Una funzione edge legge una sola volta la pagina pubblica del prodotto e ricava titolo, foto e prezzo, come fa l'anteprima di un link in una chat. Se Amazon non risponde, inserisco i dati a mano: l'app funziona comunque.
2. **Scelgo la categoria** (tecnologia, casa, cucina, abbigliamento, sport e hobby, libri e media, salute e bellezza, altro).
3. **Rispondo alle domande.** Sono poche se il quadro è chiaro, di più se resta incerto.
4. **Leggo il verdetto:** percentuale di necessità, giudizio in tre fasce, cinque parametri, le risposte che hanno pesato di più e qualche consiglio pratico.

L'app si può **installare** come una app vera (dal menu del browser, "Installa app" o "Aggiungi a schermata Home"): si apre a schermo intero, funziona anche offline e su Android compare nel menu **Condividi**. Così dall'app Amazon basta toccare Condividi e scegliere DoINeedIt: il link arriva direttamente alla pagina di valutazione. Quando pubblico una versione nuova, l'app installata lo segnala con un avviso e si aggiorna solo quando lo chiedo, mai a metà di un questionario.

Nelle impostazioni posso indicare il mio **budget mensile** per gli acquisti non indispensabili: da quel momento il prezzo di ogni prodotto viene confrontato con quella cifra e pesa nel punteggio.

### Il motore decisionale

Il cuore dell'app è un motore deterministico, senza intelligenza artificiale a runtime: ogni risultato è spiegabile e coperto da test.

- Ogni domanda è un dato, non codice: testo, peso (1–3), dimensione (utilità reale, urgenza, alternative, freddezza, budget) e polarità. Con polarità `need` un "sì" aumenta la necessità; con polarità `skip` la riduce ("Hai già qualcosa che svolge la stessa funzione?").
- "Sì" vale +1, "no" vale −1, "forse" vale 0 ma pesa nel denominatore: tira il punteggio verso il centro e quindi verso altre domande.
- Punteggio = 50 + 50 · Σ(valore · peso) / Σ(peso delle domande risposte).
- Il flusso è adattivo. Le domande di base sono sempre otto al massimo (alcune sono follow-up condizionali: se possiedo già qualcosa di simile, mi chiede se funziona ancora). Se dopo le domande di base il punteggio è già oltre 75 o sotto 25, si ferma. Altrimenti passa all'approfondimento, prima con tre domande specifiche della categoria, poi con quelle generiche, e si ferma appena il quadro diventa chiaro. Se resta tra 40 e 60, tre domande di spareggio.
- Verdetto: ≥ 70 "Ti serve davvero", 40–69 "Rimanda e riconsidera", < 40 "Non ti serve". L'affidabilità combina distanza dal centro, quota di "forse" e numero di risposte.

Esempio con le sei domande di base: non possiedo nulla di simile (+3), risponde a un'esigenza concreta (+3), lo userei ogni settimana (+2), problema entro un mese: forse (0, ma pesa 2), non è un acquisto d'impulso (+2), non intacco risparmi né rinuncio a qualcosa (+3). Totale 13 su 15 → 50 + 50 · 13/15 = **93%**, verdetto "Ti serve davvero", nessuna domanda in più.

### Il criterio budget

La dimensione budget mette insieme tre domande sul peso della spesa (una di base: "Per pagarlo dovresti intaccare i risparmi, pagare a rate o rinunciare a qualcosa che avevi già programmato?", due di approfondimento) e una componente automatica, attiva solo se ho impostato un budget mensile e il prodotto ha un prezzo nella stessa valuta.

- La quota prezzo/budget si traduce in un valore a fasce, con peso 3 come la domanda più forte: fino al 5% del budget +1, fino al 15% +0,5, fino al 30% 0 (pesa nel denominatore, come un "forse"), fino al 60% −0,5, oltre −1.
- Se il prezzo è sotto il 5% del budget, le domande sul budget non vengono fatte: il prezzo ha già risposto.
- Il budget in vigore al momento della valutazione resta salvato nell'oggetto, così il risultato è stabile e spiegabile anche se poi cambio budget. Per questo viaggia con la valutazione anche nei file esportati e nei link condivisi; l'impostazione in sé, invece, resta nel browser.
- Nel risultato compare una riga "Costa il 38% del tuo budget mensile di 400,00 €" tra le cose che hanno pesato di più, e la barra "Budget" tra i parametri.

Senza budget impostato, o senza prezzo, le domande sul budget vengono fatte lo stesso e la componente automatica manca; la pagina del risultato ricorda di impostare il budget.

## Privacy

Tutto resta nel browser: niente account, niente database, niente strumenti di analisi. I dati si esportano e importano come file JSON, e ogni valutazione ha un link condivisibile in cui i dati viaggiano dopo il `#`, quindi non raggiungono mai un server. Il budget mensile è un'impostazione del browser: non si esporta, ma ogni valutazione ricorda il budget con cui è stata fatta.

## Stack

- **React 19 + TypeScript** (strict), **Vite**, **Tailwind CSS 4**, **React Router**, **zustand** per lo stato persistente, **zod** per validare import e link condivisi.
- **PWA**: manifest con `share_target`, service worker generato da `vite-plugin-pwa` (Workbox) che precarica l'app shell e la serve offline; nessuna cache per la funzione di anteprima e per le immagini dei prodotti.
- **Netlify Edge Functions** per la lettura della pagina prodotto (`netlify/edge-functions/preview.ts`), con parser dedicato senza DOM e protezione contro i redirect fuori da Amazon. Ho scelto l'edge dopo aver misurato che alle funzioni serverless classiche, che girano su indirizzi AWS, Amazon risponde con una pagina di verifica, mentre alla rete edge serve la pagina vera.
- **Vitest** per motore, parser, storage e ricezione dei link condivisi, con Testing Library per il banner di aggiornamento; **Playwright** per i flussi end-to-end su mobile e desktop.
- **ESLint**, **Prettier**, **GitHub Actions** per lint, tipi, test unitari, build ed end-to-end a ogni push; pubblicazione manuale su Netlify.

## Struttura

```
src/engine/      motore decisionale puro (tipi, punteggio, flusso adattivo)
src/data/        domande, categorie, esempi
src/lib/         riconoscimento link Amazon, link ricevuti dal menu Condividi, link condivisibili, formattazione
src/storage/     stato persistente, impostazioni, schema, export/import
src/api/         client della funzione di anteprima
src/ui/          pagine e componenti
src/i18n/it.ts   tutti i testi dell'interfaccia
public/          manifest della PWA, icone, favicon, immagini di esempio
scripts/         generazione delle icone dal favicon
netlify/         funzione edge e parser della pagina Amazon
tests/e2e/       test Playwright
```

## Avvio in locale

```bash
npm install
npm run dev          # http://localhost:5173, con la funzione servita su /api/preview
npm test             # test unitari
npm run test:e2e     # test end-to-end (serve Chromium: npx playwright install chromium)
npm run check        # lint + formato + tipi + test + build, quello che gira in CI
```

Comandi, architettura e convenzioni sono in [CONTRIBUTING.md](CONTRIBUTING.md).

## Limiti noti

- Amazon non offre un'API pubblica gratuita e a volte risponde alle richieste automatiche con una pagina di verifica. In quel caso l'app lo dice e passa all'inserimento manuale. Non memorizzo nulla di ciò che leggo.
- La lettura automatica funziona solo con le pagine dei singoli prodotti Amazon: liste dei desideri e link di altri negozi vanno inseriti a mano.
- Se un testo condiviso contiene più link, conta il primo.
- I dati sono legati al browser: cambiando dispositivo bisogna esportare e importare il file.
- DoINeedIt compare nel menu Condividi solo su Android e solo dopo averla installata. Su iPhone e iPad l'app si installa e funziona offline, ma il menu Condividi non è disponibile per le app web: il link va incollato a mano.
- L'avviso di nuova versione arriva quando l'app viene aperta o torna in primo piano, non mentre è già aperta sullo schermo.
- L'interfaccia è solo in italiano.

## Roadmap

La versione 1.1.0 chiude il progetto. I punti ancora aperti restano come possibili sviluppi futuri.

- [x] Criterio **budget**: peso della spesa sul mio budget mensile come quinto parametro.
- [x] App installabile (PWA), ricezione dei link dal menu Condividi di Android e avviso di nuova versione.
- [ ] Anteprima generica per altri negozi tramite meta tag Open Graph.
- [ ] Import di una lista dei desideri pubblica.
- [ ] Interfaccia in inglese.

## Licenza

MIT. Vedi [LICENSE](LICENSE).
