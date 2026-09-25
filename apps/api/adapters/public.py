"""Free public sources: GLEIF, Federal Register, Consolidated Screening List, local files.

Endpoints: docs/data-source-map.md Q4, Q7, Q8 and docs/vendor/{gleif,federal_register,trade_gov_csl}/.
"""
import hashlib
from pathlib import Path

from apps.api.adapters.base import Adapter, SourceUnavailable
from apps.api.core.provenance import ROOT


class GleifAdapter(Adapter):
    source_name = "gleif"
    budget_name = "gleif"
    license_tag = "CC0 (GLEIF)"
    operations = {"lei_record": {}}

    def vendor_ids(self, operation, params, raw):
        return [params["lei"]]

    def _request(self, operation, params):
        return self.http("GET", "https://api.gleif.org/api/v1/lei-records/%s" % params["lei"])


class FederalRegisterAdapter(Adapter):
    source_name = "federal_register"
    budget_name = "federal_register"
    license_tag = "public-domain (US government work)"
    operations = {"documents": {}}

    def _request(self, operation, params):
        query = []
        for slug in params.get("agencies", []):
            query.append(("conditions[agencies][]", slug))
        # Only parameters seen working in a live call (docs/vendor/federal_register/api-sample-documents.json).
        # Date filters and paging are UNCONFIRMED until the API docs are saved (B13).
        if "per_page" in params:
            query.append(("per_page", params["per_page"]))
        return self.http("GET", "https://www.federalregister.gov/api/v1/documents.json", query=query)


class CslAdapter(Adapter):
    source_name = "consolidated_screening_list"
    budget_name = "consolidated_screening_list"
    license_tag = "public-domain (US government work)"
    operations = {"download_json": {}}
    timeout = 300

    def _request(self, operation, params):
        return self.http("GET", "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json")


class LocalFileAdapter(Adapter):
    """Reads a file already in the repo (e.g. the saved BIS CHPL page) as a source record."""
    source_name = "local_file"
    budget_name = "local_file"
    license_tag = "see docs/vendor/README.md"
    operations = {"read": {}}
    local_only = True

    def _request(self, operation, params):
        path = (ROOT / params["path"]).resolve()
        if ROOT not in path.parents or not path.exists():
            raise SourceUnavailable("source unavailable: file %s not found" % params["path"])
        text = path.read_text(encoding="utf-8", errors="replace")
        import json
        return 200, json.dumps({"path": params["path"], "sha256": hashlib.sha256(text.encode()).hexdigest(), "text": text})
