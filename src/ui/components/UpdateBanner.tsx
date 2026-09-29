import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCopy } from '@/i18n';
import { Button } from './Button';

/**
 * Registers the service worker and, when a new version has been installed,
 * offers to reload. The reload is never automatic: the questionnaire keeps its
 * answers in memory and an unexpected reload would lose them.
 */
export function UpdateBanner() {
  const copy = useCopy();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Installed apps stay open for days: look for a new version each time
      // the app comes back to the foreground.
      const check = () => {
        if (document.visibilityState === 'visible') void registration.update();
      };
      document.addEventListener('visibilitychange', check);
    },
  });

  // The live region stays mounted so that screen readers announce the message
  // when it appears: a region inserted together with its content often is not.
  return (
    <div role="status" className="sticky bottom-0 z-20">
      {needRefresh && (
        <div className="border-t border-stone-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm">{copy.update.available}</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
                {copy.update.later}
              </Button>
              <Button onClick={() => void updateServiceWorker(true)}>{copy.update.reload}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
