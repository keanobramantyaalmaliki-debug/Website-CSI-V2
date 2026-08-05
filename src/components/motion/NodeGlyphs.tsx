/**
 * Original circuit/node-diagram glyphs, one per LivingArchitecture node.
 * Shares the line-art visual language of ProcessGlyphs — a system diagram
 * fits "Living Architecture" better than a stock photo, and matching
 * Process's style makes Deployments (the one section keeping photos) read
 * as a deliberate contrast rather than an inconsistency.
 */

type GlyphProps = { className?: string };

const BASE = "h-full w-full";

export function CitizenGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <circle cx="100" cy="72" r="18" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <path d="M68 140 Q100 108 132 140" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="100" cy="72" r="4" fill="#f97316" />
      <circle cx="60" cy="150" r="2" fill="currentColor" opacity="0.5" />
      <circle cx="140" cy="150" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function OperationsGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <path
        d="M100 60 A40 40 0 1 1 60 100"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <path d="M60 100 L52 90 M60 100 L70 94" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="100" cy="60" r="4" fill="#f97316" />
      <rect x="94" y="94" width="12" height="12" rx="2" stroke="#f97316" strokeWidth="1.5" />
    </svg>
  );
}

export function KnowledgeGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <rect x="65" y="55" width="70" height="16" rx="3" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      <rect x="65" y="79" width="70" height="16" rx="3" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
      <rect x="65" y="103" width="70" height="16" rx="3" stroke="#f97316" strokeWidth="1.5" />
      <circle cx="76" cy="111" r="2" fill="#f97316" />
    </svg>
  );
}

export function InfrastructureGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <circle cx="70" cy="70" r="5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="130" cy="70" r="5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="100" cy="120" r="5" fill="#f97316" />
      <path d="M74 74 L96 116 M126 74 L104 116" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      <path d="M75 70 L125 70" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}

export function IntelligenceGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <path d="M60 110 L82 80 L104 100 L140 65" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 4" />
      <path d="M104 100 L140 65" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <circle cx="140" cy="65" r="4" fill="#f97316" />
      <circle cx="60" cy="110" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="82" cy="80" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function DecisionGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <path d="M100 55 L135 100 L100 145 L65 100 Z" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <path d="M100 55 L135 100 L100 145" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="100" cy="100" r="3" fill="#f97316" />
    </svg>
  );
}

export function ActionGlyph({ className = BASE }: GlyphProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="42" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 5" />
      <path d="M100 70 L100 130 M76 100 L124 100" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      <path d="M100 100 L128 78" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <circle cx="128" cy="78" r="4" fill="#f97316" />
    </svg>
  );
}

export const NODE_GLYPHS = [
  CitizenGlyph,
  OperationsGlyph,
  KnowledgeGlyph,
  InfrastructureGlyph,
  IntelligenceGlyph,
  DecisionGlyph,
  ActionGlyph,
];
