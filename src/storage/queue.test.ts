/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';
import { QUEUE_KEY, queueKey, useQueueStore } from './queue';

const headphones = {
  source: { url: 'https://www.amazon.it/dp/B0H82G3QD4', asin: 'B0H82G3QD4', marketplace: 'it' },
  title: 'Cuffie',
  price: { amount: 99, currency: 'EUR' },
  listTitle: 'Regali',
};
const book = {
  source: { url: 'https://www.amazon.it/dp/B08N5WRWNW', asin: 'B08N5WRWNW', marketplace: 'it' },
  title: 'Libro',
};

describe('queue store', () => {
  beforeEach(() => useQueueStore.getState().clear());

  it('adds products with an id and a timestamp, persisted in this browser', () => {
    expect(useQueueStore.getState().add([headphones, book])).toBe(2);
    const { queue } = useQueueStore.getState();
    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({ title: 'Cuffie', listTitle: 'Regali' });
    expect(queue[0]?.id).toBeTruthy();
    expect(queue[0]?.addedAt).toMatch(/^\d{4}-/);
    expect(window.localStorage.getItem(QUEUE_KEY)).toContain('B0H82G3QD4');
  });

  it('skips products already waiting, by ASIN or by url', () => {
    useQueueStore.getState().add([headphones]);
    expect(useQueueStore.getState().add([headphones, book])).toBe(1);
    const noAsin = { source: { url: 'https://shop.example/p/1' }, title: 'Tazza' };
    expect(useQueueStore.getState().add([noAsin, noAsin])).toBe(1);
    expect(useQueueStore.getState().queue).toHaveLength(3);
    expect(queueKey(headphones.source)).toBe('asin:B0H82G3QD4');
    expect(queueKey(noAsin.source)).toBe('url:https://shop.example/p/1');
  });

  it('removes a product once it has been taken for evaluation', () => {
    useQueueStore.getState().add([headphones, book]);
    const id = useQueueStore.getState().queue[0]!.id;
    useQueueStore.getState().remove(id);
    expect(useQueueStore.getState().queue.map((p) => p.title)).toEqual(['Libro']);
  });
});
