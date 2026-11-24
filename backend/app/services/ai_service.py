"""Port of server/services/aiService.js — AI orchestration layer."""
import json
from app.services.ai.provider_factory import get_ai_provider
from app.services.prompts import ANALYZE_SYSTEM_PROMPT, ALTERNATIVES_SYSTEM_PROMPT, GENERATE_SYSTEM_PROMPT


class AIServiceError(Exception):
    def __init__(self, message: str, status: int = 502, retryable: bool = True, public_message: str = ""):
        super().__init__(message)
        self.status = status
        self.retryable = retryable
        self.public_message = public_message or message
        self.classification = "unknown"


async def analyze_product(idea: str, user_content_override: str | None = None) -> dict:
    provider = get_ai_provider()
    user_content = user_content_override.strip() if isinstance(user_content_override, str) and user_content_override.strip() else idea.strip()
    try:
        result = await provider.generate_json(
            system_instruction=ANALYZE_SYSTEM_PROMPT,
            user_content=user_content,
            options={"max_tokens": 900},
        )
        return result
    except Exception as e:
        raise AIServiceError(str(e), status=502, retryable=True, public_message="AI analysis failed. Please try again.") from e


async def get_alternatives(idea: str, decision: dict) -> list:
    provider = get_ai_provider()
    user_content = json.dumps({"idea": idea, "decision": decision})
    try:
        result = await provider.generate_json(
            system_instruction=ALTERNATIVES_SYSTEM_PROMPT,
            user_content=user_content,
        )
        return result.get("alternatives", [])
    except Exception as e:
        raise AIServiceError(str(e), status=502, retryable=True, public_message="Failed to fetch alternatives. Please try again.") from e


async def generate_implementation_prompt(idea: str, analysis: dict, decisions: list) -> str:
    provider = get_ai_provider()
    user_content = json.dumps({"idea": idea, "analysis": analysis, "decisions": decisions})
    try:
        result = await provider.generate_text(
            system_instruction=GENERATE_SYSTEM_PROMPT,
            user_content=user_content,
            options={"max_tokens": 4096},
        )
        return result
    except Exception as e:
        raise AIServiceError(str(e), status=502, retryable=True, public_message="Prompt generation failed. Please try again.") from e
