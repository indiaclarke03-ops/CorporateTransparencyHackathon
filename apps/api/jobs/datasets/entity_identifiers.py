"""entity_identifiers (docs/datasets.md #6).

From stored Sayari profiles (no call), plus SAM.gov Entity API v4 by UEI and GLEIF by LEI.
Weak identifiers (Sayari `WeakIdentifierType`: cage, usa_sam_uei_number) are marked (B9).
"""
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row

WEAK = {"cage", "usa_sam_uei_number"}   # docs/vendor/sayari/openapi.yml WeakIdentifierType


class EntityIdentifiersJob(DatasetJob):
    name = "entity_identifiers"
    depends_on = ["entities"]

    def _ents(self, ctx):
        ents = ctx.rows("entities")
        if ents is None:
            if ctx.dry_run:
                seeds, _ = ctx.seed_entities()
                return [dict(s, seed_uei=s.get("recipient_uei"), is_seed=True) for s in seeds]
            from apps.api.adapters.base import SourceUnavailable
            raise SourceUnavailable("entities has not been built for run %s" % ctx.run_id)
        return [e for e in ents if e.get("sayari_id")]

    def static_rows(self, ctx):
        rows = []
        for e in self._ents(ctx):
            for i in e.get("identifiers") or []:
                rows.append({"entity_id": e["sayari_id"], "scheme": i.get("type"), "value": i.get("value"),
                             "is_weak": i.get("type") in WEAK, "vendor": "sayari",
                             "source_record_id": e.get("source_record_id")})
        return rows

    def plan(self, ctx):
        calls, seen = [], set()
        for e in self._ents(ctx):
            uei = e.get("seed_uei") if e.get("is_seed") else None
            if uei and uei not in seen:
                seen.add(uei)
                calls.append(Call("sam_gov", "entities", {"ueiSAM": uei}, meta={"entity_id": e["sayari_id"], "uei": uei}))
            for i in e.get("identifiers") or []:
                if i.get("type") == "lei" and i.get("value") not in seen:
                    seen.add(i["value"])
                    calls.append(Call("gleif", "lei_record", {"lei": i["value"]}, meta={"entity_id": e["sayari_id"]}))
        return calls

    def handle(self, ctx, call, rec):
        m = call.meta
        if call.source == "gleif":
            a = ((rec.raw_response or {}).get("data") or {}).get("attributes") or {}
            ent = a.get("entity") or {}
            return [{"entity_id": m["entity_id"], "scheme": "lei", "value": call.params["lei"], "vendor": "gleif",
                     "legal_name": (ent.get("legalName") or {}).get("name"), "jurisdiction": ent.get("jurisdiction"),
                     "status": ent.get("status"), "is_weak": False}], []
        # SAM entity response envelope is UNCONFIRMED until a response is recorded; keep the UEI
        # queried and point to the stored record rather than guessing field paths.
        return [{"entity_id": m["entity_id"], "scheme": "usa_sam_uei_number", "value": m["uei"], "vendor": "sam_gov",
                 "is_weak": True, "null_reasons": {"sam_fields": "SAM entity response fields UNCONFIRMED until recorded"}}], []

    def handle_missing(self, ctx, call, reason):
        return [null_row(dict(call.meta, vendor=call.source), ["value"], reason)]
