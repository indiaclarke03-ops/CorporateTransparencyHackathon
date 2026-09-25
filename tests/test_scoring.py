import pytest
from scoring.engine import (
    SayariPassThrough,
    ScoringInput,
    calculate_composite_score,
)


def test_serniya_root_node_real_data():
    """Uses ent_serniya's actual backfilled sayari_pass_through from
    fixtures/serniya_investigation.json (real relationship_type edge_counts,
    not placeholder keys)."""
    result = calculate_composite_score(ScoringInput(
        entity_id="ent_serniya",
        sayari_data=SayariPassThrough(
            sanctioned=True,
            closed=None,
            degree=5,
            edge_counts={"shared_address": 1, "beneficial_owner": 4},
        ),
        tradeverifyd_score=0.0,
        public_presence_score=100.0,
    ))
    assert result.composite_score == 53.75
    assert result.risk_grade == "B"
    assert any("relationship density" in f for f in result.flags)


def test_palantir_real_data_no_false_positive():
    """Regression test for the match_keys ambiguity bug: Palantir has 2
    legitimate identifiers (UEI + CAGE) and must NOT be flagged ambiguous."""
    result = calculate_composite_score(ScoringInput(
        entity_id="ent_palantir",
        sayari_data=SayariPassThrough(
            sanctioned=False,
            degree=0,
            edge_counts={},
            match_keys=["uei:FSY4LVSBGWB7", "cage:470F5"],
        ),
        tradeverifyd_score=0.0,
        public_presence_score=40.0,
    ))
    assert result.composite_score == 8.0
    assert result.risk_grade == "A"
    assert result.flags == []


def test_possibly_same_as_still_flags_ambiguity():
    """Ambiguity should still fire when there's a real unresolved candidate
    match, just not from match_keys length alone."""
    result = calculate_composite_score(ScoringInput(
        entity_id="entity_ambiguous_case",
        sayari_data=SayariPassThrough(possibly_same_as=["candidate_alias_1"]),
        tradeverifyd_score=0.0,
        public_presence_score=0.0,
    ))
    assert any("possibly_same_as" in f for f in result.flags)
