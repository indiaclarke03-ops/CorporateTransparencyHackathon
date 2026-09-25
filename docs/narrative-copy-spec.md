# Narrative copy specification

Defines the plain-English text in the app and reports: the `executive_rationale`, the caption for each graph, and the Lead Dossier. This extends section 8 of `follow-the-public-dollar-spec.md` and must follow its accuracy principles (section 2).

## 1. Rules for all narrative text

1. **Templates only.** Every sentence is a fixed template filled with fields from stored source records. No free-text generation, no LLM.
2. **Conditional sentences.** A sentence renders only when its data exists. If a field is missing, the sentence is dropped or replaced with its "not assessable" variant. Never render an empty placeholder or a guessed value.
3. **Every filled value carries a source.** In the UI, each value links to its source record. In the PDF, each sentence ends with a footnote.
4. **Describe, don't characterize.** The text says what the records show, not what they mean about intent.
5. **Absence is stated precisely.** "No record found in {source} as of {date}", never "clean", "no risk", or "no links".
6. **Numbers and dates are exact.** Amounts appear exactly as in the source, in US dollars with the source's precision. Dates use the format `25 September 2026`. No rounding in the dossier. The dashboard may abbreviate ("$4.2M") with the exact value on hover.
7. **Names appear as the source records them**, with the canonical name first and other names listed in the identity section.

### 1.1 Controlled vocabulary

| Use | Never use |
|---|---|
| risk lead, signal, pattern | suspicious, fraudulent, criminal, illicit |
| listed on {list name} | sanctioned entity (unless quoting the list type), bad actor |
| linked to, owned by, officer of (as the source states) | controlled by, fronting for, behind (unless the source states control) |
| company with {signals} | shell company, front company |
| possible match (unconfirmed) | same as, identical to (unless Confirmed) |
| no record found in {source} as of {date} | clean, no risk, cleared |

The words "shell" and "front" appear only in methodology text describing what the signals are designed to detect, never about a named entity.

---

## 2. Executive rationale

### What it is

The three-to-six-sentence paragraph at the top of the entity page and on page 2 of the dossier. It answers: what public money is involved, what the screen found, what could not be checked, and what the reader should do with it.

### Who reads it

A reader deciding in under a minute whether to open the full dossier: an Office of Inspector General intake analyst, an auditor, a contracting or suspension-and-debarment official, or a researcher triaging a list.

### Template

Sentences render in this order. Bracketed conditions control whether each appears.

1. **Money.** `{entity_name} received {award_count} federal {award_type_plural} totaling {total_obligated} from {agency_list} between {first_award_date} and {last_award_date}.`
   - [No public-money records] → `No federal contract or loan records were found for {entity_name} in {sources_checked} as of {as_of_date}.`
2. **Identity confidence.** `The recipient was matched to corporate records at the {match_level} level using {match_basis}.`
   - Example `match_basis`: "a shared UEI", "a shared registration number".
3. **Result.** `The screen found signals in {families_fired_count} of 7 signal families: {families_fired_list}. Overall tier: {tier}.`
4. **Strongest finding** [only if a Proximity signal fired]. `A party listed on {list_name} appears {hop_count} {link_or_links} away, through {path_summary}.`
   - [PX3 fired] Add: `Listed parties together hold {combined_share}% of the ownership reported in {source_name}.`
5. **Gaps** [if any signal is not assessable]. `{not_assessable_count} signals could not be assessed because {reason_list}.`
   - Example reasons: "no trade records were available", "Tradeverifyd returned no match".
6. **Notice** (always). `This is a risk lead for human review, not a finding of wrongdoing.`

### Example (illustrative fields only, not real data)

> Example Corp LLC received 3 federal contracts totaling $1,250,000.00 from the Department of Energy between 3 March 2025 and 14 January 2026. The recipient was matched to corporate records at the Confirmed level using a shared UEI. The screen found signals in 3 of 7 signal families: Public money, Structure, Proximity. Overall tier: High. A party listed on the OFAC SDN List appears 2 links away, through its majority owner. 2 signals could not be assessed because no trade records were available. This is a risk lead for human review, not a finding of wrongdoing.

---

## 3. Graph captions

Each graph in the app and dossier has a fixed caption with three parts, shown in this order: **what it shows**, **how to read it**, and **why it matters**. The "why it matters" line explains the purpose of the view in general terms. It never makes a claim about the specific entity.

### 3.1 Money trail

- **What it shows:** `The path from a federal award to {entity_name} and onward to any listed or flagged party, one relationship per step.`
- **How to read it:** `Each step is a relationship recorded in a source. Select a step to see its source record. Dashed steps rely on a possible (unconfirmed) match.`
- **Why it matters:** `This is the core question for oversight: whether federal money reached a company connected to a restricted party.`
- **Empty state:** `No path from this recipient to a listed party was found within {max_hops} links in {sources_checked} as of {as_of_date}.`
- **Primary reader:** IG intake analyst, auditor.

### 3.2 Ownership chain

- **What it shows:** `Reported owners of {entity_name}, traced upward to the ultimate owners where the sources record them.`
- **How to read it:** `Percentages appear where the source reports them. A chain that ends at a company rather than a person is marked "ownership ends at a company".`
- **Why it matters:** `Oversight bodies need to know who ultimately benefits from a federal award. Chains that never reach a person make that harder to establish.`
- **Empty state:** `No ownership records were found for {entity_name} in {sources_checked} as of {as_of_date}.`
- **Primary reader:** Investigator, suspension-and-debarment official.

### 3.3 Network

- **What it shows:** `Officers, owners, and linked companies within {hop_count} links of {entity_name}.`
- **How to read it:** `Node shape and label show the entity type and any list status. Lines show the relationship type recorded in the source.`
- **Why it matters:** `Shared officers and owners can link a recipient to other companies, including ones that have closed or been listed.`
- **Primary reader:** Investigator, researcher.

### 3.4 Supply chain

- **What it shows:** `Recorded suppliers and customers of {entity_name}, by tier, with the goods codes (HS codes) on each relationship.`
- **How to read it:** `Sayari and Tradeverifyd results are shown side by side with their sources. A relationship appearing in both is marked.`
- **Why it matters:** `Trade relationships show where goods and money move beyond ownership, including through intermediaries in other countries.`
- **Empty state:** `No trade records were found for {entity_name} in {sources_checked} as of {as_of_date}. Trade that is not recorded in customs data would not appear here.`
- **Primary reader:** Investigator, export-control analyst.

### 3.5 Signal summary

- **What it shows:** `Each signal the screen checks, grouped by family, marked as found, not found, or not assessable.`
- **How to read it:** `Select a signal to see its evidence and sources. The tier is based on how many families have signals, not on any single signal.`
- **Why it matters:** `No single signal indicates wrongdoing. Signals across several families are a stronger reason for review.`
- **Primary reader:** All readers.

### 3.6 Dashboard panels

Each dashboard panel uses a one-line caption plus a source line.

| Panel | Caption | Reader |
|---|---|---|
| Federal spending in watched sectors | `Federal contract obligations over time in {sector_list}.` | Researcher, auditor |
| Sanctions and export-control actions | `Official notices from {agency_list}, by publication date.` | Researcher, compliance |
| Commodity trade inflections | `Goods codes whose US import trend is changing, as reported by Tradeverifyd.` | Researcher |
| Screening portfolio | `Entities screened by your team, by tier, and how that has changed.` | Team lead |

Every panel ends with: `Source: {source_name}. Data as of {as_of_date}.`

---

## 4. Lead Dossier

### What it is

The downloadable PDF for one entity. It is built to support a referral to an Office of Inspector General, or a review by an auditor or suspension-and-debarment official, by presenting every fact with its source.

### Who reads it

| Reader | What they need from the dossier |
|---|---|
| OIG hotline or intake analyst (primary) | Enough to decide whether to open a matter: who, which award, what was found, and where each fact comes from |
| OIG investigator or auditor | The full evidence trail, to verify each fact independently |
| Suspension-and-debarment official, contracting officer | Identity, award details, and any listed-party connection |
| Researcher or journalist | Methodology and limitations, to judge how far the findings can be relied on |

Each OIG has its own hotline and referral process. The dossier supplies the evidence; the team must confirm the receiving office's required format before submitting anything **[VERIFY per receiving office]**.

### Structure and copy

**Cover page**
- Title: `Lead dossier: {entity_name}`
- Lines: `Identifiers: {identifier_list}`, `Report ID: {report_id}`, `Generated: {generated_at}`, `Content hash: {content_hash}`, `Prepared by: {analyst_name}`
- Notice: `This dossier presents a risk lead for human review. It is not a finding of wrongdoing. Every statement is sourced; see the sources appendix.`

**1. Executive rationale** — as in section 2.

**2. Why this dossier was prepared**
- `This entity was screened because {screening_reason}.`
- Example reasons: "it received a federal contract in a watched sector", "an analyst requested it".
- `Intended use: to help an oversight body decide whether further review is warranted.`

**3. Identity** — canonical name, other and prior names, identifiers, addresses, registration date and status, and the matched records with match level and basis. Caption: `How this entity was identified, and how confident the match is.`

**4. Federal awards and loans** — a table of each record: program, award ID, amount, date, awarding agency, source. Caption: `Federal money received by this entity, as recorded in {sources_checked}.`

**5. Signals found** — for each signal that fired: name, one-sentence definition (from config), evidence, sources.
- Sentence template: `{signal_name}: {signal_definition} Evidence: {evidence_summary}.`
- `evidence_summary` is itself a template per signal. Example for LC1: `registered on {registration_date}; first award on {first_award_date}, {days_between} days later.`

**6. Signals not found and not assessable** — listed separately. Caption: `What the screen checked without finding a signal, and what it could not check.`

**7. Graphs** — money trail, ownership, network, supply chain, each with the captions in section 3 and an equivalent table beneath it.

**8. Analyst review** — `Review status: {decision}, {review_date}, by {analyst_name}. Note: {analyst_note}` [only if a review exists]. The analyst note is the one place for human-written text and is labeled as such.

**9. Methodology and limitations** — fixed text maintained in config:
- How signals and tiers work, with the config version.
- Coverage limits: `Federal grants passed through state agencies to sub-recipients are not covered.` `Trade not recorded in customs data would not appear.` `A missing list flag means no record was found, not that none exists.`

**10. Sources appendix** — every source record: source name, record ID, retrieval time, link.

---

## 5. Implementation notes for the build

- Store templates in `config/narrative_templates.yaml`, keyed by section and condition, so wording can change without code changes.
- Each template declares its required fields. The renderer skips any template whose required fields are missing and logs the skip.
- Add tests that render every template with a fixture where each field is present, and a fixture where each field is missing, and assert no placeholder text appears in output.
- Add a lint test that fails if any rendered narrative contains a word from the "never use" column in section 1.1, outside the methodology section.
