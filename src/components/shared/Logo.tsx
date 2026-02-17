/**
 * Odyssey Outdoors logo — lantern with lightning bolt.
 * Inline SVG so it inherits color from parent via currentColor.
 */

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Odyssey Outdoors logo"
      role="img"
    >
      {/* Lantern top cap */}
      <path
        d="M24 16h16v4c0 1-1 2-2 2H26c-1 0-2-1-2-2v-4z"
        fill="currentColor"
      />
      {/* Lantern ring / handle */}
      <path
        d="M29 8a3 3 0 0 1 6 0v3h-6V8z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Lantern body */}
      <path
        d="M22 22h20l-2 26H24L22 22z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bottom base */}
      <path
        d="M24 48h16v3c0 1-1 2-2 2H26c-1 0-2-1-2-2v-3z"
        fill="currentColor"
      />
      {/* Bottom finial */}
      <circle cx="32" cy="56" r="2" fill="currentColor" />
      {/* Lightning bolt */}
      <path
        d="M35 27l-5 9h4l-2 9 7-11h-5l3-7z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Small "mark only" variant for tight spaces like favicons */
export function LogoMark({ size = 24, className = "" }: LogoProps) {
  return <Logo size={size} className={className} />;
}
