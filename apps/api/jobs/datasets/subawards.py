"""subawards (docs/datasets.md #3): first-tier subawards under each seed's contracts.

Award search with subawards=true. Which party `recipient_search_text` matches in subaward
mode is UNCONFIRMED, so rows are kept only when `Prime Award Recipient UEI` equals the seed
UEI. Only subawards of $40,000+ (contracts) or $30,000+ (grants) must be reported.
"""
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row, time_period

FIELDS = ["Sub-Award ID", "Sub-Award Amount", "Sub-Award Date", "Sub-Awardee Name", "Sub-Recipient UEI",
          "Prime Award ID", "Prime Award Recipient UEI"]


class SubawardsJob(DatasetJob):
    name = "subawards"
    depends_on = ["seed_awards"]

    def plan(self, ctx):
        seeds, _ = ctx.seeds()
        return [Call("usaspending", "spending_by_award", {
            "subawards": True,
            "filters": {"recipient_search_text": [s["recipient_uei"]], "award_type_codes": ["A", "B", "C", "D"],
                        "time_period": time_period(ctx)},
            "fields": FIELDS, "limit": 100, "page": 1, "sort": "Sub-Award Amount", "order": "desc"},
            meta={"seed_id": s.get("seed_id"), "uei": s["recipient_uei"]})
            for s in seeds if s.get("recipient_uei")]

    def handle(self, ctx, call, rec):
        uei = call.meta["uei"]
        rows = [r for r in (rec.raw_response or {}).get("results") or [] if r.get("Prime Award Recipient UEI") == uei]
        if not rows:
            return [null_row(dict(call.meta), ["sub_award_id"],
                             "no reported first-tier subawards found (reporting threshold $40,000 for contracts)")], []
        return [dict(call.meta, sub_award_id=r.get("Sub-Award ID"), amount=r.get("Sub-Award Amount"),
                     date=r.get("Sub-Award Date"), subawardee_name=r.get("Sub-Awardee Name"),
                     subrecipient_uei=r.get("Sub-Recipient UEI"), prime_award_id=r.get("Prime Award ID")) for r in rows], []
