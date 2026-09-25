'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Density = 'briefing' | 'analyst'
export type Disposition = 'no_further_action' | 'monitor' | 'refer' | 'escalate'

export interface DispositionRecord {
  itemId: string
  disposition: Disposition
  reason: string
  reviewer: string
  at: string
}

export interface PacketItem {
  kind: 'path' | 'entity' | 'evidence'
  id: string
  caseId: string
  label: string
}

interface WorkspaceState {
  caseId: string
  selectedEntityId: string | null
  selectedEdgeId: string | null
  density: Density
  /** Active typology lens id, or null */
  lens: string | null
  /** Highlighted ids from a "Show me" action (entities, edges or flow ids) */
  highlight: string[]
  tourStep: number | null
  presenting: boolean
  /** Path id open in the Path Story panel */
  storyPathId: string | null
  dispositions: DispositionRecord[]
  packet: PacketItem[]
  setCaseId: (id: string) => void
  setSelectedEntityId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  clearSelection: () => void
  setDensity: (d: Density) => void
  setLens: (id: string | null) => void
  setHighlight: (ids: string[]) => void
  setTourStep: (n: number | null) => void
  setPresenting: (on: boolean) => void
  setStoryPathId: (id: string | null) => void
  addDisposition: (r: DispositionRecord) => void
  togglePacketItem: (item: PacketItem) => void
  clearPacket: () => void
}

/** Workspace state. Selection is exclusive; preferences, reviews and the packet persist locally. */
export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      caseId: 'demo',
      selectedEntityId: null,
      selectedEdgeId: null,
      density: 'briefing',
      lens: null,
      highlight: [],
      tourStep: null,
      presenting: false,
      storyPathId: null,
      dispositions: [],
      packet: [],
      setCaseId: (caseId) => set({ caseId, selectedEntityId: null, selectedEdgeId: null, highlight: [], storyPathId: null }),
      setSelectedEntityId: (selectedEntityId) => set({ selectedEntityId, selectedEdgeId: null, storyPathId: null }),
      setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId, selectedEntityId: null, storyPathId: null }),
      clearSelection: () => set({ selectedEntityId: null, selectedEdgeId: null, storyPathId: null }),
      setDensity: (density) => set({ density }),
      setLens: (lens) => set({ lens }),
      setHighlight: (highlight) => set({ highlight }),
      setTourStep: (tourStep) => set({ tourStep }),
      setPresenting: (presenting) => set({ presenting }),
      setStoryPathId: (storyPathId) => set({ storyPathId, selectedEntityId: null, selectedEdgeId: null }),
      addDisposition: (r) => set((s) => ({ dispositions: [...s.dispositions, r] })),
      togglePacketItem: (item) =>
        set((s) => ({
          packet: s.packet.some((p) => p.kind === item.kind && p.id === item.id && p.caseId === item.caseId)
            ? s.packet.filter((p) => !(p.kind === item.kind && p.id === item.id && p.caseId === item.caseId))
            : [...s.packet, item],
        })),
      clearPacket: () => set({ packet: [] }),
    }),
    {
      name: 'ftpd-workspace',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ caseId: s.caseId, density: s.density, lens: s.lens, tourStep: s.tourStep, dispositions: s.dispositions, packet: s.packet }),
    },
  ),
)
