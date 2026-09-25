"""Load a dataset run into PostgreSQL (Task 2d item 1), using apps/api/storage/schema.sql.

Connection: DATABASE_URL (e.g. postgresql://user:pass@localhost:5432/pfd). If it is not set,
nothing is loaded and the manifest says so. Loading is idempotent per (dataset, run_id): the
run's rows are deleted and re-inserted.

For tests, `connect("sqlite://")` gives an in-memory SQLite database with the same schema
(jsonb, uuid and timestamptz stored as TEXT).
"""
import json
import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

SCHEMA = Path(__file__).with_name("schema.sql")

# dataset -> (typed table, column mapping from row field)
TYPED = {
    "entities": ("entities", {"id": "sayari_id", "canonical_name": "label", "type": "type", "jurisdiction": "countries",
                              "is_seed": "is_seed", "seed_id": "seed_id", "registration_date": "registration_date",
                              "latest_status": "latest_status", "closed": "closed", "sanctioned": "sanctioned",
                              "pep": "pep", "source_record_id": "source_record_id"}),
    "entity_identifiers": ("entity_identifiers", {"entity_id": "entity_id", "scheme": "scheme", "value": "value",
                                                  "is_weak": "is_weak", "vendor": "vendor", "source_record_id": "source_record_id"}),
    "entity_members": ("entity_members", {"entity_id": "entity_id", "vendor": "vendor", "vendor_entity_id": "vendor_entity_id",
                                          "match_grade": "match_grade", "match_keys": "match_keys", "match_basis": "match_basis",
                                          "source_record_id": "source_record_id"}),
    "ownership_edges": ("relationships", {"from_entity": "from_entity", "to_entity": "to_entity", "type": "relationship_type",
                                          "is_former": "former", "percentage": "percentage", "source_record_id": "source_record_id"}),
    "network_edges": ("relationships", {"from_entity": "from_entity", "to_entity": "to_entity", "type": "relationship_type",
                                        "is_former": "former", "percentage": "percentage", "source_record_id": "source_record_id"}),
    "public_money": ("public_money_records", {"entity_id": "seed_id", "program": "program", "sam_dataset": "sam_dataset",
                                              "amount": "amount", "date": "date", "awarding_agency": "awarding_agency",
                                              "award_id": "award_id", "source_record_id": "source_record_id"}),
    "news_items": ("news_items", {"lane": "lane", "source": "operation", "publisher": "publisher", "title": "title",
                                  "url": "url", "published_at": "publication_date", "source_record_id": "source_record_id"}),
}
JSON_COLS = {"jurisdiction", "match_keys", "hs_codes", "request_params", "raw_response", "vendor_record_ids",
             "manifest", "null_reasons", "data", "matched_rules"}


class Loader:
    def __init__(self, conn, dialect: str):
        self.conn, self.dialect = conn, dialect
        self.ph = "%s" if dialect == "postgres" else "?"

    def init_schema(self):
        sql = SCHEMA.read_text()
        if self.dialect == "sqlite":
            sql = re.sub(r"\b(jsonb|uuid|timestamptz)\b", "TEXT", sql)
            sql = re.sub(r"REFERENCES \w+\(id\)", "", sql).replace("DEFAULT now()", "")
            self.conn.executescript(sql)
        else:
            with self.conn.cursor() as cur:
                cur.execute(sql)
        self.conn.commit()

    def _v(self, col, v):
        if col in JSON_COLS or isinstance(v, (dict, list)):
            return json.dumps(v, ensure_ascii=False) if v is not None else None
        return v

    def _exec(self, sql, params=()):
        sql = sql.replace("?", self.ph)
        cur = self.conn.cursor()
        cur.execute(sql, params)
        return cur

    def load_source_records(self, records: List[Dict[str, Any]]):
        cols = ["id", "source_name", "operation", "request_params", "retrieved_at", "http_status", "response_hash",
                "raw_response", "vendor_record_ids", "license_tag", "replayed_from"]
        for r in records:
            exists = self._exec("SELECT 1 FROM source_records WHERE id = ?", (r["id"],)).fetchone()
            if exists:
                continue
            self._exec("INSERT INTO source_records (%s) VALUES (%s)" % (", ".join(cols), ", ".join("?" * len(cols))),
                       [self._v(c, r.get(c) if r.get(c) != "" else None) for c in cols])

    def load_dataset(self, dataset: str, run_id: str, rows: List[Dict[str, Any]], manifest: Dict[str, Any]):
        self._exec("DELETE FROM dataset_rows WHERE dataset = ? AND run_id = ?", (dataset, run_id))
        self._exec("DELETE FROM dataset_runs WHERE dataset = ? AND run_id = ?", (dataset, run_id))
        for i, r in enumerate(rows):
            self._exec("INSERT INTO dataset_rows (dataset, run_id, row_number, source_record_id, null_reasons, data) "
                       "VALUES (?, ?, ?, ?, ?, ?)", (dataset, run_id, i, r.get("source_record_id"),
                                                    self._v("null_reasons", r.get("null_reasons")), self._v("data", r)))
        if dataset in TYPED:
            table, mapping = TYPED[dataset]
            extra = {"dataset": dataset} if table == "relationships" else {}
            self._exec("DELETE FROM %s WHERE run_id = ?%s" % (table, " AND dataset = ?" if extra else ""),
                       (run_id, dataset) if extra else (run_id,))
            cols = list(mapping) + ["run_id"] + list(extra)
            for r in rows:
                if table == "entities" and not r.get("sayari_id"):
                    continue
                vals = [self._v(c, r.get(f)) for c, f in mapping.items()] + [run_id] + list(extra.values())
                self._exec("INSERT INTO %s (%s) VALUES (%s)" % (table, ", ".join(cols), ", ".join("?" * len(cols))), vals)
        self._exec("INSERT INTO dataset_runs (dataset, run_id, manifest) VALUES (?, ?, ?)",
                   (dataset, run_id, self._v("manifest", manifest)))
        self.conn.commit()


def connect(url: Optional[str] = None) -> Optional[Loader]:
    url = url or os.environ.get("DATABASE_URL")
    if not url:
        return None
    if url.startswith("sqlite://"):
        path = url[len("sqlite://"):] or ":memory:"
        return Loader(sqlite3.connect(path), "sqlite")
    import psycopg2
    return Loader(psycopg2.connect(url), "postgres")
