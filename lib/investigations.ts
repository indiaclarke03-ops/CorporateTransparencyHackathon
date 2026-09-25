import type { Investigation } from './types'

export const INVESTIGATION_OPTIONS = [
  { id: 'serniya', label: 'Serniya Engineering (high-risk)' },
  { id: 'palantir', label: 'Palantir Technologies (clean control)' },
] as const

export type InvestigationId = (typeof INVESTIGATION_OPTIONS)[number]['id']

// Swap this resolver for a real API endpoint later; UI components only consume the Investigation contract.
export function resolveInvestigationUrl(id: InvestigationId) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fixtures/${id}.json`
}

export async function fetchInvestigation(url: string): Promise<Investigation> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load investigation (${res.status})`)
  return res.json()
}
