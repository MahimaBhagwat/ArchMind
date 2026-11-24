"""Pluggable AI provider selector — mirrors config/aiProvider.js."""
from functools import lru_cache
from app.core.config import get_settings


@lru_cache()
def get_ai_provider():
    """Return a cached AI provider instance based on AI_PROVIDER env var."""
    settings = get_settings()
    provider_name = settings.ai_provider.lower()
    if provider_name == "gemini":
        from app.services.ai.gemini_provider import GeminiProvider
        return GeminiProvider()
    # Default: Groq
    from app.services.ai.groq_provider import GroqProvider
    return GroqProvider()
