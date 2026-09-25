"""seed_awards: the random draw of federal-money recipients to investigate (docs/datasets.md #1).

For each typology in config/datasets.yaml and each size band: one count call, then one
random page per seed needed, picking a random row that is not excluded. Up to 3 retries per
pick when the row is excluded or already drawn.
"""
import csv
import math

from apps.api.core.provenance import ROOT
from apps.api.jobs.datasets.base import Call, DatasetJob, pages_for, seeded_rng, time_period

CONTRACT_FIELDS = ["Award ID", "Recipient Name", "Recipient UEI", "Award Amount", "Awarding Agency",
                   "Start Date", "End Date", "NAICS", "PSC", "generated_internal_id"]
MAX_RETRIES = 3


def typology_filters(ctx, t, band=None, amount_field="award_amounts"):
    f = {"time_period": time_period(ctx, t.get("date_range_override")), "award_type_codes": t["award_type_codes"]}
    for k in ("naics_codes", "psc_codes", "program_numbers", "agencies", "recipient_locations", "recipient_type_names"):
        if t.get(k):
            f[k] = t[k]
    if band:
        f[amount_field] = [{"lower_bound": band[0], "upper_bound": band[1]}]
    return f


def excluded_ueis(ctx):
    if "excluded_ueis" in ctx.cache:
        return ctx.cache["excluded_ueis"]
    ueis = set()
    for rule in ctx.config["seed"].get("exclude", []):
        path = ROOT / rule["source"]
        if path.exists():
            with open(path, encoding="utf-8") as fh:
                for row in csv.DictReader(fh):
                    for col in ("recipient_uei", "identifiers"):
                        v = row.get(col) or ""
                        ueis.update(x for x in v.replace(";", " ").split() if len(x) == 12 and x.isalnum())
    ctx.cache["excluded_ueis"] = ueis
    return ueis


class SeedAwardsJob(DatasetJob):
    name = "seed_awards"

    def blocked(self, ctx):
        if ctx.seed_source == "fixtures":
            return "not used: seeds come from config/datasets.yaml replay_seeds (spec appendix A), not a USAspending draw"
        return None

    def plan(self, ctx):
        calls = []
        seed = ctx.config["seed"]
        for key, t in seed["typologies"].items():
            bands = t.get("size_bands_usd") or seed["size_bands_usd"]
            quota = int(math.ceil(t["seed_count"] / float(len(bands))))
            for band in bands:
                calls.append(Call("usaspending", "spending_by_award_count",
                                  {"filters": typology_filters(ctx, t, band)}, role="dataset",
                                  meta={"typology": key, "band": band, "quota": quota},
                                  estimate_followups={"usaspending": quota}))
        return calls

    def handle(self, ctx, call, rec):
        m = call.meta
        t = ctx.config["seed"]["typologies"][m["typology"]]
        if call.operation == "spending_by_award_count":
            counts = (rec.raw_response or {}).get("results") or {}
            total = sum(v for v in counts.values() if isinstance(v, int))
            pages = pages_for(total)
            if not pages:
                return [{"typology": m["typology"], "size_band": m["band"], "recipient_name": None,
                         "null_reasons": {"recipient_name": "no awards in this typology and size band"}}], []
            follow = []
            for i in range(m["quota"]):
                follow.append(self._page_call(ctx, t, m, pages, i, 0))
            return [], follow
        rows = (rec.raw_response or {}).get("results") or []
        rng = seeded_rng(ctx, m["typology"], m["band"], m["pick"], m["attempt"], "row")
        seen = ctx.cache.setdefault("seen_recipients", set())
        candidates = [r for r in rows if self._eligible(ctx, t, r, seen)]
        if not candidates:
            if m["attempt"] + 1 < MAX_RETRIES:
                return [], [self._page_call(ctx, t, m, m["pages"], m["pick"], m["attempt"] + 1)]
            return [{"typology": m["typology"], "size_band": m["band"], "recipient_name": None,
                     "null_reasons": {"recipient_name": "no eligible recipient after %d random pages" % MAX_RETRIES}}], []
        r = rng.choice(candidates)
        seen.add((r.get("Recipient UEI") or r.get("Recipient Name") or "").upper())
        loan = "Loan Value" in r
        row = {
            "seed_id": "%s-%s-%d" % (m["typology"], m["band"][0], m["pick"]),
            "typology": m["typology"],
            "recipient_name": r.get("Recipient Name"),
            "recipient_uei": r.get("Recipient UEI"),
            "award_id": r.get("Award ID"),
            "generated_internal_id": r.get("generated_internal_id"),
            "amount": r.get("Loan Value") if loan else r.get("Award Amount"),
            "amount_field": "Loan Value" if loan else "Award Amount",
            "date": r.get("Issued Date") if loan else r.get("Start Date"),
            "awarding_agency": r.get("Awarding Agency"),
            "naics": r.get("NAICS"), "psc": r.get("PSC"),
            "assistance_listings": r.get("Assistance Listings"),
            "size_band": m["band"], "draw": {"page": call.params["page"], "attempt": m["attempt"]},
        }
        if not row["recipient_uei"]:
            row["null_reasons"] = {"recipient_uei": "not present on the award record"}
        return [row], []

    def _page_call(self, ctx, t, m, pages, pick, attempt):
        page = seeded_rng(ctx, m["typology"], m["band"], pick, attempt).randint(1, pages)
        return Call("usaspending", "spending_by_award", {
            "filters": typology_filters(ctx, t, m["band"]), "fields": t.get("fields") or CONTRACT_FIELDS,
            "limit": 100, "page": page, "sort": t.get("fields") and "Loan Value" or "Award Amount", "order": "desc"},
            role="dataset", meta=dict(m, pages=pages, pick=pick, attempt=attempt))

    def _eligible(self, ctx, t, r, seen):
        name = (r.get("Recipient Name") or "").upper()
        uei = (r.get("Recipient UEI") or "").upper()
        if not name or (uei or name) in seen:
            return False
        if uei and uei in excluded_ueis(ctx):
            return False
        return not any(s in name for s in t.get("exclude_recipient_name_contains", []))

    def finalize(self, ctx, rows):
        # keep exactly seed_count per typology (bands may over-draw by rounding)
        keep, count = [], {}
        for r in rows:
            k = r["typology"]
            if r.get("recipient_name") is None:
                keep.append(r)
                continue
            n = ctx.config["seed"]["typologies"][k]["seed_count"]
            if count.get(k, 0) < n:
                count[k] = count.get(k, 0) + 1
                keep.append(r)
        return keep
