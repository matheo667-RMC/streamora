interface LogoProps {
  size?: number;
  className?: string;
}

// Streamora "S" mark — a bold ribbon letterform with brand gradient, built for
// the same strong visual impact as Netflix's "N" but as our own identity.
export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Streamora"
    >
      <defs>
        <linearGradient id="streamora-s" x1="20" y1="6" x2="80" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c084fc" />
          <stop offset="0.55" stopColor="#a855f7" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="streamora-shine" x1="30" y1="10" x2="60" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Ribbon body */}
      <path
        d="M74 26 C74 12 42 9 30 23 C18 37 38 49 53 54 C69 59 80 68 69 81 C58 94 27 91 24 74"
        stroke="url(#streamora-s)"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Subtle sheen for depth */}
      <path
        d="M74 26 C74 12 42 9 30 23 C18 37 38 49 53 54"
        stroke="url(#streamora-shine)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
