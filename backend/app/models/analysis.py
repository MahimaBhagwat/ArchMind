from pydantic import BaseModel, Field
from typing import Optional, List, Any
from app.models.decision import Decision, ClarifyingQuestion


class ProductInfo(BaseModel):
    name: str = ""
    description: str = ""


class Analysis(BaseModel):
    product: ProductInfo = Field(default_factory=ProductInfo)
    goals: str = ""
    requirements: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    quality_attributes: List[str] = Field(default_factory=list, alias="qualityAttributes")
    decisions: List[Decision] = Field(default_factory=list)
    product_understanding: Optional[str] = Field(None, alias="productUnderstanding")
    clarifying_question: Optional[ClarifyingQuestion] = Field(None, alias="clarifyingQuestion")

    model_config = {"populate_by_name": True}


class AmbiguityResult(BaseModel):
    state: str  # "decisions" | "needs_clarification" | "no_decisions_required"
    clarifying_question: Optional[ClarifyingQuestion] = Field(None, alias="clarifyingQuestion")
    reasoning: str = ""

    model_config = {"populate_by_name": True}


class AnalyzeRequest(BaseModel):
    idea: str
    clarifying_answers: Optional[List[Any]] = Field(None, alias="clarifyingAnswers")

    model_config = {"populate_by_name": True}


class AlternativesRequest(BaseModel):
    idea: str
    decision: dict


class GenerateRequest(BaseModel):
    idea: str
    analysis: dict
    decisions: List[dict]


class ReadinessResult(BaseModel):
    total_important_decisions: int = Field(0, alias="totalImportantDecisions")
    resolved_decisions: int = Field(0, alias="resolvedDecisions")
    skipped_decisions: int = Field(0, alias="skippedDecisions")
    remaining_decisions: int = Field(0, alias="remainingDecisions")
    critical_unresolved: List[dict] = Field(default_factory=list, alias="criticalUnresolved")
    critical_unresolved_count: int = Field(0, alias="criticalUnresolvedCount")
    ready_for_generation: bool = Field(False, alias="readyForGeneration")

    model_config = {"populate_by_name": True}
