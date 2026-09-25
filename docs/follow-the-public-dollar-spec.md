# Follow the Public Dollar — Technical Design Specification

**Product:** Risk rating and exposure report on public money reaching shell-company networks through the supply chain
**Audience for outputs:** Regulators, inspectors general, and audit staff
**Build environment:** VS Code (Python)
**Data providers:** Sayari, Tradeverifyd, Tavily, plus public spending data (USAspending.gov, SAM.gov)
**Document status:** Draft v1.1 — prepared 25 September 2026; open items in Section 13 checked the same day

---

## How to read this document

Every statement in this spec carries one of three tags, so reviewers can see exactly what is fact and what is a choice.

| Tag | Meaning |
|---|---|
| **[V]** | **Verified.** Checked against a public source or the provider's own tool output. The source is listed in Section 14. |
| **[D]** | **Design decision.** A choice made by the team. Not a factual claim. Can be changed. |
| **[C]** | **To confirm.** Not yet verified. Must be checked before the product is shown to a regulator. |

Numeric weights and thresholds in this document are **[D]** unless stated otherwise. They are starting values, not calibrated findings.

---

## 1. Purpose and operating principles

**Purpose [D].** Start from a public award (contract, grant, or loan). Trace the recipient's ownership, subawardees, and trade counterparties. Estimate how likely each entity is to show shell-company characteristics. Report how many public dollars are exposed, with a range, and show the evidence behind every number.

**Operating principles [D]:**

1. **Predictive, not determinative.** The system estimates likelihood from external records. It does not have access to any company's internal books, bank records, or logs, so it cannot establish what a company actually did. Every output is a *risk lead for review*, never a finding of wrongdoing.
2. **No hard labels.** The product never labels an entity "a shell company." It reports "indicators consistent with shell-company activity," a likelihood band, and a confidence level.
3. **Official list status is reported separately.** Whether an entity appears on a sanctions or export-control list is a matter of public record, not a prediction. It is shown as a fact with its source, outside the likelihood score.
4. **Missing data is not evidence.** If a signal cannot be checked, it does not raise or lower the score. It widens the uncertainty range instead.
5. **Corroboration before escalation.** No single indicator, and no single data source, can place an entity in the highest band on its own.
6. **Full provenance.** Every indicator links to the record that triggered it, with the retrieval time.

**Why this matters, in the providers' own terms [V].** Sayari's investigation guidance states that no single indicator proves an entity is a shell, and that shell companies are not inherently illegal, since many serve legitimate purposes such as holding property or acting as project-finance vehicles. Several Sayari risk-factor definitions (for example, TCSP ownership and mass business registration) explicitly note that the flag may reflect legitimate activity and should be verified.

---

## 2. Regulatory context (all verified)

| Development | Detail | Tag |
|---|---|---|
| US beneficial-ownership reporting narrowed | FinCEN's interim final rule, announced 21 March 2025 and published 26 March 2025, exempts all entities created in the United States and their beneficial owners from BOI reporting. Only foreign companies registered to do business in a US state remain covered, and they need not report US-person beneficial owners. | [V] |
| UK identity verification | Mandatory identity verification for directors and persons with significant control began 18 November 2025, with a 12-month transition for existing directors and PSCs. | [V] |
| Definition of beneficial owner | Under the FATF standard, only a natural person can be an ultimate beneficial owner. A legal person or arrangement can never be the beneficial owner. | [V] |
| OFAC 50 Percent Rule | Entities owned 50% or more, directly or indirectly and in the aggregate, by one or more blocked persons are themselves blocked, whether or not they appear on the SDN List. The rule covers ownership, not control. | [V] |
| Common High Priority List (CHPL) | BIS, with the EU, Japan, and UK, maintains a list of 50 items identified by six-digit HS codes that Russia seeks for its weapons programs. The nine Tier 1 and Tier 2 codes (including integrated circuits and RF transceiver modules) are the highest priority. | [V] |
| Transshipment points | BIS has identified common transshipment points for goods diverted to Russia or Belarus, including Armenia, Brazil, China, Georgia, India, Israel, Kazakhstan, Kyrgyzstan, Mexico, Nicaragua, Serbia, Singapore, South Africa, Taiwan, Tajikistan, Turkey, the UAE, and Uzbekistan. | [V] |
| Phoenix activity | ASIC (Australia) defines illegal phoenix activity as a new company continuing the business of a liquidated or abandoned company, for little or no value, to avoid paying its debts. | [V] |

**Product implication [D].** Because US-formed companies no longer file beneficial ownership with FinCEN, external ownership data (Sayari) and behavioral indicators become more important for US recipients of public money.

---

## 3. System architecture

### 3.1 Pipeline [D]

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ 1. Ingest    │──▶│ 2. Resolve   │──▶│ 3. Expand    │──▶│ 4. Score     │──▶│ 5. Quantify  │──▶│ 6. Report    │
 │ public award │   │ entity match │   │ network      │   │ indicators   │   │ exposure $   │   │ + audit pack │
 └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
   USAspending        Sayari search      Sayari UBO,        Sayari risk       Award, subaward    HTML/PDF report,
   SAM.gov            + confidence       traversal,         factors,          and trade values   JSON evidence,
                                         shipments;         Tradeverifyd,                        hash-chained log
                                         Tradeverifyd       Tavily
```

### 3.2 Proposed repository layout [D]

```
public-dollar/
├── .vscode/                 launch configs, recommended extensions
├── .env.example             variable names only; never commit real keys
├── config/
│   ├── weights.yaml         signal weights and thresholds (versioned)
│   └── lists.yaml           jurisdiction and HS-code reference lists (with source links)
├── src/public_dollar/
│   ├── sources/             usaspending.py, sam.py
│   ├── providers/           sayari.py, tradeverifyd.py, tavily.py
│   ├── resolve.py           entity resolution and confidence
│   ├── graph.py             case graph (networkx)
│   ├── signals/             one module per signal family
│   ├── index.py             combined source index (Section 6)
│   ├── scoring.py           likelihood model (Section 7)
│   ├── exposure.py          dollar exposure (Section 8)
│   ├── report/              templates for the regulator report
│   ├── audit.py             hash-chained audit log
│   └── cache.py             integrity-checked response cache
├── tests/                   unit tests + one backtest fixture
└── reports/                 generated output (git-ignored)
```

---

## 4. Data sources and tool mapping

### 4.1 Public money (input layer)

| Source | Use | Access | Tag |
|---|---|---|---|
| USAspending `POST /api/v2/search/spending_by_award/` | Find awards by recipient. Setting `subawards: true` searches subawards instead of prime awards. | Public REST API | [V] |
| USAspending `POST /api/v2/subawards/` | List subawards for one prime award, filtered by `award_id` (generated award ID preferred). | Public REST API | [V] |
| USAspending `GET /api/v2/awards/<award_id>/` | Award profile, including `subaward_count` and `total_subaward_amount`. | Public REST API | [V] |
| SAM.gov Entity Management API `GET https://api.sam.gov/entity-information/v4/entities` | Registration dates (`registrationDate`), business types (`businessTypeCode`/`businessTypeDesc`), NAICS (`primaryNaics`, `naicsCode`). Key passed as `api_key` query parameter. | Free API key | [V] Public-level fields only. Parent/owner fields (`immediateParentEntity`, `ultimateParentEntity`) are **FOUO**, not available with a public key, so ownership must come from Sayari |
| SAM.gov Exclusions API `GET https://api.sam.gov/entity-information/v4/exclusions` | Debarred and suspended parties. Filter by `ueiSAM`, `exclusionName`, `classification`. v1–v3 retired September 2024. | Free API key | [V] |

**SAM.gov rate limit [V].** A personal key for a non-federal user **without a SAM.gov role allows 10 requests per day**; with a role, 1,000. The build must cache SAM.gov responses and query only the recipient and first-tier entities, or request a role before the demo.

**Known gap [V].** Subaward data is self-reported by prime recipients and may be incomplete. Reporting applies only to first-tier subawards at or above the threshold: **$40,000 for contracts** (FAR 52.204-10, threshold set in FAR 4.1403(a)) and **$30,000 for grants and other assistance** (2 CFR 170, Appendix A). Smaller subawards and all second-tier subawards are not reported, so every report must state that subaward coverage is partial.

**Competition fields [V].** The award profile (`GET /api/v2/awards/<award_id>/`) carries `latest_transaction_contract_data.extent_competed` and `extent_competed_description`, plus `number_of_offers_received` and `solicitation_procedures`. These are **null on some IDVs and BPAs** (checked on `CONT_IDV_19AQMM25A1228_1900`); for those, read the field on the individual orders, and treat null as "not checkable," never as "not competed."

### 4.2 Sayari (ownership, network, risk factors, trade) — tool names verified from the connected tools

| Tool | Use in this product |
|---|---|
| `search_entities` | Candidate matching for the award recipient. Sayari's own guidance says to compare identifiers, countries, and relationships, not names alone. |
| `get_entity_summary` | Attributes and risk factors without relationships (cheaper). |
| `get_entity_profile` | Full attributes, relationships, and risk factors. |
| `find_beneficial_owners` | Ownership chain upward; detect chains that never reach a natural person. |
| `traverse_network` | Network expansion with relationship, country, `sanctioned`, and `pep` filters. |
| `check_watchlist` | Paths from the entity to sanctioned parties, PEPs, or regulatory actions. |
| `search_shipments` | Shipment-level trade records (parties, goods, dates, risk flags). |
| `get_upstream_supply_chain` | Supplier tiers, filterable by HS code, risk, country, and date. |
| `lookup_risk_factors` | Definitions for Sayari risk-factor IDs (721 defined at the time of writing). |
| `get_investigation_guidance` | Sayari's analyst tradecraft, including shell-company methodology. |

**Production access [V].** The tools above are the MCP connector interface, which is suitable for the hackathon demo. A production application uses the REST API with OAuth 2.0 client credentials: `POST https://api.sayari.com/oauth/token` with `client_id`, `client_secret`, `audience: "sayari.com"`, `grant_type: "client_credentials"`; the bearer token lasts 24 hours. Endpoint mapping:

| MCP tool | REST endpoint |
|---|---|
| `search_entities` | `POST /v1/search/entity` |
| `get_entity_profile` | `GET /v1/entity/{id}` |
| `get_entity_summary` | `GET /v1/entity_summary/{id}` |
| `traverse_network` | `GET /v1/traversal/{id}` |
| `find_beneficial_owners` | `GET /v1/ubo/{id}` |
| `check_watchlist` | `GET /v1/watchlist/{id}` |
| `find_shortest_path` | `GET /v1/shortest_path` |
| `search_shipments` | `POST /v1/trade/search/shipments` |
| `get_upstream_supply_chain` | `GET /v1/supply_chain/upstream/{id}` |
| `get_record` | `GET /v1/record/{id}` |
| (entity resolution) | `POST /v1/resolution` |

**[D]** The demo uses the MCP connector; the Python build wraps both behind one client interface so the switch to REST is a configuration change.

### 4.3 Tradeverifyd (trade exposure)

Checked through the connected Tradeverifyd MCP tools on 25 September 2026. The HTTP 401 error recorded earlier that day in `research/README.md` no longer occurs.

| Tool | Inputs | Output fields used | Planned use | Tag |
|---|---|---|---|---|
| `search_entities` | `name` or `external_id` (LEI, DUNS), optional `jurisdiction`, `has_annotations`, `annotation_categories` | `entity_id`, `external_ids`, `naics`, `annotations` (count per category, e.g. `"US OFAC": 3`), `annotation_count` | Resolve the recipient; read list annotations | [V] |
| `entity_details` | `entity_id` | `legal_form`, `jurisdiction`, `naics`, `industry`, `external_ids` | Declared activity for the business–goods mismatch signal | [V] |
| `entity_annotations` | `entity_id` | Full annotation details only for **monitored** entities with `annotations:read` scope; otherwise a count only | Annotation detail | [V] |
| `annotated_relationship_paths` | `entity_id`, `direction` (`in` suppliers / `out` customers / `both`), `max_depth` 1–5, optional `hs_codes` | `paths[]` with `annotated_entity` (`annotation_count`, `annotation_badges`), `hops[]` (`tier`, `hs_codes`), `depth` | Proximity via trade links | [V] |
| `entity_trade_relationships` | `entity_id`, `direction`, optional `hs_codes` | Counterparties with the HS codes on each edge | Trade counterparties | [V] |
| `entity_addresses` | `entity_id`, filters | Address lines, city, postal code, `location_type`. **No coordinates** | Address evidence | [V] |
| `find_companies_in_radius` | `latitude`, `longitude`, `radius_nm` (**nautical miles**), `limit` ≤ 1,000 | Entity IDs with distance | Not used; see note below | [V] |
| Value-chain tools | `tia_create_value_chain`, `tia_get_value_chain_by_id`, `tia_get_value_chain_by_anchor`, `tia_value_chain_overview`, `tia_value_chain_briefing`, `tia_add_value_chain_node`, and related `tia_*` tools | Not yet exercised | Tier-by-tier supply chain | Names [V]; outputs [C] |

**Findings that change the design:**

- **[V] `annotated_relationship_paths` returns non-sanctions and zero-annotation endpoints.** For the Palantir control (depth 3, both directions) it returned 22 paths. They include entities with `annotation_count: 0`, badges such as "Forced Labor Research", "US GSA" and "Human Rights", and one path to an entity with 3 "US OFAC" annotations through three trade hops. **[D]** The Proximity category counts only paths whose endpoint carries a sanctions or export-control badge ("US OFAC", "US BIS", "Asset Freeze", "Natl Securty"), and only at depth 1–2. Deeper paths are shown for context but never scored. Without this filter the control case fails, the same risk `research/README.md` records for Sayari watchlist paths.
- **[V] `find_companies_in_radius` is not usable for address clustering yet.** It takes a point, not an address, and `entity_addresses` returns no coordinates, so it needs a separate geocoding step. Its own description says it is intended for disaster and event linkage. Three test calls (radius 0.01–0.5 nm, New York and South Dakota) all failed with a server-side statement timeout. **[D]** The address signal uses Sayari `mass_address_usage` only until this works.

### 4.4 Tavily (real-world presence and adverse media) — tool names verified

| Tool | Use |
|---|---|
| `tavily_search` | Web presence check; adverse media and enforcement news |
| `tavily_extract` | Pull text from a specific page for the evidence record |
| `tavily_crawl`, `tavily_map` | Inspect a company website's depth (a one-page site vs. an operating business) |
| `tavily_research` | Optional deeper background on high-band entities only |

---

## 5. Signal catalog

Each signal records: **what fired**, **the evidence**, **the source record**, and **known innocent explanations**. Where Sayari already publishes a risk factor for the pattern, the product uses Sayari's factor ID directly rather than re-deriving it. Factor IDs and definitions below were retrieved from Sayari's `lookup_risk_factors` tool [V].

**Strength tiers [D]:** Strong, Moderate, Weak. Tiers map to likelihood ratios in Section 7.

### 5.1 Ownership and control

| Signal | Definition | Source | Sayari factor ID [V] | Strength [D] | Innocent explanations |
|---|---|---|---|---|---|
| UBO dead end | Ownership chain ends at a legal person with no natural person identified | Sayari `find_beneficial_owners` | — (derived) | Moderate | Data gaps in opaque registries; publicly listed parents |
| Circular ownership | Ownership path loops back to an entity already in the chain | Sayari traversal | — (derived) | Strong | Rare; occasionally cross-holdings in corporate groups |
| Mass business registration (officer) | An officer holds more than 20 control-type positions | Sayari | `mass_business_registration`, `controlled_by_mass_business_registration` | Moderate | Professional directors, holding-company operations (per Sayari's definition) |
| TCSP ownership or control | Owned or controlled by a trust and corporate service provider | Sayari | `tcsp_keyword_risk`, `owned_by_tcsp_keyword_risk`, `controlled_by_tcsp_keyword_risk` | Moderate | Legitimate use of corporate services (per Sayari's definition) |
| Implausible officer age | Officer's recorded birth date gives an age under 16 or over 100 | Sayari | `implausible_date_of_birth`, `controlled_by_implausible_date_of_birth` | Moderate | Registry data-quality errors (per Sayari's definition) |

### 5.2 Location

| Signal | Definition | Source | Sayari factor ID [V] | Strength [D] | Innocent explanations |
|---|---|---|---|---|---|
| Mass address usage | Registered at an address shared by more than 1,000 distinct entities | Sayari (Tradeverifyd `find_companies_in_radius` not usable yet; see 4.3) [V] | `mass_address_usage` | Weak | Registered-agent addresses are used by many legitimate companies |

**Double-counting rule [D].** Sayari's `mass_address_usage` and Tradeverifyd's address clustering measure the same thing. They form **one** signal. Agreement between them raises *confidence*, not the score (see Section 6.3).

### 5.3 Lifecycle

| Signal | Definition | Source | Strength [D] | Innocent explanations |
|---|---|---|---|---|
| Registration-to-award gap | Entity registered in SAM.gov or incorporated shortly before a large award | SAM.gov `registrationDate` [V], Sayari, USAspending | Moderate | New legitimate firms, including small-business program entrants |
| Shelf activation | Long dormancy after incorporation, then sudden activity or officer turnover | Sayari profile history | Moderate | Legitimate shelf-company purchase |
| Phoenix linkage | A new entity shares two or more identifiers (officer, owner, address, phone, email domain, trade counterparty) with a previously dissolved entity that carried risk indicators | Sayari relationships and status | Strong | Legitimate business rescue (ASIC distinguishes this by intent) |

**Phoenix matching rules [D]:**

1. Require at least two shared identifiers.
2. Weight rarer identifiers higher. An address with more than 1,000 registered entities counts as a weak identifier; a shared officer, phone number, or email domain counts as strong.
3. Report the linked predecessor, the shared identifiers, and the dates.

**Removed from earlier drafts [C].** The claim that shell companies "usually exist for about two years" has no verified source. The product will measure lifespans in its own data rather than assert a figure.

### 5.4 Trade

| Signal | Definition | Source | Sayari factor ID [V] | Strength [D] |
|---|---|---|---|---|
| Business–goods mismatch | Declared activity (e.g., NAICS services code) inconsistent with HS codes traded | Sayari shipments; SAM.gov `primaryNaics` or Tradeverifyd `naics` [V] | — (derived) | Strong |
| CHPL goods | Entity trades HS codes on the Common High Priority List | Sayari shipments | `exports_bis_high_priority_items_direct`, `..._indirect`, `..._critical_components_direct`, `..._critical_components_indirect` | Moderate |
| Transshipment routing | Shipments route through BIS-identified transshipment points | Sayari shipments (`transit_country` [V]); Tradeverifyd route tools (`tia_get_route`, `tia_trade_flow`) [C] | — (derived) | Weak alone; Moderate with CHPL goods |
| Exports to sanctioned parties | Exports arriving after the counterparty's designation date | Sayari | `export_to_sanctioned` | Strong |
| Price anomaly (misinvoicing) | Declared unit value far from a benchmark for the same HS code | Sayari shipments (value and weight, where present) [V]; UN Comtrade benchmark [D] | — (derived) | Moderate |
| Counterparty churn | Rapid rotation of short-lived trading partners | Sayari shipments | — (derived) | Weak |

**Notes on trade signals:**

- **[V]** Sayari's definition of `export_to_sanctioned` states that such an export does not by definition indicate a violation, because it may be permitted under a general license or exemption. The report must repeat this caveat whenever the factor fires.
- **[D]** Price-anomaly thresholds start at the values in Sayari's tradecraft guidance (unit price at least 30% above, or at or below 70% of, a benchmark). These are Sayari's guidance values, not a legal standard.
- **[V] Value coverage depends on the trade dataset.** Checked on the Serniya receiver records (151 shipments, 24 Jan 2019 – 26 Mar 2022). Records from "Global Historical Imports & Exports (2019 - 2020)" carry `value` (USD) and `weight` (kg). Records from "Russia Imports & Exports (January 2022 - Present)" carry weight only. **Neither carries unit quantity.** The signal is therefore computed as **USD per kg**, only on shipments with both fields; shipments without a value are "not checkable," never "clear."
- **[D] Benchmark: UN Comtrade.** For each shipment, compare its USD/kg with the Comtrade unit value (`primaryValue` / `netWgt`) for the same 6-digit HS code, reporter, partner and year. The public preview endpoint needs no key (`GET https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=…&partnerCode=…&period=…&cmdCode=…&flowCode=M`). Example [V]: Russia's 2020 imports of HS 903090 from Germany were $2,433,701 over 3,283 kg, about $741/kg. Weight-based unit values are noisy for high-value instruments, so this signal stays Moderate and never fires on a single shipment. Tradeverifyd `tia_commodity_price` covers exchange-traded commodities (e.g. copper), not manufactured goods, so it is not used here.

### 5.5 Real-world presence (Tavily)

| Signal | Definition | Strength [D] | Innocent explanations |
|---|---|---|---|
| No operational footprint | No company-owned website; only registry or aggregator listings | Moderate | Small or new firms with little online presence |
| Operating website present | A company-owned site with substantive content | **Exculpatory** (lowers likelihood) | — |
| Adverse media | News or official sources describing enforcement, charges, or investigations naming the entity | Moderate | Name collisions; must match on more than name |

Sayari also publishes adverse-media factors (`law_enforcement_action`, `reputational_risk_financial_crime`, `regulatory_action`) [V]. When both Sayari and Tavily report the same event, it is one signal with higher confidence (Section 6.3).

### 5.6 Proximity to listed parties

| Signal | Definition | Sayari factor ID [V] | Strength [D] |
|---|---|---|---|
| Listed party | Entity itself appears on a sanctions or export-control list | `sanctioned`, `sanctioned_usa_ofac_sdn`, `export_controls`, and related IDs | **Reported as fact, outside the score** |
| Majority-owned by SDN | Possibly majority-owned by OFAC SDN entities, up to 6 hops, in aggregate (Sayari's implementation of the 50% rule) | `ofac_50_percent_rule` | **Reported as fact-pending-review, outside the score** |
| One hop from sanctioned | Directly related to a sanctioned entity | `sanctioned_adjacent` | Strong |
| Two to three hops | Found via `check_watchlist` path | — (derived from paths) | Moderate (2 hops), Weak (3 hops) |

### 5.7 Public-money signals

| Signal | Definition | Source | Strength [D] |
|---|---|---|---|
| Pass-through | Subawards total a large share of the prime award | USAspending subawards | Weak |
| Award vs. entity profile | Award size far exceeds what the entity's age and footprint suggest | USAspending; SAM.gov `registrationDate` [V]; Sayari | Moderate |
| Non-competitive award to young entity | Award not competed, and recipient recently formed | USAspending `extent_competed` [V] (null on some IDVs; see 4.1) | Weak |

---

## 6. Combined Source Index (Sayari × Tradeverifyd × Tavily)

### 6.1 Purpose [D]

Each provider sees part of the picture. The index combines their outputs into one comparable view **per entity**, shows where they agree or disagree, and prevents the same fact from being counted twice.

### 6.2 Normalization [D]

Map every provider output into shared **indicator categories**:

| Category | Sayari inputs (factor IDs) [V] | Tradeverifyd inputs [V unless marked] | Tavily inputs |
|---|---|---|---|
| Listed or majority-owned by listed | `sanctioned*`, `ofac_50_percent_rule`, `eu_50_percent_rule`, `uk_50_percent_rule`, `usa_bis_50_percent_rule` | `annotations` badges on the entity itself ("US OFAC", "US BIS", "Asset Freeze") | — |
| Proximity | `sanctioned_adjacent`, `check_watchlist` paths | `annotated_relationship_paths` depth, sanctions badges only, depth ≤ 2 (see 4.3) | — |
| Nominee / formation | `mass_business_registration`, `controlled_by_mass_business_registration`, `tcsp_keyword_risk`, `owned_by_tcsp_keyword_risk`, `controlled_by_tcsp_keyword_risk`, `implausible_date_of_birth` | — | — |
| Address | `mass_address_usage` | — (`find_companies_in_radius` not usable yet) | Virtual-office evidence |
| Trade control | `exports_bis_high_priority_items_*`, `export_to_sanctioned` | Value-chain flags [C] | — |
| Adverse media / enforcement | `law_enforcement_action*`, `reputational_risk_financial_crime*`, `regulatory_action` | — | Adverse-media results |
| Presence | — | — | Website / footprint result |
| Jurisdiction context | `basel_aml` (0–10, higher is riskier), `cpi_score` (0–100, higher is cleaner) | — | — |

**"Possibly the Same As" (PSA) factors [V → D].** Sayari defines PSA factors (for example, `psa_sanctioned`) as matches to entities that did not meet the threshold to be merged but may be the same. The product treats every `psa_` factor as the same category at **reduced weight** and labels it "unconfirmed identity match" in the report.

### 6.3 Per-category combination [D]

For each entity and category:

1. **Presence of evidence.** A category is `observed` if at least one provider returned data for it, and `unobserved` if none did.
2. **Signal state.** `fired`, `clear`, or `not checkable`.
3. **Agreement label:**
   - **Corroborated:** two or more independent providers report the same category fired.
   - **Single-source:** one provider reports it fired; others have no data.
   - **Conflicting:** one provider reports it fired and another reports it clear. Conflicts are shown to the reviewer and lower the confidence level; they are never silently resolved.
4. **Scoring effect:** Each category contributes **once** to the score (Section 7). Corroboration raises the **confidence** level; it does not multiply the score.

### 6.4 Index outputs per entity [D]

- Category grid (fired / clear / not checkable) with provider-level detail
- Agreement label per category
- Coverage: share of categories observed
- Links to every underlying provider record

---

## 7. Risk rating model

### 7.1 Approach [D]

A transparent **likelihood-ratio** model. It is chosen over a trained classifier because (a) no labeled training set exists yet, and (b) each factor's contribution can be shown and challenged by a reviewer.

1. Start from a **base rate** `b` (the assumed share of award-network entities showing shell characteristics). **[D] placeholder: 2%.** Must be revisited after the false-positive study (Section 11).
2. For each signal with data, apply a likelihood ratio: `LR_fired` if it fired, `LR_clear` if checked and clear. Signals that could not be checked apply no update.
3. Cap the combined contribution of each signal family (ownership, lifecycle, location, trade, presence, proximity, public money) to limit double counting from correlated signals.
4. Convert to a likelihood estimate `p`.

```
logit(p) = logit(b) + Σ_families  min( Σ_signals ln(LR), cap_family )
```

### 7.2 Starting likelihood ratios [D — uncalibrated placeholders]

| Strength | LR if fired | LR if checked and clear |
|---|---|---|
| Strong | 4.0 | 0.9 |
| Moderate | 2.0 | 0.9 |
| Weak | 1.3 | 1.0 |
| Exculpatory (operating website) | — | 0.5 when present |
| PSA (unconfirmed identity) variants | half the log-LR of the confirmed factor | 1.0 |
| Family cap | ln(8) per family | — |

### 7.3 Uncertainty range [D]

Because unchecked signals do not update the score, the report also computes:

- **Lower bound:** every unchecked signal treated as clear
- **Upper bound:** every unchecked signal treated as fired

The report shows the point estimate and this range. A wide range tells the reviewer that more data, not more suspicion, is needed.

### 7.4 Rating bands and confidence [D]

| Band | Likelihood `p` | Additional requirement |
|---|---|---|
| Low indication | < 10% | — |
| Moderate indication | 10–35% | — |
| Elevated indication | 35–70% | — |
| High indication | ≥ 70% | Fired signals must come from **at least two different families**; otherwise the band is capped at Elevated |

| Confidence | Condition |
|---|---|
| Good | Coverage ≥ 70% of categories, entity-resolution confidence high, no conflicting categories |
| Moderate | Coverage 40–70%, or one conflicting category |
| Limited | Coverage < 40%, low resolution confidence, or multiple conflicts |

**Entity-resolution confidence [D].** Every entity match records which attributes agreed (name, country, identifier, address, officer). A match on name alone is "low" and caps confidence at Limited. This follows Sayari's own guidance to never rely on name alone [V].

---

## 8. Exposure of public money

### 8.1 What can be observed [D]

The system sees only recorded flows: the prime award, reported subawards, and trade records with declared values. It cannot see bank transfers, internal accounting, or unreported payments. The report states this on its first page.

### 8.2 Exposure buckets [D]

| Bucket | Definition | Combined with others? |
|---|---|---|
| **Direct** | Award amount obligated to the recipient | Yes |
| **Flow-through** | Observed payments from the recipient to subawardees (subaward amounts) and to suppliers (declared values of goods the recipient received) | Yes |
| **Control** | Award amount held by an entity whose ownership chain includes risk-indicated owners | **No** — reported separately, because control is not a transfer of money |
| **Listed-party** | Observed dollars reaching an entity that is listed, or possibly majority-owned by listed parties | Reported separately as a priority item |

### 8.3 Calculation [D]

For each entity `e` with observed inflow `D_e`:

- `D_e` never exceeds the inflow to the entity that paid it (flows are capped upstream).
- **Risk-weighted exposure** `= Σ D_e × p_e`
- **Exposure range** `= [Σ D_e × p_e,lower , Σ D_e × p_e,upper]`
- **Observed-flow total** `= Σ D_e` (unweighted; shown for transparency)

Money flows in the opposite direction to goods. A supplier that ships goods *to* the recipient is paid *by* the recipient, so it counts as flow-through. A buyer that receives goods *from* the recipient pays the recipient, so it does **not** count as an outflow of public money.

### 8.4 Wording rule [D]

The report says "estimated risk-weighted exposure," never "money lost" or "money diverted."

---

## 9. Regulator report

### 9.1 Structure [D]

1. **Summary** — award, recipient, observed-flow total, risk-weighted exposure with range, count of entities by band, and any listed-party exposure
2. **Scope and limitations** — the paragraph in Section 8.1, data retrieval dates, coverage
3. **Paths of concern** — routes from the award to high-band or listed entities, drawn as a graph
4. **Entity findings** — for each entity: band, confidence, range, fired signals with evidence and source links, innocent explanations to rule out
5. **Source agreement** — the Section 6 index grid
6. **Method** — model, weights file version and hash, provider versions
7. **Audit appendix** — run manifest and audit-log hash

### 9.2 Language rules [D]

- Use "indicators consistent with," "risk lead," "warrants review."
- Never use "is a shell company," "laundered," "evaded," or "fraudulent" about an entity unless quoting an official source, with citation.
- Include each flag's documented innocent explanations next to it.

---

## 10. Security engineering

| Control | Implementation | Why |
|---|---|---|
| Secrets management | Keys only from environment variables or a secrets manager; `.env` git-ignored; pre-commit secret scanning | Provider credentials must not leak into the repo or reports |
| Log redaction | All logs pass through a redaction filter for known secret values | Prevent credentials in audit trails |
| Tamper-evident audit log | Append-only JSONL; each line stores the SHA-256 of the previous line; a verify command detects edits or deletions | Regulators must be able to trust what data a rating was built from |
| Response cache with integrity hashes | Each cached provider response stores its SHA-256; mismatches are logged and refetched | Reproducibility and tamper detection |
| Run manifest | Records code version, weights-file hash, provider list, retrieval timestamps, and cache hashes | Any report can be regenerated and checked |
| Untrusted web content | Text from Tavily results and extracted pages is treated as data only. It is never passed to an LLM as instructions, and it is HTML-escaped in reports. | Web pages can contain prompt-injection or script-injection content |
| Input validation | Validate award IDs, entity IDs, and HS codes against expected formats before use | Prevent malformed queries and injection |
| TLS | Certificate verification on for all provider calls | Integrity of retrieved data |
| Least data | Store only fields the report uses; no personal data beyond officer names and roles already in public registries | Data minimization |
| Access control | Reports and cache stored with role-based access; report files watermarked with reviewer and run ID | Outputs name real companies and people and are sensitive |
| Dependency hygiene | Pinned versions, `pip-audit` in CI | Supply-chain security of the tool itself |

---

## 11. Validation plan

1. **Backtest on a documented network [V case, D method].** DOJ describes Serniya Engineering and Sertal LLC as Moscow-based companies operating under Russian intelligence direction that used a network of shell companies and bank accounts worldwide, including in the United States. OFAC designated Serniya, Sertal, and several associated individuals and companies in February 2022. Method: using only records dated before the designation and indictment, check whether the system would have placed the network's US entities in the Elevated or High band.
2. **False-positive study [D].** Score a random sample of ordinary award recipients. Report the share that reaches Elevated or High. Use the result to recalibrate the base rate and likelihood ratios.
3. **Resolution audit [D].** Manually check a sample of entity matches and report the error rate.
4. **Weights governance [D].** Any change to `weights.yaml` is versioned, reviewed, and recorded in the run manifest.

---

## 12. Limitations (to state in every report)

- The system has no access to internal company records, bank data, or communications. It estimates likelihood from external records only. [D]
- Registry coverage varies by jurisdiction. Sayari's guidance notes that some US states and offshore centers may have limited or no beneficial-ownership data. [V]
- Trade records may lack declared values, and none carry unit quantities, so misinvoicing is measured per kg and is often not checkable. [V]
- Subaward data depends on prime-recipient reporting, and only first-tier subawards of $40,000 or more (contracts) or $30,000 or more (grants) must be reported. [V]
- Likelihood ratios are uncalibrated until Section 11 is completed. [D]
- Adverse-media matching can confuse entities with similar names. [D]

---

## 13. Open items to confirm before regulator use

Status as of 25 September 2026.

| # | Item | Status | Where |
|---|---|---|---|
| 1 | Tradeverifyd tool names, inputs, and output fields | **Done** for entity, annotation, path, trade and address tools. Value-chain tool outputs and route tools still to test. `find_companies_in_radius` times out | 4.3 |
| 2 | Sayari production access: MCP connector vs. API credentials, and endpoint mapping | **Done.** OAuth client credentials; all endpoints mapped. Credentials still to obtain | 4.2 |
| 3 | SAM.gov API endpoint, fields available publicly, and key requirements | **Done.** v4 endpoints; ownership fields are FOUO; 10 requests/day without a role | 4.1 |
| 4 | USAspending field name for competition status, and subaward reporting thresholds | **Done.** `extent_competed`; $40,000 contracts, $30,000 grants | 4.1 |
| 5 | Whether Sayari shipment records carry declared values and quantities for demo corridors | **Done.** Values in the 2019–2020 dataset, not the 2022 Russia dataset; no quantities | 5.4 |
| 6 | Price benchmark source for misinvoicing | **Decided [D]:** UN Comtrade unit value per kg | 5.4 |
| 7 | Validation case records available pre-designation (Serniya network) | **Done.** All 151 Sayari shipment records to Serniya-named receivers predate the 31 March 2022 designation (earliest 24 Jan 2019, latest 26 Mar 2022). USAspending shows no federal award to the network (`research/README.md`) | 5.4 |
| 8 | Any other case studies from earlier drafts (e.g., Sudan/UAE, humanitarian fronts, gold, fentanyl precursors) — verify sources before including | **Open.** Team decision whether to include any | — |

---

## 14. References

**Regulatory**
- FinCEN, Beneficial Ownership Information Reporting (interim final rule, March 2025): https://www.fincen.gov/boi
- GOV.UK, Companies House confirms identity verification rollout from 18 November 2025: https://www.gov.uk/government/news/companies-house-confirms-identity-verification-rollout-from-18-november-2025
- OFAC FAQ 398 and 399 (50 Percent Rule: ownership vs. control; aggregation): https://ofac.treasury.gov/faqs/topic/1521
- OFAC FAQ 401 (indirect ownership): https://ofac.treasury.gov/faqs/401
- BIS, Common High Priority Items List (CHPL): https://www.bis.gov/licensing/country-guidance/common-high-priority-items-list-chpl
- FinCEN and BIS Joint Alert (transshipment points): https://www.fincen.gov/system/files/shared/FinCEN%20and%20BIS%20Joint%20Alert%20FINAL.pdf
- FATF, Revision of Recommendation 25 white paper (beneficial owner definition): https://www.fatf-gafi.org/en/publications/Fatfrecommendations/R25-public-consultation.html
- ASIC, Illegal phoenix activity: https://asic.gov.au/for-business/small-business/closing-a-small-business/illegal-phoenix-activity/

**Public spending data**
- USAspending API, spending_by_award contract: https://github.com/fedspendingtransparency/usaspending-api/blob/master/usaspending_api/api_contracts/contracts/v2/search/spending_by_award.md
- USAspending API, subawards contract: https://github.com/fedspendingtransparency/usaspending-api/blob/dev/usaspending_api/api_contracts/contracts/v2/subawards.md
- USAspending API, award profile contract: https://github.com/fedspendingtransparency/usaspending-api/blob/master/usaspending_api/api_contracts/contracts/v2/awards/award_id.md

- SAM.gov Entity Management API: https://open.gsa.gov/api/entity-api/
- SAM.gov Exclusions API: https://open.gsa.gov/api/exclusions-api/
- FAR 52.204-10 (subcontract reporting clause): https://www.acquisition.gov/far/52.204-10
- FAR 4.1403 (clause threshold, $40,000): https://www.acquisition.gov/far/4.1403
- 2 CFR 170, Appendix A (subaward reporting, $30,000): https://www.ecfr.gov/current/title-2/subtitle-A/chapter-I/part-170
- UN Comtrade public API: https://comtradeapi.un.org/

**Validation case**
- DOJ, Russian military and intelligence agencies procurement network indicted in Brooklyn federal court: https://www.justice.gov/opa/pr/russian-military-and-intelligence-agencies-procurement-network-indicted-brooklyn-federal
- IRS-CI, sentencing in the same scheme (OFAC designation date): https://www.irs.gov/node/150791

**Provider documentation (retrieved through connected tools on 25 September 2026)**
- Sayari `lookup_risk_factors`: definitions for all factor IDs cited in Sections 5 and 6
- Sayari `get_investigation_guidance` (investigation type: shell company detection): methodology, co-occurring red flags, TBML price thresholds, shelf-company indicators
- Tavily MCP tool list: `tavily_search`, `tavily_extract`, `tavily_crawl`, `tavily_map`, `tavily_research`
- Tradeverifyd MCP tool definitions and test calls (Section 4.3)
- Sayari API documentation: authentication https://documentation.sayari.com/api/key-concepts/authentication and API reference https://documentation.sayari.com/api/api-reference/entity/get-entity
- Sayari `search_trade_facets` and `search_shipments` on receiver "Serniya" (Section 5.4)
