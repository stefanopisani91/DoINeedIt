/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/storage/settings';
import { UpdateBanner } from './UpdateBanner';

const updateServiceWorker = vi.fn(() => Promise.resolve());
let showUpdate: (value: boolean) => void = () => {};

// The real module registers a service worker, which exists only in production builds.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => {
    const [needRefresh, setNeedRefresh] = useState(false);
    showUpdate = setNeedRefresh;
    return {
      needRefresh: [needRefresh, setNeedRefresh],
      offlineReady: [false, () => {}],
      updateServiceWorker,
    };
  },
}));

describe('UpdateBanner', () => {
  beforeEach(() => {
    updateServiceWorker.mockClear();
    // The test runner's browser asks for English; the banner is checked in Italian.
    useSettingsStore.getState().setLanguage('it');
  });

  it('keeps an empty live region until a new version is ready, then announces it', () => {
    render(<UpdateBanner />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    act(() => showUpdate(true));
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('È disponibile una nuova versione di DoINeedIt.');
  });

  it('reloads only when asked', async () => {
    const user = userEvent.setup();
    render(<UpdateBanner />);
    act(() => showUpdate(true));
    expect(updateServiceWorker).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Aggiorna' }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('hides the message when postponed, without reloading', async () => {
    const user = userEvent.setup();
    render(<UpdateBanner />);
    act(() => showUpdate(true));

    await user.click(screen.getByRole('button', { name: 'Più tardi' }));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});
