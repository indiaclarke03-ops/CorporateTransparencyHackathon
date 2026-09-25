"""Dataset job framework (Task 2c).

A job plans external calls, runs them through the adapters, and turns each stored source
record into dataset rows. Rules enforced here:

- **Dry run** (`--dry-run`): lists planned calls and totals per tool; no adapter is created
  and nothing is called. Follow-up calls that depend on a response are counted as estimates.
- **Seeds vs connected companies**: seeds get the full call set; connected companies get
  summary calls only (docs/call-budget.md). Jobs mark each call with its `role`.
- **Budgets**: an adapter raises BudgetExceeded before a call would pass the limit in
  config/datasets.yaml. The runner stops cleanly and records where it stopped.
- **Resume**: re-running with the same `--run-id` reuses every stored response (no repeat
  calls) and continues from the first call not yet made.
- **Missing data** is stored as null with a reason, never as zero or empty text.
"""
import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import yaml

from apps.api.adapters import ADAPTERS
from apps.api.adapters.base import SourceUnavailable, replay_mode
from apps.api.core.provenance import DATA_DIR, ROOT, FixtureIndex, SourceRecord, SourceRecordStore
from apps.api.core.runstate import BudgetExceeded, RunState

CONFIG_PATH = ROOT / "config" / "datasets.yaml"


@dataclass
class Call:
    source: str
    operation: str
    params: Dict[str, Any]
    role: str = "seed"                      # "seed", "connected", or "dataset" (not per company)
    meta: Dict[str, Any] = field(default_factory=dict)
    estimate_followups: Dict[str, int] = field(default_factory=dict)  # dry-run only


def null_row(base: Dict[str, Any], fields: List[str], reason: str) -> Dict[str, Any]:
    row = dict(base)
    for f in fields:
        row[f] = None
    row["null_reasons"] = dict(row.get("null_reasons") or {}, **{f: reason for f in fields})
    return row


class Context:
    def __init__(self, run_id: str, seed_source: str = "awards", config: Optional[Dict] = None,
                 data_dir: Path = DATA_DIR, dry_run: bool = False, replay: Optional[bool] = None):
        self.run_id = run_id
        self.config = config or yaml.safe_load(CONFIG_PATH.read_text())
        self.seed_source = seed_source
        self.data_dir = Path(data_dir)
        self.dry_run = dry_run
        self.replay = replay_mode() if replay is None else replay
        self.cache: Dict[str, Any] = {}
        self._adapters: Dict[str, Any] = {}
        if not dry_run:
            self.store = SourceRecordStore(self.data_dir / "source_records")
            self.state = RunState(run_id, self.config.get("budgets", {}), self.data_dir)
            self.fixtures = FixtureIndex()

    # ---- adapters (never created in a dry run) -----------------------------------------
    def adapter(self, source: str):
        if self.dry_run:
            raise RuntimeError("dry run must not create adapters")
        if source not in self._adapters:
            self._adapters[source] = ADAPTERS[source](self.store, self.state, self.fixtures, self.replay)
        return self._adapters[source]

    def record(self, source: str, record_id: str) -> Optional[SourceRecord]:
        return self.store.get(source, record_id)

    # ---- dataset outputs ---------------------------------------------------------------
    def out_dir(self, dataset: str) -> Path:
        return self.data_dir / "datasets" / dataset / self.run_id

    def rows(self, dataset: str) -> Optional[List[Dict[str, Any]]]:
        p = self.out_dir(dataset) / "rows.jsonl"
        if not p.exists():
            return None
        return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]

    def rows_partial(self, dataset: str) -> Optional[List[Dict[str, Any]]]:
        p = self.out_dir(dataset) / "rows.partial.jsonl"
        if not p.exists():
            return None
        return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]

    # ---- seeds -------------------------------------------------------------------------
    def seeds(self) -> Tuple[List[Dict[str, Any]], bool]:
        """(seeds, is_placeholder). Placeholders are only returned in a dry run."""
        if self.seed_source == "fixtures":
            return list(self.config.get("replay_seeds", [])), False
        rows = self.rows("seed_awards")
        if rows:
            return [r for r in rows if r.get("recipient_name")], False
        if self.dry_run:
            n = self.config["seed"]["pilot_size"]
            return [{"seed_id": "seed-%02d" % (i + 1), "recipient_name": "<seed %d>" % (i + 1),
                     "recipient_uei": "<uei %d>" % (i + 1), "typology": "<typology>"} for i in range(n)], True
        raise SourceUnavailable("seed_awards has not been built for run %s" % self.run_id)

    def seed_entities(self) -> Tuple[List[Dict[str, Any]], bool]:
        """Seeds resolved to a Sayari entity: the `entities` rows once built (they carry addresses
        and risk flags), otherwise the replay seeds' own Sayari IDs in fixture mode."""
        rows = self.rows("entities")
        if rows:
            return [r for r in rows if r.get("is_seed") and r.get("sayari_id")], False
        if self.seed_source == "fixtures":
            return [s for s in self.config.get("replay_seeds", []) if s.get("sayari_id")], False
        if self.dry_run:
            seeds, _ = self.seeds()
            return [dict(s, sayari_id="<sayari id %d>" % (i + 1), addresses=["<address %d>" % (i + 1)],
                         identifiers=[{"type": "lei", "value": "<lei %d>" % (i + 1)}]) for i, s in enumerate(seeds)], True
        raise SourceUnavailable("entities has not been built for run %s" % self.run_id)


class DatasetJob:
    name = ""
    depends_on: List[str] = []
    status_note = ""            # shown when a job is blocked or derived

    def plan(self, ctx: Context) -> List[Call]:
        return []

    def static_rows(self, ctx: Context) -> List[Dict]:
        """Rows that need no external call (e.g. built from a stored seed record)."""
        return []

    def handle(self, ctx: Context, call: Call, rec: SourceRecord) -> Tuple[List[Dict], List[Call]]:
        return [], []

    def handle_missing(self, ctx: Context, call: Call, reason: str) -> List[Dict]:
        return [null_row(dict(call.meta, source=call.source, operation=call.operation),
                         ["source_record_id"], reason)]

    def finalize(self, ctx: Context, rows: List[Dict]) -> List[Dict]:
        return rows

    def blocked(self, ctx: Context) -> Optional[str]:
        return None


# ---------------------------------------------------------------------------------------
def dry_run(job: DatasetJob, ctx: Context) -> Dict[str, Any]:
    blocked = job.blocked(ctx)
    if blocked:
        return {"dataset": job.name, "blocked": blocked, "calls": [], "totals": {}}
    calls = job.plan(ctx)
    totals: Dict[str, Dict[str, int]] = {}
    for c in calls:
        t = totals.setdefault(c.source, {"planned": 0, "estimated_followups": 0})
        t["planned"] += 1
        for src, n in c.estimate_followups.items():
            totals.setdefault(src, {"planned": 0, "estimated_followups": 0})["estimated_followups"] += n
    budgets = ctx.config.get("budgets", {})
    for src, t in totals.items():
        b = (budgets.get(_budget_key(src)) or {})
        t["budget_total"] = b.get("total")
        t["daily_limit"] = b.get("daily_limit")
    _, placeholder = (ctx.seeds() if job.name not in ("seed_awards", "news_items", "official_list_entries",
                                                      "spending_trends", "reference_lists", "false_positive_sample")
                      else ([], False))
    return {"dataset": job.name, "placeholder_seeds": placeholder,
            "calls": [{"source": c.source, "operation": c.operation, "role": c.role,
                       "params": c.params, "meta": c.meta} for c in calls],
            "totals": totals}


def _budget_key(source: str) -> str:
    return {"sam_gov": "sam_gov", "consolidated_screening_list": "consolidated_screening_list"}.get(source, source)


def run(job: DatasetJob, ctx: Context) -> Dict[str, Any]:
    out = ctx.out_dir(job.name)
    out.mkdir(parents=True, exist_ok=True)
    blocked = job.blocked(ctx)
    if blocked:
        summary = {"dataset": job.name, "run_id": ctx.run_id, "status": "blocked", "reason": blocked, "rows": 0}
        (out / "run_summary.json").write_text(json.dumps(summary, indent=1))
        return summary
    before = dict(ctx.state.calls)
    try:
        queue = job.plan(ctx)
        rows: List[Dict] = list(job.static_rows(ctx))
    except SourceUnavailable as e:
        summary = {"dataset": job.name, "run_id": ctx.run_id, "status": "blocked", "reason": str(e), "rows": 0}
        (out / "run_summary.json").write_text(json.dumps(summary, indent=1))
        return summary
    status, stop_reason = "complete", None
    failures: List[Dict[str, str]] = []
    while queue:
        call = queue.pop(0)
        try:
            rec = ctx.adapter(call.source).call(call.operation, call.params)
            new_rows, followups = job.handle(ctx, call, rec)
            for r in new_rows:
                r.setdefault("source_record_id", rec.id)
            rows.extend(new_rows)
            queue.extend(followups)
        except SourceUnavailable as e:
            ctx.state.fail(call.source, call.operation, json.dumps(call.params, sort_keys=True)[:300], str(e))
            failures.append({"source": call.source, "operation": call.operation, "reason": str(e)})
            missing = job.handle_missing(ctx, call, str(e))
            if getattr(e, "record_id", None):
                for r in missing:
                    r["source_record_id"] = e.record_id
                    r.get("null_reasons", {}).pop("source_record_id", None)
            rows.extend(missing)
        except BudgetExceeded as e:
            status, stop_reason = "stopped", str(e)
            break
    rows = job.finalize(ctx, rows)
    for r in rows:
        r.setdefault("dataset", job.name)
        r.setdefault("run_id", ctx.run_id)
    name = "rows.jsonl" if status == "complete" else "rows.partial.jsonl"
    with open(out / name, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n")
    if status == "complete" and (out / "rows.partial.jsonl").exists():
        (out / "rows.partial.jsonl").unlink()
    made = {k: ctx.state.calls.get(k, 0) - before.get(k, 0) for k in ctx.state.calls
            if ctx.state.calls.get(k, 0) - before.get(k, 0)}
    summary = {"dataset": job.name, "run_id": ctx.run_id, "status": status, "stop_reason": stop_reason,
               "replay_mode": ctx.replay, "rows": len(rows), "calls_made_this_invocation": made,
               "rows_with_nulls": sum(1 for r in rows if r.get("null_reasons")),
               "failures": failures,
               "resume_with": ("python -m apps.api.jobs.datasets build %s --run-id %s" % (job.name, ctx.run_id)
                               if status == "stopped" else None)}
    (out / "run_summary.json").write_text(json.dumps(summary, indent=1))
    return summary


# ---- helpers used by several jobs ------------------------------------------------------
def time_period(ctx: Context, override: Optional[Dict] = None) -> List[Dict[str, str]]:
    dr = override or ctx.config["date_range"]
    return [{"start_date": dr["start_date"], "end_date": dr["end_date"]}]


def seeded_rng(ctx: Context, *parts: Any) -> random.Random:
    return random.Random(":".join(str(p) for p in (ctx.config["seed"]["random_seed"],) + parts))


def pages_for(total: int, page_size: int = 100, max_page: int = 100) -> int:
    return max(0, min(max_page, math.ceil(total / float(page_size))))


def norm_name(s: Optional[str]) -> str:
    import re
    s = (s or "").upper().replace("&", " AND ")
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    s = re.sub(r"\b(L ?L ?C|LTD|LIMITED|INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LLP|LP|PLC|GMBH|SA|SL|OOO)\b", " ", s)
    return " ".join(s.split())
