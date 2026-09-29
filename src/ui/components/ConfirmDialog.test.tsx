/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSettingsStore } from '@/storage/settings';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    useSettingsStore.getState().setLanguage('it');
  });

  const setup = (open = true) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={open}
        title="Eliminare questo oggetto?"
        body="Non si può annullare."
        confirmLabel="Sì, elimina"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel };
  };

  it('is an alert dialog named by its title and described by its body', () => {
    setup();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Eliminare questo oggetto?');
    expect(dialog).toHaveAccessibleDescription('Non si può annullare.');
    expect(dialog).toHaveAttribute('open');
  });

  it('focuses the safe choice first and reports both choices', async () => {
    const { onConfirm, onCancel } = setup();
    const cancel = screen.getByRole('button', { name: 'Annulla' });
    expect(cancel).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Sì, elimina' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('treats Escape as a cancel', () => {
    const { onCancel } = setup();
    fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('stays closed until asked', () => {
    setup(false);
    expect(screen.getByRole('alertdialog', { hidden: true })).not.toHaveAttribute('open');
  });
});
