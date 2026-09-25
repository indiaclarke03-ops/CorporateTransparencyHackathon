"""Task 2c requirements for the dataset jobs. No test touches the network.

Run: python3 -m unittest tests.test_dataset_jobs
"""
import json
import tempfile
import unittest
import urllib.request
from pathlib import Path
from unittest import mock

from apps.api.adapters import ADAPTERS
from apps.api.adapters.base import Adapter, SourceUnavailable
from apps.api.adapters.sayari import SayariAdapter, normalize_entity
from apps.api.adapters.tradeverifyd import TradeverifydAdapter
from apps.api.core.provenance import FixtureIndex, SourceRecordStore
from apps.api.core.runstate import BudgetExceeded, RunState
from apps.api.jobs.datasets import JOBS
from apps.api.jobs.datasets.base import Call, Context, DatasetJob, dry_run, run


def no_network(*a, **k):
    raise AssertionError("network call attempted")


class FakeAdapter(Adapter):
    source_name = "fake"
    budget_name = "fake"
    operations = {"get": {}}
    calls = 0

    def _request(self, operation, params):
        FakeAdapter.calls += 1
        return 200, json.dumps({"value": params["n"]})


class ThreeCallJob(DatasetJob):
    name = "three_calls"

    def plan(self, ctx):
        return [Call("fake", "get", {"n": i}) for i in range(3)]

    def handle(self, ctx, call, rec):
        return [{"n": rec.raw_response["value"]}], []


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        ADAPTERS["fake"] = FakeAdapter
        FakeAdapter.calls = 0

    def tearDown(self):
        ADAPTERS.pop("fake", None)
        self.tmp.cleanup()

    def ctx(self, run_id="t", budgets=None, **kw):
        cfg = json.loads(json.dumps(Context("x", dry_run=True).config))
        cfg["budgets"] = budgets if budgets is not None else cfg["budgets"]
        return Context(run_id, config=cfg, data_dir=self.dir, **kw)


class DryRun(Base):
    def test_dry_run_calls_nothing_and_creates_no_adapter(self):
        with mock.patch.object(urllib.request, "urlopen", no_network):
            ctx = self.ctx(dry_run=True)
            for name, job in JOBS.items():
                with self.subTest(dataset=name):
                    plan = dry_run(job, ctx)
                    self.assertIn("totals", plan)
            with self.assertRaises(RuntimeError):
                ctx.adapter("sayari")

    def test_dry_run_counts_every_seed(self):
        ctx = self.ctx(dry_run=True)
        n = ctx.config["seed"]["pilot_size"]
        self.assertEqual(dry_run(JOBS["network_edges"], ctx)["totals"]["sayari"]["planned"], n)
        self.assertEqual(dry_run(JOBS["listed_party_paths"], ctx)["totals"]["sayari"]["planned"], 2 * n)
        seed_total = sum(t["seed_count"] for t in ctx.config["seed"]["typologies"].values())
        self.assertEqual(seed_total, n)


class Adapters(Base):
    def test_record_is_stored_before_it_is_returned(self):
        ctx = self.ctx()
        rec = ctx.adapter("fake").call("get", {"n": 7})
        stored = ctx.store.get("fake", rec.id)
        self.assertIsNotNone(stored)
        self.assertEqual(stored.raw_response, {"value": 7})
        self.assertTrue(stored.response_hash.startswith("sha256:"))

    def test_unconfirmed_operation_is_rejected(self):
        ctx = self.ctx()
        with self.assertRaises(ValueError):
            ctx.adapter("fake").call("delete_everything", {})
        with self.assertRaises(ValueError):
            SayariAdapter(ctx.store, ctx.state, replay=False)._request("watchlist", {"id": "x"})  # psa missing

    def test_replay_serves_fixture_without_network(self):
        with mock.patch.object(urllib.request, "urlopen", no_network):
            ctx = self.ctx(replay=True)
            rec = ctx.adapter("sayari").call("entity_profile", {"id": "RoWARA0BHg-GoWvDJFBOSg"})
            self.assertTrue(rec.replayed_from.startswith("fixtures/recorded/sayari/"))
            norm = normalize_entity(rec.raw_response)
            self.assertEqual(norm["id"], "RoWARA0BHg-GoWvDJFBOSg")
            self.assertTrue(norm["sanctioned"])
            with self.assertRaises(SourceUnavailable):
                ctx.adapter("sayari").call("entity_profile", {"id": "not-recorded"})

    def test_tradeverifyd_login_is_never_stored(self):
        ctx = self.ctx()
        env = {"TRADEVERIFYD_MCP_URL": "https://example.invalid/mcp", "TRADEVERIFYD_AUTHORIZATION": "Bearer SECRET-VALUE"}
        with mock.patch.dict("os.environ", env), \
             mock.patch.object(TradeverifydAdapter, "_post", return_value=(200, "sid", json.dumps({"result": {}}))):
            TradeverifydAdapter._session = None
            rec = ctx.adapter("tradeverifyd").call("entity_score", {"entity_id": "e1"})
        text = (ctx.store.root / "tradeverifyd" / ("%s.json" % rec.id)).read_text()
        self.assertNotIn("SECRET-VALUE", text)


class BudgetsAndResume(Base):
    def test_stops_cleanly_then_resumes_without_repeating_calls(self):
        ctx = self.ctx(run_id="r1", budgets={"fake": {"total": 2}})
        s1 = run(ThreeCallJob(), ctx)
        self.assertEqual(s1["status"], "stopped")
        self.assertEqual(FakeAdapter.calls, 2)
        self.assertTrue((ctx.out_dir("three_calls") / "rows.partial.jsonl").exists())
        ctx2 = self.ctx(run_id="r1", budgets={"fake": {"total": 3}})
        s2 = run(ThreeCallJob(), ctx2)
        self.assertEqual(s2["status"], "complete")
        self.assertEqual(FakeAdapter.calls, 3)                 # only the one missing call was made
        rows = ctx2.rows("three_calls")
        self.assertEqual(sorted(r["n"] for r in rows), [0, 1, 2])
        self.assertFalse((ctx2.out_dir("three_calls") / "rows.partial.jsonl").exists())

    def test_daily_limit(self):
        state = RunState("d", {"fake": {"daily_limit": 1}}, self.dir)
        state.check("fake")
        state.charge("fake", "k1", "rec1")
        with self.assertRaises(BudgetExceeded):
            state.check("fake")


class MissingData(Base):
    def test_missing_data_is_null_with_reason_not_zero(self):
        with mock.patch.object(urllib.request, "urlopen", no_network):
            ctx = self.ctx(run_id="m", replay=True)
            ctx.config["replay_seeds"] = [{"seed_id": "s1", "name": "Nobody", "sayari_id": "not-recorded"}]
            ctx.seed_source = "fixtures"
            s = run(JOBS["network_edges"], ctx)
        rows = ctx.rows("network_edges")
        self.assertEqual(s["rows"], 1)
        self.assertIsNone(rows[0]["source_record_id"])
        self.assertIn("no recorded response", rows[0]["null_reasons"]["source_record_id"])


if __name__ == "__main__":
    unittest.main()
