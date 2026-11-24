"""Port of server/services/ambiguity.js — pure deterministic logic."""

STATES = {
    "DECISIONS": "decisions",
    "NEEDS_CLARIFICATION": "needs_clarification",
    "NO_DECISIONS_REQUIRED": "no_decisions_required",
}

DEFAULT_CLARIFYING_QUESTION = {
    "question": "What problem does this product solve, and who specifically experiences that problem?",
    "whyThisMatters": (
        "Different problems and different users pull the architecture in different directions — "
        "a hobby tool for personal use rarely needs the same data model, deployment shape, or "
        "security boundaries as a multi-tenant production product."
    ),
    "options": [
        {"label": "Personal project", "description": "Something I am building for myself or a small group — minimal infrastructure, low operational overhead."},
        {"label": "Internal tool", "description": "For a team or organization I work with — known users, controlled deployment, modest scale."},
        {"label": "Public product", "description": "For unknown public users — needs onboarding, security, support, and may scale unpredictably."},
        {"label": "Just exploring", "description": "No concrete users or problem yet — I want to think through trade-offs before committing."},
    ],
    "allowCustomAnswer": True,
}


def _normalize_understanding(raw, decisions: list) -> str:
    if isinstance(raw, str):
        v = raw.strip()
        if v == "complete":
            return STATES["DECISIONS"]
        if v == "needs_clarification":
            return STATES["NEEDS_CLARIFICATION"]
        if v == "sufficient_no_decisions":
            return STATES["NO_DECISIONS_REQUIRED"]
    if isinstance(decisions, list) and len(decisions) > 0:
        return STATES["DECISIONS"]
    return STATES["NO_DECISIONS_REQUIRED"]


def _normalize_clarifying_question(raw) -> dict | None:
    if not raw or not isinstance(raw, dict):
        return None
    question = str(raw.get("question", "")).strip()
    why = str(raw.get("whyThisMatters", "")).strip()
    if not question or not why:
        return None
    raw_opts = raw.get("options", [])
    if not isinstance(raw_opts, list):
        return None
    options = [
        {"label": str(o.get("label", "")).strip(), "description": str(o.get("description", "")).strip()}
        for o in raw_opts
        if isinstance(o, dict) and str(o.get("label", "")).strip() and str(o.get("description", "")).strip()
    ]
    if len(options) < 2:
        return None
    return {
        "question": question,
        "whyThisMatters": why,
        "options": options,
        "allowCustomAnswer": raw.get("allowCustomAnswer", True) is not False,
    }


def classify_analysis(analysis: dict) -> dict:
    decisions = analysis.get("decisions", []) or []
    understanding = _normalize_understanding(analysis.get("productUnderstanding"), decisions)

    if understanding == STATES["DECISIONS"]:
        if not decisions:
            return {
                "state": STATES["NEEDS_CLARIFICATION"],
                "clarifyingQuestion": DEFAULT_CLARIFYING_QUESTION,
                "reasoning": "productUnderstanding=complete but decisions[] is empty; falling back to clarification.",
            }
        return {"state": STATES["DECISIONS"], "clarifyingQuestion": None, "reasoning": "Decisions identified."}

    if understanding == STATES["NEEDS_CLARIFICATION"]:
        cq = _normalize_clarifying_question(analysis.get("clarifyingQuestion"))
        if not cq:
            cq = DEFAULT_CLARIFYING_QUESTION
        return {"state": STATES["NEEDS_CLARIFICATION"], "clarifyingQuestion": cq, "reasoning": "Clarification needed."}

    return {"state": STATES["NO_DECISIONS_REQUIRED"], "clarifyingQuestion": None, "reasoning": "No decisions needed."}


def build_reanalysis_user_content(idea: str, clarifying_answers: list) -> str:
    lines = [f"Original product idea:\n{idea}\n", "Clarifying answers from the developer:"]
    for item in clarifying_answers:
        if isinstance(item, dict):
            q = item.get("question", "")
            a = item.get("answer", "")
            lines.append(f"  Q: {q}\n  A: {a}")
        elif isinstance(item, str):
            lines.append(f"  - {item}")
    lines.append("\nPlease re-analyse the product idea using these answers as binding context.")
    return "\n".join(lines)
