"""Base protocol for AI providers."""
from typing import Any, Protocol


class AIProvider(Protocol):
    async def generate_json(
        self,
        system_instruction: str,
        user_content: str,
        options: dict | None = None,
    ) -> Any:
        ...

    async def generate_text(
        self,
        system_instruction: str,
        user_content: str,
        options: dict | None = None,
    ) -> str:
        ...
