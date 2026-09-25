'use client'

import useSWR from 'swr'
import { DEMO_CASE, adaptInvestigation, resolveFixtureUrl, type CaseId } from './cases'
import type { CaseFile, Investigation } from './types'

async function loadCase(id: CaseId): Promise<CaseFile> {
  if (id === 'demo') return DEMO_CASE
  const res = await fetch(resolveFixtureUrl(id))
  if (!res.ok) throw new Error(`Could not load the ${id} case file (HTTP ${res.status}).`)
  return adaptInvestigation(id, (await res.json()) as Investigation)
}

/** Loads a case: the demo scenario from lib/mock, real cases from the audited fixtures. */
export function useCaseFile(id: CaseId) {
  return useSWR(id === '__none__' ? null : ['case', id], () => loadCase(id), { revalidateOnFocus: false, keepPreviousData: true })
}
