import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { mediaApi } from '@/lib/api/media'
import { QUERY_KEYS } from '@/lib/api/query-client'

const ACTIVE_MEDIA_STATUSES = ['pending', 'running', 'submitted', 'queued']

function hasActiveStatus(items: { job_status?: string }[]) {
  return items.some((item) => ACTIVE_MEDIA_STATUSES.includes(item.job_status ?? ''))
}

export function useMediaJobs() {
  const musicQuery = useQuery({
    queryKey: QUERY_KEYS.musicJobs,
    queryFn: mediaApi.listMusicJobs,
    refetchInterval: (current) => {
      const data = current.state.data
      if (!data || data.length === 0) return false
      return hasActiveStatus(data) ? 5000 : false
    },
  })

  const videoQuery = useQuery({
    queryKey: QUERY_KEYS.videoJobs,
    queryFn: mediaApi.listVideoJobs,
    refetchInterval: (current) => {
      const data = current.state.data
      if (!data || data.length === 0) return false
      return hasActiveStatus(data) ? 5000 : false
    },
  })

  const combinedQuery = useQuery({
    queryKey: QUERY_KEYS.combinedJobs,
    queryFn: mediaApi.listCombinedJobs,
    refetchInterval: (current) => {
      const data = current.state.data
      if (!data || data.length === 0) return false
      return hasActiveStatus(data) ? 5000 : false
    },
  })

  return {
    musicJobs: musicQuery.data ?? [],
    videoJobs: videoQuery.data ?? [],
    combinedJobs: combinedQuery.data ?? [],
    isLoading: musicQuery.isLoading || videoQuery.isLoading || combinedQuery.isLoading,
  }
}

export function useMediaProviders() {
  return useQuery({
    queryKey: QUERY_KEYS.mediaProviders,
    queryFn: mediaApi.getProviders,
    staleTime: 60_000,
  })
}

export function useDeleteMusicJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => mediaApi.deleteMusicJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.musicJobs })
    },
  })
}

export function useDeleteVideoJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => mediaApi.deleteVideoJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.videoJobs })
    },
  })
}

export function useDeleteCombinedJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => mediaApi.deleteCombinedJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedJobs })
    },
  })
}

export function useGenerateMedia() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      mode,
      payload,
    }: {
      mode: 'music' | 'video' | 'both'
      payload: Parameters<typeof mediaApi.generateMusic>[0] | Parameters<typeof mediaApi.generateVideo>[0] | Parameters<typeof mediaApi.generateCombined>[0]
    }) => {
      if (mode === 'music') {
        return mediaApi.generateMusic(payload as Parameters<typeof mediaApi.generateMusic>[0])
      } else if (mode === 'video') {
        return mediaApi.generateVideo(payload as Parameters<typeof mediaApi.generateVideo>[0])
      } else {
        return mediaApi.generateCombined(payload as Parameters<typeof mediaApi.generateCombined>[0])
      }
    },
    onSuccess: (_, variables) => {
      if (variables.mode === 'music') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.musicJobs })
      } else if (variables.mode === 'video') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.videoJobs })
      } else {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.musicJobs })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.videoJobs })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.combinedJobs })
      }
    },
  })

  return {
    generate: mutation.mutateAsync,
    isLoading: mutation.isPending,
  }
}
