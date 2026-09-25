# Data-source map

Which datasets answer each question the project sets out to investigate, which tool reaches them, and which fields matter. This is also the tool registry for the agentic search layer: the agent may only call the operations listed here.

Built from `follow-the-public-dollar-spec.md` (section 9) and the team's brainstorm notes. If the repo lists questions not covered here, add rows in the same format.

**Last verified: 25 September 2026** against the files in `docs/vendor/` (see `docs/vendor/README.md` for source URLs and dates). File references below are relative to `docs/vendor/`. Anything not found in those files is marked `UNCONFIRMED`.

## Status key

| Status | Meaning |
|---|---|
| **Confirmed** | Endpoint and field names checked in a vendor or agency doc file in `docs/vendor/` (file named in the row) |
| **Pilot** | Seen in real responses during the 25 September 2026 test runs through the vendor connectors or a live API call |
| **Docs** | Described in the vendor's or agency's own documentation, not yet seen in a response |
| **Unconfirmed** | Believed to exist; must be checked before code depends on it |
| **Blocked** | Waiting on a backlog item |
| **Design** | Computed by the application; no external source |
| **Gap** | Needed by the repo, but no available tool provides it |

**Tradeverifyd** has no REST API; its vendor-provided interface is its MCP server (`https://platform.tradeverifyd.com/api/mcp`, configured in `.mcp.json`). Tool names and inputs are **Confirmed** from the live `tools/list` response on 25 September 2026 (`tradeverifyd/mcp-tools.md`, `tradeverifyd/tools-list-2026-09-25.json`; 47 tools). Response fields are confirmed only where a response has been recorded in `fixtures/recorded/tradeverifyd/`. Adapters must call Tradeverifyd through an MCP client, not HTTP REST.

Sayari REST calls authenticate with `POST /oauth/token` (`client_id`, `client_secret`, `grant_type: client_credentials`) and a Bearer token; server `https://api.sayari.com` (`sayari/openapi.yml`). Rate limits: a `429 Rate limit exceeded` response is documented, but the limits themselves are not (B10).

---

## Q1. Did federal money reach this company, and how?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Federal contract awards to a recipient | USAspending API, award search: `POST https://api.usaspending.gov/api/v2/search/spending_by_award/` (free, no key). Filters: `recipient_search_text`, `time_period`, `award_type_codes`, `agencies`, `naics_codes`, `psc_codes`, `award_amounts` | `Award ID`, `Recipient Name`, `Recipient UEI`, `Award Amount`, `Awarding Agency`, `Start Date`, `End Date`, `NAICS`, `PSC`, `generated_internal_id` | **Confirmed** (`usaspending/search_spending_by_award.md`); **Pilot** (live calls 25 Sep 2026, `research/sources.json` S15). Note: `recipient_search_text` matches substrings, e.g. "Sertal" returned "LASERTALK INC" (`research/false_positive_log.csv`) |
| Whether the award was competed | USAspending award detail: `GET /api/v2/awards/{award_id}/` | Under `latest_transaction_contract_data`: `extent_competed`, `extent_competed_description`, `number_of_offers_received`, `solicitation_procedures`, `solicitation_procedures_description`, `other_than_full_and_open`, `other_than_full_and_open_description` | **Confirmed** (`usaspending/awards_award_id.md`). Resolves B2. These fields are **null on some IDVs and BPAs** (checked on `CONT_IDV_19AQMM25A1228_1900`, archived spec §4.1), so PM3 is not assessable for those |
| Where the prime sent the money | USAspending award search with `"subawards": true` (same endpoint as row 1). Corrected: the separate `POST /api/v2/subawards/` returns no subrecipient UEI (fields: `subaward_number`, `description`, `action_date`, `amount`, `recipient_name`) | `Sub-Award ID`, `Sub-Award Amount`, `Sub-Award Date`, `Sub-Awardee Name`, `Sub-Recipient UEI`, `Prime Award ID`, `Prime Award Recipient UEI` | **Confirmed** (`usaspending/search_spending_by_award.md` "Contract Subawards"; `usaspending/subawards.md`). Resolves B2. Coverage limit: only first-tier subawards of $40,000 or more (contracts, FAR 52.204-10) or $30,000 or more (grants, 2 CFR 170) must be reported |
| SAM.gov registration | Sayari entity profile (SAM.gov Entity Registration source); SAM.gov Entity Management API `GET https://api.sam.gov/entity-information/v4/entities` (free key via api.data.gov; public data needs a SAM.gov account; **10 requests per day** without a SAM.gov role, 1,000 with one, per archived spec §4.1) | Sayari: identifier type `usa_sam_uei_number`. SAM API parameters and field names: `ueiSAM`, `cageCode`, `registrationDate`, `activationDate`, `registrationStatus`, `businessTypeList`, `entityStructureDesc`, `purposeOfRegistrationDesc` | Sayari **Pilot** + **Confirmed** (`IdentifierType` enum, `sayari/openapi.yml`; source "USA SAM.gov Entity Registration Database" in the live source catalogue). SAM API **Confirmed**: v1–v4 are documented and v4 is the latest (`sam/entity-management-api.html`), which resolves B3. JSON nesting of the fields is `UNCONFIRMED` until a response is recorded. Sayari also lists `usa_sam_uei_number` as a weak identifier (B9) |
| Excluded or debarred parties | Sayari (SAM.gov Entity Exclusions source); SAM.gov Exclusions API `GET https://api.sam.gov/entity-information/v4/exclusions` | Sayari identifier type `usa_sam_exclusions_number`. SAM API: `ueiSAM`, `exclusionType`, `exclusionProgram`, `excludingAgencyName`, `classificationType`, `activateDate`, `terminationDate` | **Pilot** (Sayari source "USA SAM.gov Entity Exclusions Database"; research F29–F30) + **Confirmed** (`sam/exclusions-api.html`, `sayari/openapi.yml`) |
| PPP and SBA loans | Sayari (sources "USA Paycheck Protection Program (PPP) Loan Recipient Database", "USA SBA 504 and 7(a) Loan Program Database", "USA SBA Dynamic Small Business Database") | Loan amount, lender, date: `UNCONFIRMED` (the spec does not name the fields on the entity where these records appear; B14) | **Pilot** (live Sayari source catalogue, 25 Sep 2026; REST equivalent `GET /v1/ontology/sources?country=USA`, **Confirmed** in `sayari/openapi.yml`) |
| Contract awards via Sayari | Sayari (source "USA USASpending.gov Profiles Database"); contracts appear as entities of type `contract` linked by `recipient_of` | Contractor profile, corporate hierarchy: `UNCONFIRMED` field names (B14) | **Pilot** (source catalogue; `recipient_of` contract relationships seen on the Serniya entity, research F34); entity type `contract` **Confirmed** (`Entities` enum) |
| Firm size and age, for award size versus profile (PM2) *(new row; spec §9.1 "PM2 Award size versus profile … SAM.gov, USAspending")* | Sayari `registration_date`; SAM `businessTypeList`, `registrationDate`; SBA Dynamic Small Business Database via Sayari | Registration date, business types | **Confirmed** (fields above); SBA field names `UNCONFIRMED` (B14) |
| Competing bidders on the same solicitation, for shared principals (PM5) *(new row; spec §9.1 "PM5 Shared principals across bidders … Same officers or addresses behind competing firms")* | None. USAspending gives `number_of_offers_received`, not who bid | Bidder identities | **Gap** (B11) |

**Not covered:** grants passed through state agencies to sub-recipients. The Feeding Our Future pilot showed these money paths do not appear.

**Signals powered:** PM1 registration-to-award gap, PM2 award size vs profile, PM3 non-competitive award, PM4 pass-through, PM6 excluded party. PM5 shared principals across bidders is **not powered** until B11 is resolved.

---

## Q2. Does the company look like it exists to hide something?

### Ownership structure

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Owners and ultimate owners | Sayari `GET /v1/ubo/{id}` (upward); `GET /v1/downstream/{id}` (owned entities). Parameters: `min_depth`, `max_depth` (default 4), `limit` (default 10, max 50), `psa`, `min_shares`, `include_unknown_shares`, `exclude_former_relationships`, `relationships` | Response `data[]` of `source`, `target`, `path`. Relationship types include `has_shareholder`, `shareholder_of`, `has_beneficial_owner`, `beneficial_owner_of`, `has_owner`, `owner_of`. Percentages come from the `shares` attribute; its exact position inside a path hop is `UNCONFIRMED` until a response is recorded | **Confirmed** (`sayari/openapi.yml`: `traversal_ubo`, `traversal_ownership`, `Relationships` enum, `AttributeDetails.shares`); `has_shareholder` seen in **Pilot** |
| Chain ends at a company, not a person | Sayari UBO | `type` of the last entity in the path (`company`, `person`, …) | **Confirmed** (`Entities` enum) |
| Layered or circular ownership | Sayari ownership and traversal (`GET /v1/traversal/{id}`) | Path length, repeated entity `id` in a path (loop detection is application logic) | **Confirmed** |
| Secrecy jurisdiction | Sayari entity profile | `countries`; compare to a jurisdiction list in config | **Pilot** + **Confirmed** (`EntityDetails.countries`) |

### Lifecycle

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Registration date and status | Sayari entity profile `GET /v1/entity/{id}` | `registration_date`, `latest_status`, `closed`. Corrected: the field is `latest_status` (with `attributes.status` for history), not `status` | **Pilot** + **Confirmed** (`EntityDetails`) |
| Registered around a funding program | Sayari registration date plus program start dates in config | Date comparison | **Confirmed** (dates); config needed |
| Prior names | Tradeverifyd `search_entities` / `entity_details`; Sayari entity names | Tradeverifyd `aliases` (recorded); Sayari `attributes.name`, `label`, `translated_label` | **Confirmed** (Sayari spec; Tradeverifyd recorded responses) |

### Location

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Many companies at one address | Sayari entity search `GET /v1/search/entity` (`q`, `fields`, `facets`); Tradeverifyd `find_companies_in_radius` (`latitude`, `longitude`, `radius_nm` in nautical miles, `limit`) | Count of entities at or near the address. Sayari has **no `address` entity type** (`Entities` enum), so an address cluster must be counted from search results, not read from an address node. Tradeverifyd's radius tool takes a point, not an address; `entity_addresses` returns no coordinates, so a geocoder is needed; its own description says it is for disaster and event linkage; and all three pilot calls (0.01–0.5 nm, 25 Sep 2026) failed with a server-side statement timeout. Sayari `mass_address_usage` (>1,000 entities at one geocoded address) is the working source | Sayari search **Confirmed**, but the searchable `fields` value for address is `UNCONFIRMED` (B21). Tradeverifyd tool **Confirmed** (MCP schema) but **not usable** for LO1 yet (B27) |
| Mailbox or coworking address | Tavily search on the address: `POST /search`, `topic: general` | `results[].url`, `title`, `content`, `score`; reviewed by an analyst | **Confirmed** (`tavily/search.md`) |
| Registered agent or formation firm behind many companies *(new row; `docs/tracing_methodology.md` §3 "Addresses, Registered Agents and Formation Law Firms")* | Sayari relationship types `has_registered_agent` / `registered_agent_of`; fan-out from `degree` or `relationship_count` on the agent entity | `degree`, `relationship_count` | **Confirmed** (`Relationships` enum, `EntityDetails`) |

### Presence

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Company website and footprint | Tavily search, `topic: general` | `results[].url`, `title`, `content`, `score`, `favicon`; classify as official site, registry or aggregator, or media. Tavily returns **no publisher field**, so derive the publisher from the URL domain | **Pilot** + **Confirmed** (`tavily/search.md`) |
| Adverse media | Tavily search, `topic: news`; Sayari `GET /v1/negative_news` (`name`, `topic`, `until`); Sayari adverse-media risk factors | Tavily results with `published_date`: Tavily's estimate, which "can be later than the original publish date", returned when `include_published_date` is true (automatic for `news`). Sayari risk flags such as `law_enforcement_action`, `reputational_risk_terrorism` | **Pilot** + **Confirmed** (`tavily/search.md`; `sayari/openapi.yml` `negativeNews_NegativeNews`, new) |

**Signals powered:** ST1–ST4, LC1–LC3, LO1–LO2, PR1–PR2.

---

## Q3. Who does it trade with, and in what?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Shipments | Sayari `POST /v1/trade/search/shipments`, `/v1/trade/search/suppliers`, `/v1/trade/search/buyers`. Body: `q`, `filter`, `facets`. Filters include `hs_code`, `departure_country`, `arrival_country`, `transit_country`, `supplier_id`, `buyer_id`, `departure_date`, `arrival_date` | Shipment: `id`, `departure_date`, `arrival_date`, `departure_country`, `arrival_country`, `transit_country`, `hs_codes`, `product_descriptions`, `product_origin`, `weight`, `monetary_value`, `supplier`, `buyer`, `sources`, `record` | **Confirmed** (`sayari/openapi.yml` `TradeFilter`, `Shipment`) |
| Upstream suppliers by tier | Sayari `GET /v1/supply_chain/upstream/{id}` | Parameters `product`, `risk`, `countries`, `max_depth`, `min_date`, `max_date`, `component`, `tier1_shipment_country`…`tier5_shipment_country`, `limit`; supplier paths | **Confirmed** |
| Trade relationships with goods codes | Tradeverifyd `entity_trade_relationships` (`entity_id`, `direction` `in` = suppliers / `out` = customers, `hs_codes` prefix filter, `page`, `page_size`) | Response: `trade_relationships[]`, `total_records`, `total_pages`, `page`, `page_size`, `direction`; each relationship carries `hs_codes` (tool description). Relationship item fields `UNCONFIRMED` until a non-empty response is recorded (AZ Gold returned 0) | **Confirmed** (MCP schema; recorded response) |
| Declared business vs goods shipped | Sayari entity `attributes.business_purpose` or USAspending `NAICS`, compared with shipment `hs_codes` | Text and code comparison | **Pilot** (`business_purpose` seen) + **Confirmed** |
| High-priority goods | Shipment `hs_codes` compared with the BIS Common High Priority Items List | 50 HS codes in tiers (`bis/common-high-priority-items-list.html`) | List source **Confirmed**; version date `UNCONFIRMED`, since the page gives none (B5) |
| Transshipment routing | Sayari shipment `departure_country`, `arrival_country` and `transit_country`, compared with a hub list in config | Countries | **Confirmed** (`transit_country` exists as a field and filter) |
| Partner churn | Sayari shipments over time | `supplier`, `buyer` by `departure_date` / `arrival_date` period | **Confirmed** |

**Limits seen in the pilot:** neither vendor showed trade records for the AZ Gold network, although gold flows were alleged. Informal trade does not appear.

**Value coverage (Pilot, 25 Sep 2026, Serniya receiver records):** shipments from the "Global Historical Imports & Exports (2019 - 2020)" dataset carry `value` (USD) and `weight` (kg); shipments from "Russia Imports & Exports (January 2022 - Present)" carry weight only. Neither carries unit quantity. Any price comparison can only be USD per kg, on shipments that have both fields.

**Signals powered:** TR1–TR4.

---

## Q4. Is it connected to sanctioned or restricted parties?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| The company itself is listed | Sayari entity profile | `sanctioned` (boolean), `pep` (boolean), `risk`; risk-factor IDs such as `sanctioned_usa_ofac_sdn`, `export_controls`, `regulatory_action` | **Pilot** + **Confirmed** (`EntityDetails`) |
| Risk-factor definitions *(new row; spec §5.3 "Sayari risk flags are displayed with the definition returned by the risk-factor lookup")* | Sayari `GET /v1/ontology/risk_factors` (`id`, `risk_category`, `level`, `risk_type`) | Definition per flag | **Confirmed** |
| Official cross-check | Consolidated Screening List. Downloads (no key): `https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.{json,csv,tsv}`, updated daily at 5:00 AM ET. Search API on developer.trade.gov (key required; its docs page renders only in a browser) | CSV columns: `_id`, `source`, `entity_number`, `type`, `programs`, `name`, `title`, `addresses`, `federal_register_notice`, `start_date`, `end_date`, `standard_order`, `license_requirement`, `license_policy`, `remarks`, `source_list_url`, `alt_names`, `citizenships`, `dates_of_birth`, `nationalities`, `places_of_birth`, `source_information_url`, `ids` (plus vessel fields) | Downloads **Confirmed** (`trade_gov_csl/consolidated-screening-list.html`, `consolidated-csv-header.txt`); search API path `UNCONFIRMED` (B7) |
| Official cross-check | OFAC Sanctions List Service downloads (`https://sanctionslist.ofac.treas.gov`) | SDN entries | **Pilot**: `https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/{SDN,ALT,ADD,CONS_PRIM,CONS_ALT}.CSV` download without a browser or key (25 Sep 2026). Legacy CSV, no header row: `ent_num`, name, type, program, …; `-0-` means empty; ALT.CSV holds aliases keyed by `ent_num`. Resolves B4 |
| Forced-labor exposure | Sayari (source "USA DHS Uyghur Forced Labor Prevention Act List") | List membership | **Pilot** (live source catalogue) |
| Paths to listed parties | Sayari `GET /v1/watchlist/{id}`. `psa` **defaults to true** ("Defaults to traversing possibly same as relationships"); `sanctioned` filters paths to those ending at a listed entity; `max_depth` default 4; `limit` default 10, max 50 | Response: `data[]` of `source`, `target`, `path`, plus `partial_results`, `explored_count` | **Confirmed** (`traversal_watchlist`) |
| Shortest path to a named listed party *(new row; spec §8.3 "7. Paths to flagged parties")* | Sayari `GET /v1/shortest_path?entities=` | Path between two entities | **Confirmed** |
| Paths to flagged parties in the supply chain | Tradeverifyd `annotated_relationship_paths` (`entity_id`, `direction` `in`/`out`/`both`, `max_depth` 1–5, `hs_codes`) | Hop-by-hop path with HS codes per hop; endpoint `annotated_entity.annotation_count`, `annotation_badges`. Pilot on the Palantir control (depth 3, both directions) returned 22 paths, including endpoints with **zero** annotations, non-sanctions badges ("Forced Labor Research", "US GSA", "Human Rights") and one 3-hop path to an entity with 3 "US OFAC" badges. The adapter must keep only endpoints with a sanctions or export-control badge, at depth 1–2, or the control case fails (archived spec v1 §4.3). For AZ Gold it returned `{"error": "… not found in relationship graph"}`: store that as not assessable, not as "no paths" | **Confirmed** (MCP schema; Pilot on Palantir; recorded response for AZ Gold) |
| Tradeverifyd flags | Tradeverifyd `search_entities` (`annotations` counts per category, `annotation_count`) and `entity_annotations` (`entity_id`, `page`, `page_size`) | Search: `annotations` e.g. `{"US OFAC": 3, "US GSA": 2}`. Annotations: `annotation_id`, `name`, `description`, `polarity`, `valid_from`, `created_at`, `category_url` (full details need `annotations:read` on a monitored entity). Categories: `annotations_categories` (`name`, `description`, `polarity`). Only US/UN/EU/UK sanctions badges count as a listing (spec §9.2) | **Confirmed** (recorded responses for AZ Gold) |
| OFAC 50% rule | Sayari ownership percentages (`shares` attribute; `min_shares`, `include_unknown_shares` parameters); Sayari risk flag `ofac_50_percent_rule` | Percentages, flag | **Pilot** (flag seen) + **Confirmed** (parameters) |
| Listing date and program, for narrative templates *(new row; `docs/narrative-copy-spec.md` §4 evidence templates `list_designation`, `list_removal`)* | CSL `start_date`, `end_date`, `programs`, `federal_register_notice`; OFAC recent-actions pages (tier-1 sources in `research/sources.json`) | Designation date, program, removal date | CSL **Confirmed**; Sayari listing dates `UNCONFIRMED` |

**Important setting:** the Sayari watchlist endpoint follows "possibly same as" links **by default** (confirmed in `sayari/openapi.yml`). The spec says unconfirmed matches cannot satisfy sanctions proximity on their own. The adapter must send `psa=false` explicitly for the scoring run, and run separately with `psa=true` to label which paths depend on possibly-same-as links. The same parameter and default apply to `/v1/traversal`, `/v1/ubo` and `/v1/downstream`.

**Sayari `sanctioned` covers every list.** The boolean is true for any sanctions list Sayari ingests, including China's countermeasure lists (risk factor `sanctioned_other`). Spec §9.2 counts only US, UN, EU and UK lists, so adapters must pass the entity's risk-factor IDs to the scoring engine (`risk_factors`; `SCORED_SANCTION_FACTORS` in `scoring/engine.py`).

**Risk-factor prefixes (definitions from Sayari's risk-factor lookup, 25 Sep 2026):** `psa_` = possibly the same as an entity carrying the factor (below the merge threshold); `*_adjacent` = 1 hop from such an entity, any relationship type; `owned_by_*` / `owner_of_*` = ownership of 10% or more, up to 3 hops; `controlled_by_*` = a director, officer or manager carries the factor; `ofac_50_percent_rule` = possibly 50%+ owned in aggregate by OFAC SDN parties, up to 6 hops; `formerly_*` = the listing has ended; `mass_address_usage` = more than 1,000 entities at one geocoded address (~10 m).

**Exclusions for proximity:** paths through registered agents (`registered_agent_of`) and institutional asset managers connect unrelated companies at scale. The Palantir control case produced nine such paths (`research/evidence_ledger.csv` F41).

**Signals powered:** PX1–PX3.

---

## Q5. Is a new company a closed shell reappearing (phoenix pattern)?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Closed companies and their officers and addresses | Sayari entity profile (`relationships.type` filter on `GET /v1/entity/{id}`) and traversal | `closed`, `latest_status`, `addresses`; officer relationships `has_officer`, `has_director`, `has_manager`, `has_legal_representative`; `position` attribute for titles | **Pilot** + **Confirmed** |
| Previously flagged entities | Application database (assessments and analyst reviews) | Entity IDs, identifiers, addresses, officers | **Design** |
| Match new companies to closed flagged ones | Compare shared officers, owners, addresses, trade partners | At least two shared identifiers required | **Design** |
| Possible-same records and why *(new row; `docs/tracing_methodology.md` §2 "Sayari `possibly_same_as` mechanism")* | Sayari entity profile `possibly_same_as` (paged with `possibly_same_as.limit`) | `PSA`: `psa_id`, `label`, `count`, `match_keys[]` (`key`, `normalized`, `original`); also relationship type `possibly_same_as` | **Confirmed** |

The pilot showed person records are often split across filings, so matching must use addresses and identifiers as well as names.

**Signal powered:** LC4.

---

## Q6. Is a nonprofit acting against its stated purpose (humanitarian fronts)?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Nonprofit filings | Sayari (source "USA IRS 990 Filings") | Officers, related entities | **Pilot** (live source catalogue) |
| Nonprofit finances and grants | ProPublica Nonprofit Explorer API: `GET /nonprofits/api/v2/search.json`, `GET /nonprofits/api/v2/organizations/:ein.json` | `totrevenue`, `totfuncexpns`, `totassetsend`, `totliabend`, filing history | Endpoints and fields **Confirmed** (`propublica/nonprofit-explorer-api.html`); terms `UNCONFIRMED`, since the page links a separate "Data Terms of Use" that has not been read (B6) |
| Designated sham charities | Sayari OFAC flags; Consolidated Screening List | List membership | **Confirmed** (CSL files; Sayari `sanctioned`) |
| Adverse media | Tavily | Results | **Confirmed** |

**Signal powered:** a mission-mismatch signal, to be defined as its own signal (B8). Corrected: the previous text said "PM5-style", but PM5 in spec §9.1 is shared principals across bidders.

---

## Q7. Dashboard trends and news feed

| Panel or lane | Tool / dataset | Status |
|---|---|---|
| Federal spending in watched sectors | USAspending `POST /api/v2/search/spending_over_time/` (`group`, `filters`; results `time_period`, `aggregated_amount`) | **Confirmed** (`usaspending/search_spending_over_time.md`) |
| Sanctions and export-control actions | Federal Register API `GET https://www.federalregister.gov/api/v1/documents.json` with `conditions[agencies][]` (e.g. `industry-and-security-bureau`), no key; Consolidated Screening List | **Pilot** (live call 25 Sep 2026; fields `document_number`, `type`, `title`, `publication_date`, `html_url`, `pdf_url`, `agencies`, `abstract`, `excerpts`; `federal_register/api-sample-documents.json`). The docs page blocks automated download (B13) |
| Commodity trade inflections | Tradeverifyd `tia_hs_trends` (`hs_codes`, `signal_type` `volume_surge`/`price_surge`, `limit`) and `tia_hs_trend_explain` (`signal_id`) | **Confirmed** (MCP schema); response fields `UNCONFIRMED` until recorded |
| Supply-chain disruptions | Tradeverifyd `tia_get_disruptions` (`event_types`, `region`, `min_severity`, `latitude`, `longitude`, `radius_nm`; sources GDACS and NOAA) | **Confirmed** (MCP schema); response fields `UNCONFIRMED` until recorded |
| Screening portfolio; newly flagged award recipients *(new row; spec §8.1)* | Application database | **Design** |
| Official news lane | Federal Register API | **Pilot** |
| OFAC list changes *(new row; spec §8.2 "OFAC list changes, detected by comparing successive official list downloads")* | Daily diff of CSL downloads (Treasury entries); OFAC SLS downloads once B4 is resolved | CSL **Confirmed**; SLS **Unconfirmed** (B4) |
| Media news lane | Tavily search with `topic: news` | **Confirmed** |

The two Tradeverifyd panels can now be built; their response fields must be recorded first.

---

## Q8. Evidence trail, identity cross-checks and validation *(new section)*

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Original source document for a fact *(spec §5.2 "Record retrieval: Original source documents for the evidence trail")* | Sayari `GET /v1/record/{id}` | Record | **Confirmed** |
| Which registries back a record *(spec §5.2 "Data source catalog")* | Sayari `GET /v1/ontology/sources` (`id`, `country`, `source_type`) | Source ID, label | **Confirmed** + **Pilot** |
| Name or identifier resolution *(spec §7.2 "Search flow")* | Sayari `GET`/`POST /v1/resolution` (`name`, `address`, `city`, `state`, `country`, `identifier`, `date_of_birth`, `type`, `minimum_score_threshold`, …); `GET /v1/search/entity` (`q`) | Candidate entities | **Confirmed** |
| LEI and parent-child links *(spec §5.4 "GLEIF API")* | GLEIF `GET https://api.gleif.org/api/v1/lei-records/{lei}` (no key) | `data.attributes.entity.legalName.name`, `jurisdiction`, `status`; relationships `direct-parent`, `ultimate-parent`, `direct-children`, `ultimate-children` | **Pilot** (live call, `gleif/sample-lei-record-palantir.json`) |
| UK officers and persons with significant control *(spec §5.4 "UK Companies House API")* | Companies House Public Data API: `/company/{company_number}/officers`, `/persons-with-significant-control`, `/filing-history`, `/registered-office-address` | Officers, PSCs, filings | Paths **Confirmed** (`companies_house/api-overview.html`); base URL and key header `UNCONFIRMED` (B16) |
| Aggregated sanctions and PEP cross-check *(spec §5.4 "OpenSanctions")* | OpenSanctions | Entity, datasets | **Unconfirmed**: API docs not collected; licence [VERIFY] (B17) |
| Random control sample for the false-positive study *(`docs/control-rows-guide.md` §1; spec §12.3)* | USAspending award search with `award_amounts` bands and random `page` | Fields as in Q1 row 1 | **Confirmed**. Pages up to 100 return full results (pilot 25 Sep 2026); deeper pages untested. Frequent 502/504s: `scripts/sample_controls.py` retries up to 8 times with backoff |

---

## Tool registry for the agentic search layer

The agent plans which of these to call. It cannot call anything else.

| Agent tool | Backed by | Returns | Status |
|---|---|---|---|
| `find_awards` | USAspending `POST /api/v2/search/spending_by_award/` | Awards matching filters (agency, NAICS, PSC, dates, amount) | Confirmed |
| `award_detail` | USAspending `GET /api/v2/awards/{award_id}/` | Competition fields for one award | Confirmed |
| `find_subawards` | USAspending `POST /api/v2/search/spending_by_award/` with `subawards: true` | Subawards under one prime award, with `Sub-Recipient UEI` | Confirmed |
| `spending_over_time` *(new)* | USAspending `POST /api/v2/search/spending_over_time/` | Aggregated amounts by period | Confirmed |
| `sam_exclusions` *(new)* | SAM.gov `GET /entity-information/v4/exclusions` | Exclusion records by UEI or name | Confirmed (key needed) |
| `resolve_entity` | Sayari `/v1/resolution` or `/v1/search/entity`, plus identifier lookups | Candidate entities with match grades (A–D, spec §7.1) | Confirmed |
| `entity_facets` *(new)* | Sayari `GET /v1/search/entity` with `facets` / `geo_facets` | Counts by country, type and other buckets before pulling rows | Confirmed |
| `screen_by_name` *(new)* | Sayari `GET /v1/screen` (`name`, `type`) | Name screening against Sayari's risk data | Confirmed |
| `entity_profile` | Sayari `GET /v1/entity/{id}` | Identity, status, dates, risk flags, sources, possibly-same-as with match keys | Confirmed |
| `entity_summary` *(new)* | Sayari `GET /v1/entity_summary/{id}` | Profile without relationships; used for connected companies (`docs/call-budget.md`) | Confirmed |
| `ownership` | Sayari `GET /v1/ubo/{id}`, `GET /v1/downstream/{id}` | Owner chains with percentages | Confirmed |
| `network` | Sayari `GET /v1/traversal/{id}` | Officers and linked entities within N hops | Confirmed |
| `listed_party_paths` | Sayari `GET /v1/watchlist/{id}` (explicit `psa` setting on every call) | Paths to listed parties | Confirmed |
| `shortest_path` *(new)* | Sayari `GET /v1/shortest_path` | Path between two entities | Confirmed |
| `trade` | Sayari shipments, suppliers, buyers, upstream traversal | Trade records with HS codes | Confirmed |
| `trade_facets` *(new)* | Sayari `POST /v1/trade/search/{shipments,suppliers,buyers}` with `facets` in the body | Counts by country, counterparty and HS code before pulling rows | Confirmed |
| `hs_code_lookup` *(new)* | Sayari `GET /v1/hs_codes` | HS code descriptions | Confirmed |
| `ontology_lookup` *(new)* | Sayari `GET /v1/ontology/{entity_types,relationships,identifiers,countries,attributes,enums,source_types,…}` | Valid values for filters and the meaning of enum fields | Confirmed |
| `source_record` *(new)* | Sayari `GET /v1/record/{id}` | Original record for a cited fact | Confirmed |
| `risk_factor_definitions` *(new)* | Sayari `GET /v1/ontology/risk_factors` | Definition of each risk flag | Confirmed |
| `negative_news` *(new)* | Sayari `GET /v1/negative_news` | Sayari adverse-media results | Confirmed |
| `sayari_usage` *(new)* | Sayari `GET /v1/usage` | Calls used against the account quota; checked before each run to enforce budgets | Confirmed |
| `screen_official_lists` | Consolidated Screening List downloads (daily file) or search API | Official list matches | Downloads confirmed; API path unconfirmed (B7) |
| `federal_register_documents` *(new)* | Federal Register `GET /api/v1/documents.json` | Official notices | Pilot |
| `lei_record` *(new)* | GLEIF `GET /api/v1/lei-records/{lei}` | LEI record and parent links | Pilot |
| `web_presence` | Tavily `POST /search` | Results classified by type | Confirmed |
| `extract_page` *(new)* | Tavily `POST /extract` (`urls`, `extract_depth`, `format`, `query`) | Text of one cited page, returned as `results[].raw_content` | Confirmed (`tavily/extract.md`) |
| `tv_search_entities`, `tv_entity_details`, `tv_entity_score`, `tv_entity_annotations`, `tv_trade_relationships`, `tv_annotated_paths`, `tv_affiliates`, `tv_quick_check`, `tv_hs_trends`, `tv_disruptions` *(new)* | Tradeverifyd MCP tools `search_entities`, `entity_details`, `entity_score`, `entity_annotations`, `entity_trade_relationships`, `annotated_relationship_paths`, `entity_affiliate_relationships`, `tia_quick_check`, `tia_hs_trends`, `tia_get_disruptions` | Read-only Tradeverifyd lookups. Monitoring, value-chain write, ingest and admin tools are excluded (they change vendor-side state) | Confirmed (MCP) |

Every call goes through the adapters, so each result is stored as a source record with provenance.

### Sayari coverage check

Every capability of the Sayari connector used in the pilot, with its REST equivalent in `sayari/openapi.yml` and the agent tool that exposes it. The REST API also has project, notification, attribute and resource endpoints. Those write data or manage Sayari projects, so they are left out of the read-only registry.

| Sayari connector tool | REST operation | Agent tool |
|---|---|---|
| `search_entities` | `GET`/`POST /v1/search/entity` | `resolve_entity` |
| `search_entity_facets` | `GET /v1/search/entity` with `facets` | `entity_facets` |
| `get_entity_profile` | `GET /v1/entity/{id}` | `entity_profile` |
| `get_entity_summary` | `GET /v1/entity_summary/{id}` | `entity_summary` |
| `find_beneficial_owners` | `GET /v1/ubo/{id}` | `ownership` |
| `find_downstream_entities` | `GET /v1/downstream/{id}` | `ownership` |
| `traverse_network` | `GET /v1/traversal/{id}` | `network` |
| `check_watchlist` | `GET /v1/watchlist/{id}` | `listed_party_paths` |
| `find_shortest_path` | `GET /v1/shortest_path` | `shortest_path` |
| `get_record` | `GET /v1/record/{id}` | `source_record` |
| `search_shipments` | `POST /v1/trade/search/shipments` | `trade` |
| `search_suppliers` | `POST /v1/trade/search/suppliers` | `trade` |
| `search_buyers` | `POST /v1/trade/search/buyers` | `trade` |
| `search_trade_facets` | trade search endpoints with `facets` | `trade_facets` |
| `get_upstream_supply_chain` | `GET /v1/supply_chain/upstream/{id}` | `trade` |
| `lookup_hs_codes` | `GET /v1/hs_codes` | `hs_code_lookup` |
| `lookup_ontology` | `GET /v1/ontology/*` | `ontology_lookup` |
| `lookup_risk_factors` | `GET /v1/ontology/risk_factors` | `risk_factor_definitions` |
| `lookup_data_sources` | `GET /v1/ontology/sources` | `source_record` (catalogue lookup) |
| `get_investigation_guidance` | **None**: connector-only tradecraft notes, not in the REST spec | Not available to the app (B20) |
| *(REST only)* | `GET /v1/resolution` | `resolve_entity` |
| *(REST only)* | `GET /v1/screen` | `screen_by_name` |
| *(REST only)* | `GET /v1/negative_news` | `negative_news` |
| *(REST only)* | `GET /v1/usage` | `sayari_usage` |

---

## Backlog items raised by this map

| ID | Item | Status (25 Sep 2026) |
|---|---|---|
| B1 | Obtain Tradeverifyd API docs: auth method, rate limits, score method, annotation categories, licensing, sample responses | **Mostly resolved** 25 Sep 2026. Tradeverifyd has no REST API; the MCP tool reference is in `docs/vendor/tradeverifyd/` and was checked against the live server (47 tools, matching the doc except the admin-only `tia_invite_member`). Sample responses recorded for 6 tools. Still open: rate limits and quotas; licensing; the Tradeverifyd Score scale (AZ Gold scored **258**, level "High", version 1.0.0, so it is not a 0–100 scale); annotation detail access (`annotations:read` scope) |
| B2 | Confirm USAspending competition field names and the subaward endpoint in the official API docs at api.usaspending.gov | **Resolved**: see Q1 rows 2–3 |
| B3 | Confirm the current SAM.gov Entity API version | **Resolved**: v4 |
| B4 | Confirm the OFAC Sanctions List Service download format | **Resolved** 25 Sep 2026: CSV exports download directly from `sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/` (see Q4 row) |
| B5 | Confirm the current Common High Priority List HS codes | Partly resolved: list source saved (50 HS codes); the page gives no version date |
| B6 | Confirm ProPublica Nonprofit Explorer API terms and fields | Partly resolved: fields and endpoints confirmed; "Data Terms of Use" not yet read |
| B7 | Register for a free trade.gov API key for the Consolidated Screening List | Narrowed: needed only for the search API. The daily downloads need no key |
| B8 | Define the mission-mismatch signal for nonprofits | Open |
| B9 | Sayari lists `cage` and `usa_sam_uei_number` under both `IdentifierType` and `WeakIdentifierType` ("weak (non-unique) identifiers"). Ask Sayari whether UEI and CAGE can support a grade A merge | Open. Interim rule in spec §7.1: UEI/CAGE support grade A only when both records come from the SAM.gov or DLA CAGE source; otherwise they count toward grade B |
| B10 | Sayari rate limits and pagination limits: `429` is documented, the limits are not (spec §5.1 [VERIFY]) | New |
| B11 | PM5 needs the identities of competing bidders. USAspending publishes only `number_of_offers_received`. Redefine PM5 (e.g. shared principals among recipients in the same NAICS and agency) or mark it not assessable | New |
| B12 | `docs/tracing_methodology.md` and `schema/investigation_schema.json` used Sayari fields `edge_counts` and `label_en` and an address-entity node | **Resolved** 25 Sep 2026: replaced with `relationship_count`, `translated_label` and `id`; `match_keys` typed as `{key, normalized, original}`; address counts computed by the application. Still open: which `fields` value in `/v1/search/entity` searches addresses (B21) |
| B13 | Federal Register API documentation page blocks automated download. Save it manually into `docs/vendor/federal_register/` | New |
| B14 | How Sayari exposes PPP, SBA and USAspending record values (amount, lender, date, award ID) on an entity. Record a fixture response | New |
| B15 | Tavily returns no publisher field, and `published_date` is an estimate. Spec §5.3 and §8.2 ("publisher, title, date") need a domain-to-publisher rule and a "date as estimated by Tavily" label | New |
| B16 | Companies House API base URL, auth header and free key registration | New |
| B17 | OpenSanctions API docs and licence terms for this use | New |
| B18 | Re-record the 17 Appendix A fixtures through the Sayari REST API (`/v1/entity`, `/v1/entity_summary`), plus watchlist runs with `psa=false` and `psa=true`, once credentials are issued. The connector recordings in `fixtures/recorded/sayari/` have a different response shape | New |
| B19 | Calibrate the combined-score weights (0.45 / 0.35 / 0.20) and per-category points (spec §9.4, §12.4) on the backtest and false-positive sets | New |
| B20 | Sayari's `get_investigation_guidance` connector tool has no REST equivalent. Ask Sayari whether the guidance is available through the API; if not, the app does without it | New |
| B21 | Confirm the `fields` value for address search in Sayari `GET /v1/search/entity` (needed to count companies at one address, LO1) | New |
| B22 | SAM.gov allows 10 requests per day without a SAM.gov role. `docs/call-budget.md` uses 2 SAM calls per seed company, so only 5 seed companies per day. Request a SAM.gov role, or rely on Sayari's SAM sources and cache SAM responses | New |
| B23 | Naming clash: `scoring/engine.py` returns a score band called `risk_grade` (A–F), while spec §7.1 now uses match grades A–D. Rename the score band (e.g. `score_band`) so reports never confuse the two | New (for the scoring-engine owner) |
| B24 | `scoring/engine.py` sets the Tradeverifyd component to 0 when it is missing. Spec §9.4 requires an unassessed component to produce a score range (lower and upper bound), not a zero. Update the engine to return the range | New (for the scoring-engine owner) |
| B25 | Obtain Sayari REST API credentials (`client_id` / `client_secret`, spec §5.1; `docs/planning_doc.md` §5). The dataset jobs call the REST API through the adapters, so every Sayari dataset is replay-only until then (`docs/datasets.md`) | New |
| B26 | Confirm the query syntax of Sayari `GET /v1/search/entity` `advanced` and `facets` parameters for filtering by source (e.g. SAM.gov Exclusions) and risk factor. Needed for `backtest_candidates` | New |
| B27 | Tradeverifyd `find_companies_in_radius` needs latitude and longitude, and `entity_addresses` returns none. Decide whether to add a geocoder for LO1, or rely on Sayari address counts | New |
| B28 | `search_entities` `confidence` was 1 for every Palantir hit across five countries, so it does not separate true from false matches. Calibrate on Appendix A before using it (spec §7.1 already forbids it as the sole merge basis) | New |
| B29 | `scoring/engine.py` counts relationships by this repo's graph-contract types (`beneficial_owner`, `shared_address`, `officer_director`, `supply_chain_shipment`). Sayari's own relationship names differ (`has_beneficial_owner`, `has_officer`, `ships_to`, …; there is no shared-address relationship). The adapter needs a mapping from Sayari names to contract types before live Sayari counts can feed the engine | New (for the scoring-engine owner) |
