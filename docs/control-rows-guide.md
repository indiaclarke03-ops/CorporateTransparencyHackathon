# Control Rows: Sampling and Screening Guide

**Purpose:** Add control rows to `ground-truth-fixtures.xlsx` so the scoring engine can be tested for false positives. The fixture set currently has 9 positives and 0 controls; the target is at least 9 controls (1:1).

**Time needed:** About 30–45 minutes, mostly screening.

---

## 1. Draw the sample

Put `sample_controls.py` (full code in Section 6) in the same folder as the workbook, then run from the VS Code terminal:

```
pip install requests openpyxl
python sample_controls.py --n 30 --seed 20260925 --fy 2025
```

This draws 30 random FY2025 federal contract recipients from USAspending, spread across three award-size bands, and writes them to `control_candidates.csv`. Drawing 30 leaves room for candidates that fail screening or turn out to be duplicates.

**If candidates come back sparse:** USAspending may limit how deep you can page through results. Lower `MAX_PAGE` in the script and rerun. The draw stays random within the reachable range.

## 2. Resolve each candidate

For each candidate, find the matching Sayari entity with `search_entities`. Record entity type and jurisdiction only if registry data confirms them. Otherwise leave them blank, and they will be marked CONFIRM in the workbook.

## 3. Screen each candidate

Mark each check as `clear`, `hit`, or `not_checked`:

| Check | Where |
|---|---|
| OFAC SDN | OFAC Sanctions List Search (sanctionssearch.ofac.treas.gov) |
| SAM exclusions | SAM.gov exclusions search |
| Sayari watchlist | Sayari `check_watchlist` on the resolved entity |
| Adverse media | Tavily search: "<name>" with fraud / indictment / sanctions |

Set `screen_result` to `no_adverse_finding` **only if no check is a hit**. Any hit means the row is dropped. It could become a new positive or candidate row, but only with its own source.

## 4. Append the controls

```
python sample_controls.py --append control_candidates.csv
```

Only rows marked `no_adverse_finding` are added:

- **Grade B** if all three list checks (OFAC, SAM, Sayari) are clear
- **Grade C** if any list check was `not_checked`

Each append is recorded in the workbook's Change Log. Open the file in Excel afterward to refresh the Summary counts.

## 5. Rules

- **Never hand-pick.** Don't swap in companies you know. Replacing a candidate breaks randomness; drop it and draw more instead.
- **Keep the seed.** The fixed seed makes the draw reproducible, so an auditor can rerun it and get the same candidates.
- **Include hard negatives.** The small-award band is deliberate. Small, young, Delaware-registered recipients look shell-like and are the fairest false-positive test.
- **Mind the wording.** A control means "no adverse finding located as of the screen date," not "clean."
- **Re-screen before demos.** A later designation turns a control into a positive.

## 6. Script: `sample_controls.py`

Copy this into a file named `sample_controls.py`.

```python
"""
Draw a reproducible random sample of ordinary federal contract recipients
to use as CONTROL rows in ground-truth-fixtures.xlsx.

Usage (from VS Code terminal):
    pip install requests openpyxl
    python sample_controls.py --n 30 --seed 20260925 --fy 2025

Output:
    control_candidates.csv  -> screen each row (see "Control Sampling" tab),
                               then run with --append to add screened rows.
    python sample_controls.py --append control_candidates.csv

Only rows whose `screen_result` column you set to "no_adverse_finding"
are appended. Nothing is labelled a control without a completed screen.

API reference (verified): POST /api/v2/search/spending_by_award/
https://github.com/fedspendingtransparency/usaspending-api/blob/master/usaspending_api/api_contracts/contracts/v2/search/spending_by_award.md
"""
import argparse
import csv
import random
import sys
import time
from datetime import date

import requests

API = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
FIELDS = ["Award ID", "Recipient Name", "Start Date", "Award Amount",
          "Awarding Agency", "Contract Award Type", "generated_internal_id"]
PAGE_SIZE = 100
# CONFIRM: USAspending may cap how deep you can page. If late pages come back
# empty, lower MAX_PAGE; the draw stays random within the reachable range.
MAX_PAGE = 100

# Size bands so controls aren't all giant primes. Hard negatives matter:
# small, young, Delaware-registered firms look shell-like but are usually fine.
BANDS = [(25_000, 250_000), (250_000, 2_500_000), (2_500_000, 50_000_000)]


def fetch_page(fy: int, lo: float, hi: float, page: int) -> list[dict]:
    body = {
        "filters": {
            "award_type_codes": ["A", "B", "C", "D"],
            "time_period": [{"start_date": f"{fy-1}-10-01", "end_date": f"{fy}-09-30"}],
            "award_amounts": [{"lower_bound": lo, "upper_bound": hi}],
        },
        "fields": FIELDS, "limit": PAGE_SIZE, "page": page,
        "sort": "Award Amount", "order": "desc",
    }
    r = requests.post(API, json=body, timeout=60)
    r.raise_for_status()
    return r.json().get("results", [])


def draw(n: int, seed: int, fy: int) -> list[dict]:
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
            row["_page"] = page
            picked.append(row)
            got += 1
    return picked[:n]


def write_candidates(rows, seed, fy, path="control_candidates.csv"):
    cols = ["recipient_name", "award_id", "award_amount", "awarding_agency",
            "start_date", "award_url", "size_band", "seed", "fiscal_year",
            # --- filled in during screening (see Control Sampling tab) ---
            "entity_type", "jurisdiction", "sayari_entity_id",
            "ofac_sdn_check", "sam_exclusions_check", "sayari_watchlist_check",
            "adverse_media_check", "screen_result", "screened_by", "screen_date"]
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            gid = r.get("generated_internal_id") or ""
            w.writerow({
                "recipient_name": r.get("Recipient Name"),
                "award_id": r.get("Award ID"),
                "award_amount": r.get("Award Amount"),
                "awarding_agency": r.get("Awarding Agency"),
                "start_date": r.get("Start Date"),
                "award_url": f"https://www.usaspending.gov/award/{gid}" if gid else "",
                "size_band": r["_band"], "seed": seed, "fiscal_year": fy,
            })
    print(f"Wrote {len(rows)} candidates to {path}")


def append_controls(csv_path, xlsx="ground-truth-fixtures.xlsx"):
    from openpyxl import load_workbook
    wb = load_workbook(xlsx)
    ws = wb["Fixtures"]
    nxt = next(r for r in range(2, ws.max_row + 2) if not ws.cell(r, 2).value)
    existing = [ws.cell(r, 1).value for r in range(2, nxt) if ws.cell(r, 1).value]
    num = max(int(x[1:]) for x in existing) + 1
    added = 0
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            if row["screen_result"].strip() != "no_adverse_finding":
                continue
            checks = [row[k].strip().lower() for k in
                      ("ofac_sdn_check", "sam_exclusions_check", "sayari_watchlist_check")]
            grade = "B" if all(c == "clear" for c in checks) else "C"
            vals = {
                1: f"F{num:03d}", 2: row["recipient_name"],
                3: row["entity_type"] or "CONFIRM", 4: row["jurisdiction"] or "CONFIRM",
                5: row["award_url"], 6: grade, 7: "control",
                8: f"Randomly sampled FY{row['fiscal_year']} contract recipient ({row['size_band']}), seed {row['seed']}",
                9: "No adverse finding located as of screen date", 10: row["screen_date"],
                13: "Should score Low/Moderate; any Elevated/High = false positive to review",
                16: row["sayari_entity_id"], 17: date.today().isoformat(),
                19: row["screened_by"],
                20: "Screens: OFAC={}, SAM={}, Sayari={}, media={}".format(
                    row["ofac_sdn_check"], row["sam_exclusions_check"],
                    row["sayari_watchlist_check"], row["adverse_media_check"]),
            }
            for c, v in vals.items():
                ws.cell(nxt, c, v)
            nxt += 1; num += 1; added += 1
    log = wb["Change Log"]
    lr = log.max_row + 1
    log.cell(lr, 1, date.today().isoformat())
    log.cell(lr, 3, f"Appended {added} screened control rows from {csv_path}")
    wb.save(xlsx)
    print(f"Appended {added} controls. Open the file in Excel to refresh Summary counts.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--n", type=int, default=30, help="candidates to draw (oversample: some will fail screening)")
    p.add_argument("--seed", type=int, default=20260925)
    p.add_argument("--fy", type=int, default=2025)
    p.add_argument("--append", metavar="CSV")
    a = p.parse_args()
    if a.append:
        append_controls(a.append)
    else:
        write_candidates(draw(a.n, a.seed, a.fy), a.seed, a.fy)
```
