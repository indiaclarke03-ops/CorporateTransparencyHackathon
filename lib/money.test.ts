import { describe, expect, it } from 'vitest'
import { DEMO_CASE } from './cases'
import { ENDPOINT_ORDER, buildMoneyTrail, pathsOfConcern } from './money'

describe('buildMoneyTrail', () => {
  const trail = buildMoneyTrail(DEMO_CASE)!

  it('reconciles every endpoint dollar with the award total, including trail ends', () => {
    const total = ENDPOINT_ORDER.reduce((s, g) => s + trail.byEndpoint[g], 0)
    expect(total).toBeCloseTo(DEMO_CASE.award!.obligated, 2)
  })

  it('keeps reconciling when small flows collapse into Other', () => {
    const t = buildMoneyTrail(DEMO_CASE, { minAmount: 500_000 })!
    expect(ENDPOINT_ORDER.reduce((s, g) => s + t.byEndpoint[g], 0)).toBeCloseTo(DEMO_CASE.award!.obligated, 2)
    expect(t.byEndpoint.other).toBeGreaterThan(0)
  })

  it('puts listed-party money in the listed group', () => {
    expect(trail.byEndpoint.listed).toBe(410_000 + 850_000)
  })

  it('marks capped payments as derived', () => {
    expect(trail.links.find((l) => l.payeeId === 'ent_alexsong')!.certainty).toBe('derived')
  })

  it('returns null without an award', () => {
    expect(buildMoneyTrail({ ...DEMO_CASE, award: null })).toBeNull()
  })
})

describe('pathsOfConcern', () => {
  it('ranks listed endpoints first, largest first', () => {
    const p = pathsOfConcern(DEMO_CASE)
    expect(p[0].endpoint).toBe('listed')
    expect(p[0].entityIds.at(-1)).toBe('ent_alexsong')
    expect(p.length).toBeLessThanOrEqual(3)
  })
})
