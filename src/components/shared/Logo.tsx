/**
 * Odyssey Outdoors logo — lantern with lightning bolt.
 * Paths from official Illustrator source (Logo-01.svg).
 * Uses currentColor for the lantern, white for the bolt.
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
      viewBox="280 150 240 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Odyssey Outdoors logo"
      role="img"
    >
      {/* Lantern body */}
      <path
        d="M460.1,581.2l-120.1.3c-13.8,0-26.6-4.3-36-14.3-6.9-7.3-7.4-17.2-6.7-27.3l.5-6.9c.1-1.4,3.8-1.2,8.1-1.9l-32.3-216.7-13.2-.3-.7-16.7c26.3-8.5,51.2-11.3,78.8-14.9-12.4-1.3-24.8-.4-38.4.8l20.1-32.8c21.3-8.7,42.6-16.3,65.1-22.9,8.6-2.6,18.8-1.4,27.4,1.2,21.5,6.6,42.4,13.6,62.7,21.9l17.6,32.1-35.7-.4c25.2,4,49.1,6.1,74.9,13.9.6,5.3.4,11.4-.1,17.1l-13,1.4-32,215.2,7.9,2.4c0,7.4,1.2,16.9-1,24.9-3.7,13.1-18.6,24.1-33.7,24.1ZM470.8,531.5l33-223.2c-39.9-6-77.6-7.4-116.8-7-33.1.4-64.9,1.4-98.1,7l33.3,223.1h148.6Z"
        fill="currentColor"
      />
      {/* Bottom finial */}
      <path
        d="M427.9,608.3c-15.6,2.5-15.1,18.5-32.6,18.1-18.5-.5-16.2-17.1-32.4-18.8-10.3-1.1-17.6-8.2-17.7-18.2h102.3c-.2,10.4-8.8,17.2-19.6,18.9Z"
        fill="currentColor"
      />
      {/* Top handle / diamond */}
      <polygon
        points="396 183.6 380 196.1 388.7 217.3 375.8 222.9 361.3 196.1 395.9 165.7 430.7 196.1 417.2 222.3 403.6 217.3 412.6 196.1 396 183.6"
        fill="currentColor"
      />
      {/* Lightning bolt */}
      <path
        d="M443.9,400.2l-56.2,73c-2,2.6-6.1.5-5.2-2.6l12.2-42.9c.5-1.9-.8-3.8-2.8-3.8l-30.9-.7c-2,0-3.4-2.1-2.7-4l26.4-75.4c.4-1.2,1.6-2,2.8-2h29.4c2.1,0,3.5,2.2,2.8,4.1l-16.9,44.4c-.7,1.9.6,4,2.7,4l36,1.1c2.4,0,3.8,2.9,2.3,4.8Z"
        className="fill-white dark:fill-white"
        fill="white"
      />
    </svg>
  );
}

/** Small "mark only" variant for tight spaces like favicons */
export function LogoMark({ size = 24, className = "" }: LogoProps) {
  return <Logo size={size} className={className} />;
}
