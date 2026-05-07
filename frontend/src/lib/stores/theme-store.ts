import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type AccentColor = 'blue' | 'purple' | 'green' | 'rose' | 'orange' | 'teal'

interface AccentValues {
  primary: string
  ring: string
}

interface AccentPreset {
  label: string
  light: AccentValues
  dark: AccentValues
  foreground: string
  preview: string
}

export const ACCENT_PRESETS: Record<AccentColor, AccentPreset> = {
  blue: {
    label: 'Blue',
    light: { primary: 'oklch(0.623 0.214 259.815)', ring: 'oklch(0.623 0.214 259.815)' },
    dark:  { primary: 'oklch(0.546 0.245 262.881)', ring: 'oklch(0.488 0.243 264.376)' },
    foreground: 'oklch(0.985 0 0)',
    preview: '#3b82f6',
  },
  purple: {
    label: 'Purple',
    light: { primary: 'oklch(0.62 0.2 300)', ring: 'oklch(0.62 0.2 300)' },
    dark:  { primary: 'oklch(0.55 0.22 300)', ring: 'oklch(0.50 0.22 300)' },
    foreground: 'oklch(0.985 0 0)',
    preview: '#a855f7',
  },
  green: {
    label: 'Green',
    light: { primary: 'oklch(0.58 0.18 148)', ring: 'oklch(0.58 0.18 148)' },
    dark:  { primary: 'oklch(0.52 0.2 148)',  ring: 'oklch(0.48 0.2 148)' },
    foreground: 'oklch(0.985 0 0)',
    preview: '#22c55e',
  },
  rose: {
    label: 'Rose',
    light: { primary: 'oklch(0.63 0.22 15)', ring: 'oklch(0.63 0.22 15)' },
    dark:  { primary: 'oklch(0.58 0.22 15)', ring: 'oklch(0.52 0.22 15)' },
    foreground: 'oklch(0.985 0 0)',
    preview: '#f43f5e',
  },
  orange: {
    label: 'Orange',
    light: { primary: 'oklch(0.67 0.19 55)', ring: 'oklch(0.67 0.19 55)' },
    dark:  { primary: 'oklch(0.62 0.2 55)',  ring: 'oklch(0.56 0.2 55)' },
    foreground: 'oklch(0.985 0 0)',
    preview: '#f97316',
  },
  teal: {
    label: 'Teal',
    light: { primary: 'oklch(0.6 0.15 195)', ring: 'oklch(0.6 0.15 195)' },
    dark:  { primary: 'oklch(0.54 0.17 195)', ring: 'oklch(0.48 0.17 195)' },
    foreground: 'oklch(0.985 0 0)',
    preview: '#14b8a6',
  },
}

export function applyAccentToDOM(accentColor: AccentColor, isDark: boolean) {
  if (typeof window === 'undefined') return
  const preset = ACCENT_PRESETS[accentColor]
  const colors = isDark ? preset.dark : preset.light
  const root = window.document.documentElement
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--primary-foreground', preset.foreground)
  root.style.setProperty('--ring', colors.ring)
  root.style.setProperty('--sidebar-primary', colors.primary)
  root.style.setProperty('--sidebar-primary-foreground', preset.foreground)
  root.style.setProperty('--sidebar-ring', colors.ring)
}

interface ThemeState {
  theme: Theme
  accentColor: AccentColor
  setTheme: (theme: Theme) => void
  setAccentColor: (accent: AccentColor) => void
  getSystemTheme: () => 'light' | 'dark'
  getEffectiveTheme: () => 'light' | 'dark'
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      accentColor: 'blue',

      setTheme: (theme: Theme) => {
        set({ theme })

        if (typeof window !== 'undefined') {
          const root = window.document.documentElement
          const effectiveTheme = theme === 'system' ? get().getSystemTheme() : theme

          root.classList.remove('light', 'dark')
          root.classList.add(effectiveTheme)
          root.setAttribute('data-theme', effectiveTheme)

          applyAccentToDOM(get().accentColor, effectiveTheme === 'dark')
        }
      },

      setAccentColor: (accentColor: AccentColor) => {
        set({ accentColor })
        if (typeof window !== 'undefined') {
          applyAccentToDOM(accentColor, get().getEffectiveTheme() === 'dark')
        }
      },

      getSystemTheme: () => {
        if (typeof window !== 'undefined') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
        return 'light'
      },

      getEffectiveTheme: () => {
        const { theme } = get()
        return theme === 'system' ? get().getSystemTheme() : theme
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme, accentColor: state.accentColor }),
    }
  )
)

export function useTheme() {
  const { theme, setTheme, getEffectiveTheme, accentColor, setAccentColor } = useThemeStore()

  return {
    theme,
    setTheme,
    effectiveTheme: getEffectiveTheme(),
    isDark: getEffectiveTheme() === 'dark',
    accentColor,
    setAccentColor,
  }
}
