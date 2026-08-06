/**
 * Original line-art glyphs, one per Process step. Abstract rather than
 * photographic — same visual language reused in NodeGlyphs so Process and
 * LivingArchitecture read as one system, deliberately distinct from
 * Deployments (which keeps photos as real-world proof).
 */

type GlyphProps = { className?: string };

const BASE = "h-full w-full";

export function DiscoveryGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="60" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 6" />
      <circle cx="100" cy="100" r="34" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 5" />
      <path d="M100 40 A60 60 0 0 1 152 70" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <circle cx="152" cy="70" r="4" fill="#f97316" />
      <circle cx="152" cy="70" r="8" stroke="#f97316" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="60" cy="140" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="140" cy="150" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="50" cy="80" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function StrategyGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <path
        d="M40 150 L80 110 L110 135 L150 60"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeDasharray="3 5"
      />
      <path d="M110 135 L150 60" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="150" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="80" cy="110" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="110" cy="135" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="150" cy="60" r="5" fill="#f97316" />
      <circle cx="150" cy="60" r="10" stroke="#f97316" strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  );
}

export function DesignGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <rect x="55" y="65" width="70" height="70" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="75" y="85" width="70" height="70" stroke="#f97316" strokeWidth="1.5" />
      <path d="M55 65 L75 85 M125 65 L145 85 M55 135 L75 155 M125 135 L145 155" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      <circle cx="75" cy="85" r="2.5" fill="#f97316" />
    </svg>
  );
}

export function DevelopmentGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <rect x="50" y="55" width="100" height="90" rx="4" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      <line x1="62" y1="75" x2="112" y2="75" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      <line x1="62" y1="90" x2="138" y2="90" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <line x1="62" y1="105" x2="95" y2="105" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <line x1="62" y1="120" x2="126" y2="120" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TestingGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={62 + col * 30}
            y={62 + row * 30}
            width="22"
            height="22"
            rx="3"
            stroke="currentColor"
            strokeOpacity="0.3"
            strokeWidth="1"
          />
        )),
      )}
      <path d="M67 73 L73 79 L83 65" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M97 103 L103 109 L113 95" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DeploymentGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <circle cx="55" cy="60" r="4" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="55" cy="140" r="4" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="90" cy="100" r="4" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      <path d="M59 60 L142 98 M59 140 L142 102" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      <path d="M94 100 L142 100" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      <circle cx="148" cy="100" r="7" fill="#f97316" />
      <circle cx="148" cy="100" r="13" stroke="#f97316" strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  );
}

export const PROCESS_GLYPHS = [
  DiscoveryGlyph,
  StrategyGlyph,
  DesignGlyph,
  DevelopmentGlyph,
  TestingGlyph,
  DeploymentGlyph,
];
