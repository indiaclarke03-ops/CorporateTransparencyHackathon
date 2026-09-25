"""address_clusters (docs/datasets.md #19): companies found at each seed's registered address.

Sayari has no address entity type, so the count comes from an entity search on the address
text (`q`). The `fields` value that restricts the search to addresses is UNCONFIRMED (B21),
so matches may include entities that only mention the address; the row says so. Sayari's own
`mass_address_usage` flag is copied from the seed entity. Tradeverifyd's radius tool needs
coordinates and is not used (B27).
"""
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row


class AddressClustersJob(DatasetJob):
    name = "address_clusters"
    depends_on = ["entities"]

    def plan(self, ctx):
        ents, _ = ctx.seed_entities()
        calls, seen = [], set()
        for e in ents:
            addr = (e.get("addresses") or [None])[0]
            if not addr or addr in seen:
                continue
            seen.add(addr)
            calls.append(Call("sayari", "search_entity", {"q": addr, "limit": 50},
                              meta={"seed_id": e.get("seed_id"), "normalized_address": " ".join(addr.upper().split()),
                                    "sayari_mass_address_usage": "mass_address_usage" in (e.get("risk_factors") or [])}))
        return calls

    def handle(self, ctx, call, rec):
        data = (rec.raw_response or {}).get("data") or []
        ids = sorted({d.get("id") for d in data if d.get("id")})
        if not ids:
            return [null_row(dict(call.meta), ["entity_count"], "no entities returned for this address")], []
        return [dict(call.meta, entity_count=len(ids), entity_ids=ids, method="sayari search_entity q=address",
                     caveat="free-text match; address field filter UNCONFIRMED (B21)",
                     result_truncated=len(data) >= call.params["limit"])], []
