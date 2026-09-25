"""tradeverifyd_trade (docs/datasets.md #18): trade relationships and paths to flagged parties.

Runs for Tradeverifyd entities chosen in `tradeverifyd_annotations` (name matches the seed).
An entity missing from the relationship graph returns an error: stored as not assessable.
Only path endpoints with a sanctions or export-control badge count for PX2 (archived spec
§4.3); that filter is applied by the signal engine, and the raw hops are kept here.
"""
from apps.api.adapters.tradeverifyd import tool_payload
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row


class TradeverifydTradeJob(DatasetJob):
    name = "tradeverifyd_trade"
    depends_on = ["tradeverifyd_annotations"]

    def plan(self, ctx):
        rows = ctx.rows("tradeverifyd_annotations")
        if rows is None:
            if not ctx.dry_run:
                from apps.api.adapters.base import SourceUnavailable
                raise SourceUnavailable("tradeverifyd_annotations has not been built for run %s" % ctx.run_id)
            seeds, _ = ctx.seeds()
            ids = [(s.get("seed_id"), "<tv entity id>") for s in seeds]
        else:
            ids, seen = [], set()
            for r in rows:
                if r.get("kind") == "candidate" and r.get("name_matches_seed") and r["tv_entity_id"] not in seen:
                    seen.add(r["tv_entity_id"])
                    ids.append((r.get("seed_id"), r["tv_entity_id"]))
        calls = []
        for sid, eid in ids:
            meta = {"seed_id": sid, "tv_entity_id": eid}
            for d in ("in", "out"):
                calls.append(Call("tradeverifyd", "entity_trade_relationships", {"entity_id": eid, "direction": d},
                                  meta=dict(meta, direction=d)))
            calls.append(Call("tradeverifyd", "annotated_relationship_paths",
                              {"entity_id": eid, "direction": "both", "max_depth": 2}, meta=meta))
        return calls

    def handle(self, ctx, call, rec):
        p = tool_payload(rec.raw_response)
        if isinstance(p, dict) and p.get("error"):
            return [null_row(dict(call.meta), ["value"], "not assessable: Tradeverifyd %s" % p["error"])], []
        if call.operation == "entity_trade_relationships":
            items = (p or {}).get("trade_relationships") or []
            if not items:
                return [null_row(dict(call.meta, total_records=(p or {}).get("total_records")), ["relationship"],
                                 "no trade relationships returned")], []
            return [dict(call.meta, relationship=it, hs_codes=(it or {}).get("hs_codes")) for it in items], []
        paths = (p or {}).get("paths") or []
        if not paths:
            return [null_row(dict(call.meta), ["path"], "no annotated paths returned within depth 2")], []
        return [dict(call.meta, path=pa, depth=(pa or {}).get("depth")) for pa in paths], []
