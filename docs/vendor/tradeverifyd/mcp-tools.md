# Tradeverifyd — MCP tool reference

**Source:** the `tradeverifyd` MCP server currently configured in `.mcp.json`. Recorded from
tool schemas returned by the server on 2026-09-25. No public API documentation exists;
this file is the authoritative reference for anything Tradeverifyd-related in the repo.

**Access model:** MCP only. Every tool below is invoked via the `mcp__tradeverifyd__*`
namespace. Some tools require scopes (`annotations:read`, invite permission, etc.); the
schema notes call these out inline.

**Do not** infer additional endpoints, parameters, or response fields from this file.
If a call needs something not listed here, mark it `UNCONFIRMED` and add it to the
open-questions output.

---

## 1. Entity graph — read

### `search_entities`
Search across the Tradeverifyd knowledge base by name, external identifier, or UUID.

Inputs:
- `name` (string) — company/entity name. UUID here triggers direct lookup first.
- `external_id` (string) — LEI/DUNS/etc. Tried before `name` when both are given.
- `jurisdiction` (string) — ISO 3166-1 alpha-2.
- `has_annotations` (bool) — restrict to entities with any annotation.
- `annotation_categories` (string[]) — OR-filter, e.g. `["OFAC SDN", "Forced Labor"]`. Implies `has_annotations=true`.
- `limit` (int, default 10, max 100).

At least one of `name` or `external_id` is required.

Returns: matched entities with confidence scores and hydrated data. **Exact response
shape not documented in schema — record from a live fixture before parsing.**

### `entity_details`
Inputs: `entity_id` (required).
Returns: name, aliases, legal form, jurisdiction, NAICS code, industry label, status, external identifiers.

### `entity_score`
Inputs: `entity_id` (required).
Returns: overall score, score version, level. Called the "Tradeverifyd Score".

### `entity_addresses`
Inputs:
- `entity_id` (required)
- `q`, `jurisdiction`, `location_type`, `city`, `state_province` — filters
- `page` (default 1), `page_size` (default 25, max 100).

### `entity_annotations`
Inputs: `entity_id` (required), `page`, `page_size`.
Requires `annotations:read` or `annotations:read-exists`. With `annotations:read` and a
monitored entity → full details; otherwise → **count only**.

### `entity_affiliate_relationships`
Inputs: `entity_id` (required), `direction` (`in` = parents, `out` = subsidiaries/branches, default `in`), `page`, `page_size`.

### `entity_trade_relationships`
Inputs: `entity_id` (required), `direction` (`in` = suppliers, `out` = customers, default `in`), `hs_codes` (string[], each 2–11 digits, prefix match), `page`, `page_size`.
Each relationship includes `hs_codes` — codes carried on that trade edge, sorted; empty when the edge carries no commodity codes.

### `annotated_relationship_paths`
Inputs: `entity_id` (required), `direction` (`in` | `out` | `both`, default `in`), `max_depth` (1–5, default 5), `hs_codes` (prefix filter applied only at tier 1).
Returns: hop-by-hop routes from the root to annotated (sanctioned/flagged) entities. Each hop includes the HS codes carried on its incoming edge.

### `find_companies_in_radius`
Inputs: `latitude`, `longitude`, `radius_nm` (nautical miles, ≤ 10000), `limit` (default 200, max 1000).
Returns: entity ids with distance, closest first. Shared reference data, no org scoping. Intended for disaster/event linkage.

### `resolve_company_associations`
Inputs: `name` (required).
Returns: preview of the companies a name would resolve to across countries, without monitoring. Use before `monitor_company` to check coverage.

## 2. Reference data

### `annotations_categories`
No inputs. Returns all annotation categories with `name`, `description`, `polarity`.

### `relationship_types`
No inputs. Returns relationship types grouped by affiliate and trade.

## 3. Company monitoring (org-scoped)

### `list_monitored_companies`
Inputs: `limit` (1–200), `page`, `sort` (`risk` | `name` | `added`).
Returns: monitored companies with aggregate KPIs (Tradeverifyd Score, annotations, open alerts, country count). Highest-risk first by default.

### `get_monitored_company`
Inputs: `id` (monitored-company id).
Returns: aggregate KPIs plus list of associated companies with their countries.

### `monitor_company`
Inputs: `name` (required), `countries` (ISO alpha-2[], omit/empty for all matches), `business_unit`, `tags` (string[]).

### `stop_monitoring_company`
Inputs: `id` (monitored-company id).

## 4. Trade Intelligence Agent (TIA) — reads

### `tia_quick_check`
Inputs: `query` (name, required), `jurisdiction`.
Returns: top entity match, authoritative Tradeverifyd Score (int or `null` — never a substitute), and the entity's last **settled** screening result if any. This is a **cached lookup, not a live sanctions screen**. `screening.status = "not_screened"` means never screened — **not** a clean result.

### `tia_portfolio_overview`
No inputs. Aggregate across all of the org's value chains: totals, status breakdown, chain list (with tier/country spread, jurisdictions, platform-score risk bands), portfolio-wide risk-band + geography aggregate, cross-chain concentration risks.

### `tia_list_briefings`
Inputs: `limit` (1–500, default 20).

### `tia_get_briefing`
Inputs: `briefing_id` (UUID).

### `tia_get_report`
Inputs: `report_id`. Returns report type, status, Markdown content. Cross-org reads return `NOT_FOUND`.

### `tia_diff_report`
Inputs: `report_id`, `version` (int, prior version).
Report versioning is parity-only: `status=no_versions_stored` when no comparable prior exists.

## 5. Data services (external feeds, exposed through TIA)

### `tia_get_disruptions`
Inputs: `event_types` (string[], one of `earthquake, cyclone, flood, volcano, drought, wildfire, severe_weather`), `region`, `min_severity` (`minor` | `advisory` | `warning` | `critical`), `latitude`, `longitude`, `radius_nm`.
Sources: GDACS (global) + NOAA (US).

### `tia_commodity_price`
Inputs: `symbol_or_name` (ticker like `CU` or name like `copper`).
Returns: current price, unit, 30-day and 90-day change %, trend direction.

### `tia_emissions_profile`
Inputs: `country_or_facility` (ISO3 country code or facility name).
Returns: CO2 metrics, intensity factors, reporting year, scope.

### `tia_trade_flow`
Inputs: `hs_code` (6-digit, required), `reporter` (ISO3, optional), `partner` (ISO3, optional), `years` (default 3, max 10).
Source: UN Comtrade.

### `tia_hs_trends`
Inputs: `hs_codes` (HS6[], optional), `signal_type` (`volume_surge` | `price_surge`), `limit` (default 20).
Returns: HS6 codes inflecting off their own seasonal baseline. Distinguishes volume vs. price surges.

### `tia_hs_trend_explain`
Inputs: `signal_id` (from `tia_hs_trends`).
Returns: full evidence trail — moved series, seasonal baseline, window, deviation, history depth, and what the finding cannot rule out.

### `tia_hs_trend_exposure`
Inputs: `hs_codes` (HS6[], optional), `value_chain_id` (optional), `limit` (default 10).
Returns: caller's value chains exposed to an inflecting commodity, and which suppliers sit on those chains.

## 6. Trade routes

### `tia_list_routes`
Inputs: `entity_id` (origin or destination filter), `transport_mode` (`sea` | `air` | `rail`), `include_stale` (default false), `limit` (default 50, max 200), `offset`.
Returns: persisted trade routes for the org, ranked by likelihood.

### `tia_get_route`
Inputs: `route_id` (UUID).
Returns: waypoints, chokepoints, jurisdictions transited, transit estimate, distance.

## 7. Value chains — chain-level

### `tia_create_value_chain`
Inputs: `company` (anchor, required), `product` (focus), `direction` (`upstream` | `downstream`, default `upstream`), `name` (only when the user explicitly named it), plus anchor-disambiguation fields (`anchor_choice`, `anchor_choice_country`, `anchor_choice_index`, `anchor_entity_id`), `confirm_broad` (default false).

Key behavior from schema (verbatim):
- **Dedupe by anchor + product.** If a chain already exists, returns it with `created:false`; a `name` passed here is *not* applied to an existing chain (comes back as `requested_name_ignored`; use `tia_rename_value_chain`).
- An **archived** chain does not count as existing — a new one is created and the archived one stays archived.
- **Breadth check.** A company-only chain with no `product` may return `status:"needs_narrowing"` with no chain created; `confirm_broad=true` proceeds anyway.

Runs discovery asynchronously; returns `status: discovering` immediately.

### `tia_update_value_chain`
Inputs: `value_chain_id` (required); optional `product`, `direction`, `description`, `name`.
Anchor cannot be changed; only rebuild lets you repoint.

### `tia_delete_value_chain`
Inputs: `value_chain_id`. Permanent, irreversible. `NOT_FOUND` when the id is not in the caller's org.

### `tia_rename_value_chain`
Inputs: `value_chain_id`, `name`. Renames only; id/anchor/nodes preserved.

### `tia_duplicate_value_chain`
Inputs: `value_chain_id`. Creates `<name> (copy)`; does *not* re-enroll monitoring or re-run discovery.

### `tia_archive_value_chain`
Inputs: `value_chain_id`, `restore` (default false). Archive hides + pauses auto-refresh, no data loss; restore reverses.

### `tia_get_value_chain_by_id`
Inputs: `value_chain_id`, `node_scope` (`thin` default | `all`), `limit` (default 100, max 200), `cursor`.
Nodes are paged in both scopes. `mapped_scale`, `screening_coverage`, `node_cap`, `at_node_cap` describe the whole chain regardless of page/scope. During `status: discovering` the node list is partial — do not treat empties as coverage gaps.

### `tia_get_value_chain_by_anchor`
Inputs: `legal_name`, `product`.
Match keyed on `(org, normalize(legal_name), normalize(product))`. Prefers active; returns archived only when no active match exists.

### `tia_value_chain_overview`
Inputs: `value_chain_id`, `node_scope` (`thin` default | `all`), `limit` (default 100, max 200), `cursor`.
Returns: summary (tier distribution, risk bands from platform score, screening rollup) + one page of nodes. Each node carries its Tradeverifyd Score where the platform has one; `null` otherwise (never a substitute).

### `tia_value_chain_briefing`
Inputs: `value_chain_id` (optional — omit for portfolio briefing), `refresh` (bool).
Returns: Markdown (`content_markdown`); `has_data=false` only when nothing to brief on.

### `tia_value_chain_appearances`
Inputs: `entity_id` and/or `entity_name`.
Returns: one appearance per distinct `(chain, tier)` the entity sits at, with chain id, name, chain-level product, tier.

## 8. Value chains — nodes

### `tia_add_value_chain_node`
Inputs: `value_chain_id`, `entity_name` (required); `entity_id`, `tier` (default 1), `parent_node_id` (required above tier 1 — otherwise refused with `PARENT_REQUIRED`), `role` (one of `anchor` | `supplier` | `customer`), `nickname`, `jurisdiction`.
Duplicate at same tier returns existing node with `already_on_chain: true`. Manual adds land even at node cap; the only refusal is when user-added nodes alone fill the cap.

### `tia_edit_value_chain_node`
Inputs: `value_chain_id`, `node_id`. Editable: `tier`, `role`, `nickname`.
**Refused:** `entity_name`, `jurisdiction`. Editing promotes the node to user-curated (future discovery corrections no longer applied).

### `tia_remove_value_chain_node`
Inputs: `value_chain_id`, `node_id`. Records a suppression so re-discovery won't re-add the entity.

### `tia_find_value_chain_node`
Inputs: `value_chain_id`, `name` (required), `tier` (optional), `limit` (default 10, max 20).
Use this to locate a node by company name — never page a whole chain to find one.

## 9. Ingest

### `tia_ingest_supply_chain_records`
Inputs:
- `entities` (max 200 per batch): `{ name (required), aliases[], jurisdiction, role }`
- `relationships` (max 200 per batch): `{ from, to, relationship_type (required); product, hs_code, confidence, source_reference }`
- `source` (`bom` default | `byod_roster` | `product_link`).

Caller's agent must digest the document locally — this tool takes structured records only. Raw document never reaches Tradeverifyd.

## 10. Org admin

### `tia_invite_member`
Inputs: `email` (required), `role` (required, e.g. `compliance_user`, `org_admin`), `name`.
Always scopes to the caller's own org. Requires invite permission (Organization Admin only); a Compliance User is refused with a permission error naming the scope.

---

## Known unknowns (record as `UNCONFIRMED` when used)

- Exact response field names/types for every tool (schema documents inputs, not response bodies).
- Rate limits, quotas, retry semantics.
- Which score version(s) `entity_score` / `tia_quick_check` / value-chain rollups may return.
- Auth model and scope names beyond the ones cited (`annotations:read`, `annotations:read-exists`, invite permission).
- Whether MCP calls are `REPLAY_MODE`-aware from the adapter side.
- Data retention / deletion semantics beyond `tia_delete_value_chain`.

Record actual response shapes into `/fixtures` as soon as a real call is made.
