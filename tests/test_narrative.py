"""Tests required by narrative-copy-spec section 5.

Run: python3 -m unittest discover -s tests
"""
import json
import re
import unittest
from pathlib import Path

from narrative import render

ROOT = Path(__file__).resolve().parent.parent
INPUTS = sorted((ROOT / "narrative" / "inputs").glob("*.json"))
PLACEHOLDER = re.compile(r"\{[^}]*\}|\bNone\b")


def all_variants(node, path=""):
    """Yield (path, variant) for every template dict in the YAML (anything with a 'text' key)."""
    if isinstance(node, dict):
        if "text" in node and isinstance(node["text"], str):
            yield path, node
        for key, val in node.items():
            for item in all_variants(val, "%s.%s" % (path, key) if path else key):
                yield item
    elif isinstance(node, list):
        for i, val in enumerate(node):
            for item in all_variants(val, "%s[%d]" % (path, i)):
                yield item


def sample_value(name, text):
    """A plausible value for a field, chosen by the filter the template applies to it."""
    filters = set(re.findall(r"\{%s\|([a-z]+)" % re.escape(name), text))
    if "date" in filters or name.endswith("_date") or name in ("generated_at", "retrieved_at"):
        return "2026-01-02"
    if "usd" in filters:
        return "1250000.00"
    if filters & {"list", "semi"}:
        return ["Alpha", "Beta"]
    if filters & {"plural", "count"}:
        return 2
    return "Sample"


def full_fixture(variant):
    names = set(variant.get("requires", [])) | render.fields_in(variant["text"])
    data = {n: sample_value(n, variant["text"]) for n in names}
    if variant.get("when"):
        data[variant["when"]] = True
    return data


class TemplateCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tpl = render.load_templates()
        cls.variants = [(p, v) for p, v in all_variants(cls.tpl) if not p.startswith("vocabulary")]

    def test_every_template_renders_when_all_fields_present(self):
        self.assertGreater(len(self.variants), 40)
        for path, v in self.variants:
            with self.subTest(template=path):
                out = render.render_variant(v, full_fixture(v), path, [])
                self.assertIsNotNone(out, "did not render with every field present")
                self.assertNotRegex(out, PLACEHOLDER)

    def test_every_template_is_skipped_and_logged_when_any_field_missing(self):
        for path, v in self.variants:
            names = set(v.get("requires", [])) | render.fields_in(v["text"])
            for name in sorted(names):
                with self.subTest(template=path, missing=name):
                    data = full_fixture(v)
                    del data[name]
                    skips = []
                    self.assertIsNone(render.render_variant(v, data, path, skips))
                    self.assertEqual(len(skips), 1)
                    self.assertIn(name, skips[0]["missing"])

    def test_empty_values_count_as_missing(self):
        for path, v in self.variants:
            for name in v.get("requires", []):
                for empty in (None, "", []):
                    data = full_fixture(v)
                    data[name] = empty
                    with self.subTest(template=path, field=name, value=empty):
                        self.assertIsNone(render.render_variant(v, data, path, []))

    def test_requires_lists_every_placeholder(self):
        # A template must declare every field it uses, so the build can validate inputs up front.
        for path, v in self.variants:
            with self.subTest(template=path):
                self.assertTrue(render.fields_in(v["text"]) <= set(v.get("requires", [])),
                                "undeclared fields: %s" % (render.fields_in(v["text"]) - set(v.get("requires", []))))

    def test_rationale_with_no_data_is_only_the_notice(self):
        out = render.render_rationale({}, self.tpl)
        self.assertEqual([t for t, _ in out], [self.tpl["executive_rationale"]["slots"]["notice"][0]["text"]])


class Formatting(unittest.TestCase):
    def test_date(self):
        self.assertEqual(render.format_value("2026-09-25", "date"), "25 September 2026")
        self.assertEqual(render.format_value("2022-03-01T00:00Z", "date"), "1 March 2022")

    def test_usd_keeps_source_precision(self):
        self.assertEqual(render.format_value("5335261774.62", "usd"), "$5,335,261,774.62")
        self.assertEqual(render.format_value("75547", "usd"), "$75,547")

    def test_list_and_plural(self):
        self.assertEqual(render.format_value(["a"], "list"), "a")
        self.assertEqual(render.format_value(["a", "b"], "list"), "a and b")
        self.assertEqual(render.format_value(["a", "b", "c"], "list"), "a, b, and c")
        self.assertEqual(render.format_value(1, "plural", "link,links"), "link")
        self.assertEqual(render.format_value(["x", "y"], "plural", "UEI,UEIs"), "UEIs")


class RenderedCases(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tpl = render.load_templates()
        cls.sources = render.load_sources()
        cls.cases = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in INPUTS}
        cls.dossiers = {k: render.render_dossier(v, cls.tpl, cls.sources)[0] for k, v in cls.cases.items()}

    def test_cases_exist(self):
        self.assertIn("serniya", self.cases)
        self.assertIn("palantir", self.cases)

    def test_no_placeholder_text_in_output(self):
        for name, md in self.dossiers.items():
            with self.subTest(case=name):
                self.assertNotRegex(md, PLACEHOLDER)

    def test_rationale_is_three_to_six_sentences(self):
        for name, data in self.cases.items():
            with self.subTest(case=name):
                n = len(render.render_rationale(data, self.tpl))
                self.assertGreaterEqual(n, 3)
                self.assertLessEqual(n, 6)

    def test_rationale_ends_with_notice(self):
        notice = self.tpl["executive_rationale"]["slots"]["notice"][0]["text"]
        for name, data in self.cases.items():
            with self.subTest(case=name):
                self.assertEqual(render.render_rationale(data, self.tpl)[-1][0], notice)

    def test_no_banned_words_outside_methodology(self):
        for name, md in self.dossiers.items():
            body = md.split("## 9. Methodology")[0]
            with self.subTest(case=name):
                self.assertEqual(render.lint(body, self.tpl), [])

    def test_lint_catches_banned_words(self):
        self.assertIn("shell company", render.lint("Acme is a shell company.", self.tpl))
        self.assertIn("clean", render.lint("The recipient is clean.", self.tpl))
        self.assertEqual(render.lint("Treasury called them “front companies”.", self.tpl), [])

    def test_every_footnote_resolves_to_a_registered_source(self):
        for name, md in self.dossiers.items():
            used = set(re.findall(r"\[\^(S\d+)\](?!:)", md))
            defined = set(re.findall(r"^\[\^(S\d+)\]:", md, re.M))
            with self.subTest(case=name):
                self.assertTrue(used)
                self.assertEqual(used, defined)
                self.assertTrue(used <= set(self.sources))

    def test_evidence_cites_only_tier_1_or_2(self):
        for name, md in self.dossiers.items():
            for sid in set(re.findall(r"\[\^(S\d+)\]", md)):
                with self.subTest(case=name, source=sid):
                    self.assertIn(self.sources[sid]["tier"], (1, 2))

    def test_every_signal_cites_a_source(self):
        for name, data in self.cases.items():
            for sig in data.get("signals_found", []):
                with self.subTest(case=name, signal=sig["signal_name"]):
                    self.assertTrue(sig.get("sources"))

    def test_indictment_evidence_carries_allegation_notice(self):
        for name, data in self.cases.items():
            for sig in data.get("signals_found", []):
                if sig["evidence_type"] == "indictment":
                    with self.subTest(case=name, signal=sig["signal_name"]):
                        self.assertIn("allegation", sig.get("notices", []))

    def test_content_hash_is_stable(self):
        again = render.render_dossier(self.cases["serniya"], self.tpl, self.sources)[0]
        self.assertEqual(again, self.dossiers["serniya"])


if __name__ == "__main__":
    unittest.main()
