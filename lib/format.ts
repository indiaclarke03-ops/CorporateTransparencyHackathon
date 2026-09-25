const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })

/** $1,234,567 by default; $1.2M with `compact`. */
export function formatUSD(value: number, opts: { compact?: boolean } = {}) {
  return (opts.compact ? usdCompact : usd).format(value)
}

/** 25 Sep 2026 from an ISO date or date-time. Returns the input unchanged if it is not a date. */
export function formatDate(value: string) {
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** 0.42 -> "42%"; values above 1 are treated as already in percent. */
export function formatPercent(value: number, digits = 0) {
  const pct = value > 1 ? value : value * 100
  return `${pct.toFixed(digits)}%`
}
