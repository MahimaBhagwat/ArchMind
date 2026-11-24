"""AI routes — port of index.js /api/analyze, /api/alternatives, /api/generate"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.analysis import AnalyzeRequest, AlternativesRequest, GenerateRequest
from app.services.orchestrator import run_analysis_pipeline, run_alternatives_pipeline, run_generate_pipeline
from app.services.ai_service import AIServiceError
from app.api.deps import get_current_user_id

router = APIRouter(tags=["ai"])


def _handle_ai_error(err: AIServiceError):
    raise HTTPException(
        status_code=err.status,
        detail={"error": err.public_message, "retryable": err.retryable, "classification": err.classification},
    )


@router.post("/analyze")
async def analyze(body: AnalyzeRequest):
    """Public endpoint — no auth required."""
    idea = (body.idea or "").strip()
    if not idea:
        raise HTTPException(status_code=400, detail="A product idea is required.")
    try:
        result = await run_analysis_pipeline(idea=idea, clarifying_answers=body.clarifying_answers)
        return result
    except AIServiceError as e:
        _handle_ai_error(e)


@router.post("/alternatives")
async def alternatives(body: AlternativesRequest, _: str = Depends(get_current_user_id)):
    idea = (body.idea or "").strip()
    if not idea:
        raise HTTPException(status_code=400, detail="A product idea is required.")
    if not body.decision or not isinstance(body.decision, dict):
        raise HTTPException(status_code=400, detail="A decision object is required.")
    if not body.decision.get("category") and not body.decision.get("title"):
        raise HTTPException(status_code=400, detail="decision.category or decision.title is required.")
    try:
        result = await run_alternatives_pipeline(idea=idea, decision=body.decision)
        return result
    except AIServiceError as e:
        _handle_ai_error(e)


@router.post("/generate")
async def generate(body: GenerateRequest, _: str = Depends(get_current_user_id)):
    idea = (body.idea or "").strip()
    if not idea:
        raise HTTPException(status_code=400, detail="A product idea is required.")
    if not body.analysis:
        raise HTTPException(status_code=400, detail="Product analysis is required.")
    if not body.decisions:
        raise HTTPException(status_code=400, detail="A non-empty decisions array is required.")
    try:
        result = await run_generate_pipeline(idea=idea, analysis=body.analysis, decisions=body.decisions)
        if not result.get("prompt") and result.get("readiness"):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Resolve the critical decisions listed below before generating an implementation prompt.",
                    "readiness": result["readiness"],
                },
            )
        return result
    except AIServiceError as e:
        _handle_ai_error(e)
