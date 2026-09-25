"""Adapter contract (spec §5.1).

Every external call goes through `Adapter.call`, which:
1. rejects operations not declared by the adapter (only confirmed operations exist, see
   docs/data-source-map.md tool registry);
2. reuses the stored record if this run already made the same request (resume);
3. in REPLAY_MODE, serves a recorded fixture or raises SourceUnavailable; it never calls out;
4. otherwise checks the budget, performs the request, and **stores the raw response as a
   SourceRecord before returning it**. Nothing unstored is ever returned.

Subclasses implement `_request(operation, params) -> (http_status, raw_text)`.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple

from apps.api.core.provenance import (FixtureIndex, SourceRecord, SourceRecordStore,
                                      canonical, sha256, utc_now)
from apps.api.core.runstate import RunState


class SourceUnavailable(Exception):
    """The source could not supply this record. The message is stored as the null reason.

    `record_id` is set when the error response itself was stored (e.g. HTTP 4xx/5xx), so the
    resulting null row still points at a source record."""

    def __init__(self, message, record_id=None):
        super().__init__(message)
        self.record_id = record_id


def replay_mode() -> bool:
    return os.environ.get("REPLAY_MODE", "").lower() in ("1", "true", "yes")


class Adapter:
    source_name = ""
    budget_name = ""                     # key in config/datasets.yaml `budgets`
    license_tag = "UNCONFIRMED"
    operations: Dict[str, Dict[str, Any]] = {}   # name -> {"method", "path", ...}
    timeout = 90
    local_only = False                   # True: reads repo files, so REPLAY_MODE does not apply

    def __init__(self, store: SourceRecordStore, state: RunState, fixtures: Optional[FixtureIndex] = None,
                 replay: Optional[bool] = None):
        self.store, self.state = store, state
        self.fixtures = fixtures or FixtureIndex()
        self.replay = replay_mode() if replay is None else replay

    # ---- keys -------------------------------------------------------------------------
    def request_key(self, operation: str, params: Dict[str, Any]) -> str:
        return operation + "|" + canonical(params)

    def replay_key(self, operation: str, params: Dict[str, Any]) -> Optional[str]:
        """Key used to match recorded fixtures. Override when fixture params differ."""
        return self.request_key(operation, params)

    def vendor_ids(self, operation: str, params: Dict[str, Any], raw: Any):
        return []

    # ---- the one entry point ----------------------------------------------------------
    def call(self, operation: str, params: Dict[str, Any]) -> SourceRecord:
        if operation not in self.operations:
            raise ValueError("%s: operation %r is not in the confirmed tool registry" % (self.source_name, operation))
        key = self.request_key(operation, params)
        prior = self.state.seen(self.budget_name, key)
        if prior:
            rec = self.store.get(self.source_name, prior)
            if rec:
                return rec
        if self.replay and not self.local_only:
            rec = self.fixtures.lookup(self.source_name, self.replay_key(operation, params), self.replay_key)
            if rec is None:
                raise SourceUnavailable("no recorded response (replay mode)")
            rec.request_params = params
            self.store.save(rec)
            self.state.record_reuse(self.budget_name, key, rec.id)
            return rec
        self.state.check(self.budget_name)
        status, raw_text = self._request(operation, params)
        try:
            raw = json.loads(raw_text) if raw_text else None
        except ValueError:
            raw = {"_non_json_body": raw_text}
        rec = SourceRecord(source_name=self.source_name, operation=operation, request_params=params,
                           retrieved_at=utc_now(), http_status=status, response_hash=sha256(raw_text or ""),
                           raw_response=raw, vendor_record_ids=self.vendor_ids(operation, params, raw),
                           license_tag=self.license_tag)
        self.store.save(rec)                          # stored before anyone parses it
        self.state.charge(self.budget_name, key, rec.id)
        if status is None or status >= 400:
            raise SourceUnavailable("source unavailable: %s HTTP %s at %s" % (self.source_name, status, rec.retrieved_at),
                                    record_id=rec.id)
        return rec

    # ---- transport helpers ------------------------------------------------------------
    def _request(self, operation: str, params: Dict[str, Any]) -> Tuple[Optional[int], str]:
        raise NotImplementedError

    def http(self, method: str, url: str, query=None, body=None, headers=None, retries=3) -> Tuple[Optional[int], str]:
        if query:
            url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(query, doseq=True)
        data = json.dumps(body).encode() if body is not None else None
        h = {"Accept": "application/json", "User-Agent": "follow-the-public-dollar/0.1"}
        if data is not None:
            h["Content-Type"] = "application/json"
        h.update(headers or {})
        last = (None, "")
        for attempt in range(retries):
            try:
                req = urllib.request.Request(url, data=data, headers=h, method=method)
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    return resp.status, resp.read().decode("utf-8", "replace")
            except urllib.error.HTTPError as e:
                last = (e.code, e.read().decode("utf-8", "replace"))
                if e.code not in (429, 500, 502, 503, 504):
                    return last
            except Exception as e:  # network error: retried, then reported
                last = (None, json.dumps({"_transport_error": e.__class__.__name__}))
            import time
            time.sleep(2 * (attempt + 1))
        return last


def require_env(*names: str) -> Dict[str, str]:
    missing = [n for n in names if not os.environ.get(n)]
    if missing:
        raise SourceUnavailable("source unavailable: missing credentials %s" % ", ".join(missing))
    return {n: os.environ[n] for n in names}
