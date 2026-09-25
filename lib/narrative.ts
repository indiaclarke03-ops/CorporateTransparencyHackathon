/**
 * Plain-language sentences generated from case data (regulator prompts 23, 25, 36, 38).
 * Nothing here is hand-written per case: change the data and the sentences change.
 * Sentences name their certainty ("documented", "estimated", "not visible in available records").
 */
import { computeFlows, isCountedListed, summarizeExposure } from './exposure'
import { formatUSD } from './format'
import { ENDPOINT_LABEL, buildMoneyTrail, concernShares, pathsOfConcern, paymentTiers, type PathOfConcern } from './money'
import { sequenceFlags } from './timeline'
import { TYPOLOGIES, fitLabel, typologyFit, type TypologyFit } from './typologies'
import type { CaseFile, Certainty, Entity } from './types'

const usd = (n: number) => formatUSD(n, { compact: true })
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export interface Sentence {
  text: string
  certainty: Certainty
}

export interface BriefCard {
  id: 'money' | 'where' | 'who' | 'patterns' | 'unknowns'
  question: string
  sentence: Sentence
  keyNumber: string
  keyLabel: string
  /** Section the "See the evidence" link opens */
  href: string
}

/** Best typology fit in the case: the entity and typology with the most matched indicators. */
export function bestFit(c: CaseFile): { entity: Entity; fit: TypologyFit; name: string } | null {
  let best: { entity: Entity; fit: TypologyFit; name: string } | null = null
  const candidates = TYPOLOGIES.filter((t) => c.typologyIds.includes(t.id) || c.typologyIds.length === 0)
  for (const t of candidates.length ? candidates : TYPOLOGIES) {
    for (const e of c.entities) {
      const fit = typologyFit(e, c, t)
      if (fit.matched.length && (!best || fit.matched.length > best.fit.matched.length)) best = { entity: e, fit, name: t.name }
    }
  }
  return best
}

/** What the product could not see in this case. */
export function unknowns(c: CaseFile): Sentence[] {
  const out: Sentence[] = []
  const trail = buildMoneyTrail(c)
  if (!c.award) out.push({ text: c.awardNote ? `No award amount is on record: ${c.awardNote}` : 'No federal award is on record for this case.', certainty: 'unknown' })
  if (trail && trail.byEndpoint.trail_ends > 0) out.push({ text: `${usd(trail.byEndpoint.trail_ends)} of the award has no visible next step; the records stop there (not visible in available records).`, certainty: 'unknown' })
  const na = c.entities.reduce((s, e) => s + e.indicators.filter((i) => i.state === 'not_assessable').length, 0)
  if (na) out.push({ text: `${plural(na, 'signal')} could not be checked across the case.`, certainty: 'unknown' })
  const unassessed = c.entities.filter((e) => e.tier === null).length
  if (unassessed) out.push({ text: `${plural(unassessed, 'entity', 'entities')} ${unassessed === 1 ? 'has' : 'have'} not been scored.`, certainty: 'unknown' })
  const missingValues = c.shipments.filter((s) => s.declaredValueUsd === null).length
  if (missingValues) out.push({ text: `${plural(missingValues, 'shipment')} ${missingValues === 1 ? 'has' : 'have'} no declared value.`, certainty: 'unknown' })
  const opaque = new Set(c.entities.filter((e) => ['US', 'US-DE', 'US-WY', 'US-NV'].includes(e.jurisdiction ?? '') && e.kind === 'company').map((e) => e.jurisdiction))
  if (opaque.size) out.push({ text: `Owners are not publicly disclosed in ${[...opaque].join(', ')} registries for most companies.`, certainty: 'documented' })
  const noPerson = c.entities.filter((e) => e.indicators.some((i) => i.key === 'ST1' && i.state === 'fired')).length
  if (noPerson) out.push({ text: `${plural(noPerson, 'ownership chain')} ${noPerson === 1 ? 'ends' : 'end'} at a company; no natural person identified.`, certainty: 'documented' })
  if (!c.shipments.length) out.push({ text: 'No shipment records are attached to this case, so trade signals cannot be checked.', certainty: 'unknown' })
  return out
}

export function briefCards(c: CaseFile): BriefCard[] {
  const x = summarizeExposure(c)
  const shares = concernShares(c)
  const listed = c.entities.filter(isCountedListed)
  const tiers = paymentTiers(c)
  const maxTier = Math.max(0, ...tiers.values())
  const fit = bestFit(c)
  const u = unknowns(c)
  const noPerson = c.entities.filter((e) => e.indicators.some((i) => i.key === 'ST1' && i.state === 'fired')).length

  const money: Sentence = c.award
    ? { text: `${usd(c.award.obligated)} was awarded by ${c.award.agency} (documented). ${x.flows.length ? `${usd(x.observedFlows)} in observed payments moved on from there` : 'No onward payments are on record'}.`, certainty: 'documented' }
    : { text: c.awardNote ?? 'No federal award is on record for this case.', certainty: 'unknown' }

  const where: Sentence =
    shares && x.flows.length
      ? {
          text: `Of ${usd(shares.award)} awarded, ${usd(shares.flaggedDollars)} in observed payments reached ${plural(shares.flaggedCount, 'entity', 'entities')} with Elevated or High indicators or a listing (estimated). ${usd(shares.listedDollars)} reached listed parties (documented listing).`,
          certainty: 'estimated',
        }
      : { text: 'Where the money went is not visible in available records for this case.', certainty: 'unknown' }

  const counts = x.tierCounts
  const who: Sentence = {
    text: `${plural(c.entities.length, 'entity', 'entities')} in the case: ${counts.high} High, ${counts.elevated} Elevated, ${counts.low} Low, ${counts.not_assessed + counts.not_assessable} not assessed. ${plural(listed.length, 'is', 'are')} on a US, UN, EU or UK list (documented).${noPerson ? ` ${plural(noPerson, 'shell has', 'shells have')} no natural person identified.` : ''}`,
    certainty: 'documented',
  }

  const patterns: Sentence = fit
    ? { text: `Strongest pattern: ${fit.name}. ${fitLabel(fit.fit)} at ${fit.entity.name}.`, certainty: 'estimated' }
    : { text: 'No typology indicators matched with the data available.', certainty: 'unknown' }

  return [
    { id: 'money', question: 'How much public money is involved?', sentence: money, keyNumber: c.award ? usd(c.award.obligated) : 'Not on record', keyLabel: 'Awarded', href: '/follow-the-money' },
    { id: 'where', question: 'Where did it go?', sentence: where, keyNumber: shares && x.flows.length ? `${Math.round((shares.flaggedDollars / shares.award) * 100)}%` : '—', keyLabel: tiers.size ? `of the award reached flagged parties · ${plural(maxTier, 'tier')} traced` : 'not traced', href: '/follow-the-money' },
    { id: 'who', question: 'Who is involved?', sentence: who, keyNumber: String(listed.length), keyLabel: 'listed parties', href: '/entities' },
    { id: 'patterns', question: 'What patterns does it match?', sentence: patterns, keyNumber: fit ? `${fit.fit.matched.length} of ${fit.fit.total}` : '—', keyLabel: 'indicators, best fit', href: '/typologies' },
    { id: 'unknowns', question: "What can't we see?", sentence: u[0] ?? { text: 'No gaps recorded.', certainty: 'documented' }, keyNumber: String(u.length), keyLabel: 'gaps listed', href: '/evidence' },
  ]
}

// --- Path stories -------------------------------------------------------------

export interface StoryStep {
  n: number
  text: string
  amount: number | null
  certainty: Certainty
  entityId: string | null
  indicators: string[]
  sourceUrl: string | null
}

export interface PathStoryModel {
  steps: StoryStep[]
  endpoint: string
  notKnown: string[]
}

export function pathStory(c: CaseFile, p: PathOfConcern): PathStoryModel {
  const byId = new Map(c.entities.map((e) => [e.id, e]))
  const { flows } = computeFlows(c)
  const name = (id: string) => byId.get(id)?.name ?? id
  const fired = (id: string) => (byId.get(id)?.indicators ?? []).filter((i) => i.state === 'fired').map((i) => `${i.key} ${i.label}`)
  const steps: StoryStep[] = []
  if (c.award) {
    steps.push({ n: 1, text: `${usd(c.award.obligated)} awarded by ${c.award.agency} to ${name(c.award.recipientId)} (${c.award.certainty}).`, amount: c.award.obligated, certainty: c.award.certainty, entityId: c.award.recipientId, indicators: fired(c.award.recipientId), sourceUrl: c.award.url })
  }
  for (const fid of p.flowIds) {
    const f = flows.find((x) => x.id === fid)!
    const purchase = c.purchases.find((x) => x.id === fid)
    const sub = c.subawards.find((x) => x.id === fid)
    const certainty: Certainty = f.capped ? 'derived' : purchase?.certainty ?? sub?.certainty ?? 'unknown'
    const basis = purchase ? `for ${purchase.hsCode ? `HS ${purchase.hsCode} goods` : 'goods'} (${certainty === 'derived' ? 'capped at what the payer received' : 'estimated from declared shipment value'})` : `as a subaward (${certainty})`
    steps.push({ n: steps.length + 1, text: `${usd(f.attributable)} paid by ${name(f.payerId)} to ${name(f.payeeId)} ${basis}.`, amount: f.attributable, certainty, entityId: f.payeeId, indicators: fired(f.payeeId), sourceUrl: sub?.url ?? null })
  }
  const end = byId.get(p.entityIds.at(-1)!)
  const notKnown: string[] = []
  if (end?.indicators.some((i) => i.key === 'ST1' && i.state !== 'not_fired') || end?.kind === 'company') notKnown.push('Natural-person owner not identified from available records.')
  if (p.flowIds.some((id) => c.purchases.some((x) => x.id === id))) notKnown.push('Actual payment amounts are not visible; purchase values are declared trade values.')
  notKnown.push('What the endpoint did with the money after receipt is not visible in available records.')
  return { steps, endpoint: `${ENDPOINT_LABEL[p.endpoint]}: ${end?.name ?? ''}`, notKnown }
}

/** One-line chain for the Brief: "Harborline → Keystone → Alexsong" with amounts. */
export function pathChain(c: CaseFile, p: PathOfConcern) {
  const byId = new Map(c.entities.map((e) => [e.id, e]))
  const { flows } = computeFlows(c)
  return p.entityIds.map((id, i) => ({ id, name: byId.get(id)?.name ?? id, amount: i === 0 ? c.award?.obligated ?? null : flows.find((f) => f.id === p.flowIds[i - 1])?.attributable ?? null }))
}

// --- Key points (prompt 38) -----------------------------------------------------

export interface KeyPoint {
  id: string
  label: string
  text: string
  certainty: Certainty
  href: string
  highlight: string[]
}

export function keyPoints(c: CaseFile): KeyPoint[] {
  const trail = buildMoneyTrail(c)
  const tiers = paymentTiers(c)
  const x = summarizeExposure(c)
  const top = pathsOfConcern(c, 1)[0]
  const fit = bestFit(c)
  const u = unknowns(c)
  const byId = new Map(c.entities.map((e) => [e.id, e]))
  const points: KeyPoint[] = [
    {
      id: 'traced',
      label: 'What was traced',
      text: c.award ? `Award ${c.award.id} from ${c.award.agency}, ${usd(c.award.obligated)} (documented).` : `No federal award on record. ${c.publicMoneyNote ?? ''}`.trim(),
      certainty: c.award ? 'documented' : 'unknown',
      href: '/follow-the-money',
      highlight: c.recipientId ? [c.recipientId] : [],
    },
    {
      id: 'reach',
      label: 'How far the trail goes',
      text: trail ? `${plural(Math.max(0, ...tiers.values()), 'tier')} traced; ${Math.round((x.observedFlows / trail.awardTotal) * 100)}% of the award is visible in onward payments.` : 'No payment trail is on record.',
      certainty: trail ? 'derived' : 'unknown',
      href: '/follow-the-money',
      highlight: [],
    },
    {
      id: 'finding',
      label: 'Most important finding',
      text: top ? `${usd(top.amount)} reached ${byId.get(top.entityIds.at(-1)!)?.name} (${ENDPOINT_LABEL[top.endpoint].toLowerCase()}).` : 'No recorded payment reached a listed or flagged party.',
      certainty: top ? 'estimated' : 'unknown',
      href: '/follow-the-money',
      highlight: top ? top.entityIds : [],
    },
    {
      id: 'pattern',
      label: 'Strongest pattern match',
      text: fit ? `${fit.name}: ${fit.fit.matched.length} of ${fit.fit.total} indicators at ${fit.entity.name}.` : 'No typology indicators matched.',
      certainty: fit ? 'estimated' : 'unknown',
      href: '/typologies',
      highlight: fit ? [fit.entity.id] : [],
    },
    { id: 'unknown', label: 'Biggest unknown', text: u[0]?.text ?? 'No gaps recorded.', certainty: 'unknown', href: '/evidence', highlight: [] },
    {
      id: 'next',
      label: 'Recommended next step',
      text: top ? `Review the path to ${byId.get(top.entityIds.at(-1)!)?.name} and decide whether to refer it.` : c.entities.some(isCountedListed) ? 'Confirm whether any listed party has a federal registration or award.' : 'No action indicated; keep as a control.',
      certainty: 'derived',
      href: '/review',
      highlight: top ? top.entityIds : [],
    },
  ]
  return points
}

// --- View key points for "How to read this" (prompt 36) -------------------------

export function viewKeyPoints(view: 'money' | 'network' | 'timeline' | 'typologies' | 'geography' | 'supply' | 'ownership', c: CaseFile): KeyPoint[] {
  const byId = new Map(c.entities.map((e) => [e.id, e]))
  switch (view) {
    case 'money': {
      const trail = buildMoneyTrail(c)
      if (!trail) return [{ id: 'm0', label: '', text: 'No award is on record, so there is no money trail to draw.', certainty: 'unknown', href: '', highlight: [] }]
      const top = pathsOfConcern(c, 2)
      return [
        ...top.map((p, i) => ({ id: `m${i}`, label: '', text: `${usd(p.amount)} reached ${byId.get(p.entityIds.at(-1)!)?.name}.`, certainty: 'estimated' as Certainty, href: '', highlight: p.entityIds })),
        ...(trail.byEndpoint.trail_ends > 0 ? [{ id: 'mt', label: '', text: `${usd(trail.byEndpoint.trail_ends)} has no visible next step (trail ends).`, certainty: 'unknown' as Certainty, href: '', highlight: [] }] : []),
      ]
    }
    case 'network': {
      const listed = c.entities.filter(isCountedListed)
      const hub = [...c.entities].sort((a, b) => c.edges.filter((e) => e.source === b.id || e.target === b.id).length - c.edges.filter((e) => e.source === a.id || e.target === a.id).length)[0]
      const pts: KeyPoint[] = [
        { id: 'n1', label: '', text: `${plural(listed.length, 'entity', 'entities')} ${listed.length === 1 ? 'is' : 'are'} on a counted list.`, certainty: 'documented', href: '', highlight: listed.map((e) => e.id) },
        ...(hub ? [{ id: 'n2', label: '', text: `${hub.name} has the most connections (${c.edges.filter((e) => e.source === hub.id || e.target === hub.id).length}).`, certainty: 'documented' as Certainty, href: '', highlight: [hub.id] }] : []),
        { id: 'n3', label: '', text: `${plural(c.edges.filter((e) => e.demo).length, 'connection')} ${c.edges.filter((e) => e.demo).length === 1 ? 'is' : 'are'} invented demo links.`, certainty: 'documented', href: '', highlight: [] },
      ]
      return pts.filter((k) => !(k.id === 'n3' && c.kind === 'real'))
    }
    case 'timeline': {
      const flags = sequenceFlags(c)
      return flags.length
        ? flags.slice(0, 4).map((f) => ({ id: f.id, label: '', text: `${byId.get(f.entityIds[0])?.name}: ${f.label}.`, certainty: 'documented' as Certainty, href: '', highlight: f.entityIds }))
        : [{ id: 't0', label: '', text: 'No sequence patterns were detected with the dates on record.', certainty: 'unknown', href: '', highlight: [] }]
    }
    case 'typologies': {
      const fit = bestFit(c)
      return fit
        ? [{ id: 'y1', label: '', text: `${fit.entity.name}: ${fitLabel(fit.fit)} for ${fit.name}.`, certainty: 'estimated', href: '', highlight: [fit.entity.id] }]
        : [{ id: 'y0', label: '', text: 'No typology indicators matched with the data available.', certainty: 'unknown', href: '', highlight: [] }]
    }
    default: {
      const j = new Map<string, number>()
      for (const e of c.entities) if (e.jurisdiction) j.set(e.jurisdiction, (j.get(e.jurisdiction) ?? 0) + 1)
      const topJ = [...j.entries()].sort((a, b) => b[1] - a[1])[0]
      return topJ ? [{ id: 'g1', label: '', text: `Most entities are registered in ${topJ[0]} (${topJ[1]}).`, certainty: 'documented', href: '', highlight: c.entities.filter((e) => e.jurisdiction === topJ[0]).map((e) => e.id) }] : []
    }
  }
}
