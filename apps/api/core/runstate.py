"""Run state: call budgets and resume ledger (Task 2c items 4-5).

A run keeps, in data/runs/<run_id>/state.json:
- `done`: request key -> source-record id, so a resumed run reuses stored responses instead
  of repeating calls;
- `calls`: calls made per tool, checked against config/datasets.yaml budgets.
Daily limits (SAM.gov, B22) are tracked across runs in data/budget/<tool>-<date>.json.
"""
import datetime
import json
from pathlib import Path
from typing import Any, Dict, Optional

from apps.api.core.provenance import DATA_DIR


class BudgetExceeded(Exception):
    def __init__(self, tool: str, limit: int, kind: str = "total"):
        self.tool, self.limit, self.kind = tool, limit, kind
        super().__init__("%s budget reached for %s (%d calls)" % (kind, tool, limit))


class RunState:
    def __init__(self, run_id: str, budgets: Dict[str, Any], data_dir: Path = DATA_DIR):
        self.run_id = run_id
        self.budgets = budgets or {}
        self.data_dir = Path(data_dir)
        self.dir = self.data_dir / "runs" / run_id
        self.dir.mkdir(parents=True, exist_ok=True)
        self.path = self.dir / "state.json"
        state = json.loads(self.path.read_text()) if self.path.exists() else {}
        self.done: Dict[str, Dict[str, str]] = state.get("done", {})
        self.calls: Dict[str, int] = state.get("calls", {})
        self.failures: list = state.get("failures", [])

    def save(self) -> None:
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps({"run_id": self.run_id, "done": self.done, "calls": self.calls,
                                   "failures": self.failures}, indent=1))
        tmp.replace(self.path)

    def seen(self, tool: str, key: str) -> Optional[str]:
        return self.done.get(tool, {}).get(key)

    def _daily_path(self, tool: str) -> Path:
        d = self.data_dir / "budget"
        d.mkdir(parents=True, exist_ok=True)
        return d / ("%s-%s.json" % (tool, datetime.date.today().isoformat()))

    def check(self, tool: str) -> None:
        """Raise before a call would exceed a budget."""
        b = self.budgets.get(tool, {}) or {}
        total = b.get("total")
        if total is not None and self.calls.get(tool, 0) >= total:
            raise BudgetExceeded(tool, total, "total")
        daily = b.get("daily_limit")
        if daily is not None:
            p = self._daily_path(tool)
            used = json.loads(p.read_text())["calls"] if p.exists() else 0
            if used >= daily:
                raise BudgetExceeded(tool, daily, "daily")

    def charge(self, tool: str, key: str, record_id: str) -> None:
        self.calls[tool] = self.calls.get(tool, 0) + 1
        self.done.setdefault(tool, {})[key] = record_id
        b = self.budgets.get(tool, {}) or {}
        if b.get("daily_limit") is not None:
            p = self._daily_path(tool)
            used = json.loads(p.read_text())["calls"] if p.exists() else 0
            p.write_text(json.dumps({"calls": used + 1}))
        self.save()

    def record_reuse(self, tool: str, key: str, record_id: str) -> None:
        """Replayed fixtures cost nothing but are ledgered so resume logic is uniform."""
        self.done.setdefault(tool, {})[key] = record_id
        self.save()

    def fail(self, tool: str, operation: str, key: str, reason: str) -> None:
        self.failures.append({"tool": tool, "operation": operation, "key": key, "reason": reason})
        self.save()
