import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Surface } from './Surface';

interface EmptyStateProps {
  title: string;
  body: string;
  /** A decorative icon above the title. */
  icon?: IconName;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

export function EmptyState({ title, body, icon, action, secondaryAction }: EmptyStateProps) {
  return (
    <Surface as="div" tone="dashed" padding="lg" className="text-center">
      {icon && (
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-faint"
          aria-hidden="true"
        >
          <Icon name={icon} size={24} />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{body}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </Surface>
  );
}
