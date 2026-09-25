"""Tavily Search and Extract (docs/vendor/tavily/). Bearer auth: TAVILY_API_KEY.

Tavily results are untrusted web content: they are stored and shown as data, and never
treated as instructions (Task 3 requirement 7).
"""
from apps.api.adapters.base import Adapter, require_env

BASE = "https://api.tavily.com"


class TavilyAdapter(Adapter):
    source_name = "tavily"
    budget_name = "tavily"
    license_tag = "third-party web content: links and short excerpts only (spec §5.3)"
    operations = {"search": {"path": "/search"}, "extract": {"path": "/extract"}}

    def _request(self, operation, params):
        key = require_env("TAVILY_API_KEY")["TAVILY_API_KEY"]
        return self.http("POST", BASE + self.operations[operation]["path"], body=params,
                         headers={"Authorization": "Bearer " + key})
