"""Projects routes — port of server/routes/projects.js"""
from fastapi import APIRouter, HTTPException, Depends
from app.models.project import ProjectCreate, ReportRequest
from app.api.deps import get_current_user_id, get_database
from app.services.validation import normalize_decision, normalize_analysis
from app.services.report_builder import build_report
from app.services import decision_flow as flow
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone

router = APIRouter(prefix="/projects", tags=["projects"])


def _fmt_project(p: dict) -> dict:
    p = dict(p)
    p["id"] = str(p.pop("_id", ""))
    if isinstance(p.get("user"), ObjectId):
        p["user"] = str(p["user"])
    if isinstance(p.get("createdAt"), datetime):
        p["createdAt"] = p["createdAt"].isoformat()
    if isinstance(p.get("updatedAt"), datetime):
        p["updatedAt"] = p["updatedAt"].isoformat()
    return p


def _require_project(project):
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


def _cast_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, Exception):
        raise HTTPException(status_code=404, detail="Project not found.")


# ─── POST /api/projects ──────────────────────────────────────────────────────
@router.post("", status_code=201)
async def create_project(
    body: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    idea = (body.idea or "").strip()
    if not idea:
        raise HTTPException(status_code=400, detail="A product idea is required.")
    if not body.analysis:
        raise HTTPException(status_code=400, detail="Product analysis is required.")
    if body.decisions is None:
        raise HTTPException(status_code=400, detail="A decisions array is required.")
    if body.final_prompt is None:
        raise HTTPException(status_code=400, detail="An implementation prompt is required.")

    normalized_analysis = normalize_analysis(body.analysis)
    normalized_decisions = [normalize_decision(d) for d in (body.decisions or [])]
    normalized_decisions = [d for d in normalized_decisions if d]

    now = datetime.now(timezone.utc)
    doc = {
        "user": ObjectId(user_id),
        "idea": idea,
        "analysis": normalized_analysis,
        "decisions": normalized_decisions,
        "finalPrompt": body.final_prompt or "",
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db["projects"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"project": _fmt_project(doc)}


# ─── GET /api/projects ───────────────────────────────────────────────────────
@router.get("")
async def list_projects(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db["projects"].find({"user": ObjectId(user_id)}).sort("createdAt", -1)
    projects = [_fmt_project(p) async for p in cursor]
    return {"projects": projects}


# ─── GET /api/projects/:id ───────────────────────────────────────────────────
@router.get("/{project_id}")
async def get_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    oid = _cast_id(project_id)
    project = await db["projects"].find_one({"_id": oid, "user": ObjectId(user_id)})
    _require_project(project)
    return {"project": _fmt_project(project)}


# ─── POST /api/projects/:id/report ──────────────────────────────────────────
@router.post("/{project_id}/report")
async def get_report(
    project_id: str,
    body: ReportRequest | None = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    oid = _cast_id(project_id)
    project = await db["projects"].find_one({"_id": oid, "user": ObjectId(user_id)})
    _require_project(project)

    body = body or ReportRequest()
    decisions = list(project.get("decisions") or [])
    # Attach synthetic _id for per-decision prompts keying
    for i, d in enumerate(decisions):
        if d and not d.get("_id"):
            d["_id"] = f"d{i + 1}"

    analysis = project.get("analysis") or {}
    product_name = (analysis.get("product") or {}).get("name") or "Untitled Project"

    project_for_report = {
        "title": product_name,
        "idea": project.get("idea", ""),
        "analysis": analysis,
        "decisions": decisions,
        "readiness": body.readiness,
        "finalPrompt": project.get("finalPrompt", ""),
    }
    opts = {
        "perDecisionPrompts": body.per_decision_prompts or {},
        "graphDirection": body.graph_direction if body.graph_direction in ("TD", "LR") else "TD",
    }
    report = build_report(project_for_report, opts)
    return {"report": report}


# ─── GET /api/projects/:id/flow ─────────────────────────────────────────────
@router.get("/{project_id}/flow")
async def get_flow(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    oid = _cast_id(project_id)
    project = await db["projects"].find_one({"_id": oid, "user": ObjectId(user_id)})
    _require_project(project)
    decisions = list(project.get("decisions") or [])
    state = flow.compute_flow_state(decisions)
    summary = flow.summarize_progress(decisions)
    return {**state, "summary": summary}


# ─── POST /api/projects/:id/flow ────────────────────────────────────────────
@router.post("/{project_id}/flow")
async def update_flow(
    project_id: str,
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    oid = _cast_id(project_id)
    project = await db["projects"].find_one({"_id": oid, "user": ObjectId(user_id)})
    _require_project(project)

    title = body.get("title", "")
    action = body.get("action", "")
    if not title or not isinstance(title, str):
        raise HTTPException(status_code=400, detail="A decision title is required.")
    if action not in ("resolve", "skip", "clarify"):
        raise HTTPException(status_code=400, detail="Action must be 'resolve', 'skip', or 'clarify'.")
    if action == "resolve" and not (body.get("chosen") or "").strip():
        raise HTTPException(status_code=400, detail="Resolve requires a non-empty 'chosen' value.")

    decisions = list(project.get("decisions") or [])

    def title_key(d):
        return (d or {}).get("title") or (d or {}).get("category") or ""

    if not any(title_key(d) == title for d in decisions):
        raise HTTPException(status_code=404, detail=f'Decision "{title}" not found in this project.')

    if action == "resolve":
        decisions = flow.mark_resolved(decisions, title, body.get("chosen", ""), body.get("reasoning", ""))
    elif action == "skip":
        decisions = flow.mark_skipped(decisions, title, body.get("reasoning", ""))
    elif action == "clarify":
        answers = body.get("answers")
        if not isinstance(answers, list):
            raise HTTPException(status_code=400, detail="Clarify requires 'answers' as an array.")
        decisions = [
            flow.record_clarifying_answers(d, answers) if title_key(d) == title else d
            for d in decisions
        ]

    now = datetime.now(timezone.utc)
    await db["projects"].update_one(
        {"_id": oid},
        {"$set": {"decisions": decisions, "updatedAt": now}},
    )

    state = flow.compute_flow_state(decisions)
    summary = flow.summarize_progress(decisions)
    project = dict(project)
    project["decisions"] = decisions
    return {
        "project": _fmt_project(project),
        "current": state["current"],
        "upcoming": state["upcoming"],
        "summary": summary,
    }
