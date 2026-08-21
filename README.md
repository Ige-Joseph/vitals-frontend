# Vitals Frontend

React and TypeScript progressive web application for the Vitals health
companion. It provides medication, pregnancy, baby-care, symptom, article,
profile, notification, and administration interfaces backed by the Vitals API.

## Technology

- React 18 and React Router
- TypeScript and Vite
- Zustand for authentication state
- Firebase Cloud Messaging
- `vite-plugin-pwa` and Workbox
- Vercel hosting configuration

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and provide the API and Firebase values.
3. Start the development server with `npm run dev`.

Useful commands:

```text
npm run dev      Start the Vite development server
npm run build    Type-check and build the production bundle
npm run preview  Serve the production bundle locally
npm run lint     Run ESLint once the lint toolchain is installed
```

The API defaults to `http://localhost:3000` when `VITE_API_URL` is not set.
All `VITE_*` values are embedded in the browser bundle and must be treated as
public configuration, never as server secrets.

## Application structure

```text
src/
  admin/       Administration layouts and pages
  components/  Shared UI and domain components
  hooks/       Browser and integration hooks
  lib/         API, Firebase, and browser-security utilities
  pages/       Route-level application screens
  store/       Persisted client state
```

Routes and access-gate components are defined in `src/App.tsx`. API requests go
through `src/lib/api.ts`. Client-side route gates improve user experience but
are not authorization controls; the backend must authorize every protected
operation.

## Security and maintenance

- See [SECURITY.md](./SECURITY.md) for implemented controls, known risks, and
  security requirements.
- See [docs/FRONTEND_REFACTORING.md](./docs/FRONTEND_REFACTORING.md) for the
  incremental refactoring roadmap.
- See [docs/FRONTEND_STRUCTURE.md](./docs/FRONTEND_STRUCTURE.md) for the shallow,
  page-owned file organization convention.
- See [docs/SMOKE_TEST_REPORT.md](./docs/SMOKE_TEST_REPORT.md) for the latest
  browser verification matrix and environment blocker.

Do not cache authenticated API responses in the service worker. Health and
profile data must always be fetched from the network and should be returned by
the backend with `Cache-Control: no-store`.
