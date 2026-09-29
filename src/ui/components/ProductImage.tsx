import { useState } from 'react';

interface ProductImageProps {
  src?: string | undefined;
  alt: string;
  className?: string;
}

/** Shows the product picture, or a neutral placeholder when there is none or it fails to load. */
export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const base = `overflow-hidden bg-stone-100 dark:bg-stone-800 ${className}`;
  if (!src || failed) {
    return (
      <div className={`${base} flex items-center justify-center text-stone-400`} aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          className="h-1/2 w-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 16l-5-5-7 7-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className={base}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
