'use client'

import { useEffect } from 'react'

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // SW registration is best-effort; silently ignore failures
        })
    }
  }, [])

  return <>{children}</>
}
