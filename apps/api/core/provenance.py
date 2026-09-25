"""Source-record storage (spec §5.1, §2 principle 1).

Every adapter call is stored here as a SourceRecord *before* any job parses it. Records are
written to data/source_records/<source>/<id>.json and indexed by request key, so a stopped
run can resume without repeating calls. Recorded fixtures (fixtures/recorded/<source>/) are
loaded as a read-only replay index for REPLAY_MODE.

Standard library only; Python 3.9 compatible.
"""
import datetime
import hashlib
import json
import os
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = Path(os.environ.get("PFD_DATA_DIR", str(ROOT / "data")))
FIXTURE_DIR = ROOT / "fixtures" / "recorded"


def utc_now() -> str:
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def canonical(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass
class SourceRecord:
    source_name: str
    operation: str
    request_params: Dict[str, Any]
    retrieved_at: str
    http_status: Optional[int]
    response_hash: str
    raw_response: Any
    vendor_record_ids: List[str] = field(default_factory=list)
    license_tag: str = "UNCONFIRMED"
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    replayed_from: Optional[str] = None  # fixture path when served in REPLAY_MODE

    def to_json(self) -> Dict[str, Any]:
        return asdict(self)


class SourceRecordStore:
    """Filesystem store. PostgreSQL storage (Task 2d) implements the same methods."""

    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root or DATA_DIR / "source_records")
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, record: SourceRecord) -> SourceRecord:
        folder = self.root / record.source_name
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / ("%s.json" % record.id)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(record.to_json(), ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(path)  # atomic: a record is either fully stored or absent
        return record

    def get(self, source_name: str, record_id: str) -> Optional[SourceRecord]:
        path = self.root / source_name / ("%s.json" % record_id)
        if not path.exists():
            return None
        return SourceRecord(**json.loads(path.read_text(encoding="utf-8")))


class FixtureIndex:
    """Read-only index of recorded responses, keyed by (source, replay key)."""

    def __init__(self, root: Path = FIXTURE_DIR):
        self.root = root
        self._index: Dict[str, Dict[str, Path]] = {}

    def load(self, source_name: str, key_fn) -> Dict[str, Path]:
        if source_name in self._index:
            return self._index[source_name]
        idx: Dict[str, Path] = {}
        folder = self.root / source_name
        if folder.exists():
            for path in sorted(folder.glob("*.json")):
                rec = json.loads(path.read_text(encoding="utf-8"))
                key = key_fn(rec["operation"], rec.get("request_params") or {})
                if key:
                    idx[key] = path
        self._index[source_name] = idx
        return idx

    def lookup(self, source_name: str, key: str, key_fn) -> Optional[SourceRecord]:
        path = self.load(source_name, key_fn).get(key)
        if not path:
            return None
        rec = json.loads(path.read_text(encoding="utf-8"))
        return SourceRecord(
            source_name=source_name,
            operation=rec["operation"],
            request_params=rec.get("request_params") or {},
            retrieved_at=rec.get("retrieved_at") or "",
            http_status=rec.get("http_status", 200),
            response_hash=rec.get("response_hash") or sha256(canonical(rec.get("raw_response"))),
            raw_response=rec.get("raw_response"),
            vendor_record_ids=rec.get("vendor_record_ids") or [],
            license_tag=rec.get("license_tag") or "UNCONFIRMED",
            replayed_from=str(path.relative_to(ROOT)),
        )
