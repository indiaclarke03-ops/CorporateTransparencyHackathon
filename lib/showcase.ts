// Typed access to lib/generated/showcase.json, which scripts/build_showcase.py builds from the
// repo's research, config and docs. Re-run that script after changing any of them.
import raw from './generated/showcase.json'

export interface CheckerFinding { level: string; message: string }
export interface Source {
  id: string; name: string; publisher?: string | null; published?: string | null; record_id?: string | null
  url: string; tier: number; retrieved_at?: string | null; retrieved_via?: string | null
  content_verified?: boolean | null; note?: string | null; checker: CheckerFinding[]
}
export type Row = Record<string, string>
export interface CitationItem {
  where: string; claim: string; url: string | null; source_id?: string | null; authority?: string | null
  errors: string[]; warnings: string[]
}
export interface CitationSide { items: CitationItem[]; errors: number; warnings: number }
export interface MapNeed { section: string; need: string; tool: string; status: string; bucket: string }
export interface RegistryTool { tool: string; backed_by: string; returns: string; status: string }
export interface BacklogItem { id: string; item: string; status: string }
export interface DatasetPlanRow { n: string; dataset: string; grain: string; status: string }
export interface ToolTotal { planned: number; estimated: number; budget: number | null; daily_limit: number | null }
export interface Typology { seed_count: number; filters: Record<string, unknown>; why: string }
export interface ReplayDataset {
  dataset: string; status: string; rows: number; missing_source_record: number; gap_rows: number
  duplicate_rows: number; with_source_record: number; grades: Record<string, number>
  nulls: { field: string; reason: string; rows: number }[]; reason?: string | null
}
export type DossierBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph' | 'notice'; text: string }
  | { type: 'footnote'; id: string; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; columns: string[]; rows: string[][] }
export interface Dossier { blocks: DossierBlock[]; rationale: { text: string; cite: string[] }[]; skipped_templates: unknown[] }

export interface Showcase {
  generated_at: string
  commit: string
  sources: Source[]
  tier3: { url: string; note: string }[]
  ledger: Row[]
  entities: Row[]
  false_positives: Row[]
  citation_audit: {
    fixtures: Record<string, { before: CitationSide | null; after: CitationSide }>
    tables: { heading: string | null; columns: string[]; rows: Row[] }[]
  }
  data_source_map: {
    needs: MapNeed[]; status_counts: Record<string, number>; registry: RegistryTool[]
    backlog: BacklogItem[]; sayari_coverage: Row[]
  }
  datasets: DatasetPlanRow[]
  dry_run: {
    per_dataset: { dataset: string; blocked?: string | null; tools: Record<string, number> }[]
    totals: Record<string, ToolTotal>
    pilot_size: number
    typologies: Record<string, Typology>
    date_range: { start_date: string; end_date: string }
  }
  replay: { run_id: string; datasets: ReplayDataset[]; missing_source_record_total: number } | null
  dossiers: Record<string, Dossier>
  recorded_fixtures: { source: string; operation: string; retrieved_at: string; response_hash: string; vendor_record_ids: string[]; file: string }[]
  vendor_docs: { sayari_paths: number; sayari_endpoints: number; tradeverifyd_tools: number; files: string[] }
  tests: Record<string, number>
  chain: {
    sentence: string; template: string; footnotes: string[]; sources: Source[]
    ledger_fact: Row | null; entity: Row | null
    fixture_signal: { signal_name: string; evidence_record: string; source_id?: string; source_authority?: string; provenance_source: string }
  }
}

export const showcase = raw as unknown as Showcase

export const sourceById = (id: string) => showcase.sources.find((s) => s.id === id)

export function hostOf(url: string | null | undefined) {
  if (!url) return ''
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}
