'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { EntityPanel } from '@/components/entity/EntityPanel'
import { GuidedTour } from '@/components/explain/GuidedTour'
import { PathStorySheet } from '@/components/money/PathStory'
import { EdgePanel } from '@/components/network/EdgePanel'
import { PresentationMode } from '@/components/present/PresentationMode'
import { CertaintyDefs } from '@/components/ui-kit/CertaintyMark'
import { generateAlerts } from '@/lib/alerts'
import { CASE_OPTIONS } from '@/lib/cases'
import { useWorkspace } from '@/lib/store'
import { fittedEntityIds, typologyById } from '@/lib/typologies'
import { useCaseFile } from '@/lib/use-case'
import { CaseProvider } from './CaseContext'
import { ShellTopBar } from './ShellTopBar'
import { Shortcuts } from './Shortcuts'
import { Sidebar } from './Sidebar'

/**
 * Workspace shell (regulator prompts 11, 22): question-led sidebar, top bar, the current case,
 * and the panels that must persist across sections. Renders the case only after mount, because
 * the chosen case and preferences come from localStorage.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const { caseId, setCaseId, density, presenting, tourStep, lens } = useWorkspace()

  useEffect(() => {
    setMounted(true)
    const fromUrl = new URLSearchParams(window.location.search).get('case')
    if (fromUrl && CASE_OPTIONS.some((c) => c.id === fromUrl)) setCaseId(fromUrl)
    else if (!CASE_OPTIONS.some((c) => c.id === useWorkspace.getState().caseId)) setCaseId('demo')
  }, [setCaseId])

  useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])

  const { data: caseFile, error, isLoading } = useCaseFile(mounted ? caseId : '__none__')

  const counts = useMemo(() => {
    if (!caseFile) return {}
    const lensT = typologyById(lens)
    return {
      entities: caseFile.entities.length,
      review: generateAlerts(caseFile).length,
      typologies: lensT ? fittedEntityIds(caseFile, lensT).size : undefined,
    }
  }, [caseFile, lens])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-1 focus:text-paper">
        Skip to content
      </a>
      <ShellTopBar onHelp={() => setHelpOpen(true)} />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar counts={counts} />
        <main id="main" className="min-w-0 flex-1 p-4 md:p-6">
          {!mounted || (isLoading && !caseFile) ? (
            <ShellSkeleton />
          ) : error ? (
            <div role="alert" className="flex max-w-xl flex-col gap-2 rounded-md border border-risk-red p-4 text-sm">
              <p className="font-semibold">This case file could not be loaded.</p>
              <p className="text-muted-foreground">{error.message}</p>
              <button type="button" onClick={() => setCaseId('demo')} className="w-fit rounded-md bg-ink px-3 py-1.5 font-semibold text-paper">
                Open the demo case instead
              </button>
            </div>
          ) : caseFile ? (
            <CaseProvider value={caseFile}>
              {children}
              <EntityPanel caseFile={caseFile} />
              <EdgePanel caseFile={caseFile} />
              <PathStorySheet />
              {presenting && <PresentationMode />}
              {tourStep !== null && <GuidedTour />}
            </CaseProvider>
          ) : null}
        </main>
      </div>
      <CertaintyDefs />
      <Shortcuts helpOpen={helpOpen} setHelpOpen={setHelpOpen} />
    </div>
  )
}

function ShellSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Loading the case file…
      </p>
      <div className="h-7 w-2/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  )
}
