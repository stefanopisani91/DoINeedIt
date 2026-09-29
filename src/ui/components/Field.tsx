import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { controlClass } from './field-styles';

interface FieldProps {
  id: string;
  label: string;
  /** Short help under the label, linked to the control with aria-describedby. */
  hint?: string;
  error?: string | null | undefined;
  children: ReactNode;
  className?: string;
}

/** Label, optional hint and error around one control. The control keeps the given id. */
export function Field({ id, label, hint, error, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-1.5 text-xs text-ink-faint">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-sm text-skip-700 dark:text-skip-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className = '', ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`${controlClass} ${className}`}
      {...rest}
    />
  );
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} py-2 ${className}`} {...rest} />;
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} py-2 ${className}`} {...rest} />;
}
