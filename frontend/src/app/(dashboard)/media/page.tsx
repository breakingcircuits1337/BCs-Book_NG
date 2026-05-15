'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Clapperboard,
  ImageIcon,
  Music2,
  Loader2,
  X,
  Upload,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/config'
import {
  useMediaJobs,
  useMediaProviders,
  useDeleteMusicJob,
  useDeleteVideoJob,
  useDeleteCombinedJob,
  useGenerateMedia,
} from '@/lib/hooks/use-media'
import type { MusicJob, VideoJob, CombinedJob } from '@/lib/api/media'

// ---------------------------------------------------------------------------
// ToggleGroup
// ---------------------------------------------------------------------------

interface ToggleOption<T extends string> {
  value: T
  label: string
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ToggleOption<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-border overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            i > 0 && 'border-l border-border',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FilePill
// ---------------------------------------------------------------------------

function FilePill({
  accept,
  icon,
  label,
  file,
  onChange,
}: {
  accept: string
  icon: ReactNode
  label: string
  file: File | null
  onChange: (f: File | null) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-sm">
          {icon}
          <span className="max-w-[160px] truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              if (ref.current) ref.current.value = ''
            }}
            className="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 rounded-full border border-dashed bg-background px-3 py-1 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          {label}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? ''
  if (s === 'completed') {
    return (
      <Badge variant="outline" className="text-green-600 border-green-600 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </Badge>
    )
  }
  if (s === 'failed') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Failed
      </Badge>
    )
  }
  if (s === 'running') {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-600 flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-yellow-600 border-yellow-600 flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {status ?? 'Pending'}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// JobCard
// ---------------------------------------------------------------------------

function MusicJobCard({
  job,
  apiBase,
  onDelete,
  isDeleting,
}: {
  job: MusicJob
  apiBase: string
  onDelete: () => void
  isDeleting: boolean
}) {
  const jobStatus = job.job_status ?? job.status
  const audioSrc = job.audio_url ? `${apiBase}${job.audio_url}` : null

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={jobStatus ?? job.status} />
              {job.provider_used && (
                <Badge variant="secondary" className="text-xs">{job.provider_used}</Badge>
              )}
            </div>
            <p className="font-medium text-sm truncate">{job.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{job.prompt}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {job.audio_url && (
              <a
                href={audioSrc ?? ''}
                download
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {job.created && (
          <p className="text-xs text-muted-foreground mt-1">{job.created}</p>
        )}
        {audioSrc && jobStatus === 'completed' && (
          <audio controls className="mt-3 w-full h-8" src={audioSrc} />
        )}
        {job.error_message && (
          <p className="text-xs text-destructive mt-2">{job.error_message}</p>
        )}
      </CardContent>
    </Card>
  )
}

function VideoJobCard({
  job,
  apiBase,
  onDelete,
  isDeleting,
}: {
  job: VideoJob
  apiBase: string
  onDelete: () => void
  isDeleting: boolean
}) {
  const jobStatus = job.job_status ?? job.status
  const videoSrc = job.video_url ? `${apiBase}${job.video_url}` : null

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={jobStatus ?? job.status} />
              {job.provider_used && (
                <Badge variant="secondary" className="text-xs">{job.provider_used}</Badge>
              )}
            </div>
            <p className="font-medium text-sm truncate">{job.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{job.prompt}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {job.video_url && (
              <a
                href={videoSrc ?? ''}
                download
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {job.created && (
          <p className="text-xs text-muted-foreground mt-1">{job.created}</p>
        )}
        {videoSrc && jobStatus === 'completed' && (
          <video controls className="mt-3 w-full rounded" src={videoSrc} />
        )}
        {job.error_message && (
          <p className="text-xs text-destructive mt-2">{job.error_message}</p>
        )}
      </CardContent>
    </Card>
  )
}

function CombinedJobCard({
  job,
  apiBase,
  onDelete,
  isDeleting,
}: {
  job: CombinedJob
  apiBase: string
  onDelete: () => void
  isDeleting: boolean
}) {
  const jobStatus = job.job_status ?? job.status
  const outputSrc = job.output_url ? `${apiBase}${job.output_url}` : null

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={jobStatus ?? job.status} />
            </div>
            <p className="font-medium text-sm truncate">{job.name}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {job.output_url && (
              <a
                href={outputSrc ?? ''}
                download
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {job.created && (
          <p className="text-xs text-muted-foreground mt-1">{job.created}</p>
        )}
        {outputSrc && jobStatus === 'completed' && (
          <video controls className="mt-3 w-full rounded" src={outputSrc} />
        )}
        {job.error_message && (
          <p className="text-xs text-destructive mt-2">{job.error_message}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type MediaMode = 'music' | 'video' | 'both'
type MusicProvider = 'suno' | 'udio' | 'both'
type VideoProvider = 'runway' | 'pika' | 'both'

const MEDIA_OPTIONS: ToggleOption<MediaMode>[] = [
  { value: 'music', label: 'Music' },
  { value: 'video', label: 'Video' },
  { value: 'both', label: 'Both' },
]

const MUSIC_OPTIONS: ToggleOption<MusicProvider>[] = [
  { value: 'suno', label: 'Suno' },
  { value: 'udio', label: 'Udio' },
  { value: 'both', label: 'Both' },
]

const VIDEO_OPTIONS: ToggleOption<VideoProvider>[] = [
  { value: 'runway', label: 'RunwayML' },
  { value: 'pika', label: 'Pika' },
  { value: 'both', label: 'Both' },
]

function providerList(v: MusicProvider | VideoProvider): string[] {
  return v === 'both' ? [] : [v]
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MediaPage() {
  const [apiBase, setApiBase] = useState('')
  const [mode, setMode] = useState<MediaMode>('music')
  const [musicProvider, setMusicProvider] = useState<MusicProvider>('suno')
  const [videoProvider, setVideoProvider] = useState<VideoProvider>('runway')
  const [prompt, setPrompt] = useState('')
  const [videoPrompt, setVideoPrompt] = useState('')
  const [musicPrompt, setMusicPrompt] = useState('')
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const wantsMusic = mode === 'music' || mode === 'both'
  const wantsVideo = mode === 'video' || mode === 'both'
  const isBoth = mode === 'both'

  const { data: providers, isLoading: providersLoading } = useMediaProviders()
  const { musicJobs, videoJobs, combinedJobs, isLoading: jobsLoading } = useMediaJobs()
  const { generate, isLoading: generating } = useGenerateMedia()
  const deleteMusicJob = useDeleteMusicJob()
  const deleteVideoJob = useDeleteVideoJob()
  const deleteCombinedJob = useDeleteCombinedJob()

  useEffect(() => {
    getApiUrl().then(setApiBase).catch(() => setApiBase(''))
  }, [])

  const handleGenerate = async () => {
    const mainPrompt = isBoth ? undefined : prompt.trim()
    const vPrompt = isBoth ? videoPrompt.trim() : mainPrompt
    const mPrompt = isBoth ? musicPrompt.trim() : mainPrompt

    if (!mainPrompt && !isBoth) {
      toast.error('Enter a prompt before generating.')
      return
    }
    if (isBoth && (!vPrompt || !mPrompt)) {
      toast.error('Enter both a video prompt and a music prompt.')
      return
    }

    try {
      const parsedDuration = duration ? parseInt(duration, 10) : undefined

      if (mode === 'music') {
        await generate({
          mode: 'music',
          payload: {
            name: `Music – ${new Date().toLocaleTimeString()}`,
            prompt: mPrompt!,
            providers: providerList(musicProvider),
            style: style || undefined,
            duration: parsedDuration,
          },
        })
      } else if (mode === 'video') {
        await generate({
          mode: 'video',
          payload: {
            name: `Video – ${new Date().toLocaleTimeString()}`,
            prompt: vPrompt!,
            providers: providerList(videoProvider),
            style: style || undefined,
            duration: parsedDuration,
          },
        })
      } else {
        await generate({
          mode: 'both',
          payload: {
            name: `Combined – ${new Date().toLocaleTimeString()}`,
            video_prompt: vPrompt!,
            music_prompt: mPrompt!,
            video_providers: providerList(videoProvider),
            music_providers: providerList(musicProvider),
            video_style: style || undefined,
            music_style: style || undefined,
            duration: parsedDuration,
          },
        })
      }

      toast.success('Generation started')
      setPrompt('')
      setVideoPrompt('')
      setMusicPrompt('')
      setStyle('')
      setDuration('')
      setImageFile(null)
      setAudioFile(null)
    } catch {
      toast.error('Failed to submit generation job')
    }
  }

  const handleDeleteMusic = async (jobId: string) => {
    try {
      await deleteMusicJob.mutateAsync(jobId)
      toast.success('Job deleted')
    } catch {
      toast.error('Failed to delete job')
    }
  }

  const handleDeleteVideo = async (jobId: string) => {
    try {
      await deleteVideoJob.mutateAsync(jobId)
      toast.success('Job deleted')
    } catch {
      toast.error('Failed to delete job')
    }
  }

  const handleDeleteCombined = async (jobId: string) => {
    try {
      await deleteCombinedJob.mutateAsync(jobId)
      toast.success('Job deleted')
    } catch {
      toast.error('Failed to delete job')
    }
  }

  const allProviders = [
    ...(providers?.music ?? []),
    ...(providers?.video ?? []),
  ]

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 max-w-2xl space-y-7">

          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Clapperboard className="h-6 w-6" />
              Media Generation
            </h1>
            <p className="text-muted-foreground text-sm">
              Generate music, video, or both — smart-routed to the best provider.
            </p>
          </header>

          {!providersLoading && allProviders.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Providers:</span>
              {allProviders.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      p.available ? 'bg-green-500' : 'bg-gray-400'
                    )}
                  />
                  {p.name}
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Generate
            </Label>
            <ToggleGroup options={MEDIA_OPTIONS} value={mode} onChange={setMode} />
          </div>

          {wantsMusic && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Music via
              </Label>
              <ToggleGroup
                options={MUSIC_OPTIONS}
                value={musicProvider}
                onChange={setMusicProvider}
              />
            </div>
          )}

          {wantsVideo && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Video via
              </Label>
              <ToggleGroup
                options={VIDEO_OPTIONS}
                value={videoProvider}
                onChange={setVideoProvider}
              />
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="style" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Style
              </Label>
              <Input
                id="style"
                placeholder="cinematic, ambient, upbeat…"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label htmlFor="duration" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Duration (s)
              </Label>
              <Input
                id="duration"
                type="number"
                placeholder="30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {isBoth ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="video-prompt">Video prompt</Label>
                <Textarea
                  id="video-prompt"
                  rows={3}
                  placeholder="A misty mountain at sunrise, cinematic slow pan…"
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="music-prompt">Music prompt</Label>
                <Textarea
                  id="music-prompt"
                  rows={3}
                  placeholder="Atmospheric orchestral build, slow and cinematic…"
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                rows={4}
                placeholder={
                  mode === 'music'
                    ? 'Upbeat jazz with piano and trumpet, café atmosphere…'
                    : 'Aerial shot of a city at night, cinematic drone footage…'
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {wantsVideo && (
              <FilePill
                accept="image/*"
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                label="Add image"
                file={imageFile}
                onChange={setImageFile}
              />
            )}
            <FilePill
              accept="audio/*"
              icon={<Music2 className="h-3.5 w-3.5" />}
              label="Add audio"
              file={audioFile}
              onChange={setAudioFile}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="lg"
            className="w-full sm:w-auto"
          >
            {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'both' ? 'Generate Music + Video' : mode === 'music' ? 'Generate Music' : 'Generate Video'}
          </Button>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Jobs</h2>
            <Tabs defaultValue="music">
              <TabsList>
                <TabsTrigger value="music" className="flex items-center gap-1.5">
                  <Music2 className="h-3.5 w-3.5" />
                  Music
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="combined" className="flex items-center gap-1.5">
                  <Clapperboard className="h-3.5 w-3.5" />
                  Combined
                </TabsTrigger>
              </TabsList>

              <TabsContent value="music" className="mt-4 space-y-3">
                {jobsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : musicJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No music jobs yet. Generate one above.</p>
                ) : (
                  musicJobs.map((job) => (
                    <MusicJobCard
                      key={job.id}
                      job={job}
                      apiBase={apiBase}
                      onDelete={() => handleDeleteMusic(job.id)}
                      isDeleting={deleteMusicJob.isPending}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="video" className="mt-4 space-y-3">
                {jobsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : videoJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No video jobs yet. Generate one above.</p>
                ) : (
                  videoJobs.map((job) => (
                    <VideoJobCard
                      key={job.id}
                      job={job}
                      apiBase={apiBase}
                      onDelete={() => handleDeleteVideo(job.id)}
                      isDeleting={deleteVideoJob.isPending}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="combined" className="mt-4 space-y-3">
                {jobsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : combinedJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No combined jobs yet. Generate one above.</p>
                ) : (
                  combinedJobs.map((job) => (
                    <CombinedJobCard
                      key={job.id}
                      job={job}
                      apiBase={apiBase}
                      onDelete={() => handleDeleteCombined(job.id)}
                      isDeleting={deleteCombinedJob.isPending}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
