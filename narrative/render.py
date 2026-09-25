"""Template renderer for the executive rationale, graph captions and Lead Dossier.

No free-text generation: every sentence is a template from config/narrative_templates.yaml
filled with fields from a source-backed input file. A template whose required fields are
missing is skipped and the skip is logged; placeholders never reach the output.

    python3 -m narrative.render narrative/inputs/serniya.json            # dossier markdown to stdout
    python3 -m narrative.render narrative/inputs/serniya.json --rationale
"""
import argparse
import datetime
import hashlib
import json
import logging
import re
import sys
from decimal import Decimal
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_PATH = ROOT / "config" / "narrative_templates.yaml"
SOURCES_PATH = ROOT / "research" / "sources.json"

log = logging.getLogger("narrative")
FIELD = re.compile(r"\{([a-z_][a-z0-9_]*)(?:\|([a-z]+)(?::([^}]*))?)?\}")
QUOTED = re.compile(r"“[^”]*”|\"[^\"]*\"")


class MissingField(KeyError):
    pass


def load_templates(path=TEMPLATES_PATH):
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def load_sources(path=SOURCES_PATH):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)["sources"]


def present(value):
    return value is not None and value != "" and value != [] and value != {}


def _count(value):
    return len(value) if isinstance(value, (list, tuple)) else int(value)


def format_value(value, filt=None, arg=None):
    if filt is None:
        return str(value)
    if filt == "date":
        d = datetime.date.fromisoformat(str(value)[:10])
        return "%d %s %d" % (d.day, d.strftime("%B"), d.year)
    if filt == "usd":
        return "$" + format(Decimal(str(value)), ",f")
    if filt == "list":
        if isinstance(value, str):
            return value
        items = [str(v) for v in value]
        if len(items) <= 2:
            return " and ".join(items)
        return ", ".join(items[:-1]) + ", and " + items[-1]
    if filt == "semi":
        return value if isinstance(value, str) else "; ".join(str(v) for v in value)
    if filt == "plural":
        one, many = arg.split(",")
        return one if _count(value) == 1 else many
    if filt == "count":
        return str(_count(value))
    raise ValueError("unknown filter %r" % filt)


def fields_in(text):
    return {m.group(1) for m in FIELD.finditer(text)}


def fill(text, data):
    """Fill every placeholder; raise MissingField rather than leave one behind."""
    def sub(m):
        name, filt, arg = m.group(1), m.group(2), m.group(3)
        if not present(data.get(name)):
            raise MissingField(name)
        return format_value(data[name], filt, arg)
    return FIELD.sub(sub, text)


def usable(variant, data):
    needed = set(variant.get("requires", [])) | fields_in(variant["text"])
    missing = sorted(f for f in needed if not present(data.get(f)))
    if missing:
        return False, missing
    flag = variant.get("when")
    if flag and not data.get(flag):
        return False, ["when:" + flag]
    return True, []


def render_variant(variant, data, where, skips):
    ok, missing = usable(variant, data)
    if not ok:
        skips.append({"template": variant.get("id", where), "missing": missing})
        log.info("skip %s: missing %s", variant.get("id", where), ", ".join(missing))
        return None
    return fill(variant["text"], data)


def render_slot(variants, data, where, skips):
    """First usable variant wins. Returns (text, cite_key) or (None, None)."""
    for v in variants:
        text = render_variant(v, data, where, skips)
        if text is not None:
            return text, v.get("cite")
    return None, None


class Footnotes(object):
    """Collects source IDs in order of first use; renders markdown footnote markers."""

    def __init__(self, citations):
        self.citations = citations or {}
        self.used = []

    def ids_for(self, cite):
        if isinstance(cite, (list, tuple)):
            ids = list(cite)
        else:
            ids = self.citations.get(cite, []) if cite else []
        for sid in ids:
            if sid not in self.used:
                self.used.append(sid)
        return ids

    def mark(self, cite):
        return "".join("[^%s]" % sid for sid in self.ids_for(cite))


def render_rationale(data, tpl, skips=None):
    """Return a list of (sentence, cite_key)."""
    skips = [] if skips is None else skips
    section = tpl["executive_rationale"]
    out = []
    for slot in section["order"]:
        text, cite = render_slot(section["slots"][slot], data, "executive_rationale." + slot, skips)
        if text:
            out.append((text, cite))
    return out


def rationale_markdown(data, tpl, notes, skips):
    return " ".join(text + notes.mark(cite) for text, cite in render_rationale(data, tpl, skips))


def render_caption(key, data, tpl, skips=None):
    """Return dict with what/how/why (or empty/why) plus reader."""
    skips = [] if skips is None else skips
    cap = tpl["graph_captions"][key]
    merged = dict(data)
    merged.update(data.get("graphs", {}).get(key, {}))
    parts = {}
    empty_key = "empty_" + merged["empty_reason"] if merged.get("empty_reason") else "empty"
    is_empty = merged.get("empty") is True and empty_key in cap
    for part in ([empty_key, "why"] if is_empty else ["what", "how", "why"]):
        text = render_variant(cap[part], merged, "graph_captions.%s.%s" % (key, part), skips)
        if text:
            parts["empty" if part == empty_key else part] = text
    parts["reader"] = cap["reader"]
    return parts


def render_evidence(evidence_type, fields, tpl, skips):
    variant = tpl["evidence_summary"][evidence_type]
    return render_variant(variant, fields, "evidence_summary." + evidence_type, skips)


def lint(text, tpl):
    """Return banned words found outside quotations."""
    stripped = QUOTED.sub(" ", text)
    hits = []
    for phrase in tpl["vocabulary"]["never"] + tpl["vocabulary"]["never_about_named_entities"]:
        if re.search(r"\b%s\b" % re.escape(phrase), stripped, re.I):
            hits.append(phrase)
    return hits


def _signal_line(sig, tpl, notes, skips):
    summary = render_evidence(sig["evidence_type"], sig["evidence"], tpl, skips)
    if summary is None:
        return None
    line = render_variant(tpl["lead_dossier"]["signal_sentence"],
                          dict(sig, evidence_summary=summary), "signal_sentence", skips)
    if line is None:
        return None
    line += notes.mark(sig.get("sources"))
    extra = []
    if "allegation" in sig.get("notices", []):
        extra.append(tpl["lead_dossier"]["allegation_notice"]["text"])
    if "removal" in sig.get("notices", []):
        extra.append(tpl["lead_dossier"]["removal_notice"]["text"])
    return line + "".join("\n  *%s*" % e for e in extra)


def render_dossier(data, tpl, sources, skips=None):
    """Render the Lead Dossier as markdown. Returns (markdown, skips)."""
    skips = [] if skips is None else skips
    d = tpl["lead_dossier"]
    notes = Footnotes(data.get("citations"))
    body = []

    body.append("## 1. Executive rationale\n")
    body.append(rationale_markdown(data, tpl, notes, skips) + "\n")

    body.append("## 2. Why this dossier was prepared\n")
    for v in d["why_prepared"]:
        text = render_variant(v, data, "why_prepared", skips)
        if text:
            body.append(text + notes.mark(v.get("cite")) + "\n")

    body.append("## 3. Identity\n")
    body.append("*%s*\n" % d["identity_caption"]["text"])
    body.append("| Field | Value | Source |\n|---|---|---|")
    for row in data.get("identity_rows", []):
        body.append("| %s | %s | %s |" % (row["field"], row["value"], notes.mark(row["sources"])))
    body.append("")

    body.append("## 4. Federal awards and loans\n")
    if data.get("awards"):
        cap = render_variant(d["awards_caption"], data, "awards_caption", skips)
        body.append("*%s*\n" % cap)
        body.append("| Program | Award ID | Amount | Date | Awarding agency | Source |\n|---|---|---|---|---|---|")
        for a in data["awards"]:
            body.append("| %s | %s | %s | %s | %s | %s |" % (
                a["program"], a["award_id"], format_value(a["amount"], "usd"),
                format_value(a["date"], "date"), a["agency"], notes.mark(a["sources"])))
        body.append("")
        if data.get("award_count") and data["award_count"] != len(data["awards"]):
            note = render_variant(d["awards_sample_note"], dict(data, shown_count=len(data["awards"])),
                                  "awards_sample_note", skips)
            if note:
                body.append(note + "\n")
    else:
        text = render_variant(d["awards_none"], data, "awards_none", skips)
        if text:
            body.append(text + notes.mark(d["awards_none"].get("cite")) + "\n")

    body.append("## 5. Signals found\n")
    lines = [l for l in (_signal_line(s, tpl, notes, skips) for s in data.get("signals_found", [])) if l]
    body.extend("- " + l for l in lines)
    if not lines:
        body.append(d["signals_found_none"]["text"])
    body.append("")

    body.append("## 6. Signals not found and not assessable\n")
    body.append("*%s*\n" % d["not_found_caption"]["text"])
    for sig in data.get("signals_not_found", []):
        text = render_variant(d["not_found_item"], sig, "not_found_item", skips)
        if text:
            body.append("- " + text + notes.mark(sig.get("sources")))
    for sig in data.get("signals_not_assessable", []):
        text = render_variant(d["not_assessable_item"], sig, "not_assessable_item", skips)
        if text:
            body.append("- " + text + notes.mark(sig.get("sources")))
    body.append("")

    body.append("## 7. Graphs\n")
    titles = {"money_trail": "Money trail", "ownership_chain": "Ownership chain",
              "network": "Network", "supply_chain": "Supply chain", "signal_summary": "Signal summary"}
    for key in ("money_trail", "ownership_chain", "network", "supply_chain", "signal_summary"):
        body.append("### %s\n" % titles[key])
        graph = data.get("graphs", {}).get(key, {})
        if graph.get("not_run"):
            text = render_variant(d["graph_not_run"], graph, "graph_not_run." + key, skips)
            if text:
                body.append(text + notes.mark(graph.get("sources")) + "\n")
                continue
        cap = render_caption(key, data, tpl, skips)
        for part in ("what", "empty", "how", "why"):
            if part in cap:
                label = {"what": "What it shows", "empty": "What it shows", "how": "How to read it",
                         "why": "Why it matters"}[part]
                body.append("- **%s:** %s" % (label, cap[part]))
        body.append("- **Primary reader:** %s" % cap["reader"])
        rows = data.get("graphs", {}).get(key, {}).get("table")
        if rows:
            body.append("\n| From | Relationship | To | Source |\n|---|---|---|---|")
            for r in rows:
                body.append("| %s | %s | %s | %s |" % (r["from"], r["relationship"], r["to"], notes.mark(r["sources"])))
        body.append("")

    review = data.get("analyst_review")
    if review:
        text = render_variant(d["analyst_review"], review, "analyst_review", skips)
        if text:
            body.append("## 8. Analyst review\n")
            body.append(text + "\n")

    body.append("## 9. Methodology and limitations\n")
    body.extend("- " + m for m in d["methodology"])
    if data.get("config_version"):
        body.append("- Template config version: %s." % data["config_version"])
    body.append("")

    body.append("## 10. Sources appendix\n")
    for sid in notes.used:
        src = dict(sources[sid], id=sid)
        src["record_id"] = src.get("record_id") or "n/a"
        body.append("[^%s]: " % sid + fill(d["sources_appendix_line"]["text"], src))
    body_md = "\n".join(body) + "\n"

    content_hash = hashlib.sha256(body_md.encode("utf-8")).hexdigest()
    cover_data = dict(data, content_hash="sha256:" + content_hash[:16])
    cover = ["# " + fill(d["cover"]["title"]["text"], cover_data), ""]
    for line in d["cover"]["lines"]:
        text = render_variant(line, cover_data, "cover", skips)
        if text:
            cover.append(text + "  ")
    cover += ["", "> " + d["cover"]["notice"]["text"], ""]
    return "\n".join(cover) + "\n" + body_md, skips


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--rationale", action="store_true", help="print only the executive rationale (plain text)")
    ap.add_argument("-v", "--verbose", action="store_true", help="log skipped templates to stderr")
    args = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, stream=sys.stderr)
    tpl = load_templates()
    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    if args.rationale:
        print(" ".join(t for t, _ in render_rationale(data, tpl)))
        return 0
    md, _ = render_dossier(data, tpl, load_sources())
    sys.stdout.write(md)
    return 0


if __name__ == "__main__":
    sys.exit(main())
