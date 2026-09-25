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
 * Attributable inflow per entity. Each flow is capped at the payer's inflow, processed in
 * order of distance from the recipient so upstream caps apply first.
 */
export function computeFlows(c: Pick<CaseFile, 'award' | 'recipientId' | 'subawards' | 'purchases'>): { flows: Flow[]; inflow: Record<string, number> } {
  const inflow: Record<string, number> = {}
  if (c.award && c.recipientId) inflow[c.recipientId] = c.award.obligated

  const pending = [
    ...c.subawards.map((s) => ({ id: s.id, payerId: s.payerId, payeeId: s.payeeId, amount: s.amount, kind: 'subaward' as const })),
    ...c.purchases.map((p) => ({ id: p.id, payerId: p.payerId, payeeId: p.payeeId, amount: p.amount, kind: 'purchase' as const })),
  ]
  const flows: Flow[] = []
  // Repeatedly settle flows whose payer already has a known inflow. Flows that never
  // connect to the award (or sit in a cycle) are left out: they are not public money.
  let progress = true
  while (pending.length && progress) {
    progress = false
    for (let i = 0; i < pending.length; i++) {
      const f = pending[i]
      if (!(f.payerId in inflow)) continue
      const attributable = Math.min(f.amount, inflow[f.payerId])
      flows.push({ ...f, attributable, capped: attributable < f.amount })
      inflow[f.payeeId] = (inflow[f.payeeId] ?? 0) + attributable
      pending.splice(i, 1)
      i--
      progress = true
    }
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
