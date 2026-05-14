"""Pika video generation provider.

API key: set PIKA_API_KEY in your environment.
Pika excels at animated, stylized, and creative video generation.
Best for: animated, cartoon, stylized, abstract, creative, short-form content.

Official API docs: https://pika.art/api-docs
"""

import asyncio
import os
from typing import Optional

import httpx
from loguru import logger

from open_notebook.media.providers.base import VideoProvider, VideoResult


class PikaProvider(VideoProvider):
    name = "pika"

    _BASE_URL = "https://api.pika.art/v1"
    _POLL_INTERVAL = 8
    _MAX_POLLS = 75  # ~10 min total

    def is_available(self) -> bool:
        return bool(os.getenv("PIKA_API_KEY"))

    def preferred_styles(self):
        return [
            "animated",
            "cartoon",
            "stylized",
            "abstract",
            "anime",
            "illustration",
            "creative",
            "artistic",
        ]

    async def generate(
        self,
        prompt: str,
        style: Optional[str] = None,
        duration: Optional[int] = None,
        image_url: Optional[str] = None,
        **kwargs,
    ) -> VideoResult:
        api_key = os.getenv("PIKA_API_KEY")
        if not api_key:
            raise RuntimeError("PIKA_API_KEY is not set")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        full_prompt = prompt
        if style:
            full_prompt = f"{style} style: {prompt}"

        payload: dict = {
            "prompt": full_prompt,
            "options": {},
        }
        if duration:
            payload["options"]["duration"] = min(duration, 15)  # Pika cap
        if image_url:
            payload["image"] = image_url

        logger.info(f"[Pika] Submitting video generation: {full_prompt[:80]!r}")

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._BASE_URL}/generate", headers=headers, json=payload
            )
            resp.raise_for_status()
            data = resp.json()

        job_id = data.get("id") or data.get("jobId") or data.get("job_id")
        if not job_id:
            raise RuntimeError(f"Pika did not return a job ID: {data}")

        logger.info(f"[Pika] Job submitted: {job_id}")

        video_url, meta = await self._poll_for_result(job_id, headers)

        logger.info(f"[Pika] Generation complete. job_id={job_id}")

        return VideoResult(
            provider=self.name,
            video_url=video_url,
            duration=meta.get("duration"),
            metadata={"job_id": job_id, **meta},
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
                status = (job.get("status") or "").lower()
                if status in ("complete", "completed", "success", "finished"):
                    videos = job.get("videos") or job.get("result") or []
                    if isinstance(videos, list) and videos:
                        v = videos[0]
                        url = v.get("url") or v.get("video_url") if isinstance(v, dict) else v
                    else:
                        url = job.get("video_url") or job.get("url")
                    return url, job
                if status in ("error", "failed", "cancelled"):
                    raise RuntimeError(f"Pika job {job_id} failed: {job}")
                logger.debug(f"[Pika] job {job_id} status={status}, polling…")

        raise RuntimeError(f"Pika job {job_id} did not complete within timeout")
