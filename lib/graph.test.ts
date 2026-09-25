import { describe, expect, it } from 'vitest'
import { EDGE_KINDS, filterGraph, layeredLayout, layoutRoot, nodeSize, pathsToListed } from './graph'
import { DEMO_CASE } from './cases'

const { entities, edges, recipientId } = DEMO_CASE

describe('pathsToListed', () => {
  it('highlights the shortest paths from the recipient to listed parties', () => {
    const p = pathsToListed(recipientId, entities, edges)
    expect(p.targets).toContain('ent_photonpro')
    expect(p.nodes.has('demo_prime')).toBe(true)
    expect(p.nodes.has('demo_sub1')).toBe(true)
    expect(p.edges.has('e_sub1')).toBe(true)
    // Sertal has no connection in the demo, so no path reaches it.
    expect(p.targets).not.toContain('ent_sertal')
  })

  it('returns nothing without a recipient', () => {
    expect(pathsToListed(null, entities, edges).nodes.size).toBe(0)
  })
})

describe('filterGraph', () => {
  it('drops edge kinds that are toggled off', () => {
    const f = filterGraph(entities, edges, { kinds: new Set(EDGE_KINDS.filter((k) => k !== 'payment')), maxHops: null })
    expect(f.edges.some((e) => e.kind === 'payment')).toBe(false)
    expect(f.entities).toHaveLength(entities.length)
  })

  it('limits entities by hops and removes their edges', () => {
    const f = filterGraph(entities, edges, { kinds: new Set(EDGE_KINDS), maxHops: 1 })
    expect(f.entities.map((e) => e.id).sort()).toEqual(['demo_np', 'demo_prime', 'demo_sub1', 'demo_sub2'])
    expect(f.edges.every((e) => ['demo_np', 'demo_prime', 'demo_sub1', 'demo_sub2'].includes(e.target))).toBe(true)
  })
})

describe('layout', () => {
  it('puts the recipient in the first column and unconnected entities last', () => {
    const pos = layeredLayout(entities, edges, layoutRoot(entities, edges, recipientId))
    expect(pos.demo_prime.x).toBe(0)
    expect(pos.ent_sertal.x).toBeGreaterThan(pos.ent_inventionbridge.x)
  })

  it('falls back to the most connected entity when there is no recipient', () => {
    expect(layoutRoot(entities, edges, null)).toBe('ent_photonpro')
  })

  it('clamps node size', () => {
    expect(nodeSize(null)).toBe(56)
    expect(nodeSize(1e12)).toBe(96)
  })
})
