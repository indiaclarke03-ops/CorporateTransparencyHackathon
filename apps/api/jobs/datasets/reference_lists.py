"""reference_lists (docs/datasets.md #16): Sayari risk-factor definitions and source catalogue,
and the BIS Common High Priority Items List (from the page saved in docs/vendor/bis/)."""
import html
import re

from apps.api.jobs.datasets.base import Call, DatasetJob, null_row

CHPL_PAGE = "docs/vendor/bis/common-high-priority-items-list.html"
RF_FIELDS = ["id", "label", "description", "categories", "level", "risk_type", "enabled", "visible"]
SRC_FIELDS = ["id", "label", "description", "country", "region", "source_type", "record_type", "source_url",
              "watchlist", "pep", "date_added"]


class ReferenceListsJob(DatasetJob):
    name = "reference_lists"

    def plan(self, ctx):
        return [Call("sayari", "risk_factors", {}, role="dataset", meta={"kind": "risk_factor"}),
                Call("sayari", "sources", {"country": "USA"}, role="dataset", meta={"kind": "source"}),
                Call("local_file", "read", {"path": CHPL_PAGE}, role="dataset", meta={"kind": "chpl"})]

    def handle(self, ctx, call, rec):
        kind = call.meta["kind"]
        raw = rec.raw_response or {}
        if kind == "chpl":
            return self._chpl(raw.get("text") or ""), []
        data = raw.get("data")
        items = list(data.values()) if isinstance(data, dict) else (data or [])
        fields = RF_FIELDS if kind == "risk_factor" else SRC_FIELDS
        rows = [dict(kind=kind, **{f: it.get(f) for f in fields}) for it in items if isinstance(it, dict)]
        return rows or [null_row({"kind": kind}, ["id"], "no items returned")], []

    def _chpl(self, page):
        text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", page)))
        rows, tier = [], None
        for m in re.finditer(r"TIER (\d(?:\.[A-Z])?)|\b(\d{4}\.\d{2})\b (.*?)(?= \d{4}\.\d{2}\b| TIER |$)", text):
            if m.group(1):
                tier = m.group(1)
            elif tier:
                rows.append({"kind": "chpl", "hs_code": m.group(2), "tier": tier, "description": m.group(3)[:200].strip(),
                             "null_reasons": {"list_version_date": "not stated on the BIS page (B5)"}})
        return rows or [null_row({"kind": "chpl"}, ["hs_code"], "no HS codes parsed from the saved BIS page")]
