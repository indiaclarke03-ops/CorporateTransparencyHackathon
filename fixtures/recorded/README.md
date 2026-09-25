# Recorded fixtures

Responses recorded for the spec's Appendix A pilot cases, for replay mode (`REPLAY_MODE=true`) and for the resolution, signal and report tests in spec §12.1.

## How these were recorded

- **When:** 25 September 2026, 18:16–18:17 UTC.
- **How:** through the claude.ai Sayari connector (MCP tools `get_entity_profile` and `get_entity_summary`). Each response was extracted verbatim from the session log, not retyped.
- **Shape:** each file follows the spec §5.1 `SourceRecord` layout (`source_name`, `operation`, `request_params`, `retrieved_at`, `response_hash`, `vendor_record_ids`, `license_tag`, `raw_response`). `response_hash` is the SHA-256 of the raw response text.

**Important:** these are **connector** responses, not REST API responses. The connector reshapes data. For example, it returns `risk.risk_levels` as a list and `relationships` grouped by type, where the REST `EntityDetails` schema (`docs/vendor/sayari/openapi.yml`) differs. Adapters built against the REST spec must not parse these files directly. At M1, once Sayari API credentials are issued, record the same 17 IDs through `GET /v1/entity/{id}` and `GET /v1/entity_summary/{id}`, and keep both sets (backlog B18 in `docs/data-source-map.md`).

**Licence:** redistribution of Sayari data is unconfirmed (spec §2.10). These files are in the repo for tests only and must not be published outside the team.

## Files (`sayari/`)

### AZ Gold network (spec A.1)

| Sayari ID | Operation | Label | What the test uses it for |
|---|---|---|---|
| `RoWARA0BHg-GoWvDJFBOSg` | profile | AL ZUMOROUD AND AL YAQOOT GOLD & JEWELLERS TRADING L.L.C. | Listed entity (`sanctioned: true`, OFAC SDN 49144); registration 2020-02-20; commercial register 1708681 |
| `JpVf25RrEuLqHVqxnsWSig` | profile | AL ZUMOROUD … L.L.C (UAE registry) | Grade A merge (shares 1708681 and 880169) |
| `5_HddMOMZhSHxWUT05LMKA` | profile | AL ZUMOROUD … (SAM.gov Exclusions, UEI QV4ZZMJBEQ93) | Grade B: same full address, no shared strong identifier; `psa_` flags only; PM6 source |
| `_SIwEh3f1L3ez2dHdtMADQ` | profile | AL ZUMOROUD … (SAM.gov Exclusions, UEI K9AEAB4HFRH1) | Grade C: name and city only |
| `sAgA0QVKr-gjEAqoJvf0zg` | profile | Abu Dharr Abdul Nabi Habiballa AHMMED | Shared shareholder: one hop to the sibling companies |
| `l-hTG9hSLd7dA4za2B7CRw` | profile | Capital Tap Holding L.L.C. | OFAC SDN; officers with `position` titles |
| `XtartWzEze9a18ZDKVad8A` | profile | Capital Tap General Trading L.L.C. | OFAC SDN; `ofac_50_percent_rule`; former names (LC3) |
| `GpzoSlwJiKSXyY0Rl51-6w` | profile | Creative Python L.L.C. | OFAC SDN |
| `Aq8D2ZKjaHPMSp7ZQdQ3-w` | profile | AL JIL ALQADEM GENERAL TRADING L.L.C. | OFAC SDN |
| `dFB7YowXog_6EwiEur43RQ` | profile | Prodigious Real Estate Management Supervision Services | Not listed; `psa_sanctioned_gbr_fcdo` only. The unconfirmed-lead test: must produce a note, not a PX signal |

### Feeding Our Future (spec A.2)

| Sayari ID | Operation | Label | What the test uses it for |
|---|---|---|---|
| `S2sKpLjtsHqnJMTy6mwuTw` | profile | Feeding Our Future (Minnesota) | No enforcement flag; status active. "Absence is not innocence" test |
| `DtI-nSSPD00ZgUxoSFxKuA` | profile | Empire Cuisine And Market LLC | Registered 2020-04-01, `closed: true`, `law_enforcement_action` (LC2) |
| `EIO1Rxgq6ezyZVW2-sxPhw` | summary | Feeding Our Future Foundation (Texas) | Grade D: must never merge |
| `D-bTb1c6BNxP7FQ5o7lEkw` | summary | FEEDING OUR FUTURE INC (California) | Grade D: must never merge |
| `AWuTtca4O_lvFemdqKteeA` | summary | FEEDING OUR FUTURE (South Africa) | Grade D: must never merge |
| `FjE5JBGCPicBhwRFOYRX4A` | summary | Feeding Our Future (Texas) | Grade D: must never merge |
| `g4t3FFj3iCHXClnYPY-tiA` | summary | FEEDING OUR FUTURE, INC. (Wisconsin) | Grade D: must never merge |

## Differences from the spec's pilot notes

- `_SIwEh3f1L3ez2dHdtMADQ` comes from the **SAM.gov Exclusions** source, not only a UEI record. Its UEI (K9AEAB4HFRH1) differs from the other SAM record's (QV4ZZMJBEQ93), so the two SAM records do not match each other on an identifier.
- Sayari itself records two former names for Capital Tap General Trading L.L.C. The pilot notes credited these only to Tradeverifyd.
- `RoWARA0BHg-GoWvDJFBOSg` shows `trade_count` 0 sent and 0 received, as the pilot found.

## Not yet recorded

- Sayari watchlist, UBO and traversal responses for these IDs. The connector's watchlist tool has no `psa` setting, so the scoring and labelling runs in `docs/call-budget.md` can only be recorded through the REST API.
- Tradeverifyd responses (blocked on B1).
- Tavily web-presence responses for the pilot entities.

The earlier project fixtures (`../serniya_investigation.json`, `../palantir_control.json`) are graph-contract examples, not source records, and are unchanged.
