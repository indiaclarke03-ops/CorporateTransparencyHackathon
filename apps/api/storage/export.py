"""Export a dataset run to data/datasets/<name>/<run_id>/ (Task 2d item 2).

Writes `rows.parquet` (pyarrow; nested values stored as JSON text so every file has a stable
flat schema) and `manifest.json` with: dataset, run ID, config version, seed definition,
calls made per tool, rows written, retrieval time range, failures, and source-record IDs.
Then loads the run into PostgreSQL when DATABASE_URL is set (item 1).
"""
import json
from typing import Any, Dict, List

from apps.api.core.provenance import SourceRecordStore
from apps.api.storage import db


def _flatten(rows: List[Dict[str, Any]]) -> Dict[str, List[Any]]:
    cols = sorted({k for r in rows for k in r})
    out = {}
    for c in cols:
        vals = [r.get(c) for r in rows]
        kinds = {type(v) for v in vals if v is not None}
        if kinds <= {bool} or kinds <= {int} or kinds <= {str}:
            out[c] = vals
        elif kinds <= {int, float}:
            out[c] = [float(v) if v is not None else None for v in vals]
        else:
            out[c] = [json.dumps(v, ensure_ascii=False, sort_keys=True) if v is not None else None for v in vals]
    return out


def write_parquet(rows: List[Dict[str, Any]], path) -> str:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        return "not written: pyarrow not installed (see requirements.txt)"
    table = pa.table(_flatten(rows)) if rows else pa.table({"_empty": pa.array([], pa.string())})
    pq.write_table(table, str(path))
    return "written"


def export_run(ctx, dataset: str) -> Dict[str, Any]:
    out = ctx.out_dir(dataset)
    rows = ctx.rows(dataset) or []
    summary_path = out / "run_summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else {}
    store = SourceRecordStore(ctx.data_dir / "source_records")
    rec_ids = sorted({r["source_record_id"] for r in rows if r.get("source_record_id")})
    records, calls, times = [], {}, []
    for rid in rec_ids:
        rec = None
        for src in (p.name for p in store.root.iterdir() if p.is_dir()):
            rec = store.get(src, rid)
            if rec:
                break
        if rec:
            records.append(rec.to_json())
            key = rec.source_name + (" (replayed)" if rec.replayed_from else "")
            calls[key] = calls.get(key, 0) + 1
            if rec.retrieved_at:
                times.append(rec.retrieved_at)
    seed_def = ({"source": "replay_seeds (spec appendix A)", "seeds": [s.get("seed_id") for s in ctx.config.get("replay_seeds", [])]}
                if ctx.seed_source == "fixtures" else {"source": "config/datasets.yaml seed", **ctx.config.get("seed", {})})
    manifest = {
        "dataset": dataset,
        "run_id": ctx.run_id,
        "config_version": ctx.config.get("config_version"),
        "status": summary.get("status"),
        "replay_mode": ctx.replay,
        "seed_definition": seed_def,
        "calls_per_tool": calls,
        "rows_written": len(rows),
        "retrieval_time_range": {"first": min(times) if times else None, "last": max(times) if times else None},
        "failures": summary.get("failures", []),
        "source_record_ids": rec_ids,
    }
    manifest["parquet"] = write_parquet(rows, out / "rows.parquet")
    loader = db.connect()
    if loader is None:
        manifest["postgres"] = "not loaded: DATABASE_URL not set (backlog B33)"
    else:
        loader.init_schema()
        loader.load_source_records(records)
        loader.load_dataset(dataset, ctx.run_id, rows, manifest)
        manifest["postgres"] = "loaded"
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    return manifest
