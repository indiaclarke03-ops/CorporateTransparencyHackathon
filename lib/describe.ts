/**
 * Plain-language description and path type for a connection. Pure functions.
 * Direction convention: the edge runs source -> target as recorded
 * (owner -> owned, officer -> company, shipper -> receiver, payer -> payee).
 */
import type { PathType } from './copy'
import { formatUSD } from './format'
import type { Edge } from './types'

export function describeEdge(e: Edge, nameOf: (id: string) => string): string {
  const s = nameOf(e.source)
  const t = nameOf(e.target)
  const rel = e.relationship.toLowerCase()
  switch (e.kind) {
    case 'ownership':
      return e.share !== null ? `${t} is ${e.share}% owned by ${s}` : `${t} is owned by ${s}`
    case 'control':
      if (rel.includes('officer') || rel.includes('director')) return `${s} is an officer or director of ${t}`
      return `${s} owns or controls ${t}`
    case 'trade':
      return `${s} shipped goods to ${t}`
    case 'payment': {
      const amount = e.amount !== null ? ` of ${formatUSD(e.amount)}` : ''
      return rel.includes('subaward') ? `${s} made a subaward${amount} to ${t}` : `${s} made a payment${amount} to ${t}`
    }
    case 'sibling':
      return rel.includes('address') ? `${s} and ${t} share a registered address` : `${s} and ${t} are associated as peers`
    case 'possible_match':
      return `${s} and ${t} may be the same party (unconfirmed)`
    case 'association':
      if (rel.includes('behalf')) return `${s} acted on behalf of ${t}, according to the source`
      if (rel.includes('facilitat')) return `${s} facilitated transactions for ${t}, according to the source`
      return `${s} is linked to ${t}`
  }
}

/**
 * Path-type badge. Ownership is classed by the aggregate share recorded for the owned
 * entity across all ownership edges, since OFAC's 50 Percent Rule aggregates owners.
 */
export function pathType(e: Edge, all: Edge[]): PathType {
  switch (e.kind) {
    case 'ownership': {
      const aggregate = all.filter((x) => x.kind === 'ownership' && x.target === e.target).reduce((sum, x) => sum + (x.share ?? 0), 0)
      return aggregate >= 50 ? 'ownership_majority' : 'ownership_minority'
    }
    case 'control':
      return 'control_only'
    default:
      return e.kind
  }
}
