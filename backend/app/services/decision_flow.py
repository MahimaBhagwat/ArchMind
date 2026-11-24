"""Port of server/services/decisionFlow.js — pure deterministic logic."""
from app.services.decision_prioritizer import normalize_priority

PRIORITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def _resolved_titles(decisions: list) -> set:
    out = set()
    for d in decisions or []:
        if not d:
            continue
        title = d.get("title") or d.get("category") or ""
        if d.get("status") == "resolved" and title:
            out.add(title)
    return out


def _skipped_titles(decisions: list) -> set:
    out = set()
    for d in decisions or []:
        if not d:
            continue
        title = d.get("title") or d.get("category") or ""
        if d.get("status") == "skipped" and title:
            out.add(title)
    return out


def _compute_skipped_by_dependency(candidates: list, skipped_set: set) -> set:
    skipped = set(skipped_set)
    changed = True
    while changed:
        changed = False
        for d in candidates:
            if not d:
                continue
            title = d.get("title") or d.get("category") or ""
            if not title or title in skipped:
                continue
            deps = d.get("dependsOn") or []
            if isinstance(deps, list) and any(dep in skipped for dep in deps):
                skipped.add(title)
                changed = True
    return skipped


def compute_flow_state(decisions: list) -> dict:
    if not isinstance(decisions, list):
        return {"current": None, "upcoming": [], "resolved": [], "skipped": [], "unknown": [], "total": 0}

    resolved = _resolved_titles(decisions)
    explicitly_skipped = _skipped_titles(decisions)
    all_skipped = _compute_skipped_by_dependency(decisions, explicitly_skipped)

    resolved_list, skipped_list, ready_list, unknown_list = [], [], [], []

    for d in decisions:
        if not d:
            continue
        title = d.get("title") or d.get("category") or ""
        if d.get("status") == "resolved":
            resolved_list.append(d)
        elif title in all_skipped or d.get("status") == "skipped":
            skipped_list.append(d)
        else:
            deps = d.get("dependsOn") or []
            if isinstance(deps, list) and all(dep in resolved or dep in all_skipped for dep in deps):
                ready_list.append(d)
            else:
                unknown_list.append(d)

    # Sort ready by priority
    ready_list.sort(key=lambda d: PRIORITY_ORDER.get(normalize_priority(d.get("priority") or d.get("importance")), 2))

    current = ready_list[0] if ready_list else None
    upcoming = ready_list[1:] if len(ready_list) > 1 else []

    return {
        "current": current,
        "upcoming": upcoming,
        "resolved": resolved_list,
        "skipped": skipped_list,
        "unknown": unknown_list,
        "total": len(decisions),
    }


def summarize_progress(decisions: list) -> dict:
    if not isinstance(decisions, list):
        return {"total": 0, "resolved": 0, "unresolved": 0, "skipped": 0, "filtered": 0, "progress": 0}

    total = len(decisions)
    resolved = sum(1 for d in decisions if d and d.get("status") == "resolved")
    skipped = sum(1 for d in decisions if d and d.get("status") == "skipped")
    unresolved = total - resolved - skipped
    progress = round((resolved + skipped) / total * 100) if total else 0

    return {"total": total, "resolved": resolved, "unresolved": unresolved, "skipped": skipped, "filtered": 0, "progress": progress}


def mark_resolved(decisions: list, title: str, chosen: str, reasoning: str = "") -> list:
    result = []
    for d in decisions:
        if not d:
            continue
        t = d.get("title") or d.get("category") or ""
        if t == title:
            result.append({**d, "status": "resolved", "chosen": chosen, "reasoning": reasoning})
        else:
            result.append(d)
    return result


def mark_skipped(decisions: list, title: str, reasoning: str = "") -> list:
    result = []
    for d in decisions:
        if not d:
            continue
        t = d.get("title") or d.get("category") or ""
        if t == title:
            result.append({**d, "status": "skipped", "reasoning": reasoning})
        else:
            result.append(d)
    return result


def record_clarifying_answers(decision: dict, answers: list) -> dict:
    return {**decision, "clarifyingAnswers": answers}
