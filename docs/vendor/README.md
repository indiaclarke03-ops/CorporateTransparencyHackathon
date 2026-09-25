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

## Refreshing

Re-download with the URLs above, then update the date, sizes and hashes in this file. A changed hash means the vendor changed its docs: check the data-source map rows that cite that file.
