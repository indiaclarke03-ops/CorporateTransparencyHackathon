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
| State-sponsor / country programs | Executive-Order based (Russia, Iran, North Korea, Cuba, Syria) | Serniya Engineering, E.O. 14024 |
| Non-state terrorist actors | Specially Designated Global Terrorist / Foreign Terrorist Organization designation, added to the Specially Designated Nationals List | Hamas, Hezbollah-linked entities |
| Cartels / international crime syndicates | Foreign Terrorist Organization designations extended to cartels in 2025, narcotics trafficking program | Sinaloa Cartel, CJNG, Tren de Aragua |

Once any of these three categories lands an entity on the Specially Designated Nationals List, the
propagation math is identical - only the category tag differs for display purposes.

## 2. Person-Centric Tracing (Board Notes, LinkedIn, Public Releases)

**Pipeline:**
1. Extract raw officer names from every entity's registry record (Sayari, UK Companies House
   officer/Person with Significant Control records, SEC proxy statement filings).
2. Confirm identity before trusting the name - anchor with a second identifier (date of birth,
   overlapping co-officer, shared address, a corroborating LinkedIn profile). Without a second anchor,
   treat a name match as a low-confidence grade only.
3. Confirm through LinkedIn and press releases - board-appointment press releases and LinkedIn work
   history confirm the person is real and the appointment is real, not just a registry entry.
4. Flag reused-director patterns - count active board seats per confirmed person across unrelated
   companies. Ten or more active seats triggers the existing scoring bonus for a reused director.
5. Spread risk through the person - if a person is an officer of a blocked company anywhere in the
   graph, every other board seat they hold gets a lower-severity "linked through a shared officer" flag.

**Schema additions needed:** a list field for corroborating sources on person nodes (LinkedIn link,
press release link, board minutes citation, each with its own source link); a board-seat count field;
a new connection type for "shares an officer with," kept separate from "is an officer or director of."

**Sayari matching note:** Sayari's matching feature can connect a differently-named front company to
the same real underlying company or person. Treat these matches as a confidence percentage, not a yes
or no answer - for example, sharing only a registered agent might be about 30 to 40 percent confidence,
while sharing a registered agent plus an officer plus matching incorporation timing moves that to about
60 to 70 percent. Never treat a Sayari match as fully confirmed without a second, independent source.

## 3. Addresses, Registered Agents and Formation Law Firms

**Why this matters:** Registered agents and formation law firms set up shell companies in bulk. Real
example: in the state of Wyoming, two firms - Registered Agents Inc. and Cloud Peak Law, a law firm
acting as a mass registered agent - together registered 55 percent of all Wyoming companies formed in
2023, and 40 percent of Wyoming limited liability companies list an address at those two buildings.
This points to the state's rules being loose, not to any one specific company being illicit.

**New node types:**
- An address node with a count of how many separate companies share that exact address. This powers
  the existing scoring bonus for a mass-registration address with fifty or more companies.
- A facilitator node type for registered agents, formation law firms, and corporate service providers.
  Kept separate from the shell-company node type, since these firms set up shells for many mostly
  legitimate clients. Score the pattern of concentration, never the facilitator itself.

**New connection types:**
- "Is the registered agent for" (facilitator to every company it formed)
- "Shares an address with" (now pointing at the address node instead of a plain text match between
  two companies)

**Facilitator concentration check:** the same registered agent used three times is normal. The same
registered agent used across every company in one investigation's ownership chain is worth flagging on
its own, apart from any individual company's score.

## 4. The Three-Link Chain (Shell Detection to Bad-Actor Connection)

**Link 1 - Detect the shell.** Address concentration, registered agent concentration, reused director
pattern, no real-world presence online. This is a pattern, not a confirmed connection. Low confidence
grade on its own.

**Link 2 - Resolve the legal person or successor company.** A front company matched to a real company
through Sayari's matching feature or through shared registered agent, officer, or incorporation-timing
signals. Score this as a confidence percentage, mapped to the existing letter grades - never treat it
as a simple yes or no.

**Link 3 - Connect to a known bad actor.** Check whether the resolved person or company appears
anywhere in the ownership graph as an officer of, or owner of fifty percent or more of, a company on a
sanctions list (using the Section 1 logic). If yes: add a proximity flag naming the exact sanctioned
party and how many steps away. If no: the honest result is "shell pattern found, no confirmed link to a
bad actor" - a real and useful finding on its own, not a failure of the tool.

**Important discipline:** Links 1 and 2 never get to claim a bad-actor connection by themselves. A
shell pattern with no Link 3 match stays labeled as a structural-opacity lead only. The written summary
for each case must state the confidence at every step, not just the final combined score.

## 5. Open Questions (Unresolved)

- A "new website to reference off an API" was mentioned in team notes - the name has not been
  confirmed yet. It needs to be identified before it can be evaluated as a new data source.
- Hackathon logistics (gift codes and credits) are tracked separately by the team and are not a
  research item for this document.
