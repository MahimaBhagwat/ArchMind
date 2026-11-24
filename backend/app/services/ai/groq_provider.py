"""Groq provider — mirrors the Node.js config/groq.js implementation."""
import asyncio
import json
import logging
import random
from groq import AsyncGroq, APIStatusError, APIConnectionError, APITimeoutError
from app.core.config import get_settings

logger = logging.getLogger(__name__)

_DEFAULT_MAX_TOKENS = 4096
_DEFAULT_TEMPERATURE = 0.2
_DEFAULT_TOP_P = 0.8
_MAX_RETRIES = 3
_BASE_BACKOFF_S = 2.0
_CAP_BACKOFF_S = 30.0


def _exp_backoff(attempt: int) -> float:
    """Full-jitter exponential backoff."""
    cap = min(_BASE_BACKOFF_S * (2 ** (attempt - 1)), _CAP_BACKOFF_S)
    return random.random() * cap


class GroqProvider:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")
        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self._model = settings.groq_model

    async def generate_json(
        self,
        system_instruction: str,
        user_content: str,
        options: dict | None = None,
    ):
        opts = options or {}
        last_err = None
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                response = await asyncio.wait_for(
                    self._client.chat.completions.create(
                        model=opts.get("model", self._model),
                        messages=[
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": user_content},
                        ],
                        temperature=opts.get("temperature", _DEFAULT_TEMPERATURE),
                        top_p=opts.get("top_p", _DEFAULT_TOP_P),
                        max_tokens=opts.get("max_tokens", _DEFAULT_MAX_TOKENS),
                        response_format={"type": "json_object"},
                    ),
                    timeout=opts.get("timeout_s", 45),
                )
                text = response.choices[0].message.content or ""
                return json.loads(text)
            except (APIStatusError, APIConnectionError, APITimeoutError) as e:
                last_err = e
                status = getattr(e, "status_code", 0)
                if status in (400, 401, 403):
                    raise  # Non-retryable
                if attempt < _MAX_RETRIES:
                    await asyncio.sleep(_exp_backoff(attempt))
            except json.JSONDecodeError as e:
                raise ValueError(f"Groq returned invalid JSON: {e}") from e
        raise last_err

    async def generate_text(
        self,
        system_instruction: str,
        user_content: str,
        options: dict | None = None,
    ) -> str:
        opts = options or {}
        last_err = None
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                response = await asyncio.wait_for(
                    self._client.chat.completions.create(
                        model=opts.get("model", self._model),
                        messages=[
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": user_content},
                        ],
                        temperature=opts.get("temperature", _DEFAULT_TEMPERATURE),
                        top_p=opts.get("top_p", _DEFAULT_TOP_P),
                        max_tokens=opts.get("max_tokens", _DEFAULT_MAX_TOKENS),
                    ),
                    timeout=opts.get("timeout_s", 45),
                )
                return response.choices[0].message.content or ""
            except (APIStatusError, APIConnectionError, APITimeoutError) as e:
                last_err = e
                status = getattr(e, "status_code", 0)
                if status in (400, 401, 403):
                    raise
                if attempt < _MAX_RETRIES:
                    await asyncio.sleep(_exp_backoff(attempt))
        raise last_err
