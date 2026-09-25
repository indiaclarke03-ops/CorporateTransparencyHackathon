/**
 * Plain-language glossary (regulator prompt 31). Every metric label and table header in the
 * UI must have an entry here; lib/glossary.test.ts fails otherwise.
 * `plain` is the Briefing-mode heading that replaces the technical term.
 */
export interface GlossaryEntry {
  term: string
  plain?: string
  definition: string
  whyItMatters: string
  source?: { label: string; url: string }
}

export const GLOSSARY = {
  risk_band: {
    term: 'Risk tier',
    plain: 'How concerning it looks',
    definition: 'High, Elevated or Low, set by how many independent families of warning signs fired and whether any is an anchor sign (spec 9.3).',
    whyItMatters: 'It orders leads for review. It is not a finding of wrongdoing.',
  },
  combined_score: {
    term: 'Combined risk score',
    plain: 'Risk score',
    definition: 'A 0 to 100 index built from transparent signals (spec 9.4). Weights are provisional until calibrated.',
    whyItMatters: 'It ranks entities within a case. Always read it with the signals that fired and its range.',
  },
  likelihood_range: {
    term: 'Range',
    definition: 'The lowest and highest the score could be if every signal that could not be checked were clear, or had fired.',
    whyItMatters: 'A wide range means much is unknown, so the point estimate deserves less weight.',
  },
  confidence: {
    term: 'Match grade',
    plain: 'How sure we are it is the same company',
    definition: 'A to D: how well records from different sources were matched to one entity (spec 7.1). A needs a shared unique identifier.',
    whyItMatters: 'Low grades can mean two different companies with similar names.',
  },
  coverage: {
    term: 'Coverage',
    plain: 'How much we could check',
    definition: 'The share of applicable signals that could actually be checked for this entity.',
    whyItMatters: 'Low coverage means the absence of flags says little.',
  },
  certainty: {
    term: 'Certainty',
    definition: 'Documented (read from a record), derived (calculated from documented values), estimated (modelled or declared) or unknown (not visible in available records).',
    whyItMatters: 'Tells you how much weight a number or link can bear in a referral.',
  },
  documented: { term: 'Documented', definition: 'Read directly from a government or registry record.', whyItMatters: 'Strongest basis; still check the record itself.' },
  derived: { term: 'Derived', definition: 'Calculated from documented values, for example a payment capped at what the payer received.', whyItMatters: 'As reliable as its inputs and the calculation.' },
  estimated: { term: 'Estimated', definition: 'Modelled or declared rather than recorded as paid, for example a declared shipment value or a risk-weighted figure.', whyItMatters: 'Useful for prioritizing, not for stating amounts as fact.' },
  unknown: { term: 'Unknown', definition: 'Not visible in available records.', whyItMatters: 'The absence of a record is not evidence that nothing happened.' },
  listed_status: {
    term: 'Listed status',
    plain: 'On a sanctions or export-control list?',
    definition: 'Whether the entity appears on an official list. Only US, UN, EU and UK lists count toward the score (spec 9.2).',
    whyItMatters: 'A listing is a public-record fact with legal consequences; other countries’ countermeasure lists are context only.',
  },
  fifty_percent_rule: {
    term: '50 Percent Rule',
    definition: 'OFAC treats an entity owned 50% or more in aggregate by blocked persons as blocked, even if it is not itself listed.',
    whyItMatters: 'Ownership, not control, triggers it. A listed director alone does not block a company.',
    source: { label: 'OFAC FAQs on the 50 Percent Rule', url: 'https://ofac.treasury.gov/faqs/topic/1521' },
  },
  chpl: {
    term: 'CHPL',
    plain: 'High-priority dual-use goods',
    definition: 'The Common High Priority List: HS codes for items Russia seeks for its weapons programs, published by BIS with partners.',
    whyItMatters: 'Trade in these goods through intermediaries is a key sanctions-evasion indicator.',
    source: { label: 'BIS Common High Priority Items List', url: 'https://www.bis.gov/licensing/country-guidance/common-high-priority-items-list-chpl' },
  },
  transshipment_point: {
    term: 'Transshipment point',
    definition: 'A country or hub where goods are routed on toward a restricted destination, as identified by FinCEN and BIS.',
    whyItMatters: 'Routing through these points is a common way to hide a final destination.',
    source: { label: 'FinCEN and BIS joint alert', url: 'https://www.fincen.gov/system/files/shared/FinCEN%20and%20BIS%20Joint%20Alert%20FINAL.pdf' },
  },
  pass_through: {
    term: 'Pass-through',
    plain: 'Money passed straight on',
    definition: 'A recipient that passes most of what it receives straight on to others.',
    whyItMatters: 'Can indicate a front that adds no real work between the payer and the final party.',
  },
  dwell_time: {
    term: 'Dwell time',
    definition: 'How long goods stay with an intermediary before moving on.',
    whyItMatters: 'Very short dwell times suggest the intermediary only relabels or re-exports.',
  },
  phoenix_linkage: {
    term: 'Phoenix linkage',
    plain: 'New company replacing a closed one',
    definition: 'A new entity that shares officers, owners or addresses with a closed, previously flagged entity.',
    whyItMatters: 'A common way to continue a business after enforcement or debarment.',
  },
  beneficial_owner: {
    term: 'Beneficial owner',
    plain: 'Who ultimately owns it',
    definition: 'The natural person who ultimately owns or controls a company, however many layers sit in between.',
    whyItMatters: 'Shells hide beneficial owners behind layers of companies.',
  },
  legal_person: { term: 'Legal person', plain: 'A company or organisation', definition: 'A company, partnership, trust or other organisation that can own things in its own name.', whyItMatters: 'Ownership chains that end at a legal person have not reached a real owner.' },
  natural_person: { term: 'Natural person', plain: 'A human being', definition: 'An individual human, as opposed to a company.', whyItMatters: 'Beneficial-ownership rules look for the natural person at the top of the chain.' },
  typology_fit: {
    term: 'Typology fit',
    plain: 'Pattern match',
    definition: 'How many of a known risk pattern’s indicators were found, shown as "X of Y indicators".',
    whyItMatters: 'A fit is a reason to review, not a conclusion. Unchecked indicators count as neither match nor non-match.',
  },
  trail_ends: {
    term: 'Trail ends',
    plain: 'Where the records stop',
    definition: 'Public dollars whose next step is not visible in available records.',
    whyItMatters: 'It means the records stop, not that nothing happened.',
  },
  observed_flows: {
    term: 'Observed flows',
    plain: 'Payments we can see',
    definition: 'Recorded subawards and purchases, each capped at what the payer received.',
    whyItMatters: 'Bank transfers and unreported payments are not visible, so this is a floor, not a total.',
  },
  risk_weighted_exposure: {
    term: 'Estimated risk-weighted exposure',
    plain: 'Money at risk (estimate)',
    definition: 'Observed dollars at each entity multiplied by its combined score, with a range for unchecked signals.',
    whyItMatters: 'Ranks where attention matters most. It is never "money lost" or "money diverted".',
  },
  listed_party_exposure: {
    term: 'Listed-party exposure',
    plain: 'Money reaching listed parties',
    definition: 'Unweighted observed dollars reaching entities on a US, UN, EU or UK list.',
    whyItMatters: 'Reported separately as a priority item because listings carry legal consequences.',
  },
  award: { term: 'Award', definition: 'A federal contract, grant or loan recorded in USAspending.gov.', whyItMatters: 'The starting point of every money trail.' },
  tier: { term: 'Tier', plain: 'Steps from the recipient', definition: 'How many payments or trade links an entity sits from the award recipient.', whyItMatters: 'Risk several tiers down is harder to see and to attribute.' },
  signal_state: {
    term: 'Signal state',
    definition: 'Fired (the warning sign was found), Not fired (checked and not found) or Not assessable (could not be checked).',
    whyItMatters: 'Not assessable is not the same as clear.',
  },
  attribution: {
    term: 'Attribution',
    plain: 'Who is behind it',
    definition: 'The evidence-based judgement of who operates a company, ranked Documented, High, Probable, Possible or Unattributed.',
    whyItMatters: 'Conflicting candidates are shown side by side and never merged.',
  },
  disclosure_level: {
    term: 'Registry disclosure',
    plain: 'How much the registry shows',
    definition: 'How much a jurisdiction’s public registry reveals about owners: fully disclosed, partial or opaque.',
    whyItMatters: 'Thin registries make ownership chains end early.',
  },
} satisfies Record<string, GlossaryEntry>

export type GlossaryKey = keyof typeof GLOSSARY

export function glossary(key: GlossaryKey): GlossaryEntry {
  return GLOSSARY[key]
}
