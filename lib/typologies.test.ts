import { describe, expect, it } from 'vitest'
import { DEMO_CASE } from './cases'
import { TYPOLOGIES, fitLabel, typologyById, typologyFit, typologyIdsForLabel } from './typologies'

const e = (id: string) => DEMO_CASE.entities.find((x) => x.id === id)!

describe('typologyFit', () => {
  it('counts matched, unmatched and not-checkable indicators separately', () => {
    const f = typologyFit(e('demo_sub2'), DEMO_CASE, typologyById('russia_evasion')!)
    expect(f.matched).toEqual(expect.arrayContaining(['transshipment', 'chpl_goods', 'export_to_sanctioned']))
    expect(f.notCheckable).toContain('trade_substitution')
    expect(f.matched.length + f.unmatched.length + f.notCheckable.length).toBe(f.total)
    expect(fitLabel(f)).toMatch(/^Typology fit: \d+ of 6 indicators \(\d+ not checkable\)$/)
  })

  it('matches the demo nonprofit to the humanitarian fronts lens', () => {
    const f = typologyFit(e('demo_np'), DEMO_CASE, typologyById('humanitarian_fronts')!)
    expect(f.matched).toEqual(expect.arrayContaining(['mission_mismatch', 'foreign_grants_high_risk', 'recent_incorporation']))
  })
})

describe('typology definitions', () => {
  it('has the seven prompt-27 typologies and labels every unsourced part', () => {
    expect(TYPOLOGIES.map((t) => t.id)).toEqual(['russia_evasion', 'fentanyl_precursors', 'critical_minerals', 'gold', 'xinjiang', 'humanitarian_fronts', 'weapons_sudan'])
    for (const t of TYPOLOGIES) {
      if (t.verificationStatus === 'needs_source') expect(t.unverifiedParts.length).toBeGreaterThan(0)
      expect(t.hsCodes).toEqual([]) // no HS codes until a sourced list is provided
    }
  })

  it('maps case typology labels to lenses', () => {
    expect(typologyIdsForLabel('Russia Sanctions Evasion')).toEqual(['russia_evasion'])
    expect(typologyIdsForLabel('Humanitarian Front')).toEqual(['humanitarian_fronts'])
    expect(typologyIdsForLabel('None Detected - Clean Control Case')).toEqual([])
  })
})
