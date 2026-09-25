import { describe, expect, it } from 'vitest'
import serniya from '../public/fixtures/serniya.json'
import palantir from '../public/fixtures/palantir.json'
import { DEMO_CASE, adaptInvestigation, hopsFrom } from './cases'
import type { Investigation } from './types'

describe('adaptInvestigation', () => {
  const s = adaptInvestigation('serniya', serniya as unknown as Investigation)
  const p = adaptInvestigation('palantir', palantir as unknown as Investigation)

  it('keeps every node and edge from the fixture', () => {
    expect(s.entities).toHaveLength(serniya.nodes.length)
    expect(s.edges).toHaveLength(serniya.edges.length)
  })

  it('adds no award or scores to a real case', () => {
    expect(s.award).toBeNull()
    expect(s.entities.every((e) => e.score === null && e.tier === null)).toBe(true)
  })

  it('reads OFAC listings as counted list entries and honours removals', () => {
    const serniyaEntity = s.entities.find((e) => e.id === 'ent_serniya')!
    expect(serniyaEntity.listedStatus.kind).toBe('listed')
    expect(serniyaEntity.listedStatus.entries[0]).toMatchObject({ list: 'OFAC SDN List', counted: true, sourceId: 'S01' })
    expect(s.entities.find((e) => e.id === 'person_krugovov')!.listedStatus.kind).toBe('not_listed')
  })

  it('treats the Palantir UEI match as identity evidence, not a risk signal', () => {
    const e = p.entities[0]
    expect(e.matchGrade).toBe('B')
    expect(e.matchedAttributes).toContain('UEI')
    expect(e.indicators.some((i) => /UEI/.test(i.label))).toBe(false)
    expect(e.listedStatus.kind).toBe('not_listed')
  })
})

describe('hopsFrom', () => {
  it('counts undirected hops and leaves unreachable nodes null', () => {
    const h = hopsFrom('a', ['a', 'b', 'c', 'z'], [{ source: 'a', target: 'b' }, { source: 'c', target: 'b' }])
    expect(h).toEqual({ a: 0, b: 1, c: 2, z: null })
  })

  it('derives hops for the demo case', () => {
    expect(DEMO_CASE.entities.find((e) => e.id === 'ent_sertal')!.hopsFromRecipient).toBeNull()
    expect(DEMO_CASE.entities.find((e) => e.id === 'demo_sub1')!.observedDollarsIn).toBe(1_200_000)
  })
})
