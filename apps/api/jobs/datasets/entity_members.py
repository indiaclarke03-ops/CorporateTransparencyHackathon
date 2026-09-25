"""entity_members (docs/datasets.md #5): records linked to each entity, with A-D grades.

Derived from stored entity-profile records (no external calls). Each resolved seed is one
member at its resolution grade; each Sayari `possibly_same_as` item is a further member with
its match keys. PSA members are graded from their match keys only when the key names are
known; the key vocabulary is UNCONFIRMED until a REST response is recorded (B18), so PSA
members are left ungraded with that reason rather than guessed.
"""
from apps.api.jobs.datasets.base import DatasetJob, null_row


class EntityMembersJob(DatasetJob):
    name = "entity_members"
    depends_on = ["entities"]

    def static_rows(self, ctx):
        ents = ctx.rows("entities")
        if ents is None:
            from apps.api.adapters.base import SourceUnavailable
            raise SourceUnavailable("entities has not been built for run %s" % ctx.run_id)
        rows = []
        for e in ents:
            if not e.get("sayari_id"):
                continue
            rows.append({"entity_id": e["sayari_id"], "vendor": "sayari", "vendor_entity_id": e["sayari_id"],
                         "match_grade": e.get("match_grade") if e.get("is_seed") else None,
                         "match_basis": e.get("match_basis"), "seed_id": e.get("seed_id"),
                         "source_record_id": e.get("source_record_id"),
                         **({} if e.get("is_seed") else {"null_reasons": {"match_grade": "connected entity: not resolved against a seed"}})})
            rec = ctx.record("sayari", e["source_record_id"]) if e.get("source_record_id") else None
            psa = (rec.raw_response or {}).get("possibly_same_as") if rec else None
            items = psa.get("data") if isinstance(psa, dict) else (psa if isinstance(psa, list) else [])
            for p in items or []:
                rows.append(null_row({"entity_id": e["sayari_id"], "vendor": "sayari", "vendor_entity_id": p.get("psa_id"),
                                      "label": p.get("label"), "match_keys": p.get("match_keys"), "seed_id": e.get("seed_id"),
                                      "source_record_id": e.get("source_record_id")},
                                     ["match_grade"], "possibly-same-as member; match-key vocabulary UNCONFIRMED (B18)"))
        return rows
