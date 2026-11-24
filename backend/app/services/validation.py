"""Port of server/services/validation.js — schema validation and repair for LLM output."""


class ValidationError(Exception):
    def __init__(self, message: str, public_message: str = ""):
        super().__init__(message)
        self.public_message = public_message or message


DEFAULT_CLARIFYING_QUESTION = {
    "question": "What problem does this product solve, and who specifically experiences that problem?",
    "whyThisMatters": "Different problems and different users pull the architecture in different directions.",
    "options": [
        {"label": "Personal project", "description": "Something I am building for myself or a small group."},
        {"label": "Internal tool", "description": "For a team or organization I work with."},
        {"label": "Public product", "description": "For unknown public users — needs onboarding, security, support."},
        {"label": "Just exploring", "description": "No concrete users or problem yet."},
    ],
    "allowCustomAnswer": True,
}


def _safe_str(val, default: str = "") -> str:
    return val if isinstance(val, str) else default


def _safe_list(val) -> list:
    return val if isinstance(val, list) else []


def _normalize_decision(d) -> dict | None:
    if not d or not isinstance(d, dict):
        return None
    title = _safe_str(d.get("title") or d.get("category"))
    if not title:
        return None
    return {
        "title": title,
        "category": _safe_str(d.get("category") or title),
        "question": _safe_str(d.get("question")),
        "priority": _safe_str(d.get("priority"), "Medium"),
        "priorityWhy": _safe_str(d.get("priorityWhy")),
        "dependsOn": _safe_list(d.get("dependsOn")),
        "missingInfo": _safe_list(d.get("missingInfo")),
        "clarifyingQuestions": _safe_list(d.get("clarifyingQuestions")),
        "clarifyingAnswers": _safe_list(d.get("clarifyingAnswers")),
        "importance": _safe_str(d.get("importance"), "Medium"),
        "importanceWhy": _safe_str(d.get("importanceWhy")),
        "reversibility": _safe_str(d.get("reversibility"), "Medium"),
        "blastRadius": _safe_str(d.get("blastRadius"), "Module"),
        "tradeoffs": _safe_str(d.get("tradeoffs")),
        "consequences": _safe_str(d.get("consequences")),
        "relatedRequirements": _safe_list(d.get("relatedRequirements")),
        "relatedQualityAttributes": _safe_list(d.get("relatedQualityAttributes")),
        "affects": _safe_list(d.get("affects")),
        "status": d.get("status", "unresolved"),
        "chosen": _safe_str(d.get("chosen")),
        "reasoning": _safe_str(d.get("reasoning")),
        "alternatives": _safe_list(d.get("alternatives")),
    }


def validate_analysis(raw) -> dict:
    if not raw or not isinstance(raw, dict):
        raise ValidationError(
            "Analysis response is not an object.",
            "AI analysis returned an unexpected format. Please try again.",
        )
    if not isinstance(raw.get("product"), dict):
        raise ValidationError(
            "Missing 'product' field in analysis response.",
            "AI analysis returned an unexpected format. Please try again.",
        )

    if not isinstance(raw.get("decisions"), list):
        raw["decisions"] = []
    if not isinstance(raw.get("requirements"), list):
        raw["requirements"] = []
    if not isinstance(raw.get("constraints"), list):
        raw["constraints"] = []
    if not isinstance(raw.get("qualityAttributes"), list):
        raw["qualityAttributes"] = []

    product = raw.get("product") or {}
    decisions = [_normalize_decision(d) for d in raw.get("decisions", [])]
    decisions = [d for d in decisions if d]

    is_degenerate = (
        not (product.get("name") or product.get("description"))
        and not raw.get("requirements")
        and not decisions
    )
    if is_degenerate:
        return {
            "product": {"name": "", "description": ""},
            "goals": "",
            "requirements": [],
            "constraints": [],
            "qualityAttributes": [],
            "decisions": [],
            "productUnderstanding": "needs_clarification",
            "clarifyingQuestion": DEFAULT_CLARIFYING_QUESTION,
        }

    return {
        "product": {
            "name": _safe_str(product.get("name")),
            "description": _safe_str(product.get("description")),
        },
        "goals": _safe_str(raw.get("goals")),
        "requirements": [str(r) for r in raw.get("requirements", []) if r],
        "constraints": [str(c) for c in raw.get("constraints", []) if c],
        "qualityAttributes": [str(q) for q in raw.get("qualityAttributes", []) if q],
        "decisions": decisions,
        "productUnderstanding": _safe_str(raw.get("productUnderstanding"), "complete"),
        "clarifyingQuestion": raw.get("clarifyingQuestion"),
    }


def repair_analysis(raw) -> dict | None:
    if not raw or not isinstance(raw, dict):
        return None
    if not isinstance(raw.get("product"), dict):
        raw["product"] = {"name": "", "description": ""}
    try:
        return validate_analysis(raw)
    except ValidationError:
        return None


def normalize_decision(d) -> dict | None:
    return _normalize_decision(d)


def normalize_analysis(analysis: dict) -> dict:
    if not analysis or not isinstance(analysis, dict):
        return {}
    return {
        "product": analysis.get("product") or {},
        "goals": analysis.get("goals", ""),
        "requirements": analysis.get("requirements") or [],
        "constraints": analysis.get("constraints") or [],
        "qualityAttributes": analysis.get("qualityAttributes") or [],
        "decisions": analysis.get("decisions") or [],
        "productUnderstanding": analysis.get("productUnderstanding"),
        "clarifyingQuestion": analysis.get("clarifyingQuestion"),
    }
