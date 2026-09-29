import { useCopy } from '@/i18n';
import { useSettingsStore } from '@/storage/settings';
import { Button } from './Button';
import { Icon } from './Icon';

/**
 * The first-run guide: three steps and the privacy promise, shown on an empty
 * library until dismissed. The choice is a setting, so it stays dismissed.
 * A plain card rather than a Surface: its brand tint would lose to the
 * Surface's own background utility.
 */
export function WelcomePanel() {
  const copy = useCopy();
  const setOnboardingSeen = useSettingsStore((state) => state.setOnboardingSeen);
  return (
    <aside
      aria-labelledby="welcome-title"
      className="animate-fade-up rounded-card bg-brand-50 p-5 ring-1 ring-brand-200 sm:p-6 dark:bg-brand-950/40 dark:ring-brand-900"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-brand-700 text-white dark:bg-brand-500 dark:text-stone-950"
          aria-hidden="true"
        >
          <Icon name="sparkle" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="welcome-title" className="text-lg font-bold">
            {copy.welcome.title}
          </h2>
          <ol className="mt-3 space-y-2.5">
            {copy.welcome.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-ink-muted">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 tabular-nums dark:bg-brand-900 dark:text-brand-200"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
            <Icon name="check" size={16} className="mt-0.5 text-brand-700 dark:text-brand-300" />
            <span>{copy.welcome.privacy}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setOnboardingSeen(true)}>
          {copy.welcome.dismiss}
        </Button>
      </div>
    </aside>
  );
}
