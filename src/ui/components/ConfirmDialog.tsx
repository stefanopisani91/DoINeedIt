import { useEffect, useId, useRef } from 'react';
import { useCopy } from '@/i18n';
import { Button } from './Button';
import type { Variant } from './button-styles';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` for destructive actions; the confirm button takes this variant. */
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIRM_VARIANT: Record<NonNullable<ConfirmDialogProps['tone']>, Variant> = {
  default: 'primary',
  danger: 'primary',
};

/**
 * The one confirmation the app uses, on a native <dialog>: modal, focus
 * trapped by the browser, Esc and a click on the backdrop cancel. The safe
 * choice gets the initial focus.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const copy = useCopy();
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      aria-modal="true"
      onCancel={(event) => {
        // Esc: let the parent decide, the dialog closes through `open`.
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card bg-surface p-6 text-ink shadow-raised ring-1 ring-line backdrop:bg-stone-950/50 backdrop:backdrop-blur-sm"
    >
      <h2 id={titleId} className="text-heading font-bold">
        {title}
      </h2>
      <p id={bodyId} className="mt-2 text-sm text-ink-muted">
        {body}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
          {cancelLabel ?? copy.common.cancel}
        </Button>
        <Button
          variant={CONFIRM_VARIANT[tone]}
          className={
            tone === 'danger'
              ? 'bg-skip-700 text-white hover:bg-skip-800 dark:bg-skip-500 dark:text-white dark:hover:bg-skip-700'
              : ''
          }
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
