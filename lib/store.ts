'use client'

import { create } from 'zustand'

interface WorkspaceState {
  caseId: string
  selectedEntityId: string | null
  selectedEdgeId: string | null
  setCaseId: (id: string) => void
  setSelectedEntityId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  clearSelection: () => void
}

/** Selection is exclusive: choosing an entity clears the edge and vice versa. */
export const useWorkspace = create<WorkspaceState>((set) => ({
  caseId: 'demo',
  selectedEntityId: null,
  selectedEdgeId: null,
  setCaseId: (caseId) => set({ caseId, selectedEntityId: null, selectedEdgeId: null }),
  setSelectedEntityId: (selectedEntityId) => set({ selectedEntityId, selectedEdgeId: null }),
  setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId, selectedEntityId: null }),
  clearSelection: () => set({ selectedEntityId: null, selectedEdgeId: null }),
}))
