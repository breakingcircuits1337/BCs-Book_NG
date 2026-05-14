"""Udio music generation provider.

API key: set UDIO_API_KEY in your environment.
Udio excels at high-quality instrumental and ambient compositions.
Best for: instrumental, background music, cinematic scores, ambient, jazz, classical.

Official API docs: https://www.udio.com/api-docs
"""

import asyncio
import os
from typing import Optional

import httpx
from loguru import logger

from open_notebook.media.providers.base import MusicProvider, MusicResult


class UdioProvider(MusicProvider):
    name = "udio"

    _BASE_URL = "https://www.udio.com/api/v1"
    _POLL_INTERVAL = 5
    _MAX_POLLS = 60  # 5 min total

    def is_available(self) -> bool:
        return bool(os.getenv("UDIO_API_KEY"))

    def preferred_styles(self):
        return [
            "instrumental",
            "ambient",
            "cinematic",
            "classical",
            "jazz",
            "background",
            "lofi",
            "orchestral",
        ]

    async def generate(
        self,
        prompt: str,
        style: Optional[str] = None,
        duration: Optional[int] = None,
        **kwargs,
    ) -> MusicResult:
        api_key = os.getenv("UDIO_API_KEY")
        if not api_key:
            raise RuntimeError("UDIO_API_KEY is not set")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        full_prompt = prompt
        if style:
            full_prompt = f"{style}: {prompt}"

        payload: dict = {"prompt": full_prompt}
        if duration:
            payload["duration"] = duration

        logger.info(f"[Udio] Submitting music generation: {full_prompt[:80]!r}")

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._BASE_URL}/generate/music", headers=headers, json=payload
            )
            resp.raise_for_status()
            data = resp.json()

        job_id = data.get("id") or data.get("job_id")
        if not job_id:
            raise RuntimeError(f"Udio did not return a job ID: {data}")

        # Poll until complete
        audio_url, metadata = await self._poll_for_result(job_id, headers)

        logger.info(f"[Udio] Generation complete. job_id={job_id}")

        return MusicResult(
            provider=self.name,
            audio_url=audio_url,
            title=metadata.get("title"),
            duration=metadata.get("duration"),
            metadata={"job_id": job_id, **metadata},
        )

    async def _poll_for_result(
        self, job_id: str, headers: dict
    ) -> tuple[Optional[str], dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            for _ in range(self._MAX_POLLS):
                await asyncio.sleep(self._POLL_INTERVAL)
                resp = await client.get(
                    f"{self._BASE_URL}/jobs/{job_id}", headers=headers
                )
                resp.raise_for_status()
                job = resp.json()
                status = job.get("status", "")
                if status in ("complete", "completed", "success"):
                    tracks = job.get("tracks") or job.get("songs") or []
                    if tracks:
                        track = tracks[0]
                        return track.get("audio_url") or track.get("url"), track
                    return job.get("audio_url"), job
                if status in ("error", "failed"):
                    raise RuntimeError(f"Udio job {job_id} failed: {job}")
                logger.debug(f"[Udio] job {job_id} status={status}, polling…")

        raise RuntimeError(f"Udio job {job_id} did not complete within timeout")
