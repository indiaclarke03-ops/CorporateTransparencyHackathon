/**
 * Regulatory-divergence callouts. Pure data and rules; the component is
 * components/common/RegulatoryCallout.tsx.
 *
 * TODO(Lola): paste the final `body`, `whatThisMeans` and `sources` for each callout from
 * regulatory-divergence-callouts.md, and set `lastVerified` / `reviewBy` to the dates in that file.
 */
import type { Entity, RegulatoryCallout } from './types'

const TODO = 'TODO: final copy from regulatory-divergence-callouts.md.'

export const CALLOUTS: Record<'RD-01' | 'RD-02' | 'RD-03' | 'RD-04' | 'RD-05', RegulatoryCallout> = {
  'RD-01': { id: 'RD-01', title: 'US-formed entity: federal beneficial-ownership reporting', severity: 'changing_rules', body: TODO, whatThisMeans: TODO, sources: [], lastVerified: '2026-09-25', reviewBy: '2026-10-25' },
  'RD-02': { id: 'RD-02', title: 'UK entity: Companies House identity verification', severity: 'changing_rules', body: TODO, whatThisMeans: TODO, sources: [], lastVerified: '2026-09-25', reviewBy: '2026-10-25' },
  'RD-03': { id: 'RD-03', title: 'Delaware LLC: limited public disclosure of owners', severity: 'opacity_flag', body: TODO, whatThisMeans: TODO, sources: [], lastVerified: '2026-09-25', reviewBy: '2026-10-25' },
  'RD-04': { id: 'RD-04', title: 'Wyoming LLC: limited public disclosure of owners', severity: 'opacity_flag', body: TODO, whatThisMeans: TODO, sources: [], lastVerified: '2026-09-25', reviewBy: '2026-10-25' },
  'RD-05': { id: 'RD-05', title: 'Nevada LLC: limited public disclosure of owners', severity: 'opacity_flag', body: TODO, whatThisMeans: TODO, sources: [], lastVerified: '2026-09-25', reviewBy: '2026-10-25' },
}

const LLC = /\bL\.?\s?L\.?\s?C\b\.?/i

/**
 * Rules: US-formed -> RD-01; Delaware LLC -> RD-03 + RD-01; Wyoming LLC -> RD-04 + RD-01;
 * Nevada LLC -> RD-05 + RD-01; UK entity -> RD-02. Jurisdictions use ISO codes ("US", "US-DE", "GB").
 */
export function calloutsFor(e: Pick<Entity, 'jurisdiction' | 'name' | 'entityType' | 'kind'>): RegulatoryCallout[] {
  if (e.kind === 'person') return []
  const j = (e.jurisdiction ?? '').toUpperCase()
  const llc = LLC.test(e.name) || /llc/i.test(e.entityType)
  if (j === 'GB' || j === 'UK') return [CALLOUTS['RD-02']]
  if (j !== 'US' && !j.startsWith('US-')) return []
  const state = { 'US-DE': CALLOUTS['RD-03'], 'US-WY': CALLOUTS['RD-04'], 'US-NV': CALLOUTS['RD-05'] }[j]
  return llc && state ? [state, CALLOUTS['RD-01']] : [CALLOUTS['RD-01']]
}

/** True when today is after the callout's review-by date. */
export function needsReverification(c: Pick<RegulatoryCallout, 'reviewBy'>, today: Date = new Date()) {
  return today.getTime() > new Date(`${c.reviewBy}T23:59:59Z`).getTime()
}
