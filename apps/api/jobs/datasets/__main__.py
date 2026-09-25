"""CLI for the dataset jobs.

    python -m apps.api.jobs.datasets list
    python -m apps.api.jobs.datasets build <name|all> --dry-run
    python -m apps.api.jobs.datasets build <name|all> --run-id pilot-001
    REPLAY_MODE=true python -m apps.api.jobs.datasets build all --seed-source fixtures --run-id replay-appendix-a

Exit codes: 0 complete, 2 stopped at a budget (resume with the same --run-id), 3 blocked.
"""
import argparse
import datetime
import json
import sys

from apps.api.jobs.datasets import BUILD_ORDER, JOBS
from apps.api.jobs.datasets.base import Context, dry_run, run


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m apps.api.jobs.datasets")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list")
    b = sub.add_parser("build")
    b.add_argument("name", help="dataset name, or 'all' to build in dependency order")
    b.add_argument("--dry-run", action="store_true", help="list planned calls and totals; call nothing")
    b.add_argument("--run-id", default=None)
    b.add_argument("--seed-source", choices=["awards", "fixtures"], default="awards",
                   help="'fixtures' uses config/datasets.yaml replay_seeds (spec appendix A)")
    b.add_argument("--json", action="store_true", help="print full dry-run plan as JSON")
    args = ap.parse_args(argv)

    if args.cmd == "list":
        for name in BUILD_ORDER:
            if name in JOBS:
                j = JOBS[name]
                print("%-26s depends on: %s" % (name, ", ".join(j.depends_on) or "-"))
        return 0

    names = BUILD_ORDER if args.name == "all" else [args.name]
    unknown = [n for n in names if n not in JOBS]
    if unknown:
        print("unknown dataset(s): %s" % ", ".join(unknown), file=sys.stderr)
        return 1
    run_id = args.run_id or ("dry-run" if args.dry_run else "run-" + datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ"))
    ctx = Context(run_id, seed_source=args.seed_source, dry_run=args.dry_run)

    if args.dry_run:
        grand = {}
        for name in dict.fromkeys(names):
            plan = dry_run(JOBS[name], ctx)
            if args.json:
                print(json.dumps(plan, indent=1, default=str))
            if plan.get("blocked"):
                print("%-26s BLOCKED: %s" % (name, plan["blocked"]))
                continue
            parts = []
            for src, t in sorted(plan["totals"].items()):
                g = grand.setdefault(src, [0, 0])
                g[0] += t["planned"]
                g[1] += t["estimated_followups"]
                parts.append("%s %d%s" % (src, t["planned"], (" (+~%d follow-ups)" % t["estimated_followups"]) if t["estimated_followups"] else ""))
            flag = "  [placeholder seeds]" if plan.get("placeholder_seeds") else ""
            print("%-26s %s%s" % (name, "; ".join(parts) or "no external calls", flag))
        budgets = ctx.config.get("budgets", {})
        print("\nTotal planned calls per tool (planned + estimated follow-ups) vs budget:")
        for src, (p, f) in sorted(grand.items()):
            bt = (budgets.get(src) or {}).get("total")
            dl = (budgets.get(src) or {}).get("daily_limit")
            print("  %-28s %4d + ~%-4d = ~%-5d budget %s%s" % (src, p, f, p + f, bt if bt is not None else "-",
                                                             (", daily limit %d" % dl) if dl else ""))
        print("\nNothing was called. Planned follow-ups depend on responses and are estimates.")
        return 0

    code = 0
    for name in names:
        summary = run(JOBS[name], ctx)
        print(json.dumps(summary, default=str))
        if summary["status"] == "stopped":
            return 2
        if summary["status"] == "blocked":
            code = 3 if len(names) == 1 else code
    return code


if __name__ == "__main__":
    sys.exit(main())
