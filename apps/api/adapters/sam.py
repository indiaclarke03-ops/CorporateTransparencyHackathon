"""SAM.gov Entity Management and Exclusions APIs, v4 (docs/vendor/sam/).

Key: SAM_API_KEY (api.data.gov), sent as the `api_key` query parameter. Without a SAM.gov
role the key allows 10 requests per day (backlog B22); config/datasets.yaml sets
`budgets.sam_gov.daily_limit` so the run stops cleanly before the limit.
"""
from apps.api.adapters.base import Adapter, require_env

BASE = "https://api.sam.gov/entity-information/v4"


class SamAdapter(Adapter):
    source_name = "sam_gov"
    budget_name = "sam_gov"
    license_tag = "public-domain (US government work)"
    operations = {
        "entities": {"path": "/entities"},
        "exclusions": {"path": "/exclusions"},
    }

    def _request(self, operation, params):
        key = require_env("SAM_API_KEY")["SAM_API_KEY"]
        query = dict(params)
        query["api_key"] = key
        status, text = self.http("GET", BASE + self.operations[operation]["path"], query=query)
        return status, text
