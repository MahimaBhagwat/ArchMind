"""Port of server/services/decisionPrioritizer.js — pure deterministic logic."""
import re

PRIORITY_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
CATEGORY_PRIORITY = {
    "data architecture": 3,
    "database architecture": 3,
    "security": 2,
    "authentication": 2,
    "auth": 2,
}


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


def _get_category_priority(category: str) -> int:
    return CATEGORY_PRIORITY.get(str(category or "").lower().strip(), 1)


def _extract_keywords(text: str) -> list[str]:
    if not text or not isinstance(text, str):
        return []
    return [w for w in re.sub(r"[^a-z0-9\s]", " ", text.lower()).split() if len(w) > 2]


def _jaccard(q1: str, q2: str) -> float:
    kw1 = set(_extract_keywords(q1))
    kw2 = set(_extract_keywords(q2))
    if not kw1 or not kw2:
        return 0.0
    inter = kw1 & kw2
    union = kw1 | kw2
    similarity = len(inter) / len(union)
    title_sim = len(inter) / max(len(kw1), len(kw2))
    return max(similarity, title_sim)


def _count_links(d: dict) -> int:
    return len(d.get("relatedRequirements", []) or []) + len(d.get("relatedQualityAttributes", []) or [])


def _deduplicate(decisions: list) -> list:
    seen = []
    for d in decisions:
        question = d.get("question", "")
        title = d.get("title", "")
        is_dup = False
        merge_target_idx = None
        for i, ex in enumerate(seen):
            if _jaccard(question, ex.get("question", "")) >= 0.4 or _jaccard(title, ex.get("title", "")) >= 0.4:
                is_dup = True
                merge_target_idx = i
                break
        if is_dup and merge_target_idx is not None:
            if _count_links(d) > _count_links(seen[merge_target_idx]):
                seen[merge_target_idx] = d
        elif not is_dup:
            seen.append(d)
    return seen


def process_decisions(decisions: list, cap: int = 6) -> list:
    if not isinstance(decisions, list):
        return []
    deduped = _deduplicate(decisions)
    deduped.sort(key=lambda d: (
        PRIORITY_RANK.get(normalize_priority(d.get("priority") or d.get("importance")), 2),
        -_count_links(d),
        -_get_category_priority(d.get("category", "")),
    ))
    return deduped[:cap]
