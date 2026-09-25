/**
 * Typology lens framework (regulator prompts 26-27). Typologies are data, never hard-coded in
 * components. Definitions use ONLY the sources given in prompt 27; everything else is
 * `needs_source` and the UI labels it "Unverified definition – source needed".
 * Validation cases (research/sources.json) are listed separately: they show known examples of
 * the pattern, not the definition.
 */
import { INDICATORS, indicatorState, type IndicatorKey } from './indicators'
import type { CaseFile, Entity, Indicator } from './types'

export type VerificationStatus = 'verified' | 'needs_source'

export interface Sourced<T> {
  value: T
  status: VerificationStatus
}

export interface TypologyDefinition {
  id: string
  name: string
  shortDescription: string
  /** Overall status: verified only when every part of the definition is sourced */
  verificationStatus: VerificationStatus
  /** Which parts still need a source, shown in the UI */
  unverifiedParts: string[]
  sources: { title: string; url: string; retrieved: string | null }[]
  indicatorKeys: IndicatorKey[]
  hsCodes: { code: string; label: string; source: string }[]
  jurisdictions: { code: string; reason: string; source: string }[]
  listSources: { name: string; url: string }[]
  /** lucide icon name */
  icon: 'Radar' | 'FlaskConical' | 'Pickaxe' | 'Coins' | 'Factory' | 'HandHeart' | 'Crosshair'
  /** Official records of known cases (research/sources.json ids or app case ids) */
  validationCases: { label: string; sourceId?: string; caseId?: string }[]
}

export const TYPOLOGIES: TypologyDefinition[] = [
  {
    id: 'russia_evasion',
    name: 'Russia sanctions evasion via third-country intermediaries',
    shortDescription: 'Intermediary companies route controlled goods to Russia through third countries.',
    verificationStatus: 'needs_source',
    unverifiedParts: ['HS code list not loaded yet (CHPL JSON to be provided)', 'Focus on UAE, Turkey, Hong Kong and Central Asia'],
    sources: [
      { title: 'BIS Common High Priority Items List', url: 'https://www.bis.gov/licensing/country-guidance/common-high-priority-items-list-chpl', retrieved: null },
      { title: 'FinCEN and BIS joint alert (transshipment points)', url: 'https://www.fincen.gov/system/files/shared/FinCEN%20and%20BIS%20Joint%20Alert%20FINAL.pdf', retrieved: null },
    ],
    indicatorKeys: ['recent_incorporation', 'transshipment', 'chpl_goods', 'export_to_sanctioned', 'trade_substitution', 'business_goods_mismatch'],
    hsCodes: [],
    jurisdictions: [],
    listSources: [],
    icon: 'Radar',
    validationCases: [{ label: 'Serniya Engineering network (OFAC, 31 Mar 2022; DOJ E.D.N.Y. indictment)', sourceId: 'S01', caseId: 'serniya' }],
  },
  {
    id: 'fentanyl_precursors',
    name: 'Precursor chemical procurement via front companies',
    shortDescription: 'Front companies buy precursor chemicals, often declaring an unrelated business.',
    verificationStatus: 'needs_source',
    unverifiedParts: ['HS codes', 'List sources'],
    sources: [],
    indicatorKeys: ['business_goods_mismatch', 'no_presence', 'recent_incorporation', 'phoenix_linkage'],
    hsCodes: [],
    jurisdictions: [],
    listSources: [],
    icon: 'FlaskConical',
    validationCases: [
      { label: 'Treasury sanctions on a Los Chapitos precursor supply network (SB0272)', sourceId: 'S39' },
      { label: 'FinCEN supplemental advisory on fentanyl (20 Jun 2024)', sourceId: 'S40' },
      { label: 'Hubei Amarvel Biotech case', caseId: 'amarvel' },
    ],
  },
  {
    id: 'critical_minerals',
    name: 'Critical minerals, including cobalt, and export controls',
    shortDescription: 'Critical minerals routed or relabeled to avoid export controls or origin rules.',
    verificationStatus: 'needs_source',
    unverifiedParts: ['HS codes', 'Jurisdictions', 'Export-control lists'],
    sources: [],
    indicatorKeys: ['routing', 'transshipment', 'relabeling', 'price_outlier'],
    hsCodes: [],
    jurisdictions: [],
    listSources: [],
    icon: 'Pickaxe',
    validationCases: [],
  },
  {
    id: 'gold',
    name: 'Gold trade as a value-transfer channel',
    shortDescription: 'Gold moved or priced to transfer value outside the banking system.',
    verificationStatus: 'needs_source',
    unverifiedParts: ['All specifics'],
    sources: [],
    indicatorKeys: ['price_outlier', 'round_trip_value', 'transshipment', 'relabeling'],
    hsCodes: [],
    jurisdictions: [],
    listSources: [],
    icon: 'Coins',
    validationCases: [
      { label: 'OFAC sanctions on Wagner-linked gold companies, incl. Midas Ressources (JY1581)', sourceId: 'S37' },
      { label: 'Meroe Gold case', caseId: 'meroe-gold' },
    ],
  },
  {
    id: 'xinjiang',
    name: 'Xinjiang-linked supply chain exposure',
    shortDescription: 'Suppliers upstream of the recipient operate in, or source from, Xinjiang.',
    verificationStatus: 'needs_source',
    unverifiedParts: ['List sources', 'Region rules'],
    sources: [],
    indicatorKeys: ['upstream_supplier_in_region', 'listed_supplier'],
    hsCodes: [],
    jurisdictions: [],
    listSources: [],
    icon: 'Factory',
    validationCases: [
      { label: 'DHS additions of 37 PRC-based companies to the UFLPA Entity List (14 Jan 2025)', sourceId: 'S41' },
      { label: 'Hoshine Silicon case', caseId: 'hoshine' },
    ],
  },
  {
    id: 'humanitarian_fronts',
    name: 'Nonprofits used as fronts or acting against their stated mission',
    shortDescription: 'A charity’s money goes somewhere its stated mission does not explain.',
    verificationStatus: 'needs_source',
    unverifiedParts: ['Sources'],
    sources: [],
    indicatorKeys: ['mission_mismatch', 'foreign_grants_high_risk', 'recent_incorporation', 'no_presence', 'proximity'],
    hsCodes: [],
    jurisdictions: [],
    listSources: [],
    icon: 'HandHeart',
    validationCases: [
      { label: 'OFAC designation of Samidoun as a sham charity (JY2646, 15 Oct 2024)', sourceId: 'S34', caseId: 'samidoun' },
      { label: 'OFAC action on five sham charities (SB0162)', sourceId: 'S35' },
    ],
  },
  {
    id: 'weapons_sudan',
    name: 'Arms trafficking to Sudan via intermediaries and humanitarian cover',
    shortDescription: 'Arms reach parties in Sudan through intermediaries, sometimes under humanitarian cover.',
    verificationStatus: 'needs_source',
    unverifiedParts: ['Specific routes and entities'],
    sources: [],
    indicatorKeys: ['hs_chapter_93', 'transshipment', 'humanitarian_cover', 'proximity'],
    hsCodes: [],
    jurisdictions: [],
    listSources: [],
    icon: 'Crosshair',
    validationCases: [
      { label: 'Treasury action on the RSF leader and linked companies (JY2772)', sourceId: 'S36' },
      { label: 'AZ Gold and the RSF trading network case', caseId: 'rsf-gold' },
    ],
  },
]

export function typologyById(id: string | null | undefined) {
  return TYPOLOGIES.find((t) => t.id === id) ?? null
}

/** Maps the case typology label written by scripts/build_cases.py to lens ids. */
export function typologyIdsForLabel(label: string | null): string[] {
  const l = (label ?? '').toLowerCase()
  if (l.includes('russia')) return ['russia_evasion']
  if (l.includes('sudan') || l.includes('rsf')) return ['weapons_sudan', 'gold']
  if (l.includes('fentanyl')) return ['fentanyl_precursors']
  if (l.includes('humanitarian')) return ['humanitarian_fronts']
  if (l.includes('xinjiang')) return ['xinjiang', 'critical_minerals']
  if (l.includes('gold')) return ['gold']
  return []
}

export interface TypologyFit {
  typologyId: string
  matched: IndicatorKey[]
  unmatched: IndicatorKey[]
  notCheckable: IndicatorKey[]
  total: number
  evidence: Indicator[]
}

/**
 * How many of a typology's indicators fired for one entity. Not-checkable indicators count as
 * neither match nor non-match. Pure; unit-tested.
 */
export function typologyFit(entity: Entity, caseData: Pick<CaseFile, 'shipments' | 'nonprofits' | 'entities' | 'edges'>, t: TypologyDefinition): TypologyFit {
  const matched: IndicatorKey[] = []
  const unmatched: IndicatorKey[] = []
  const notCheckable: IndicatorKey[] = []
  const evidence: Indicator[] = []
  for (const key of t.indicatorKeys) {
    const r = indicatorState(key, entity, caseData)
    if (r.state === 'fired') {
      matched.push(key)
      if (r.evidence) evidence.push(r.evidence)
    } else if (r.state === 'not_fired') unmatched.push(key)
    else notCheckable.push(key)
  }
  return { typologyId: t.id, matched, unmatched, notCheckable, total: t.indicatorKeys.length, evidence }
}

/** "Typology fit: 3 of 6 indicators (2 not checkable)" */
export function fitLabel(f: TypologyFit) {
  return `Typology fit: ${f.matched.length} of ${f.total} indicators${f.notCheckable.length ? ` (${f.notCheckable.length} not checkable)` : ''}`
}

/** Entities with at least one matched indicator for the lens. */
export function fittedEntityIds(c: CaseFile, t: TypologyDefinition) {
  return new Set(c.entities.filter((e) => typologyFit(e, c, t).matched.length > 0).map((e) => e.id))
}

export const INDICATOR_LABEL = (k: IndicatorKey) => INDICATORS[k].label
