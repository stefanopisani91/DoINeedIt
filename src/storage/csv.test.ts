import { EXAMPLE_ITEMS } from '@/data/examples';
import { en } from '@/i18n/en';
import { it as itCopy } from '@/i18n/it';
import { buildCsv, csvSeparatorFor, escapeCsv, exportCsvFileName } from './csv';

describe('csv export', () => {
  it('picks the separator from the decimal mark of the locale', () => {
    expect(csvSeparatorFor('it-IT')).toBe(';');
    expect(csvSeparatorFor('de-DE')).toBe(';');
    expect(csvSeparatorFor('en-US')).toBe(',');
    expect(csvSeparatorFor('not-a-locale-!!')).toBe(',');
  });

  it('quotes only what needs quoting', () => {
    expect(escapeCsv('plain', ';')).toBe('plain');
    expect(escapeCsv('a;b', ';')).toBe('"a;b"');
    expect(escapeCsv('a,b', ';')).toBe('a,b');
    expect(escapeCsv('say "hi"', ',')).toBe('"say ""hi"""');
    expect(escapeCsv('two\nlines', ',')).toBe('"two\nlines"');
  });

  it('writes one row per item with localised headers and numbers', () => {
    const csv = buildCsv(EXAMPLE_ITEMS, itCopy);
    const lines = csv.split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0]).toBe(
      '﻿' +
        'Prodotto;Categoria;Prezzo;Valuta;Necessità;Verdetto;Affidabilità;Risposte;Forse;Valutato il;Budget;Quota del budget;Esito;Deciso il;Prezzo pagato;Nota;Link',
    );
    expect(lines).toHaveLength(EXAMPLE_ITEMS.length + 2);
    const headphones = lines.find((line) => line.startsWith('Cuffie'))!;
    expect(headphones).toContain(';Tecnologia;249;EUR;');
    expect(headphones).toContain(';Non ti serve;');
    expect(headphones).toContain(';Non comprato;2026-09-20T09:30:00.000Z;;');
    // The note contains a comma and stays unquoted with a semicolon separator.
    expect(headphones).toContain('Viste in un video, le mie funzionano ancora benissimo.');
  });

  it('uses commas and a dot decimal in English', () => {
    const csv = buildCsv(EXAMPLE_ITEMS, en);
    // The examples keep their Italian titles: only labels and numbers follow the copy.
    // This title holds a comma, so the cell is quoted.
    const shoes = csv.split('\r\n').find((line) => line.includes('Scarpe da corsa'))!;
    expect(shoes).toContain(',Sport and hobbies,119.9,EUR,');
    expect(shoes).toContain(',Bought,');
    expect(shoes).toContain(',109.9,');
  });

  it('leaves empty cells for missing price, budget and decision', () => {
    const [headphones] = EXAMPLE_ITEMS;
    const { price, budget, decision, ...bare } = headphones!;
    void price;
    void budget;
    void decision;
    const item = { ...bare, result: { ...bare.result, budget: null } };
    const row = buildCsv([item], itCopy).split('\r\n')[1]!;
    expect(row.split(';').slice(2, 4)).toEqual(['', '']);
    expect(row.split(';').slice(10, 15)).toEqual(['', '', '', '', '']);
  });

  it('names the file after the day', () => {
    expect(exportCsvFileName(new Date('2026-09-29T15:00:00Z'))).toBe('doineedit-2026-09-29.csv');
  });
});
