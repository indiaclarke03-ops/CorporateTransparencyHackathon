/**
 * Indicator catalog for typology fits (regulator prompt 27). Each key maps to the build spec's
 * signal codes (section 9.1) and/or to shipment and nonprofit data. Keys with no data source yet
 * are always `not_assessable`, so fits read "X of Y indicators (Z not checkable)".
 */
import { isCountedListed } from './exposure'
import type { CaseFile, Entity, Indicator, ShipmentFlag, SignalState } from './types'

interface IndicatorDef {
  label: string
  /** Spec signal codes that evidence this indicator */
  codes: string[]
  /** Shipment flag that evidences this indicator when the entity ships or receives the goods */
  shipmentFlag?: ShipmentFlag
  /** HS chapter prefix evidencing this indicator */
  hsPrefix?: string
  /** No data source exists yet */
  noSource?: boolean
}

export const INDICATORS = {
  recent_incorporation: { label: 'Recent incorporation then activity', codes: ['LC1'] },
  transshipment: { label: 'Transshipment routing', codes: ['TR3'], shipmentFlag: 'transshipment' },
  chpl_goods: { label: 'High-priority (CHPL) goods', codes: ['TR2'], shipmentFlag: 'chpl' },
  export_to_sanctioned: { label: 'Exports to a listed party', codes: [] },
  trade_substitution: { label: 'Trade substitution after a designation', codes: [], noSource: true },
  business_goods_mismatch: { label: 'Business–goods mismatch', codes: ['TR1'] },
  no_presence: { label: 'No operational footprint', codes: ['PR1'] },
  phoenix_linkage: { label: 'Phoenix linkage', codes: ['LC4'] },
  routing: { label: 'Indirect routing', codes: ['TR3'], shipmentFlag: 'transshipment' },
  relabeling: { label: 'Relabeling', codes: [], shipmentFlag: 'relabeling' },
  price_outlier: { label: 'Price outlier', codes: [], noSource: true },
  round_trip_value: { label: 'Round-trip value', codes: [], noSource: true },
  upstream_supplier_in_region: { label: 'Upstream supplier in the region', codes: ['TR7'] },
  listed_supplier: { label: 'Listed supplier', codes: ['TR7'] },
  mission_mismatch: { label: 'Mission mismatch', codes: ['NP1'] },
  foreign_grants_high_risk: { label: 'Foreign grants to high-risk regions', codes: ['NP2'] },
  proximity: { label: 'Proximity to listed parties', codes: ['PX1', 'PX2'] },
  hs_chapter_93: { label: 'Arms and ammunition (HS chapter 93)', codes: [], hsPrefix: '93' },
  humanitarian_cover: { label: 'Humanitarian cover', codes: [], noSource: true },
} satisfies Record<string, IndicatorDef>

export type IndicatorKey = keyof typeof INDICATORS

export function indicatorState(
  key: IndicatorKey,
  e: Entity,
  c: Pick<CaseFile, 'shipments' | 'nonprofits' | 'entities' | 'edges'>,
): { state: SignalState; evidence: Indicator | null } {
  const def: IndicatorDef = INDICATORS[key]
  if (def.noSource) return { state: 'not_assessable', evidence: null }

  const fired = e.indicators.find((i) => def.codes.includes(i.key) && i.state === 'fired')
  if (fired) return { state: 'fired', evidence: fired }

  const involved = c.shipments.filter((s) => s.shipperId === e.id || s.receiverId === e.id)
  if (def.shipmentFlag) {
    const s = involved.find((x) => x.flags.includes(def.shipmentFlag!))
    if (s) return { state: 'fired', evidence: shipmentIndicator(key, def.label, s.description, s.hsCode) }
  }
  if (def.hsPrefix) {
    const s = involved.find((x) => x.hsCode?.startsWith(def.hsPrefix!))
    if (s) return { state: 'fired', evidence: shipmentIndicator(key, def.label, s.description, s.hsCode) }
    return { state: involved.length ? 'not_fired' : 'not_assessable', evidence: null }
  }
  if (key === 'export_to_sanctioned') {
    const listed = new Set(c.entities.filter(isCountedListed).map((x) => x.id))
    const s = c.shipments.find((x) => x.shipperId === e.id && listed.has(x.receiverId))
    if (s) return { state: 'fired', evidence: shipmentIndicator(key, def.label, `Shipment to a listed party${s.date ? ` on ${s.date}` : ''}`, s.hsCode) }
    return { state: involved.length ? 'not_fired' : 'not_assessable', evidence: null }
  }

  const checked = e.indicators.find((i) => def.codes.includes(i.key))
  if (checked) return { state: checked.state === 'not_fired' ? 'not_fired' : 'not_assessable', evidence: null }
  if (def.shipmentFlag && involved.length) return { state: 'not_fired', evidence: null }
  return { state: 'not_assessable', evidence: null }
}

function shipmentIndicator(key: string, label: string, detail: string | null, hs: string | null): Indicator {
  return {
    key,
    label,
    family: 'trade',
    state: 'fired',
    evidence: [detail, hs ? `HS ${hs}` : null].filter(Boolean).join(' · ') || null,
    provider: 'Shipment record',
    sourceUrl: null,
    innocentExplanations: [],
  }
}
