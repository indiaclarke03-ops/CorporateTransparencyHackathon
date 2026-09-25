import { describe, expect, it } from 'vitest'
import { DEMO_CASE } from './cases'
import { briefCards, keyPoints, pathStory, unknowns } from './narrative'
import { pathsOfConcern } from './money'

describe('briefCards', () => {
  it('answers the five questions from data', () => {
    const cards = briefCards(DEMO_CASE)
    expect(cards.map((c) => c.id)).toEqual(['money', 'where', 'who', 'patterns', 'unknowns'])
    expect(cards[0].sentence.text).toContain('$4.5M was awarded by Example Agency (Demo) (documented)')
  })

  it('changes when the data changes', () => {
    const smaller = { ...DEMO_CASE, award: { ...DEMO_CASE.award!, obligated: 2_000_000 } }
    expect(briefCards(smaller)[0].sentence.text).toContain('$2M was awarded')
    expect(briefCards(smaller)[0].sentence.text).not.toEqual(briefCards(DEMO_CASE)[0].sentence.text)
  })

  it('says so when no award is on record', () => {
    const none = { ...DEMO_CASE, award: null, awardNote: 'No USAspending awards found.' }
    expect(briefCards(none)[0].sentence).toEqual({ text: 'No USAspending awards found.', certainty: 'unknown' })
    expect(unknowns(none)[0].certainty).toBe('unknown')
  })
})

describe('pathStory', () => {
  it('builds steps from the award to the endpoint, with what is not known', () => {
    const story = pathStory(DEMO_CASE, pathsOfConcern(DEMO_CASE)[0])
    expect(story.steps[0].text).toMatch(/^\$4\.5M awarded by Example Agency \(Demo\) to Harborline Systems Inc\. \(Demo\) \(documented\)\.$/)
    expect(story.steps.at(-1)!.certainty).toBe('derived')
    expect(story.notKnown).toContain('Natural-person owner not identified from available records.')
  })
})

describe('keyPoints', () => {
  it('lists the six prompt-38 points, each linking to a view', () => {
    const k = keyPoints(DEMO_CASE)
    expect(k.map((p) => p.id)).toEqual(['traced', 'reach', 'finding', 'pattern', 'unknown', 'next'])
    expect(k.every((p) => p.href.startsWith('/'))).toBe(true)
  })
})
