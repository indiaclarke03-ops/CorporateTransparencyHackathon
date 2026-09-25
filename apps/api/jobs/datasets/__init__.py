"""Dataset jobs (Task 2c). One job per dataset in docs/datasets.md.

    python -m apps.api.jobs.datasets list
    python -m apps.api.jobs.datasets build <name> --dry-run
    python -m apps.api.jobs.datasets build <name> [--run-id ID] [--seed-source fixtures]
"""
from apps.api.jobs.datasets.address_clusters import AddressClustersJob
from apps.api.jobs.datasets.award_competition import AwardCompetitionJob
from apps.api.jobs.datasets.entities import EntitiesJob
from apps.api.jobs.datasets.entity_identifiers import EntityIdentifiersJob
from apps.api.jobs.datasets.entity_members import EntityMembersJob
from apps.api.jobs.datasets.false_positive_sample import FalsePositiveSampleJob
from apps.api.jobs.datasets.listed_party_paths import ListedPartyPathsJob
from apps.api.jobs.datasets.network_edges import NetworkEdgesJob
from apps.api.jobs.datasets.news_items import NewsItemsJob
from apps.api.jobs.datasets.official_list_entries import OfficialListEntriesJob
from apps.api.jobs.datasets.ownership_edges import OwnershipEdgesJob
from apps.api.jobs.datasets.pending import AssessmentsJob, BacktestCandidatesJob, SignalsJob
from apps.api.jobs.datasets.public_money import PublicMoneyJob
from apps.api.jobs.datasets.reference_lists import ReferenceListsJob
from apps.api.jobs.datasets.seed_awards import SeedAwardsJob
from apps.api.jobs.datasets.spending_trends import SpendingTrendsJob
from apps.api.jobs.datasets.subawards import SubawardsJob
from apps.api.jobs.datasets.trade_edges import TradeEdgesJob
from apps.api.jobs.datasets.tradeverifyd_annotations import TradeverifydAnnotationsJob
from apps.api.jobs.datasets.tradeverifyd_trade import TradeverifydTradeJob
from apps.api.jobs.datasets.web_presence import WebPresenceJob

# Build order: dependencies first. `entities` appears twice: the second pass adds summary
# calls for connected companies found by `network_edges` (earlier calls are reused).
JOBS = {j.name: j for j in (
    SeedAwardsJob(), PublicMoneyJob(), AwardCompetitionJob(), SubawardsJob(), EntitiesJob(),
    EntityMembersJob(), EntityIdentifiersJob(), OwnershipEdgesJob(), NetworkEdgesJob(),
    ListedPartyPathsJob(), TradeEdgesJob(), WebPresenceJob(), NewsItemsJob(), OfficialListEntriesJob(),
    SpendingTrendsJob(), ReferenceListsJob(), TradeverifydAnnotationsJob(), TradeverifydTradeJob(),
    AddressClustersJob(), SignalsJob(), AssessmentsJob(), BacktestCandidatesJob(), FalsePositiveSampleJob())}

BUILD_ORDER = ["seed_awards", "public_money", "award_competition", "subawards", "entities", "network_edges",
               "entities", "entity_members", "entity_identifiers", "ownership_edges", "listed_party_paths",
               "trade_edges", "web_presence", "address_clusters", "tradeverifyd_annotations", "tradeverifyd_trade",
               "news_items", "official_list_entries", "spending_trends", "reference_lists",
               "false_positive_sample", "signals", "assessments", "backtest_candidates"]
