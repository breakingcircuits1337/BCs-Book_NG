'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Clapperboard, Music, Film, Loader2, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { mediaApi } from '@/lib/api/media'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DialogType = 'music' | 'video' | 'combined' | null

// ---------------------------------------------------------------------------
// Quick-generate dialogs
// ---------------------------------------------------------------------------

function MusicDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<string>('auto')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !prompt.trim()) {
      toast.error('Please fill in both name and prompt.')
      return
    }
    setLoading(true)
    try {
      const res = await mediaApi.generateMusic({
        name: name.trim(),
        prompt: prompt.trim(),
        style: style === 'auto' ? undefined : style,
      })
      toast.success(`Music job submitted (ID: ${res.job_id})`)
      onClose()
      setName('')
      setPrompt('')
      setStyle('auto')
    } catch {
      toast.error('Failed to submit music generation job.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" /> Generate Music
          </DialogTitle>
          <DialogDescription>
            Describe the music you want. The smart router picks Suno (vocals/lyrics) or Udio (instrumental/ambient) based on your style choice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="music-name">Name</Label>
            <Input
              id="music-name"
              placeholder="My background track"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="music-prompt">Prompt</Label>
            <Textarea
              id="music-prompt"
              placeholder="Upbeat jazz with piano and trumpet, café atmosphere…"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="music-style">Style (for smart routing)</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger id="music-style">
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="vocals">Vocals / Song (→ Suno)</SelectItem>
                <SelectItem value="instrumental">Instrumental (→ Udio)</SelectItem>
                <SelectItem value="ambient">Ambient (→ Udio)</SelectItem>
                <SelectItem value="cinematic">Cinematic (→ Udio)</SelectItem>
                <SelectItem value="pop">Pop (→ Suno)</SelectItem>
                <SelectItem value="jazz">Jazz (→ Udio)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function VideoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<string>('auto')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !prompt.trim()) {
      toast.error('Please fill in both name and prompt.')
      return
    }
    setLoading(true)
    try {
      const res = await mediaApi.generateVideo({
        name: name.trim(),
        prompt: prompt.trim(),
        style: style === 'auto' ? undefined : style,
      })
      toast.success(`Video job submitted (ID: ${res.job_id})`)
      onClose()
      setName('')
      setPrompt('')
      setStyle('auto')
    } catch {
      toast.error('Failed to submit video generation job.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" /> Generate Video
          </DialogTitle>
          <DialogDescription>
            Describe the video you want. The smart router picks RunwayML (cinematic/realistic) or Pika (animated/stylized) based on your style choice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="video-name">Name</Label>
            <Input
              id="video-name"
              placeholder="My intro clip"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="video-prompt">Prompt</Label>
            <Textarea
              id="video-prompt"
              placeholder="A misty mountain landscape at sunrise, slow pan, 4K…"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="video-style">Style (for smart routing)</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger id="video-style">
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="cinematic">Cinematic (→ RunwayML)</SelectItem>
                <SelectItem value="photorealistic">Photorealistic (→ RunwayML)</SelectItem>
                <SelectItem value="animated">Animated (→ Pika)</SelectItem>
                <SelectItem value="cartoon">Cartoon (→ Pika)</SelectItem>
                <SelectItem value="stylized">Stylized (→ Pika)</SelectItem>
                <SelectItem value="anime">Anime (→ Pika)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CombinedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [videoPrompt, setVideoPrompt] = useState('')
  const [musicPrompt, setMusicPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !videoPrompt.trim() || !musicPrompt.trim()) {
      toast.error('Please fill in all three fields.')
      return
    }
    setLoading(true)
    try {
      const res = await mediaApi.generateCombined({
        name: name.trim(),
        video_prompt: videoPrompt.trim(),
        music_prompt: musicPrompt.trim(),
      })
      toast.success(`Combined media job submitted (ID: ${res.job_id})`)
      onClose()
      setName('')
      setVideoPrompt('')
      setMusicPrompt('')
    } catch {
      toast.error('Failed to submit combined media generation job.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> Generate Combined Media
          </DialogTitle>
          <DialogDescription>
            Generate music and video concurrently, then merge them into a single file using ffmpeg.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="combined-name">Name</Label>
            <Input
              id="combined-name"
              placeholder="My promo video"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="combined-video">Video prompt</Label>
            <Textarea
              id="combined-video"
              placeholder="Aerial shot of a city at night, cinematic…"
              rows={2}
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="combined-music">Music prompt</Label>
            <Textarea
              id="combined-music"
              placeholder="Atmospheric electronic soundtrack, slow build…"
              rows={2}
              value={musicPrompt}
              onChange={(e) => setMusicPrompt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MediaPage() {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null)

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Clapperboard className="h-6 w-6" />
              Media Generation
            </h1>
            <p className="text-muted-foreground">
              Generate music, video, and combined media using AI — powered by Suno, Udio, RunwayML, and Pika.
            </p>
          </header>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            <button
              onClick={() => setActiveDialog('music')}
              className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Music</span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">
                Generate a music track from a text prompt. Smart routing picks Suno or Udio.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">Suno</Badge>
                <Badge variant="secondary" className="text-xs">Udio</Badge>
              </div>
            </button>

            <button
              onClick={() => setActiveDialog('video')}
              className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                  <Film className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Video</span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">
                Generate a video clip from a text prompt. Smart routing picks RunwayML or Pika.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">RunwayML</Badge>
                <Badge variant="secondary" className="text-xs">Pika</Badge>
              </div>
            </button>

            <button
              onClick={() => setActiveDialog('combined')}
              className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Combined</span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">
                Generate music + video concurrently, then merge them into one file via ffmpeg.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">Music + Video</Badge>
              </div>
            </button>
          </div>

          <p className="text-xs text-muted-foreground max-w-2xl">
            Jobs run in the background. Configure API keys in your <code className="bg-muted rounded px-1">.env</code> file:
            {' '}<code className="bg-muted rounded px-1">SUNO_API_KEY</code>,{' '}
            <code className="bg-muted rounded px-1">UDIO_API_KEY</code>,{' '}
            <code className="bg-muted rounded px-1">RUNWAY_API_KEY</code>,{' '}
            <code className="bg-muted rounded px-1">PIKA_API_KEY</code>.
            Combined mode also requires <code className="bg-muted rounded px-1">ffmpeg</code>.
          </p>
        </div>
      </div>

      <MusicDialog open={activeDialog === 'music'} onClose={() => setActiveDialog(null)} />
      <VideoDialog open={activeDialog === 'video'} onClose={() => setActiveDialog(null)} />
      <CombinedDialog open={activeDialog === 'combined'} onClose={() => setActiveDialog(null)} />
    </AppShell>
  )
}
