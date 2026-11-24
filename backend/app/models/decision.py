from pydantic import BaseModel, Field
from typing import Optional, List, Any


class Alternative(BaseModel):
    name: str = ""
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    tradeoffs: str = ""
    guidance: str = ""
    # From AI alternatives endpoint
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    best_suited: Optional[str] = Field(None, alias="bestSuited")
    ai_guidance: Optional[str] = Field(None, alias="aiGuidance")
    tradeoff_note: Optional[str] = Field(None, alias="tradeoffNote")

    model_config = {"populate_by_name": True}


class Decision(BaseModel):
    title: str
    category: str = ""
    question: str = ""
    priority: str = "Medium"
    priority_why: str = Field("", alias="priorityWhy")
    depends_on: List[str] = Field(default_factory=list, alias="dependsOn")
    missing_info: List[str] = Field(default_factory=list, alias="missingInfo")
    clarifying_questions: List[str] = Field(default_factory=list, alias="clarifyingQuestions")
    clarifying_answers: List[Any] = Field(default_factory=list, alias="clarifyingAnswers")
    importance: str = "Medium"
    importance_why: str = Field("", alias="importanceWhy")
    reversibility: str = "Medium"
    blast_radius: str = Field("Module", alias="blastRadius")
    tradeoffs: str = ""
    consequences: str = ""
    related_requirements: List[str] = Field(default_factory=list, alias="relatedRequirements")
    related_quality_attributes: List[str] = Field(default_factory=list, alias="relatedQualityAttributes")
    affects: List[str] = Field(default_factory=list)
    has_meaningful_tradeoff: Optional[bool] = Field(None, alias="hasMeaningfulTradeoff")
    status: str = "unresolved"
    chosen: str = ""
    reasoning: str = ""
    alternatives: List[Alternative] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class FlowAction(BaseModel):
    title: str
    action: str  # "resolve" | "skip" | "clarify"
    chosen: Optional[str] = None
    reasoning: Optional[str] = None
    answers: Optional[List[Any]] = None


class ClarifyingOption(BaseModel):
    label: str
    description: str


class ClarifyingQuestion(BaseModel):
    question: str
    why_this_matters: str = Field("", alias="whyThisMatters")
    options: List[ClarifyingOption] = Field(default_factory=list)
    allow_custom_answer: bool = Field(True, alias="allowCustomAnswer")

    model_config = {"populate_by_name": True}
