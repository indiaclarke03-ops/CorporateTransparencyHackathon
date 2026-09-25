# Citation audit of the current fixtures

Audited 25 September 2026 against primary records. Source IDs (S01…) refer to [`sources.json`](sources.json). Fact IDs (F01…) refer to [`evidence_ledger.csv`](evidence_ledger.csv).

`python3 scripts/check_citations.py` reproduces the automated part: it finds 5 errors in the fixtures. The rest of this file covers problems a URL check can't catch, where the link works but doesn't say what the fixture claims.

The fixtures are unchanged. Each fix below is for the fixture owner to apply.

## Serniya fixture: `fixtures/serniya_investigation.json`

### Citations to replace

| Where | Current citation | Problem | Replace with |
|---|---|---|---|
| `ent_serniya` signal "DOJ Indictment…" | bis.gov press release | A DOJ claim cited to a BIS page | S05, the indictment PDF on justice.gov |
| `person_grinin` signal "Named defendant in EDNY…" | bis.gov press release | Same | S05 |
| `ent_robintreid` signal | arnoldporter.com | Law-firm advisory (tier 3) | S02, the OFAC entry for OOO ROBIN TREID |
| `ent_majory` signal | fesenkolaw.com | Law-firm blog (tier 3) | S01 and S02 (designation), S12 (Companies House) |
| `person_krugovov` signal (delisting) | fesenkolaw.com | Tier 3 | S03, the OFAC deletions of 23 June 2026 |
| edge `person_krugovov → ent_majory` | fesenkolaw.com | Tier 3 | S01 (senior executive officer) and S12 (officer list) |
| `ent_photonpro` signal "EU and Japan…" | jy0692 | The release only says the EU and Japan took action "within the past month" | Keep, but grade B; add the EU Official Journal entry if the claim stays |
| `ent_awsstrandway` signal "Structural opacity… no digital footprint located" | bis.gov press release | An absence claim cited to a page that doesn't support it | Remove, or restate as "No record found in {source} as of {date}" with the source searched |

### Edges the sources don't support

| Edge in fixture | What the sources say | Fix |
|---|---|---|
| `ent_serniya → ent_sertal` SHARED_ADDRESS | Different OFAC addresses: Serniya is at ul. Vavilova 57A; Sertal is at ul. Yablochkova 21 (S02) | Drop it. Add **Sertal ↔ Robin Treid** SHARED_ADDRESS (F14) and **Majory ↔ Photon Pro** SHARED_ADDRESS (F15), both from S02 |
| `ent_serniya → {robintreid, majory, photonpro, inventionbridge}` BENEFICIAL_OWNER | Treasury calls these companies "utilized by Serniya", and Invention Bridge's designation basis is "owned or controlled by, **or** acted … on behalf of" (F06, F16). No source states ownership | Needs a new relationship type such as `ACTING_ON_BEHALF_OF`. BENEFICIAL_OWNER overstates what the source says |
| `ent_sertal → ent_awsstrandway` SUPPLY_CHAIN_SHIPMENT | No source records a shipment. The TDO says **Livshits owns or controls** Advanced Web Services and Strandway (F21) | Replace with `person_livshits → ent_aws` and `person_livshits → ent_strandway` (new type `OWNS_OR_CONTROLS`, or BENEFICIAL_OWNER with a note), citing S08 |

### Nodes

- **Split `ent_awsstrandway`** into `ent_aws` and `ent_strandway`. The TDO lists them as two companies at two addresses (S08).
- **Add** Alexsong Pte Ltd (Singapore), Tamara Topchi, Sergey Yershov, Viacheslav Dubrovinskiy, Boris Livshits and Vadim Yermolenko. All are in S01, S02, S08 or S10. See `ground_truth_entities.csv`.
- **Robin Treid** is typed `shell_intermediary`, but OFAC lists it directly, so `sanctioned_entity` fits better. Majory and Invention Bridge are in the same position.

### Executive rationale text

| Current text | Problem | Correct statement |
|---|---|---|
| "three individuals tied to this same 2022 action (Krugovov, Topchi, Puzyrnikova)" | Puzyrnikova was **not** in the 31 March 2022 action (F12) | "Two individuals designated in that action, Krugovov and Topchi, were removed on 23 June 2026." |
| "one defendant (Yermolenko) pleaded guilty 2024-11-01" | The primary source says only "November 2024" (F19) | "pleaded guilty in November 2024". Confirm the day from S11 in a browser |
| "front companies" in our own voice | Breaks spec §1.1 | Quote Treasury's wording, or say "companies Treasury described as used by Serniya to facilitate its procurement" |
| "a hard data gap, not a clean bill of health" | "clean" is on the banned list | "2 signals could not be assessed because…" (template `gaps.not_assessable`) |
| `root_recipient: UNRESOLVED` | Now resolvable as an absence plus exclusions | No USAspending award found (F31). SAM exclusion UEIs LF8MULLSH397 and NYCYDYP1RNJ6 (F29, grade B) |

The template-rendered replacement is section 1 of [`docs/narrative/serniya_lead_dossier.md`](../docs/narrative/serniya_lead_dossier.md).

## Palantir fixture: `fixtures/palantir_control.json`

| Where | Current | Problem | Replace with |
|---|---|---|---|
| signal "Exact UEI/CAGE identifier match" | highergov.com | Contract-data reseller (tier 3) | S16 (USAspending recipient) and S26 (Sayari, which carries the UEI, CAGE, CIK and LEI) |
| signal "NYSE-listed, SEC-disclosed" | a sam.gov **contract-opportunity** page | The page has nothing to do with the listing, and the claim is wrong: SEC EDGAR lists **Nasdaq** (F39) | S18, with the text "Nasdaq-listed (PLTR), SEC-disclosed" |
| `award_id` "Enterprise BPA 19AQMM25A1228 (awarded 2025-09-19)" | | The recipient is **PALANTIR USG INC, UEI HNN4F9JZWDY8**, and the start date is **2025-09-30** (F38) | Use a Palantir Technologies Inc. award such as N0024408C0025 (S31), or add Palantir USG Inc. as a linked node |
| "309+ prime awards … ~$2.49B … $10.52B ceiling" | | From resellers, not reproducible | 427 contracts totaling $5,335,261,774.62 from 18 agencies, 3 July 2008 to 30 September 2026 (F36; S15, S33) |
| "No OFAC/BIS/EU sanctions hits" | | Absence stated loosely | "No OFAC SDN record found in Sayari as of 25 September 2026" |
| "extensive verifiable public/media footprint" | | Characterises rather than describes | Remove |

**Control-case caveats the fixture leaves out:**

- Sayari flags a historic law-enforcement action. The likely source is the 2017 OFCCP hiring-discrimination consent decree (F40). It doesn't bear on sanctions, but it needs a line in the dossier.
- Sayari's depth-2 watchlist screen returns 9 "sanctioned" paths, all through BlackRock, CT Corporation or a trade counterparty (F41). If the Proximity signal counts those, the control case scores as a lead. The fix belongs in the scoring engine: exclude asset managers and registered agents as path intermediaries.

## Changes to the schema

1. **Separate the fetch tool from the authority.** `provenance_source: "Tavily"` on an OFAC record records how the page was retrieved, not who published it. Add `source_authority` (OFAC, BIS, DOJ, Companies House, USAspending, SEC…) plus `retrieved_at`, or point `evidence_record` at a source ID from `sources.json`.
2. **Add relationship types** `ACTING_ON_BEHALF_OF` and `OWNS_OR_CONTROLS` (or `LINKED_TO` with a free-text basis). The public records mostly state these, not beneficial ownership.
3. **Add a status field** for delisted parties (`listed | removed | never_listed`, plus a date). Krugovov and Topchi are now `removed`.
4. **`primary_typology` needs a no-finding value**, as the README already notes.

## Why "HTTP 200" isn't enough

- justice.gov served an Akamai bot-challenge page **with HTTP 200** for S06 and S11. A naive link checker marks these as live.
- Search results from justice.gov carried `?bm-verify=…` session tokens in the URL. A citation copied from search output would include a token that expires.
- dol.gov returns 403 to scripts but loads in a browser.

`check_citations.py --live` flags all three patterns, and anything it flags needs to be opened by a person.
