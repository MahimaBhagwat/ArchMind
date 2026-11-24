"""Port of server/services/orchestrator.js — stage-based AI workflow."""
from app.services.ai_service import analyze_product, get_alternatives, generate_implementation_prompt, AIServiceError
from app.services.decision_filter import filter_architectural_decisions
from app.services.decision_prioritizer import process_decisions
from app.services.readiness import compute_readiness, is_ready_for_generation
from app.services.ambiguity import classify_analysis, build_reanalysis_user_content
from app.services.validation import validate_analysis, repair_analysis, ValidationError


async def run_analysis_pipeline(idea: str, clarifying_answers: list | None = None) -> dict:
    """Stage 1-5 analysis pipeline."""
    clarifying_answers = clarifying_answers or []

    # Stage 1: AI call
    user_content_override = None
    if clarifying_answers:
        user_content_override = build_reanalysis_user_content(idea, clarifying_answers)
    raw = await analyze_product(idea, user_content_override)

    # Stage 2: Validate + repair
    try:
        validated = validate_analysis(raw)
    except ValidationError as e:
        repaired = repair_analysis(raw)
        if repaired:
            validated = repaired
        else:
            raise AIServiceError(str(e), status=502, retryable=False, public_message=e.public_message) from e

    # Stage 3: Filter
    filtered = filter_architectural_decisions(validated.get("decisions", []))
    validated = {**validated, "decisions": filtered["architectural"]}
    filtered_out = filtered["filteredOut"]

    # Stage 4: Prioritize + dedup
    prioritized = process_decisions(validated.get("decisions", []), 6)
    validated = {**validated, "decisions": prioritized}

    # Stage 5: Ambiguity classification
    ambiguity = classify_analysis(validated)

    return {"analysis": validated, "ambiguity": ambiguity, "filteredOut": filtered_out}


async def run_alternatives_pipeline(idea: str, decision: dict) -> dict:
    alternatives = await get_alternatives(idea, decision)
    return {"alternatives": alternatives}


async def run_generate_pipeline(idea: str, analysis: dict, decisions: list) -> dict:
    # Stage 1: Readiness check
    readiness = compute_readiness(decisions)
    if not is_ready_for_generation(readiness):
        return {"prompt": None, "readiness": readiness}

    # Stage 2: Generate
    prompt = await generate_implementation_prompt(idea, analysis, decisions)
    return {"prompt": prompt, "readiness": readiness}
