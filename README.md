# Corporate Transparency Hackathon — "Follow the Public Dollar"

Trace public federal contract dollars from a recipient (SAM.gov UEI / Award ID) through corporate
registry, UBO, and trade data to surface phoenix entities, nominee directors, and sanctions-adjacent
shell networks. Outputs a strictly typed JSON graph contract for a force-directed visualization in v0/Lovable.

## Team
- Technical execution: Maria Ashby (@mashby2022)
- Domain & evidence curation: TBD
- Design, demo & submission: TBD

## Data Sources (current state)
No live Sayari or Tradeverifyd API access in the dev environment yet. Current fixtures use verified
public records only (OFAC SDN list, DOJ press releases, BIS Temporary Denial Orders, OpenSanctions,
SAM.gov) with every provenance field pointing to a real URL — no invented evidence_record IDs.
See docs/planning_doc.md Section 5 for the Sayari access status and fallback plan.

## Validation Cases
- **fixtures/serniya_investigation.json** — high-risk case. Real OFAC E.O. 14024 designations
  (2022-03-31) and DOJ EDNY indictment (2022-12-13) against the Serniya Engineering procurement
  network (Sertal, Robin Treid, Majory LLP, Photon Pro LLP, Invention Bridge SL). Composite score 65/100,
  Grade B (capped due to missing trade-lane data).
- **fixtures/palantir_control.json** — clean baseline case. Real SAM.gov contractor (UEI FSY4LVSBGWB7,
  CAGE 470F5), NYSE-listed, fully disclosed ownership. Used to confirm the scoring engine doesn't
  false-positive on a transparent, high-dollar federal contractor.

## Known Schema Gap
The `primary_typology` enum (Russia Sanctions Evasion / Pandemic Loan Fraud / TBML Transshipment /
Nominee Shell) has no "clean / no material risk" value. The Palantir control fixture uses a placeholder
value outside the enum ("None Detected — Clean Control Case") to flag this gap — resolve before final
schema lock by adding a 5th enum value.

## Repo Structure
- `/schema` — the locked JSON output contract (nodes/edges/audit_trail schema definition).
- `/fixtures` — real, sourced test cases (Serniya high-risk, Palantir clean baseline).
- `/docs` — planning doc: team roles, phase-by-phase execution plan, model tracing setup, Sayari access status.

## Model Tracing
Instrumenting the entity-resolution LLM calls with Langfuse (recommended default: free tier, fast
setup, lets you inspect exactly which prompt/version produced a given confidence grade or provenance_ref).
