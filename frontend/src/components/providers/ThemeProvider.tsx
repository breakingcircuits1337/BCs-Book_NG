'use client'

import { useEffect } from 'react'
import { useThemeStore, applyAccentToDOM } from '@/lib/stores/theme-store'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, accentColor, getSystemTheme, getEffectiveTheme } = useThemeStore()

  useEffect(() => {
    const root = window.document.documentElement
    const effectiveTheme = getEffectiveTheme()
    const isDark = effectiveTheme === 'dark'

    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)
    root.setAttribute('data-theme', effectiveTheme)
    applyAccentToDOM(accentColor, isDark)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = () => {
        const newSystemTheme = getSystemTheme()
        root.classList.remove('light', 'dark')
        root.classList.add(newSystemTheme)
        root.setAttribute('data-theme', newSystemTheme)
        applyAccentToDOM(accentColor, newSystemTheme === 'dark')
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, accentColor, getSystemTheme, getEffectiveTheme])

  return <>{children}</>
}
