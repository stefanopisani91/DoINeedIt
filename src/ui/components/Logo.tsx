interface LogoProps {
  size?: 24 | 32 | 48 | 96;
  className?: string;
}

/** The mark: a teal tile with the check and the amber dot, also used on the icons. */
export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="14" className="fill-brand-700 dark:fill-brand-500" />
      <path
        d="M20 34l8 8 16-18"
        fill="none"
        className="stroke-white dark:stroke-stone-950"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="18" r="7" className="fill-accent-400" />
    </svg>
  );
}
