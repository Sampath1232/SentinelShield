"""SentinelShield rule-based attack detector."""
import json
import re
import urllib.parse
from pathlib import Path
from typing import List, Dict, Any

RULES_PATH = Path(__file__).parent / "rules" / "rules.json"


def _load_rules() -> List[Dict[str, Any]]:
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        rules = json.load(f)
    for r in rules:
        r["_compiled"] = re.compile(r["pattern"])
    return rules


RULES: List[Dict[str, Any]] = _load_rules()


def reload_rules() -> List[Dict[str, Any]]:
    global RULES
    RULES = _load_rules()
    return RULES


def list_rules() -> List[Dict[str, Any]]:
    return [{k: v for k, v in r.items() if k != "_compiled"} for r in RULES]


def normalize(value: str) -> str:
    if value is None:
        return ""
    try:
        decoded = urllib.parse.unquote_plus(value)
        # decode twice to catch double-encoded payloads
        decoded = urllib.parse.unquote_plus(decoded)
    except Exception:
        decoded = value
    return decoded


def scan(payload: str) -> List[Dict[str, Any]]:
    """Return list of matching rule dicts for the given payload string."""
    if not payload:
        return []
    text = normalize(payload)
    hits = []
    for rule in RULES:
        if rule["_compiled"].search(text):
            hits.append({k: v for k, v in rule.items() if k != "_compiled"})
    return hits


def inspect_request(method: str, path: str, query: str, headers: Dict[str, str], body: str) -> Dict[str, Any]:
    """Inspect HTTP request components and return aggregated detection result."""
    blobs = {
        "path": path or "",
        "query": query or "",
        "body": body or "",
        "user-agent": headers.get("user-agent", "") if headers else "",
        "referer": headers.get("referer", "") if headers else "",
    }
    matched = []
    seen_ids = set()
    for source, value in blobs.items():
        for hit in scan(value):
            if hit["rule_id"] in seen_ids:
                continue
            seen_ids.add(hit["rule_id"])
            matched.append({**hit, "matched_in": source})

    total_score = sum(h["score"] for h in matched)
    severity = "none"
    if matched:
        order = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        severity = max((m["severity"] for m in matched), key=lambda s: order.get(s, 0))

    return {
        "method": method,
        "path": path,
        "matches": matched,
        "score": total_score,
        "severity": severity,
        "blocked": bool(matched),
    }
