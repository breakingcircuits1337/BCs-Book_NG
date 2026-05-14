'use client'

import { useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Clapperboard, ImageIcon, Music2, Loader2, X, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { mediaApi } from '@/lib/api/media'

// ---------------------------------------------------------------------------
// Reusable pill-toggle group
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
// File upload pill
// ---------------------------------------------------------------------------

function FilePill({
  accept,
  icon,
  label,
  file,
  onChange,
}: {
  accept: string
  icon: React.ReactNode
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
// Types
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
  const [mode, setMode] = useState<MediaMode>('music')
  const [musicProvider, setMusicProvider] = useState<MusicProvider>('suno')
  const [videoProvider, setVideoProvider] = useState<VideoProvider>('runway')

  const [prompt, setPrompt] = useState('')
  const [videoPrompt, setVideoPrompt] = useState('')
  const [musicPrompt, setMusicPrompt] = useState('')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)

  const wantsMusic = mode === 'music' || mode === 'both'
  const wantsVideo = mode === 'video' || mode === 'both'
  const isBoth = mode === 'both'

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

    setLoading(true)
    try {
      if (mode === 'music') {
        const res = await mediaApi.generateMusic({
          name: `Music – ${new Date().toLocaleTimeString()}`,
          prompt: mPrompt!,
          providers: providerList(musicProvider),
        })
        toast.success(`Music job submitted (${res.job_id})`)
      } else if (mode === 'video') {
        const res = await mediaApi.generateVideo({
          name: `Video – ${new Date().toLocaleTimeString()}`,
          prompt: vPrompt!,
          providers: providerList(videoProvider),
        })
        toast.success(`Video job submitted (${res.job_id})`)
      } else {
        const res = await mediaApi.generateCombined({
          name: `Combined – ${new Date().toLocaleTimeString()}`,
          video_prompt: vPrompt!,
          music_prompt: mPrompt!,
          video_providers: providerList(videoProvider),
          music_providers: providerList(musicProvider),
        })
        toast.success(`Combined media job submitted (${res.job_id})`)
      }

      // Reset
      setPrompt('')
      setVideoPrompt('')
      setMusicPrompt('')
      setImageFile(null)
      setAudioFile(null)
    } catch {
      toast.error('Failed to submit generation job.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 max-w-2xl space-y-7">

          {/* Header */}
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Clapperboard className="h-6 w-6" />
              Media Generation
            </h1>
            <p className="text-muted-foreground text-sm">
              Generate music, video, or both — smart-routed to the best provider.
            </p>
          </header>

          <Separator />

          {/* What to generate */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Generate
            </Label>
            <ToggleGroup options={MEDIA_OPTIONS} value={mode} onChange={setMode} />
          </div>

          {/* Music provider */}
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

          {/* Video provider */}
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

          <Separator />

          {/* Prompt(s) */}
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

          {/* File uploads */}
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

          {/* Submit */}
          <Button
            onClick={handleGenerate}
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate{mode === 'both' ? ' Music + Video' : mode === 'music' ? ' Music' : ' Video'}
          </Button>

        </div>
      </div>
    </AppShell>
  )
}
