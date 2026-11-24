"""Port of server/services/decisionFilter.js — pure deterministic logic."""

PRIORITY_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def normalize_priority(raw) -> str:
    if not isinstance(raw, str):
        return "Medium"
    v = raw.strip()
    if v in PRIORITY_RANK:
        return v
    cap = v.capitalize()
    if cap in PRIORITY_RANK:
        return cap
    return "Medium"


def _is_meaningful_tradeoff(text: str) -> bool:
    if not text or not isinstance(text, str):
        return False
    lower = text.lower().strip()
    if not lower:
        return False
    if "does not involve significant competing trade-offs" in lower:
        return False
    if "one option may be clearly preferable" in lower:
        return False
    return True


def filter_architectural_decisions(decisions: list) -> dict:
    """Split decisions into architectural vs filteredOut."""
    if not isinstance(decisions, list):
        return {"architectural": [], "filteredOut": []}

    architectural = []
    filtered_out = []

    for d in decisions:
        if not d or not isinstance(d, dict):
            continue
        priority = normalize_priority(d.get("priority") or d.get("importance"))
        has_tradeoff = _is_meaningful_tradeoff(d.get("tradeoffs", ""))

        enriched = {
            **d,
            "hasMeaningfulTradeoff": has_tradeoff,
            "priority": priority,
            "status": (
                "resolved" if d.get("status") == "resolved"
                else "skipped" if d.get("status") == "skipped"
                else "unresolved"
            ),
        }

        if priority != "Low" and has_tradeoff:
            architectural.append(enriched)
        else:
            reason = "Low priority" if priority == "Low" else "No meaningful trade-off"
            filtered_out.append({**enriched, "filteredReason": reason})

    return {"architectural": architectural, "filteredOut": filtered_out}
