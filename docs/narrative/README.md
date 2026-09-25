# Narrative copy

All plain-English text in the app and in the Lead Dossier comes from [`config/narrative_templates.yaml`](../../config/narrative_templates.yaml). Each piece is a fixed template filled with sourced fields; nothing is generated freely. The files in this folder are rendered output. Don't hand-edit them. Change the template or the input, then regenerate:

```sh
python3 -m narrative.render narrative/inputs/serniya.json  > docs/narrative/serniya_lead_dossier.md
python3 -m narrative.render narrative/inputs/palantir.json > docs/narrative/palantir_lead_dossier.md
python3 -m narrative.render narrative/inputs/serniya.json --rationale -v   # rationale only; logs skipped templates
python3 -m unittest discover -s tests -t .                                 # spec section 5 tests
```

## Who each piece is for

| Piece | Reader | What it has to do |
|---|---|---|
| Executive rationale | OIG intake analyst deciding in under a minute whether to open the dossier | Say what public money is involved, what was found, what couldn't be checked, and that this is a lead and not a finding |
| Money-trail caption | IG intake analyst, auditor | Show whether federal money reached a company connected to a restricted party |
| Ownership caption | Investigator, suspension-and-debarment official | Show who ultimately benefits, and flag chains that stop at a company |
| Network caption | Investigator, researcher | Show shared officers, owners and addresses |
| Supply-chain caption | Investigator, export-control analyst | Show where goods move, including through other countries |
| Lead Dossier | OIG intake (primary); investigator or auditor; S&D official; researcher | Put every fact next to its source so each one can be checked independently |

## Tone rules the templates enforce

- **Describe records, not intent.** Say "listed on the OFAC SDN List", not "sanctioned bad actor".
- **State absence precisely.** Say "No record found in {source} as of {date}", never "clean".
- **Allegations are labelled.** Any indictment evidence carries the presumption-of-innocence notice, and delistings carry a removal notice.
- **Quote the source's own words.** When a source uses a term we can't use in our own voice (Treasury's "front companies"), it appears only as a quotation.
- **Say when a view wasn't produced.** An empty graph whose check was never run reads "This view was not produced…", never "no records".

## Additions to the spec (flag for sign-off)

These templates go beyond narrative-copy-spec §2–§4. Each one exists because the spec's wording would have been inaccurate for a real case:

- `money.none_with_exclusion`: a party with no awards but a SAM.gov exclusion record.
- `strongest.self_listed`: the screened entity is itself listed. The spec's wording assumes a listed party some links away.
- `result.score`: a bridge to the current `composite_risk_score` contract until tiers exist.
- `money_trail.empty_no_award`: the spec's empty state says "this recipient", which is false for a non-recipient.
- `graph_not_run`, `allegation_notice`, `removal_notice`, and the `export_denial_affiliates` evidence type.

Signal names and definitions in `narrative/inputs/*.json` are provisional. They should come from the signal config once the scoring engine defines the seven families.
