-- Migration 10: Media Generation (Music, Video, Combined)

-- Music generation jobs
DEFINE TABLE music_job SCHEMAFULL;
DEFINE FIELD name ON music_job TYPE string;
DEFINE FIELD prompt ON music_job TYPE string;
DEFINE FIELD style ON music_job TYPE option<string>;
DEFINE FIELD providers ON music_job TYPE array<string>;
DEFINE FIELD provider_used ON music_job TYPE option<string>;
DEFINE FIELD audio_file ON music_job TYPE option<string>;
DEFINE FIELD duration ON music_job TYPE option<int>;
DEFINE FIELD status ON music_job TYPE string DEFAULT 'pending';
DEFINE FIELD command ON music_job TYPE option<record>;
DEFINE FIELD metadata ON music_job TYPE option<object>;
DEFINE FIELD error_message ON music_job TYPE option<string>;
DEFINE FIELD created ON music_job TYPE option<datetime> DEFAULT time::now();
DEFINE FIELD updated ON music_job TYPE option<datetime> DEFAULT time::now();

-- Video generation jobs
DEFINE TABLE video_job SCHEMAFULL;
DEFINE FIELD name ON video_job TYPE string;
DEFINE FIELD prompt ON video_job TYPE string;
DEFINE FIELD style ON video_job TYPE option<string>;
DEFINE FIELD providers ON video_job TYPE array<string>;
DEFINE FIELD provider_used ON video_job TYPE option<string>;
DEFINE FIELD video_file ON video_job TYPE option<string>;
DEFINE FIELD image_url ON video_job TYPE option<string>;
DEFINE FIELD duration ON video_job TYPE option<int>;
DEFINE FIELD status ON video_job TYPE string DEFAULT 'pending';
DEFINE FIELD command ON video_job TYPE option<record>;
DEFINE FIELD metadata ON video_job TYPE option<object>;
DEFINE FIELD error_message ON video_job TYPE option<string>;
DEFINE FIELD created ON video_job TYPE option<datetime> DEFAULT time::now();
DEFINE FIELD updated ON video_job TYPE option<datetime> DEFAULT time::now();

-- Combined media jobs (music + video merged)
DEFINE TABLE combined_media_job SCHEMAFULL;
DEFINE FIELD name ON combined_media_job TYPE string;
DEFINE FIELD music_job ON combined_media_job TYPE option<record<music_job>>;
DEFINE FIELD video_job ON combined_media_job TYPE option<record<video_job>>;
DEFINE FIELD output_file ON combined_media_job TYPE option<string>;
DEFINE FIELD status ON combined_media_job TYPE string DEFAULT 'pending';
DEFINE FIELD command ON combined_media_job TYPE option<record>;
DEFINE FIELD error_message ON combined_media_job TYPE option<string>;
DEFINE FIELD created ON combined_media_job TYPE option<datetime> DEFAULT time::now();
DEFINE FIELD updated ON combined_media_job TYPE option<datetime> DEFAULT time::now();
