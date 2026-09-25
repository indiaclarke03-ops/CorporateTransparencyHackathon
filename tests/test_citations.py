import json
import unittest
from pathlib import Path

from scripts import check_citations as cc

ROOT = Path(__file__).resolve().parent.parent


def levels(value, context=""):
    return [level for level, _ in cc.static_findings(value, context)]


class StaticRules(unittest.TestCase):
    def test_primary_record_passes(self):
        self.assertEqual(levels("https://ofac.treasury.gov/recent-actions/20220331", "OFAC SDN"), [])

    def test_tier3_is_an_error(self):
        self.assertIn("ERROR", levels("https://fesenkolaw.com/blog/some-post/"))

    def test_bot_challenge_token_is_an_error(self):
        self.assertIn("ERROR", levels("https://www.justice.gov/usao-edny/pr/x?bm-verify=AAQAAAAM"))

    def test_tracking_params_are_errors(self):
        self.assertIn("ERROR", levels("https://home.treasury.gov/news/press-releases/jy0692?utm_source=x"))

    def test_homepage_is_an_error(self):
        self.assertIn("ERROR", levels("https://www.justice.gov/"))

    def test_record_ids_pass(self):
        for rid in ("S01", "sayari:7-U98RGw67tUi01ILV4CCQ", "FR Doc. 2022-27347"):
            self.assertEqual(levels(rid), [], rid)

    def test_authority_mismatch_is_flagged(self):
        self.assertIn("WARN", levels("https://www.bis.gov/press-release/x", "DOJ Indictment"))
        self.assertIn("WARN", levels("https://sam.gov/opp/abc/view", "NYSE-listed"))


class Registry(unittest.TestCase):
    def test_registry_has_no_errors(self):
        errors = [f for _, _, fs in cc.check_file(ROOT / "research" / "sources.json") for f in fs if f[0] == "ERROR"]
        self.assertEqual(errors, [])

    def test_every_source_has_required_metadata(self):
        sources = json.loads((ROOT / "research" / "sources.json").read_text(encoding="utf-8"))["sources"]
        for sid, s in sources.items():
            with self.subTest(source=sid):
                for key in ("name", "url", "tier", "retrieved_at", "retrieved_via", "content_verified"):
                    self.assertIn(key, s)
                self.assertIn(s["tier"], (1, 2))


if __name__ == "__main__":
    unittest.main()
