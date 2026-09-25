"""Sayari REST adapter. Endpoints and parameters: docs/vendor/sayari/openapi.yml.

Auth: POST /oauth/token with client_id, client_secret, audience "sayari.com",
grant_type "client_credentials" -> access_token (Bearer). Credentials: SAYARI_CLIENT_ID,
SAYARI_CLIENT_SECRET (backlog B25: not yet issued, so live calls report "source unavailable").

Replay: fixtures in fixtures/recorded/sayari/ were recorded through the Sayari connector
(`get_entity_profile`, `get_entity_summary` with `entity_id`). They are matched on the
entity ID alone, and `normalize_entity` maps the connector shape onto REST field names.
"""
import time
from typing import Any, Dict, Optional, Tuple

from apps.api.adapters.base import Adapter, require_env

BASE = "https://api.sayari.com"

# Traversal-family calls must always state `psa` explicitly (data-source map Q4).
TRAVERSAL = ("ubo", "downstream", "traversal", "watchlist")


class SayariAdapter(Adapter):
    source_name = "sayari"
    budget_name = "sayari"
    operations = {
        "resolution": {"method": "GET", "path": "/v1/resolution"},
        "search_entity": {"method": "GET", "path": "/v1/search/entity"},
        "entity_profile": {"method": "GET", "path": "/v1/entity/{id}"},
        "entity_summary": {"method": "GET", "path": "/v1/entity_summary/{id}"},
        "ubo": {"method": "GET", "path": "/v1/ubo/{id}"},
        "downstream": {"method": "GET", "path": "/v1/downstream/{id}"},
        "traversal": {"method": "GET", "path": "/v1/traversal/{id}"},
        "watchlist": {"method": "GET", "path": "/v1/watchlist/{id}"},
        "shortest_path": {"method": "GET", "path": "/v1/shortest_path"},
        "trade_shipments": {"method": "POST", "path": "/v1/trade/search/shipments"},
        "upstream": {"method": "GET", "path": "/v1/supply_chain/upstream/{id}"},
        "negative_news": {"method": "GET", "path": "/v1/negative_news"},
        "record": {"method": "GET", "path": "/v1/record/{id}"},
        "risk_factors": {"method": "GET", "path": "/v1/ontology/risk_factors"},
        "sources": {"method": "GET", "path": "/v1/ontology/sources"},
        "usage": {"method": "GET", "path": "/v1/usage"},
    }
    _token: Optional[Tuple[str, float]] = None

    FIXTURE_OPS = {"get_entity_profile": "entity_profile", "get_entity_summary": "entity_summary"}

    def replay_key(self, operation: str, params: Dict[str, Any]) -> Optional[str]:
        op = self.FIXTURE_OPS.get(operation, operation)
        if op in ("entity_profile", "entity_summary"):
            eid = params.get("id") or params.get("entity_id")
            return "%s|%s" % (op, eid) if eid else None
        return super().replay_key(op, params)

    def vendor_ids(self, operation, params, raw):
        return [params["id"]] if params.get("id") else []

    def _auth(self) -> Dict[str, str]:
        if self._token and self._token[1] > time.time() + 60:
            return {"Authorization": "Bearer " + self._token[0]}
        env = require_env("SAYARI_CLIENT_ID", "SAYARI_CLIENT_SECRET")
        status, text = self.http("POST", BASE + "/oauth/token", body={
            "client_id": env["SAYARI_CLIENT_ID"], "client_secret": env["SAYARI_CLIENT_SECRET"],
            "audience": "sayari.com", "grant_type": "client_credentials"})
        import json
        tok = json.loads(text) if status == 200 else {}
        if "access_token" not in tok:
            from apps.api.adapters.base import SourceUnavailable
            raise SourceUnavailable("source unavailable: sayari token request HTTP %s" % status)
        SayariAdapter._token = (tok["access_token"], time.time() + float(tok.get("expires_in", 3600)))
        return {"Authorization": "Bearer " + tok["access_token"]}

    def _request(self, operation, params):
        spec = self.operations[operation]
        p = dict(params)
        if operation in TRAVERSAL and "psa" not in p:
            raise ValueError("sayari %s: `psa` must be set explicitly (data-source map Q4)" % operation)
        path = spec["path"]
        if "{id}" in path:
            path = path.replace("{id}", str(p.pop("id")))
        headers = self._auth()
        if spec["method"] == "POST":
            query = {k: p.pop(k) for k in ("limit", "offset") if k in p}
            return self.http("POST", BASE + path, query=query, body=p, headers=headers)
        query = {k: (str(v).lower() if isinstance(v, bool) else v) for k, v in p.items()}
        return self.http("GET", BASE + path, query=query, headers=headers)


def normalize_entity(raw: Any) -> Dict[str, Any]:
    """Return REST `EntityDetails` field names whether `raw` is a REST or connector response."""
    if not isinstance(raw, dict):
        return {}
    if "entity_id" in raw and "attributes" in raw and "id" not in raw:   # connector shape
        attrs = raw.get("attributes") or {}
        risk = raw.get("risk") or {}
        rels = raw.get("relationships") or {}
        return {
            "_shape": "connector",
            "id": raw.get("entity_id"),
            "label": raw.get("label"),
            "type": raw.get("type"),
            "closed": raw.get("closed"),
            "countries": attrs.get("countries"),
            "addresses": attrs.get("addresses"),
            "identifiers": attrs.get("identifiers"),
            "names": attrs.get("names"),
            "registration_date": attrs.get("registration_date"),
            "latest_status": attrs.get("status"),
            "company_type": attrs.get("company_type"),
            "business_purpose": attrs.get("business_purpose"),
            "sanctioned": risk.get("sanctioned"),
            "pep": risk.get("pep"),
            "risk_factors": risk.get("risk_levels"),
            "relationship_count": rels.get("summary"),
            "relationships": {k: v for k, v in rels.items() if k != "summary"},
            "trade_count": raw.get("trade_count"),
            "sources": raw.get("sources"),
        }
    out = dict(raw)
    out["_shape"] = "rest"
    risk = raw.get("risk")
    out["risk_factors"] = sorted(risk.keys()) if isinstance(risk, dict) else risk
    return out
