"""RunwayML video generation provider.

API key: set RUNWAY_API_KEY in your environment.
RunwayML Gen-3 Alpha produces high-quality cinematic and photorealistic video.
Best for: cinematic, photorealistic, nature, product, storytelling videos.

Official SDK: pip install runwayml
Official API docs: https://docs.runwayml.com
"""

import asyncio
import os
from typing import Optional

from loguru import logger

from open_notebook.media.providers.base import VideoProvider, VideoResult


class RunwayProvider(VideoProvider):
    name = "runway"

    # Default model; Gen-3 Alpha Turbo is faster, Gen-3 Alpha is higher quality
    _DEFAULT_MODEL = "gen3a_turbo"
    _POLL_INTERVAL = 10
    _MAX_POLLS = 60  # 10 min total

    def is_available(self) -> bool:
        return bool(os.getenv("RUNWAY_API_KEY"))

    def preferred_styles(self):
        return [
            "cinematic",
            "photorealistic",
            "realistic",
            "nature",
            "product",
            "live-action",
            "documentary",
        ]

    async def generate(
        self,
        prompt: str,
        style: Optional[str] = None,
        duration: Optional[int] = None,
        image_url: Optional[str] = None,
        **kwargs,
    ) -> VideoResult:
        try:
            import runwayml
        except ImportError:
            raise RuntimeError(
                "runwayml package is required: pip install runwayml"
            )

        api_key = os.getenv("RUNWAY_API_KEY")
        if not api_key:
            raise RuntimeError("RUNWAY_API_KEY is not set")

        client = runwayml.AsyncRunwayML(api_key=api_key)

        full_prompt = prompt
        if style:
            full_prompt = f"{style} style: {prompt}"

        duration_sec = min(duration or 10, 10)  # Gen-3 max is 10s per clip

        logger.info(f"[RunwayML] Submitting video generation: {full_prompt[:80]!r}")

        if image_url:
            # Image-to-video
            task = await client.image_to_video.create(
                model=self._DEFAULT_MODEL,
                prompt_image=image_url,
                prompt_text=full_prompt,
                duration=duration_sec,
            )
        else:
            # Text-to-video
            task = await client.text_to_video.create(
                model=self._DEFAULT_MODEL,
                prompt_text=full_prompt,
                duration=duration_sec,
            )

        task_id = task.id
        logger.info(f"[RunwayML] Task submitted: {task_id}")

        video_url = await self._poll_for_result(client, task_id)

        logger.info(f"[RunwayML] Generation complete. task_id={task_id}")

        return VideoResult(
            provider=self.name,
            video_url=video_url,
            duration=float(duration_sec),
            metadata={"task_id": task_id, "model": self._DEFAULT_MODEL},
        )

    async def _poll_for_result(self, client, task_id: str) -> str:
        for _ in range(self._MAX_POLLS):
            await asyncio.sleep(self._POLL_INTERVAL)
            task = await client.tasks.retrieve(task_id)
            status = task.status
            if status == "SUCCEEDED":
                outputs = task.output or []
                if outputs:
                    return outputs[0]
                raise RuntimeError(f"RunwayML task {task_id} succeeded but no output")
            if status in ("FAILED", "CANCELLED"):
                raise RuntimeError(
                    f"RunwayML task {task_id} ended with status {status}: {task.failure}"
                )
            logger.debug(f"[RunwayML] task {task_id} status={status}, polling…")

        raise RuntimeError(f"RunwayML task {task_id} did not complete within timeout")
