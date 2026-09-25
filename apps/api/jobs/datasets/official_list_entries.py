"""official_list_entries (docs/datasets.md #14): daily Consolidated Screening List snapshot.

Column names come from the CSV header in docs/vendor/trade_gov_csl/. The JSON download's
envelope is UNCONFIRMED until recorded, so the parser accepts either a top-level list or a
`results` list and records which it found.
"""
import datetime

from apps.api.jobs.datasets.base import Call, DatasetJob, null_row

COLUMNS = ["_id", "source", "entity_number", "type", "programs", "name", "alt_names", "addresses", "ids",
           "federal_register_notice", "start_date", "end_date", "source_list_url", "source_information_url"]


class OfficialListEntriesJob(DatasetJob):
    name = "official_list_entries"

    def plan(self, ctx):
        return [Call("consolidated_screening_list", "download_json", {"snapshot_date": datetime.date.today().isoformat()},
                     role="dataset", meta={"snapshot_date": datetime.date.today().isoformat()})]

    def handle(self, ctx, call, rec):
        raw = rec.raw_response
        items, envelope = (raw, "list") if isinstance(raw, list) else ((raw or {}).get("results"), "results")
        if not isinstance(items, list) or not items:
            return [null_row(dict(call.meta), ["name"], "download returned no entries (JSON envelope UNCONFIRMED)")], []
        return [dict(call.meta, envelope=envelope, **{c: it.get(c) for c in COLUMNS}) for it in items if isinstance(it, dict)], []
