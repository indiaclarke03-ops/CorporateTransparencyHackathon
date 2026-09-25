"""award_competition (docs/datasets.md #2): competition fields for the K largest contracts."""
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row

K = 5
FIELDS = ["extent_competed", "extent_competed_description", "number_of_offers_received", "solicitation_procedures",
          "solicitation_procedures_description", "other_than_full_and_open", "other_than_full_and_open_description"]


class AwardCompetitionJob(DatasetJob):
    name = "award_competition"
    depends_on = ["public_money"]

    def plan(self, ctx):
        pm = ctx.rows("public_money")
        if pm is None:
            if not ctx.dry_run:
                from apps.api.adapters.base import SourceUnavailable
                raise SourceUnavailable("public_money has not been built for run %s" % ctx.run_id)
            seeds, _ = ctx.seeds()
            return [Call("usaspending", "award_detail", {"award_id": "<generated_internal_id>"},
                         meta={"seed_id": s.get("seed_id")}) for s in seeds for _ in range(K)]
        by_seed = {}
        for r in pm:
            if r.get("program") == "contract" and r.get("generated_internal_id"):
                by_seed.setdefault(r["seed_id"], []).append(r)
        calls = []
        for sid, rows in by_seed.items():
            for r in sorted(rows, key=lambda x: -(x.get("amount") or 0))[:K]:
                calls.append(Call("usaspending", "award_detail", {"award_id": r["generated_internal_id"]},
                                  meta={"seed_id": sid, "award_id": r.get("award_id")}))
        return calls

    def handle(self, ctx, call, rec):
        d = (rec.raw_response or {}).get("latest_transaction_contract_data")
        row = dict(call.meta, generated_internal_id=call.params["award_id"])
        if not d:
            return [null_row(row, FIELDS, "not reported for this award type (null on some IDVs and BPAs)")], []
        row.update({f: d.get(f) for f in FIELDS})
        missing = [f for f in FIELDS if d.get(f) is None]
        if missing:
            row["null_reasons"] = {f: "not reported on this award" for f in missing}
        return [row], []
