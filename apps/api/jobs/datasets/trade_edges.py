"""trade_edges (docs/datasets.md #11): Sayari shipments (as supplier and as buyer) and upstream."""
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row

SHIPMENT_FIELDS = ["id", "departure_date", "arrival_date", "departure_country", "arrival_country", "transit_country",
                   "hs_codes", "product_descriptions", "product_origin", "weight", "monetary_value", "supplier",
                   "buyer", "sources", "record"]


class TradeEdgesJob(DatasetJob):
    name = "trade_edges"
    depends_on = ["entities"]

    def plan(self, ctx):
        ents, _ = ctx.seed_entities()
        calls = []
        for e in ents:
            meta = {"seed_id": e.get("seed_id"), "sayari_id": e["sayari_id"]}
            for side, key in (("supplier", "supplier_id"), ("buyer", "buyer_id")):
                calls.append(Call("sayari", "trade_shipments", {"q": "", "filter": {key: [e["sayari_id"]]}, "limit": 50},
                                  meta=dict(meta, direction=side)))
            calls.append(Call("sayari", "upstream", {"id": e["sayari_id"], "max_depth": 2, "limit": 50},
                              meta=dict(meta, direction="upstream")))
        return calls

    def handle(self, ctx, call, rec):
        raw = rec.raw_response or {}
        if call.operation == "upstream":
            # UpstreamTradeTraversalResponse: data = {entities, paths}
            paths = ((raw.get("data") or {}).get("paths") if isinstance(raw.get("data"), dict) else None) or []
            if not paths:
                return [null_row(dict(call.meta), ["upstream_path"], "no upstream supply-chain paths returned")], []
            return [dict(call.meta, upstream_path=pth, partial_results=raw.get("partial_results")) for pth in paths], []
        data = raw.get("data") or []
        if not data:
            return [null_row(dict(call.meta), ["shipment_id"], "no trade records returned (informal trade does not appear)")], []
        return [dict(call.meta, shipment_id=d.get("id"), **{f: d.get(f) for f in SHIPMENT_FIELDS if f != "id"}) for d in data], []
