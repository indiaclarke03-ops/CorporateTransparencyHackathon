# Data-source map

Which datasets answer each question the project sets out to investigate, which tool reaches them, and which fields matter. This is also the tool registry for the agentic search layer: the agent may only call the operations listed here.

Built from `follow-the-public-dollar-spec.md` (section 9) and the team's brainstorm notes. If the repo lists questions not covered here, add rows in the same format.

## Status key

| Status | Meaning |
|---|---|
| **Pilot** | Seen in real responses during the 25 September 2026 test runs through the vendor connectors |
| **Docs** | Described in the vendor's or agency's own documentation, not yet seen in a response |
| **Unconfirmed** | Believed to exist; must be checked before code depends on it |
| **Blocked** | Waiting on a backlog item |

All Tradeverifyd rows are **Blocked** on backlog item B1 (REST API docs). The capabilities are confirmed through the connector, but the REST endpoints are not.

---

## Q1. Did federal money reach this company, and how?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Federal contract awards to a recipient | USAspending API, award search (POST `/api/v2/search/spending_by_award/`, free, no key) | Award ID, recipient name and UEI, amount, dates, awarding agency, NAICS, PSC | Docs |
| Whether the award was competed | USAspending award detail endpoint (competition fields are not in award search) | Extent competed, number of offers received, solicitation procedures | Unconfirmed: exact field names |
| Where the prime sent the money | USAspending subaward data | Subaward amount, date, subrecipient name and UEI, prime award ID | Unconfirmed: endpoint path |
| SAM.gov registration | Sayari entity profile (SAM.gov Entity Registration source); SAM.gov Entity API (free key via api.data.gov) | UEI, registration date, business types | Pilot (Sayari identifier `usa_sam_uei_number`); SAM API version Unconfirmed |
| Excluded or debarred parties | Sayari (SAM.gov Entity Exclusions source); SAM.gov Exclusions | Exclusion record, UEI | Pilot |
| PPP and SBA loans | Sayari (PPP Loan Recipient Database; SBA 504 and 7(a) sources) | Loan amount, lender, date | Docs (listed in Sayari source catalog) |
| Contract awards via Sayari | Sayari (USASpending.gov Profiles source) | Contractor profile, corporate hierarchy | Docs (listed in Sayari source catalog) |

**Not covered:** grants passed through state agencies to sub-recipients. The Feeding Our Future pilot showed these money paths do not appear.

**Signals powered:** PM1 registration-to-award gap, PM2 award size vs profile, PM3 non-competitive award, PM4 pass-through, PM6 excluded party.

---

## Q2. Does the company look like it exists to hide something?

### Ownership structure

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Owners and ultimate owners | Sayari UBO and ownership endpoints | Owner chain, share percentages where reported, owner entity type | Docs; relationship `has_shareholder` seen in Pilot |
| Chain ends at a company, not a person | Sayari UBO | Entity type of the last node | Docs |
| Layered or circular ownership | Sayari ownership and traversal | Path length, repeated entities in a path | Docs |
| Secrecy jurisdiction | Sayari entity profile | Countries; compare to a jurisdiction list in config | Pilot |

### Lifecycle

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Registration date and status | Sayari entity profile | `registration_date`, `status`, `closed` | Pilot |
| Registered around a funding program | Sayari registration date plus program start dates in config | Date comparison | Pilot (dates), config needed |
| Prior names | Tradeverifyd entity search; Sayari entity names | Aliases and former names | Pilot (Tradeverifyd `aliases`; Sayari `names`), Blocked for Tradeverifyd REST |

### Location

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Many companies at one address | Tradeverifyd find companies in radius; Sayari search by address | Count of entities at or near the address | Blocked (Tradeverifyd); Sayari address search Docs |
| Mailbox or coworking address | Tavily search on the address | Result domains and titles, reviewed by an analyst | Docs |

### Presence

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Company website and footprint | Tavily search, topic `general` | Result URLs, titles, domains; classify as official site, registry or aggregator, or media | Pilot |
| Adverse media | Tavily search; Sayari adverse-media risk factors | Tavily results; Sayari risk flags such as `law_enforcement_action`, `reputational_risk_terrorism` | Pilot |

**Signals powered:** ST1–ST4, LC1–LC3, LO1–LO2, PR1–PR2.

---

## Q3. Who does it trade with, and in what?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Shipments | Sayari trade search: shipments, suppliers, buyers | Dates, departure and arrival locations, HS codes, descriptions, weight and other measures, party risks | Docs |
| Upstream suppliers by tier | Sayari upstream trade traversal | Supplier paths | Docs |
| Trade relationships with goods codes | Tradeverifyd trade relationships (both directions) | Counterparty, HS codes per relationship | Blocked |
| Declared business vs goods shipped | Sayari entity `business_purpose` or USAspending NAICS, compared with shipment HS codes | Text and code comparison | Pilot (`business_purpose` seen) |
| High-priority goods | Shipment HS codes compared with the Common High Priority List | HS codes | Unconfirmed: current list version |
| Transshipment routing | Sayari shipment departure and arrival countries, compared with a hub list in config | Countries | Docs |
| Partner churn | Sayari shipments over time | Counterparties by period | Docs |

**Limits seen in the pilot:** neither vendor showed trade records for the AZ Gold network, although gold flows were alleged. Informal trade does not appear.

**Signals powered:** TR1–TR4.

---

## Q4. Is it connected to sanctioned or restricted parties?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| The company itself is listed | Sayari risk flags | e.g. `sanctioned_usa_ofac_sdn`, `export_controls`, `regulatory_action` | Pilot |
| Official cross-check | Consolidated Screening List API (free key from developer.trade.gov; combines Commerce, State, and Treasury lists; updated daily) | Name, list, source link | Docs |
| Official cross-check | OFAC Sanctions List Service downloads | SDN entries | Unconfirmed: download format |
| Forced-labor exposure | Sayari (DHS UFLPA Entity List source) | List membership | Docs |
| Paths to listed parties | Sayari watchlist endpoint | Paths up to the configured depth | Docs |
| Paths to flagged parties in the supply chain | Tradeverifyd annotated relationship paths | Hop-by-hop path with HS codes | Blocked |
| Tradeverifyd flags | Tradeverifyd entity annotations | Annotation categories (pilot showed `US OFAC`, `US GSA`) | Pilot, Blocked for REST |
| OFAC 50% rule | Sayari ownership percentages; Sayari risk flag `ofac_50_percent_rule` | Percentages, flag | Pilot (flag seen) |

**Important setting:** the Sayari watchlist endpoint also follows "possibly same as" links by default. The spec says unconfirmed matches cannot satisfy sanctions proximity on their own. The adapter must set this parameter explicitly for every call and record which paths depended on it.

**Signals powered:** PX1–PX3.

---

## Q5. Is a new company a closed shell reappearing (phoenix pattern)?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Closed companies and their officers and addresses | Sayari entity profile and traversal | `closed`, `status`, officers, addresses | Pilot |
| Previously flagged entities | Application database (assessments and analyst reviews) | Entity IDs, identifiers, addresses, officers | Built by the app |
| Match new companies to closed flagged ones | Compare shared officers, owners, addresses, trade partners | At least two shared identifiers required | Design |

The pilot showed person records are often split across filings, so matching must use addresses and identifiers as well as names.

**Signal powered:** LC4.

---

## Q6. Is a nonprofit acting against its stated purpose (humanitarian fronts)?

| Need | Tool / dataset | Fields | Status |
|---|---|---|---|
| Nonprofit filings | Sayari (IRS 990 source) | Officers, related entities | Docs |
| Nonprofit finances and grants | ProPublica Nonprofit Explorer API (free) | Revenue, expenses, filing history | Unconfirmed: terms and fields |
| Designated sham charities | Sayari OFAC flags; Consolidated Screening List | List membership | Docs |
| Adverse media | Tavily | Results | Docs |

**Signal powered:** PM5-style mission mismatch (to be defined as its own signal).

---

## Q7. Dashboard trends and news feed

| Panel or lane | Tool / dataset | Status |
|---|---|---|
| Federal spending in watched sectors | USAspending API | Docs |
| Sanctions and export-control actions | Federal Register API (free, no key); Consolidated Screening List | Docs |
| Commodity trade inflections | Tradeverifyd HS trends | Blocked |
| Supply-chain disruptions | Tradeverifyd disruptions | Blocked |
| Official news lane | Federal Register API | Docs |
| Media news lane | Tavily search with topic `news` | Docs |

Until B1 is resolved, the dashboard ships without the two Tradeverifyd panels.

---

## Tool registry for the agentic search layer

The agent plans which of these to call. It cannot call anything else.

| Agent tool | Backed by | Returns |
|---|---|---|
| `find_awards` | USAspending award search | Awards matching filters (agency, NAICS, PSC, dates, amount) |
| `award_detail` | USAspending award detail | Competition fields for one award |
| `find_subawards` | USAspending subawards | Subawards under one prime award |
| `resolve_entity` | Sayari resolution or search, plus identifier lookups | Candidate entities with match levels |
| `entity_profile` | Sayari entity | Identity, status, dates, risk flags, sources |
| `ownership` | Sayari UBO and ownership | Owner chains with percentages |
| `network` | Sayari traversal | Officers and linked entities within N hops |
| `listed_party_paths` | Sayari watchlist (explicit possibly-same-as setting) | Paths to listed parties |
| `trade` | Sayari shipments, suppliers, buyers, upstream traversal | Trade records with HS codes |
| `screen_official_lists` | Consolidated Screening List API | Official list matches |
| `web_presence` | Tavily search | Results classified by type |
| `tradeverifyd_*` | Tradeverifyd | Disabled until B1 |

Every call goes through the adapters, so each result is stored as a source record with provenance.

---

## Backlog items raised by this map

| ID | Item |
|---|---|
| B1 | Obtain Tradeverifyd REST API docs: OpenAPI spec, auth method, rate limits, MCP-to-REST mapping, score method, annotation categories, licensing, sample responses |
| B2 | Confirm USAspending competition field names and the subaward endpoint in the official API docs at api.usaspending.gov |
| B3 | Confirm the current SAM.gov Entity API version |
| B4 | Confirm the OFAC Sanctions List Service download format |
| B5 | Confirm the current Common High Priority List HS codes |
| B6 | Confirm ProPublica Nonprofit Explorer API terms and fields |
| B7 | Register for a free trade.gov API key for the Consolidated Screening List |
| B8 | Define the mission-mismatch signal for nonprofits |
