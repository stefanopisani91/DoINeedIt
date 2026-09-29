import type { ReactNode } from 'react';
import { useCopy } from '@/i18n';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, string> = {
  info: 'bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-100 dark:ring-sky-900',
  success:
    'bg-buy-50 text-buy-900 ring-buy-200 dark:bg-buy-950/60 dark:text-buy-100 dark:ring-buy-900',
  warning:
    'bg-wait-50 text-wait-900 ring-wait-200 dark:bg-wait-950/60 dark:text-wait-100 dark:ring-wait-900',
  error:
    'bg-skip-50 text-skip-900 ring-skip-200 dark:bg-skip-950/60 dark:text-skip-100 dark:ring-skip-900',
};

const ICONS: Record<Tone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  error: 'alert',
};

interface NoticeProps {
  tone?: Tone;
  /** Bold first line above the message. */
  title?: string;
  /** `false` hides the icon; by default each tone has its own. */
  icon?: IconName | false;
  /** A control shown next to the message, e.g. a retry button. */
  action?: ReactNode;
  onDismiss?: () => void;
  children: ReactNode;
}

/** A message in context. Errors are announced at once, the rest politely. */
export function Notice({ tone = 'info', title, icon, action, onDismiss, children }: NoticeProps) {
  const copy = useCopy();
  const iconName = icon === false ? null : (icon ?? ICONS[tone]);
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-control px-4 py-3 text-sm ring-1 ${TONES[tone]}`}
    >
      {iconName && <Icon name={iconName} size={20} className="mt-0.5 opacity-80" />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          leadingIcon="x"
          aria-label={copy.common.close}
          onClick={onDismiss}
          className="-my-1 -mr-2 text-current hover:bg-black/5 dark:hover:bg-white/10"
        />
      )}
    </div>
  );
}
