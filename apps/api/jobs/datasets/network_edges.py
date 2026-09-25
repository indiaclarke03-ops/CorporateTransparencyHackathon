"""network_edges (docs/datasets.md #9): Sayari traversal within 2 hops, psa=false."""
from apps.api.jobs.datasets._sayari_paths import hop_rows, traversal_meta
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row


class NetworkEdgesJob(DatasetJob):
    name = "network_edges"
    depends_on = ["entities"]

    def plan(self, ctx):
        ents, _ = ctx.seed_entities()
        hops = ctx.config.get("connected", {}).get("max_hops", 2)
        return [Call("sayari", "traversal", {"id": e["sayari_id"], "psa": False, "max_depth": hops, "limit": 50},
                     meta={"seed_id": e.get("seed_id"), "sayari_id": e["sayari_id"]}) for e in ents]

    def handle(self, ctx, call, rec):
        rows = [dict(call.meta, **r, **traversal_meta(rec.raw_response)) for r in hop_rows(rec.raw_response, call.meta["sayari_id"])]
        if not rows:
            return [null_row(dict(call.meta), ["to_entity"], "no relationships returned by Sayari within the hop limit")], []
        return rows, []
