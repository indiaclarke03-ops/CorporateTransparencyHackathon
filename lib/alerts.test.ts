import { describe, expect, it } from 'vitest'
import { generateAlerts } from './alerts'
import { DEMO_CASE } from './cases'

describe('generateAlerts', () => {
  const alerts = generateAlerts(DEMO_CASE, new Date('2026-09-25'))

  it('raises listed-party paths and High-tier entities that are not listed', () => {
    expect(alerts.some((a) => a.kind === 'listed_path' && a.entityId === 'ent_alexsong')).toBe(true)
    expect(alerts.some((a) => a.kind === 'high_tier' && a.entityId === 'demo_sub2')).toBe(true)
    expect(alerts.some((a) => a.kind === 'high_tier' && a.entityId === 'ent_serniya')).toBe(false)
  })

  it('raises callout re-verification only after the review-by date', () => {
    expect(alerts.some((a) => a.kind === 'callout_review')).toBe(false)
    expect(generateAlerts(DEMO_CASE, new Date('2027-01-01')).some((a) => a.kind === 'callout_review')).toBe(true)
  })

  it('gives every alert a unique id', () => {
    expect(new Set(alerts.map((a) => a.id)).size).toBe(alerts.length)
  })
})
