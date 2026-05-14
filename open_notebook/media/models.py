from typing import Any, ClassVar, Dict, List, Optional, Union

from pydantic import ConfigDict, Field, field_validator
from surrealdb import RecordID

from open_notebook.database.repository import ensure_record_id
from open_notebook.domain.base import ObjectModel


class MusicJob(ObjectModel):
    """A music generation job tracking request, provider, and output."""

    table_name: ClassVar[str] = "music_job"

    name: str = Field(..., description="Descriptive job name")
    prompt: str = Field(..., description="Text prompt describing the desired music")
    style: Optional[str] = Field(
        None, description="Style hint: vocals, instrumental, ambient, cinematic, etc."
    )
    providers: List[str] = Field(
        default_factory=list,
        description="Requested providers (suno, udio). Empty = smart-routed.",
    )
    provider_used: Optional[str] = Field(
        None, description="Provider that actually generated the music"
    )
    audio_file: Optional[str] = Field(None, description="Local path to generated audio")
    duration: Optional[int] = Field(None, description="Requested duration in seconds")
    status: str = Field(default="pending")
    command: Optional[Union[str, RecordID]] = Field(
        None, description="surreal-commands job reference"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Provider-specific metadata (e.g. song title, tags)"
    )
    error_message: Optional[str] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    async def get_job_status(self) -> Optional[str]:
        if not self.command:
            return None
        try:
            from surreal_commands import get_command_status

            status = await get_command_status(str(self.command))
            return status.status if status else "unknown"
        except Exception:
            return "unknown"

    @field_validator("command", mode="before")
    @classmethod
    def parse_command(cls, value):
        if isinstance(value, str):
            return ensure_record_id(value)
        return value

    def _prepare_save_data(self) -> dict:
        data = super()._prepare_save_data()
        if data.get("command") is not None:
            data["command"] = ensure_record_id(data["command"])
        return data


class VideoJob(ObjectModel):
    """A video generation job tracking request, provider, and output."""

    table_name: ClassVar[str] = "video_job"

    name: str = Field(..., description="Descriptive job name")
    prompt: str = Field(..., description="Text prompt describing the desired video")
    style: Optional[str] = Field(
        None,
        description="Style hint: cinematic, animated, realistic, abstract, etc.",
    )
    providers: List[str] = Field(
        default_factory=list,
        description="Requested providers (runway, pika). Empty = smart-routed.",
    )
    provider_used: Optional[str] = Field(
        None, description="Provider that actually generated the video"
    )
    video_file: Optional[str] = Field(None, description="Local path to generated video")
    image_url: Optional[str] = Field(
        None, description="Optional input image for image-to-video generation"
    )
    duration: Optional[int] = Field(None, description="Requested duration in seconds")
    status: str = Field(default="pending")
    command: Optional[Union[str, RecordID]] = Field(
        None, description="surreal-commands job reference"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Provider-specific metadata (e.g. resolution, frame rate)"
    )
    error_message: Optional[str] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    async def get_job_status(self) -> Optional[str]:
        if not self.command:
            return None
        try:
            from surreal_commands import get_command_status

            status = await get_command_status(str(self.command))
            return status.status if status else "unknown"
        except Exception:
            return "unknown"

    @field_validator("command", mode="before")
    @classmethod
    def parse_command(cls, value):
        if isinstance(value, str):
            return ensure_record_id(value)
        return value

    def _prepare_save_data(self) -> dict:
        data = super()._prepare_save_data()
        if data.get("command") is not None:
            data["command"] = ensure_record_id(data["command"])
        return data


class CombinedMediaJob(ObjectModel):
    """Combines a music job and video job into a single merged output file."""

    table_name: ClassVar[str] = "combined_media_job"

    name: str = Field(..., description="Descriptive job name")
    music_job: Optional[Union[str, RecordID]] = Field(
        None, description="Reference to MusicJob record"
    )
    video_job: Optional[Union[str, RecordID]] = Field(
        None, description="Reference to VideoJob record"
    )
    output_file: Optional[str] = Field(
        None, description="Path to merged video+audio file"
    )
    status: str = Field(default="pending")
    command: Optional[Union[str, RecordID]] = Field(
        None, description="surreal-commands job reference"
    )
    error_message: Optional[str] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    async def get_job_status(self) -> Optional[str]:
        if not self.command:
            return None
        try:
            from surreal_commands import get_command_status

            status = await get_command_status(str(self.command))
            return status.status if status else "unknown"
        except Exception:
            return "unknown"

    @field_validator("command", "music_job", "video_job", mode="before")
    @classmethod
    def parse_record_ids(cls, value):
        if isinstance(value, str):
            return ensure_record_id(value)
        return value

    def _prepare_save_data(self) -> dict:
        data = super()._prepare_save_data()
        for field in ("command", "music_job", "video_job"):
            if data.get(field) is not None:
                data[field] = ensure_record_id(data[field])
        return data
