# Control Rows: Sampling and Screening Guide

**Purpose:** Add control rows to `research/ground_truth_entities.csv` so the scoring engine can be tested for false positives. The fixture set had 9 positives and 0 controls; the target was at least 9 controls (1:1).

**Status (25 September 2026):** 30 candidates drawn, all 30 screened, **22 controls appended** (all grade C; see Section 7). The candidates and every screen result are in `research/control_candidates.csv`.

---

## 1. Draw the sample

From the repo root, in the VS Code terminal:

```
python3 scripts/sample_controls.py --n 30 --seed 20260925 --fy 2025
```

The script uses the Python standard library only. It draws 30 random FY2025 federal contract recipients from USAspending, spread across three award-size bands, and writes them with their UEI to `research/control_candidates.csv`. Drawing 30 leaves room for candidates that fail screening.

**Reachable range.** USAspending results are sorted by amount, and the script picks pages 1–100 in each band. In practice the draw is random within the upper part of each band (the FY2025 middle band landed between $2.07M and $2.43M). Lower `MAX_PAGE` if late pages come back empty.

**Server errors.** USAspending returns frequent 502 and 504 errors. The script retries each page up to 8 times with backoff instead of skipping it, so the same seed always gives the same draw.

## 2. Resolve each candidate

Resolve each candidate to a Sayari entity by the **recipient UEI**, not the name. Search Sayari `search_entities` with the UEI. Record the Sayari entity whose identifiers include that UEI.

- If the UEI resolves only to a record with a **different name** (for example a former name or a joint venture), leave `sayari_entity_id` blank and explain it in `screen_notes`. The Sayari check for that row is `not_checked`.
- Large primes often return only stub records for the UEI. Search by exact name and check each record's identifiers for the UEI. If none match, the Sayari check is `not_checked`.

Record jurisdiction only when Sayari shows a US state registry identifier. Otherwise leave it blank; the ground-truth row then shows `CONFIRM`.

## 3. Screen each candidate

Mark each check as `clear`, `hit`, `not_checked`, or `pending`:

| Check | How | Hit means |
|---|---|---|
| OFAC SDN | Match the name against Treasury's SDN and Consolidated list files (`SDN.CSV`, `ALT.CSV`, `CONS_PRIM.CSV`, `CONS_ALT.CSV` from sanctionslistservice.ofac.treas.gov). Review every token match by hand | The listed party is the same entity |
| SAM exclusions | SAM.gov Exclusions API v4, `ueiSAM=<UEI>` (needs an API key) | An active exclusion record for the UEI |
| Sayari watchlist | Risk flags on the resolved entity, plus `check_watchlist` at depth 1 with `sanctioned=true` when the entity carries `sanctioned_adjacent` | The entity itself carries `sanctioned`, `export_controls*`, `law_enforcement_action*` or `regulatory_action`. `psa_*`, `*_adjacent` and parent-level (`owned_by_*`) flags are recorded in the notes but are not hits |
| Adverse media | Tavily, restricted to justice.gov, exact entity name | A DOJ release dated on or after the date 5 years before the screen date, announcing charges or a civil or criminal resolution against this legal entity |

**[D] The 5-year window and the justice.gov restriction are design decisions.** Open web search with "fraud OR indictment" terms returned mostly unrelated pages. DOJ releases are the primary record for enforcement. Older resolved matters are noted but do not disqualify a control.

If a lead cannot be read (for example because of a bot wall), mark the check `pending` and do not append the row until a person reads it.

Set `screen_result` to `no_adverse_finding` **only if no check is a hit or pending**. Any hit means the row is dropped (`adverse_finding`). It could become a new positive or candidate row, but only with its own source.

## 4. Append the controls

```
python3 scripts/sample_controls.py --append research/control_candidates.csv
```

Only rows marked `no_adverse_finding` are added to `research/ground_truth_entities.csv`, as `schema_type` `public_recipient` with an `entity_ref` starting `ctl_`. Rows already present are skipped, so the command is safe to rerun.

- **Grade B** if all three list checks (OFAC, SAM, Sayari) are clear.
- **Grade C** if any list check was `not_checked`.

For control rows, the grade measures how complete the screen was. It is not the evidence grade used for positive rows in `research/README.md`.

## 5. Rules

- **Never hand-pick.** Don't swap in companies you know. Replacing a candidate breaks randomness; drop it and draw more instead.
- **Keep the seed.** The fixed seed makes the draw reproducible, so an auditor can rerun it and get the same candidates.
- **Include hard negatives.** The small-award band is deliberate. Small, young, Delaware-registered recipients look shell-like and are the fairest false-positive test.
- **Mind the wording.** A control means "no adverse finding located as of the screen date," not "clean."
- **Re-screen before demos.** A later designation turns a control into a positive.

## 6. Script

The script is [`scripts/sample_controls.py`](../scripts/sample_controls.py). Run `python3 scripts/sample_controls.py --help` for options.

## 7. Results of the 25 September 2026 screen

| Outcome | Count | Candidates |
|---|---|---|
| Appended as controls | 22 | 6 in the $25K–$250K band, 10 in $250K–$2.5M, 6 in $2.5M–$50M |
| Dropped: Sayari enforcement flag on the entity | 4 | Illumina, AmerisourceBergen Drug Corp, GlobalFoundries U.S. 2, Paragon Systems |
| Dropped: DOJ resolution since Sept. 2021 | 4 | Roche Diagnostics ($12.5M False Claims Act), Raytheon Company ($8.4M False Claims Act), Lockheed Martin Corporation ($29.74M False Claims Act), SAIC ($450,000 breach-of-contract settlement, 3 Oct 2024) |
| Pending | 0 | Leidos and SAIC were pending on one unreadable DOJ release; it names SAIC (checked in a browser), so SAIC was dropped and Leidos appended |

**Open steps:**

1. **SAM exclusions** were not checked for any row, so every control is grade C. Check each UEI on sam.gov (Search → Exclusions), or with the Exclusions API, and change `sam_exclusions_check` to `clear`. A personal key without a SAM.gov role allows only 10 requests a day. Rows already appended must then have their grade edited in `ground_truth_entities.csv` by hand.
2. **Identity not confirmed** in Sayari for 4 controls: BAE Systems Technology Solutions & Services, Castro & Company, Nammo Perry, and Northrop Grumman Systems. Their Sayari check is `not_checked`.
3. **Hard negatives worth watching.** Several controls carry flags the scoring engine could misread: `mass_address_usage` (GAP Solutions, Meridian, The Craddock Group, HPI Federal, ECS Federal, Leidos), `sanctioned_adjacent` (Hardwire), and a parent with a regulatory action (ECS Federal). These controls must still score Low or Moderate.
