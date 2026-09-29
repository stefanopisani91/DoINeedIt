/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXAMPLE_ITEMS } from '@/data/examples';
import { useSettingsStore } from '@/storage/settings';
import { selectItem, useItemsStore } from '@/storage/store';
import { DecisionCard } from './DecisionCard';

// The air fryer: a "wait" verdict with no outcome recorded yet, listed at 89,99 €.
const airfryer = EXAMPLE_ITEMS.find((item) => item.id === 'example-airfryer')!;

/** Reads the item from the store, as the detail page does, so the card sees its own writes. */
function Harness({ id }: { id: string }) {
  const item = useItemsStore(selectItem(id));
  return item ? <DecisionCard item={item} /> : null;
}

function stored() {
  return useItemsStore.getState().items.find((item) => item.id === airfryer.id)!;
}

describe('DecisionCard', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'it' });
    useItemsStore.setState({ items: [airfryer] });
  });

  it('records "not bought", announces it and can go back to waiting', async () => {
    const user = userEvent.setup();
    render(<Harness id={airfryer.id} />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    expect(screen.getByRole('radio', { name: 'Ancora in attesa' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(screen.getByRole('radio', { name: 'Non comprato' }));
    expect(stored().decision?.outcome).toBe('skipped');
    expect(stored().updatedAt).toBe(airfryer.updatedAt);
    expect(screen.getByRole('radio', { name: 'Non comprato' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(/^Deciso il .+: non comprato · 89,99 € non spesi$/);

    await user.click(screen.getByRole('radio', { name: 'Ancora in attesa' }));
    expect(stored().decision).toBeUndefined();
    expect(stored().updatedAt).toBe(airfryer.updatedAt);
    expect(status).toBeEmptyDOMElement();
  });

  it('asks for the price paid only after a purchase, and keeps it', async () => {
    const user = userEvent.setup();
    render(<Harness id={airfryer.id} />);
    expect(screen.queryByLabelText('Prezzo pagato (facoltativo)')).toBeNull();

    await user.click(screen.getByRole('radio', { name: 'Comprato' }));
    const field = screen.getByLabelText('Prezzo pagato (facoltativo)');
    expect(field).toHaveValue('89,99');
    expect(screen.getByRole('status')).toHaveTextContent('89,99 € spesi');
    // The listed price is already what the status shows: nothing to save.
    expect(screen.getByRole('button', { name: 'Salva il prezzo' })).toBeDisabled();

    await user.clear(field);
    await user.type(field, '79,90');
    await user.click(screen.getByRole('button', { name: 'Salva il prezzo' }));
    expect(stored().decision).toMatchObject({
      outcome: 'bought',
      price: { amount: 79.9, currency: 'EUR' },
    });
    expect(screen.getByRole('status')).toHaveTextContent('79,90 € spesi');

    // A change of mind drops the paid price: nothing was spent.
    await user.click(screen.getByRole('radio', { name: 'Non comprato' }));
    expect(stored().decision?.price).toBeUndefined();
    expect(screen.getByRole('status')).toHaveTextContent('89,99 € non spesi');
  });
});
