"""Parse Sayari traversal responses (ubo, downstream, traversal, watchlist).

Shape (docs/vendor/sayari/openapi.yml): response.data[] = {source, target, path[]}; each path
element = {entity, field, relationships}, where `field` is the relationship type connecting
the previous entity to `entity`, and relationships[<type>].values[].attributes holds
`shares` (percentage) and `position` (value) arrays.
"""
from typing import Any, Dict, List

REGISTERED_AGENT_TYPES = ("registered_agent_of", "has_registered_agent")


def hop_rows(raw: Any, root_id: str) -> List[Dict[str, Any]]:
    rows = []
    for i, item in enumerate((raw or {}).get("data") or []):
        prev = root_id
        for depth, hop in enumerate(item.get("path") or [], start=1):
            ent = hop.get("entity") or {}
            rel_type = hop.get("field")
            rel = (hop.get("relationships") or {}).get(rel_type) or {}
            pct, positions, former = [], [], rel.get("former")
            for v in rel.get("values") or []:
                attrs = v.get("attributes") or {}
                pct += [s.get("percentage") for s in attrs.get("shares") or [] if isinstance(s, dict) and s.get("percentage") is not None]
                positions += [p.get("value") for p in attrs.get("position") or [] if isinstance(p, dict) and p.get("value")]
            row = {"path_index": i, "hop": depth, "from_entity": prev, "to_entity": ent.get("id"),
                   "to_label": ent.get("label"), "to_type": ent.get("type"), "relationship_type": rel_type,
                   "percentage": max(pct) if pct else None, "positions": positions or None, "former": former,
                   "to_sanctioned": ent.get("sanctioned"), "to_closed": ent.get("closed")}
            if not pct:
                row["null_reasons"] = {"percentage": "not reported by the source for this relationship"}
            rows.append(row)
            prev = ent.get("id")
    return rows


def path_summaries(raw: Any, root_id: str) -> List[Dict[str, Any]]:
    out = []
    for i, item in enumerate((raw or {}).get("data") or []):
        hops = item.get("path") or []
        last = (hops[-1].get("entity") if hops else None) or {}
        via_agent = any(h.get("field") in REGISTERED_AGENT_TYPES for h in hops)
        out.append({"path_index": i, "target_id": last.get("id"), "target_label": last.get("label"),
                    "target_sanctioned": last.get("sanctioned"), "hop_count": len(hops),
                    "path": [{"field": h.get("field"), "entity_id": (h.get("entity") or {}).get("id")} for h in hops],
                    "signature": "|".join([root_id] + ["%s>%s" % (h.get("field"), (h.get("entity") or {}).get("id")) for h in hops]),
                    "excluded_reason": "path runs through a registered agent" if via_agent else None})
    return out


def traversal_meta(raw: Any) -> Dict[str, Any]:
    raw = raw or {}
    return {"partial_results": raw.get("partial_results"), "explored_count": raw.get("explored_count")}
