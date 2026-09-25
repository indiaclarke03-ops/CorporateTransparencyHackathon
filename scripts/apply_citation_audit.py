#!/usr/bin/env python3
"""Apply research/citation_audit.md to fixtures/serniya_investigation.json and
fixtures/palantir_control.json. Idempotent: running it twice gives the same files.

Every replacement cites a source ID from research/sources.json. Each risk signal also gets
`source_id` and `source_authority` (who published the fact), keeping `provenance_source` as
the tool that retrieved it (citation audit, "Changes to the schema" 1).

    python3 scripts/apply_citation_audit.py
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = json.loads((ROOT / "research" / "sources.json").read_text())["sources"]
AUTHORITY = {
    "S01": "U.S. Treasury (OFAC)", "S02": "OFAC", "S03": "OFAC", "S05": "U.S. Department of Justice (E.D.N.Y.)",
    "S07": "Bureau of Industry and Security", "S08": "Bureau of Industry and Security (Federal Register)",
    "S12": "Companies House (UK)", "S13": "Companies House (UK)", "S16": "USAspending.gov", "S18": "U.S. SEC (EDGAR)",
}


def url(sid, suffix=""):
    return SOURCES[sid]["url"] + suffix


def sig(name, severity, sid, suffix=""):
    return {"signal_name": name, "severity": severity, "provenance_source": "Tavily",
            "evidence_record": url(sid, suffix), "source_id": sid, "source_authority": AUTHORITY[sid]}


def edge(src, dst, rel, sid, suffix=""):
    return {"source": src, "target": dst, "relationship_type": rel, "ownership_percentage": None,
            "provenance_ref": url(sid, suffix), "source_id": sid, "source_authority": AUTHORITY[sid]}


def rationale(case):
    out = subprocess.run([sys.executable, "-m", "narrative.render", "narrative/inputs/%s.json" % case, "--rationale"],
                         cwd=str(ROOT), capture_output=True, text=True, check=True)
    return out.stdout.strip()


def pass_through(node_src):
    return node_src.get("sayari_pass_through")


def fix_serniya(d):
    old = {n["id"]: n for n in d["nodes"]}
    s = d["investigation_summary"]
    s["executive_rationale"] = rationale("serniya")
    s["citation_audit"] = "Applied 2026-09-25 (research/citation_audit.md). Every signal and edge cites research/sources.json."
    ofac = "OFAC SDN Designation E.O. 14024"

    def node(nid, label, typ, jur, conf, signals, pt_from=None):
        return {"id": nid, "label": label, "type": typ, "jurisdiction": jur, "entity_confidence": conf,
                "risk_signals": signals, "sayari_pass_through": pass_through(old[pt_from]) if pt_from in old else None}

    d["nodes"] = [
        node("ent_serniya", "OOO Serniya Engineering", "sanctioned_entity", "RU", "A", [
            sig(ofac, "CRITICAL", "S01"),
            sig("Named in DOJ superseding indictment (E.D.N.Y., 13 Dec 2022) as heading the procurement network", "CRITICAL", "S05")],
            "ent_serniya"),
        node("ent_sertal", "OOO Sertal", "sanctioned_entity", "RU", "A", [sig(ofac, "CRITICAL", "S02")], "ent_sertal"),
        node("ent_robintreid", "OOO Robin Treid", "sanctioned_entity", "RU", "A", [
            sig(ofac + " (Treasury: “utilized by Serniya to facilitate its procurement”)", "CRITICAL", "S02")], "ent_robintreid"),
        node("ent_majory", "Majory LLP", "sanctioned_entity", "GB", "A", [
            sig(ofac, "CRITICAL", "S02"),
            sig("Companies House: no accounts after 31 Aug 2022; voluntary strike-off notice 6 Dec 2022", "MEDIUM", "S12", "/filing-history")],
            "ent_majory"),
        node("ent_photonpro", "Photon Pro LLP", "sanctioned_entity", "GB", "A", [
            sig(ofac, "CRITICAL", "S01"),
            sig("EU and Japan export-related restrictions (Treasury: imposed “within the past month”)", "HIGH", "S01"),
            sig("Companies House: still registered; confirmation statement overdue", "MEDIUM", "S13")],
            "ent_photonpro"),
        node("ent_inventionbridge", "Invention Bridge SL", "sanctioned_entity", "ES", "A", [
            sig(ofac + " (for acting for or on behalf of Serniya)", "CRITICAL", "S01")], "ent_inventionbridge"),
        node("person_grinin", "Yevgeniy Aleksandrovich Grinin", "nominee_person", "RU", "A", [
            sig("OFAC SDN listing linked to Serniya and Photon Pro LLP", "CRITICAL", "S02"),
            sig("Named defendant in E.D.N.Y. 16-count superseding indictment (allegations only)", "CRITICAL", "S05")],
            "person_grinin"),
        node("person_krugovov", "Anton Alekseevich Krugovov", "nominee_person", "RU", "A", [
            sig("STATUS CHANGE: removed from the OFAC SDN List on 23 Jun 2026 (designated 31 Mar 2022 as senior executive officer of Majory LLP)", "MEDIUM", "S03")],
            "person_krugovov"),
        node("person_livshits", "Boris Livshits", "nominee_person", "RU", "A", [
            sig("Subject of BIS Temporary Denial Order (13 Dec 2022, renewed 14 Jun 2023)", "HIGH", "S08"),
            sig("Named defendant in E.D.N.Y. superseding indictment (allegations only)", "CRITICAL", "S05")]),
        node("ent_aws", "Advanced Web Services", "shell_intermediary", "US", "A", [
            sig("BIS Temporary Denial Order (180 days): unauthorized export of EAR items to Russia", "HIGH", "S08")], "ent_awsstrandway"),
        node("ent_strandway", "Strandway, LLC", "shell_intermediary", "US", "A", [
            sig("BIS Temporary Denial Order (180 days): unauthorized export of EAR items to Russia", "HIGH", "S08")], "ent_awsstrandway"),
    ]
    d["edges"] = [
        edge("ent_sertal", "ent_robintreid", "SHARED_ADDRESS", "S02"),
        edge("ent_majory", "ent_photonpro", "SHARED_ADDRESS", "S02"),
        edge("ent_robintreid", "ent_serniya", "ACTING_ON_BEHALF_OF", "S01"),
        edge("ent_majory", "ent_serniya", "ACTING_ON_BEHALF_OF", "S01"),
        edge("ent_photonpro", "ent_serniya", "ACTING_ON_BEHALF_OF", "S01"),
        edge("ent_inventionbridge", "ent_serniya", "ACTING_ON_BEHALF_OF", "S01"),
        edge("person_grinin", "ent_photonpro", "OFFICER_DIRECTOR", "S13", "/officers"),
        edge("person_krugovov", "ent_majory", "OFFICER_DIRECTOR", "S12", "/officers"),
        edge("person_livshits", "ent_aws", "OWNS_OR_CONTROLS", "S08"),
        edge("person_livshits", "ent_strandway", "OWNS_OR_CONTROLS", "S08"),
        edge("person_livshits", "ent_serniya", "LINKED_TO", "S07"),
    ]
    _audit_step(d, 8, 11)
    return d


def fix_palantir(d):
    s = d["investigation_summary"]
    s["executive_rationale"] = rationale("palantir")
    s["award_id"] = "Multiple: 427 contracts, FY2008-FY2026 (USAspending), e.g. N0024408C0025. BPA 19AQMM25A1228 went to Palantir USG Inc. (UEI HNN4F9JZWDY8), a separate recipient"
    s["citation_audit"] = "Applied 2026-09-25 (research/citation_audit.md). Every signal cites research/sources.json."
    n = d["nodes"][0]
    n["risk_signals"] = [
        sig("UEI FSY4LVSBGWB7 matches the USAspending recipient record (grade B: shared UEI and name, spec 7.1)", "LOW", "S16"),
        sig("Nasdaq-listed (PLTR), SEC-disclosed ownership and financials", "LOW", "S18"),
    ]
    n["entity_confidence"] = "B"
    _audit_step(d, 2, 2)
    return d


def _audit_step(d, replaced, edges):
    d["audit_trail"] = [s for s in d["audit_trail"] if s.get("source") != "Citation audit"]
    d["audit_trail"].append({"step": len(d["audit_trail"]) + 1, "source": "Citation audit",
                             "query_executed": "research/citation_audit.md applied: tier-3 and wrong-agency citations replaced with primary records from research/sources.json",
                             "records_matched": replaced})


def main():
    for name, fn in (("serniya_investigation", fix_serniya), ("palantir_control", fix_palantir)):
        p = ROOT / "fixtures" / ("%s.json" % name)
        d = fn(json.loads(p.read_text()))
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        print("updated", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
