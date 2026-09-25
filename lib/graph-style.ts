import type { InvestigationNode, NodeType, RelationshipType, Severity } from './types'

export const NODE_TYPE_META: Record<NodeType, { label: string; color: string }> = {
  public_recipient: { label: 'Public recipient', color: '#7fb3a8' },
  shell_intermediary: { label: 'Shell intermediary', color: '#c9a27e' },
  nominee_person: { label: 'Nominee person', color: '#e9a3a0' },
  sanctioned_entity: { label: 'Sanctioned entity', color: '#b8413f' },
  transshipment_hub: { label: 'Transshipment hub', color: '#d98c3f' },
  address_hub: { label: 'Address hub', color: '#a3b18a' },
  facilitator: { label: 'Facilitator', color: '#7f9bbd' },
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: '#d64545',
  HIGH: '#e8772e',
  MEDIUM: '#f2b544',
  LOW: '#8fa35a',
}

export const SEVERITY_CLASS: Record<Severity, string> = {
  CRITICAL: 'bg-sev-critical text-on-color',
  HIGH: 'bg-sev-high text-primary-foreground',
  MEDIUM: 'bg-sev-medium text-accent-foreground',
  LOW: 'bg-sev-low text-accent-foreground',
}

const SEVERITY_RANK: Record<Severity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

export function maxSeverity(node: InvestigationNode): Severity | null {
  let top: Severity | null = null
  for (const s of node.risk_signals) {
    if (!top || SEVERITY_RANK[s.severity] > SEVERITY_RANK[top]) top = s.severity
  }
  return top
}

export function severityRank(s: Severity | null) {
  return s ? SEVERITY_RANK[s] : 0
}

export const RELATIONSHIP_META: Record<RelationshipType, { label: string; color: string; dashed: boolean }> = {
  SHARED_ADDRESS: { label: 'Shared address', color: '#a3b18a', dashed: false },
  BENEFICIAL_OWNER: { label: 'Beneficial owner', color: '#e8772e', dashed: false },
  OFFICER_DIRECTOR: { label: 'Officer / director', color: '#7f9bbd', dashed: false },
  SUPPLY_CHAIN_SHIPMENT: { label: 'Supply chain shipment', color: '#d98c3f', dashed: false },
  POSSIBLY_SAME_AS: { label: 'Possibly same as', color: '#f2b544', dashed: true },
  ACTING_ON_BEHALF_OF: { label: 'Acting on behalf of', color: '#c97b63', dashed: false },
  OWNS_OR_CONTROLS: { label: 'Owns or controls', color: '#e0a15c', dashed: false },
  LINKED_TO: { label: 'Linked to', color: '#b5a48e', dashed: true },
}

export function formatMatchKey(k: string | { key: string; normalized: string; original: string }) {
  return typeof k === 'string' ? k : `${k.key}: ${k.normalized}`
}

export function confidenceClass(grade: string) {
  const g = grade.trim().toUpperCase()
  if (g === 'A') return 'bg-sev-low text-accent-foreground'
  if (g === 'B') return 'bg-[#a3b18a] text-accent-foreground'
  if (g === 'C') return 'bg-sev-medium text-accent-foreground'
  if (g === 'D') return 'bg-sev-high text-primary-foreground'
  return 'bg-sev-critical text-on-color'
}

export function scoreColor(score: number) {
  if (score >= 80) return SEVERITY_COLOR.CRITICAL
  if (score >= 60) return SEVERITY_COLOR.HIGH
  if (score >= 35) return SEVERITY_COLOR.MEDIUM
  return SEVERITY_COLOR.LOW
}
