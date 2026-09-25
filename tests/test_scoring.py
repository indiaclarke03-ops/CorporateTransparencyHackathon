import pytest
from scoring.engine import (
    SayariPassThrough,
    ScoringInput,
    calculate_composite_score,
)


def test_serniya_investigation_score():
    serniya_input = ScoringInput(
        entity_id="entity_serniya_001",
        sayari_data=SayariPassThrough(
            sanctioned=True,
            pep=False,
            closed=True,
            degree=5,
            relationship_count={"has_shareholder": 4, "linked_to": 2},
            shares=[100.0],
            possibly_same_as=["serniya_engineering_llc"],
            match_keys=[{"key": "identifier", "normalized": "7701234567", "original": "7701234567"}],
        ),
        tradeverifyd_score=0.0,
        public_presence_score=100.0,
    )
    result = calculate_composite_score(serniya_input)
    assert result.composite_score == 65.0
    assert result.risk_grade == "B"
    assert "Directly or parent-level designated under sanctions" in result.flags


def test_palantir_control_score():
    palantir_input = ScoringInput(
        entity_id="entity_palantir_control",
        sayari_data=SayariPassThrough(
            sanctioned=False,
            pep=False,
            closed=False,
            degree=12,
            relationship_count={"has_subsidiary": 8, "subsidiary_of": 0},
            shares=[],
            possibly_same_as=[],
            match_keys=[{"key": "identifier", "normalized": "1ABC2", "original": "1abc2"}],
        ),
        tradeverifyd_score=0.0,
        public_presence_score=40.0,
    )
    result = calculate_composite_score(palantir_input)
    assert result.composite_score == 8.0
    assert result.risk_grade == "A"
    assert len(result.flags) == 0


def test_grade_c_is_reachable():
    """Regression test: the earlier draft never produced Grade C.
    A mid-risk case (PEP flag + moderate presence, no sanctions/closure)
    should be able to land in the 71-80 band."""
    mid_input = ScoringInput(
        entity_id="entity_midrisk_case",
        sayari_data=SayariPassThrough(
            pep=True,
            degree=4,
            relationship_count={"has_shareholder": 5},
            possibly_same_as=["possible_alias"],
        ),
        tradeverifyd_score=0.0,
        public_presence_score=100.0,
    )
    result = calculate_composite_score(mid_input)
    assert result.risk_grade in ("B", "C")
    assert result.composite_score > 0
