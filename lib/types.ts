export type NodeType =
  | 'public_recipient'
  | 'shell_intermediary'
  | 'nominee_person'
  | 'sanctioned_entity'
  | 'transshipment_hub'
  | 'address_hub'
  | 'facilitator'

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
}
