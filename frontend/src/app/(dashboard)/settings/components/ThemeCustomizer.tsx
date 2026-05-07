'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useTheme } from '@/lib/stores/theme-store'
import { ACCENT_PRESETS, type AccentColor } from '@/lib/stores/theme-store'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useTranslation } from '@/lib/hooks/use-translation'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const ACCENT_ORDER: AccentColor[] = ['blue', 'purple', 'green', 'rose', 'orange', 'teal']

export function ThemeCustomizer() {
  const { t } = useTranslation()
  const { accentColor, setAccentColor } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.appearance}</CardTitle>
        <CardDescription>{t.settings.appearanceDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">{t.common.theme}</p>
          <ThemeToggle />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">{t.settings.accentColor}</p>
          <div className="flex flex-wrap gap-3">
            {ACCENT_ORDER.map((key) => {
              const preset = ACCENT_PRESETS[key]
              const isSelected = accentColor === key
              return (
                <button
                  key={key}
                  type="button"
                  title={preset.label}
                  onClick={() => setAccentColor(key)}
                  className={cn(
                    'relative h-8 w-8 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected && 'ring-2 ring-ring ring-offset-2 ring-offset-background scale-110'
                  )}
                  style={{ backgroundColor: preset.preview }}
                  aria-pressed={isSelected}
                  aria-label={preset.label}
                >
                  {isSelected && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
