/**
 * Case registry and the adapter from the citation-audited Investigation fixtures
 * (public/fixtures/*.json, written by scripts/build_cases.py) to the workspace view model.
 * Pure functions except `useCaseFile` (lib/use-case.ts). The adapter only restates what a
 * fixture contains; it adds no facts.
 */
import caseIndex from './generated/cases.json'
import { computeFlows } from './exposure'
import { demoCase } from './mock/case'
import { typologyIdsForLabel } from './typologies'
import type {
  CaseFile,
  CaseIndexEntry,
  Edge,
  EdgeKind,
  Entity,
  Identifier,
  Indicator,
  Investigation,
  InvestigationEdge,
  InvestigationNode,
  ListEntry,
  ListedStatus,
  MatchGrade,
  MatchKey,
  Nonprofit,
  RiskSignal,
  SignalFamily,
  TimelineEvent,
} from './types'

const REAL_CASES = caseIndex as CaseIndexEntry[]

export const CASE_OPTIONS: { id: string; label: string; typology: string | null; kind: 'demo' | 'real' }[] = [
  { id: 'demo', label: 'Demo scenario (hypothetical)', typology: 'Russia sanctions evasion', kind: 'demo' },
  ...REAL_CASES.map((c) => ({ id: c.id, label: c.title, typology: /none detected/i.test(c.typology) ? 'Clean control' : c.typology, kind: 'real' as const })),
]

export type CaseId = string

export function resolveFixtureUrl(id: CaseId) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fixtures/${id}.json`
}

/** Award facts restated from a fixture's executive rationale, where it states them. */
const AWARDS: Record<string, CaseFile['award']> = {
  palantir: {
    id: '427 contracts, FY2008–FY2026',
    agency: 'Department of Defense, Department of Homeland Security, Department of Health and Human Services and 15 other agencies',
    recipientId: 'ent_palantir',
    obligated: 5_335_261_774.62,
    date: null,
    url: 'https://www.usaspending.gov/recipient/1ea8a9a4-3726-3491-9040-66950bb67606-P/all',
    certainty: 'documented',
    demo: false,
  },
}

// --- countries ---------------------------------------------------------------

const ISO3: Record<string, string> = { USA: 'US', GBR: 'GB', ARE: 'AE', RUS: 'RU', CHN: 'CN', ESP: 'ES', SGP: 'SG', SDN: 'SD', CAN: 'CA', HKG: 'HK', TUR: 'TR', DEU: 'DE', NLD: 'NL', KAZ: 'KZ', CAF: 'CF', PSE: 'PS', LBN: 'LB', IND: 'IN', MEX: 'MX' }

export function normalizeJurisdiction(j: string | null | undefined) {
  if (!j) return null
  const u = j.trim().toUpperCase()
  return ISO3[u] ?? u
}

// --- signal and list mapping -------------------------------------------------

const RULES: { test: RegExp; family: SignalFamily; key: string }[] = [
  { test: /removed from the OFAC SDN/i, family: 'proximity', key: 'PX1' },
  { test: /OFAC|SDN|Specially Designated|E\.O\. \d+|designat/i, family: 'proximity', key: 'PX1' },
  { test: /UFLPA/i, family: 'trade', key: 'TR7' },
  { test: /Temporary Denial Order|Entity List/i, family: 'proximity', key: 'PX1' },
  { test: /export-related restrictions|sanction/i, family: 'proximity', key: 'PX1' },
  { test: /registration-to-award|within days or weeks of forming/i, family: 'lifecycle', key: 'LC1' },
  { test: /indict|defendant|plea|sentenced|convicted|charged/i, family: 'presence', key: 'PR2' },
  { test: /Companies House|strike-off|confirmation statement|dissolv/i, family: 'lifecycle', key: 'LC' },
  { test: /SAM\.gov exclusion/i, family: 'public_money', key: 'PM6' },
  { test: /sham charity|charit|nonprofit/i, family: 'nonprofit', key: 'NP1' },
  { test: /shipment|export|import/i, family: 'trade', key: 'TR' },
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

/** Which list a signal names, and whether it counts toward the score (spec 9.2). */
function listFor(signal: string): { list: string; counted: boolean } | null {
  if (/removed from|no .*(sdn|ofac).*found/i.test(signal)) return null
  if (/China|countermeasure|Unreliable Entit/i.test(signal)) return { list: 'Chinese countermeasure list', counted: false }
  if (/UFLPA/i.test(signal)) return { list: 'UFLPA Entity List', counted: true }
  if (/Temporary Denial Order/i.test(signal)) return { list: 'BIS Temporary Denial Order', counted: true }
  if (/Entity List/i.test(signal)) return { list: 'BIS Entity List', counted: true }
  if (/UK sanction|UK Sanctions List|OFSI/i.test(signal)) return { list: 'UK Sanctions List', counted: true }
  if (/\bUN\b.*sanction|Security Council/i.test(signal)) return { list: 'UN Security Council list', counted: true }
  if (/EU sanction|EU restrictive/i.test(signal)) return { list: 'EU sanctions list', counted: true }
  if (/OFAC|SDN|Specially Designated|E\.O\. \d+|SDGT/i.test(signal)) return { list: 'OFAC SDN List', counted: true }
  return null
}

export function listedStatusFor(node: InvestigationNode): ListedStatus {
  const entries: ListEntry[] = []
  for (const s of node.risk_signals) {
    const hit = listFor(s.signal_name)
    if (!hit || entries.some((e) => e.list === hit.list)) continue
    entries.push({ ...hit, authority: s.source_authority ?? s.provenance_source, sourceUrl: s.evidence_record, sourceId: s.source_id, date: null })
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

function matchKeyValue(k: MatchKey): Identifier {
  return typeof k === 'string' ? { type: 'Match key', value: k } : { type: k.key.toUpperCase(), value: k.original }
}

const PERSON_TYPES = new Set(['nominee_person', 'associated_person'])

export function adaptNode(node: InvestigationNode): Entity {
  const identity = node.risk_signals.filter((s) => IDENTITY.test(s.signal_name))
  const grade = node.entity_confidence?.trim().toUpperCase()
  const d = node.details ?? {}
  const ids: Identifier[] = [...(d.identifiers ?? []), ...(node.sayari_pass_through?.match_keys ?? []).map(matchKeyValue)]
  return {
    id: node.id,
    name: node.label,
    kind: d.entity_kind === 'person' || PERSON_TYPES.has(node.type) ? 'person' : 'company',
    entityType: d.company_type ?? node.type,
    jurisdiction: normalizeJurisdiction(node.jurisdiction),
    incorporated: d.registration_date ?? null,
    dissolved: null,
    address: d.addresses?.[0] ?? null,
    identifiers: ids.filter((x, i) => ids.findIndex((y) => y.type === x.type && y.value === x.value) === i),
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
    relationship: e.label ?? RELATIONSHIP_LABEL[e.relationship_type] ?? e.relationship_type,
    share: e.ownership_percentage,
    amount: null,
    activeFrom: null,
    activeTo: null,
    strength: e.source_id || e.source_authority ? 'strong' : 'weak',
    strengthFactors: [e.source_authority ? `Recorded by ${e.source_authority}` : null, e.former ? 'Former relationship' : null].filter((x): x is string => !!x),
    sourceUrls: e.provenance_ref ? [e.provenance_ref] : [],
    sourceId: e.source_id,
    sourceAuthority: e.source_authority,
    demo: false,
  }
}

/** Nonprofits in a real case: only what the registry states; everything else unknown. */
function nonprofitsFrom(inv: Investigation): Nonprofit[] {
  return inv.nodes
    .filter((n) => /nonprofit|non-profit|charit/i.test(n.details?.company_type ?? ''))
    .map((n) => ({ entityId: n.id, statedMission: null, publicMoney: null, foreignGrants: [], programShare: null, filingYear: null, missionRegions: [], certainty: 'unknown', demo: false }))
}

function timelineFrom(inv: Investigation): TimelineEvent[] {
  return inv.nodes
    .filter((n) => n.details?.registration_date)
    .map((n) => ({
      id: `reg_${n.id}`,
      entityId: n.id,
      date: n.details!.registration_date!,
      kind: 'incorporation' as const,
      label: 'Registered',
      certainty: 'documented' as const,
      sourceUrl: n.details?.sayari_url ?? null,
    }))
}

/** Hops from a root over undirected edges; null when unreachable or there is no root. */
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

export function adaptInvestigation(id: CaseId, inv: Investigation): CaseFile {
  const s = inv.investigation_summary
  // Public-money entry nodes are the explorer's way of drawing the award; the shell shows the
  // award itself (overview, money trail), so they are not entities here.
  const moneyNodes = new Set(inv.nodes.filter((n) => (n.type as string) === 'public_money').map((n) => n.id))
  inv = { ...inv, nodes: inv.nodes.filter((n) => !moneyNodes.has(n.id)), edges: inv.edges.filter((e) => !moneyNodes.has(e.source) && !moneyNodes.has(e.target)) }
  const entities = inv.nodes.map(adaptNode)
  const rootId = inv.case?.root_id && entities.some((e) => e.id === inv.case!.root_id) ? inv.case.root_id : null
  const root = inv.nodes.find((n) => n.id === rootId)
  const award = AWARDS[id] ?? null
  const clean = /none detected/i.test(s.primary_typology)
  return withDerived({
    id,
    title: inv.case?.title ?? REAL_CASES.find((c) => c.id === id)?.title ?? id,
    kind: 'real',
    note: clean
      ? 'Real records. A transparent, high-dollar federal contractor used to check that the screen does not produce false positives.'
      : 'Real records from government and registry sources, gathered with Sayari, Tradeverifyd and Tavily. Every item links to its source.',
    typology: clean ? null : s.primary_typology,
    typologyIds: typologyIdsForLabel(s.primary_typology),
    summary: s,
    rootId,
    recipientId: award?.recipientId ?? (root?.type === 'public_recipient' ? root.id : null),
    award,
    awardNote: award ? null : inv.case?.public_money ?? 'No federal award on record for this case.',
    publicMoneyNote: inv.case?.public_money ?? null,
    subawards: [],
    purchases: [],
    shipments: [],
    entities,
    edges: inv.edges.map(adaptEdge),
    audit: inv.audit_trail.map((a) => ({ seq: a.step, timestamp: null, provider: a.source, query: a.query_executed, recordsReturned: a.records_matched, responseHash: null, cache: null })),
    manifest: null,
    sources: inv.case?.sources ?? [],
    timeline: timelineFrom(inv),
    nonprofits: nonprofitsFrom(inv),
    compositeScore: s.composite_risk_score ?? null,
  })
}

/** Fill observedDollarsIn and hopsFromRecipient from the flows and edges. */
export function withDerived(c: CaseFile): CaseFile {
  const { inflow } = computeFlows(c)
  const hops = hopsFrom(c.recipientId ?? c.rootId, c.entities.map((e) => e.id), c.edges)
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
