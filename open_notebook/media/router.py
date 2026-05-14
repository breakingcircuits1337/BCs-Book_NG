"""Smart media generation router.

Routes music/video generation requests to the best available provider based on:
- Explicit provider preference in the request
- Style keywords matched to each provider's strengths
- Provider availability (API key configured)

Combined output: merges a music file and video file using ffmpeg.
"""

import asyncio
import os
import tempfile
from pathlib import Path
from typing import List, Optional

import httpx
from loguru import logger

from open_notebook.media.providers.base import MusicProvider, MusicResult, VideoProvider, VideoResult
from open_notebook.media.providers.pika import PikaProvider
from open_notebook.media.providers.runway import RunwayProvider
from open_notebook.media.providers.suno import SunoProvider
from open_notebook.media.providers.udio import UdioProvider

_MUSIC_PROVIDERS: List[MusicProvider] = [SunoProvider(), UdioProvider()]
_VIDEO_PROVIDERS: List[VideoProvider] = [RunwayProvider(), PikaProvider()]

# Style → preferred provider name (first match wins)
_MUSIC_STYLE_AFFINITY = {
    "suno": ["vocals", "song", "lyrics", "pop", "rock", "hip-hop", "r&b", "country", "rap"],
    "udio": ["instrumental", "ambient", "cinematic", "classical", "jazz", "background", "lofi", "orchestral"],
}

_VIDEO_STYLE_AFFINITY = {
    "runway": ["cinematic", "photorealistic", "realistic", "nature", "product", "live-action", "documentary"],
    "pika": ["animated", "cartoon", "stylized", "abstract", "anime", "illustration", "creative", "artistic"],
}


def _pick_music_provider(
    requested: List[str], style: Optional[str]
) -> List[MusicProvider]:
    """Return ordered list of providers to try for music generation."""
    available = {p.name: p for p in _MUSIC_PROVIDERS if p.is_available()}
    if not available:
        raise RuntimeError(
            "No music generation providers are configured. "
            "Set SUNO_API_KEY and/or UDIO_API_KEY."
        )

    if requested:
        ordered = [available[n] for n in requested if n in available]
        if ordered:
            return ordered
        raise RuntimeError(
            f"Requested providers {requested} are not available. "
            f"Available: {list(available)}"
        )

    if style:
        style_lower = style.lower()
        for provider_name, keywords in _MUSIC_STYLE_AFFINITY.items():
            if provider_name in available and any(kw in style_lower for kw in keywords):
                return [available[provider_name]]

    return list(available.values())


def _pick_video_provider(
    requested: List[str], style: Optional[str]
) -> List[VideoProvider]:
    """Return ordered list of providers to try for video generation."""
    available = {p.name: p for p in _VIDEO_PROVIDERS if p.is_available()}
    if not available:
        raise RuntimeError(
            "No video generation providers are configured. "
            "Set RUNWAY_API_KEY and/or PIKA_API_KEY."
        )

    if requested:
        ordered = [available[n] for n in requested if n in available]
        if ordered:
            return ordered
        raise RuntimeError(
            f"Requested providers {requested} are not available. "
            f"Available: {list(available)}"
        )

    if style:
        style_lower = style.lower()
        for provider_name, keywords in _VIDEO_STYLE_AFFINITY.items():
            if provider_name in available and any(kw in style_lower for kw in keywords):
                return [available[provider_name]]

    return list(available.values())


async def generate_music(
    prompt: str,
    style: Optional[str] = None,
    duration: Optional[int] = None,
    providers: Optional[List[str]] = None,
) -> MusicResult:
    """Route and execute music generation. Tries providers in order until one succeeds."""
    candidates = _pick_music_provider(providers or [], style)
    last_error: Optional[Exception] = None

    for provider in candidates:
        try:
            logger.info(f"[MediaRouter] Trying music provider: {provider.name}")
            result = await provider.generate(
                prompt=prompt, style=style, duration=duration
            )
            logger.info(f"[MediaRouter] Music generated via {provider.name}")
            return result
        except Exception as exc:
            logger.warning(f"[MediaRouter] {provider.name} failed: {exc}")
            last_error = exc

    raise RuntimeError(
        f"All music providers failed. Last error: {last_error}"
    )


async def generate_video(
    prompt: str,
    style: Optional[str] = None,
    duration: Optional[int] = None,
    image_url: Optional[str] = None,
    providers: Optional[List[str]] = None,
) -> VideoResult:
    """Route and execute video generation. Tries providers in order until one succeeds."""
    candidates = _pick_video_provider(providers or [], style)
    last_error: Optional[Exception] = None

    for provider in candidates:
        try:
            logger.info(f"[MediaRouter] Trying video provider: {provider.name}")
            result = await provider.generate(
                prompt=prompt, style=style, duration=duration, image_url=image_url
            )
            logger.info(f"[MediaRouter] Video generated via {provider.name}")
            return result
        except Exception as exc:
            logger.warning(f"[MediaRouter] {provider.name} failed: {exc}")
            last_error = exc

    raise RuntimeError(
        f"All video providers failed. Last error: {last_error}"
    )


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


async def merge_music_and_video(
    video_path: str,
    audio_path: str,
    output_path: str,
) -> str:
    """Overlay audio onto video using ffmpeg. Returns output_path on success.

    ffmpeg must be installed in the runtime environment.
    The audio is mixed at its natural volume; video audio track (if any) is replaced.
    If the audio is shorter than the video, it loops. If longer, it is truncated.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", audio_path,
        "-map", "0:v:0",       # video stream from first input
        "-map", "1:a:0",       # audio stream from second input
        "-c:v", "copy",        # copy video without re-encoding
        "-c:a", "aac",         # encode audio as AAC
        "-shortest",           # stop at the shorter stream
        output_path,
    ]

    logger.info(f"[MediaRouter] Merging video+audio → {output_path}")
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(
            f"ffmpeg merge failed (code {proc.returncode}): {stderr.decode()[-500:]}"
        )

    logger.info(f"[MediaRouter] Merge complete: {output_path}")
    return output_path


async def generate_combined(
    video_prompt: str,
    music_prompt: str,
    output_path: str,
    video_style: Optional[str] = None,
    music_style: Optional[str] = None,
    duration: Optional[int] = None,
    video_providers: Optional[List[str]] = None,
    music_providers: Optional[List[str]] = None,
    image_url: Optional[str] = None,
) -> dict:
    """Generate music and video concurrently, then merge them into one file.

    Returns a dict with keys: video_url, audio_url, output_path, video_provider, music_provider.
    """
    music_task = asyncio.create_task(
        generate_music(
            prompt=music_prompt,
            style=music_style,
            duration=duration,
            providers=music_providers,
        )
    )
    video_task = asyncio.create_task(
        generate_video(
            prompt=video_prompt,
            style=video_style,
            duration=duration,
            image_url=image_url,
            providers=video_providers,
        )
    )

    music_result, video_result = await asyncio.gather(music_task, video_task)

    # Download both files to temp locations for ffmpeg
    with tempfile.TemporaryDirectory() as tmp:
        audio_tmp = os.path.join(tmp, "audio.mp3")
        video_tmp = os.path.join(tmp, "video.mp4")

        audio_bytes, video_bytes = await asyncio.gather(
            _download(music_result.audio_url),
            _download(video_result.video_url),
        )

        Path(audio_tmp).write_bytes(audio_bytes)
        Path(video_tmp).write_bytes(video_bytes)

        await merge_music_and_video(video_tmp, audio_tmp, output_path)

    return {
        "audio_url": music_result.audio_url,
        "video_url": video_result.video_url,
        "output_path": output_path,
        "music_provider": music_result.provider,
        "video_provider": video_result.provider,
        "music_metadata": music_result.metadata,
        "video_metadata": video_result.metadata,
    }
