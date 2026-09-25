"""Tradeverifyd adapter over its MCP server (docs/vendor/tradeverifyd/). There is no REST API.

Connection: TRADEVERIFYD_MCP_URL and TRADEVERIFYD_AUTHORIZATION (the value of the
Authorization header). The header is sent on each request and is never stored in a
SourceRecord. Only read-only tools are declared; monitoring, value-chain writes, ingest and
admin tools change vendor-side state and are excluded (data-source map tool registry).
"""
import json

from apps.api.adapters.base import Adapter, SourceUnavailable, require_env

READ_TOOLS = ("search_entities", "entity_details", "entity_score", "entity_annotations",
              "entity_addresses", "entity_trade_relationships", "annotated_relationship_paths",
              "entity_affiliate_relationships", "annotations_categories", "relationship_types",
              "tia_quick_check", "tia_hs_trends", "tia_hs_trend_explain", "tia_get_disruptions")


class TradeverifydAdapter(Adapter):
    source_name = "tradeverifyd"
    budget_name = "tradeverifyd"
    operations = {name: {} for name in READ_TOOLS}
    _session = None

    def _post(self, url, auth, body, sid=None):
        headers = {"Authorization": auth, "Accept": "application/json, text/event-stream"}
        if sid:
            headers["Mcp-Session-Id"] = sid
        import urllib.request
        req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                     headers=dict(headers, **{"Content-Type": "application/json"}), method="POST")
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            text = r.read().decode("utf-8", "replace")
            if "data:" in text:
                text = [l[5:].strip() for l in text.splitlines() if l.startswith("data:")][-1]
            return r.status, r.headers.get("Mcp-Session-Id"), text

    def _request(self, operation, params):
        env = require_env("TRADEVERIFYD_MCP_URL", "TRADEVERIFYD_AUTHORIZATION")
        url, auth = env["TRADEVERIFYD_MCP_URL"], env["TRADEVERIFYD_AUTHORIZATION"]
        try:
            if not TradeverifydAdapter._session:
                _, sid, _ = self._post(url, auth, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
                    "protocolVersion": "2025-03-26", "capabilities": {},
                    "clientInfo": {"name": "follow-the-public-dollar", "version": "0.1"}}})
                self._post(url, auth, {"jsonrpc": "2.0", "method": "notifications/initialized"}, sid)
                TradeverifydAdapter._session = sid
            status, _, text = self._post(url, auth, {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                                                     "params": {"name": operation, "arguments": params}},
                                         TradeverifydAdapter._session)
            return status, text
        except Exception as e:
            TradeverifydAdapter._session = None
            raise SourceUnavailable("source unavailable: tradeverifyd %s" % e.__class__.__name__)


def tool_payload(raw):
    """The JSON a Tradeverifyd tool returned, or None. A tool-level error is returned as-is."""
    try:
        return json.loads(raw["result"]["content"][0]["text"])
    except Exception:
        return None
