import type { Certainty } from '@/lib/types'
import { cn } from '@/lib/utils'

export const CERTAINTY_LABEL: Record<Certainty, string> = {
  documented: 'Documented',
  derived: 'Derived',
  estimated: 'Estimated',
  unknown: 'Unknown',
}

/**
 * Shared SVG patterns so charts use exactly the same textures as the legend.
 * Render once per page (the workspace shell does this); reference with fill="url(#pat-...)".
 */
export function CertaintyDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        <pattern id="pat-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--money)" fillOpacity="0.18" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--money)" strokeWidth="2.2" />
        </pattern>
        <pattern id="pat-dot" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--money)" fillOpacity="0.75" />
          <circle cx="3" cy="3" r="1.1" fill="var(--paper)" />
        </pattern>
        <pattern id="pat-unknown" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--unknown)" fillOpacity="0.1" />
          <circle cx="3" cy="3" r="1" fill="var(--unknown)" />
        </pattern>
      </defs>
    </svg>
  )
}

/** Fill for a money shape by certainty: solid, dotted, hatched, or gray dotted. */
export function certaintyFill(c: Certainty) {
  return { documented: 'var(--money)', derived: 'url(#pat-dot)', estimated: 'url(#pat-hatch)', unknown: 'url(#pat-unknown)' }[c]
}

/** Swatch + label. Texture as well as text, so certainty never depends on color alone. */
export function CertaintyMark({ certainty, className, showLabel = true }: { certainty: Certainty; className?: string; showLabel?: boolean }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground', className)}>
      <svg width="14" height="10" aria-hidden="true" className="shrink-0">
        <rect
          x="0.5"
          y="0.5"
          width="13"
          height="9"
          rx="2"
          fill={certaintyFill(certainty)}
          stroke={certainty === 'unknown' ? 'var(--unknown)' : 'var(--money)'}
          strokeDasharray={certainty === 'unknown' ? '1.5 1.5' : undefined}
        />
        {certainty === 'unknown' && (
          <text x="7" y="8" textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--unknown)">
            ?
          </text>
        )}
      </svg>
      {showLabel ? CERTAINTY_LABEL[certainty] : <span className="sr-only">{CERTAINTY_LABEL[certainty]}</span>}
    </span>
  )
}
