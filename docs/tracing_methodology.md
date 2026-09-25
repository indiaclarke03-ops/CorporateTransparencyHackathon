# Tracing Methodology — Shell Detection to Bad-Actor Connection

## 1. Sanctions Propagation Logic (Legal-Person UBO -> Sanctions List)

**Core mechanism:** OFAC's 50% Rule states that any entity owned 50% or more, directly or indirectly,
in the aggregate, by one or more blocked persons is itself automatically blocked, even if never listed
by name. This works recursively: if a blocked person owns >=50% of Company A, Company A becomes a
blocked person for everything it owns downstream.

**Algorithm:**
1. Seed the graph - tag every node directly on a sanctions list (SDN, UN Consolidated List, EU
   Consolidated List, UK OFSI) with list type and program.
2. Propagate outward - for each entity, sum ownership stakes held by already-blocked parties (direct +
   inherited indirect). If total >= 50%, mark "blocked by extension."
3. Iterate to a fixed point - repeat passes until no new entities change status (blocking one entity
   can push a second over threshold on the next pass).
4. Separate control from ownership - a blocked person as director/officer without >=50% ownership does
   NOT auto-block under the 50% Rule (OFAC FAQ 398). Flag as medium-severity "control exposure" instead.
5. Preserve the blocking chain as provenance - every "blocked by extension" node records which upstream
   blocked party and which ownership edges caused it.

**Jurisdictional caveat:** No single global 50% rule. OFAC, BIS, EU (July 2024 non-binding guidance),
and UK OFSI each aggregate differently. Tag every propagated block with which regime's rule triggered it.

**Flag categories:**
| Category | Legal basis | Example |
|---|---|---|
| State-sponsor / country programs | E.O.-based (Russia, Iran, North Korea, Cuba, Syria) | Serniya Engineering, E.O. 14024 |
| Non-state terrorist actors | SDGT / FTO, added to SDN List | Hamas, Hezbollah-linked entities |
| Cartels / international crime syndicates | FTO designations extended to cartels (2025), SDNTK narcotics program | Sinaloa Cartel, CJNG, Tren de Aragua |

Once any of these three lands an entity on the SDN List, propagation math is identical - only the
category tag differs for display purposes.

## 2. Person-Centric Tracing (Board Notes, LinkedIn, Public Releases)

**Pipeline:**
1. Extract raw officer names from every entity's registry record (Sayari, Companies House
   officers/PSC, SEC DEF 14A proxy filings).
2. Disambiguate before trusting the name - anchor with secondary identifiers (date of birth,
   co-officer overlap, shared address, corroborating LinkedIn profile). Without a secondary anchor,
   treat a name match as Grade D/F.
3. Corroborate via LinkedIn and press releases - board-appointment press releases and LinkedIn
   employment history validate the person is real and the appointment is real, not just a registry entry.
4. Flag nominee patterns - count active directorships per disambiguated person across unrelated
   entities (>=10 triggers the existing +15 point nominee-director scoring rule).
5. Propagate risk through the person - if a person is an officer of a blocked entity anywhere in the
   graph, every other directorship they hold inherits a lower-severity "proximity via shared officer" flag.

**Schema additions needed:** `corroboration_sources` array on nominee_person nodes (LinkedIn URL, press
release URL, board minutes citation, each independently provenance-linked); `directorship_count` field;
new edge type `SHARED_OFFICER` distinct from `OFFICER_DIRECTOR`.

**Sayari fuzzy-matching note:** Sayari's entity-matching can resolve a differently-named front company
to the same real underlying company/person. Treat these matches as confidence-scored, not binary -
e.g., shared registered agent alone ~30-40%, shared registered agent + shared officer + incorporation
timing ~60-70% (Grade B/C), exact address + officer + name-similarity match approaches Grade A/B. Never
treat a Sayari fuzzy match as automatically Grade A without independent corroboration.

## 3. Addresses, Registered Agents & Formation Law Firms

**Why this matters:** Registered agents and formation law firms are literal gatekeepers who form
shells in bulk. Real example: in Wyoming, two firms - Registered Agents Inc. and Cloud Peak Law (a law
firm acting as a mass registered agent) - together registered 55% of all Wyoming incorporations in
2023, and 40% of Wyoming LLCs list an address at those two buildings. This is a structural-opacity
signal about the jurisdiction, not evidence any specific entity is illicit.

**New node types:**
- `address_hub` - first-class node with `entity_count` field (distinct entities sharing the exact
  address). Powers the existing "+20 points: mass-registration address, >=50 distinct entities" rule.
- `facilitator` - registered agents, formation law firms, CSPs. Distinct from `shell_intermediary` -
  these form shells for many mostly-legitimate clients; score the concentration pattern, never the
  facilitator itself.

**New edge types:**
- `REGISTERED_AGENT_FOR` (facilitator -> every entity it formed)
- `SHARED_ADDRESS` (now points at an address_hub node instead of flat entity-to-entity string match)

**Facilitator-fan-out metric:** same registered agent used 3 times = normal. Same registered agent used
across every entity in a single investigation's ownership chain = a pattern worth flagging independent
of any individual entity's score.

## 4. The Three-Link Chain (Shell Detection -> Bad-Actor Connection)

**Link 1 - Detect the shell.** Address hub, registered agent concentration, nominee director fan-out,
no web presence. This is a pattern, not a connection. Grade C/D at best on its own.

**Link 2 - Resolve the legal person or successor entity.** Front company matched to real company via
Sayari fuzzy matching or shared registered agent/officer/incorporation-timing signals. Score as a
confidence percentage (30-70%+), mapped to the schema's A-F grades - never treat as binary.

**Link 3 - Propagate to a known bad actor.** Check whether the resolved person/entity appears anywhere
in the ownership graph as an officer of, or owned 50%+ by, an entity on a sanctions list (Section 1
logic). If yes: proximity flag with exact citation of sanctioned party and hop count. If no: the honest
output is "shell-pattern detected, no confirmed bad-actor link found" - a legitimate finding, not a
tool failure.

**Critical discipline:** Links 1 and 2 never independently claim a bad-actor connection. A shell
pattern with no Link 3 hit stays labeled structural-opacity lead only. The executive_rationale must
state confidence at every hop, not just the final composite score.

## 5. Open Questions (Unresolved)

- "New website to reference off an API" mentioned in team notes - source/name not yet confirmed.
  Needs identification before it can be evaluated as a data source addition.
- Hackathon logistics (coupon/credits) tracked separately by the team, not a research item for this doc.
