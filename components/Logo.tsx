type LogoProps = {
  size?: number;
  withGlow?: boolean;
  className?: string;
};

/**
 * Galymer mark: a low-poly, non-photorealistic African grey parrot bust.
 * Rounded faceted skull shading from bright crown to shadow, a hooked
 * beak outlined in signal-teal, a glowing sensor eye, and an energy
 * gradient chest — deliberately synthetic, evoking an AI construct
 * rather than a real bird. Geometry verified by rendering at 340px.
 */
export function Logo({ size = 40, withGlow = false, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Galymer logo"
    >
      <defs>
        <linearGradient id="g-crown" x1="60" y1="28" x2="110" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e7e9ee" />
        </linearGradient>
        <linearGradient id="g-left" x1="45" y1="36" x2="85" y2="83" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d5d9e0" />
          <stop offset="100%" stopColor="#aab1bd" />
        </linearGradient>
        <linearGradient id="g-face" x1="110" y1="36" x2="125" y2="83" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d5d9e0" />
          <stop offset="100%" stopColor="#9aa2b1" />
        </linearGradient>
        <linearGradient id="g-chin" x1="85" y1="70" x2="110" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9aa2b1" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <linearGradient id="g-shadow" x1="45" y1="83" x2="85" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#454c5a" />
          <stop offset="100%" stopColor="#242932" />
        </linearGradient>
        <linearGradient id="g-energy" x1="60" y1="104" x2="100" y2="146" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3ddc97" />
          <stop offset="100%" stopColor="#8b7cf6" />
        </linearGradient>
        <radialGradient id="g-eye" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#6ee7c7" />
          <stop offset="100%" stopColor="#189a6b" />
        </radialGradient>
        <filter id="eye-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {withGlow && (
          <radialGradient id="g-halo" cx="0.5" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#8b7cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b7cf6" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>

      {withGlow && <circle cx="100" cy="100" r="100" fill="url(#g-halo)" />}

      {/* neck / chest — AI energy gradient */}
      <polygon fill="url(#g-energy)" points="109.7,104 60.3,104 68,144 100,146" />

      {/* rounded head, faceted as a shaded fan from center */}
      <polygon fill="url(#g-crown)" points="60.3,36 85,28 109.7,36 85,70" />
      <polygon fill="url(#g-left)" points="45.1,83 45.1,57 60.3,36 85,70" />
      <polygon fill="url(#g-face)" points="109.7,36 124.9,57 124.9,83 85,70" />
      <polygon fill="url(#g-chin)" points="124.9,83 109.7,104 85,112 85,70" />
      <polygon fill="url(#g-shadow)" points="85,112 60.3,104 45.1,83 85,70" />

      {/* hooked beak with a circuit-glow rim */}
      <polygon
        points="118,50 150,54 160,66 140,64 122,74"
        fill="#1c1f26"
        stroke="#3ddc97"
        strokeOpacity="0.65"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M122,58 144,60" stroke="#3ddc97" strokeOpacity="0.35" strokeWidth="1" />

      {/* glowing sensor eye */}
      <circle cx="105" cy="54" r="6.5" fill="url(#g-eye)" filter="url(#eye-glow)" />
      <circle cx="107.2" cy="51.8" r="1.5" fill="#ffffff" />

      {/* outer contours for crispness at small sizes */}
      <path
        d="M85,28 109.7,36 124.9,57 124.9,83 109.7,104 85,112 60.3,104 45.1,83 45.1,57 60.3,36 Z"
        fill="none"
        stroke="#08090b"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M109.7,104 60.3,104 68,144 100,146 Z" fill="none" stroke="#08090b" strokeOpacity="0.35" strokeWidth="1.5" strokeLinejoin="round" />

      {/* fine circuit trace off the nape, signalling "AI" */}
      <path d="M42,72 22,64 M22,64 12,68 M46,92 26,96" stroke="#3ddc97" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="68" r="2" fill="#3ddc97" fillOpacity="0.85" />
      <circle cx="26" cy="96" r="1.6" fill="#8b7cf6" fillOpacity="0.85" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-display font-semibold tracking-tight">Galymer</span>
    </span>
  );
}
