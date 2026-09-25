import type { EdgeKind } from '@/lib/types'

/** Stroke per connection kind. Colors are CSS variables so light and dark mode both work. */
export const EDGE_STYLE: Record<EdgeKind, { stroke: string; dash?: string; width: number; arrow: boolean }> = {
  ownership: { stroke: 'var(--ink)', width: 2, arrow: false },
  control: { stroke: 'var(--slate)', dash: '7 4', width: 2, arrow: false },
  trade: { stroke: 'var(--slate)', width: 2, arrow: true },
  payment: { stroke: 'var(--ledger)', width: 2.5, arrow: true },
  sibling: { stroke: 'var(--unconfirmed)', dash: '1.5 4', width: 2, arrow: false },
  possible_match: { stroke: 'var(--unconfirmed)', dash: '5 4', width: 1.75, arrow: false },
  association: { stroke: 'var(--slate)', width: 1.25, arrow: false },
}
