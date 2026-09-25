export type NodeType =
  | 'public_recipient'
  | 'shell_intermediary'
  | 'nominee_person'
  | 'sanctioned_entity'
  | 'transshipment_hub'
  | 'address_hub'
  | 'facilitator'
  | 'associated_person'
  | 'related_company'
  | 'public_money'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type RelationshipType =
  | 'SHARED_ADDRESS'
  | 'BENEFICIAL_OWNER'
  | 'OFFICER_DIRECTOR'
  | 'SUPPLY_CHAIN_SHIPMENT'
  | 'POSSIBLY_SAME_AS'
  | 'ACTING_ON_BEHALF_OF'
  | 'OWNS_OR_CONTROLS'
  | 'LINKED_TO'
  | 'PUBLIC_MONEY'

export interface RiskSignal {
  signal_name: string
  severity: Severity
  provenance_source: string
  evidence_record: string | null
  /** research/sources.json ID of evidence_record */
  source_id?: string
  /** Who published the record (OFAC, DOJ, Companies House...). provenance_source is the retrieval tool. */
  source_authority?: string
}

/** Sayari `possibly_same_as[].match_keys` item; older fixtures used plain strings. */
export type MatchKey = string | { key: string; normalized: string; original: string }

export interface SayariPassThrough {
  sanctioned: boolean | null
  pep: boolean | null
  closed: boolean | null
  degree: number | null
  /** Sayari REST `relationship_count`: related entities per relationship type */
  relationship_count: Record<string, number>
  shares: unknown[]
  position: unknown[]
  possibly_same_as: unknown[]
  match_keys: MatchKey[]
}

export interface InvestigationNode {
  id: string
  label: string
  type: NodeType
  jurisdiction: string | null
  entity_confidence: string | null
  risk_signals: RiskSignal[]
  sayari_pass_through: SayariPassThrough | null
  details?: NodeDetails
}

/** Extra entity facts copied from Sayari / Tradeverifyd records (scripts/build_cases.py). */
export interface NodeDetails {
  sayari_url?: string
  entity_kind?: string
  countries?: string[]
  aliases?: string[]
  addresses?: string[]
  identifiers?: { type: string; value: string }[]
  registration_date?: string
  company_type?: string
  status?: string
  business_purpose?: string[]
  sayari_sources?: string[]
  trade_count?: { sent: number; received: number }
  relationship_summary?: Record<string, number>
  money_status?: MoneyStatus
  money_text?: string
  risk_flag_count?: number
  tradeverifyd?: {
    entity_id?: string
    name?: string
    aliases?: string[]
    score?: number
    score_level?: string
    annotations?: { name: string; description?: string; url?: string }[]
    trade_relationships?: number
  }
}

export interface InvestigationEdge {
  source: string
  target: string
  relationship_type: RelationshipType
  ownership_percentage: number | null
  provenance_ref: string | null
  match_keys?: MatchKey[]
  source_id?: string
  source_authority?: string
  /** The relationship exactly as the source states it */
  label?: string
  sayari_relationship?: string
  former?: boolean
  money_status?: MoneyStatus
  shipments?: number
}

export type MoneyStatus = 'paid' | 'blocked' | 'potential' | 'none'

export interface CaseInsights {
  headline: string
  findings: string[]
  implications: string[]
  next_steps: string[]
}

export interface AuditStep {
  step: number
  source: string
  query_executed: string
  records_matched: number
}

export interface InvestigationSummary {
  root_recipient: string
  composite_risk_score: number
  confidence_rating: string
  primary_typology: string
  executive_rationale: string
}

export interface Investigation {
  investigation_summary: InvestigationSummary
  nodes: InvestigationNode[]
  edges: InvestigationEdge[]
  audit_trail: AuditStep[]
  case?: CaseMeta
}

export interface CaseMeta {
  id: string
  title: string
  root_id: string
  tools_used: string[]
  public_money: string
  sources: { id: string; name: string; url: string; publisher?: string | null }[]
  insights?: CaseInsights | null
  money_status?: MoneyStatus
}

export interface CaseIndexEntry {
  id: string
  title: string
  typology: string
  root: string
  score: number
  grade: string
  nodes: number
  edges: number
  tools: string[]
  entities: string[]
  money_status: MoneyStatus
  headline?: string | null
}

// ---------------------------------------------------------------------------
// Case workspace view model. Real cases are adapted from the Investigation
// fixtures above (lib/cases.ts); the demo scenario lives in lib/mock/case.ts.
// Terms follow docs/follow-the-public-dollar-spec.md section 9.
// ---------------------------------------------------------------------------

/** Risk tier (spec 9.3). `null` on an entity means it has not been assessed. */
export type Tier = 'high' | 'elevated' | 'low' | 'not_assessable'

/** Signal state (spec 9.1). */
export type SignalState = 'fired' | 'not_fired' | 'not_assessable'

/** Entity match grade (spec 7.1). */
export type MatchGrade = 'A' | 'B' | 'C' | 'D'

export type SignalFamily =
  | 'public_money'
  | 'structure'
  | 'lifecycle'
  | 'location'
  | 'trade'
  | 'presence'
  | 'proximity'
  | 'nonprofit'
  | 'other'

export interface ScoreRange {
  point: number
  lower: number
  upper: number
}

export interface Indicator {
  /** Spec signal code (e.g. "PX1") or a record key for real-case signals */
  key: string
  label: string
  family: SignalFamily
  state: SignalState
  evidence: string | null
  provider: string | null
  sourceUrl: string | null
  sourceId?: string
  innocentExplanations: string[]
}

export interface ListEntry {
  list: string
  authority: string
  date: string | null
  sourceUrl: string | null
  sourceId?: string
  /** True for US, UN, EU and UK lists, which count toward the score (spec 9.2) */
  counted: boolean
}

export type ListedKind = 'listed' | 'possibly_majority_owned' | 'not_listed' | 'not_checked'

export interface ListedStatus {
  kind: ListedKind
  entries: ListEntry[]
}

export interface Identifier {
  type: string
  value: string
}

export interface Entity {
  id: string
  name: string
  kind: 'company' | 'person'
  entityType: string
  jurisdiction: string | null
  incorporated: string | null
  dissolved: string | null
  address: string | null
  identifiers: Identifier[]
  listedStatus: ListedStatus
  tier: Tier | null
  score: ScoreRange | null
  /** Share of applicable signals that could be checked, 0 to 1 */
  coverage: number | null
  matchGrade: MatchGrade | null
  matchedAttributes: string[]
  indicators: Indicator[]
  observedDollarsIn: number | null
  hopsFromRecipient: number | null
  demo: boolean
}

export type EdgeKind = 'ownership' | 'control' | 'trade' | 'payment' | 'sibling' | 'possible_match' | 'association'

export type Strength = 'strong' | 'moderate' | 'weak'

export interface Edge {
  id: string
  source: string
  target: string
  kind: EdgeKind
  /** Relationship type as recorded in the source data */
  relationship: string
  share: number | null
  amount: number | null
  activeFrom: string | null
  activeTo: string | null
  strength: Strength
  strengthFactors: string[]
  sourceUrls: string[]
  sourceId?: string
  sourceAuthority?: string
  demo: boolean
}

export interface Award {
  id: string
  agency: string
  recipientId: string
  obligated: number
  url: string | null
  demo: boolean
}

export interface Subaward {
  id: string
  primeAwardId: string
  payerId: string
  payeeId: string
  amount: number
  date: string | null
  url: string | null
  demo: boolean
}

export interface Purchase {
  id: string
  payerId: string
  payeeId: string
  amount: number
  date: string | null
  hsCode: string | null
  demo: boolean
}

export interface Shipment {
  id: string
  date: string | null
  shipperId: string
  receiverId: string
  hsCode: string | null
  description: string | null
  declaredValueUsd: number | null
  weightKg: number | null
  origin: string | null
  destination: string | null
  via: string[]
  flags: ShipmentFlag[]
  demo: boolean
}

export type ShipmentFlag = 'pass_through' | 'short_dwell' | 'relabeling' | 'chpl' | 'transshipment'

export interface AuditEntry {
  seq: number
  timestamp: string | null
  provider: string
  query: string
  recordsReturned: number
  responseHash: string | null
  cache: 'cache' | 'live' | null
}

export interface RunManifest {
  runId: string
  codeVersion: string | null
  weightsHash: string | null
  retrievalWindow: string | null
  reviewer: string | null
}

export interface EvidenceRecord {
  id: string
  provider: string
  recordType: string
  title: string
  retrievedAt: string | null
  contentHash: string | null
  url: string | null
  entityIds: string[]
  indicatorKeys: string[]
}

export interface Alert {
  id: string
  kind: 'listed_path' | 'high_tier' | 'conflicting_sources' | 'low_match' | 'callout_review'
  entityId: string | null
  message: string
  status: 'new' | 'in_review' | 'dismissed' | 'escalated'
}

export type CalloutSeverity = 'data_gap' | 'changing_rules' | 'opacity_flag' | 'partial_disclosure'

export interface RegulatoryCallout {
  id: string
  title: string
  severity: CalloutSeverity
  body: string
  whatThisMeans: string
  sources: { label: string; url: string }[]
  lastVerified: string
  reviewBy: string
}

export interface CaseFile {
  id: string
  title: string
  kind: 'real' | 'demo'
  /** One-line description shown under the title */
  note: string
  typology: string | null
  /** Case-level summary from the fixture, when there is one */
  summary: InvestigationSummary | null
  recipientId: string | null
  award: Award | null
  /** Plain statement shown when no award is on record, e.g. "No federal award located" */
  awardNote: string | null
  subawards: Subaward[]
  purchases: Purchase[]
  entities: Entity[]
  edges: Edge[]
  shipments: Shipment[]
  audit: AuditEntry[]
  manifest: RunManifest | null
}

// --- Attribution (who operates a shell) ------------------------------------

export type AttributionBand = 'documented' | 'high' | 'probable' | 'possible' | 'unattributed'

export type EvidenceGroup =
  | 'registry'
  | 'trade_commodity'
  | 'public_money'
  | 'logistics'
  | 'digital'
  | 'list_identifiers'
  | 'public_reporting'

export interface EvidenceGroupResult {
  group: EvidenceGroup
  state: SignalState
  evidence: string | null
  sourceUrl: string | null
  sourceId?: string
}

export interface AttributionCandidate {
  id: string
  name: string
  kind: 'person' | 'company' | 'network'
  naturalPerson: boolean
  band: AttributionBand
  rationale: string
  evidence: EvidenceGroupResult[]
  /** Candidate ids this one conflicts with; conflicting candidates are shown side by side, never merged */
  conflictsWith: string[]
}

export interface AttributionAnalysis {
  entityId: string
  candidates: AttributionCandidate[]
  /** Other shells in the case whose evidence points to the same candidate */
  convergence: { candidateId: string; shellIds: string[] }[]
  /** List screening of the candidates, kept apart from attribution */
  screening: { candidateId: string; result: string; sourceUrl: string | null; sourceId?: string }[]
  leadPriority: { likelihood: 'higher' | 'lower'; exposure: 'higher' | 'lower' }
  demo: boolean
}
