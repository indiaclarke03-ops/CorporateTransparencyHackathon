# Lead dossier: PALANTIR TECHNOLOGIES INC.

Identifiers: UEI FSY4LVSBGWB7; CAGE 470F5; SEC CIK 0001321655; LEI 549300UVN46B3BBDHO85  
Report ID: DRAFT-PALANTIR-20260925  
Generated: 25 September 2026  
Content hash: sha256:bee036baf5cd5db3  

> This dossier presents a risk lead for human review. It is not a finding of wrongdoing. Every statement is sourced; see the sources appendix.

## 1. Executive rationale

PALANTIR TECHNOLOGIES INC. received 427 federal contracts totaling $5,335,261,774.62 from the Department of Defense, the Department of Homeland Security, the Department of Health and Human Services, and 15 other agencies between 3 July 2008 and 30 September 2026.[^S15][^S33][^S31][^S32] The recipient was matched to corporate records at the Confirmed level using a shared UEI (FSY4LVSBGWB7).[^S16][^S26] The screen produced a composite score of 8 out of 100, with a confidence grade of A. 2 signals could not be assessed because the Tradeverifyd connection returned an authorization error (HTTP 401) and the Sayari two-link matches carry an unnamed 'sanctioned_other' flag that could not be tied to a specific list. This is a risk lead for human review, not a finding of wrongdoing.

## 2. Why this dossier was prepared

This entity was screened because an analyst selected it as a control case: a large federal contractor with public ownership disclosure.

Intended use: to help an oversight body decide whether further review is warranted.

## 3. Identity

*How this entity was identified, and how confident the match is.*

| Field | Value | Source |
|---|---|---|
| Canonical name | PALANTIR TECHNOLOGIES INC. | [^S16] |
| Other names | Palantir Technologies; Palantir Technologies Inc. Class A | [^S26] |
| UEI | FSY4LVSBGWB7 | [^S16][^S26] |
| CAGE | 470F5 | [^S26] |
| SEC CIK | 0001321655 (ticker PLTR, listed on Nasdaq) | [^S18] |
| LEI | 549300UVN46B3BBDHO85 | [^S26] |
| Registration date | 6 May 2003 | [^S26] |
| Related recipient (separate UEI) | PALANTIR USG INC, UEI HNN4F9JZWDY8, recipient of Department of State IDV 19AQMM25A1228 | [^S17] |
| Matched records | USAspending recipient 1ea8a9a4-3726-3491-9040-66950bb67606-P (Confirmed, shared UEI); Sayari entity PFV8cEKdaVI5H9Tme97ZvA (Confirmed, shared UEI and CAGE) | [^S16][^S26] |

## 4. Federal awards and loans

*Federal money received by this entity, as recorded in USAspending.gov.*

| Program | Award ID | Amount | Date | Awarding agency | Source |
|---|---|---|---|---|---|
| Contract (earliest start in window) | N0024408C0025 | $139,695.00 | 3 July 2008 | Department of Defense | [^S31] |
| Contract (order under BPA 19AQMM25A1228) | 19AQMM26F7166 | $20,439,958.00 | 30 September 2026 | Department of State | [^S32] |

The table shows 2 of 427 records. The full list is in USAspending.gov.

## 5. Signals found

The screen found no signals. Section 6 lists what was checked and what could not be checked.

## 6. Signals not found and not assessable

*What the screen checked without finding a signal, and what it could not check.*

- Listed party: no record found in Sayari (OFAC SDN screening) as of 25 September 2026.[^S26]
- Trade lanes (Tradeverifyd): not assessable because the Tradeverifyd connection returned an authorization error (HTTP 401) when queried on 25 September 2026.
- Proximity to a listed party: not assessable because the nine two-link paths Sayari returned run through a shared institutional shareholder, a shared registered agent, or a trade counterparty, to parties carrying an unnamed 'sanctioned_other' flag that could not be tied to a specific list.[^S26]

## 7. Graphs

### Money trail

This view was not produced for this dossier because the proximity check that feeds it could not be assessed (see section 6).

### Ownership chain

This view was not produced for this dossier because ownership of a listed company is reported in SEC filings, which were not parsed in this pass.

### Network

This view was not produced for this dossier because the network view was not generated in this pass.

### Supply chain

This view was not produced for this dossier because Sayari's 23 received and 4 sent shipment records have not been reviewed, and Tradeverifyd was unavailable.[^S26]

### Signal summary

- **What it shows:** Each signal the screen checks, grouped by family, marked as found, not found, or not assessable.
- **How to read it:** Select a signal to see its evidence and sources. The tier is based on how many families have signals, not on any single signal.
- **Why it matters:** No single signal indicates wrongdoing. Signals across several families are a stronger reason for review.
- **Primary reader:** All readers

## 9. Methodology and limitations

- How signals and tiers work: the screen checks a fixed set of signals grouped into seven families. A tier reflects how many families have at least one signal, not the weight of any single signal. Some signals are designed to detect patterns associated with shell or front companies, such as mass-registration addresses or ownership chains that end at a company; a signal firing does not mean an entity is one.
- Identity matching: a record is linked to the entity only when it shares an identifier (UEI, CAGE, company number, registration number or tax ID) or when an analyst confirms the link. Name-only matches are shown as possible matches (unconfirmed) and never drive a signal on their own.
- Proximity: paths through registered agents, company-formation agents, and institutional asset managers are excluded, because they connect unrelated companies at scale.
- Federal grants passed through state agencies to sub-recipients are not covered.
- Trade not recorded in customs data would not appear.
- A missing list flag means no record was found, not that none exists.
- Aggregator data (Sayari, OpenSanctions) is cited with its record ID and, where possible, corroborated against the government or registry record it was drawn from.
- Template config version: narrative_templates.yaml v1.

## 10. Sources appendix

[^S15]: [S15] USAspending.gov API: spending_by_award_count / spending_by_award. Record: POST /api/v2/search/spending_by_award_count/ filters.recipient_search_text, time_period 2007-10-01..2026-09-30. Retrieved 2026-09-25T16:58Z. https://api.usaspending.gov/api/v2/search/spending_by_award_count/
[^S33]: [S33] USAspending.gov API: spending_by_category/awarding_agency for UEI FSY4LVSBGWB7, contracts A-D, FY2008-FY2026. Record: POST /api/v2/search/spending_by_category/awarding_agency/. Retrieved 2026-09-25T17:06Z. https://api.usaspending.gov/api/v2/search/spending_by_category/awarding_agency/
[^S31]: [S31] USAspending.gov contract N0024408C0025 (earliest Palantir contract in search window). Record: CONT_AWD_N0024408C0025_9700_-NONE-_-NONE-. Retrieved 2026-09-25T17:06Z. https://www.usaspending.gov/award/CONT_AWD_N0024408C0025_9700_-NONE-_-NONE-
[^S32]: [S32] USAspending.gov contract 19AQMM26F7166 (latest-starting Palantir contract in search window). Record: CONT_AWD_19AQMM26F7166_1900_19AQMM25A1228_1900. Retrieved 2026-09-25T17:06Z. https://www.usaspending.gov/award/CONT_AWD_19AQMM26F7166_1900_19AQMM25A1228_1900
[^S16]: [S16] USAspending.gov recipient profile: PALANTIR TECHNOLOGIES INC. (UEI FSY4LVSBGWB7). Record: 1ea8a9a4-3726-3491-9040-66950bb67606-P. Retrieved 2026-09-25T16:58Z. https://www.usaspending.gov/recipient/1ea8a9a4-3726-3491-9040-66950bb67606-P/all
[^S26]: [S26] Sayari entity: PALANTIR TECHNOLOGIES INC.. Record: PFV8cEKdaVI5H9Tme97ZvA. Retrieved 2026-09-25T16:54Z. https://graph.sayari.com/resource/entity/PFV8cEKdaVI5H9Tme97ZvA
[^S18]: [S18] SEC EDGAR company record: Palantir Technologies Inc. (CIK 0001321655). Record: CIK 0001321655. Retrieved 2026-09-25T17:03Z. https://www.sec.gov/edgar/browse/?CIK=0001321655
[^S17]: [S17] USAspending.gov IDV 19AQMM25A1228 (Department of State BPA). Record: CONT_IDV_19AQMM25A1228_1900. Retrieved 2026-09-25T17:03Z. https://www.usaspending.gov/award/CONT_IDV_19AQMM25A1228_1900
