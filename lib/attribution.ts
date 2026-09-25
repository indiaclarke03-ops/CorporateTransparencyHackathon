/** Attribution helpers. Pure functions. */
import { DEMO_ATTRIBUTION } from './mock/attribution'
import type { AttributionAnalysis, AttributionBand, AttributionCandidate, CaseFile, EvidenceGroup } from './types'

export const BAND_ORDER: AttributionBand[] = ['documented', 'high', 'probable', 'possible', 'unattributed']

export const BAND_LABEL: Record<AttributionBand, string> = {
  documented: 'Documented',
  high: 'High',
  probable: 'Probable',
  possible: 'Possible',
  unattributed: 'Unattributed',
}

export const EVIDENCE_GROUPS: { group: EvidenceGroup; label: string }[] = [
  { group: 'registry', label: 'Registry' },
  { group: 'trade_commodity', label: 'Trade & commodity' },
  { group: 'public_money', label: 'Public money' },
  { group: 'logistics', label: 'Logistics' },
  { group: 'digital', label: 'Digital' },
  { group: 'list_identifiers', label: 'List identifiers' },
  { group: 'public_reporting', label: 'Public reporting' },
]

/** Attribution analysis for an entity, if one exists. Real cases have none yet. */
export function attributionFor(c: CaseFile, entityId: string): AttributionAnalysis | null {
  if (c.kind !== 'demo') return null
  return DEMO_ATTRIBUTION.find((a) => a.entityId === entityId) ?? null
}

export function rankCandidates(cs: AttributionCandidate[]) {
  return [...cs].sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band))
}

/** Headline statement; never names a person the records do not identify. */
export function attributionStatement(a: AttributionAnalysis) {
  const top = rankCandidates(a.candidates).find((c) => c.band !== 'unattributed')
  if (!top) return 'Unattributed. No candidate reached the Possible band from available records.'
  if (!top.naturalPerson) return `Attributed to the network operating ${top.name}. Natural-person beneficial owner not identified from available records.`
  return `Attributed to ${top.name} (${BAND_LABEL[top.band]}).`
}
