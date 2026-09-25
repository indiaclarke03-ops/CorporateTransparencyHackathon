/**
 * User-facing copy that more than one component needs. Keep wording here so the copy rules
 * (CLAUDE.md) are enforced in one place.
 */
import type { EdgeKind, SignalFamily, SignalState } from './types'

export const EDGE_KIND_META: Record<EdgeKind, { label: string; description: string }> = {
  ownership: { label: 'Ownership', description: 'Solid line with the share held' },
  control: { label: 'Control', description: 'Dashed line: officer, director or other control' },
  trade: { label: 'Trade', description: 'Arrow in the direction goods moved' },
  payment: { label: 'Payment', description: '"$" marker with the amount, arrow in the direction money moved' },
  sibling: { label: 'Sibling', description: 'Dotted line: shared address or other association between peers' },
  possible_match: { label: 'Possible match', description: 'Dashed line with "?": records that may be the same party' },
  association: { label: 'Association', description: 'Thin line: acting on behalf of, or linked to' },
}

/** Path-type badge and the legal-meaning note shown in the connection panel (prompt 5). */
export type PathType = 'ownership_majority' | 'ownership_minority' | 'control_only' | 'trade' | 'payment' | 'sibling' | 'possible_match' | 'association'

export const PATH_TYPE_META: Record<PathType, { badge: string; legalNote: string }> = {
  ownership_majority: {
    badge: 'Ownership ≥50% aggregate',
    legalNote:
      "OFAC's 50 Percent Rule treats an entity owned 50% or more in aggregate by blocked persons as blocked, even if it is not itself listed. Confirm the shares against a registry before relying on this.",
  },
  ownership_minority: {
    badge: 'Ownership <50%',
    legalNote: "Below 50% in aggregate, OFAC's 50 Percent Rule does not block the entity by itself. The stake is still relevant to beneficial-ownership review.",
  },
  control_only: {
    badge: 'Control only',
    legalNote: "OFAC's 50 Percent Rule applies to ownership, not control. A listed officer or director does not by itself block the company, but it warrants review.",
  },
  trade: {
    badge: 'Trade',
    legalNote: 'A recorded shipment shows goods moved between the parties. It does not show who paid, or whether an export license applied.',
  },
  payment: {
    badge: 'Payment',
    legalNote: 'A recorded payment (subaward or purchase). Dollars attributed to public money never exceed what the payer received.',
  },
  sibling: {
    badge: 'Sibling',
    legalNote: 'Association only; no legal consequence follows. Shared addresses are common for companies using the same registered agent.',
  },
  possible_match: {
    badge: 'Possible match',
    legalNote: 'The records may describe the same party but did not meet the threshold to merge. Treat as unconfirmed; it cannot on its own support a finding.',
  },
  association: {
    badge: 'Association',
    legalNote: 'A relationship stated by the source (for example acting on behalf of, or linked to). Its legal effect depends on the source and must be read in context.',
  },
}

export const SIGNAL_STATE_LABEL: Record<SignalState, string> = {
  fired: 'Fired',
  not_fired: 'Not fired',
  not_assessable: 'Not assessable',
}

export const FAMILY_LABEL: Record<SignalFamily, string> = {
  public_money: 'Public money',
  structure: 'Structure',
  lifecycle: 'Lifecycle',
  location: 'Location',
  trade: 'Trade',
  presence: 'Presence',
  proximity: 'Proximity',
  nonprofit: 'Nonprofit',
  other: 'Other',
}

export const LISTED_LABEL = {
  listed: 'Listed',
  possibly_majority_owned: 'Possibly majority-owned by listed parties',
  not_listed: 'Not listed',
  not_checked: 'List status not checked',
} as const

export const LISTED_SCORE_NOTE =
  'Public record. Counts toward the score only for US, UN, EU and UK lists (spec 9.2); other listings are shown as context.'
