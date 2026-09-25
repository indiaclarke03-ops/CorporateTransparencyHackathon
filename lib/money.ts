/**
 * "Follow the Money" model (regulator prompt 24) and paths of concern (prompts 23, 25).
 * Pure functions. Every dollar of the award ends in exactly one endpoint group, so the
 * chart always reconciles with the award total (lib/money.test.ts).
 */
import { computeFlows, isCountedListed } from './exposure'
import { fittedEntityIds, typologyById } from './typologies'
import type { CaseFile, Certainty, Entity } from './types'

export type EndpointGroup = 'listed' | 'possibly_majority_owned' | 'elevated_high' | 'typology_fit' | 'no_concerns' | 'trail_ends' | 'other'

export const ENDPOINT_ORDER: EndpointGroup[] = ['listed', 'possibly_majority_owned', 'elevated_high', 'typology_fit', 'no_concerns', 'trail_ends', 'other']

export const ENDPOINT_LABEL: Record<EndpointGroup, string> = {
  listed: 'Listed party (documented)',
  possibly_majority_owned: 'Possibly majority-owned by listed parties',
  elevated_high: 'Elevated or High shell indicators',
  typology_fit: 'Typology fit',
  no_concerns: 'No concerns found',
  trail_ends: 'Trail ends – not visible in available records',
  other: 'Other',
}

export type TrailColumn = 'agency' | 'award' | 'recipient' | 'tier1' | 'tier2' | 'tier3' | 'endpoint'
export const TRAIL_COLUMNS: TrailColumn[] = ['agency', 'award', 'recipient', 'tier1', 'tier2', 'tier3', 'endpoint']

export interface TrailNode {
  id: string
  label: string
  column: TrailColumn
  entityId?: string
  endpoint?: EndpointGroup
}

export interface TrailLink {
  id: string
  source: string
  target: string
  amount: number
  certainty: Certainty
  basis: 'award' | 'subaward' | 'purchase' | 'retained'
  date: string | null
  payerId?: string
  payeeId?: string
}

export interface MoneyTrail {
  nodes: TrailNode[]
  links: TrailLink[]
  awardTotal: number
  byEndpoint: Record<EndpointGroup, number>
}

/** Endpoint group for money that stays with an entity. */
export function endpointFor(e: Entity | undefined, lensFit: Set<string> | null): EndpointGroup {
  if (!e) return 'trail_ends'
  if (isCountedListed(e) && e.listedStatus.kind === 'listed') return 'listed'
  if (e.listedStatus.kind === 'possibly_majority_owned') return 'possibly_majority_owned'
  if (e.tier === 'high' || e.tier === 'elevated') return 'elevated_high'
  if (lensFit?.has(e.id)) return 'typology_fit'
  if (e.tier === 'low') return 'no_concerns'
  return 'trail_ends'
}

/** Payment-graph tier from the recipient: 0 = recipient, capped at 3. */
export function paymentTiers(c: CaseFile) {
  const { flows } = computeFlows(c)
  const tier = new Map<string, number>()
  if (!c.recipientId) return tier
  tier.set(c.recipientId, 0)
  let changed = true
  while (changed) {
    changed = false
    for (const f of flows) {
      const t = tier.get(f.payerId)
      if (t !== undefined && !tier.has(f.payeeId)) {
        tier.set(f.payeeId, Math.min(3, t + 1))
        changed = true
      }
    }
  }
  return tier
}

export function buildMoneyTrail(c: CaseFile, opts: { lens?: string | null; minAmount?: number } = {}): MoneyTrail | null {
  if (!c.award || !c.recipientId) return null
  const { flows, inflow } = computeFlows(c)
  const byId = new Map(c.entities.map((e) => [e.id, e]))
  const lensT = typologyById(opts.lens)
  const lensFit = lensT ? fittedEntityIds(c, lensT) : null
  const tiers = paymentTiers(c)
  const column = (id: string): TrailColumn => (['recipient', 'tier1', 'tier2', 'tier3'] as const)[tiers.get(id) ?? 3]
  const certaintyById = new Map<string, Certainty>([
    ...c.subawards.map((s) => [s.id, s.certainty] as const),
    ...c.purchases.map((p) => [p.id, p.certainty] as const),
  ])
  const dateById = new Map<string, string | null>([...c.subawards.map((s) => [s.id, s.date] as const), ...c.purchases.map((p) => [p.id, p.date] as const)])

  const nodes: TrailNode[] = [
    { id: 'agency', label: c.award.agency, column: 'agency' },
    { id: 'award', label: c.award.id, column: 'award' },
  ]
  const links: TrailLink[] = [
    { id: 'l_agency', source: 'agency', target: 'award', amount: c.award.obligated, certainty: c.award.certainty, basis: 'award', date: c.award.date },
    { id: 'l_award', source: 'award', target: c.recipientId, amount: c.award.obligated, certainty: c.award.certainty, basis: 'award', date: c.award.date, payeeId: c.recipientId },
  ]
  for (const id of tiers.keys()) nodes.push({ id, label: byId.get(id)?.name ?? id, column: column(id), entityId: id })
  for (const f of flows) {
    links.push({ id: `l_${f.id}`, source: f.payerId, target: f.payeeId, amount: f.attributable, certainty: f.capped ? 'derived' : certaintyById.get(f.id) ?? 'unknown', basis: f.kind, date: dateById.get(f.id) ?? null, payerId: f.payerId, payeeId: f.payeeId })
  }

  // Money that stays with each entity ends in that entity's endpoint group.
  const byEndpoint = Object.fromEntries(ENDPOINT_ORDER.map((g) => [g, 0])) as Record<EndpointGroup, number>
  const min = opts.minAmount ?? 0
  let otherCount = 0
  for (const id of tiers.keys()) {
    const out = flows.filter((f) => f.payerId === id).reduce((s, f) => s + f.attributable, 0)
    const retained = Math.max(0, (inflow[id] ?? 0) - out)
    if (retained <= 0) continue
    let group = endpointFor(byId.get(id), lensFit)
    if (retained < min) {
      group = 'other'
      otherCount++
    }
    byEndpoint[group] += retained
    links.push({ id: `l_end_${id}`, source: id, target: `end_${group}`, amount: retained, certainty: group === 'trail_ends' ? 'unknown' : 'derived', basis: 'retained', date: null, payerId: id })
  }
  for (const g of ENDPOINT_ORDER) {
    if (byEndpoint[g] > 0) {
      const label = g === 'typology_fit' && lensT ? `Typology fit: ${lensT.name}` : g === 'other' ? `Other (${otherCount} ${otherCount === 1 ? 'flow' : 'flows'})` : ENDPOINT_LABEL[g]
      nodes.push({ id: `end_${g}`, label, column: 'endpoint', endpoint: g })
    }
  }
  return { nodes, links, awardTotal: c.award.obligated, byEndpoint }
}

export interface PathOfConcern {
  id: string
  /** Entity ids from the recipient to the endpoint entity */
  entityIds: string[]
  /** Flow ids along the path */
  flowIds: string[]
  /** Attributable dollars on the final step */
  amount: number
  endpoint: EndpointGroup
}

/**
 * Paths from the recipient, through recorded payments, to entities that are listed or show
 * Elevated or High indicators. Ranked by the dollars on the final step.
 */
export function pathsOfConcern(c: CaseFile, limit = 3): PathOfConcern[] {
  if (!c.recipientId) return []
  const { flows } = computeFlows(c)
  const byId = new Map(c.entities.map((e) => [e.id, e]))
  const out: PathOfConcern[] = []
  const walk = (at: string, entityIds: string[], flowIds: string[]) => {
    for (const f of flows.filter((x) => x.payerId === at && !entityIds.includes(x.payeeId))) {
      const ids = [...entityIds, f.payeeId]
      const fl = [...flowIds, f.id]
      const g = endpointFor(byId.get(f.payeeId), null)
      if (g === 'listed' || g === 'possibly_majority_owned' || g === 'elevated_high') {
        out.push({ id: fl.join('>'), entityIds: ids, flowIds: fl, amount: f.attributable, endpoint: g })
      }
      walk(f.payeeId, ids, fl)
    }
  }
  walk(c.recipientId, [c.recipientId], [])
  const rank = (g: EndpointGroup) => ENDPOINT_ORDER.indexOf(g)
  return out.sort((a, b) => rank(a.endpoint) - rank(b.endpoint) || b.amount - a.amount).slice(0, limit)
}

/** Share of the award reaching entities with Elevated or High indicators, or listed parties. */
export function concernShares(c: CaseFile) {
  if (!c.award) return null
  const { inflow } = computeFlows(c)
  const flagged = c.entities.filter((e) => e.id !== c.recipientId && (e.tier === 'high' || e.tier === 'elevated' || isCountedListed(e)))
  const listed = c.entities.filter((e) => e.id !== c.recipientId && isCountedListed(e))
  const sum = (es: Entity[]) => es.reduce((s, e) => s + (inflow[e.id] ?? 0), 0)
  return { flaggedDollars: sum(flagged), flaggedCount: flagged.filter((e) => (inflow[e.id] ?? 0) > 0).length, listedDollars: sum(listed), award: c.award.obligated }
}
