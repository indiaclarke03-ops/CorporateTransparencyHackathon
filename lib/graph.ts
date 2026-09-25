/**
 * Graph logic for the network view: filtering, layout and path-finding.
 * Pure functions with no React imports, so they can be unit-tested.
 */
import type { Edge, EdgeKind, Entity } from './types'
import { isCountedListed } from './exposure'

export const EDGE_KINDS: EdgeKind[] = ['ownership', 'control', 'trade', 'payment', 'sibling', 'possible_match', 'association']

export interface GraphFilter {
  kinds: Set<EdgeKind>
  /** Maximum hops from the recipient; null shows every entity */
  maxHops: number | null
}

/** Keeps edges of the chosen kinds and entities within the hop limit. */
export function filterGraph(entities: Entity[], edges: Edge[], f: GraphFilter) {
  const visible = entities.filter((e) => f.maxHops === null || (e.hopsFromRecipient !== null && e.hopsFromRecipient <= f.maxHops))
  const ids = new Set(visible.map((e) => e.id))
  return { entities: visible, edges: edges.filter((e) => f.kinds.has(e.kind) && ids.has(e.source) && ids.has(e.target)) }
}

function adjacency(edges: Pick<Edge, 'id' | 'source' | 'target'>[]) {
  const adj = new Map<string, { node: string; edge: string }[]>()
  for (const e of edges) {
    adj.set(e.source, [...(adj.get(e.source) ?? []), { node: e.target, edge: e.id }])
    adj.set(e.target, [...(adj.get(e.target) ?? []), { node: e.source, edge: e.id }])
  }
  return adj
}

/** Breadth-first depth from a root over undirected edges. Unreached nodes are absent. */
export function depthFrom(root: string, edges: Pick<Edge, 'id' | 'source' | 'target'>[]) {
  const adj = adjacency(edges)
  const depth = new Map<string, number>([[root, 0]])
  const queue = [root]
  while (queue.length) {
    const id = queue.shift()!
    for (const { node } of adj.get(id) ?? []) {
      if (!depth.has(node)) {
        depth.set(node, depth.get(id)! + 1)
        queue.push(node)
      }
    }
  }
  return depth
}

/** The recipient if there is one, otherwise the entity with the most connections. */
export function layoutRoot(entities: Entity[], edges: Edge[], recipientId: string | null) {
  if (recipientId && entities.some((e) => e.id === recipientId)) return recipientId
  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }
  return [...entities].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.name.localeCompare(b.name))[0]?.id ?? null
}

/**
 * Layered layout: one column per hop from the root, left to right, so the money trail
 * reads like the spec 10.1 strip. Disconnected entities go in a final column.
 */
export function layeredLayout(entities: Entity[], edges: Edge[], rootId: string | null, spacing = { x: 280, y: 130 }) {
  const depth = rootId ? depthFrom(rootId, edges) : new Map<string, number>()
  const maxDepth = Math.max(0, ...depth.values())
  const columns = new Map<number, Entity[]>()
  for (const e of entities) {
    const col = depth.get(e.id) ?? maxDepth + 1
    columns.set(col, [...(columns.get(col) ?? []), e])
  }
  const positions: Record<string, { x: number; y: number }> = {}
  for (const [col, list] of columns) {
    list.sort((a, b) => a.name.localeCompare(b.name))
    list.forEach((e, i) => {
      positions[e.id] = { x: col * spacing.x, y: (i - (list.length - 1) / 2) * spacing.y }
    })
  }
  return positions
}

/**
 * Shortest paths (fewest hops, undirected) from the root to every entity on a counted list.
 * Returns the entity and edge ids on those paths.
 */
export function pathsToListed(rootId: string | null, entities: Entity[], edges: Edge[]) {
  const nodes = new Set<string>()
  const edgeIds = new Set<string>()
  if (!rootId) return { nodes, edges: edgeIds, targets: [] as string[] }
  const adj = adjacency(edges)
  const prev = new Map<string, { node: string; edge: string }[]>()
  const depth = new Map<string, number>([[rootId, 0]])
  const queue = [rootId]
  // BFS that keeps every predecessor at the shortest depth, so ties are all highlighted.
  while (queue.length) {
    const id = queue.shift()!
    for (const next of adj.get(id) ?? []) {
      const d = depth.get(id)! + 1
      if (!depth.has(next.node)) {
        depth.set(next.node, d)
        prev.set(next.node, [{ node: id, edge: next.edge }])
        queue.push(next.node)
      } else if (depth.get(next.node) === d) {
        prev.get(next.node)!.push({ node: id, edge: next.edge })
      }
    }
  }
  const targets = entities.filter((e) => e.id !== rootId && isCountedListed(e) && depth.has(e.id)).map((e) => e.id)
  const stack = [...targets]
  while (stack.length) {
    const id = stack.pop()!
    if (nodes.has(id)) continue
    nodes.add(id)
    for (const p of prev.get(id) ?? []) {
      edgeIds.add(p.edge)
      stack.push(p.node)
    }
  }
  if (targets.length) nodes.add(rootId)
  return { nodes, edges: edgeIds, targets }
}

/** Node diameter from observed inflow: log scale, clamped. */
export function nodeSize(dollars: number | null, min = 56, max = 96) {
  if (!dollars || dollars <= 0) return min
  const t = Math.min(1, Math.max(0, (Math.log10(dollars) - 4) / 5)) // $10k .. $1bn
  return Math.round(min + t * (max - min))
}
