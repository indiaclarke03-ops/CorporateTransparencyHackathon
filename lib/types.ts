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

export interface RiskSignal {
  signal_name: string
  severity: Severity
  provenance_source: string
  evidence_record: string | null
}

export interface SayariPassThrough {
  sanctioned: boolean | null
  pep: boolean | null
  closed: boolean | null
  degree: number | null
  edge_counts: Record<string, number>
  shares: unknown[]
  position: unknown[]
  possibly_same_as: unknown[]
  match_keys: string[]
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
  match_keys?: string[]
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
