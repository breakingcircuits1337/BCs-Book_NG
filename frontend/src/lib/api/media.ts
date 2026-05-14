import apiClient from './client'

export interface MusicGenerationRequest {
  name: string
  prompt: string
  style?: string
  duration?: number
  providers?: string[]
}

export interface VideoGenerationRequest {
  name: string
  prompt: string
  style?: string
  duration?: number
  image_url?: string
  providers?: string[]
}

export interface CombinedMediaRequest {
  name: string
  video_prompt: string
  music_prompt: string
  video_style?: string
  music_style?: string
  duration?: number
  image_url?: string
  video_providers?: string[]
  music_providers?: string[]
}

export interface MediaJobResponse {
  job_id: string
  status: string
  message: string
}

export interface MusicJob {
  id: string
  name: string
  prompt: string
  style?: string
  providers: string[]
  provider_used?: string
  audio_file?: string
  audio_url?: string
  duration?: number
  status: string
  metadata?: Record<string, unknown>
  error_message?: string
  created?: string
  job_status?: string
}

export interface VideoJob {
  id: string
  name: string
  prompt: string
  style?: string
  providers: string[]
  provider_used?: string
  video_file?: string
  video_url?: string
  image_url?: string
  duration?: number
  status: string
  metadata?: Record<string, unknown>
  error_message?: string
  created?: string
  job_status?: string
}

export interface CombinedJob {
  id: string
  name: string
  output_file?: string
  output_url?: string
  status: string
  error_message?: string
  created?: string
  job_status?: string
}

export interface ProviderInfo {
  name: string
  available: boolean
  best_for: string
}

export interface MediaProviders {
  music: ProviderInfo[]
  video: ProviderInfo[]
  combined: { description: string; requires_ffmpeg: boolean }
}

export const mediaApi = {
  generateMusic: async (payload: MusicGenerationRequest): Promise<MediaJobResponse> => {
    const response = await apiClient.post<MediaJobResponse>('/media/music/generate', payload)
    return response.data
  },

  listMusicJobs: async (): Promise<MusicJob[]> => {
    const response = await apiClient.get<MusicJob[]>('/media/music')
    return response.data
  },

  getMusicJob: async (jobId: string): Promise<MusicJob> => {
    const response = await apiClient.get<MusicJob>(`/media/music/${jobId}`)
    return response.data
  },

  deleteMusicJob: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/media/music/${jobId}`)
  },

  generateVideo: async (payload: VideoGenerationRequest): Promise<MediaJobResponse> => {
    const response = await apiClient.post<MediaJobResponse>('/media/video/generate', payload)
    return response.data
  },

  listVideoJobs: async (): Promise<VideoJob[]> => {
    const response = await apiClient.get<VideoJob[]>('/media/video')
    return response.data
  },

  getVideoJob: async (jobId: string): Promise<VideoJob> => {
    const response = await apiClient.get<VideoJob>(`/media/video/${jobId}`)
    return response.data
  },

  deleteVideoJob: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/media/video/${jobId}`)
  },

  generateCombined: async (payload: CombinedMediaRequest): Promise<MediaJobResponse> => {
    const response = await apiClient.post<MediaJobResponse>('/media/combined/generate', payload)
    return response.data
  },

  listCombinedJobs: async (): Promise<CombinedJob[]> => {
    const response = await apiClient.get<CombinedJob[]>('/media/combined')
    return response.data
  },

  getCombinedJob: async (jobId: string): Promise<CombinedJob> => {
    const response = await apiClient.get<CombinedJob>(`/media/combined/${jobId}`)
    return response.data
  },

  deleteCombinedJob: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/media/combined/${jobId}`)
  },

  getProviders: async (): Promise<MediaProviders> => {
    const response = await apiClient.get<MediaProviders>('/media/providers')
    return response.data
  },
}
