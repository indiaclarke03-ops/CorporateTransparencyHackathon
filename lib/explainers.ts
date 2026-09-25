/**
 * "How to read this" content per view (regulator prompt 36). Static text is taken verbatim
 * from the prompt; "Key points in this case" are generated in lib/narrative.ts.
 * `swatch` names a legend renderer in components/explain/ViewGuide.tsx, which uses the same
 * ui-kit components as the charts.
 */
export type Swatch =
  | 'ribbon-width' | 'money-green' | 'certainty' | 'endpoint-groups'
  | 'risk-ring' | 'shield' | 'node-size' | 'line-ownership' | 'line-control' | 'arrow-goods' | 'payment' | 'line-sibling' | 'possible-match'
  | 'tier-columns' | 'card-outline' | 'hs-chip'
  | 'person-company' | 'end-cap' | 'loop'
  | 'lanes' | 'event-icons' | 'brackets'
  | 'money-shade' | 'disclosure-texture' | 'transshipment-marker'
  | 'fit-count' | 'unverified'

export type ViewKey = 'money' | 'network' | 'supply' | 'ownership' | 'timeline' | 'geography' | 'typologies'

export interface Explainer {
  title: string
  whatThisShows: string
  encodings: { swatch: Swatch; meaning: string }[]
  limitations: string
  tryThis: string
}

export const EXPLAINERS: Record<ViewKey, Explainer> = {
  money: {
    title: 'Money Trail',
    whatThisShows: 'How public money moved from the awarding agency through the recipient and its supply chain, and where it ended up.',
    encodings: [
      { swatch: 'ribbon-width', meaning: 'Ribbon width = observed dollars' },
      { swatch: 'money-green', meaning: 'Green = public money' },
      { swatch: 'certainty', meaning: 'Solid = documented, hatched = estimated, dotted = unknown' },
      { swatch: 'endpoint-groups', meaning: 'Endpoint groups sort money by what we found at the destination' },
    ],
    limitations: 'Shows recorded awards, subawards, and declared trade values only. Bank transfers and unreported payments are not visible. "Trail ends" means the records stop, not that nothing happened.',
    tryThis: 'Click the widest ribbon reaching a flagged endpoint to read its path step by step.',
  },
  network: {
    title: 'Network graph',
    whatThisShows: 'The companies and people connected to the award recipient, and how they are connected.',
    encodings: [
      { swatch: 'risk-ring', meaning: 'Node ring color = risk band' },
      { swatch: 'shield', meaning: 'Shield = on an official list' },
      { swatch: 'node-size', meaning: 'Node size = public dollars received' },
      { swatch: 'line-ownership', meaning: 'Solid line = ownership' },
      { swatch: 'line-control', meaning: 'Dashed = control' },
      { swatch: 'arrow-goods', meaning: 'Arrow = goods' },
      { swatch: 'payment', meaning: '"$" = payment' },
      { swatch: 'line-sibling', meaning: 'Dotted gray = shared owner only' },
      { swatch: 'possible-match', meaning: '"?" = possible identity match' },
    ],
    limitations: 'Connections come from registry and trade records. A connection is not evidence of wrongdoing, and "shared owner only" links carry no legal consequence on their own.',
    tryThis: 'Turn on "Show paths to listed parties".',
  },
  supply: {
    title: 'Supply Chain tiers',
    whatThisShows: 'Who supplies and buys from the recipient, tier by tier.',
    encodings: [
      { swatch: 'tier-columns', meaning: 'Columns = tiers away from the recipient' },
      { swatch: 'card-outline', meaning: 'Card outline = risk band' },
      { swatch: 'hs-chip', meaning: 'HS chips = product types traded' },
    ],
    limitations: 'Only trade captured in shipment records appears. Domestic trade and services are largely not visible.',
    tryThis: 'Filter to CHPL items only.',
  },
  ownership: {
    title: 'Ownership tree',
    whatThisShows: 'Who owns and controls the selected company, layer by layer.',
    encodings: [
      { swatch: 'person-company', meaning: 'People vs. companies shown with different icons' },
      { swatch: 'end-cap', meaning: '"No natural person identified" end cap = the ownership chain stops at a company' },
      { swatch: 'loop', meaning: 'Loop marker = circular ownership' },
    ],
    limitations: 'Registry coverage varies by jurisdiction; some registries do not publish owners at all.',
    tryThis: 'Check the aggregate listed-party ownership at the top.',
  },
  timeline: {
    title: 'Timeline',
    whatThisShows: 'The order in which key events happened.',
    encodings: [
      { swatch: 'lanes', meaning: 'Lanes = entities' },
      { swatch: 'event-icons', meaning: 'Icons = event types' },
      { swatch: 'brackets', meaning: 'Brackets = sequence patterns worth review' },
    ],
    limitations: 'Dates come from records and may reflect filing dates rather than when events actually occurred.',
    tryThis: 'Look for incorporation shortly before an award.',
  },
  geography: {
    title: 'Geography',
    whatThisShows: "Where money and risk are located, and how much each jurisdiction's public registry discloses.",
    encodings: [
      { swatch: 'money-shade', meaning: 'Green shading = public dollars' },
      { swatch: 'disclosure-texture', meaning: 'Textures = registry disclosure level' },
      { swatch: 'transshipment-marker', meaning: 'Hatched markers = transshipment points' },
    ],
    limitations: 'Jurisdiction of registration may differ from where a company actually operates.',
    tryThis: 'Switch to "disclosure level" to see where ownership data is thin.',
  },
  typologies: {
    title: 'Typologies',
    whatThisShows: 'How closely entities in this case match known risk patterns.',
    encodings: [
      { swatch: 'fit-count', meaning: '"X of Y indicators" = how many of the pattern\'s indicators were found' },
      { swatch: 'unverified', meaning: '"Unverified definition" = the pattern still needs a source' },
    ],
    limitations: 'A pattern match is a reason to review, not a conclusion. Unchecked indicators are not counted as matches or non-matches.',
    tryThis: 'Select a lens to highlight matching entities everywhere.',
  },
}
