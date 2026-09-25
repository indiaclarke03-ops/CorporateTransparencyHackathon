"""Adapter registry. Every external call in the app goes through one of these."""
from apps.api.adapters.public import CslAdapter, FederalRegisterAdapter, GleifAdapter, LocalFileAdapter
from apps.api.adapters.sam import SamAdapter
from apps.api.adapters.sayari import SayariAdapter
from apps.api.adapters.tavily import TavilyAdapter
from apps.api.adapters.tradeverifyd import TradeverifydAdapter
from apps.api.adapters.usaspending import USAspendingAdapter

ADAPTERS = {a.source_name: a for a in (SayariAdapter, USAspendingAdapter, SamAdapter, TavilyAdapter,
                                       TradeverifydAdapter, GleifAdapter, FederalRegisterAdapter,
                                       CslAdapter, LocalFileAdapter)}
