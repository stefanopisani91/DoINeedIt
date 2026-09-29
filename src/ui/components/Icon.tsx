import type { SVGProps } from 'react';
import { ICON_PATHS, type IconName } from '../icons';

export type { IconName } from '../icons';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: 16 | 20 | 24;
}

export function Icon({ name, size = 20, className = '', ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...rest}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

interface SpinnerProps {
  size?: 16 | 20 | 24;
  /** When given, the spinner is announced with this text; otherwise it is decorative. */
  label?: string;
  className?: string;
}

export function Spinner({ size = 20, label, className = '' }: SpinnerProps) {
  const icon = <Icon name="spinner" size={size} className={`animate-spin ${className}`} />;
  if (!label) return icon;
  return (
    <span role="img" aria-label={label} className="inline-flex">
      {icon}
    </span>
  );
}
