# DoINeedIt · Ti serve davvero?

Un'app web che mi aiuta a non comprare cose inutili. Incollo il link di un prodotto, rispondo a poche domande sincere (sì, no, forse) e ottengo un punteggio da 0 a 100 che dice quanto mi serve davvero quell'acquisto. Ogni prodotto valutato resta salvato con foto, prezzo e verdetto, così a fine mese vedo quanti impulsi ho fermato.

**Demo:** https://do-i-need-it-now.netlify.app

Ho costruito DoINeedIt come progetto dimostrativo: volevo un caso reale, piccolo ma completo, per mostrare come ragiono su un problema di sprechi e come lo trasformo in un prodotto funzionante, testato e pubblicato.

## Come funziona

1. **Incollo un link** (o descrivo il prodotto a mano). Una funzione edge legge una sola volta la pagina pubblica del prodotto e ricava titolo, foto e prezzo, come fa l'anteprima di un link in una chat. Per Amazon usa un parser dedicato; per qualsiasi altro negozio legge i meta tag Open Graph della pagina. Se la pagina non risponde o non ha dati utili, inserisco i dati a mano: l'app funziona comunque.
2. **Scelgo la categoria** (tecnologia, casa, cucina, abbigliamento, sport e hobby, libri e media, salute e bellezza, altro).
3. **Rispondo alle domande.** Sono poche se il quadro è chiaro, di più se resta incerto.
4. **Leggo il verdetto:** percentuale di necessità, giudizio in tre fasce, cinque parametri, le risposte che hanno pesato di più e qualche consiglio pratico.

L'app si può **installare** come una app vera (dal menu del browser, "Installa app" o "Aggiungi a schermata Home"): si apre a schermo intero, funziona anche offline e su Android compare nel menu **Condividi**. Così dall'app Amazon basta toccare Condividi e scegliere DoINeedIt: il link arriva direttamente alla pagina di valutazione. Quando pubblico una versione nuova, l'app installata lo segnala con un avviso e si aggiorna solo quando lo chiedo, mai a metà di un questionario.

Nelle impostazioni posso indicare il mio **budget mensile** per gli acquisti non indispensabili: da quel momento il prezzo di ogni prodotto viene confrontato con quella cifra e pesa nel punteggio.

L'interfaccia è in **italiano e in inglese**: segue la lingua del browser e si può scegliere nelle impostazioni. Domande, categorie, verdetti ed esempi sono tradotti; le valutazioni già fatte si leggono nella lingua scelta, perché ogni risposta è salvata con l'identificativo della domanda, non con il suo testo.

### Altri negozi

I link di negozi diversi da Amazon passano da un parser generico: titolo da `og:title` (poi `twitter:title`, poi il titolo della pagina), foto da `og:image`, prezzo da `product:price:amount` o `og:price:amount` con la loro valuta, con i dati strutturati JSON-LD e i meta `itemprop` come riserva. Se la pagina non espone un titolo, l'app passa all'inserimento manuale. Le stesse protezioni della lettura Amazon valgono anche qui: nessuna memorizzazione, al massimo cinque redirect, risposta tagliata a 2 MB, otto secondi per richiesta, solo pagine HTML e mai indirizzi privati, locali o con porte non standard. Il riconoscimento dei link Amazon resta l'unica fonte di verità, in `src/lib/amazon-url.ts`: tutto ciò che non è Amazon va al parser generico.

### Liste dei desideri

Incollando il link di una **lista dei desideri Amazon pubblica** (o un link breve che porta a una lista), la funzione edge ne legge i prodotti, con titolo, foto, prezzo e link, e li propone in una pagina con una casella per ciascuno. Amazon mette dieci prodotti per pagina e carica gli altri con una richiesta "mostra altri": la funzione segue quella catena fino alla fine della lista, entro un budget di tempo, e dice se si è fermata prima. Scelgo quali aggiungere: finiscono nella sezione "Da valutare" della home, come bozze, e ognuno passa dal questionario completo, uno alla volta. Nessuna valutazione automatica. È un import best effort: Amazon blocca ogni tanto le letture automatiche, anche a metà lista, e non espone le liste private; in tutti questi casi l'app lo dice e non succede altro. Le voci "idea" senza un prodotto vengono saltate.

### Il motore decisionale

Il cuore dell'app è un motore deterministico, senza intelligenza artificiale a runtime: ogni risultato è spiegabile e coperto da test.

- Ogni domanda è un dato, non codice: identificativo, peso (1–3), dimensione (utilità reale, urgenza, alternative, freddezza, budget) e polarità; il testo sta nel file della lingua. Con polarità `need` un "sì" aumenta la necessità; con polarità `skip` la riduce ("Hai già qualcosa che svolge la stessa funzione?").
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

Tutto resta nel browser: niente account, niente database, niente strumenti di analisi. I dati si esportano e importano come file JSON, e ogni valutazione ha un link condivisibile in cui i dati viaggiano dopo il `#`, quindi non raggiungono mai un server. Il budget mensile, la lingua e i prodotti in attesa di valutazione sono impostazioni del browser: non si esportano, ma ogni valutazione ricorda il budget con cui è stata fatta. Le funzioni edge leggono una sola volta la pagina pubblica del prodotto, del negozio o della lista dei desideri, e non memorizzano né il link né ciò che leggono.

## Stack

- **React 19 + TypeScript** (strict), **Vite**, **Tailwind CSS 4**, **React Router**, **zustand** per lo stato persistente, **zod** per validare import e link condivisi.
- **PWA**: manifest con `share_target` (uno per lingua), service worker generato da `vite-plugin-pwa` (Workbox) che precarica l'app shell e la serve offline; nessuna cache per le funzioni di anteprima e per le immagini dei prodotti.
- **Netlify Edge Functions** per la lettura della pagina prodotto (`netlify/edge-functions/preview.ts`) e della lista dei desideri (`netlify/edge-functions/wishlist.ts`), con parser dedicati senza DOM per Amazon, per i meta tag Open Graph e per le liste, e un helper comune di lettura con limiti su redirect, dimensione, tempi e indirizzi raggiungibili. Ho scelto l'edge dopo aver misurato che alle funzioni serverless classiche, che girano su indirizzi AWS, Amazon risponde con una pagina di verifica, mentre alla rete edge serve la pagina vera.
- **Vitest** per motore, parser, funzioni edge, storage, lingue e ricezione dei link condivisi, con Testing Library per il banner di aggiornamento; **Playwright** per i flussi end-to-end su mobile e desktop, in italiano e in inglese.
- **ESLint**, **Prettier**, **GitHub Actions** per lint, tipi, test unitari, build ed end-to-end a ogni push; pubblicazione manuale su Netlify.

## Struttura

```
src/engine/      motore decisionale puro (tipi, punteggio, flusso adattivo)
src/data/        domande (id, pesi, regole), categorie, esempi: i testi arrivano dai file lingua
src/i18n/        it.ts e en.ts con tutti i testi, scelta della lingua (index.ts)
src/lib/         riconoscimento link Amazon, link ricevuti dal menu Condividi, link condivisibili, formattazione
src/storage/     stato persistente, coda "da valutare", impostazioni, schema, export/import
src/api/         client delle funzioni di anteprima e lista dei desideri
src/ui/          pagine e componenti
public/          manifest della PWA (italiano e inglese), icone, favicon, immagini di esempio
scripts/         generazione delle icone dal favicon
netlify/         funzioni edge, helper di lettura e parser (Amazon, Open Graph, liste dei desideri)
tests/e2e/       test Playwright
```

## Avvio in locale

```bash
npm install
npm run dev          # http://localhost:5173, con le funzioni servite su /api/preview e /api/wishlist
npm test             # test unitari
npm run test:e2e     # test end-to-end (serve Chromium: npx playwright install chromium)
npm run check        # lint + formato + tipi + test + build, quello che gira in CI
```

Comandi, architettura e convenzioni sono in [CONTRIBUTING.md](CONTRIBUTING.md).

## Limiti noti

- Amazon non offre un'API pubblica gratuita e a volte risponde alle richieste automatiche con una pagina di verifica. In quel caso l'app lo dice e passa all'inserimento manuale. Non memorizzo nulla di ciò che leggo.
- Per i negozi diversi da Amazon la lettura dipende dai meta tag della pagina: se il negozio non li espone (o li riempie solo via script), l'app propone l'inserimento manuale. Il prezzo arriva solo quando la pagina lo dichiara nei meta tag o nei dati strutturati.
- L'import di una lista dei desideri segue le pagine "mostra altri" di Amazon fino a 50 pagine (500 prodotti) o 25 secondi, solo dalle liste pubbliche, e smette di funzionare se Amazon cambia il markup delle liste. Se Amazon blocca una pagina a metà, l'app propone i prodotti letti fino a lì e lo dice. Le liste vengono lette al momento: non c'è sincronizzazione.
- Le funzioni edge controllano il nome dell'host, non l'indirizzo IP risolto: non contattano mai indirizzi letterali, locali o porte non standard, ma un DNS pubblico che punta a un indirizzo privato non è rilevabile dall'edge.
- Se un testo condiviso contiene più link, conta il primo.
- I dati sono legati al browser: cambiando dispositivo bisogna esportare e importare il file. La coda "da valutare", il budget e la lingua non entrano nel file.
- DoINeedIt compare nel menu Condividi solo su Android e solo dopo averla installata. Su iPhone e iPad l'app si installa e funziona offline, ma il menu Condividi non è disponibile per le app web: il link va incollato a mano (i link brevi `amzn.eu/d/…` dell'app Amazon sono riconosciuti e risolti alla pagina prodotto).
- L'avviso di nuova versione arriva quando l'app viene aperta o torna in primo piano, non mentre è già aperta sullo schermo.
- Il manifest è un file statico per lingua: l'app installata prende nome e descrizione dalla lingua in uso al momento dell'installazione.

## Roadmap

La versione 1.2.0 chiude il progetto: tutti i punti previsti sono fatti.

- [x] Criterio **budget**: peso della spesa sul mio budget mensile come quinto parametro.
- [x] App installabile (PWA), ricezione dei link dal menu Condividi di Android e avviso di nuova versione.
- [x] Anteprima generica per altri negozi tramite meta tag Open Graph.
- [x] Import di una lista dei desideri pubblica.
- [x] Interfaccia in inglese.

## Licenza

MIT. Vedi [LICENSE](LICENSE).
