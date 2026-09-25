#!/usr/bin/env python3
"""Build the frontend's data from the repo's own files, so the site cannot drift from them.

Writes:
- public/fixtures/{serniya,palantir}.json: copies of the audited fixtures in fixtures/
- lib/generated/showcase.json: everything the /traceability page shows

The showcase contains no raw vendor responses (the repo and site are public; backlog B42):
only our own research records, counts, and metadata about recorded fixtures.

    python3 scripts/build_showcase.py
"""
import csv
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from narrative import render  # noqa: E402
from scripts import check_citations as cc  # noqa: E402


# ---- helpers ---------------------------------------------------------------------------
def read_csv(rel):
    with open(ROOT / rel, encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def md_tables(text):
    """Every markdown table in `text`, with the heading it sits under."""
    tables, heading, lines = [], None, text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("#"):
            heading = line.lstrip("#").strip()
        if line.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            header = [c.strip() for c in line.strip().strip("|").split("|")]
            rows, i = [], i + 2
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                rows.append(dict(zip(header, cells)))
                i += 1
            tables.append({"heading": heading, "columns": header, "rows": rows})
            continue
        i += 1
    return tables


def plain(md):
    """Markdown inline -> plain text for display."""
    s = re.sub(r"\*\*(.*?)\*\*", r"\1", md or "")
    s = re.sub(r"\*(.*?)\*", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", s)
    return s.replace("`", "")


def status_bucket(s):
    s = plain(s)
    for key in ("Gap", "Blocked", "Unconfirmed", "Confirmed", "Pilot", "Design", "Docs"):
        if s.startswith(key) or (" " + key) in s.split("(")[0]:
            return key
    return "Other"


def git(*args):
    try:
        return subprocess.run(["git"] + list(args), cwd=str(ROOT), capture_output=True, text=True).stdout.strip()
    except Exception:
        return ""


# ---- sections --------------------------------------------------------------------------
def sources():
    reg = json.loads((ROOT / "research" / "sources.json").read_text())
    out = []
    for sid, s in reg["sources"].items():
        findings = cc.static_findings(s["url"], s.get("name", ""))
        out.append(dict(id=sid, **{k: s.get(k) for k in ("name", "publisher", "published", "record_id", "url", "tier",
                                                           "retrieved_at", "retrieved_via", "content_verified", "note")},
                        checker=[{"level": l, "message": m} for l, m in findings]))
    tier3 = [{"url": k, "note": v} for k, v in reg.get("tier3_context_only", {}).items() if not k.startswith("_")]
    return out, tier3


def citation_audit():
    """Run the checker on the fixtures before the audit (git history) and now."""
    before_rev = git("log", "--format=%H", "-1", "--", "scripts/apply_citation_audit.py") or ""
    result = {}
    for name in ("serniya_investigation", "palantir_control"):
        path = "fixtures/%s.json" % name
        now = json.loads((ROOT / path).read_text())
        prev_text = git("show", "%s~1:%s" % (before_rev, path)) if before_rev else ""
        if not prev_text:
            prev_text = git("show", "e3b3ee5:%s" % path)
        prev = json.loads(prev_text) if prev_text else None
        result[name] = {"before": _citations(prev) if prev else None, "after": _citations(now)}
    text = (ROOT / "research" / "citation_audit.md").read_text()
    corrections = [t for t in md_tables(text)]
    return {"fixtures": result, "tables": corrections}


def _citations(d):
    items = []
    for n in d.get("nodes", []):
        for s in n.get("risk_signals", []):
            f = cc.static_findings(s.get("evidence_record"), s.get("signal_name", ""))
            items.append({"where": n["id"], "claim": s.get("signal_name"), "url": s.get("evidence_record"),
                          "source_id": s.get("source_id"), "authority": s.get("source_authority"),
                          "errors": [m for l, m in f if l == "ERROR"], "warnings": [m for l, m in f if l == "WARN"]})
    for e in d.get("edges", []):
        f = cc.static_findings(e.get("provenance_ref"), e.get("relationship_type", ""))
        items.append({"where": "%s → %s" % (e["source"], e["target"]), "claim": e.get("relationship_type"),
                      "url": e.get("provenance_ref"), "source_id": e.get("source_id"), "authority": e.get("source_authority"),
                      "errors": [m for l, m in f if l == "ERROR"], "warnings": [m for l, m in f if l == "WARN"]})
    return {"items": items, "errors": sum(len(i["errors"]) for i in items), "warnings": sum(len(i["warnings"]) for i in items)}


def data_source_map():
    text = (ROOT / "docs" / "data-source-map.md").read_text()
    tables = md_tables(text)
    needs, registry, backlog, coverage = [], [], [], []
    for t in tables:
        cols = t["columns"]
        if cols[:2] == ["Need", "Tool / dataset"] or cols[:2] == ["Panel or lane", "Tool / dataset"]:
            for r in t["rows"]:
                needs.append({"section": t["heading"], "need": plain(r.get("Need") or r.get("Panel or lane")),
                              "tool": plain(r.get("Tool / dataset")), "status": plain(r.get("Status")),
                              "bucket": status_bucket(r.get("Status"))})
        elif cols[:2] == ["Agent tool", "Backed by"]:
            registry = [{"tool": plain(r["Agent tool"]), "backed_by": plain(r["Backed by"]), "returns": plain(r["Returns"]),
                         "status": plain(r.get("Status", ""))} for r in t["rows"]]
        elif cols[:3] == ["ID", "Item", "Status (25 Sep 2026)"]:
            backlog = [{"id": r["ID"], "item": plain(r["Item"]), "status": plain(r["Status (25 Sep 2026)"])} for r in t["rows"]]
        elif cols[:2] == ["Sayari connector tool", "REST operation"]:
            coverage = [{k: plain(v) for k, v in r.items()} for r in t["rows"]]
    counts = {}
    for n in needs:
        counts[n["bucket"]] = counts.get(n["bucket"], 0) + 1
    return {"needs": needs, "status_counts": counts, "registry": registry, "backlog": backlog, "sayari_coverage": coverage}


def datasets_plan():
    text = (ROOT / "docs" / "datasets.md").read_text()
    for t in md_tables(text):
        if t["columns"][:3] == ["#", "Dataset", "Grain"]:
            return [{"n": r["#"], "dataset": plain(r["Dataset"]).replace(" (new)", ""), "grain": plain(r["Grain"]),
                     "status": plain(r["Status"])} for r in t["rows"]]
    return []


def dry_run_totals():
    from apps.api.jobs.datasets import BUILD_ORDER, JOBS
    from apps.api.jobs.datasets.base import Context, dry_run
    ctx = Context("showcase-dry-run", dry_run=True)
    per, totals = [], {}
    for name in dict.fromkeys(BUILD_ORDER):
        plan = dry_run(JOBS[name], ctx)
        row = {"dataset": name, "blocked": plan.get("blocked"), "tools": {}}
        for src, t in plan.get("totals", {}).items():
            row["tools"][src] = t["planned"] + t["estimated_followups"]
            g = totals.setdefault(src, {"planned": 0, "estimated": 0})
            g["planned"] += t["planned"]
            g["estimated"] += t["estimated_followups"]
        per.append(row)
    budgets = ctx.config.get("budgets", {})
    for src, g in totals.items():
        g["budget"] = (budgets.get(src) or {}).get("total")
        g["daily_limit"] = (budgets.get(src) or {}).get("daily_limit")
    return {"per_dataset": per, "totals": totals, "pilot_size": ctx.config["seed"]["pilot_size"],
            "typologies": {k: {"seed_count": v["seed_count"], "filters": {f: v[f] for f in
                           ("naics_codes", "program_numbers", "recipient_locations", "recipient_type_names") if v.get(f)},
                           "why": v.get("why", "").strip()} for k, v in ctx.config["seed"]["typologies"].items()},
            "date_range": ctx.config["date_range"]}


def replay_quality(run_id="replay-appendix-a"):
    """Counts from the replay run, if its output exists locally (data/ is git-ignored)."""
    from apps.api.core.provenance import DATA_DIR
    from apps.api.jobs.datasets import BUILD_ORDER
    from apps.api.storage.quality import dataset_stats
    base = DATA_DIR / "datasets"
    if not base.exists():
        return None
    out = []
    for name in dict.fromkeys(BUILD_ORDER):
        d = base / name / run_id
        rows_path = d / "rows.jsonl"
        summary = json.loads((d / "run_summary.json").read_text()) if (d / "run_summary.json").exists() else {}
        rows = [json.loads(l) for l in rows_path.read_text().splitlines() if l.strip()] if rows_path.exists() else []
        s = dataset_stats(name, rows, summary)
        s["nulls"] = [{"field": f, "reason": r, "rows": n} for (f, r), n in s["nulls"].most_common(6)]
        s["with_source_record"] = sum(1 for r in rows if r.get("source_record_id"))
        out.append(s)
    return {"run_id": run_id, "datasets": out,
            "missing_source_record_total": sum(s["missing_source_record"] for s in out)}


def dossiers():
    tpl = render.load_templates()
    srcs = render.load_sources()
    out = {}
    for case in ("serniya", "palantir"):
        data = json.loads((ROOT / "narrative" / "inputs" / ("%s.json" % case)).read_text())
        md, skips = render.render_dossier(data, tpl, srcs)
        out[case] = {"blocks": md_blocks(md), "skipped_templates": skips,
                     "rationale": [{"text": t, "cite": data.get("citations", {}).get(c, [])} for t, c in render.render_rationale(data, tpl)]}
    return out


def md_blocks(md):
    blocks, lines, i = [], md.splitlines(), 0
    while i < len(lines):
        l = lines[i]
        if not l.strip():
            i += 1
            continue
        if l.startswith("#"):
            blocks.append({"type": "heading", "level": len(l) - len(l.lstrip("#")), "text": l.lstrip("#").strip()})
        elif l.startswith("> "):
            blocks.append({"type": "notice", "text": l[2:]})
        elif l.startswith("[^"):
            m = re.match(r"\[\^(\w+)\]: (.*)", l)
            if m:
                blocks.append({"type": "footnote", "id": m.group(1), "text": m.group(2)})
        elif l.startswith("|") and i + 1 < len(lines) and lines[i + 1].startswith("|---"):
            header = [c.strip() for c in l.strip().strip("|").split("|")]
            rows, i = [], i + 2
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            blocks.append({"type": "table", "columns": header, "rows": rows})
            continue
        elif l.startswith("- "):
            items = []
            while i < len(lines) and (lines[i].startswith("- ") or lines[i].startswith("  ")):
                if lines[i].startswith("- "):
                    items.append(lines[i][2:])
                else:
                    items[-1] += "\n" + lines[i].strip()
                i += 1
            blocks.append({"type": "list", "items": items})
            continue
        else:
            blocks.append({"type": "paragraph", "text": l.rstrip()})
        i += 1
    return blocks


def recorded_fixtures():
    out = []
    for p in sorted((ROOT / "fixtures" / "recorded").glob("*/*.json")):
        rec = json.loads(p.read_text())
        out.append({"source": rec.get("source_name"), "operation": rec.get("operation"),
                    "retrieved_at": rec.get("retrieved_at"), "response_hash": (rec.get("response_hash") or "")[:19],
                    "vendor_record_ids": rec.get("vendor_record_ids") or [], "file": str(p.relative_to(ROOT))})
    return out


def vendor_docs():
    import yaml
    spec = yaml.safe_load((ROOT / "docs" / "vendor" / "sayari" / "openapi.yml").read_text())
    tv = json.loads((ROOT / "docs" / "vendor" / "tradeverifyd" / "tools-list-2026-09-25.json").read_text())
    files = [str(p.relative_to(ROOT / "docs" / "vendor")) for p in sorted((ROOT / "docs" / "vendor").rglob("*"))
             if p.is_file() and p.name not in (".gitkeep", "README.md")]
    return {"sayari_paths": len(spec["paths"]),
            "sayari_endpoints": sum(1 for v in spec["paths"].values() for m in v if m in ("get", "post", "put", "patch", "delete")),
            "tradeverifyd_tools": len(tv), "files": files}


def tests_summary():
    suites = {}
    for p in sorted((ROOT / "tests").glob("test_*.py")):
        suites[p.stem] = len(re.findall(r"^\s+def test_|^def test_", p.read_text(), re.M))
    return suites


def evidence_chain(src_list):
    """A worked example: one dossier sentence traced back to the primary record."""
    by_id = {s["id"]: s for s in src_list}
    ledger = {r["fact_id"]: r for r in read_csv("research/evidence_ledger.csv")}
    ent = {r["entity_ref"]: r for r in read_csv("research/ground_truth_entities.csv")}
    fixture = json.loads((ROOT / "fixtures" / "serniya_investigation.json").read_text())
    node = next(n for n in fixture["nodes"] if n["id"] == "ent_serniya")
    return {
        "sentence": "OOO SERNIYA INZHINIRING is listed on the OFAC SDN List under Executive Order 14024, with a designation date of 31 March 2022.",
        "template": "strongest.self_listed: \"{entity_name} is listed on the {self_list_name} under {self_list_program}, with a designation date of {self_list_date|date}.\"",
        "footnotes": ["S01", "S02"],
        "sources": [by_id["S01"], by_id["S02"]],
        "ledger_fact": ledger.get("F01"),
        "entity": ent.get("ent_serniya"),
        "fixture_signal": node["risk_signals"][0],
    }


def main():
    for src, dst in (("serniya_investigation", "serniya"), ("palantir_control", "palantir")):
        (ROOT / "public" / "fixtures" / ("%s.json" % dst)).write_text((ROOT / "fixtures" / ("%s.json" % src)).read_text())
    src_list, tier3 = sources()
    data = {
        "generated_at": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "commit": git("rev-parse", "--short", "HEAD"),
        "sources": src_list,
        "tier3": tier3,
        "ledger": read_csv("research/evidence_ledger.csv"),
        "entities": read_csv("research/ground_truth_entities.csv"),
        "false_positives": read_csv("research/false_positive_log.csv"),
        "citation_audit": citation_audit(),
        "data_source_map": data_source_map(),
        "datasets": datasets_plan(),
        "dry_run": dry_run_totals(),
        "replay": replay_quality(),
        "dossiers": dossiers(),
        "recorded_fixtures": recorded_fixtures(),
        "vendor_docs": vendor_docs(),
        "tests": tests_summary(),
        "chain": evidence_chain(src_list),
    }
    out = ROOT / "lib" / "generated" / "showcase.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1, default=str) + "\n")
    print("wrote", out.relative_to(ROOT), "(%d KB)" % (out.stat().st_size // 1024))


if __name__ == "__main__":
    main()
