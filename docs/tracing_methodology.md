# Tracing Methodology — Shell Detection to Bad-Actor Connection

## 1. Sanctions Propagation Logic (Legal-Person UBO -> Sanctions List)

**Core mechanism:** OFAC's 50% Rule states that any entity owned 50% or more, directly or indirectly,
in the aggregate, by one or more blocked persons is itself automatically blocked, even if never listed
by name. This works recursively: if a blocked person owns >=50% of Company A, Company A becomes a
blocked person for everything it owns downstream.

**Algorithm:**
1. Seed the graph - tag every node directly on a sanctions list (SDN, UN Consolidated List, EU
   Consolidated List, UK OFSI) with list type and program. Sayari entities carry a native `sanctioned`
   boolean and a `pep` boolean, so seeding can pull directly from Sayari data without a separate
   OFAC cross-reference step when Sayari access is available.
2. Propagate outward - for each entity, sum ownership stakes held by already-blocked parties (direct +
   inherited indirect, using the `shares` struct on Sayari relationships for percentages). If total >=
   50%, mark "blocked by extension."
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
| State-sponsor / country programs | Executive-Order based (Russia, Iran, North Korea, Cuba, Syria) | Serniya Engineering, E.O. 14024 |
| Non-state terrorist actors | Specially Designated Global Terrorist / Foreign Terrorist Organization designation, added to the Specially Designated Nationals List | Hamas, Hezbollah-linked entities |
| Cartels / international crime syndicates | Foreign Terrorist Organization designations extended to cartels in 2025, narcotics trafficking program | Sinaloa Cartel, CJNG, Tren de Aragua |

Once any of these three categories lands an entity on the Specially Designated Nationals List, the
propagation math is identical - only the category tag differs for display purposes.

## 2. Person-Centric Tracing (Board Notes, LinkedIn, Public Releases) [UPDATED]

**Pipeline:**
1. Extract raw officer names from every entity's registry record (Sayari, UK Companies House
   officer/Person with Significant Control records, SEC proxy statement filings). Sayari relationships
   carry a `position` struct directly on OFFICER_DIRECTOR-type edges, giving the actual title.
2. Confirm identity before trusting the name - anchor with a second identifier (date of birth,
   overlapping co-officer, shared address, a corroborating LinkedIn profile). Without a second anchor,
   treat a name match as a low-confidence grade only.
3. Confirm through LinkedIn and press releases - board-appointment press releases and LinkedIn work
   history confirm the person is real and the appointment is real, not just a registry entry.
4. Flag reused-director patterns - count active board seats per confirmed person across unrelated
   companies (Sayari's `degree` field on a person entity is a ready-made proxy for this). Ten or more
   active seats triggers the existing scoring bonus for a reused director.
5. Spread risk through the person - if a person is an officer of a blocked company anywhere in the
   graph, every other board seat they hold gets a lower-severity "linked through a shared officer" flag.

**Schema fields (updated to match real Sayari data model):** `corroboration_sources` array on person
nodes (LinkedIn link, press release link, board minutes citation, each with its own source link);
`directorship_count` field; a `SHARED_OFFICER` connection type kept separate from `OFFICER_DIRECTOR`.

**Sayari `possibly_same_as` mechanism (replaces the earlier invented confidence-percentage guess):**
Sayari's own resolution engine returns a relationship of type `possibly_same_as` between two entities
it believes may be the same underlying company or person, with a `match_keys` array populated showing
exactly which identifiers triggered the match (e.g., name variant, shared address, shared registration
number). This is real, provenance-backed evidence from Sayari's own matching logic, not a heuristic we
invented. Confidence grading should be driven by the number and type of `match_keys` present - a single
weak key (e.g., only a similar name) stays low confidence (Grade C/D), while multiple strong keys
(shared registered address plus shared officer plus matching registration number) supports Grade B,
and an exact identifier match (shared LEI, tax ID, or company number) supports Grade A. Never upgrade a
`possibly_same_as` match to Grade A on name similarity alone. The A–D grades are now the product's match
scale (spec §7.1).


## 3. Addresses, Registered Agents and Formation Law Firms

**Why this matters:** Registered agents and formation law firms set up shell companies in bulk. Real
example: in the state of Wyoming, two firms - Registered Agents Inc. and Cloud Peak Law, a law firm
acting as a mass registered agent - together registered 55 percent of all Wyoming companies formed in
2023, and 40 percent of Wyoming limited liability companies list an address at those two buildings.
This points to the state's rules being loose, not to any one specific company being illicit.

**New node types:**
- An `address_hub` node with an `entity_count` field (how many separate companies share that exact
  normalized address). This powers the existing scoring bonus for a mass-registration address with fifty
  or more companies. Sayari has no address entity type, so the application computes `entity_count` itself:
  it counts distinct companies whose Sayari `addresses` normalize to the same address (via Sayari entity
  search), cross-checked with Tradeverifyd's companies-in-radius once backlog B1 is resolved. Sayari's
  `mass_address_usage` risk factor is a second, vendor-side signal. (Corrected 25 Sep 2026: an earlier
  draft cited an `edge_counts` field on an address entity; neither exists in the Sayari REST spec.)
- A `facilitator` node type for registered agents, formation law firms, and corporate service
  providers. Kept separate from the shell-company node type, since these firms set up shells for many
  mostly legitimate clients. Score the pattern of concentration, never the facilitator itself. Sayari's
  `degree` field (number of outgoing relationships) on a facilitator entity is a ready-made fan-out metric.

**New connection types:**
- `REGISTERED_AGENT_FOR` (facilitator to every company it formed; maps to Sayari's `registered_agent_of` /
  `has_registered_agent` relationship types)
- `SHARED_ADDRESS` (now points at the address_hub node instead of a plain text match between two companies)

**Facilitator concentration check:** the same registered agent used three times is normal. The same
registered agent used across every company in one investigation's ownership chain is worth flagging on
its own, apart from any individual company's score.

## 4. The Three-Link Chain (Shell Detection to Bad-Actor Connection)

**Link 1 - Detect the shell.** Address concentration, registered agent concentration, reused director
pattern, no real-world presence online. This is a pattern, not a confirmed connection. Low confidence
grade on its own.

**Link 2 - Resolve the legal person or successor company.** A front company matched to a real company
through Sayari's native `possibly_same_as` relationship type and its `match_keys` evidence, or through
shared registered agent/officer/incorporation-timing signals when Sayari data isn't available. Score
per the match_keys grading rule in Section 2 - never treat identity resolution as a simple yes or no.

**Link 3 - Connect to a known bad actor.** Check whether the resolved person or company appears
anywhere in the ownership graph as an officer of, or owner of fifty percent or more of, a company on a
sanctions list (using the Section 1 logic, seeded directly from Sayari's `sanctioned`/`pep` flags where
available). If yes: add a proximity flag naming the exact sanctioned party and how many steps away. If
no: the honest result is "shell pattern found, no confirmed link to a bad actor" - a real and useful
finding on its own, not a failure of the tool.

**Important discipline:** Links 1 and 2 never get to claim a bad-actor connection by themselves. A
shell pattern with no Link 3 match stays labeled as a structural-opacity lead only. The written summary
for each case must state the confidence at every step, not just the final combined score.

## 5. Open Questions (Unresolved)

- A "new website to reference off an API" was mentioned in team notes - the name has not been
  confirmed yet. It needs to be identified before it can be evaluated as a new data source.
- Hackathon logistics (gift codes and credits) are tracked separately by the team and are not a
  research item for this document.
- Actual Sayari API/bulk-data access is still not connected in this environment (see planning_doc.md
  Section 5). Field mappings above are drafted against Sayari's public documentation
  (id, label, translated_label, sanctioned, pep, closed, degree, relationship_count, shares, position,
  possibly_same_as.match_keys) so integration should be a straight pass-through once access is granted.
  Checked against the Sayari OpenAPI spec (`docs/vendor/sayari/openapi.yml`) on 25 September 2026:
  `label_en` is `translated_label` ("Label in English"), `edge_counts` is `relationship_count` (count per
  relationship type), the REST entity key is `id` (the connector calls it `entity_id`), and each
  `match_keys` item is an object `{key, normalized, original}`. `degree` is confirmed as "Number of
  outgoing relationships".
