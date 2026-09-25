import { describe, expect, it } from 'vitest'
import { computeFlows, riskWeightedExposure, summarizeExposure, tierCounts } from './exposure'
import { demoCase } from './mock/case'
import type { Entity } from './types'

const entity = (id: string, score: [number, number, number] | null): Entity => ({
  id, name: id, kind: 'company', entityType: 'company', jurisdiction: null, incorporated: null, dissolved: null, address: null,
  identifiers: [], listedStatus: { kind: 'not_listed', entries: [] }, tier: null,
  score: score ? { point: score[0], lower: score[1], upper: score[2] } : null,
  coverage: null, matchGrade: null, matchedAttributes: [], indicators: [], observedDollarsIn: null, hopsFromRecipient: null, demo: true,
})

describe('computeFlows', () => {
  it('caps a payment at the payer inflow', () => {
    const { flows, inflow } = computeFlows({
      award: { id: 'A', agency: 'x', recipientId: 'p', obligated: 100, url: null, demo: true },
      recipientId: 'p',
      subawards: [{ id: 's', primeAwardId: 'A', payerId: 'p', payeeId: 'a', amount: 60, date: null, url: null, demo: true }],
      purchases: [{ id: 'q', payerId: 'a', payeeId: 'b', amount: 90, date: null, hsCode: null, demo: true }],
    })
    expect(flows.find((f) => f.id === 'q')).toMatchObject({ attributable: 60, capped: true })
    expect(inflow).toEqual({ p: 100, a: 60, b: 60 })
  })

  it('ignores flows that never connect to the award, including cycles', () => {
    const { flows } = computeFlows({
      award: null,
      recipientId: null,
      subawards: [],
      purchases: [
        { id: 'x', payerId: 'a', payeeId: 'b', amount: 5, date: null, hsCode: null, demo: true },
        { id: 'y', payerId: 'b', payeeId: 'a', amount: 5, date: null, hsCode: null, demo: true },
      ],
    })
    expect(flows).toEqual([])
  })
})

describe('computeFlows cumulative cap', () => {
  it('never lets a payer pass on more than it received in total', () => {
    const { flows, inflow } = computeFlows({
      award: { id: 'A', agency: 'x', recipientId: 'p', obligated: 100, url: null, demo: true },
      recipientId: 'p',
      subawards: [
        { id: 's1', primeAwardId: 'A', payerId: 'p', payeeId: 'a', amount: 70, date: '2024-01-01', url: null, demo: true },
        { id: 's2', primeAwardId: 'A', payerId: 'p', payeeId: 'b', amount: 70, date: '2024-02-01', url: null, demo: true },
      ],
      purchases: [],
    })
    expect(flows.reduce((s, f) => s + f.attributable, 0)).toBe(100)
    expect(flows.find((f) => f.id === 's2')).toMatchObject({ attributable: 30, capped: true })
    expect(inflow).toEqual({ p: 100, a: 70, b: 30 })
  })
})

describe('riskWeightedExposure', () => {
  it('weights by score and treats unscored entities as a 0 to 100% range', () => {
    const r = riskWeightedExposure({ a: 100, b: 50 }, [entity('a', [20, 10, 30]), entity('b', null)])
    expect(r.point).toBeNull()
    expect(r.lower).toBeCloseTo(10)
    expect(r.upper).toBeCloseTo(30 + 50)
  })

  it('returns a point estimate when every entity is scored', () => {
    const r = riskWeightedExposure({ a: 100 }, [entity('a', [20, 10, 30])])
    expect(r.point).toBeCloseTo(20)
  })
})

describe('demo case', () => {
  it('caps the Alexsong purchase at the subawardee inflow', () => {
    const s = summarizeExposure(demoCase)
    const ax = s.flows.find((f) => f.payeeId === 'ent_alexsong')
    expect(ax).toMatchObject({ amount: 920_000, attributable: 850_000, capped: true })
    expect(s.listedParty).toBe(410_000 + 850_000)
    expect(s.observedFlows).toBe(1_200_000 + 850_000 + 410_000 + 850_000)
  })

  it('counts every entity in a tier bucket', () => {
    const counts = tierCounts(demoCase.entities)
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(demoCase.entities.length)
  })
})
