# Research: primary sources, ground truth and citations

Owner: Domain & Evidence Curator (Teammate A). Research pass: 25 September 2026.

## Files

| File | What it is | Who uses it |
|---|---|---|
| [`sources.json`](sources.json) | Source registry: every citable record, with its URL, tier, record ID, retrieval time and whether the content was read | Everything cites an ID from here |
| [`ground_truth_entities.csv`](ground_truth_entities.csv) | The ground-truth sheet: entity, type, jurisdiction, identifiers, status, source URL, confidence | Schema freeze, fixture rebuild |
| [`evidence_ledger.csv`](evidence_ledger.csv) | One row per sourced fact or relationship, quoting what the source says and where | Edges, signals, narrative inputs |
| [`false_positive_log.csv`](false_positive_log.csv) | Name matches that looked like hits and weren't | Matching rules, demo talking points |
| [`citation_audit.md`](citation_audit.md) | What's wrong in the current fixtures and the replacement for each | Fixture owner |
| [`../config/narrative_templates.yaml`](../config/narrative_templates.yaml) | All executive-rationale, graph-caption and dossier copy, as templates | Renderer, frontend |
| [`../docs/narrative/`](../docs/narrative/) | Rendered Lead Dossiers for Serniya and Palantir | Demo, deck, judges |

## Citation protocol

This is the anti-hallucination rule in practice. It needs one named owner, who enforces it on every PR that touches fixtures or copy.

1. **Every fact cites a source ID from `sources.json`.** No URL goes straight into a fixture or template without going through the registry first.
2. **Only tier 1 or tier 2 sources can be cited.**
   - Tier 1 is the government or registry record itself: treasury.gov, justice.gov, bis.gov, federalregister.gov, usaspending.gov, sam.gov, sec.gov, Companies House.
   - Tier 2 is Sayari or OpenSanctions with a record ID. Corroborate these with tier 1 where possible.
   - Law firms, news and contract-data resellers are tier 3. Use them only to find leads.
3. **Cite the record, not the route to it.**
   - Not a search page, not a homepage, and not a URL carrying `utm_*`, `bm-verify`, session or token parameters.
   - Use the short canonical form where one exists, for example `https://www.federalregister.gov/d/2022-27347`.
4. **Record who published it separately from how it was fetched.** `retrieved_via: tavily` is the tool. `publisher: OFAC` is the source.
5. **Mark `content_verified: false`** when the page couldn't be read, for example because of a bot wall. That source can back a title or date but not a quoted sentence until a person reads it in a browser.
6. **Store the query for query-based sources** (USAspending API, Sayari searches), with the date. An absence claim ("no record found") is only as good as the query behind it.
7. **Run `python3 scripts/check_citations.py` before merging**, and add `--live` before the demo.

## Confidence grades

| Grade | Meaning |
|---|---|
| A | Tier-1 record retrieved and read in this pass, and it says exactly what the claim says |
| B | A tier-2 record with an ID, or a tier-1 record that couldn't be fully read (bot wall, JS-only page) |
| C | An aggregator risk flag not corroborated by any record (e.g. Sayari `formerly_sanctioned` on Sertal) |
| D | Tier-3 only. Never used as evidence |

## What this pass found (summary)

- **The public-dollar leg for Serniya:**
  - USAspending shows **no federal award** to any Serniya-network name or UEI (F31–F33).
  - OpenSanctions reports **SAM.gov exclusion records** with UEIs for Serniya, Photon Pro LLP and Grinin (F29–F30, grade B until checked on sam.gov).
- **Trade data exists** for Serniya in Sayari: 47 received shipments, plus Russian state contracts to supply Keithley (US-brand) test instruments (F34). This partly fills the fixture's "T = 0" gap.
- **Corrections:**
  - Puzyrnikova was not part of the Serniya action.
  - The Palantir BPA belongs to Palantir USG Inc.
  - Palantir trades on Nasdaq.
  - Advanced Web Services and Strandway are two companies, not one.
  - Several edges overstate the source (see `citation_audit.md`).
- **New primary sources** beyond OFAC, DOJ, BIS and SAM.gov:
  - Federal Register TDO and renewal (S08, S09)
  - Companies House officers, PSC and filing history (S12–S14)
  - OFAC 2026 removal notices (S03, S04)
  - USAspending API (S15, S33)
  - SEC EDGAR (S18)
  - DOL OFCCP (S19)
- **Control-case risk:** Sayari's watchlist puts Palantir two links from "sanctioned" parties via BlackRock and CT Corporation (F41). The Proximity signal must exclude registered agents and asset managers, or the control case fails.

## Tool status on 25 September 2026

| Tool | Status |
|---|---|
| Sayari MCP | Working. Used for entity resolution, identifiers, trade counts and watchlist screening |
| Tavily | Working. Blocked by justice.gov bot walls on some pages |
| Tradeverifyd MCP | **Failed to connect: HTTP 401, authorization header rejected.** Every trade-lane signal is "not assessable" until the token is fixed |
| USAspending API | Working, with intermittent 502/504s; retry with backoff |

## USAspending query log

All queries were `POST https://api.usaspending.gov/api/v2/search/spending_by_award_count/` with `time_period` 2007-10-01 to 2026-09-30, run on 25 September 2026.

| `recipient_search_text` | Result |
|---|---|
| FSY4LVSBGWB7 | 427 contracts, 36 IDVs |
| LF8MULLSH397, NYCYDYP1RNJ6, LFCWUP3KYVB3, LDF1QV5EN1V4, NVHSDQJ1DHM1 | 0 in every category |
| Serniya, Strandway, Advanced Web Services | 0 |
| Photon Pro, Majory, Invention Bridge, Sertal, Livshits | Hits, all unrelated recipients (see `false_positive_log.csv`) |

## Still to verify (needs a browser or a login)

- [ ] SAM.gov exclusion records for UEIs LF8MULLSH397, NYCYDYP1RNJ6 and LFCWUP3KYVB3 (sam.gov → Search → Exclusions).
- [ ] Exact Yermolenko plea date (S11), and the publication date of the sentencing release (S10).
- [ ] Body text of the DOJ indictment press release (S06).
- [ ] Photon Pro LLP disqualification details (S14), and its ceased-PSC history: did Grinin hold 75% until 21 March 2022? (F28)
- [ ] BIS Entity List date for Photon Pro (S09, footnote 4).
- [ ] Invention Bridge SL liquidation status in BORME (tier-3 lead only).
- [ ] Which UEI USAspending records order 19AQMM26F7166 against (S32).
- [ ] Each receiving Office of Inspector General's referral format, before anything is submitted (spec §4).
