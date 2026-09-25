# Datasets

The datasets the repo needs, what builds each one, and what is still blocked. Written for Task 2a. Nothing here has been built yet.

Rules used:
- A dataset appears only if a repo file needs it. The **Needed by** line quotes the file and heading.
- **Built from** uses only rows marked Confirmed or Pilot in `docs/data-source-map.md`.
- **Fields** lists only field names confirmed in `docs/vendor/` or `fixtures/recorded/`. Anything else is marked `UNCONFIRMED`.
- Every row keeps a `source_record_id` pointing to the stored raw response (spec §5.1). The field lists below leave it out to save space.
- Missing data is stored as null with a reason ("no record returned", "source unavailable", "blocked: B1"), never as zero or empty text.

## Blockers that affect many datasets

| ID | Blocker | Effect |
|---|---|---|
| **B25** *(new)* | **Sayari REST API credentials** (`client_id` / `client_secret`) have not been issued (`docs/planning_doc.md` §5). The Sayari connector works, but the build jobs call the REST API through the adapters | Every Sayari dataset can be built **in replay mode** from `fixtures/recorded/` and new recordings, but not live |
| B1 | Mostly resolved 25 Sep: Tradeverifyd is MCP-only; tools confirmed live. Still open: rate limits, score scale, licensing | Tradeverifyd datasets can be built through an MCP adapter; fields beyond the recorded ones stay `UNCONFIRMED` |
| B22 | SAM.gov: 10 requests per day without a SAM.gov role | SAM API calls capped at 5 seed companies per day |
| B14 | How Sayari exposes PPP, SBA and USAspending record values | PPP and SBA rows in `public_money` |

## Summary

| # | Dataset | Grain | Status |
|---|---|---|---|
| 0 | `source_records` | One raw response | Ready (foundation for everything) |
| 1 | `seed_awards` | One federal award or PPP loan in a seed typology | Ready (seed defined in `config/datasets.yaml`) |
| 2 | `award_competition` *(new)* | One award checked for competition | Ready |
| 3 | `subawards` *(new)* | One reported first-tier subaward | Ready |
| 4 | `entities` | One resolved company or person | Partly blocked (B25) |
| 5 | `entity_members` *(new)* | One vendor record merged into an entity, with its grade | Partly blocked (B25) |
| 6 | `entity_identifiers` | One identifier | Partly blocked (B25, B22) |
| 7 | `public_money` | One award, loan or exclusion linked to an entity | Partly blocked (B14, B22) |
| 8 | `ownership_edges` | One ownership link | Partly blocked (B25) |
| 9 | `network_edges` | One officer or linked-entity relationship, within 2 hops | Partly blocked (B25) |
| 10 | `listed_party_paths` | One path to a listed party, per `psa` run | Partly blocked (B25) |
| 11 | `trade_edges` | One shipment or trade relationship | Partly blocked (B25) |
| 12 | `web_presence` | One search result per entity | Ready |
| 13 | `news_items` | One news item, with lane | Ready |
| 14 | `official_list_entries` *(new)* | One Consolidated Screening List entry per daily snapshot | Ready |
| 15 | `spending_trends` *(new)* | One period × sector aggregate | Ready |
| 16 | `reference_lists` *(new)* | One risk-factor definition, source, or high-priority HS code | Partly blocked (B25 for the Sayari parts) |
| 17 | `tradeverifyd_annotations` | One annotation per entity | Ready (MCP) |
| 18 | `tradeverifyd_trade` | One Tradeverifyd trade relationship or path hop | Ready (MCP); relationship item fields to record |
| 19 | `address_clusters` | One normalized address | Partly blocked (B21, B27) |
| 20 | `signals` | One entity × one signal code | Derived |
| 21 | `assessments` *(new)* | One entity × one config version | Derived |
| 22 | `backtest_candidates` | One candidate enforcement case | Partly blocked (B25, B26) |
| 23 | `false_positive_sample` | One randomly sampled ordinary contractor | Ready (30 candidates already drawn) |

---

## 0. `source_records`

- **Needed by:** spec §2 "Accuracy principles": "1. **Provenance on every fact.** Every value … links to a stored source record"; spec §5.1 "Adapter contract"; spec §8.4 "9. Sources appendix".
- **Built from:** every adapter call.
- **Fields:** `id`, `source_name`, `operation`, `request_params`, `retrieved_at`, `http_status`, `response_hash`, `raw_response`, `vendor_record_ids`, `license_tag` (spec §5.1).
- **Grain:** one stored raw response.
- **Refresh:** written on every call; never overwritten.
- **Status:** ready. Stays in PostgreSQL and `data/`, never in Git (Task 2e).

## 1. `seed_awards`

- **Needed by:** spec §1.1 "The question it answers" ("starts from public money"); spec §13 demo path ("pick one federal contractor, show its award"); `docs/call-budget.md` step 3.
- **Built from:** USAspending `POST /api/v2/search/spending_by_award/` (map Q1 row 1, Confirmed), filtered by the seed's `naics_codes` / `psc_codes` / `agencies` and `time_period`. Used only to choose which companies to investigate.
- **Fields:** `Award ID`, `Recipient Name`, `Recipient UEI`, `Award Amount`, `Awarding Agency`, `Start Date`, `End Date`, `NAICS`, `PSC`, `generated_internal_id`.
- **Grain:** one award in the seed sector and date range.
- **Refresh:** per build run.
- **Status:** ready. The seed is defined in `config/datasets.yaml`: 25 pilot companies across the seven typologies in `config/typologies.yaml`, FY2020–FY2026. Every filter code was checked against live USAspending data. PPP loan rows (assistance listing 59.073) come back without a Recipient UEI, so pandemic seeds match at grade B at most.

## 2. `award_competition` *(new)*

- **Needed by:** spec §9.1 "PM3 Non-competitive award | Sole-source award to a young or thin company | USAspending".
- **Built from:** USAspending `GET /api/v2/awards/{award_id}/` (map Q1 row 2, Confirmed), for the `K` largest awards per seed company (`docs/call-budget.md` step 4).
- **Fields:** under `latest_transaction_contract_data`: `extent_competed`, `extent_competed_description`, `number_of_offers_received`, `solicitation_procedures`, `solicitation_procedures_description`, `other_than_full_and_open`, `other_than_full_and_open_description`.
- **Grain:** one award.
- **Refresh:** per build run.
- **Status:** ready. The fields are null on some IDVs and BPAs; store null with the reason "not reported for this award type" (PM3 then not assessable).

## 3. `subawards` *(new)*

- **Needed by:** spec §9.1 "PM4 Pass-through | Prime passes most of the award to subawardees | USAspending subawards"; archived spec §8.2 "Flow-through" exposure.
- **Built from:** USAspending `POST /api/v2/search/spending_by_award/` with `"subawards": true` (map Q1 row 3, Confirmed).
- **Fields:** `Sub-Award ID`, `Sub-Award Amount`, `Sub-Award Date`, `Sub-Awardee Name`, `Sub-Recipient UEI`, `Prime Award ID`, `Prime Award Recipient UEI`.
- **Grain:** one reported first-tier subaward.
- **Refresh:** per build run.
- **Status:** ready. Coverage limit, to be stated in reports: only subawards of $40,000 or more (contracts) or $30,000 or more (grants) must be reported.

## 4. `entities`

- **Needed by:** spec §6 "Data model" (`entities`); spec §8.3 "1. **Identity.**"; `docs/narrative-copy-spec.md` §4 "3. Identity"; `scoring/engine.py` `SayariPassThrough`.
- **Built from:** Sayari `GET /v1/resolution` or `GET /v1/search/entity`, then `GET /v1/entity/{id}` for seeds and `GET /v1/entity_summary/{id}` for connected companies (map Q8, Q2; tool registry `resolve_entity`, `entity_profile`, `entity_summary`).
- **Fields:** `id`, `label`, `translated_label`, `type`, `countries`, `addresses`, `registration_date`, `latest_status`, `closed`, `sanctioned`, `pep`, `risk`, `degree`, `relationship_count`, `psa_count`, `trade_count`, `company_type`, `attributes.business_purpose`, `attributes.name`. Plus `is_seed` (true for the searched company, false for connected ones).
- **Grain:** one resolved company or person, after merging grade A members.
- **Refresh:** per build run.
- **Status:** partly blocked on B25. The 17 Appendix A entities can be built now from `fixtures/recorded/sayari/` (connector shape; B18).

## 5. `entity_members` *(new)*

- **Needed by:** spec §6 (`entity_members` … `match_grade (A–D), match_keys`); spec §7.1 "Match grades (A–D)"; spec §12.1 resolution tests on Appendix A.
- **Built from:** the same Sayari calls as `entities`, plus `possibly_same_as` on the entity profile (map Q5, Confirmed).
- **Fields:** `entity_id`, `vendor`, `vendor_entity_id`, `match_grade`, `match_keys` (Sayari `possibly_same_as[].match_keys`: `key`, `normalized`, `original`), `psa_id`.
- **Grain:** one vendor record linked to an entity, with its grade.
- **Refresh:** per build run; analyst merge decisions are kept.
- **Status:** partly blocked on B25. The Appendix A expected grades (spec Appendix A) are the test oracle.

## 6. `entity_identifiers`

- **Needed by:** spec §6 (`entity_identifiers`); spec §7.1 grade A rule; `docs/narrative-copy-spec.md` §4 cover "Identifiers".
- **Built from:** Sayari entity profile `identifiers` (`IdentifierType` enum, Confirmed); SAM.gov Entity API v4 `ueiSAM`, `cageCode` (Confirmed); GLEIF `GET /api/v1/lei-records/{lei}` when an LEI is present (Pilot).
- **Fields:** `entity_id`, `scheme` (Sayari identifier `type`, e.g. `usa_sam_uei_number`, `usa_sam_exclusions_number`, `cage`, `lei`, `usa_ofac_sdn_number`, `uk_company_number`), `value`, `is_weak` (from Sayari `WeakIdentifierType`; B9).
- **Grain:** one identifier on one entity.
- **Refresh:** per build run.
- **Status:** partly blocked on B25 (Sayari) and B22 (SAM.gov daily limit).

## 7. `public_money`

- **Needed by:** spec §6 (`public_money_records`); spec §8.3 "2. **Public money.**"; spec §9.1 PM1, PM2, PM6; `docs/narrative-copy-spec.md` §2 sentence 1 (`award_count`, `total_obligated`, `agency_list`, `first_award_date`, `last_award_date`) and §4 section 4.
- **Built from:**
  - Contracts: USAspending award search by UEI (Confirmed), cross-checked with Sayari's "USA USASpending.gov Profiles Database" source (Pilot).
  - Exclusions: SAM.gov Exclusions API v4 (Confirmed), with Sayari "USA SAM.gov Entity Exclusions Database" (Pilot).
  - PPP and SBA loans: Sayari PPP and "SBA 504 and 7(a)" sources (Pilot, fields unconfirmed).
- **Fields:**
  - Contracts: as in `seed_awards`.
  - Exclusions: `ueiSAM`, `exclusionType`, `exclusionProgram`, `excludingAgencyName`, `classificationType`, `activateDate`, `terminationDate`.
  - Loans: amount, lender, date `UNCONFIRMED` (B14).
  - Every row: `program` (contract, exclusion, PPP, SBA loan) and `sam_dataset` (registration or exclusion), per spec §8.3 "with dataset clearly labeled".
- **Grain:** one award, loan, or exclusion record linked to one entity.
- **Refresh:** per build run.
- **Status:** partly blocked (loans on B14; SAM.gov calls on B22).

## 8. `ownership_edges`

- **Needed by:** spec §8.3 "4. **Ownership.**"; spec §9.1 ST1, ST2, PX3; `docs/tracing_methodology.md` §1 (50% rule propagation); narrative `listed_share.px3` (`combined_share`).
- **Built from:** Sayari `GET /v1/ubo/{id}` and `GET /v1/downstream/{id}` with `psa=false` (map Q2, Confirmed).
- **Fields:** `source`, `target`, `path` (hops), relationship type (`has_shareholder`, `shareholder_of`, `has_beneficial_owner`, `beneficial_owner_of`, `has_owner`, `owner_of`, `subsidiary_of`, `has_subsidiary`), `former`, share percentage from the `shares` attribute (position inside a hop `UNCONFIRMED` until a REST response is recorded), `hop`, `ends_at_legal_person`.
- **Grain:** one ownership link between two entities.
- **Refresh:** per build run.
- **Status:** partly blocked on B25.

## 9. `network_edges`

- **Needed by:** spec §8.3 "5. **Network.**"; spec §9.1 ST3, LC4, PM5; `docs/tracing_methodology.md` §2–3 (shared officers, registered agents); `docs/call-budget.md` step 10.
- **Built from:** Sayari `GET /v1/traversal/{id}` with `psa=false`, `max_depth=2` (map Q5, Confirmed).
- **Fields:** `source`, `target`, `path`, relationship type (including `has_officer`, `has_director`, `has_manager`, `has_legal_representative`, `has_registered_agent`, `registered_agent_of`, `linked_to`), `position` attribute (officer title), `former`, `hop`.
- **Grain:** one relationship within 2 hops of a seed.
- **Refresh:** per build run.
- **Status:** partly blocked on B25. The recorded AZ Gold profiles already contain one-hop relationships with `position`.

## 10. `listed_party_paths`

- **Needed by:** spec §8.3 "7. **Paths to flagged parties.**"; spec §9.1 PX2; spec §9.2 ("'Possibly same as' flags produce a separate, visible note"); narrative `strongest.proximity` (`list_name`, `hop_count`, `path_summary`); data-source map Q4 "Important setting".
- **Built from:** Sayari `GET /v1/watchlist/{id}`, run twice (`psa=false` for scoring, `psa=true` for labeling), plus `GET /v1/shortest_path` per listed party found (Confirmed).
- **Fields:** `source`, `target`, `path`, `psa_run` (false or true), `depends_on_psa` (true if the path appears only in the `psa=true` run), `partial_results`, `explored_count`, `excluded_reason` (registered agent or asset manager on the path; map Q4 "Exclusions for proximity").
- **Grain:** one path to a listed party, per run.
- **Refresh:** per build run.
- **Status:** partly blocked on B25. Only the REST API has the `psa` setting; the connector does not (B18).

## 11. `trade_edges`

- **Needed by:** spec §8.3 "6. **Supply chain.**"; spec §9.1 TR1–TR4; `docs/narrative-copy-spec.md` §3.4 "Supply chain".
- **Built from:** Sayari `POST /v1/trade/search/shipments` (by `supplier_id` and by `buyer_id`) and `GET /v1/supply_chain/upstream/{id}` (map Q3, Confirmed).
- **Fields:** `id`, `departure_date`, `arrival_date`, `departure_country`, `arrival_country`, `transit_country`, `hs_codes`, `product_descriptions`, `product_origin`, `weight`, `monetary_value`, `supplier`, `buyer`, `sources`, `record`, `direction` (supplier or buyer, relative to the seed).
- **Grain:** one shipment record, or one upstream supplier link.
- **Refresh:** per build run.
- **Status:** partly blocked on B25. Where no trade data exists, store "no trade records returned" so the UI can say "no trade data available" (spec §3.2).

## 12. `web_presence`

- **Needed by:** spec §8.3 "8. **Web presence.**"; spec §9.1 PR1, PR2, LO2; spec §9.2 ("PR1 requires that the Tavily search was actually run").
- **Built from:** Tavily `POST /search`, `topic: general` for the company and for its address (map Q2 Presence, Confirmed).
- **Fields:** `url`, `title`, `content`, `score`, `favicon`, `query`, `result_type` (official site, registry or aggregator, media; set by config rules), `publisher` (derived from the URL domain, since Tavily returns none; B15).
- **Grain:** one search result for one entity and one query.
- **Refresh:** per build run.
- **Status:** ready. A search that errors is stored as "source unavailable", which makes PR1 not assessable.

## 13. `news_items`

- **Needed by:** spec §8.2 "News feed" (two lanes); spec §6 (`news_items`).
- **Built from:**
  - Official lane: Federal Register `GET /api/v1/documents.json` with `conditions[agencies][]` (Pilot), plus daily list changes from `official_list_entries`.
  - Media lane: Tavily `POST /search`, `topic: news` (Confirmed), using `config/news_topics.yaml`.
- **Fields:**
  - Federal Register: `document_number`, `type`, `title`, `publication_date`, `html_url`, `pdf_url`, `agencies`, `abstract`.
  - Tavily: `url`, `title`, `published_date` (Tavily's estimate; labeled as such, B15), `publisher` (from domain).
  - Every row: `lane`, `matched_rules`, `linked_entity_id` (only for grade A or B mentions).
- **Grain:** one news item in one lane.
- **Refresh:** scheduled (spec §8.2 "Refresh runs on a schedule"). Proposed: Federal Register daily; Tavily news every 6 hours.
- **Status:** ready.

## 14. `official_list_entries` *(new)*

- **Needed by:** spec §9.1 PX1 ("Sayari, OFAC, BIS, UFLPA"); spec §8.2 "OFAC list changes, detected by comparing successive official list downloads"; narrative evidence templates `list_designation`, `list_removal` (designation and removal dates).
- **Built from:** Consolidated Screening List daily download `https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json` (map Q4, Confirmed; no key).
- **Fields:** `_id`, `source`, `entity_number`, `type`, `programs`, `name`, `alt_names`, `addresses`, `ids`, `federal_register_notice`, `start_date`, `end_date`, `source_list_url`, `source_information_url`, plus `snapshot_date`.
- **Grain:** one list entry in one daily snapshot. Diffs between snapshots give additions and removals.
- **Refresh:** daily, after 5:00 AM ET.
- **Status:** ready. OFAC's own download (B4) can replace or supplement it later.

## 15. `spending_trends` *(new)*

- **Needed by:** spec §8.1 "Federal spending in watched sectors"; `docs/narrative-copy-spec.md` §3.6 dashboard captions.
- **Built from:** USAspending `POST /api/v2/search/spending_over_time/` (map Q7, Confirmed).
- **Fields:** `time_period`, `aggregated_amount`, plus the `group` and filter used (sector codes from config).
- **Grain:** one period (month or fiscal year) for one watched sector.
- **Refresh:** weekly.
- **Status:** ready, once the watched sectors are set (spec §14 "Decide the configured NAICS or PSC codes"; Task 2b).

## 16. `reference_lists` *(new)*

- **Needed by:** spec §5.3 ("Sayari risk flags are displayed with the definition returned by the risk-factor lookup"); spec §5.2 "Data source catalog"; spec §9.1 TR2 ("HS codes on the multilateral Common High Priority List").
- **Built from:** Sayari `GET /v1/ontology/risk_factors` and `GET /v1/ontology/sources` (Confirmed); the BIS Common High Priority Items List page (`docs/vendor/bis/`, Confirmed).
- **Fields:**
  - Risk factors: `id`, `label`, `description`, `categories`, `level`, `risk_type`, `enabled`, `visible`.
  - Sources: `id`, `label`, `description`, `country`, `region`, `source_type`, `record_type`, `source_url`, `watchlist`, `pep`, `date_added`.
  - CHPL: `hs_code`, `tier`, `description`.
- **Grain:** one reference item.
- **Refresh:** monthly, or when a flag or source appears that isn't in the table.
- **Status:** CHPL ready (version date unconfirmed, B5); Sayari parts partly blocked on B25. The connector's live source catalogue already confirmed the 17 US sources.

## 17. `tradeverifyd_annotations`

- **Needed by:** spec §5.2 Tradeverifyd "Entity annotations"; spec §9.1 PX2 ("Sayari, Tradeverifyd"); spec §9.4 `T_Tradeverifyd`.
- **Built from:** Tradeverifyd MCP `search_entities` (annotation counts), `entity_annotations`, `entity_score`, `annotations_categories` (map Q4, Confirmed).
- **Fields:** `tv_entity_id`, `annotations` (count per category, e.g. `US OFAC`, `US GSA`), `annotation_count`, and per annotation `annotation_id`, `name`, `description`, `polarity`, `valid_from`, `created_at`, `category_url`; score `tradeverifyd_score`, `score_level`, `score_version` (shown as reported, never rescaled; spec §5.3). Match `confidence` and `confidence_version` from search.
- **Grain:** one annotation per entity (plus one score row per entity).
- **Refresh:** per build run.
- **Status:** ready through an MCP adapter. Recorded for AZ Gold in `fixtures/recorded/tradeverifyd/`. Full annotation details need the `annotations:read` scope on a monitored entity; otherwise only counts.

## 18. `tradeverifyd_trade`

- **Needed by:** spec §8.3 "6. **Supply chain.** … from Sayari and Tradeverifyd shown side by side"; spec §9.1 TR1–TR4, LC3.
- **Built from:** Tradeverifyd MCP `entity_trade_relationships` (both directions), `annotated_relationship_paths` (`max_depth` 2), `entity_affiliate_relationships` (map Q3, Q4, Confirmed).
- **Fields:** envelope `trade_relationships`, `total_records`, `direction`; per relationship `hs_codes` (tool description); path hops with their HS codes. Other item fields `UNCONFIRMED` until a non-empty response is recorded. An entity missing from the relationship graph returns an error: store it as not assessable.
- **Grain:** one trade relationship, or one hop of an annotated path.
- **Refresh:** per build run.
- **Status:** ready through an MCP adapter; record a non-empty response first.

## 19. `address_clusters`

- **Needed by:** spec §9.1 "LO1 Address cluster | Unusually many companies at one registered address"; `docs/tracing_methodology.md` §3 (`address_hub`, `entity_count`).
- **Built from:** the application. It counts distinct companies whose Sayari `addresses` normalize to the same address, found through Sayari entity search (Confirmed, but the address `fields` value is unconfirmed, B21). Tradeverifyd companies-in-radius needs latitude and longitude, which its address data does not provide (B27). Sayari's `mass_address_usage` risk flag is kept alongside as the vendor's own signal.
- **Fields:** `normalized_address`, `entity_count`, `entity_ids`, `method`, `sayari_mass_address_usage` (flag present or not).
- **Grain:** one normalized address.
- **Refresh:** per build run.
- **Status:** partly blocked (B21, B1, B25).

## 20. `signals`

- **Needed by:** spec §6 (`signals`); spec §9.1–9.2; spec §8.3 "3. **Risk summary.**"; narrative dossier §5–6 (signals found, not found, not assessable).
- **Built from:** derived from datasets 1–19. No external calls.
- **Fields:** `entity_id`, `signal_code` (PM1–PM6, ST1–ST4, LC1–LC4, LO1–LO2, TR1–TR4, PR1–PR2, PX1–PX3), `family`, `fired` (true, false, or null for not assessable), `not_assessable_reason`, `evidence` (json), `source_record_ids`, `depends_on_psa`, `config_version`, `computed_at`.
- **Grain:** one entity × one signal code.
- **Refresh:** recomputed whenever inputs or config change.
- **Status:** derived. PM5 is always null with reason "bidder identities not available" until B11 is resolved.

## 21. `assessments` *(new)*

- **Needed by:** spec §6 (`assessments` … `combined_score, score_lower, score_upper, component_scores`); spec §9.3 "Tiers"; spec §9.4 "Combined risk score"; narrative `result.families`, `result.score`; `scoring/engine.py`.
- **Built from:** derived from `signals`.
- **Fields:** `entity_id`, `tier`, `signal_families_fired`, `combined_score`, `score_lower`, `score_upper`, `component_scores` (S_Sayari, T_Tradeverifyd, P_Presence, each with its own range), `category_agreement` (corroborated, single-source, conflicting), `config_version`, `computed_at`.
- **Grain:** one entity × one config version.
- **Refresh:** recomputed with `signals`.
- **Status:** derived. `T_Tradeverifyd` stays unassessed until B1, so every score carries a range (B24 asks the scoring engine to support this).

## 22. `backtest_candidates`

- **Needed by:** spec §12.2 "Backtest" ("SAM.gov exclusions tied to sanctions or export-control actions, and OFAC or BIS designations of entities with prior federal registrations or awards … **[VERIFY: no case has been selected yet]**").
- **Built from:**
  - Sayari entities carrying both a SAM.gov Exclusions source and a sanctions or export-control flag, cross-checked with `official_list_entries`.
  - Existing research: `research/ground_truth_entities.csv`, and the Serniya network (SAM exclusion UEIs; research F29–F30).
- **Fields:** `entity_id`, `sam_exclusion_uei`, `list_source`, `list_start_date`, `first_award_date` (null if none), `enforcement_date`, `evidence_source_ids`, `approval_status` (candidate, approved, rejected), `approved_by`.
- **Grain:** one candidate enforcement case.
- **Refresh:** on request.
- **Status:** partly blocked. Needs B25, and **B26** *(new)*: the Sayari search syntax for filtering by source and risk factor is not in the spec file (`advanced` and `facets` parameters exist, but their query syntax is `UNCONFIRMED`). **Candidates only**: each needs your approval before it counts as ground truth.

## 23. `false_positive_sample`

- **Needed by:** spec §12.3 "False-positive study" ("random sample of 50 to 100 ordinary contract recipients"); `docs/control-rows-guide.md` §1–7.
- **Built from:** USAspending award search with `award_amounts` bands and random `page` (map Q8, Confirmed), using `scripts/sample_controls.py`.
- **Fields:** the columns already used in `research/control_candidates.csv`: `recipient_name`, `recipient_uei`, `award_id`, `award_amount`, `awarding_agency`, `start_date`, `award_url`, `size_band`, `seed`, `fiscal_year`, `entity_type`, `jurisdiction`, `sayari_entity_id`, `ofac_sdn_check`, `sam_exclusions_check`, `sayari_watchlist_check`, `adverse_media_check`, `screen_result`, `screened_by`, `screen_date`, `screen_notes`.
- **Grain:** one randomly sampled ordinary contractor.
- **Refresh:** once per study, with a fixed random seed.
- **Status:** ready. 30 candidates are already in `research/control_candidates.csv` (21 screened, per the control-rows guide §7). The study needs 50–100, so 20–70 more draws.

---

## Considered and left out

| Candidate | Why it's left out |
|---|---|
| Nonprofit filings and finances (IRS 990 via Sayari; ProPublica) | Only map Q6 needs it, for a mission-mismatch signal that isn't defined yet (B8), and no spec signal uses it. Add it when B8 is resolved |
| Tradeverifyd HS trends and disruptions (dashboard) | Needed by spec §8.1, but blocked on B1 and not needed by any other feature. Add with the other Tradeverifyd datasets |
| Price benchmark (UN Comtrade) | Only the archived spec's misinvoicing signal uses it; the build spec has no such signal |
| Agent run log | Belongs to Task 3, not the dataset build |

## Gaps: data the repo needs that no tool provides

| Need | Where it's needed | Why it's a gap |
|---|---|---|
| Identities of competing bidders | Spec §9.1 PM5 | USAspending publishes only `number_of_offers_received` (B11) |
| Grants passed through state agencies to sub-recipients | Spec §1.4 | Not visible in the available data; the UI must say so |
| Informal or unrecorded trade | Spec §3.2; narrative §3.4 empty state | Customs data doesn't record it |
| SAM.gov ownership fields | Archived spec §4.1 | Marked "for official use only" (FOUO), not public |
| A documented scale for the Tradeverifyd Score | Spec §9.4 | Not documented (spec §14) |
