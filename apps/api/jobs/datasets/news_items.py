"""news_items (docs/datasets.md #13): official lane (Federal Register) and media lane (Tavily news).

Agencies and topics come from config/datasets.yaml `news`. Only agency slugs seen in a live
Federal Register response are used; others must be confirmed first (B13).
"""
from urllib.parse import urlparse

from apps.api.jobs.datasets.base import Call, DatasetJob, null_row


class NewsItemsJob(DatasetJob):
    name = "news_items"

    def plan(self, ctx):
        news = ctx.config.get("news", {})
        calls = [Call("federal_register", "documents", {"agencies": [slug], "per_page": 20}, role="dataset",
                      meta={"lane": "official", "agency_slug": slug})
                 for slug in news.get("federal_register_agencies", [])]
        calls += [Call("tavily", "search", {"query": q, "topic": "news", "max_results": 10}, role="dataset",
                       meta={"lane": "media", "topic_query": q})
                  for q in news.get("media_queries", [])]
        return calls

    def handle(self, ctx, call, rec):
        raw = rec.raw_response or {}
        if call.source == "federal_register":
            items = raw.get("results") or []
            return [dict(call.meta, document_number=d.get("document_number"), type=d.get("type"), title=d.get("title"),
                         publication_date=d.get("publication_date"), url=d.get("html_url"), pdf_url=d.get("pdf_url"),
                         agencies=[a.get("name") for a in d.get("agencies") or []], publisher="Federal Register")
                    for d in items] or [null_row(dict(call.meta), ["document_number"], "no documents returned")], []
        items = raw.get("results") or []
        return [dict(call.meta, url=r.get("url"), title=r.get("title"),
                     published_date=r.get("published_date"), published_date_basis="estimated by Tavily (B15)",
                     publisher=urlparse(r.get("url") or "").netloc.lower().replace("www.", ""))
                for r in items] or [null_row(dict(call.meta), ["url"], "Tavily news search returned no results")], []
