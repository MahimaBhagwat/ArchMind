"""Port of server/services/readiness.js — pure deterministic logic."""
from app.services.decision_prioritizer import normalize_priority

CRITICAL_PRIORITIES = {"Critical", "High"}


def _is_critical_unresolved(d: dict) -> bool:
    if not d or not isinstance(d, dict):
        return False
    status = d.get("status", "unresolved")
    if status in ("resolved", "skipped"):
        return False
    priority = normalize_priority(d.get("priority") or d.get("importance"))
    return priority in CRITICAL_PRIORITIES


def compute_readiness(decisions: list) -> dict:
    if not isinstance(decisions, list):
        return {
            "totalImportantDecisions": 0,
            "resolvedDecisions": 0,
            "skippedDecisions": 0,
            "remainingDecisions": 0,
            "criticalUnresolved": [],
            "criticalUnresolvedCount": 0,
            "readyForGeneration": False,
        }

    important = [
        d for d in decisions
        if isinstance(d, dict) and normalize_priority(d.get("priority") or d.get("importance")) in {"Critical", "High", "Medium"}
    ]
    total = len(important)
    resolved = sum(1 for d in important if d.get("status") == "resolved")
    skipped = sum(1 for d in important if d.get("status") == "skipped")
    remaining = total - resolved - skipped
    critical_unresolved = [d for d in important if _is_critical_unresolved(d)]

    return {
        "totalImportantDecisions": total,
        "resolvedDecisions": resolved,
        "skippedDecisions": skipped,
        "remainingDecisions": remaining,
        "criticalUnresolved": [
            {
                "title": d.get("title") or d.get("category") or "Unknown",
                "question": d.get("question", ""),
                "category": d.get("category") or d.get("title") or "",
                "priority": normalize_priority(d.get("priority") or d.get("importance")),
            }
            for d in critical_unresolved
        ],
        "criticalUnresolvedCount": len(critical_unresolved),
        "readyForGeneration": len(critical_unresolved) == 0,
    }


def is_ready_for_generation(readiness: dict) -> bool:
    if not readiness or not isinstance(readiness, dict):
        return False
    return readiness.get("readyForGeneration") is True
