"""tradeverifyd_annotations (docs/datasets.md #17), through the Tradeverifyd MCP server.

search_entities per seed. A candidate is followed up (annotations and score) when its name or
one of its aliases shares at least 80% of the seed name's words (normalized, legal suffixes
removed) and, if the seed's country is known, its jurisdiction matches. At most 3 candidates
per seed are followed up. Tradeverifyd's `confidence` is recorded but never used to choose
(it was 1 for every Palantir hit, B28). Grades: similar name + matching jurisdiction = C;
similar name only = D (spec §7.1). Neither merges automatically.
"""
from apps.api.adapters.tradeverifyd import tool_payload
from apps.api.jobs.datasets.base import Call, DatasetJob, norm_name, null_row


def name_similarity(seed_name, names):
    """Share of the seed name's words found in the best-matching candidate name or alias."""
    seed = set(norm_name(seed_name).split()) - {"TRADING", "GENERAL", "GROUP", "HOLDING", "HOLDINGS"}
    if not seed:
        return 0.0
    best = 0.0
    for n in names:
        words = set(norm_name(n).split())
        if words:
            best = max(best, len(seed & words) / float(len(seed)))
    return best


class TradeverifydAnnotationsJob(DatasetJob):
    name = "tradeverifyd_annotations"
    depends_on = ["seed_awards"]

    def plan(self, ctx):
        seeds, _ = ctx.seeds()
        calls = []
        for s in seeds:
            name = s.get("tv_query") or s.get("recipient_name") or s.get("name")
            calls.append(Call("tradeverifyd", "search_entities", {"name": name, "limit": 5},
                              meta={"seed_id": s.get("seed_id"), "seed_name": name, "seed_country": s.get("country")},
                              estimate_followups={"tradeverifyd": 2}))
        return calls

    def handle(self, ctx, call, rec):
        m, p = call.meta, tool_payload(rec.raw_response)
        if call.operation == "search_entities":
            results = (p or {}).get("results") or []
            if not results:
                return [null_row(dict(m, kind="candidate"), ["tv_entity_id"], "no match returned by Tradeverifyd")], []
            rows, follow = [], []
            for r in results:
                sim = name_similarity(m["seed_name"], [r.get("name")] + list(r.get("aliases") or []))
                country_ok = (not m.get("seed_country")) or r.get("jurisdiction") == m["seed_country"]
                same = sim >= 0.8 and country_ok
                grade = ("C" if m.get("seed_country") else "D") if same else None
                rows.append(dict(m, kind="candidate", tv_entity_id=r.get("entity_id"), tv_name=r.get("name"),
                                 jurisdiction=r.get("jurisdiction"), aliases=r.get("aliases"),
                                 confidence=r.get("confidence"), confidence_version=(p or {}).get("confidence_version"),
                                 annotations=r.get("annotations"), annotation_count=r.get("annotation_count"),
                                 name_similarity=round(sim, 2), name_matches_seed=same, match_grade=grade))
                if same and len(follow) < 6:
                    for tool in ("entity_annotations", "entity_score"):
                        follow.append(Call("tradeverifyd", tool, {"entity_id": r["entity_id"]},
                                           meta={"seed_id": m.get("seed_id"), "tv_entity_id": r["entity_id"]}))
            return rows, follow
        if isinstance(p, dict) and p.get("error"):
            return [null_row(dict(m, kind=call.operation), ["value"], "Tradeverifyd: %s" % p["error"])], []
        if call.operation == "entity_score":
            return [dict(m, kind="score", tradeverifyd_score=(p or {}).get("tradeverifyd_score"),
                         score_level=(p or {}).get("score_level"), score_version=(p or {}).get("score_version"))], []
        anns = (p or {}).get("annotations") or []
        if not anns:
            return [null_row(dict(m, kind="annotation"), ["annotation_id"], "no annotations returned (details may need annotations:read)")], []
        return [dict(m, kind="annotation", **{k: a.get(k) for k in
                ("annotation_id", "name", "description", "polarity", "valid_from", "created_at", "category_url")}) for a in anns], []
