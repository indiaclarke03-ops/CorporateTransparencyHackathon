'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { CaseFile } from '@/lib/types'

const Ctx = createContext<CaseFile | null>(null)

export function CaseProvider({ value, children }: { value: CaseFile; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** The current case. Only use inside the workspace shell, which renders once the case loads. */
export function useCase(): CaseFile {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCase must be used inside the workspace shell')
  return c
}
