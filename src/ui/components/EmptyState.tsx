import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-600 dark:text-stone-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
