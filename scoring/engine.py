"""
Composite risk scoring engine for public procurement & sanctions screening.
Pure logic, zero I/O, deterministic output.
Formula: 0.45 * Sayari + 0.35 * Tradeverifyd + 0.20 * Presence

v3 fixes (vs. v2 committed at d498a06), based on real backfilled fixture data:
  Bug 1 - edge_counts previously checked placeholder keys ("has_shareholder",
    "tranships_for") that never appear in real data. Now checks the actual
    relationship_type vocabulary used in fixtures/*.json: beneficial_owner,
    shared_address, officer_director, supply_chain_shipment.
  Bug 2 - match_keys length was treated as an "ambiguous identity" signal,
    which incorrectly penalized Palantir for having 2 legitimate identifier
    systems (UEI + CAGE) for one confirmed entity. Ambiguity now comes only
    from possibly_same_as (real candidate-identity conflicts from Sayari's
    POSSIBLY_SAME_AS mechanism), not from match_keys.

Field names (merge, 25 Sep): `edge_counts` is renamed `relationship_count` (the Sayari REST name,
  docs/vendor/sayari/openapi.yml) and `match_keys` holds Sayari's {key, normalized, original}
  objects. Scoring logic is unchanged. The keys counted below are this repo's graph-contract
  relationship types, not Sayari's own relationship names (backlog B29).

Grade bands (v2 fix retained): A: 0-15  B: 16-70  C: 71-80  D: 81-90  F: 91-100
"""
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional

RiskGrade = Literal["A", "B", "C", "D", "F"]

HIGH_RISK_EDGE_TYPES = {
    "beneficial_owner": 3,
    "shared_address": 3,
    "officer_director": 2,
    "supply_chain_shipment": 2,
}


@dataclass(frozen=True)
class SayariPassThrough:
    sanctioned: bool = False
    pep: bool = False
    closed: bool = False
    degree: int = 0
    # Count of related entities per relationship type (Sayari REST `relationship_count`).
    relationship_count: Dict[str, int] = field(default_factory=dict)
    shares: List[float] = field(default_factory=list)
    position: List[str] = field(default_factory=list)
    possibly_same_as: List[str] = field(default_factory=list)
    # Sayari `possibly_same_as[].match_keys`: objects with `key`, `normalized`, `original`.
    match_keys: List[Dict[str, str]] = field(default_factory=list)


@dataclass(frozen=True)
class ScoringInput:
    entity_id: str
    sayari_data: SayariPassThrough
    tradeverifyd_score: Optional[float] = 0.0
    public_presence_score: float = 0.0


@dataclass(frozen=True)
class ScoringBreakdown:
    sayari_raw: float
    sayari_weighted: float
    tradeverifyd_raw: float
    tradeverifyd_weighted: float
    presence_raw: float
    presence_weighted: float


@dataclass(frozen=True)
class ScoringResult:
    entity_id: str
    composite_score: float
    risk_grade: RiskGrade
    breakdown: ScoringBreakdown
    flags: List[str]


def calculate_sayari_subscore(data: SayariPassThrough) -> "tuple[float, List[str]]":
    raw_score = 0.0
    flags: List[str] = []

    if data.sanctioned:
        raw_score += 65.0
        flags.append("Directly or parent-level designated under sanctions")
    if data.pep:
        raw_score += 20.0
        flags.append("Associated with Politically Exposed Person (PEP)")
    if any(pct >= 50.0 for pct in data.shares):
        raw_score += 15.0
        flags.append("Controlling ownership stake exceeds 50% threshold")
    if data.closed and data.degree >= 3:
        raw_score += 15.0
        flags.append("High topological connectivity on inactive/dissolved entity")

    if len(data.possibly_same_as) > 0:
        raw_score += 10.0
        flags.append("Unresolved candidate identity match (possibly_same_as)")

    edge_risk_points = 0
    matched_edge_types = []
    for edge_type, weight in HIGH_RISK_EDGE_TYPES.items():
        count = data.relationship_count.get(edge_type, 0)
        if count > 0:
            edge_risk_points += count * weight
            matched_edge_types.append(f"{edge_type}x{count}")
    if edge_risk_points >= 8:
        raw_score += 10.0
        flags.append(f"Elevated high-risk relationship density ({', '.join(matched_edge_types)})")

    return min(raw_score, 100.0), flags


def grade_for_score(composite: float) -> RiskGrade:
    if composite <= 15.0:
        return "A"
    elif composite <= 70.0:
        return "B"
    elif composite <= 80.0:
        return "C"
    elif composite <= 90.0:
        return "D"
    return "F"


def calculate_composite_score(payload: ScoringInput) -> ScoringResult:
    sayari_raw, flags = calculate_sayari_subscore(payload.sayari_data)
    trade_raw = payload.tradeverifyd_score if payload.tradeverifyd_score is not None else 0.0
    presence_raw = payload.public_presence_score

    sayari_weighted = 0.45 * sayari_raw
    trade_weighted = 0.35 * trade_raw
    presence_weighted = 0.20 * presence_raw

    composite = round(sayari_weighted + trade_weighted + presence_weighted, 2)
    grade = grade_for_score(composite)

    return ScoringResult(
        entity_id=payload.entity_id,
        composite_score=composite,
        risk_grade=grade,
        breakdown=ScoringBreakdown(
            sayari_raw=round(sayari_raw, 2),
            sayari_weighted=round(sayari_weighted, 2),
            tradeverifyd_raw=round(trade_raw, 2),
            tradeverifyd_weighted=round(trade_weighted, 2),
            presence_raw=round(presence_raw, 2),
            presence_weighted=round(presence_weighted, 2),
        ),
        flags=flags,
    )
