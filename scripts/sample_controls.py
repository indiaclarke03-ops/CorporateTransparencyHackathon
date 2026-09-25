#!/usr/bin/env python3
"""Draw a reproducible random sample of ordinary federal contract recipients to use as control rows.

Usage:
    python3 scripts/sample_controls.py --n 30 --seed 20260925 --fy 2025
        -> writes research/control_candidates.csv; screen each row (docs/control-rows-guide.md)
    python3 scripts/sample_controls.py --append research/control_candidates.csv
        -> appends rows screened "no_adverse_finding" to research/ground_truth_entities.csv

Nothing is labelled a control without a completed screen. Standard library only.

API reference: POST /api/v2/search/spending_by_award/
https://github.com/fedspendingtransparency/usaspending-api/blob/master/usaspending_api/api_contracts/contracts/v2/search/spending_by_award.md
"""
import argparse
import csv
import json
import random
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "research" / "control_candidates.csv"
GROUND_TRUTH = ROOT / "research" / "ground_truth_entities.csv"

API = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
FIELDS = ["Award ID", "Recipient Name", "Start Date", "Award Amount",
          "Awarding Agency", "Contract Award Type", "generated_internal_id", "Recipient UEI"]
PAGE_SIZE = 100
# USAspending may cap how deep you can page. If late pages come back empty,
# lower MAX_PAGE; the draw stays random within the reachable range.
MAX_PAGE = 100

# Size bands so controls aren't all giant primes. Hard negatives matter:
# small, young, Delaware-registered firms look shell-like but are usually fine.
BANDS = [(25_000, 250_000), (250_000, 2_500_000), (2_500_000, 50_000_000)]

CANDIDATE_COLS = [
    "recipient_name", "recipient_uei", "award_id", "award_amount", "awarding_agency",
    "start_date", "award_url", "size_band", "seed", "fiscal_year",
    # filled in during screening (docs/control-rows-guide.md section 3)
    "entity_type", "jurisdiction", "sayari_entity_id",
    "ofac_sdn_check", "sam_exclusions_check", "sayari_watchlist_check",
    "adverse_media_check", "screen_result", "screened_by", "screen_date",
]
LIST_CHECKS = ("ofac_sdn_check", "sam_exclusions_check", "sayari_watchlist_check")


def fetch_page(fy, lo, hi, page, retries=8):
    body = {
        "filters": {
            "award_type_codes": ["A", "B", "C", "D"],
            "time_period": [{"start_date": f"{fy-1}-10-01", "end_date": f"{fy}-09-30"}],
            "award_amounts": [{"lower_bound": lo, "upper_bound": hi}],
        },
        "fields": FIELDS, "limit": PAGE_SIZE, "page": page,
        "sort": "Award Amount", "order": "desc",
    }
    req = urllib.request.Request(API, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp).get("results", [])
        except OSError as e:  # HTTPError, URLError and socket timeouts
            # USAspending returns intermittent 502/504s; back off and retry.
            if attempt == retries - 1:
                raise
            print(f"  page {page}: {e}; retrying", file=sys.stderr)
            time.sleep(min(2 ** attempt, 60))


def draw(n, seed, fy):
    rng = random.Random(seed)
    per_band = -(-n // len(BANDS))
    picked, seen = [], set()
    for lo, hi in BANDS:
        got, tries = 0, 0
        while got < per_band and tries < per_band * 6:
            tries += 1
            page = rng.randint(1, MAX_PAGE)
            rows = fetch_page(fy, lo, hi, page)
            time.sleep(0.5)
            if not rows:
                continue
            row = rng.choice(rows)
            name = (row.get("Recipient Name") or "").strip().upper()
            if not name or name in seen or "MULTIPLE RECIPIENTS" in name:
                continue
            seen.add(name)
            row["_band"] = f"${lo:,.0f}-${hi:,.0f}"
            picked.append(row)
            got += 1
    return picked[:n]


def write_candidates(rows, seed, fy, path=CANDIDATES):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CANDIDATE_COLS)
        w.writeheader()
        for r in rows:
            gid = r.get("generated_internal_id") or ""
            w.writerow({
                "recipient_name": r.get("Recipient Name"),
                "recipient_uei": r.get("Recipient UEI"),
                "award_id": r.get("Award ID"),
                "award_amount": r.get("Award Amount"),
                "awarding_agency": r.get("Awarding Agency"),
                "start_date": r.get("Start Date"),
                "award_url": f"https://www.usaspending.gov/award/{gid}" if gid else "",
                "size_band": r["_band"], "seed": seed, "fiscal_year": fy,
            })
    print(f"Wrote {len(rows)} candidates to {path}")


def slug(name):
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")[:40]


def append_controls(csv_path, target=GROUND_TRUTH):
    with open(target, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cols = reader.fieldnames
        existing = {r["entity_ref"] for r in reader}
    status_col = next(c for c in cols if c.startswith("status_as_of"))
    added = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["screen_result"].strip() != "no_adverse_finding":
                continue
            ref = "ctl_" + slug(row["recipient_name"])
            if ref in existing:
                continue
            checks = {k: row[k].strip().lower() for k in LIST_CHECKS}
            # B: every list check clear. C: at least one list check not run.
            grade = "B" if all(v == "clear" for v in checks.values()) else "C"
            added.append({
                "entity_ref": ref,
                "canonical_name": row["recipient_name"],
                "other_names": "",
                "schema_type": "public_recipient",
                "jurisdiction": row["jurisdiction"] or "CONFIRM",
                "identifiers": "; ".join(x for x in (
                    f"UEI {row['recipient_uei']}" if row.get("recipient_uei") else "",
                    f"Award {row['award_id']}",
                    f"Sayari {row['sayari_entity_id']}" if row["sayari_entity_id"] else "",
                ) if x),
                status_col: "No adverse finding located as of {} (OFAC={}, SAM={}, Sayari={}, media={})".format(
                    row["screen_date"], row["ofac_sdn_check"], row["sam_exclusions_check"],
                    row["sayari_watchlist_check"], row["adverse_media_check"]),
                "primary_source_url": row["award_url"],
                "supporting_source_ids": "",
                "confidence": grade,
                "notes": "CONTROL. Randomly sampled FY{} contract recipient ({}), seed {}; screened by {}. "
                         "Should score Low/Moderate; Elevated/High is a false positive to review. "
                         "Entity type: {}.{}".format(row["fiscal_year"], row["size_band"], row["seed"],
                                                     row["screened_by"], row["entity_type"] or "CONFIRM",
                                                     " " + row["screen_notes"] if row.get("screen_notes") else ""),
            })
            existing.add(ref)
    with open(target, "a", newline="", encoding="utf-8") as f:
        csv.DictWriter(f, fieldnames=cols).writerows(added)
    print(f"Appended {len(added)} controls to {target.relative_to(ROOT)}")


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--n", type=int, default=30, help="candidates to draw (oversample: some will fail screening)")
    p.add_argument("--seed", type=int, default=20260925)
    p.add_argument("--fy", type=int, default=2025)
    p.add_argument("--append", metavar="CSV", help="append screened rows from this candidates CSV")
    a = p.parse_args(argv)
    if a.append:
        append_controls(Path(a.append))
    else:
        write_candidates(draw(a.n, a.seed, a.fy), a.seed, a.fy)


if __name__ == "__main__":
    main()
