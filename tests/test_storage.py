"""Task 2d: Parquet + manifest export, database load, quality report. No network."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from apps.api.adapters import ADAPTERS
from apps.api.jobs.datasets.base import Context, run
from apps.api.storage import db, quality
from apps.api.storage.export import export_run
from tests.test_dataset_jobs import FakeAdapter, ThreeCallJob


class Storage(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        ADAPTERS["fake"] = FakeAdapter
        cfg = json.loads(json.dumps(Context("x", dry_run=True).config))
        self.ctx = Context("s1", config=cfg, data_dir=self.dir)
        run(ThreeCallJob(), self.ctx)

    def tearDown(self):
        ADAPTERS.pop("fake", None)
        self.tmp.cleanup()

    def test_manifest_has_every_required_field(self):
        with mock.patch.dict("os.environ", {"DATABASE_URL": ""}):
            m = export_run(self.ctx, "three_calls")
        for key in ("dataset", "run_id", "config_version", "seed_definition", "calls_per_tool", "rows_written",
                    "retrieval_time_range", "failures", "source_record_ids"):
            self.assertIn(key, m)
        self.assertEqual(m["rows_written"], 3)
        self.assertEqual(m["calls_per_tool"], {"fake": 3})
        self.assertEqual(len(m["source_record_ids"]), 3)
        self.assertEqual(m["parquet"], "written")
        self.assertTrue((self.ctx.out_dir("three_calls") / "rows.parquet").exists())
        self.assertIn("DATABASE_URL not set", m["postgres"])

    def test_parquet_round_trips(self):
        import pyarrow.parquet as pq
        export_run(self.ctx, "three_calls")
        t = pq.read_table(str(self.ctx.out_dir("three_calls") / "rows.parquet"))
        self.assertEqual(sorted(t.column("n").to_pylist()), [0, 1, 2])

    def test_database_load_is_idempotent(self):
        path = self.dir / "t.db"
        with mock.patch.dict("os.environ", {"DATABASE_URL": "sqlite://%s" % path}):
            export_run(self.ctx, "three_calls")
            m = export_run(self.ctx, "three_calls")
        self.assertEqual(m["postgres"], "loaded")
        loader = db.connect("sqlite://%s" % path)
        n = loader.conn.execute("SELECT COUNT(*) FROM dataset_rows WHERE dataset='three_calls'").fetchone()[0]
        recs = loader.conn.execute("SELECT COUNT(*) FROM source_records").fetchone()[0]
        self.assertEqual((n, recs), (3, 3))

    def test_quality_report_counts_only(self):
        with mock.patch.object(quality, "REPORT_DIR", self.dir / "reports"):
            p = quality.write_report(self.ctx, ["three_calls"])
        text = p.read_text()
        self.assertIn("Rows missing a source record (must be zero): **0", text)
        self.assertIn("| `three_calls` | complete | 3 | 0 | 0 | 0 |", text)

    def test_scrub_removes_ids_and_urls(self):
        s = quality.scrub("Tradeverifyd: Entity 256a4cc6-d8f4-4799-b31f-31afd3eb090d not found at https://x.example/y")
        self.assertNotIn("256a4cc6", s)
        self.assertNotIn("https://", s)


if __name__ == "__main__":
    unittest.main()
