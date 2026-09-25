"""
Composite risk scoring engine for public procurement & sanctions screening.
Pure logic, zero I/O, deterministic output.
Formula: 0.45 * Sayari + 0.35 * Tradeverifyd + 0.20 * Presence

Grade bands (fixed to include a reachable C tier, preserving established
fixture targets: Serniya ~65 -> B, Palantir ~8 -> A):
  A: 0-15   B: 16-70   C: 71-80   D: 81-90   F: 91-100
"""
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional

RiskGrade = Literal["A", "B", "C", "D", "F"]


@dataclass(frozen=True)
class SayariPassThrough:
    sanctioned: bool = False
    pep: bool = False
    closed: bool = False
    degree: int = 0
    # Sayari REST `relationship_count`: count of related entities per relationship type,
    # e.g. {"has_shareholder": 4}. (Was `edge_counts`, which is not in the Sayari spec.)
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
    tradeverifyd_score: Optional[float] = 0.0  # Zeroed when no API access
    public_presence_score: float = 0.0         # Normalized 0.0-100.0


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
    if len(data.possibly_same_as) > 0 or len(data.match_keys) >= 2:
        raw_score += 10.0
        flags.append("Ambiguous resolution: multiple identity matches / alias variance")

    # Sayari has no transshipment relationship type (the earlier `tranships_for` key did not exist);
    # transshipment is measured from shipment `transit_country` under signal TR3.
    high_risk_edges = data.relationship_count.get("has_shareholder", 0)
    if high_risk_edges >= 4:
        raw_score += 10.0
        flags.append("Elevated high-risk intermediary edge density")

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
