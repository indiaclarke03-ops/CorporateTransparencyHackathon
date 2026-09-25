"""USAspending API adapter. Docs: docs/vendor/usaspending/. Free, no key."""
from apps.api.adapters.base import Adapter

BASE = "https://api.usaspending.gov"


class USAspendingAdapter(Adapter):
    source_name = "usaspending"
    budget_name = "usaspending"
    license_tag = "public-domain (US government work)"
    timeout = 150
    operations = {
        "spending_by_award": {"method": "POST", "path": "/api/v2/search/spending_by_award/"},
        "spending_by_award_count": {"method": "POST", "path": "/api/v2/search/spending_by_award_count/"},
        "spending_over_time": {"method": "POST", "path": "/api/v2/search/spending_over_time/"},
        "award_detail": {"method": "GET", "path": "/api/v2/awards/{award_id}/"},
    }

    def vendor_ids(self, operation, params, raw):
        return [params["award_id"]] if params.get("award_id") else []

    def _request(self, operation, params):
        spec = self.operations[operation]
        if spec["method"] == "GET":
            return self.http("GET", BASE + spec["path"].replace("{award_id}", str(params["award_id"])), retries=5)
        return self.http("POST", BASE + spec["path"], body=params, retries=5)
