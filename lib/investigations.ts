import type { CaseIndexEntry, Investigation } from './types'
import cases from './generated/cases.json'

/** One case per risk typology, written by scripts/build_cases.py. */
export const CASES = cases as CaseIndexEntry[]

export type InvestigationId = string

// Swap this resolver for a real API endpoint later; UI components only consume the Investigation contract.
export function resolveInvestigationUrl(id: InvestigationId) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fixtures/${id}.json`
}

export async function fetchInvestigation(url: string): Promise<Investigation> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load investigation (${res.status})`)
  return res.json()
}
