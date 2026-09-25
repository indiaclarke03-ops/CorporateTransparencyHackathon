"""ownership_edges (docs/datasets.md #8): Sayari UBO (upward) and downstream, psa=false."""
from apps.api.jobs.datasets._sayari_paths import hop_rows, traversal_meta
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row


class OwnershipEdgesJob(DatasetJob):
    name = "ownership_edges"
    depends_on = ["entities"]

    def plan(self, ctx):
        ents, _ = ctx.seed_entities()
        calls = []
        for e in ents:
            meta = {"seed_id": e.get("seed_id"), "sayari_id": e["sayari_id"]}
            for op in ("ubo", "downstream"):
                calls.append(Call("sayari", op, {"id": e["sayari_id"], "psa": False, "max_depth": 3, "limit": 50},
                                  meta=dict(meta, direction="up" if op == "ubo" else "down")))
        return calls

    def handle(self, ctx, call, rec):
        rows = [dict(call.meta, **r, **traversal_meta(rec.raw_response)) for r in hop_rows(rec.raw_response, call.meta["sayari_id"])]
        if call.operation == "ubo":
            last = {}
            for r in rows:
                last[r["path_index"]] = r
            for r in last.values():
                r["ends_at_legal_person"] = r.get("to_type") not in (None, "person")
        if not rows:
            return [null_row(dict(call.meta), ["to_entity"], "no ownership records returned by Sayari")], []
        return rows, []
