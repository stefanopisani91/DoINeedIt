import { en } from '@/i18n/en';
import { it as itCopy } from '@/i18n/it';
import { pageKey, pageTitle } from './page-title';

describe('pageTitle', () => {
  it('keeps the full app title on the home', () => {
    expect(pageTitle('/', itCopy)).toBe('DoINeedIt · Ti serve davvero?');
    expect(pageTitle('/', en)).toBe('DoINeedIt · Do you really need it?');
  });

  it('names every other page, in the language in use', () => {
    expect(pageTitle('/settings', itCopy)).toBe('Impostazioni · DoINeedIt');
    expect(pageTitle('/settings', en)).toBe('Settings · DoINeedIt');
    expect(pageTitle('/items/abc', itCopy)).toBe('Dettaglio · DoINeedIt');
    expect(pageTitle('/insights', itCopy)).toBe('Insight · DoINeedIt');
    expect(pageTitle('/nowhere', itCopy)).toBe('Pagina non trovata · DoINeedIt');
  });

  it('maps paths to page keys', () => {
    expect(pageKey('/new')).toBe('new');
    expect(pageKey('/wishlist')).toBe('wishlist');
    expect(pageKey('/evaluate')).toBe('evaluate');
    expect(pageKey('/i')).toBe('shared');
    expect(pageKey('/privacy')).toBe('privacy');
    expect(pageKey('/items/')).toBe('item');
    expect(pageKey('/items')).toBe('notFound');
  });

  it('never announces a text the interface already shows on its own', () => {
    // The shared page shows "Valutazione condivisa" in its notice: the title must differ.
    expect(pageTitle('/i', itCopy)).not.toContain(itCopy.shared.title);
    expect(pageTitle('/evaluate', itCopy)).not.toContain('al massimo');
  });
});
