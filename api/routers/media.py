"""REST endpoints for music, video, and combined media generation."""

from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import unquote, urlparse

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from loguru import logger
from pydantic import BaseModel

from api.media_service import (
    CombinedMediaRequest,
    CombinedMediaService,
    MediaJobResponse,
    MusicGenerationRequest,
    MusicService,
    VideoGenerationRequest,
    VideoService,
    get_media_job_status,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class MusicJobResponse(BaseModel):
    id: str
    name: str
    prompt: str
    style: Optional[str] = None
    providers: List[str] = []
    provider_used: Optional[str] = None
    audio_file: Optional[str] = None
    audio_url: Optional[str] = None
    duration: Optional[int] = None
    status: str
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created: Optional[str] = None
    job_status: Optional[str] = None


class VideoJobResponse(BaseModel):
    id: str
    name: str
    prompt: str
    style: Optional[str] = None
    providers: List[str] = []
    provider_used: Optional[str] = None
    video_file: Optional[str] = None
    video_url: Optional[str] = None
    image_url: Optional[str] = None
    duration: Optional[int] = None
    status: str
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created: Optional[str] = None
    job_status: Optional[str] = None


class CombinedJobResponse(BaseModel):
    id: str
    name: str
    output_file: Optional[str] = None
    output_url: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created: Optional[str] = None
    job_status: Optional[str] = None


def _file_url(file_path: str) -> Optional[str]:
    if not file_path:
        return None
    p = Path(file_path) if not file_path.startswith("file://") else Path(
        unquote(urlparse(file_path).path)
    )
    return str(p) if p.exists() else None


# ---------------------------------------------------------------------------
# Music endpoints
# ---------------------------------------------------------------------------


@router.post("/media/music/generate", response_model=MediaJobResponse, tags=["media"])
async def generate_music(request: MusicGenerationRequest):
    """Submit a music generation job. Returns immediately with job ID."""
    job_id = await MusicService.submit_generation_job(request)
    return MediaJobResponse(
        job_id=job_id,
        status="submitted",
        message=f"Music generation started for '{request.name}'",
    )


@router.get("/media/music", response_model=List[MusicJobResponse], tags=["media"])
async def list_music_jobs():
    """List all music generation jobs."""
    jobs = await MusicService.list_jobs()
    results = []
    for job in jobs:
        job_status = await job.get_job_status() if job.command else job.status
        audio_url = None
        if job.audio_file and _file_url(job.audio_file):
            audio_url = f"/api/media/music/{job.id}/audio"
        results.append(
            MusicJobResponse(
                id=str(job.id),
                name=job.name,
                prompt=job.prompt,
                style=job.style,
                providers=job.providers,
                provider_used=job.provider_used,
                audio_file=job.audio_file,
                audio_url=audio_url,
                duration=job.duration,
                status=job.status,
                metadata=job.metadata,
                error_message=job.error_message,
                created=str(job.created) if job.created else None,
                job_status=job_status,
            )
        )
    return results


@router.get("/media/music/{job_id}", response_model=MusicJobResponse, tags=["media"])
async def get_music_job(job_id: str):
    """Get a specific music generation job."""
    job = await MusicService.get_job(job_id)
    job_status = await job.get_job_status() if job.command else job.status
    audio_url = None
    if job.audio_file and _file_url(job.audio_file):
        audio_url = f"/api/media/music/{job.id}/audio"
    return MusicJobResponse(
        id=str(job.id),
        name=job.name,
        prompt=job.prompt,
        style=job.style,
        providers=job.providers,
        provider_used=job.provider_used,
        audio_file=job.audio_file,
        audio_url=audio_url,
        duration=job.duration,
        status=job.status,
        metadata=job.metadata,
        error_message=job.error_message,
        created=str(job.created) if job.created else None,
        job_status=job_status,
    )


@router.get("/media/music/{job_id}/audio", tags=["media"])
async def stream_music_audio(job_id: str):
    """Stream the generated audio file."""
    job = await MusicService.get_job(job_id)
    if not job.audio_file:
        raise HTTPException(status_code=404, detail="No audio file for this job")
    audio_path = Path(job.audio_file)
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found on disk")
    return FileResponse(audio_path, media_type="audio/mpeg", filename=audio_path.name)


@router.delete("/media/music/{job_id}", tags=["media"])
async def delete_music_job(job_id: str):
    """Delete a music generation job and its audio file."""
    await MusicService.delete_job(job_id)
    return {"message": "Music job deleted", "job_id": job_id}


# ---------------------------------------------------------------------------
# Video endpoints
# ---------------------------------------------------------------------------


@router.post("/media/video/generate", response_model=MediaJobResponse, tags=["media"])
async def generate_video(request: VideoGenerationRequest):
    """Submit a video generation job. Returns immediately with job ID."""
    job_id = await VideoService.submit_generation_job(request)
    return MediaJobResponse(
        job_id=job_id,
        status="submitted",
        message=f"Video generation started for '{request.name}'",
    )


@router.get("/media/video", response_model=List[VideoJobResponse], tags=["media"])
async def list_video_jobs():
    """List all video generation jobs."""
    jobs = await VideoService.list_jobs()
    results = []
    for job in jobs:
        job_status = await job.get_job_status() if job.command else job.status
        video_url = None
        if job.video_file and _file_url(job.video_file):
            video_url = f"/api/media/video/{job.id}/stream"
        results.append(
            VideoJobResponse(
                id=str(job.id),
                name=job.name,
                prompt=job.prompt,
                style=job.style,
                providers=job.providers,
                provider_used=job.provider_used,
                video_file=job.video_file,
                video_url=video_url,
                image_url=job.image_url,
                duration=job.duration,
                status=job.status,
                metadata=job.metadata,
                error_message=job.error_message,
                created=str(job.created) if job.created else None,
                job_status=job_status,
            )
        )
    return results


@router.get("/media/video/{job_id}", response_model=VideoJobResponse, tags=["media"])
async def get_video_job(job_id: str):
    """Get a specific video generation job."""
    job = await VideoService.get_job(job_id)
    job_status = await job.get_job_status() if job.command else job.status
    video_url = None
    if job.video_file and _file_url(job.video_file):
        video_url = f"/api/media/video/{job.id}/stream"
    return VideoJobResponse(
        id=str(job.id),
        name=job.name,
        prompt=job.prompt,
        style=job.style,
        providers=job.providers,
        provider_used=job.provider_used,
        video_file=job.video_file,
        video_url=video_url,
        image_url=job.image_url,
        duration=job.duration,
        status=job.status,
        metadata=job.metadata,
        error_message=job.error_message,
        created=str(job.created) if job.created else None,
        job_status=job_status,
    )


@router.get("/media/video/{job_id}/stream", tags=["media"])
async def stream_video(job_id: str):
    """Stream the generated video file."""
    job = await VideoService.get_job(job_id)
    if not job.video_file:
        raise HTTPException(status_code=404, detail="No video file for this job")
    video_path = Path(job.video_file)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on disk")
    return FileResponse(video_path, media_type="video/mp4", filename=video_path.name)


@router.delete("/media/video/{job_id}", tags=["media"])
async def delete_video_job(job_id: str):
    """Delete a video generation job and its video file."""
    await VideoService.delete_job(job_id)
    return {"message": "Video job deleted", "job_id": job_id}


# ---------------------------------------------------------------------------
# Combined endpoints
# ---------------------------------------------------------------------------


@router.post("/media/combined/generate", response_model=MediaJobResponse, tags=["media"])
async def generate_combined(request: CombinedMediaRequest):
    """Submit a combined music+video generation job.
    Generates music and video concurrently, then merges them via ffmpeg.
    Returns immediately with job ID.
    """
    job_id = await CombinedMediaService.submit_generation_job(request)
    return MediaJobResponse(
        job_id=job_id,
        status="submitted",
        message=f"Combined media generation started for '{request.name}'",
    )


@router.get("/media/combined", response_model=List[CombinedJobResponse], tags=["media"])
async def list_combined_jobs():
    """List all combined media generation jobs."""
    jobs = await CombinedMediaService.list_jobs()
    results = []
    for job in jobs:
        job_status = await job.get_job_status() if job.command else job.status
        output_url = None
        if job.output_file and _file_url(job.output_file):
            output_url = f"/api/media/combined/{job.id}/stream"
        results.append(
            CombinedJobResponse(
                id=str(job.id),
                name=job.name,
                output_file=job.output_file,
                output_url=output_url,
                status=job.status,
                error_message=job.error_message,
                created=str(job.created) if job.created else None,
                job_status=job_status,
            )
        )
    return results


@router.get("/media/combined/{job_id}", response_model=CombinedJobResponse, tags=["media"])
async def get_combined_job(job_id: str):
    """Get a specific combined media generation job."""
    job = await CombinedMediaService.get_job(job_id)
    job_status = await job.get_job_status() if job.command else job.status
    output_url = None
    if job.output_file and _file_url(job.output_file):
        output_url = f"/api/media/combined/{job.id}/stream"
    return CombinedJobResponse(
        id=str(job.id),
        name=job.name,
        output_file=job.output_file,
        output_url=output_url,
        status=job.status,
        error_message=job.error_message,
        created=str(job.created) if job.created else None,
        job_status=job_status,
    )


@router.get("/media/combined/{job_id}/stream", tags=["media"])
async def stream_combined_video(job_id: str):
    """Stream the merged video+music file."""
    job = await CombinedMediaService.get_job(job_id)
    if not job.output_file:
        raise HTTPException(status_code=404, detail="No output file for this job")
    output_path = Path(job.output_file)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Output file not found on disk")
    return FileResponse(output_path, media_type="video/mp4", filename=output_path.name)


@router.delete("/media/combined/{job_id}", tags=["media"])
async def delete_combined_job(job_id: str):
    """Delete a combined media job and its output file."""
    await CombinedMediaService.delete_job(job_id)
    return {"message": "Combined media job deleted", "job_id": job_id}


# ---------------------------------------------------------------------------
# Provider availability endpoint
# ---------------------------------------------------------------------------


@router.get("/media/providers", tags=["media"])
async def list_media_providers():
    """Return which music and video providers are currently configured."""
    from open_notebook.media.providers import PikaProvider, RunwayProvider, SunoProvider, UdioProvider

    return {
        "music": [
            {"name": "suno", "available": SunoProvider().is_available(), "best_for": "vocals, songs with lyrics, pop, rock, hip-hop"},
            {"name": "udio", "available": UdioProvider().is_available(), "best_for": "instrumental, ambient, cinematic, classical, jazz"},
        ],
        "video": [
            {"name": "runway", "available": RunwayProvider().is_available(), "best_for": "cinematic, photorealistic, nature, product"},
            {"name": "pika", "available": PikaProvider().is_available(), "best_for": "animated, cartoon, stylized, abstract, anime"},
        ],
        "combined": {
            "description": "Generates music and video concurrently then merges via ffmpeg",
            "requires_ffmpeg": True,
        },
    }
