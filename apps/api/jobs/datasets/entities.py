"""entities (docs/datasets.md #4): resolve seeds to Sayari entities; summarise connected ones.

Seeds (full calls): Sayari resolution by name, then an entity profile for each candidate
that carries the seed's UEI. The job never auto-selects a name-only candidate (spec §7.2):
if no candidate shares the UEI, the seed row is stored with a null entity and the candidates.
Grades follow spec §7.1 and the interim UEI rule (backlog B9).

Connected companies (summary calls): once `network_edges` exists for the run, re-running this
job adds `entity_summary` for up to `connected.max_per_seed` connected entities per seed,
closest first. Calls already made are reused, so the re-run costs only the new calls.
"""
from apps.api.adapters.sayari import normalize_entity
from apps.api.jobs.datasets.base import Call, DatasetJob, null_row

SAM_SOURCES = ("USA SAM.gov Entity Registration Database", "USA SAM.gov Entity Exclusions Database")


def entity_row(norm, base):
    return dict(base, sayari_id=norm.get("id"), label=norm.get("label"), type=norm.get("type"),
                countries=norm.get("countries"), addresses=norm.get("addresses"),
                registration_date=norm.get("registration_date"), latest_status=norm.get("latest_status"),
                closed=norm.get("closed"), sanctioned=norm.get("sanctioned"), pep=norm.get("pep"),
                risk_factors=norm.get("risk_factors"), degree=norm.get("degree"),
                relationship_count=norm.get("relationship_count"), psa_count=norm.get("psa_count"),
                trade_count=norm.get("trade_count"), company_type=norm.get("company_type"),
                business_purpose=norm.get("business_purpose"), names=norm.get("names"),
                identifiers=norm.get("identifiers"), sources=norm.get("sources"),
                response_shape=norm.get("_shape"))


def grade_for_uei(candidate_sources):
    """Interim B9 rule: a shared UEI supports grade A only when the record comes from SAM.gov."""
    return "A" if any(s in (candidate_sources or []) for s in SAM_SOURCES) else "B"


class EntitiesJob(DatasetJob):
    name = "entities"
    depends_on = ["seed_awards"]

    def plan(self, ctx):
        calls = []
        seeds, _ = ctx.seeds()
        for s in seeds:
            base = {"seed_id": s.get("seed_id"), "is_seed": True, "seed_name": s.get("recipient_name") or s.get("name"),
                    "seed_uei": s.get("recipient_uei") or s.get("uei"), "typology": s.get("typology")}
            if s.get("sayari_id"):              # fixture replay seeds are already resolved
                calls.append(Call("sayari", "entity_profile", {"id": s["sayari_id"]},
                                  meta=dict(base, match_grade=s.get("match_grade", "A"),
                                            match_basis=s.get("match_basis", "replay seed (spec appendix A)"))))
            else:
                calls.append(Call("sayari", "resolution", {"name": base["seed_name"], "limit": 5},
                                  meta=base, estimate_followups={"sayari": 1}))
        connected = self._connected_calls(ctx)
        if ctx.dry_run and ctx.rows("network_edges") is None and calls:
            # connected-company summaries are added on the second pass, after network_edges
            calls[0].estimate_followups = dict(calls[0].estimate_followups,
                sayari=calls[0].estimate_followups.get("sayari", 0) + len(seeds) * ctx.config.get("connected", {}).get("max_per_seed", 10))
        calls += connected
        return calls

    def _connected_calls(self, ctx):
        edges = ctx.rows("network_edges") or []
        per_seed = ctx.config.get("connected", {}).get("max_per_seed", 10)
        seen, calls, count = set(), [], {}
        for e in sorted(edges, key=lambda r: (r.get("hop") or 99)):
            sid, eid = e.get("seed_id"), e.get("to_entity")
            if not eid or eid == e.get("sayari_id") or eid in seen or count.get(sid, 0) >= per_seed:
                continue
            seen.add(eid)
            count[sid] = count.get(sid, 0) + 1
            calls.append(Call("sayari", "entity_summary", {"id": eid}, role="connected",
                              meta={"seed_id": sid, "is_seed": False, "hop": e.get("hop"),
                                    "connected_via": e.get("relationship_type")}))
        return calls

    def handle(self, ctx, call, rec):
        m = call.meta
        if call.operation == "resolution":
            cands = (rec.raw_response or {}).get("data") or []
            uei = m.get("seed_uei")
            matching = [c for c in cands if uei and any((i.get("value") == uei) for i in (c.get("identifiers") or []))]
            if not matching:
                row = null_row(dict(m, candidates=[{"entity_id": c.get("entity_id"), "label": c.get("label"),
                                                    "match_strength": (c.get("match_strength") or {}).get("value"),
                                                    "score": c.get("score")} for c in cands]),
                               ["sayari_id"], "no candidate shares the seed UEI; analyst selection needed (spec §7.2)")
                return [row], []
            follow = [Call("sayari", "entity_profile", {"id": c["entity_id"]},
                           meta=dict(m, match_grade=grade_for_uei(c.get("sources")), match_basis="shared UEI %s" % uei))
                      for c in matching]
            return [], follow
        norm = normalize_entity(rec.raw_response)
        return [entity_row(norm, m)], []

    def handle_missing(self, ctx, call, reason):
        return [null_row(dict(call.meta), ["sayari_id"], reason)]
