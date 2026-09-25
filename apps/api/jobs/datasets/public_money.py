"""public_money: awards and exclusions linked to each seed (docs/datasets.md #7)."""
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row, time_period
from apps.api.jobs.datasets.seed_awards import CONTRACT_FIELDS

EXCLUSION_FIELDS = ["ueiSAM", "exclusionType", "exclusionProgram", "excludingAgencyName",
                    "classificationType", "activateDate", "terminationDate"]


class PublicMoneyJob(DatasetJob):
    name = "public_money"
    depends_on = ["seed_awards"]

    def plan(self, ctx):
        calls = []
        seeds, _ = ctx.seeds()
        for s in seeds:
            meta = {"seed_id": s.get("seed_id"), "recipient_name": s.get("recipient_name"), "uei": s.get("recipient_uei")}
            if not s.get("recipient_uei"):
                continue            # covered by static_rows: the seed's own loan record
            calls.append(Call("usaspending", "spending_by_award", {
                "filters": {"recipient_search_text": [s["recipient_uei"]], "award_type_codes": ["A", "B", "C", "D"],
                            "time_period": time_period(ctx)},
                "fields": CONTRACT_FIELDS, "limit": 100, "page": 1, "sort": "Award Amount", "order": "desc"},
                meta=meta))
            calls.append(Call("sam_gov", "exclusions", {"ueiSAM": s["recipient_uei"]}, meta=meta))
        return calls

    def handle(self, ctx, call, rec):
        m = call.meta
        if call.source == "usaspending":
            # recipient_search_text also matches substrings, so keep exact UEI matches only
            rows = [r for r in (rec.raw_response or {}).get("results", []) if (r.get("Recipient UEI") or "") == m["uei"]]
            if not rows:
                return [null_row(dict(m, program="contract"), ["award_id"], "no record found in USAspending for this UEI")], []
            return [dict(m, program="contract", sam_dataset=None, award_id=r.get("Award ID"),
                         generated_internal_id=r.get("generated_internal_id"), amount=r.get("Award Amount"),
                         date=r.get("Start Date"), awarding_agency=r.get("Awarding Agency"),
                         naics=r.get("NAICS"), psc=r.get("PSC")) for r in rows], []
        # Envelope per the SAM Exclusions API example response: totalRecords, excludedEntity[]
        # with sections exclusionDetails, exclusionIdentification, exclusionActions, ...
        items = (rec.raw_response or {}).get("excludedEntity") or []
        if not items:
            return [null_row(dict(m, program="exclusion", sam_dataset="exclusion"), ["exclusion_details"],
                             "no record found in SAM.gov Exclusions for this UEI")], []
        return [dict(m, program="exclusion", sam_dataset="exclusion",
                     exclusion_details=it.get("exclusionDetails"),
                     exclusion_identification=it.get("exclusionIdentification"),
                     exclusion_actions=it.get("exclusionActions")) for it in items], []

    def static_rows(self, ctx):
        seeds, placeholder = ctx.seeds()
        return [] if placeholder else [
            dict(seed_id=s.get("seed_id"), recipient_name=s.get("recipient_name"), uei=None,
                 program="PPP loan", sam_dataset=None, award_id=s.get("award_id"), amount=s.get("amount"),
                 date=s.get("date"), awarding_agency=s.get("awarding_agency"),
                 source_record_id=s.get("source_record_id"),
                 null_reasons={"uei": "not present on the loan record"})
            for s in seeds if not s.get("recipient_uei") and s.get("amount_field") == "Loan Value"]

    def handle_missing(self, ctx, call, reason):
        m = call.meta
        prog = "contract" if call.source == "usaspending" else "exclusion"
        return [null_row(dict(m, program=prog), ["award_id" if prog == "contract" else "exclusion"], reason)]

