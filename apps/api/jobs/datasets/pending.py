"""Datasets that cannot be built by a data job yet. Each reports why, in the dry run and the build."""
from apps.api.jobs.datasets.base import DatasetJob


class SignalsJob(DatasetJob):
    name = "signals"
    depends_on = ["public_money", "entities", "ownership_edges", "network_edges", "listed_party_paths",
                  "trade_edges", "web_presence", "tradeverifyd_annotations", "tradeverifyd_trade", "address_clusters"]

    def blocked(self, ctx):
        return "derived dataset: computed by the signal engine (build plan M4), which does not exist yet; no external calls"


class AssessmentsJob(DatasetJob):
    name = "assessments"
    depends_on = ["signals"]

    def blocked(self, ctx):
        return "derived dataset: tier and combined score (spec §9.3-9.4) come from `signals`, not built yet (M4)"


class BacktestCandidatesJob(DatasetJob):
    name = "backtest_candidates"

    def blocked(self, ctx):
        return ("blocked: B26 (Sayari search syntax for filtering by source and risk factor is UNCONFIRMED) "
                "and B25 (Sayari REST credentials). Candidates also need your approval before use")
