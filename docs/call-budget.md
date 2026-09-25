# Call budget: one full company search

Every external call made when a user searches one company, in the order the pipeline makes them. All operations come from confirmed or pilot rows in `docs/data-source-map.md`; nothing here is new.

- **Seed**: the searched company. It gets the full call set.
- **Connected**: a company found through ownership or network traversal. It gets summary calls only.

Default limits (`K`, `N` and so on) are proposals. The final values go in `config/datasets.yaml` and `config/agent.yaml`.

## Proposed defaults

| Symbol | Meaning | Default |
|---|---|---|
| `M` | Sayari records merged into the seed at Confirmed level | 1–4 (AZ Gold had 4, spec §3.2) |
| `A` | Award pages from USAspending (100 awards per page) | 1 |
| `K` | Largest awards checked in detail (competition and subawards) | 5 |
| `P` | Pages of network traversal (Sayari `limit` max 50 per call) | 1 |
| `L` | Listed parties found, each given a shortest-path call | up to 5 |
| `N` | Connected companies summarised | up to 25 |

## Seed company: full call set, in order

| # | Step | Tool (agent name) | Operation | Calls | Feeds |
|---|---|---|---|---|---|
| 1 | Resolve the name or identifier | `resolve_entity` | Sayari `GET /v1/resolution` (or `GET /v1/search/entity`) | 1 | Candidate list, spec §7.2 |
| 2 | Load each candidate the user merges | `entity_profile` | Sayari `GET /v1/entity/{id}` | `M` | Identity; ST4, LC1–LC3, PX1; possibly-same-as with match keys |
| 3 | Find federal awards | `find_awards` | USAspending `POST /api/v2/search/spending_by_award/` filtered by UEI | `A` | Public money; PM1, PM2 |
| 4 | Check how the largest awards were competed | `award_detail` | USAspending `GET /api/v2/awards/{award_id}/` | `K` | PM3 |
| 5 | Check where the largest awards went | `find_subawards` | USAspending `POST /api/v2/search/spending_by_award/` with `subawards: true` | `K` | PM4 |
| 6 | SAM.gov registration | (adapter `sam.py`) | SAM `GET /entity-information/v4/entities?ueiSAM=` | 1 | PM1 registration date, PM2 business types |
| 7 | SAM.gov exclusions | `sam_exclusions` | SAM `GET /entity-information/v4/exclusions` | 1 | PM6 |
| 8 | Owners upward | `ownership` | Sayari `GET /v1/ubo/{id}` with `psa=false` | 1 | ST1, ST2, PX3 |
| 9 | Holdings downward | `ownership` | Sayari `GET /v1/downstream/{id}` with `psa=false` | 1 | ST2 |
| 10 | Officers and linked companies, 2 hops | `network` | Sayari `GET /v1/traversal/{id}` with `psa=false`, `max_depth=2`, `limit=50` | `P` | ST3, LC4, network view; source of connected companies |
| 11 | Paths to listed parties (scoring run) | `listed_party_paths` | Sayari `GET /v1/watchlist/{id}` with `psa=false`, `sanctioned=true`, `max_depth=3` | 1 | PX2 |
| 12 | Paths to listed parties (labelling run) | `listed_party_paths` | Same call with `psa=true` | 1 | Marks paths that depend on possibly-same-as links as unconfirmed |
| 13 | Shortest path to each listed party found | `shortest_path` | Sayari `GET /v1/shortest_path` | `L` | Money trail, entity page §8.3 item 7 |
| 14 | Shipments as supplier | `trade` | Sayari `POST /v1/trade/search/shipments` with `filter.supplier_id` | 1 | TR1–TR4 |
| 15 | Shipments as buyer | `trade` | Same with `filter.buyer_id` | 1 | TR1–TR4 |
| 16 | Upstream suppliers | `trade` | Sayari `GET /v1/supply_chain/upstream/{id}` | 1 | Supply-chain view |
| 17 | Official list check | `screen_official_lists` | Local lookup in the daily CSL download | 0 per search (1 shared download per day) | PX1 cross-check |
| 18 | Web footprint | `web_presence` | Tavily `POST /search`, `topic: general` | 1 | PR1 |
| 19 | Media coverage | `web_presence` | Tavily `POST /search`, `topic: news` | 1 | PR2 |
| 20 | Sayari adverse media | `negative_news` | Sayari `GET /v1/negative_news` | 1 | PR2 |
| 21 | Registered address check | `web_presence` | Tavily `POST /search` on the address | 1 | LO2 (analyst confirms) |
| 22 | LEI parent links, only if the entity has an LEI | `lei_record` | GLEIF `GET /api/v1/lei-records/{lei}` | 0–1 | ST1 cross-check |
| 23 | Phoenix check | (application database) | No external call | 0 | LC4 |
| — | Tradeverifyd: search, details, annotations, score, trade relationships, annotated paths, companies in radius | `tradeverifyd_*` | **Blocked (B1)**: not called | 0 | LC3, LO1, TR1–TR4, PX2 once B1 is resolved |

**Seed total with defaults** (`M`=1, `A`=1, `K`=5, `P`=1, `L`=5):

| Tool | Calls (defaults) |
|---|---|
| Sayari | 1 resolution + 1 profile + 2 ownership + 1 traversal + 2 watchlist + 5 shortest path + 3 trade + 1 negative news = **16** |
| USAspending | 1 award search + 5 award detail + 5 subaward searches = **11** |
| SAM.gov | **2** |
| Tavily | **3** (general, news, address) |
| GLEIF | **0–1** |
| Tradeverifyd | **0** (blocked) |
| **Total** | **32–33** |

## Connected companies: summary calls only

Run for up to `N` companies found in steps 8–10, closest first.

| # | Step | Operation | Calls per company | Feeds |
|---|---|---|---|---|
| C1 | Summary profile | Sayari `GET /v1/entity_summary/{id}` (no relationships) | 1 | `sanctioned`, `pep`, `closed`, `registration_date`, risk flags; node labels in the network view |
| C2 | Award check, only if the summary carries a UEI | USAspending `POST /api/v2/search/spending_by_award_count/` by UEI | 0–1 | Marks connected companies that also received federal money |

**Connected total with defaults** (`N`=25): **25–50 calls**.

Connected companies never get watchlist, traversal, trade, Tavily or Tradeverifyd calls. If an analyst wants the full picture for one of them, they open it as a new seed.

## Calls made only on demand

| Trigger | Operation | Calls |
|---|---|---|
| Analyst opens a source document, or a report cites a record | Sayari `GET /v1/record/{id}` | 1 per cited record |
| A report quotes a web page | Tavily `POST /extract` | 1 per quoted page |
| First use of a risk flag in a run | Sayari `GET /v1/ontology/risk_factors` | 1, then cached |
| Sources appendix needs a registry name | Sayari `GET /v1/ontology/sources` | 1, then cached |

## Whole-search estimate

With the defaults: **about 57–83 calls** per full company search. That's 32–33 for the seed plus 25–50 for connected companies, excluding on-demand calls. Sayari and USAspending carry most of the load. Sayari's rate limits are not documented (backlog B10), so the budget in `config/datasets.yaml` should be set once they are known.
