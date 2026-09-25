/** Deprecated alias: use RiskBand from components/ui-kit (regulator prompt 21). */
import { RISK_META, RiskBand } from '@/components/ui-kit/RiskBand'

export const TIER_META = Object.fromEntries(
  Object.entries(RISK_META).map(([k, v]) => [k, { label: v.label, icon: v.icon, text: v.text, border: v.chip.split(' ').filter((c) => c.startsWith('border-')).join(' ') || 'border-border', fill: v.chip }]),
) as Record<keyof typeof RISK_META, { label: string; icon: (typeof RISK_META)['low']['icon']; text: string; border: string; fill: string }>

export const TierChip = RiskBand
