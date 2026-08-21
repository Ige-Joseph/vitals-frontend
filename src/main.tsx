import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { clearLegacySensitiveCaches } from '@/lib/browser-security'

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
  <App />
)
