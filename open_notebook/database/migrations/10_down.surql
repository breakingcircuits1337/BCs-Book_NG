-- Migration 10 rollback: Remove media generation tables
REMOVE TABLE combined_media_job;
REMOVE TABLE video_job;
REMOVE TABLE music_job;
