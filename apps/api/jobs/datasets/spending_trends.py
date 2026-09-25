"""spending_trends (docs/datasets.md #15): federal obligations over time per watched typology sector."""
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row
from apps.api.jobs.datasets.seed_awards import typology_filters


class SpendingTrendsJob(DatasetJob):
    name = "spending_trends"

    def plan(self, ctx):
        return [Call("usaspending", "spending_over_time", {"group": "fiscal_year", "filters": typology_filters(ctx, t)},
                     role="dataset", meta={"typology": k})
                for k, t in ctx.config["seed"]["typologies"].items()]

    def handle(self, ctx, call, rec):
        res = (rec.raw_response or {}).get("results") or []
        if not res:
            return [null_row(dict(call.meta), ["aggregated_amount"], "no spending returned for this sector")], []
        return [dict(call.meta, group="fiscal_year", time_period=r.get("time_period"),
                     aggregated_amount=r.get("aggregated_amount")) for r in res], []
