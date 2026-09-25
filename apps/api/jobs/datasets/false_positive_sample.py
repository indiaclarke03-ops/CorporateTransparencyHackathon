"""false_positive_sample (docs/datasets.md #23): random ordinary contractors (spec §12.3).

Keeps the candidates already in research/control_candidates.csv (read as a stored source
record) and draws the rest from USAspending with the control-rows guide's size bands, until
`false_positive_sample.target` is reached. Screening columns are filled by analysts, not here.
"""
import csv
import io
import math

from apps.api.jobs.datasets.base import Call, DatasetJob, pages_for, seeded_rng, time_period
from apps.api.jobs.datasets.seed_awards import CONTRACT_FIELDS

CANDIDATES = "research/control_candidates.csv"


class FalsePositiveSampleJob(DatasetJob):
    name = "false_positive_sample"

    def _existing(self):
        from apps.api.core.provenance import ROOT
        p = ROOT / CANDIDATES
        if not p.exists():
            return []
        with open(p, encoding="utf-8") as fh:
            return list(csv.DictReader(fh))

    def plan(self, ctx):
        cfg = ctx.config.get("false_positive_sample", {})
        need = max(0, cfg.get("target", 50) - len(self._existing()))
        bands = ctx.config["seed"]["size_bands_usd"]
        quota = int(math.ceil(need / float(len(bands)))) if need else 0
        calls = [Call("local_file", "read", {"path": CANDIDATES}, role="dataset", meta={"kind": "existing"})]
        for band in bands:
            if quota:
                calls.append(Call("usaspending", "spending_by_award_count", {"filters": self._filters(ctx, band)},
                                  role="dataset", meta={"kind": "count", "band": band, "quota": quota},
                                  estimate_followups={"usaspending": quota}))
        return calls

    def _filters(self, ctx, band):
        return {"time_period": time_period(ctx), "award_type_codes": ["A", "B", "C", "D"],
                "award_amounts": [{"lower_bound": band[0], "upper_bound": band[1]}]}

    def handle(self, ctx, call, rec):
        m = call.meta
        if m["kind"] == "existing":
            rows = list(csv.DictReader(io.StringIO((rec.raw_response or {}).get("text") or "")))
            seen = ctx.cache.setdefault("fp_seen", set())
            seen.update(r.get("recipient_uei") for r in rows)
            return [dict(r, origin="research/control_candidates.csv") for r in rows], []
        if m["kind"] == "count":
            total = sum(v for v in ((rec.raw_response or {}).get("results") or {}).values() if isinstance(v, int))
            pages = pages_for(total)
            return [], [Call("usaspending", "spending_by_award", {
                "filters": self._filters(ctx, m["band"]), "fields": CONTRACT_FIELDS, "limit": 100,
                "page": seeded_rng(ctx, "fp", m["band"], i).randint(1, pages), "sort": "Award Amount", "order": "desc"},
                role="dataset", meta={"kind": "page", "band": m["band"], "pick": i}) for i in range(m["quota"])] if pages else []
        seen = ctx.cache.setdefault("fp_seen", set())
        rows = [r for r in (rec.raw_response or {}).get("results") or [] if r.get("Recipient UEI") and r["Recipient UEI"] not in seen]
        if not rows:
            return [], []
        r = seeded_rng(ctx, "fp-row", m["band"], m["pick"]).choice(rows)
        seen.add(r["Recipient UEI"])
        return [{"recipient_name": r.get("Recipient Name"), "recipient_uei": r.get("Recipient UEI"),
                 "award_id": r.get("Award ID"), "award_amount": r.get("Award Amount"),
                 "awarding_agency": r.get("Awarding Agency"), "start_date": r.get("Start Date"),
                 "size_band": m["band"], "origin": "drawn by false_positive_sample job",
                 "screen_result": None, "null_reasons": {"screen_result": "not yet screened by an analyst"}}], []
