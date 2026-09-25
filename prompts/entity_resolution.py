"""
Entity resolution prompt contract for LLM-based sanctions/procurement screening.
Works with Claude and/or Gemini; enforces the schema contract defined in
schema/investigation_schema.json (v2, Sayari-field-aligned).
"""
import json
from typing import Any, Dict, List

SYSTEM_INSTRUCTION = (
    "You are a forensic corporate intelligence auditor specializing in entity "
    "resolution and sanctions circumvention. Analyze the target company against "
    "the provided public records (OFAC SDN, BIS Entity List, SAM.gov, DOJ "
    "indictments). Output strictly valid JSON matching the schema below. Do not "
    "wrap in markdown code fences. Do not add conversational text."
)

RESOLUTION_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "resolved_entity_name": {"type": "string"},
        "entity_id": {"type": "string"},
        "is_match": {"type": "boolean"},
        "match_confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "resolution_rationale": {"type": "string"},
        "matched_identifiers": {"type": "array", "items": {"type": "string"}},
        "sayari_pass_through": {
            "type": "object",
            "properties": {
                "sanctioned": {"type": "boolean"},
                "pep": {"type": "boolean"},
                "closed": {"type": "boolean"},
                "degree": {"type": "integer"},
                "relationship_count": {"type": "object", "additionalProperties": {"type": "integer"}},
                "shares": {"type": "array", "items": {"type": "number"}},
                "position": {"type": "array", "items": {"type": "string"}},
                "possibly_same_as": {"type": "array", "items": {"type": "string"}},
                "match_keys": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"key": {"type": "string"}, "normalized": {"type": "string"}, "original": {"type": "string"}},
                        "required": ["key", "normalized", "original"],
                    },
                },
            },
            "required": ["sanctioned", "pep", "closed", "degree", "relationship_count", "shares", "match_keys"],
        },
        "public_presence_score": {"type": "number", "minimum": 0.0, "maximum": 100.0},
    },
    "required": [
        "resolved_entity_name", "entity_id", "is_match", "match_confidence",
        "resolution_rationale", "matched_identifiers", "sayari_pass_through",
        "public_presence_score",
    ],
}


def build_entity_resolution_request(target_entity: str, context_records: List[dict]) -> Dict[str, str]:
    """Returns a dict with 'system' and 'user' keys, ready to hand to either
    the Anthropic Messages API (system=..., messages=[{"role":"user","content":user}])
    or the Gemini API (system_instruction=system, contents=user).

    The earlier draft defined SYSTEM_INSTRUCTION but never returned or wired it
    into the outgoing request -- fixed here so callers actually send it.
    """
    user_prompt = (
        f"Target Query:\n{target_entity}\n\n"
        f"Evidence Records:\n{json.dumps(context_records, indent=2)}\n\n"
        f"Strict JSON Schema To Satisfy:\n{json.dumps(RESOLUTION_SCHEMA, indent=2)}"
    )
    return {"system": SYSTEM_INSTRUCTION, "user": user_prompt}
