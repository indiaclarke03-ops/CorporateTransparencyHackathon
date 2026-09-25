# "Follow the Public Dollar" — Planning Doc
Team: 3 (1 technical — Maria, 2 non-technical) | Status: Brainstorming complete -> Execution starting

## 0. What We've Already Locked In
- Concept: Trace public federal dollars (SAM.gov award -> contractor) through corporate registry / UBO / trade data to surface phoenix entities, nominee directors, and sanctions-adjacent shells.
- Validation case (real, evidence-backed): Serniya Engineering / Photon Pro procurement network - OFAC E.O. 14024 designations (2022-03-31), DOJ EDNY 16-count indictment (2022-12-13), BIS TDO on Advanced Web Services/Strandway. Composite risk score 65/100 (Grade B) with an honest zero on the Tradeverifyd trade-lane leg.
- Control case (clean baseline): Palantir Technologies Inc. (UEI FSY4LVSBGWB7, CAGE 470F5) - real SAM.gov contractor, transparent NYSE-listed, near-zero risk score expected.
- Known data gap: No live Sayari or Tradeverifyd API in this environment - all current JSON output uses OFAC/DOJ/BIS/OpenSanctions public records instead, with provenance fields marked accordingly.

## 1. Roles & Division of Labor

### You (Technical Execution)
- Own the starter repo, backend/API wiring, and Claude Sonnet entity-resolution engine.
- Build the composite risk-scoring function (Sayari 45% / Tradeverifyd 35% / Presence 20%) as a pure, testable module using the Serniya and Palantir fixtures.
- Wire the v0/Lovable force-directed graph to the JSON contract.
- Set up model tracing around every Claude Sonnet call in the resolution engine.
- Deploy and own the demo environment.

### Teammate A - Non-Technical (Domain & Evidence Curator)
- Owns primary-source research: OFAC SDN entries, DOJ press releases, BIS TDOs, SAM.gov award pages.
- Writes the executive_rationale and Lead Dossier narrative copy.
- Maintains a ground-truth spreadsheet: entity -> type -> jurisdiction -> source URL -> confidence grade.
- Drafts Regulatory Divergence callouts (CTA Final Rule exemption, UK Companies House ID verification, DE/WY/NV opacity flags).

### Teammate B - Non-Technical (Design, Demo & Submission)
- Owns the pitch narrative and demo script (2-hop Serniya walkthrough).
- Builds slides/one-pager and the Lead Dossier export mockup.
- Handles hackathon logistics: submission portal, demo video, judge Q&A prep.
- QA pass on the live dashboard once a build exists.

## 2. Phase-by-Phase Execution

| Phase | Deliverable | Owner | Depends on |
|---|---|---|---|
| 1. Data lock | Ground-truth spreadsheet | Teammate A | - |
| 2. Schema freeze | Finalize JSON contract | You | Phase 1 |
| 3. Scoring engine | Composite risk function, unit-tested | You | Phase 2 |
| 4. Resolution prompt | Claude Sonnet ingestion prompt | You | Phase 2 |
| 5. Tracing wired | LLM calls logged (prompt/tokens/latency/validity) | You | Phase 4 |
| 6. Frontend wiring | Force graph + provenance inspector | You | Phase 3 |
| 7. Narrative & copy | Executive rationale, ticker copy, dossier copy | Teammate A | Phase 1 |
| 8. Demo script & deck | Full walkthrough + slides + timing | Teammate B | Phase 6 |
| 9. QA + dry run | Click-through, fix broken states, rehearse | Teammate B + You | Phase 6, 7 |
| 10. Submission | README, video, submission form | Teammate B | Phase 9 |

## 3. Model Tracing Options
- Langfuse (recommended default): open-source, free tier, fast setup, prompt versioning, latency/cost per call.
- Arize Phoenix: strong tracing + eval, OpenTelemetry-based.
- LangSmith: best if using LangChain/LangGraph anywhere in the stack.
- Helicone: lowest-friction proxy-based drop-in.

## 4. Open Questions
- Confirm final validation case set: Serniya (high-risk) + Palantir (clean baseline) - add a third mid-risk case?
- Sayari/Tradeverifyd trial keys, or stay fixture-based (OFAC/DOJ/BIS) for the whole hackathon?

## 5. Sayari Access — Status & Fallback Plan
- The Sayari "Request a Demo" link is a paid-ads sales lead form, not a self-serve API signup. Submitting it schedules a tailored walkthrough with a Sayari rep - it does not grant instant credentials.
- Real API access requires a separate gated request (client_id/client_secret via OAuth 2.0), issued manually after sales contact.
- Commercial reality: no public free tier. Reported median annual spend ~$61,000/year, priced per entity under management. Trials (when granted) are typically 1-2 months and follow an onboarding/training call - unlikely to land before the hackathon deadline.
- Action: submit the demo form now and explicitly mention it's for a hackathon/student project in the "what are you working on" field, in case they fast-track it. Do not block the build on a response.
- Fallback (current default): keep the S_Sayari scoring input pluggable so a real Sayari UBO response can drop into the same JSON slot the OFAC/DOJ/BIS fixture currently fills, with zero refactor needed if access comes through in time.
