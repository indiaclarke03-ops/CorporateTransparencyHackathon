#!/usr/bin/env python3
"""Check that every citation in the fixtures and source registry is a clean, citable URL.

Usage:
    python3 scripts/check_citations.py                 # static checks on fixtures/ and research/sources.json
    python3 scripts/check_citations.py --live          # also fetch each URL and detect bot walls
    python3 scripts/check_citations.py path/to/file.json ...

Exit code 1 if any ERROR is found. Standard library only.
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Tier 1: primary government records and official company registries.
TIER1_DOMAINS = {
    "home.treasury.gov", "ofac.treasury.gov", "sanctionssearch.ofac.treas.gov",
    "www.justice.gov", "www.bis.gov", "www.bis.doc.gov",
    "www.federalregister.gov", "www.govinfo.gov",
    "sam.gov", "www.usaspending.gov", "api.usaspending.gov",
    "www.sec.gov", "data.sec.gov", "www.dol.gov", "www.fbi.gov",
    "www.state.gov", "2021-2025.state.gov",
    "find-and-update.company-information.service.gov.uk",
    "api.company-information.service.gov.uk", "www.gov.uk",
    "www.boe.es", "eur-lex.europa.eu",
    "www.fincen.gov", "www.dhs.gov",
}
# Tier 2: aggregators that expose a stable per-record ID.
TIER2_DOMAINS = {"graph.sayari.com", "www.opensanctions.org", "opensanctions.org"}

# Query parameters that are tracking, session or bot-challenge artefacts.
DIRTY_PARAMS = re.compile(r"^(utm_.*|fbclid|gclid|mc_eid|_ga|bm-verify|sessionid|session|token|sig|signature)$", re.I)
# Response bodies that mean "you got a challenge page, not the record".
INTERSTITIAL = re.compile(r"bm-verify|/_sec/verify|triggerInterstitialChallenge|Access Denied|captcha|apology_objects", re.I)
# Values that are dataset record IDs rather than URLs.
RECORD_ID = re.compile(r"^(S\d{2,}|sayari:[A-Za-z0-9_-]{10,}|opensanctions:NK-[A-Za-z0-9]+|FR Doc\. \d{4}-\d+)$")

# Signal wording -> the publisher that must be cited for it.
AUTHORITY_RULES = [
    (re.compile(r"\b(DOJ|indict|plea|pleaded|sentenced|charged)\b", re.I), {"www.justice.gov"}),
    (re.compile(r"\b(OFAC|SDN|E\.O\. 14024|delist)", re.I), {"home.treasury.gov", "ofac.treasury.gov", "sanctionssearch.ofac.treas.gov"}),
    (re.compile(r"\b(UFLPA|Uyghur Forced Labor)\b", re.I), {"www.dhs.gov", "www.federalregister.gov", "www.govinfo.gov"}),
    (re.compile(r"\b(BIS|Temporary Denial|TDO|Entity List)\b", re.I), {"www.bis.gov", "www.federalregister.gov", "www.govinfo.gov"}),
    (re.compile(r"\b(SAM\.gov|UEI|CAGE)\b", re.I), {"sam.gov", "www.usaspending.gov", "api.usaspending.gov"}),
    (re.compile(r"\b(NYSE|Nasdaq|SEC)\b", re.I), {"www.sec.gov", "data.sec.gov"}),
]


def tier_of(host):
    if host in TIER1_DOMAINS:
        return 1
    if host in TIER2_DOMAINS:
        return 2
    return 3


def static_findings(value, context=""):
    """Return a list of (level, message) for one citation value."""
    out = []
    if value is None or str(value).strip() == "":
        return [("ERROR", "empty citation")]
    value = str(value).strip()
    if RECORD_ID.match(value):
        return out
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return [("ERROR", "not a URL or a recognised record ID")]
    if parsed.scheme != "https":
        out.append(("ERROR", "not https"))
    host = parsed.netloc.lower()
    tier = tier_of(host)
    if tier == 3:
        out.append(("ERROR", "tier-3 domain (%s): context only, never an evidence record" % host))
    if parsed.path in ("", "/"):
        out.append(("ERROR", "points at a homepage, not a record"))
    for key, _ in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True):
        if DIRTY_PARAMS.match(key):
            out.append(("ERROR", "tracking/bot parameter '%s' in URL" % key))
    if re.search(r"/search\b|[?&](q|query|keyword)=", value, re.I):
        out.append(("WARN", "looks like a search page; cite the record itself"))
    if parsed.fragment and not parsed.fragment.startswith(":~:text="):
        out.append(("WARN", "URL fragment will not survive every PDF viewer"))
    for pattern, hosts in AUTHORITY_RULES:          # first matching rule decides
        m = pattern.search(context) if context else None
        if m:
            if host not in hosts and tier != 2:
                out.append(("WARN", "claim mentions '%s' but cites %s" % (m.group(0), host)))
            break
    return out


def live_findings(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (citation-check; hackathon research)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read(200000).decode("utf-8", "replace")
            final = resp.geturl()
            out = []
            if INTERSTITIAL.search(body):
                out.append(("WARN", "HTTP %s but body is a bot-challenge page; verify in a browser" % resp.status))
            if final.rstrip("/") != url.rstrip("/"):
                out.append(("INFO", "redirects to %s" % final))
            return out
    except urllib.error.HTTPError as e:
        level = "WARN" if e.code in (401, 403, 429) else "ERROR"
        return [(level, "HTTP %s" % e.code)]
    except Exception as e:  # network errors are reported, not fatal
        return [("WARN", "fetch failed: %s" % e.__class__.__name__)]


def iter_fixture_citations(data, path=""):
    """Yield (json_path, value, context_text) for evidence_record / provenance_ref fields."""
    if isinstance(data, dict):
        for key, val in data.items():
            here = "%s.%s" % (path, key) if path else key
            if key in ("evidence_record", "provenance_ref"):
                yield here, val, str(data.get("signal_name", data.get("relationship_type", "")))
            else:
                for item in iter_fixture_citations(val, here):
                    yield item
    elif isinstance(data, list):
        for i, val in enumerate(data):
            for item in iter_fixture_citations(val, "%s[%d]" % (path, i)):
                yield item


def iter_registry_citations(data):
    for sid, src in data.get("sources", {}).items():
        yield "sources.%s.url" % sid, src.get("url"), src.get("name", "")


def check_file(path, live=False):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    items = list(iter_registry_citations(data)) if "sources" in data else list(iter_fixture_citations(data))
    results = []
    for where, value, context in items:
        findings = static_findings(value, context)
        if live and str(value).startswith("http"):
            findings += live_findings(str(value))
        results.append((where, value, findings))
    return results


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("files", nargs="*")
    ap.add_argument("--live", action="store_true", help="fetch each URL and detect bot walls")
    args = ap.parse_args(argv)
    files = args.files or sorted(str(p) for p in (ROOT / "fixtures").glob("*.json")) + [str(ROOT / "research" / "sources.json")]
    errors = 0
    for f in files:
        print("\n== %s" % Path(f).relative_to(ROOT) if Path(f).is_absolute() and ROOT in Path(f).parents else "\n== %s" % f)
        for where, value, findings in check_file(f, live=args.live):
            if not findings:
                continue
            for level, msg in findings:
                errors += level == "ERROR"
                print("  %-5s %s\n        %s\n        %s" % (level, where, value, msg))
    print("\n%d error(s)" % errors)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
