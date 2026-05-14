"""Service layer for music, video, and combined media generation."""

from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from loguru import logger
from pydantic import BaseModel
from surreal_commands import get_command_status, submit_command

from open_notebook.media.models import CombinedMediaJob, MusicJob, VideoJob


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class MusicGenerationRequest(BaseModel):
    name: str
    prompt: str
    style: Optional[str] = None
    duration: Optional[int] = None
    providers: List[str] = []


class VideoGenerationRequest(BaseModel):
    name: str
    prompt: str
    style: Optional[str] = None
    duration: Optional[int] = None
    image_url: Optional[str] = None
    providers: List[str] = []


class CombinedMediaRequest(BaseModel):
    name: str
    video_prompt: str
    music_prompt: str
    video_style: Optional[str] = None
    music_style: Optional[str] = None
    duration: Optional[int] = None
    image_url: Optional[str] = None
    video_providers: List[str] = []
    music_providers: List[str] = []


class MediaJobResponse(BaseModel):
    job_id: str
    status: str
    message: str


# ---------------------------------------------------------------------------
# Music service
# ---------------------------------------------------------------------------


class MusicService:
    @staticmethod
    async def submit_generation_job(req: MusicGenerationRequest) -> str:
        try:
            job = MusicJob(
                name=req.name,
                prompt=req.prompt,
                style=req.style,
                duration=req.duration,
                providers=req.providers,
                status="pending",
            )
            await job.save()

            try:
                import commands.media_commands  # noqa: F401
            except ImportError as e:
                raise ValueError(f"Media commands not available: {e}")

            job_id_str = str(job.id)
            command_id = submit_command(
                "open_notebook",
                "generate_music",
                {
                    "job_id": job_id_str,
                    "prompt": req.prompt,
                    "style": req.style,
                    "duration": req.duration,
                    "providers": req.providers,
                },
            )
            if not command_id:
                raise ValueError("submit_command returned no command ID")

            job.command = str(command_id)
            await job.save()

            logger.info(f"Submitted music job {job_id_str}, command={command_id}")
            return job_id_str

        except Exception as exc:
            logger.error(f"Failed to submit music job: {exc}")
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    async def get_job(job_id: str) -> MusicJob:
        try:
            return await MusicJob.get(job_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail=f"Music job not found: {exc}")

    @staticmethod
    async def list_jobs() -> List[MusicJob]:
        try:
            return await MusicJob.get_all(order_by="created desc")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    async def delete_job(job_id: str) -> None:
        try:
            job = await MusicJob.get(job_id)
            if job.audio_file:
                from pathlib import Path
                p = Path(job.audio_file)
                if p.exists():
                    p.unlink()
            await job.delete()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Video service
# ---------------------------------------------------------------------------


class VideoService:
    @staticmethod
    async def submit_generation_job(req: VideoGenerationRequest) -> str:
        try:
            job = VideoJob(
                name=req.name,
                prompt=req.prompt,
                style=req.style,
                duration=req.duration,
                image_url=req.image_url,
                providers=req.providers,
                status="pending",
            )
            await job.save()

            try:
                import commands.media_commands  # noqa: F401
            except ImportError as e:
                raise ValueError(f"Media commands not available: {e}")

            job_id_str = str(job.id)
            command_id = submit_command(
                "open_notebook",
                "generate_video",
                {
                    "job_id": job_id_str,
                    "prompt": req.prompt,
                    "style": req.style,
                    "duration": req.duration,
                    "image_url": req.image_url,
                    "providers": req.providers,
                },
            )
            if not command_id:
                raise ValueError("submit_command returned no command ID")

            job.command = str(command_id)
            await job.save()

            logger.info(f"Submitted video job {job_id_str}, command={command_id}")
            return job_id_str

        except Exception as exc:
            logger.error(f"Failed to submit video job: {exc}")
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    async def get_job(job_id: str) -> VideoJob:
        try:
            return await VideoJob.get(job_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail=f"Video job not found: {exc}")

    @staticmethod
    async def list_jobs() -> List[VideoJob]:
        try:
            return await VideoJob.get_all(order_by="created desc")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    async def delete_job(job_id: str) -> None:
        try:
            job = await VideoJob.get(job_id)
            if job.video_file:
                from pathlib import Path
                p = Path(job.video_file)
                if p.exists():
                    p.unlink()
            await job.delete()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Combined media service
# ---------------------------------------------------------------------------


class CombinedMediaService:
    @staticmethod
    async def submit_generation_job(req: CombinedMediaRequest) -> str:
        try:
            job = CombinedMediaJob(name=req.name, status="pending")
            await job.save()

            try:
                import commands.media_commands  # noqa: F401
            except ImportError as e:
                raise ValueError(f"Media commands not available: {e}")

            job_id_str = str(job.id)
            command_id = submit_command(
                "open_notebook",
                "generate_combined_media",
                {
                    "combined_job_id": job_id_str,
                    "video_prompt": req.video_prompt,
                    "music_prompt": req.music_prompt,
                    "video_style": req.video_style,
                    "music_style": req.music_style,
                    "duration": req.duration,
                    "image_url": req.image_url,
                    "video_providers": req.video_providers,
                    "music_providers": req.music_providers,
                },
            )
            if not command_id:
                raise ValueError("submit_command returned no command ID")

            job.command = str(command_id)
            await job.save()

            logger.info(f"Submitted combined media job {job_id_str}, command={command_id}")
            return job_id_str

        except Exception as exc:
            logger.error(f"Failed to submit combined media job: {exc}")
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    async def get_job(job_id: str) -> CombinedMediaJob:
        try:
            return await CombinedMediaJob.get(job_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail=f"Combined job not found: {exc}")

    @staticmethod
    async def list_jobs() -> List[CombinedMediaJob]:
        try:
            return await CombinedMediaJob.get_all(order_by="created desc")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @staticmethod
    async def delete_job(job_id: str) -> None:
        try:
            job = await CombinedMediaJob.get(job_id)
            if job.output_file:
                from pathlib import Path
                p = Path(job.output_file)
                if p.exists():
                    p.unlink()
            await job.delete()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Job status helper (shared across all media types)
# ---------------------------------------------------------------------------


async def get_media_job_status(command_id: str) -> Dict[str, Any]:
    try:
        status = await get_command_status(command_id)
        return {
            "command_id": command_id,
            "status": status.status if status else "unknown",
            "result": status.result if status else None,
            "error_message": getattr(status, "error_message", None) if status else None,
            "created": str(status.created) if status and getattr(status, "created", None) else None,
            "updated": str(status.updated) if status and getattr(status, "updated", None) else None,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {exc}")
