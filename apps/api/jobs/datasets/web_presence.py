"""web_presence (docs/datasets.md #12): Tavily results for each seed's name and address.

Result text is untrusted web content: stored as data only. `result_type` uses simple,
provisional domain rules; anything unmatched is left for an analyst ("unclassified").
Tavily returns no publisher field, so `publisher` is the URL domain (B15).
"""
from urllib.parse import urlparse

from apps.api.jobs.datasets.base import Call, DatasetJob, norm_name, null_row

REGISTRY_AGGREGATORS = ("opencorporates.com", "bizapedia.com", "dnb.com", "zoominfo.com", "sam.gov",
                        "usaspending.gov", "highergov.com", "govtribe.com", "find-and-update.company-information.service.gov.uk")


def classify(domain, seed_name):
    if any(domain == d or domain.endswith("." + d) for d in REGISTRY_AGGREGATORS):
        return "registry_or_aggregator"
    tokens = [t for t in norm_name(seed_name).lower().split() if len(t) >= 5]
    if tokens and any(t in domain.replace("-", "") for t in tokens):
        return "possible_official_site"
    return "unclassified"


class WebPresenceJob(DatasetJob):
    name = "web_presence"
    depends_on = ["seed_awards"]

    def plan(self, ctx):
        seeds, _ = ctx.seeds()
        ents = {e.get("seed_id"): e for e in (ctx.rows("entities") or []) if e.get("is_seed")}
        calls = []
        for s in seeds:
            name = s.get("recipient_name") or s.get("name")
            meta = {"seed_id": s.get("seed_id"), "seed_name": name}
            calls.append(Call("tavily", "search", {"query": '"%s"' % name, "topic": "general", "max_results": 5},
                              meta=dict(meta, query_kind="name")))
            addrs = (ents.get(s.get("seed_id")) or {}).get("addresses") or []
            if addrs:
                calls.append(Call("tavily", "search", {"query": addrs[0], "topic": "general", "max_results": 5},
                                  meta=dict(meta, query_kind="address", address=addrs[0])))
            elif ctx.dry_run:
                calls.append(Call("tavily", "search", {"query": "<registered address>", "topic": "general", "max_results": 5},
                                  meta=dict(meta, query_kind="address")))
        return calls

    def handle(self, ctx, call, rec):
        results = (rec.raw_response or {}).get("results") or []
        if not results:
            return [null_row(dict(call.meta), ["url"], "Tavily search ran and returned no results")], []
        rows = []
        for r in results:
            domain = urlparse(r.get("url") or "").netloc.lower().replace("www.", "")
            rows.append(dict(call.meta, url=r.get("url"), title=r.get("title"), content=r.get("content"),
                             score=r.get("score"), favicon=r.get("favicon"), publisher=domain,
                             result_type=classify(domain, call.meta["seed_name"])))
        return rows, []

    def handle_missing(self, ctx, call, reason):
        # PR1 must be "not assessable" when the search did not run (spec §9.2)
        return [null_row(dict(call.meta, search_ran=False), ["url"], reason)]
