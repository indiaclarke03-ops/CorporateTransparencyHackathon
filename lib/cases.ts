/**
 * Case registry and the adapter from the citation-audited Investigation fixtures to the
 * workspace view model. Pure functions except `useCaseFile`, the client hook.
 * The adapter only restates what a fixture contains; it adds no facts.
 */
import type {
  CaseFile,
  Edge,
  EdgeKind,
  Entity,
  Indicator,
  Investigation,
  InvestigationEdge,
  InvestigationNode,
  ListEntry,
  ListedStatus,
  MatchGrade,
  MatchKey,
  RiskSignal,
  SignalFamily,
} from './types'
import { demoCase } from './mock/case'
import { computeFlows } from './exposure'

export const CASE_OPTIONS = [
  { id: 'demo', label: 'Demo scenario (hypothetical)' },
  { id: 'serniya', label: 'Serniya Engineering network (real records)' },
  { id: 'palantir', label: 'Palantir Technologies (real records, control)' },
] as const

export type CaseId = (typeof CASE_OPTIONS)[number]['id']

/** Case-level facts restated from each fixture's investigation_summary. */
const REAL_CASE_META: Record<Exclude<CaseId, 'demo'>, Pick<CaseFile, 'title' | 'note' | 'recipientId' | 'award' | 'awardNote'>> = {
  serniya: {
    title: 'Serniya Engineering network',
    note: 'Real records from OFAC, DOJ, BIS and Companies House. No federal award was located for this network, so it is a sanctions-network case, not a traced award.',
    recipientId: null,
    award: null,
    awardNote: 'No federal contract or loan record found in USAspending.gov as of 25 Sep 2026.',
  },
  palantir: {
    title: 'Palantir Technologies (control)',
    note: 'Real records. A transparent, high-dollar federal contractor used to check that the screen does not produce false positives.',
    recipientId: 'ent_palantir',
    award: {
      id: '427 contracts, FY2008–FY2026',
      agency: 'Department of Defense, Department of Homeland Security, Department of Health and Human Services and 15 other agencies',
      recipientId: 'ent_palantir',
      obligated: 5_335_261_774.62,
      url: 'https://www.usaspending.gov/recipient/1ea8a9a4-3726-3491-9040-66950bb67606-P/all',
      demo: false,
    },
    awardNote: null,
  },
}

export function resolveFixtureUrl(id: Exclude<CaseId, 'demo'>) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fixtures/${id}.json`
}

// --- signal and edge mapping ------------------------------------------------

const RULES: { test: RegExp; family: SignalFamily; key: string }[] = [
  { test: /removed from the OFAC SDN/i, family: 'proximity', key: 'PX1' },
  { test: /OFAC SDN|SDN listing|E\.O\. 14024/i, family: 'proximity', key: 'PX1' },
  { test: /Temporary Denial Order|Entity List/i, family: 'proximity', key: 'PX1' },
  { test: /export-related restrictions/i, family: 'proximity', key: 'PX1' },
  { test: /indict|defendant|plea|sentenced/i, family: 'presence', key: 'PR2' },
  { test: /Companies House|strike-off|confirmation statement/i, family: 'lifecycle', key: 'LC' },
  { test: /SAM\.gov exclusion/i, family: 'public_money', key: 'PM6' },
  { test: /Nasdaq|NYSE|SEC-disclosed/i, family: 'presence', key: 'PR1' },
]

/** Identity evidence (a UEI match) is not a risk signal; it feeds the match grade instead. */
const IDENTITY = /matches the USAspending recipient record/i

export function signalToIndicator(s: RiskSignal, index: number): Indicator {
  const rule = RULES.find((r) => r.test.test(s.signal_name))
  const removed = /removed from/i.test(s.signal_name)
  const exculpatory = /Nasdaq|NYSE|SEC-disclosed/i.test(s.signal_name)
  return {
    key: rule?.key ?? `R${index + 1}`,
    label: s.signal_name,
    family: rule?.family ?? 'other',
    state: removed || exculpatory ? 'not_fired' : 'fired',
    evidence: s.signal_name,
    provider: s.source_authority ?? s.provenance_source,
    sourceUrl: s.evidence_record,
    sourceId: s.source_id,
    innocentExplanations: [],
  }
}

export function listedStatusFor(node: InvestigationNode): ListedStatus {
  const entries: ListEntry[] = []
  for (const s of node.risk_signals) {
    if (/removed from/i.test(s.signal_name)) continue
    const base = { authority: s.source_authority ?? s.provenance_source, sourceUrl: s.evidence_record, sourceId: s.source_id, date: null }
    if (/OFAC SDN|SDN listing/i.test(s.signal_name)) entries.push({ ...base, list: 'OFAC SDN List', counted: true })
    else if (/Temporary Denial Order/i.test(s.signal_name)) entries.push({ ...base, list: 'BIS Temporary Denial Order', counted: true })
  }
  if (entries.length) return { kind: 'listed', entries }
  if (node.risk_signals.some((s) => /removed from the OFAC SDN/i.test(s.signal_name))) return { kind: 'not_listed', entries: [] }
  if (node.sayari_pass_through?.sanctioned === false) return { kind: 'not_listed', entries: [] }
  return { kind: 'not_checked', entries: [] }
}

const EDGE_KIND: Record<string, EdgeKind> = {
  BENEFICIAL_OWNER: 'ownership',
  OWNS_OR_CONTROLS: 'control',
  OFFICER_DIRECTOR: 'control',
  SUPPLY_CHAIN_SHIPMENT: 'trade',
  SHARED_ADDRESS: 'sibling',
  POSSIBLY_SAME_AS: 'possible_match',
  ACTING_ON_BEHALF_OF: 'association',
  LINKED_TO: 'association',
}

const RELATIONSHIP_LABEL: Record<string, string> = {
  BENEFICIAL_OWNER: 'Beneficial owner',
  OWNS_OR_CONTROLS: 'Owns or controls',
  OFFICER_DIRECTOR: 'Officer / director',
  SUPPLY_CHAIN_SHIPMENT: 'Supply chain shipment',
  SHARED_ADDRESS: 'Shared address',
  POSSIBLY_SAME_AS: 'Possibly same as',
  ACTING_ON_BEHALF_OF: 'Acting on behalf of',
  LINKED_TO: 'Linked to',
}

function matchKeyValue(k: MatchKey) {
  return typeof k === 'string' ? { type: 'Match key', value: k } : { type: k.key.toUpperCase(), value: k.original }
}

export function adaptNode(node: InvestigationNode): Entity {
  const identity = node.risk_signals.filter((s) => IDENTITY.test(s.signal_name))
  const grade = node.entity_confidence?.trim().toUpperCase()
  return {
    id: node.id,
    name: node.label,
    kind: node.type === 'nominee_person' ? 'person' : 'company',
    entityType: node.type,
    jurisdiction: node.jurisdiction,
    incorporated: null,
    dissolved: null,
    address: null,
    identifiers: (node.sayari_pass_through?.match_keys ?? []).map(matchKeyValue),
    listedStatus: listedStatusFor(node),
    tier: null,
    score: null,
    coverage: null,
    matchGrade: grade && 'ABCD'.includes(grade) ? (grade as MatchGrade) : null,
    matchedAttributes: identity.length ? ['UEI', 'Name'] : [],
    indicators: node.risk_signals.filter((s) => !IDENTITY.test(s.signal_name)).map(signalToIndicator),
    observedDollarsIn: null,
    hopsFromRecipient: null,
    demo: false,
  }
}

export function adaptEdge(e: InvestigationEdge, i: number): Edge {
  return {
    id: `e${i}_${e.source}_${e.target}`,
    source: e.source,
    target: e.target,
    kind: EDGE_KIND[e.relationship_type] ?? 'association',
    relationship: RELATIONSHIP_LABEL[e.relationship_type] ?? e.relationship_type,
    share: e.ownership_percentage,
    amount: null,
    activeFrom: null,
    activeTo: null,
    strength: e.source_id ? 'strong' : 'weak',
    strengthFactors: e.source_authority ? [`Recorded by ${e.source_authority}`] : [],
    sourceUrls: e.provenance_ref ? [e.provenance_ref] : [],
    sourceId: e.source_id,
    sourceAuthority: e.source_authority,
    demo: false,
  }
}

/** Hops from the recipient over undirected edges; null when unreachable or there is no recipient. */
export function hopsFrom(rootId: string | null, entityIds: string[], edges: Pick<Edge, 'source' | 'target'>[]) {
  const hops: Record<string, number | null> = Object.fromEntries(entityIds.map((id) => [id, null]))
  if (!rootId || !(rootId in hops)) return hops
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    adj.set(e.source, [...(adj.get(e.source) ?? []), e.target])
    adj.set(e.target, [...(adj.get(e.target) ?? []), e.source])
  }
  hops[rootId] = 0
  const queue = [rootId]
  while (queue.length) {
    const id = queue.shift()!
    for (const n of adj.get(id) ?? []) {
      if (n in hops && hops[n] === null) {
        hops[n] = (hops[id] ?? 0) + 1
        queue.push(n)
      }
    }
  }
  return hops
}

export function adaptInvestigation(id: Exclude<CaseId, 'demo'>, inv: Investigation): CaseFile {
  const meta = REAL_CASE_META[id]
  // The explorer draws the award as a "public money" node; this view shows the award in the
  // overview instead, so that node and its links are not entities here.
  const moneyNodes = new Set(inv.nodes.filter((n) => (n.type as string) === 'public_money').map((n) => n.id))
  inv = { ...inv, nodes: inv.nodes.filter((n) => !moneyNodes.has(n.id)), edges: inv.edges.filter((e) => !moneyNodes.has(e.source) && !moneyNodes.has(e.target)) }
  const entities = inv.nodes.map(adaptNode)
  const edges = inv.edges.map(adaptEdge)
  return withDerived({
    id,
    kind: 'real',
    typology: /none detected/i.test(inv.investigation_summary.primary_typology) ? null : inv.investigation_summary.primary_typology,
    summary: inv.investigation_summary,
    subawards: [],
    purchases: [],
    shipments: [],
    entities,
    edges,
    audit: inv.audit_trail.map((s) => ({ seq: s.step, timestamp: null, provider: s.source, query: s.query_executed, recordsReturned: s.records_matched, responseHash: null, cache: null })),
    manifest: null,
    ...meta,
  })
}

/** Fill observedDollarsIn and hopsFromRecipient from the flows and edges. */
export function withDerived(c: CaseFile): CaseFile {
  const { inflow } = computeFlows(c)
  const hops = hopsFrom(c.recipientId, c.entities.map((e) => e.id), c.edges)
  return {
    ...c,
    entities: c.entities.map((e) => ({
      ...e,
      observedDollarsIn: inflow[e.id] ?? e.observedDollarsIn,
      hopsFromRecipient: e.hopsFromRecipient ?? hops[e.id] ?? null,
    })),
  }
}

export const DEMO_CASE = withDerived(demoCase)
