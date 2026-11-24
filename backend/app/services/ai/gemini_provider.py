"""Gemini provider — mirrors the Node.js config/gemini.js implementation."""
import asyncio
import json
import logging
import random
from google import genai
from google.genai import types
from app.core.config import get_settings

logger = logging.getLogger(__name__)

_DEFAULT_MAX_TOKENS = 4096
_DEFAULT_TEMPERATURE = 0.2
_DEFAULT_TOP_P = 0.8
_MAX_RETRIES = 3
_BASE_BACKOFF_S = 2.0
_CAP_BACKOFF_S = 30.0


def _exp_backoff(attempt: int) -> float:
    cap = min(_BASE_BACKOFF_S * (2 ** (attempt - 1)), _CAP_BACKOFF_S)
    return random.random() * cap


def _is_retryable(e: Exception) -> bool:
    """Heuristic: treat rate-limit / server errors as retryable."""
    msg = str(e).lower()
    return any(k in msg for k in ("quota", "rate", "429", "503", "unavailable", "overload"))


class GeminiProvider:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.gemini_model

    def _make_config(self, opts: dict, json_mode: bool = False) -> types.GenerateContentConfig:
        return types.GenerateContentConfig(
            temperature=opts.get("temperature", _DEFAULT_TEMPERATURE),
            top_p=opts.get("top_p", _DEFAULT_TOP_P),
            max_output_tokens=opts.get("max_tokens", _DEFAULT_MAX_TOKENS),
            response_mime_type="application/json" if json_mode else "text/plain",
            system_instruction=opts.get("_system"),
        )

    async def generate_json(
        self,
        system_instruction: str,
        user_content: str,
        options: dict | None = None,
    ):
        opts = dict(options or {})
        opts["_system"] = system_instruction
        last_err: Exception = RuntimeError("No attempts made.")
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._client.models.generate_content,
                        model=opts.get("model", self._model),
                        contents=user_content,
                        config=self._make_config(opts, json_mode=True),
                    ),
                    timeout=opts.get("timeout_s", 45),
                )
                text = response.text or ""
                return json.loads(text)
            except json.JSONDecodeError as e:
                raise ValueError(f"Gemini returned invalid JSON: {e}") from e
            except Exception as e:
                last_err = e
                if _is_retryable(e) and attempt < _MAX_RETRIES:
                    await asyncio.sleep(_exp_backoff(attempt))
                elif not _is_retryable(e):
                    raise
        raise last_err

    async def generate_text(
        self,
        system_instruction: str,
        user_content: str,
        options: dict | None = None,
    ) -> str:
        opts = dict(options or {})
        opts["_system"] = system_instruction
        last_err: Exception = RuntimeError("No attempts made.")
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._client.models.generate_content,
                        model=opts.get("model", self._model),
                        contents=user_content,
                        config=self._make_config(opts, json_mode=False),
                    ),
                    timeout=opts.get("timeout_s", 45),
                )
                return response.text or ""
            except Exception as e:
                last_err = e
                if _is_retryable(e) and attempt < _MAX_RETRIES:
                    await asyncio.sleep(_exp_backoff(attempt))
                elif not _is_retryable(e):
                    raise
        raise last_err
