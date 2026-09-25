/**
 * Exposure of public money (method from docs/archive/technical-design-spec-v1.md section 8).
 * Pure functions, no React. Only recorded flows are counted: the award, reported
 * subawards and purchases. Bank transfers are not visible.
 */
import type { CaseFile, Entity, Tier } from './types'

export interface Flow {
  id: string
  payerId: string
  payeeId: string
  /** Recorded amount */
  amount: number
  /** Amount attributable to public money: never more than the payer's own inflow */
  attributable: number
  capped: boolean
  kind: 'subaward' | 'purchase'
}

export interface ExposureRange {
  /** Null when some dollars sit with an entity that has no score */
  point: number | null
  lower: number
  upper: number
}

export interface ExposureSummary {
  awardObligated: number | null
  /** Sum of attributable subaward and purchase dollars (unweighted) */
  observedFlows: number
  flows: Flow[]
  /** Attributable inflow per entity, including the award to the recipient */
  inflowByEntity: Record<string, number>
  riskWeighted: ExposureRange | null
  /** Unweighted dollars reaching listed or possibly majority-owned parties on counted lists */
  listedParty: number
  tierCounts: Record<Tier | 'not_assessed', number>
}

/**
 * Attributable inflow per entity. A payer can never pass on more, in total, than it received:
 * payments are taken in date order and each is capped at what the payer still has. Iterates to a
 * fixed point so payers with several sources are settled with their full inflow. Flows that never
 * connect to the award (or only circulate in a cycle) are left out: they are not public money.
 */
export function computeFlows(c: Pick<CaseFile, 'award' | 'recipientId' | 'subawards' | 'purchases'>): { flows: Flow[]; inflow: Record<string, number> } {
  const all = [
    ...c.subawards.map((s) => ({ id: s.id, payerId: s.payerId, payeeId: s.payeeId, amount: s.amount, date: s.date, kind: 'subaward' as const })),
    ...c.purchases.map((p) => ({ id: p.id, payerId: p.payerId, payeeId: p.payeeId, amount: p.amount, date: p.date, kind: 'purchase' as const })),
  ].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.id.localeCompare(b.id))
  const base: Record<string, number> = {}
  if (c.award && c.recipientId) base[c.recipientId] = c.award.obligated

  let inflow: Record<string, number> = { ...base }
  let flows: Flow[] = []
  for (let iter = 0; iter <= all.length + 1; iter++) {
    const spent: Record<string, number> = {}
    const next: Record<string, number> = { ...base }
    flows = []
    for (const f of all) {
      if (!(f.payerId in inflow)) continue
      const attributable = Math.min(f.amount, Math.max(0, inflow[f.payerId] - (spent[f.payerId] ?? 0)))
      spent[f.payerId] = (spent[f.payerId] ?? 0) + attributable
      next[f.payeeId] = (next[f.payeeId] ?? 0) + attributable
      flows.push({ id: f.id, payerId: f.payerId, payeeId: f.payeeId, amount: f.amount, kind: f.kind, attributable, capped: attributable < f.amount })
    }
    const stable = Object.keys(next).length === Object.keys(inflow).length && Object.entries(next).every(([k, v]) => Math.abs((inflow[k] ?? -1) - v) < 0.005)
    inflow = next
    if (stable) break
  }
  return { flows, inflow }
}

function weights(e: Entity | undefined): { point: number | null; lower: number; upper: number } {
  if (!e?.score) return { point: null, lower: 0, upper: 1 }
  return { point: e.score.point / 100, lower: e.score.lower / 100, upper: e.score.upper / 100 }
}

/** Risk-weighted exposure: sum over entities of inflow x score / 100, with a range. */
export function riskWeightedExposure(inflow: Record<string, number>, entities: Entity[]): ExposureRange {
  const byId = new Map(entities.map((e) => [e.id, e]))
  let point: number | null = 0
  let lower = 0
  let upper = 0
  for (const [id, dollars] of Object.entries(inflow)) {
    const w = weights(byId.get(id))
    lower += dollars * w.lower
    upper += dollars * w.upper
    point = point === null || w.point === null ? null : point + dollars * w.point
  }
  return { point, lower, upper }
}

export function isCountedListed(e: Entity) {
  return (e.listedStatus.kind === 'listed' || e.listedStatus.kind === 'possibly_majority_owned') && e.listedStatus.entries.some((x) => x.counted)
}

export function tierCounts(entities: Entity[]): Record<Tier | 'not_assessed', number> {
  const counts: Record<Tier | 'not_assessed', number> = { high: 0, elevated: 0, low: 0, not_assessable: 0, not_assessed: 0 }
  for (const e of entities) counts[e.tier ?? 'not_assessed']++
  return counts
}

export function summarizeExposure(c: CaseFile): ExposureSummary {
  const { flows, inflow } = computeFlows(c)
  const listedParty = c.entities.filter(isCountedListed).reduce((sum, e) => sum + (inflow[e.id] ?? 0), 0)
  return {
    awardObligated: c.award?.obligated ?? null,
    observedFlows: flows.reduce((s, f) => s + f.attributable, 0),
    flows,
    inflowByEntity: inflow,
    riskWeighted: c.award ? riskWeightedExposure(inflow, c.entities) : null,
    listedParty,
    tierCounts: tierCounts(c.entities),
  }
}
