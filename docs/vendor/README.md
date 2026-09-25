# Vendor documentation

These are the only sources for API endpoints, parameters and response fields used in this repo. Nothing here may be filled in from memory. Anything not confirmed by a file below is marked `UNCONFIRMED`.

All files were downloaded on **25 September 2026** (UTC). `sha256` shows the first 12 characters of each file's hash.

## Sayari (`sayari/`)

| File | Source URL | Size | sha256 | Notes |
|---|---|---|---|---|
| `openapi.yml` | https://fern-doc-assets.s3.amazonaws.com/openapi.yml | 1,167,232 B | c7dfaf99155c | **Primary spec.** The download link on the "API Clients → OpenAPI" page. OpenAPI 3.0.1, 65 paths, server `https://api.sayari.com` |
| `openapi-site.yaml` | https://documentation.sayari.com/openapi.yaml | 573,371 B | a2077914a11d | Same 65 paths in OpenAPI 3.1.0, linked from the site's `llms.txt`. Kept for comparison only; if the two disagree, `openapi.yml` wins until checked |
| `api-clients-open-api.md` | https://documentation.sayari.com/api/api-clients/open-api.md | 510 B | 10cfb4151bf9 | The API Clients page that gives the download link |
| `llms.txt` | https://documentation.sayari.com/llms.txt | 16,066 B | 0e28fe977814 | Documentation index |

The spec file lives on a documentation-vendor S3 bucket, not a Sayari domain. It was accepted because Sayari's own API Clients page links to it, its server URL is `https://api.sayari.com`, and its paths match the spec served on documentation.sayari.com exactly.

## Tavily (`tavily/`)

| File | Source URL | Size | sha256 | Notes |
|---|---|---|---|---|
| `llms.txt` | https://docs.tavily.com/llms.txt | 18,340 B | f7d6c09976ab | Documentation index |
| `search.md` | https://docs.tavily.com/documentation/api-reference/endpoint/search.md | 31,523 B | 009657779e61 | Search API reference, including its OpenAPI definition (`POST /search`) |
| `extract.md` | https://docs.tavily.com/documentation/api-reference/endpoint/extract.md | 17,497 B | 8f2d89bdb8b1 | Extract API reference, including its OpenAPI definition |

## Tradeverifyd (`tradeverifyd/`)

**Empty: awaiting vendor docs.** There are no public API docs, and none were searched for or reconstructed. Until the vendor's files are added here, every Tradeverifyd endpoint, parameter and field in this repo is `UNCONFIRMED: awaiting vendor docs` (backlog B1).

## Government and public sources (added for Task 1)

Official agency documentation, plus two recorded live responses where the docs page could not be saved. USAspending contracts come from the API's own repository (`raw.githubusercontent.com/fedspendingtransparency/usaspending-api/master/usaspending_api/api_contracts/contracts/v2/…`).

| File | Source URL | Size | sha256 | Notes |
|---|---|---|---|---|
| `usaspending/search_spending_by_award.md` | …/contracts/v2/search/spending_by_award.md | 17,686 B | 69d3262a78e9 | Award and subaward search fields |
| `usaspending/awards_award_id.md` | …/contracts/v2/awards/award_id.md | 48,817 B | 05ccfd684124 | Award detail, competition fields |
| `usaspending/subawards.md` | …/contracts/v2/subawards.md | 2,794 B | c31fdfb1dd49 | No subrecipient UEI in this endpoint |
| `usaspending/search_spending_by_award_count.md` | …/contracts/v2/search/spending_by_award_count.md | 8,202 B | 25c0ce3851d0 | |
| `usaspending/search_spending_by_category.md` | …/contracts/v2/search/spending_by_category.md | 8,352 B | 2c952a348259 | |
| `usaspending/search_spending_over_time.md` | …/contracts/v2/search/spending_over_time.md | 9,045 B | eba0cbad6505 | Dashboard time series |
| `usaspending/recipient_recipient_id.md` | …/contracts/v2/recipient/recipient_id.md | 7,221 B | b6dd5366c042 | |
| `sam/entity-management-api.html` | https://open.gsa.gov/api/entity-api/ | 336,185 B | c5e50389cf41 | Versions v1–v4 |
| `sam/exclusions-api.html` | https://open.gsa.gov/api/exclusions-api/ | 73,144 B | 4473870b3735 | v4 |
| `federal_register/api-sample-documents.json` | https://www.federalregister.gov/api/v1/documents.json?per_page=1&conditions[agencies][]=industry-and-security-bureau | 36,685 B | 01be2bae1da7 | **Live response**, not docs. The docs page blocked automated download (B13) |
| `trade_gov_csl/consolidated-screening-list.html` | https://www.trade.gov/consolidated-screening-list | 264,334 B | 6a554b16e3ff | Download URLs, daily update time |
| `trade_gov_csl/consolidated-csv-header.txt` | https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.csv (header row only) | 360 B | 1c5e86f79133 | Column names |
| `ofac/sanctions-list-service.html` | https://ofac.treasury.gov/sanctions-list-service | 49,720 B | df232db65a79 | Does not state file formats (B4) |
| `propublica/nonprofit-explorer-api.html` | https://projects.propublica.org/nonprofits/api | 49,378 B | 0574eadb2413 | Terms of use on a separate page (B6) |
| `bis/common-high-priority-items-list.html` | https://www.bis.gov/licensing/country-guidance/common-high-priority-items-list-chpl | 118,747 B | 27ea71d2607f | No version date on the page (B5) |
| `gleif/sample-lei-record-palantir.json` | https://api.gleif.org/api/v1/lei-records/549300UVN46B3BBDHO85 | 3,466 B | f24f5f809e97 | **Live response**, not docs |
| `companies_house/api-overview.html` | https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference | 43,702 B | 994c1ee6c5ad | Endpoint paths |

Not saved, because the page rendered only in a browser: the trade.gov CSL API docs (developer.trade.gov), the OFAC Sanctions List Service file pages (sanctionslist.ofac.treas.gov) and the Federal Register API docs. These should be saved manually.

## Refreshing

Re-download with the URLs above, then update the date, sizes and hashes in this file. A changed hash means the vendor changed its docs: check the data-source map rows that cite that file.
