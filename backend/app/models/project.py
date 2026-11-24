from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.analysis import Analysis
from app.models.decision import Decision


class ProjectCreate(BaseModel):
    idea: str
    analysis: dict
    decisions: List[dict]
    final_prompt: str = Field("", alias="finalPrompt")

    model_config = {"populate_by_name": True}


class ProjectResponse(BaseModel):
    id: str
    idea: str
    analysis: dict
    decisions: List[dict]
    final_prompt: str = Field("", alias="finalPrompt")
    created_at: Optional[str] = Field(None, alias="createdAt")
    updated_at: Optional[str] = Field(None, alias="updatedAt")

    model_config = {"populate_by_name": True}


class ReportRequest(BaseModel):
    per_decision_prompts: Optional[dict] = Field(None, alias="perDecisionPrompts")
    graph_direction: str = Field("TD", alias="graphDirection")
    readiness: Optional[dict] = None

    model_config = {"populate_by_name": True}
