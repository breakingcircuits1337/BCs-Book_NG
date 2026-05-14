"""Suno music generation provider.

API key: set SUNO_API_KEY in your environment.
Suno generates full songs (vocals + instruments) from text prompts.
Best for: songs with lyrics, pop, rock, hip-hop, full productions.

Official API docs: https://docs.suno.com
"""

import os
from typing import Optional

import httpx
from loguru import logger

from open_notebook.media.providers.base import MusicProvider, MusicResult


class SunoProvider(MusicProvider):
    name = "suno"

    _BASE_URL = "https://api.suno.com/v1"
    # Poll interval and max wait for async generation
    _POLL_INTERVAL = 5
    _MAX_POLLS = 60  # 5 min total

    def is_available(self) -> bool:
        return bool(os.getenv("SUNO_API_KEY"))

    def preferred_styles(self):
        return ["vocals", "song", "lyrics", "pop", "rock", "hip-hop", "r&b", "country"]

    async def generate(
        self,
        prompt: str,
        style: Optional[str] = None,
        duration: Optional[int] = None,
        **kwargs,
    ) -> MusicResult:
        api_key = os.getenv("SUNO_API_KEY")
        if not api_key:
            raise RuntimeError("SUNO_API_KEY is not set")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload: dict = {"prompt": prompt, "make_instrumental": False}
        if style:
            payload["tags"] = style
        if duration:
            payload["duration"] = duration

        logger.info(f"[Suno] Submitting music generation: {prompt[:80]!r}")

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._BASE_URL}/generate", headers=headers, json=payload
            )
            resp.raise_for_status()
            data = resp.json()

        # Suno returns a list of clips; take the first
        clips = data if isinstance(data, list) else data.get("clips", [data])
        if not clips:
            raise RuntimeError("Suno returned no clips")

        clip = clips[0]
        clip_id = clip.get("id")

        # Poll until audio_url is ready
        audio_url = clip.get("audio_url")
        if not audio_url and clip_id:
            audio_url = await self._poll_for_audio(clip_id, headers)

        logger.info(f"[Suno] Generation complete. clip_id={clip_id}")

        return MusicResult(
            provider=self.name,
            audio_url=audio_url,
            title=clip.get("title") or clip.get("display_name"),
            duration=clip.get("duration"),
            metadata={
                "clip_id": clip_id,
                "tags": clip.get("tags"),
                "model": clip.get("model_name"),
            },
        )

    async def _poll_for_audio(self, clip_id: str, headers: dict) -> Optional[str]:
        import asyncio

        async with httpx.AsyncClient(timeout=30) as client:
            for _ in range(self._MAX_POLLS):
                await asyncio.sleep(self._POLL_INTERVAL)
                resp = await client.get(
                    f"{self._BASE_URL}/clip/{clip_id}", headers=headers
                )
                resp.raise_for_status()
                clip = resp.json()
                status = clip.get("status", "")
                if status == "complete":
                    return clip.get("audio_url")
                if status in ("error", "failed"):
                    raise RuntimeError(f"Suno clip {clip_id} failed: {clip}")
                logger.debug(f"[Suno] clip {clip_id} status={status}, polling…")

        raise RuntimeError(f"Suno clip {clip_id} did not complete within timeout")
