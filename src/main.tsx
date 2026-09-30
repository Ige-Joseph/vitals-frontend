import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { clearLegacySensitiveCaches } from '@/lib/browser-security'
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt'

// Material Symbols are loaded from Google Fonts. Keep ligature text hidden if
// the font is unavailable so names such as "mail" never leak into the UI.
if ('fonts' in document) {
  void document.fonts.load('24px "Material Symbols Outlined"', 'mail')
    .then((faces) => {
      if (faces.length > 0) document.documentElement.dataset.materialSymbols = 'ready'
    })
    .catch(() => undefined)
}

// Older releases cached authenticated API responses. Purge those entries as
// early as possible; the current service worker no longer caches API traffic.
void clearLegacySensitiveCaches()

// StrictMode is removed for production-like stability in development.
// It causes every useEffect to run twice (mount → unmount → mount), which:
//   - doubles every API call on page load
//   - causes visible flicker as loading states fire twice
//   - makes fetch-loop bugs harder to diagnose
// Re-enable StrictMode only in dedicated testing environments.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <PwaUpdatePrompt />
    <App />
  </>,
)
