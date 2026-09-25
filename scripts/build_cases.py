"""Build one investigation case per risk typology for the graph explorer.

Inputs, all traceable:
  - Sayari profiles recorded in fixtures/recorded/sayari/ (RSF gold network, PPP fraud cases)
  - Sayari profiles pulled live via the Sayari MCP connector on 25 Sep 2026, transcribed below as
    compact extracts (entity IDs, labels, relationship text exactly as Sayari states it)
  - Tradeverifyd responses recorded in fixtures/recorded/tradeverifyd/
  - Primary sources found with Tavily and registered in research/sources.json

Every node carries its Sayari entity URL; every edge carries the Sayari relationship text. Nothing
here is generated: risk signals are copied from Sayari risk flags or primary-source statements.

Writes public/fixtures/<case>.json and lib/generated/cases.json (the case index).
Run: python3 scripts/build_cases.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
REC = ROOT / "fixtures" / "recorded"
OUT = ROOT / "public" / "fixtures"
SAYARI = "https://graph.sayari.com/resource/entity/"
SOURCES = {s_id: s for s_id, s in json.load(open(ROOT / "research" / "sources.json"))["sources"].items()} \
    if isinstance(json.load(open(ROOT / "research" / "sources.json"))["sources"], dict) else \
    {s["id"]: s for s in json.load(open(ROOT / "research" / "sources.json"))["sources"]}

# Human-readable names for the Sayari risk flags we surface (the rest are summarised by count).
FLAG_TEXT = {
    "sanctioned_usa_ofac_sdn": ("On the OFAC SDN List", "CRITICAL"),
    "ofac_sdgt_sanctioned": ("OFAC Specially Designated Global Terrorist", "CRITICAL"),
    "ofac_fto_sanctioned": ("US Foreign Terrorist Organization", "CRITICAL"),
    "sanctioned_eu_sanctions": ("On the EU sanctions list", "CRITICAL"),
    "sanctioned_gbr_fcdo": ("On the UK sanctions list", "CRITICAL"),
    "sanctioned_can_gac": ("On Canada's sanctions list", "HIGH"),
    "sanctioned_ukr_nsdc": ("On Ukraine's sanctions list", "HIGH"),
    "sanctioned_isr_mod_nbctf": ("On Israel's counter-terror financing list", "HIGH"),
    "ofac_50_percent_rule": ("OFAC 50% rule: owned 50%+ by blocked persons", "CRITICAL"),
    "owned_by_sanctioned_entity": ("Owned by a sanctioned entity", "HIGH"),
    "controlled_by_ofac_sdn": ("Controlled by an OFAC SDN", "HIGH"),
    "forced_labor_xinjiang_uflpa": ("On the UFLPA Entity List (Xinjiang forced labour)", "CRITICAL"),
    "owner_of_forced_labor_xinjiang_uflpa": ("Owns a UFLPA-listed entity", "HIGH"),
    "wro_entity": ("Subject to a CBP Withhold Release Order", "HIGH"),
    "forced_labor_xinjiang_geospatial": ("Operations located in Xinjiang (geospatial)", "HIGH"),
    "law_enforcement_action": ("Subject of a law-enforcement action", "HIGH"),
    "law_enforcement_action_recent": ("Recent law-enforcement action", "HIGH"),
    "regulatory_action": ("Subject of a regulatory action", "MEDIUM"),
    "export_controls": ("On an export-control list", "HIGH"),
    "mass_address_usage": ("Registered at a mass-registration address", "MEDIUM"),
    "reputational_risk_terrorism_recent": ("Recent terrorism-related adverse media", "HIGH"),
    "reputational_risk_organized_crime_recent": ("Recent organised-crime adverse media", "HIGH"),
    "sanctioned_adjacent": ("One hop from a sanctioned party", "MEDIUM"),
    "export_controls_adjacent": ("One hop from an export-controlled party", "MEDIUM"),
    "controlled_by_mass_business_registration": ("Controlled by a mass business registrant", "MEDIUM"),
    "soe_adjacent": ("One hop from a state-owned enterprise", "LOW"),
}

REL_MAP = {
    "has_shareholder": ("OWNS_OR_CONTROLS", True), "shareholder_of": ("OWNS_OR_CONTROLS", False),
    "subsidiary_of": ("OWNS_OR_CONTROLS", True), "has_subsidiary": ("OWNS_OR_CONTROLS", False),
    "has_director": ("OFFICER_DIRECTOR", True), "has_officer": ("OFFICER_DIRECTOR", True),
    "has_manager": ("OFFICER_DIRECTOR", True), "has_member_of_the_board": ("OFFICER_DIRECTOR", True),
    "linked_to": ("LINKED_TO", True), "carrier_of": ("SUPPLY_CHAIN_SHIPMENT", False),
}
REL_TEXT = {
    "has_shareholder": "is a shareholder of", "shareholder_of": "is a shareholder of",
    "subsidiary_of": "is the parent of", "has_subsidiary": "is the parent of",
    "has_director": "is a director of", "has_officer": "is an officer of",
    "has_manager": "is a manager of", "has_member_of_the_board": "is a board member of",
    "linked_to": "is linked to", "carrier_of": "carried a shipment for",
}


def signals(flags, source_label="Sayari risk flags", evidence=None, source_id=None):
    out = []
    for f in flags or []:
        if f in FLAG_TEXT:
            name, sev = FLAG_TEXT[f]
            out.append({"signal_name": name, "severity": sev, "provenance_source": source_label,
                        "evidence_record": evidence, "source_authority": "Sayari (aggregating official lists)",
                        **({"source_id": source_id} if source_id else {})})
    return out


def node_type(e, root=False, public=False):
    sanctioned = (e.get("risk_flags") or e.get("risk") or {}).get("sanctioned")
    if public:
        return "public_recipient"
    if sanctioned:
        return "sanctioned_entity"
    if e.get("type") == "person":
        return "associated_person"
    return "shell_intermediary" if root else "related_company"


def make_node(e, root=False, public=False, extra=None):
    risk = e.get("risk_flags") or e.get("risk") or {}
    flags = risk.get("risk_levels", [])
    attrs = e.get("attributes", {})
    details = {
        "sayari_url": SAYARI + e["entity_id"],
        "entity_kind": e.get("type"),
        "countries": attrs.get("countries") or e.get("countries") or [],
        "aliases": [n for n in attrs.get("names", []) if n != e["label"] and n != "Array"][:6],
        "addresses": attrs.get("addresses", e.get("addresses", []))[:5],
        "identifiers": attrs.get("identifiers", e.get("identifiers", []))[:6],
        "registration_date": attrs.get("registration_date"),
        "company_type": attrs.get("company_type"),
        "status": attrs.get("status"),
        "business_purpose": attrs.get("business_purpose", [])[:3],
        "sayari_sources": e.get("sources", []),
        "trade_count": e.get("trade_count"),
        "relationship_summary": (e.get("relationships") or {}).get("summary"),
        "risk_flag_count": len(flags),
    }
    details.update(extra or {})
    return {
        "id": e["entity_id"],
        "label": e["label"],
        "type": node_type(e, root, public),
        "jurisdiction": (details["countries"] or [None])[0],
        "entity_confidence": "A" if root else None,
        "risk_signals": signals(flags, evidence=SAYARI + e["entity_id"]),
        "sayari_pass_through": {
            "sanctioned": risk.get("sanctioned"), "pep": risk.get("pep"), "closed": e.get("closed"),
            "degree": None, "relationship_count": details["relationship_summary"] or {},
            "shares": [], "position": [], "possibly_same_as": [], "match_keys": [],
        },
        "details": {k: v for k, v in details.items() if v not in (None, [], {})},
    }


def add_profile(nodes, edges, profile, root=False, public=False, extra=None, max_per_rel=8):
    """Add a Sayari profile's entity and its direct relationships to the case graph."""
    rid = profile["entity_id"]
    if rid in nodes:
        nodes[rid]["details"].update({k: v for k, v in make_node(profile, root, public, extra)["details"].items() if v})
    else:
        nodes[rid] = make_node(profile, root, public, extra)
    for rel, items in (profile.get("relationships") or {}).items():
        if rel == "summary" or rel not in REL_MAP:
            continue
        rtype, inbound = REL_MAP[rel]
        for x in items[:max_per_rel]:
            if x["entity_id"] not in nodes:
                nodes[x["entity_id"]] = make_node(x)
            src, dst = (x["entity_id"], rid) if inbound else (rid, x["entity_id"])
            key = (src, dst, rtype)
            if any({e["source"], e["target"]} == {src, dst} and e["relationship_type"] == rtype for e in edges):
                continue
            edges.append({
                "source": src, "target": dst, "relationship_type": rtype,
                "ownership_percentage": x.get("shares_pct"),
                "provenance_ref": SAYARI + rid,
                "label": x.get("position") or f"{x['label']} {REL_TEXT[rel]} {profile['label']}",
                "sayari_relationship": rel,
                "former": x.get("former", False),
                "source_authority": "Sayari",
            })


def recorded(entity_id):
    return json.load(open(REC / "sayari" / f"get_entity_profile__{entity_id}.json"))["raw_response"]


def tv_recorded(op, tv_id):
    raw = json.load(open(REC / "tradeverifyd" / f"{op}__{tv_id}.json"))
    return json.loads(raw["raw_response"]["result"]["content"][0]["text"])


def src(sid):
    s = SOURCES.get(sid) or EXTRA_SOURCES[sid]
    return {"id": sid, "name": s["name"], "url": s["url"], "publisher": s.get("publisher")}


# Primary sources found with Tavily on 25 Sep 2026 that are not yet in research/sources.json.
EXTRA_SOURCES = {
    "S43": {"name": "Treasury press release SM1058: Prigozhin sanctions-evasion network in Sudan, incl. Meroe Gold (15 Jul 2020)",
            "url": "https://home.treasury.gov/news/press-releases/sm1058", "publisher": "U.S. Department of the Treasury"},
    "S44": {"name": "Treasury press release JY2164: companies advancing Russian malign activities in Africa (Broker Expert supplied Meroe Gold)",
            "url": "https://home.treasury.gov/news/press-releases/jy2164", "publisher": "U.S. Department of the Treasury"},
    "S45": {"name": "CBP: DHS issues Withhold Release Order on silica-based products made by Hoshine Silicon (Jun 2021)",
            "url": "https://www.cbp.gov/newsroom/national-media-release/department-homeland-security-issues-withhold-release-order-silica",
            "publisher": "U.S. Customs and Border Protection"},
    "S46": {"name": "DHS: UFLPA Entity List (Hoshine Silicon Industry (Shanshan) Co., Ltd. and subsidiaries, effective 21 Jun 2022)",
            "url": "https://www.dhs.gov/uflpa-entity-list", "publisher": "U.S. Department of Homeland Security"},
    "S47": {"name": "USAO M.D. Fla.: China-based chemical manufacturing companies and employees indicted for alleged fentanyl precursor distribution (title only)",
            "url": "https://www.justice.gov/usao-mdfl/pr/china-based-chemical-manufacturing-companies-and-employees-indicted-alleged-fentanyl-0",
            "publisher": "U.S. Department of Justice"},
    "S48": {"name": "DOJ: Feeding Our Future ringleader sentenced to 500 months ($250M child nutrition program fraud)",
            "url": "https://www.justice.gov/opa/pr/feeding-our-future-ringleader-sentenced-500-months", "publisher": "U.S. Department of Justice"},
}


def case(cid, title, typology, root_id, nodes, edges, score, grade, rationale, sources, audit, tools, public_money):
    root = nodes[root_id]
    return cid, {
        "investigation_summary": {
            "root_recipient": root["label"], "composite_risk_score": score, "confidence_rating": grade,
            "primary_typology": typology, "executive_rationale": rationale,
        },
        "case": {"id": cid, "title": title, "root_id": root_id, "sources": [src(s) for s in sources],
                 "tools_used": tools, "public_money": public_money},
        "nodes": list(nodes.values()), "edges": edges, "audit_trail": audit,
    }


def audit(*steps):
    return [{"step": i + 1, "source": s, "query_executed": q, "records_matched": n} for i, (s, q, n) in enumerate(steps)]


def rsf_gold():
    nodes, edges = {}, []
    tv = tv_recorded("entity_details", "256a4cc6-d8f4-4799-b31f-31afd3eb090d")
    ann = tv_recorded("entity_annotations", "256a4cc6-d8f4-4799-b31f-31afd3eb090d")["annotations"]
    score = tv_recorded("entity_score", "256a4cc6-d8f4-4799-b31f-31afd3eb090d")
    tv_extra = {"tradeverifyd": {
        "entity_id": tv.get("entity_id"), "name": tv.get("name"), "aliases": tv.get("aliases", [])[:4],
        "score": score.get("tradeverifyd_score"), "score_level": score.get("score_level"),
        "annotations": [{"name": a["name"], "description": a.get("description"), "url": a.get("category_url")} for a in ann][:8],
        "trade_relationships": 0,
    }}
    add_profile(nodes, edges, recorded("RoWARA0BHg-GoWvDJFBOSg"), root=True, extra=tv_extra)
    for eid in ["sAgA0QVKr-gjEAqoJvf0zg", "XtartWzEze9a18ZDKVad8A", "l-hTG9hSLd7dA4za2B7CRw", "GpzoSlwJiKSXyY0Rl51-6w",
                "Aq8D2ZKjaHPMSp7ZQdQ3-w", "dFB7YowXog_6EwiEur43RQ"]:
        add_profile(nodes, edges, recorded(eid))
    root = nodes["RoWARA0BHg-GoWvDJFBOSg"]
    root["risk_signals"] += [
        {"signal_name": f"Tradeverifyd score {score['tradeverifyd_score']} ({score['score_level']})", "severity": "HIGH",
         "provenance_source": "Tradeverifyd entity_score (recorded)", "evidence_record": None, "source_authority": "Tradeverifyd"},
        {"signal_name": "Shareholder is sanctioned: Abu Dharr Ahmmed holds shares in 4 UAE trading companies", "severity": "CRITICAL",
         "provenance_source": "Sayari get_entity_profile", "evidence_record": SAYARI + "sAgA0QVKr-gjEAqoJvf0zg", "source_authority": "Sayari"},
        {"signal_name": "Designated with the RSF leadership network (Treasury JY2772)", "severity": "CRITICAL",
         "provenance_source": "Treasury press release", "evidence_record": SOURCES["S36"]["url"], "source_id": "S36",
         "source_authority": "U.S. Department of the Treasury"},
    ]
    return case("rsf-gold", "AZ Gold and the RSF trading network (UAE)", "Sudan / UAE Arms & Gold", "RoWARA0BHg-GoWvDJFBOSg",
                nodes, edges, 88, "A",
                "A Dubai gold trader whose shareholder, Abu Dharr Ahmmed, is sanctioned and sits behind four other UAE general-"
                "trading companies, alongside links to RSF commander Algoney Hamdan Dagalo. The shared shareholder across a cluster of "
                "young trading firms is the classic front-company pattern. Tradeverifyd scores the entity High (258) with OFAC Sudan "
                "and SAM exclusion annotations. This is a risk lead for human review, not a finding of wrongdoing.[^S36]",
                ["S36"], audit(("Sayari", "get_entity_profile AZ Gold + 6 linked entities (recorded)", 7),
                               ("Tradeverifyd", "search_entities / entity_details / entity_annotations / entity_score (recorded)", 1),
                               ("Tavily", "Treasury press release for RSF designations", 1)),
                ["Sayari", "Tradeverifyd", "Tavily"],
                "No USAspending awards found; SAM.gov exclusion record present (Tradeverifyd annotation).")


def ppp():
    nodes, edges = {}, []
    add_profile(nodes, edges, recorded("S2sKpLjtsHqnJMTy6mwuTw"), root=True, public=True)
    add_profile(nodes, edges, recorded("DtI-nSSPD00ZgUxoSFxKuA"), public=True)
    nodes["S2sKpLjtsHqnJMTy6mwuTw"]["risk_signals"] += [
        {"signal_name": "Sponsor of federally funded child nutrition sites; founder sentenced to 500 months for a $250M fraud",
         "severity": "CRITICAL", "provenance_source": "DOJ press release (found with Tavily)", "evidence_record": EXTRA_SOURCES["S48"]["url"],
         "source_id": "S48", "source_authority": "U.S. Department of Justice"},
        {"signal_name": "Sites claimed to feed thousands of children within days or weeks of forming (registration-to-award gap)",
         "severity": "HIGH", "provenance_source": "DOJ press release", "evidence_record": EXTRA_SOURCES["S48"]["url"], "source_id": "S48",
         "source_authority": "U.S. Department of Justice"},
    ]
    nodes["DtI-nSSPD00ZgUxoSFxKuA"]["risk_signals"] += [
        {"signal_name": "Incorporated 1 Apr 2020, at the start of pandemic relief programmes (recent incorporation)", "severity": "MEDIUM",
         "provenance_source": "Sayari registry record", "evidence_record": SAYARI + "DtI-nSSPD00ZgUxoSFxKuA", "source_authority": "Minnesota registry via Sayari"}]
    return case("feeding-our-future", "Feeding Our Future (Minnesota child-nutrition fraud)", "Pandemic Loan Fraud", "S2sKpLjtsHqnJMTy6mwuTw",
                nodes, edges, 82, "A",
                "A Minnesota nonprofit that sponsored federally funded child-nutrition sites. DOJ proved at trial that sites under its "
                "sponsorship claimed to serve thousands of meals within days of forming, and its founder was sentenced to 500 months. "
                "Empire Cuisine And Market, registered in April 2020, is a linked site operator in the same pilot seed set. This is public "
                "money reaching shells directly.[^S48][^S42]",
                ["S48", "S42"], audit(("Sayari", "get_entity_profile Feeding Our Future, Empire Cuisine (recorded)", 2),
                                      ("Tavily", "DOJ Feeding Our Future sentencing release", 1),
                                      ("Tradeverifyd", "not retrieved in this pass (connector token rejected 25 Sep 2026)", 0)),
                ["Sayari", "Tavily"], "Federal Child Nutrition Program funds via Minnesota Department of Education (per DOJ).")


def samidoun():
    nodes, edges = {}, []
    p = {"entity_id": "OUoSxNzYidNtzc0gtXxRMQ", "label": "Samidoun Palestinian Prisoner Solidarity Network", "type": "company",
         "closed": False, "attributes": {
             "names": ["Samidoun", "Hirak", "The Samidoun Palestinian Prisoner Solidarity Network"],
             "addresses": ["Vancouver, British Columbia, CA", "London, United Kingdom"],
             "identifiers": [{"type": "usa_ofac_sdn_number", "value": "47582"}, {"type": "uk_company_number", "value": "13885242"},
                             {"type": "can_corporation_number", "value": "1279374-1"},
                             {"type": "can_cra_program_account_number", "value": "774927545RC0001"}],
             "countries": ["CAN", "GBR"], "status": "closed 2026-03-27 (UK registry)", "registration_date": "2011",
             "company_type": "Non-Soliciting (Canadian not-for-profit)",
             "business_purpose": ["Main advocate for the release of Palestinian prisoners.", "Television programming and broadcasting activities"]},
         "risk": {"sanctioned": True, "pep": False, "risk_levels": ["sanctioned_usa_ofac_sdn", "ofac_sdgt_sanctioned", "sanctioned_isr_mod_nbctf",
                                                                    "controlled_by_ofac_sdn", "ofac_50_percent_rule", "law_enforcement_action_recent", "mass_address_usage"]},
         "sources": ["USA Treasury OFAC SDN List", "UK Corporate Registry", "Israel NBCTF Designation List", "OpenSanctions"],
         "trade_count": {"sent": 0, "received": 0},
         "relationships": {
             "summary": {"has_manager": 5, "has_director": 6, "subsidiary_of": 1, "linked_to": 8},
             "subsidiary_of": [{"entity_id": "jMzsf620xw_EUsPl44BrOA", "label": "Popular Front for the Liberation of Palestine", "type": "company",
                                "countries": ["LBN", "PSE", "SYR"], "risk_flags": {"sanctioned": True, "risk_levels": ["sanctioned_usa_ofac_sdn", "ofac_fto_sanctioned"]}}],
             "has_manager": [
                 {"entity_id": "pWopbce9qJZqXsXo3ZygNA", "label": "Khaled Barakat", "type": "person", "countries": ["PSE", "CAN"],
                  "risk_flags": {"sanctioned": True, "risk_levels": ["sanctioned_usa_ofac_sdn", "ofac_sdgt_sanctioned"]}, "position": "Khaled Barakat is a Manager of Samidoun"},
                 {"entity_id": "4el6ycVF-48dZ8acNi3sGA", "label": "Charlotte Kates", "type": "person", "countries": ["CAN", "GBR"],
                  "risk_flags": {"sanctioned": False, "risk_levels": ["sanctioned_adjacent", "mass_address_usage", "law_enforcement_action"]}, "position": "Charlotte Kates is a Manager of Samidoun"},
                 {"entity_id": "nprSKQqKvFqbRsJ0MDr55Q", "label": "Joe Catron", "type": "person", "countries": ["USA", "CAN"],
                  "risk_flags": {"sanctioned": False, "risk_levels": ["sanctioned_adjacent"]}, "position": "Joe Catron is a Manager of Samidoun"},
                 {"entity_id": "5BV1AiZRyv2gJeetbg-Dng", "label": "Mohammed Khatib (manager record)", "type": "person", "countries": ["PSE"],
                  "risk_flags": {"sanctioned": False, "risk_levels": ["sanctioned_adjacent"]}, "position": "Mohammed Khatib is a Manager of Samidoun"}],
             "has_director": [
                 {"entity_id": "Enfdt0f2Jl0EZ_RAPj0W0A", "label": "Thomas Hofland", "type": "person", "countries": ["CAN"],
                  "risk_flags": {"sanctioned": False, "risk_levels": ["sanctioned_adjacent"]}, "position": "Director"},
                 {"entity_id": "Uvypwh1VW598oAKln67dcw", "label": "Dave Diewert", "type": "person", "countries": ["CAN"],
                  "risk_flags": {"sanctioned": False, "risk_levels": ["sanctioned_adjacent"]}}],
             "linked_to": [
                 {"entity_id": "joJIKL7EaTwXgL83pC4lMg", "label": "Mohammed Khatib (SDGT record)", "type": "person", "countries": ["LBN", "BEL", "PSE"],
                  "risk_flags": {"sanctioned": True, "risk_levels": ["sanctioned_usa_ofac_sdn", "ofac_sdgt_sanctioned"]}, "position": "Mohammed Khatib is Linked to Samidoun"},
                 {"entity_id": "SPnw_fz3en484IKikz_-hQ", "label": "Hamas incl. Izz al-Din al-Qassam Brigades", "type": "company", "countries": ["SYR", "IRN", "LBN"],
                  "risk_flags": {"sanctioned": True, "risk_levels": ["sanctioned_usa_ofac_sdn", "ofac_fto_sanctioned"]}, "position": "Samidoun is an affiliate of Hamas"},
                 {"entity_id": "Q-2ZtlIwyYGRgDADYGfocA", "label": "Masar Badil", "type": "company", "countries": ["BEL", "ESP", "DEU", "CAN"],
                  "risk_flags": {"sanctioned": True, "risk_levels": ["sanctioned_usa_ofac_sdn", "ofac_sdgt_sanctioned"]}},
                 {"entity_id": "i1N7JuvZdNKgkc4wyFjF6w", "label": "Jaldia Abubakra Aueda", "type": "person", "countries": ["ESP"],
                  "risk_flags": {"sanctioned": True, "risk_levels": ["sanctioned_usa_ofac_sdn", "ofac_sdgt_sanctioned"]}, "position": "Jaldia Abubakra Aueda is Linked to Samidoun"}]}}
    add_profile(nodes, edges, p, root=True)
    nodes[p["entity_id"]]["risk_signals"].insert(0, {
        "signal_name": "Designated by OFAC as a sham charity fundraising for the PFLP (joint action with Canada)", "severity": "CRITICAL",
        "provenance_source": "Treasury press release (found with Tavily)", "evidence_record": SOURCES["S34"]["url"], "source_id": "S34",
        "source_authority": "U.S. Department of the Treasury"})
    return case("samidoun", "Samidoun (sham charity for the PFLP)", "Humanitarian Front", p["entity_id"], nodes, edges, 90, "A",
                "A Canadian not-for-profit, also registered at UK Companies House, that OFAC designated in October 2024 as a sham charity "
                "acting as an international fundraiser for the PFLP. Sayari links it to the PFLP as parent and to Hamas, Masar Badil and "
                "SDGT-listed individuals, and records it at a mass-registration address. This is the FATF Recommendation 8 risk: a "
                "humanitarian label over a terrorist-finance channel.[^S34][^S35]",
                ["S34", "S35"], audit(("Sayari", "search_entities + get_entity_profile Samidoun (live MCP, 25 Sep 2026)", 20),
                                      ("Tavily", "Treasury Samidoun designation release", 3),
                                      ("Tradeverifyd", "not retrieved in this pass (connector token rejected 25 Sep 2026)", 0)),
                ["Sayari", "Tavily"], "No USAspending awards; nonprofit (Canada CRA account 774927545RC0001).")


def meroe():
    nodes, edges = {}, []
    sdn = lambda *extra: {"sanctioned": True, "risk_levels": ["sanctioned_usa_ofac_sdn", *extra]}
    p = {"entity_id": "QHJrvNcC2wwsmBUZi45D2A", "label": "Meroe Gold", "type": "company", "closed": False,
         "attributes": {"names": ["Al-Solag Mining Company", "Alsolage", "Sullag"],
                        "addresses": ["Al-jref Gharb Plot 134, Blok 1h, Khartoum, Sudan", "Al-'Abdiya, River Nile State, Sudan"],
                        "identifiers": [{"type": "usa_ofac_sdn_number", "value": "29107"}, {"type": "eu_sanction_rn", "value": "EU.9785.79"},
                                        {"type": "gbr_uk_sanctions_id", "value": "SUD0013"}, {"type": "fra_asset_freeze_id", "value": "6446"}],
                        "countries": ["SDN"], "company_type": "CO", "business_purpose": ["Mining of other non-ferrous metal ores"]},
         "risk": {"sanctioned": True, "pep": False, "risk_levels": ["sanctioned_usa_ofac_sdn", "sanctioned_eu_sanctions", "sanctioned_gbr_fcdo",
                                                                    "ofac_50_percent_rule", "owned_by_sanctioned_entity", "reputational_risk_organized_crime_recent"]},
         "sources": ["EU Financial Sanctions List", "UK Consolidated Sanctions List", "Acuris Risk Intelligence"],
         "trade_count": {"sent": 0, "received": 0},
         "relationships": {
             "summary": {"has_director": 1, "linked_to": 8, "subsidiary_of": 1},
             "subsidiary_of": [{"entity_id": "_YvD5i5TDV4_YJ7y4d8soQ", "label": "M Invest, OOO", "type": "company", "countries": ["RUS", "SDN"],
                                "risk_flags": sdn("ofac_50_percent_rule"), "position": "M Invest is the parent of Meroe Gold"}],
             "has_director": [{"entity_id": "OMfwSqlTL1Xq0RVNuUMzOQ", "label": "Mikhail Sergeyevich Potepkin", "type": "person", "countries": ["SDN", "RUS"],
                               "risk_flags": sdn(), "position": "Mikhail Sergeyevich Potepkin is a Director of Meroe Gold Co. Ltd."}],
             "linked_to": [
                 {"entity_id": "eIH4qbprY44E_tvedRi0QQ", "label": "Wagner Group", "type": "company", "countries": ["RUS", "SDN", "MLI"],
                  "risk_flags": sdn("export_controls"), "position": "The Wagner Group is linked to Meroe Gold Co. Ltd."},
                 {"entity_id": "eAywSQEVuk32YOdaRMWfMg", "label": "Al-Solag Mining Company Ltd", "type": "company", "countries": ["RUS", "SDN"],
                  "risk_flags": {"sanctioned": True, "risk_levels": ["sanctioned_gbr_fcdo", "sanctioned_can_gac"]}, "position": "Al-Solag Mining Company Ltd is linked to Meroe Gold Co. Ltd."},
                 {"entity_id": "YiVasIW7ik0tQ5wRaP9d3g", "label": "Andrey Sergeyevich Mandel", "type": "person", "countries": ["RUS", "SDN"],
                  "risk_flags": sdn(), "position": "Andrey Sergeyevich Mandel is Linked to Meroe Gold Co. Ltd."},
                 {"entity_id": "5KAdnYVYxtHIeLfVeG6XQQ", "label": "Broker Expert LLC", "type": "company", "countries": ["RUS"],
                  "risk_flags": sdn(), "position": "Former trading partner of Meroe Gold", "former": True},
                 {"entity_id": "CNYKORUtrtGPdruPiicUYw", "label": "OOO DM", "type": "company", "countries": ["RUS"],
                  "risk_flags": sdn(), "position": "Former trading partner of Meroe Gold", "former": True}]}}
    add_profile(nodes, edges, p, root=True)
    for e in edges:
        if e["source"] in ("5KAdnYVYxtHIeLfVeG6XQQ", "CNYKORUtrtGPdruPiicUYw"):
            e["relationship_type"] = "SUPPLY_CHAIN_SHIPMENT"
    nodes[p["entity_id"]]["risk_signals"].insert(0, {
        "signal_name": "Designated by OFAC as part of Prigozhin's sanctions-evasion network in Sudan", "severity": "CRITICAL",
        "provenance_source": "Treasury press release (found with Tavily)", "evidence_record": EXTRA_SOURCES["S43"]["url"], "source_id": "S43",
        "source_authority": "U.S. Department of the Treasury"})
    nodes["5KAdnYVYxtHIeLfVeG6XQQ"]["risk_signals"].append({
        "signal_name": "Treasury: Broker Expert supplied U.S.-designated Meroe Gold and moved cash for Prigozhin's enterprise", "severity": "HIGH",
        "provenance_source": "Treasury press release", "evidence_record": EXTRA_SOURCES["S44"]["url"], "source_id": "S44",
        "source_authority": "U.S. Department of the Treasury"})
    return case("meroe-gold", "Meroe Gold (Wagner gold mining in Sudan)", "Gold", p["entity_id"], nodes, edges, 92, "A",
                "A Sudanese gold-mining company designated by OFAC in 2020 as part of Yevgeniy Prigozhin's network. Sayari shows it as a "
                "subsidiary of Russia's M Invest, directed by a sanctioned Russian national, linked to the Wagner Group, and supplied by "
                "Broker Expert, which Treasury says moved cash for Prigozhin's enterprise. It shows gold used as a laundering and financing "
                "channel.[^S43][^S44][^S37]",
                ["S43", "S44", "S37"], audit(("Sayari", "search_entities + get_entity_profile Meroe Gold (live MCP, 25 Sep 2026)", 10),
                                             ("Tavily", "Treasury Wagner/Meroe Gold press releases", 3),
                                             ("Tradeverifyd", "not retrieved in this pass (connector token rejected 25 Sep 2026)", 0)),
                ["Sayari", "Tavily"], "None: foreign mining company. Used as a validation case for gold-sector designations.")


def hoshine():
    nodes, edges = {}, []
    p = {"entity_id": "1XuabHffKPzSurnyE-YlvA", "label": "Hoshine Silicon Industry Co., Ltd.", "type": "company", "closed": False,
         "attributes": {"names": ["浙江合盛硅业有限公司", "Hoshine Silicon Industries Co Ltd"],
                        "addresses": ["23-24F, Suite A, Hengyuan Square, No.1988, North 3rd Ring Road East, Cixi, Ningbo, China"],
                        "identifiers": [{"type": "cn_unified_social_credit_code", "value": "913304007782903872"}, {"type": "lei", "value": "300300RQV6XQFC4OVX72"},
                                        {"type": "cn_importexport_code", "value": "3300778290387"}],
                        "countries": ["CHN"], "status": "active (2026-07-28)", "registration_date": "2005-08-10", "company_type": "CO LTD",
                        "business_purpose": ["Organic silicon compounds, trichlorosilane, industrial silicon (silicon metal) wholesale"]},
         "risk": {"sanctioned": False, "pep": False, "risk_levels": ["forced_labor_xinjiang_uflpa", "owner_of_forced_labor_xinjiang_uflpa", "wro_entity",
                                                                     "regulatory_action", "sanctioned_adjacent", "soe_adjacent"]},
         "sources": ["USA CBP Withhold Release Orders and Findings List", "China Company Directory", "China MOFCOM Foreign Investment Directory"],
         "trade_count": {"sent": 854, "received": 1},
         "relationships": {
             "summary": {"shareholder_of": 59, "has_shareholder": 67, "ships_to": 124, "carrier_of": 34, "has_director": 20},
             "has_shareholder": [{"entity_id": "xEY0aKglS5OcZb8QHzMZUQ", "label": "Ningbo Hoshine Group Co., Ltd. (宁波合盛集团)", "type": "company",
                                  "countries": ["CHN"], "shares_pct": 46.24, "risk_flags": {"sanctioned": False, "risk_levels": ["controlled_by_mass_business_registration", "owner_of_forced_labor_xinjiang_uflpa"]}}],
             "shareholder_of": [
                 {"entity_id": "zx8g4oJszeZt7qfh5G1toA", "label": "Hoshine Silicon (Shanshan) Co. (合盛硅业（鄯善）)", "type": "company", "countries": ["CHN"],
                  "shares_pct": 100, "risk_flags": {"sanctioned": False, "risk_levels": ["forced_labor_xinjiang_uflpa", "forced_labor_xinjiang_geospatial", "law_enforcement_action_recent"]}},
                 {"entity_id": "xgDZKtkv00Wd5WtVOeW2Tg", "label": "Xinjiang East Hoshine Silicon (新疆东部合盛硅业)", "type": "company", "countries": ["CHN"],
                  "shares_pct": 100, "risk_flags": {"sanctioned": False, "risk_levels": ["forced_labor_xinjiang_geospatial"]}},
                 {"entity_id": "xt6Wy_7uMRKHvTSF973e3g", "label": "Heihe Hoshine Silicon (黑河合盛硅业)", "type": "company", "countries": ["CHN"],
                  "shares_pct": 100, "risk_flags": {"sanctioned": False, "risk_levels": []}}],
             "carrier_of": [
                 {"entity_id": "ugfX4h2imqo-l6FkXrXLMg", "label": "Shipment EXDO621061075 (CN → US)", "type": "shipment", "countries": ["CHN", "USA"]},
                 {"entity_id": "zmIofgPAJUrQogBt9FEoQQ", "label": "Shipment 35752147 (CN → BR)", "type": "shipment", "countries": ["CHN", "BRA"]}]}}
    add_profile(nodes, edges, p, root=True)
    for sid in ("ugfX4h2imqo-l6FkXrXLMg", "zmIofgPAJUrQogBt9FEoQQ"):
        nodes[sid]["type"] = "transshipment_hub"
    nodes[p["entity_id"]]["risk_signals"][:0] = [
        {"signal_name": "CBP Withhold Release Order on silica-based products (forced-labour indicators found)", "severity": "CRITICAL",
         "provenance_source": "CBP press release (found with Tavily)", "evidence_record": EXTRA_SOURCES["S45"]["url"], "source_id": "S45",
         "source_authority": "U.S. Customs and Border Protection"},
        {"signal_name": "Shanshan subsidiary and subsidiaries on the UFLPA Entity List since 21 Jun 2022", "severity": "CRITICAL",
         "provenance_source": "DHS UFLPA Entity List (found with Tavily)", "evidence_record": EXTRA_SOURCES["S46"]["url"], "source_id": "S46",
         "source_authority": "U.S. Department of Homeland Security"},
        {"signal_name": "854 outbound shipments in Sayari trade data, including to the US", "severity": "HIGH",
         "provenance_source": "Sayari trade_count", "evidence_record": SAYARI + p["entity_id"], "source_authority": "Sayari trade data"}]
    return case("hoshine", "Hoshine Silicon (Xinjiang forced labour, critical minerals)", "Xinjiang & Critical Minerals", p["entity_id"],
                nodes, edges, 85, "A",
                "China's largest silicon-metal producer. CBP issued a Withhold Release Order on its silica-based products after finding "
                "forced-labour indicators, and its Shanshan (Xinjiang) subsidiary is on the UFLPA Entity List. Sayari shows 100% ownership "
                "of Xinjiang subsidiaries and 854 outbound shipments, including to the United States. This is critical-minerals supply-chain "
                "exposure a federal buyer could inherit through a supplier.[^S45][^S46][^S41]",
                ["S45", "S46", "S41"], audit(("Sayari", "search_entities + get_entity_profile Hoshine (live MCP, 25 Sep 2026)", 8),
                                             ("Tavily", "CBP WRO and DHS UFLPA Entity List", 3),
                                             ("Tradeverifyd", "not retrieved in this pass (connector token rejected 25 Sep 2026)", 0)),
                ["Sayari", "Tavily"], "Supplier-tier exposure: US imports of silicon products (Sayari shipment CN → US).")


def amarvel():
    nodes, edges = {}, []
    law = {"sanctioned": False, "risk_levels": ["law_enforcement_action", "law_enforcement_action_recent"]}
    people = [("VuM5_39bXPK47ev7YwEuCw", "Qingzhou Wang", ["CHN", "USA"]), ("deMhpxhuksGO6NkTxClQ9Q", "Yiyi Chen", ["CHN", "USA"]),
              ("QufR2aSnkKCCp9i6OIgR3A", "Er Yang", ["CHN"])]
    cos = ["3PgusiIli-ZIqMaz0TZ-bA", "CVMkeBQNcBXS088OucpD3A", "umedBzLDC2_mj2cYhiAxBg", "9M1BTzgazB7qjTk7xIsnSQ"]
    p = {"entity_id": "yre7QJIV48_qZndIue1DyA", "label": "Hubei Amarvel Biotech Co., Ltd.", "type": "company", "closed": False,
         "attributes": {"names": ["AmarvelBio"], "addresses": ["China (no street address on record)"],
                        "identifiers": [{"type": "xxx_acuris_id", "value": "C1741431"}], "countries": ["CHN"], "company_type": "CO LTD"},
         "risk": {"sanctioned": False, "pep": False, "risk_levels": ["law_enforcement_action", "law_enforcement_action_recent"]},
         "sources": ["Acuris Risk Intelligence - Entities & Relationships", "Acuris Risk Intelligence - Risk Information and Articles"],
         "trade_count": {"sent": 0, "received": 0},
         "relationships": {"summary": {"linked_to": 15}, "linked_to":
             [{"entity_id": i, "label": l, "type": "person", "countries": c, "risk_flags": law, "position": f"{l} is linked to Hubei Amarvel Biotech (law-enforcement record)"} for i, l, c in people]
             + [{"entity_id": i, "label": f"Unnamed US company (Acuris {n})", "type": "company", "countries": ["USA"], "risk_flags": law,
                 "position": "Unnamed US company linked in the same law-enforcement record"}
                for i, n in zip(cos, ["C2068561", "C2068572", "C2068565", "C2068560"])]}}
    add_profile(nodes, edges, p, root=True)
    nodes[p["entity_id"]]["risk_signals"][:0] = [
        {"signal_name": "China-based chemical companies and employees indicted for fentanyl precursor distribution (DOJ, M.D. Fla.)", "severity": "CRITICAL",
         "provenance_source": "DOJ press release (found with Tavily; title only)", "evidence_record": EXTRA_SOURCES["S47"]["url"], "source_id": "S47",
         "source_authority": "U.S. Department of Justice"},
        {"signal_name": "No street address or registry identifier on record: thin real-world footprint", "severity": "MEDIUM",
         "provenance_source": "Sayari get_entity_profile", "evidence_record": SAYARI + p["entity_id"], "source_authority": "Sayari"}]
    return case("amarvel", "Hubei Amarvel Biotech (fentanyl precursors)", "Fentanyl Precursors", p["entity_id"], nodes, edges, 78, "B",
                "A Chinese chemical supplier named in Sayari's law-enforcement records alongside three individuals and 11 unnamed US "
                "companies, the pattern of a precursor seller using US front entities. A DOJ (M.D. Fla.) release on indicted China-based "
                "chemical companies was found with Tavily; we have its title only, so the grade is B until the release is read. FinCEN's "
                "advisory sets out the red flags.[^S47][^S40][^S39]",
                ["S47", "S40", "S39"], audit(("Sayari", "search_entities + get_entity_profile + traverse_network depth 1 (live MCP, 25 Sep 2026)", 15),
                                             ("Tavily", "DOJ fentanyl precursor indictment search", 3),
                                             ("Tradeverifyd", "not retrieved in this pass (connector token rejected 25 Sep 2026)", 0)),
                ["Sayari", "Tavily"], "None found. Front companies are US-registered, so SAM.gov and USAspending checks are the next step.")


def existing(cid, file, title, tools, public_money, sources):
    d = json.load(open(ROOT / "fixtures" / file))
    d["case"] = {"id": cid, "title": title, "root_id": d["nodes"][0]["id"], "tools_used": tools, "public_money": public_money,
                 "sources": [src(s) for s in sources]}
    return cid, d


def main():
    cases = dict([
        existing("serniya", "serniya_investigation.json", "Serniya Engineering (Russian military procurement)",
                 ["Sayari", "Tavily", "USAspending"], "SAM.gov exclusion records (UEIs LF8MULLSH397, NYCYDYP1RNJ6); no awards.", ["S01", "S02", "S05", "S07", "S08"]),
        rsf_gold(), ppp(), meroe(), amarvel(), samidoun(), hoshine(),
        existing("palantir", "palantir_control.json", "Palantir Technologies (clean control)",
                 ["Sayari", "Tradeverifyd", "USAspending"], "427 federal contracts, $5.34B (USAspending).", ["S16", "S18", "S26"]),
    ])
    typ = {"serniya": "Russia Sanctions Evasion", "palantir": "Control (no material risk)"}
    index = []
    for cid, d in cases.items():
        (OUT / f"{cid}.json").write_text(json.dumps(d, ensure_ascii=False, indent=1))
        s = d["investigation_summary"]
        index.append({"id": cid, "title": d["case"]["title"], "typology": typ.get(cid, s["primary_typology"]),
                      "root": s["root_recipient"], "score": s["composite_risk_score"], "grade": s["confidence_rating"],
                      "nodes": len(d["nodes"]), "edges": len(d["edges"]), "tools": d["case"]["tools_used"],
                      "entities": [n["label"] for n in d["nodes"]]})
    (ROOT / "lib" / "generated" / "cases.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))
    for c in index:
        print(f"{c['id']:20} {c['typology']:30} nodes={c['nodes']:3} edges={c['edges']:3} score={c['score']}")


if __name__ == "__main__":
    main()
