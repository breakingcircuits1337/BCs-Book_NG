"""Async command handlers for music, video, and combined media generation."""

import time
from pathlib import Path
from typing import List, Optional

from loguru import logger
from pydantic import BaseModel
from surreal_commands import CommandInput, CommandOutput, command

from open_notebook.config import DATA_FOLDER
from open_notebook.database.repository import ensure_record_id
from open_notebook.media.models import CombinedMediaJob, MusicJob, VideoJob
from open_notebook.media.router import generate_combined, generate_music, generate_video


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _media_dir(subdir: str, name: str) -> Path:
    path = Path(DATA_FOLDER) / "media" / subdir / name
    path.mkdir(parents=True, exist_ok=True)
    return path


# ---------------------------------------------------------------------------
# Music generation command
# ---------------------------------------------------------------------------


class MusicGenerationInput(CommandInput):
    job_id: str
    prompt: str
    style: Optional[str] = None
    duration: Optional[int] = None
    providers: List[str] = []


class MusicGenerationOutput(CommandOutput):
    success: bool
    job_id: Optional[str] = None
    audio_file: Optional[str] = None
    provider_used: Optional[str] = None
    processing_time: float = 0.0
    error_message: Optional[str] = None


@command("generate_music", app="open_notebook")
async def generate_music_command(
    input_data: MusicGenerationInput,
) -> MusicGenerationOutput:
    start = time.time()
    job: Optional[MusicJob] = None

    try:
        job = await MusicJob.get(input_data.job_id)
        job.status = "running"
        await job.save()

        logger.info(f"[MusicCmd] Starting music generation for job {job.id}")

        result = await generate_music(
            prompt=input_data.prompt,
            style=input_data.style,
            duration=input_data.duration,
            providers=input_data.providers or [],
        )

        # Download and persist audio locally
        out_dir = _media_dir("music", str(job.id).replace(":", "_"))
        audio_path = out_dir / "output.mp3"

        if result.audio_url:
            import httpx

            async with httpx.AsyncClient(timeout=120) as client:
                async with client.stream("GET", result.audio_url) as resp:
                    resp.raise_for_status()
                    with open(audio_path, "wb") as f:
                        async for chunk in resp.aiter_bytes():
                            f.write(chunk)
        elif result.audio_data:
            audio_path.write_bytes(result.audio_data)
        else:
            raise RuntimeError("Provider returned no audio URL or data")

        job.audio_file = str(audio_path)
        job.provider_used = result.provider
        job.metadata = result.metadata
        job.status = "completed"
        await job.save()

        processing_time = time.time() - start
        logger.info(f"[MusicCmd] Completed in {processing_time:.1f}s via {result.provider}")

        return MusicGenerationOutput(
            success=True,
            job_id=str(job.id),
            audio_file=str(audio_path),
            provider_used=result.provider,
            processing_time=processing_time,
        )

    except Exception as exc:
        processing_time = time.time() - start
        logger.error(f"[MusicCmd] Failed: {exc}")
        logger.exception(exc)

        if job:
            job.status = "failed"
            job.error_message = str(exc)
            await job.save()

        return MusicGenerationOutput(
            success=False,
            processing_time=processing_time,
            error_message=str(exc),
        )


# ---------------------------------------------------------------------------
# Video generation command
# ---------------------------------------------------------------------------


class VideoGenerationInput(CommandInput):
    job_id: str
    prompt: str
    style: Optional[str] = None
    duration: Optional[int] = None
    image_url: Optional[str] = None
    providers: List[str] = []


class VideoGenerationOutput(CommandOutput):
    success: bool
    job_id: Optional[str] = None
    video_file: Optional[str] = None
    provider_used: Optional[str] = None
    processing_time: float = 0.0
    error_message: Optional[str] = None


@command("generate_video", app="open_notebook")
async def generate_video_command(
    input_data: VideoGenerationInput,
) -> VideoGenerationOutput:
    start = time.time()
    job: Optional[VideoJob] = None

    try:
        job = await VideoJob.get(input_data.job_id)
        job.status = "running"
        await job.save()

        logger.info(f"[VideoCmd] Starting video generation for job {job.id}")

        result = await generate_video(
            prompt=input_data.prompt,
            style=input_data.style,
            duration=input_data.duration,
            image_url=input_data.image_url,
            providers=input_data.providers or [],
        )

        # Download and persist video locally
        out_dir = _media_dir("video", str(job.id).replace(":", "_"))
        video_path = out_dir / "output.mp4"

        if result.video_url:
            import httpx

            async with httpx.AsyncClient(timeout=300) as client:
                async with client.stream("GET", result.video_url) as resp:
                    resp.raise_for_status()
                    with open(video_path, "wb") as f:
                        async for chunk in resp.aiter_bytes():
                            f.write(chunk)
        elif result.video_data:
            video_path.write_bytes(result.video_data)
        else:
            raise RuntimeError("Provider returned no video URL or data")

        job.video_file = str(video_path)
        job.provider_used = result.provider
        job.metadata = result.metadata
        job.status = "completed"
        await job.save()

        processing_time = time.time() - start
        logger.info(f"[VideoCmd] Completed in {processing_time:.1f}s via {result.provider}")

        return VideoGenerationOutput(
            success=True,
            job_id=str(job.id),
            video_file=str(video_path),
            provider_used=result.provider,
            processing_time=processing_time,
        )

    except Exception as exc:
        processing_time = time.time() - start
        logger.error(f"[VideoCmd] Failed: {exc}")
        logger.exception(exc)

        if job:
            job.status = "failed"
            job.error_message = str(exc)
            await job.save()

        return VideoGenerationOutput(
            success=False,
            processing_time=processing_time,
            error_message=str(exc),
        )


# ---------------------------------------------------------------------------
# Combined (music + video → merged) command
# ---------------------------------------------------------------------------


class CombinedMediaInput(CommandInput):
    combined_job_id: str
    video_prompt: str
    music_prompt: str
    video_style: Optional[str] = None
    music_style: Optional[str] = None
    duration: Optional[int] = None
    image_url: Optional[str] = None
    video_providers: List[str] = []
    music_providers: List[str] = []


class CombinedMediaOutput(CommandOutput):
    success: bool
    combined_job_id: Optional[str] = None
    output_file: Optional[str] = None
    music_provider: Optional[str] = None
    video_provider: Optional[str] = None
    processing_time: float = 0.0
    error_message: Optional[str] = None


@command("generate_combined_media", app="open_notebook")
async def generate_combined_media_command(
    input_data: CombinedMediaInput,
) -> CombinedMediaOutput:
    start = time.time()
    job: Optional[CombinedMediaJob] = None

    try:
        job = await CombinedMediaJob.get(input_data.combined_job_id)
        job.status = "running"
        await job.save()

        logger.info(f"[CombinedCmd] Starting combined generation for job {job.id}")

        out_dir = _media_dir("combined", str(job.id).replace(":", "_"))
        output_path = str(out_dir / "output.mp4")

        result = await generate_combined(
            video_prompt=input_data.video_prompt,
            music_prompt=input_data.music_prompt,
            output_path=output_path,
            video_style=input_data.video_style,
            music_style=input_data.music_style,
            duration=input_data.duration,
            video_providers=input_data.video_providers or [],
            music_providers=input_data.music_providers or [],
            image_url=input_data.image_url,
        )

        job.output_file = result["output_path"]
        job.status = "completed"
        await job.save()

        processing_time = time.time() - start
        logger.info(
            f"[CombinedCmd] Completed in {processing_time:.1f}s "
            f"(music={result['music_provider']}, video={result['video_provider']})"
        )

        return CombinedMediaOutput(
            success=True,
            combined_job_id=str(job.id),
            output_file=result["output_path"],
            music_provider=result["music_provider"],
            video_provider=result["video_provider"],
            processing_time=processing_time,
        )

    except Exception as exc:
        processing_time = time.time() - start
        logger.error(f"[CombinedCmd] Failed: {exc}")
        logger.exception(exc)

        if job:
            job.status = "failed"
            job.error_message = str(exc)
            await job.save()

        return CombinedMediaOutput(
            success=False,
            processing_time=processing_time,
            error_message=str(exc),
        )
