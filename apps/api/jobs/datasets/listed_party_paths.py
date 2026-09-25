"""listed_party_paths (docs/datasets.md #10).

Sayari watchlist run twice per seed: psa=false (scoring run) and psa=true (labelling run).
A path found only in the psa=true run depends on a possibly-same-as link and is labelled
unconfirmed (spec §9.2). Then one shortest-path call per listed target, up to L per seed.
"""
from apps.api.jobs.datasets._sayari_paths import path_summaries, traversal_meta
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row

SHORTEST_PATHS_PER_SEED = 5


class ListedPartyPathsJob(DatasetJob):
    name = "listed_party_paths"
    depends_on = ["entities"]

    def plan(self, ctx):
        ents, _ = ctx.seed_entities()
        calls = []
        for e in ents:
            for psa in (False, True):
                calls.append(Call("sayari", "watchlist",
                                  {"id": e["sayari_id"], "psa": psa, "sanctioned": True, "max_depth": 3, "limit": 50},
                                  meta={"seed_id": e.get("seed_id"), "sayari_id": e["sayari_id"], "psa_run": psa},
                                  estimate_followups={"sayari": SHORTEST_PATHS_PER_SEED} if not psa else {}))
        return calls

    def handle(self, ctx, call, rec):
        m = call.meta
        if call.operation == "shortest_path":
            paths = (rec.raw_response or {}).get("data") or []      # [{source, target, path}]
            if not paths:
                return [null_row(dict(m), ["shortest_hop_count"], "no path returned")], []
            return [dict(m, shortest_hop_count=len(paths[0].get("path") or []),
                         shortest_path=[{"field": h.get("field"), "entity_id": (h.get("entity") or {}).get("id")}
                                        for h in paths[0].get("path") or []])], []
        rows = [dict(m, **p, **traversal_meta(rec.raw_response)) for p in path_summaries(rec.raw_response, m["sayari_id"])]
        follow = []
        if not m["psa_run"]:
            targets = []
            for r in rows:
                if r["target_id"] and not r["excluded_reason"] and r["target_id"] not in targets:
                    targets.append(r["target_id"])
            follow = [Call("sayari", "shortest_path", {"entities": [m["sayari_id"], t]},
                           meta={"seed_id": m.get("seed_id"), "sayari_id": m["sayari_id"], "target_id": t, "kind": "shortest_path"})
                      for t in targets[:SHORTEST_PATHS_PER_SEED]]
        if not rows:
            rows = [null_row(dict(m), ["target_id"], "no path to a listed party returned by Sayari within 3 hops")]
        return rows, follow

    def finalize(self, ctx, rows):
        strict = {r["signature"] for r in rows if r.get("psa_run") is False and r.get("signature")}
        for r in rows:
            if r.get("psa_run") is True and r.get("signature"):
                r["depends_on_psa"] = r["signature"] not in strict
            elif r.get("psa_run") is False and r.get("signature"):
                r["depends_on_psa"] = False
        return rows
