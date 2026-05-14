"""Abstract base classes for music and video generation providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class MusicResult:
    provider: str
    audio_url: Optional[str] = None
    audio_data: Optional[bytes] = None
    title: Optional[str] = None
    duration: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoResult:
    provider: str
    video_url: Optional[str] = None
    video_data: Optional[bytes] = None
    duration: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class MusicProvider(ABC):
    """Abstract interface for music generation providers."""

    name: str = ""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        style: Optional[str] = None,
        duration: Optional[int] = None,
        **kwargs,
    ) -> MusicResult:
        """Generate music from a text prompt. Returns MusicResult."""

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the provider API key is configured."""

    def preferred_styles(self) -> List[str]:
        """Return the style keywords this provider handles best."""
        return []


class VideoProvider(ABC):
    """Abstract interface for video generation providers."""

    name: str = ""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        style: Optional[str] = None,
        duration: Optional[int] = None,
        image_url: Optional[str] = None,
        **kwargs,
    ) -> VideoResult:
        """Generate video from a text prompt. Returns VideoResult."""

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the provider API key is configured."""

    def preferred_styles(self) -> List[str]:
        """Return the style keywords this provider handles best."""
        return []
