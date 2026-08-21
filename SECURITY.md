# Frontend Security

## Scope

This document covers security behavior in the browser application and its PWA
service workers. Backend authorization, token issuance, uploads, third-party
credentials, and database encryption must be reviewed separately.

## Implemented controls

### Article rendering

Article content is rendered as escaped React text nodes. The supported content
format is plain text with `**bold**` emphasis and line breaks. Do not reintroduce
`dangerouslySetInnerHTML` without a maintained HTML sanitizer and a documented
allowlist.

### Private response caching

Authenticated `/api/v1` responses are not registered with a Workbox caching
strategy. Application startup deletes the legacy `api-cache` created by older
releases. Only static assets and Google font resources are cached.

The backend should additionally return `Cache-Control: no-store` for user,
health, authentication, dashboard, and administration responses.

### Notification navigation

Foreground and background notification destinations are restricted to the
application's current origin. Invalid and external destinations resolve to the
dashboard.

### Browser response headers

`vercel.json` defines CSP, framing restrictions, MIME sniffing protection,
referrer policy, permissions policy, and HSTS. The current CSP permits HTTPS
connections and HTTPS images because the deployment API host and article image
hosts are configurable. Replace these broad directives with explicit production
host allowlists when the final domains are stable.

Inline styles currently require `style-src 'unsafe-inline'`. Removing this
exception depends on the planned styling refactor.

## Authentication storage

Refresh tokens are stored in an `HttpOnly`, `Secure` production cookie. Access
tokens are held in module memory and are not persisted by Zustand or Web
Storage. Refresh requests are single-flight so concurrent 401 responses do not
attempt to rotate the same token more than once.

On the first run after deployment, the frontend can exchange an existing legacy
refresh token for the cookie. It then deletes the old access token, refresh
token, and `vitals-auth` Zustand record regardless of whether migration succeeds.

Cookie-mode authentication requests carry `X-Auth-Transport: cookie`. The
custom header forces a CORS preflight for cross-origin callers, and the backend
also verifies the `Origin` header before setting, rotating, or clearing the
cookie.

## Public configuration

Firebase web configuration and the VAPID public key are intentionally visible
to browsers. Restrict the Firebase API key to the expected APIs and production
origins. Never place Firebase Admin credentials, private keys, database URLs, or
other server secrets in a `VITE_*` variable.

## Security checklist for changes

- Treat API, article, notification, and URL values as untrusted input.
- Avoid HTML injection APIs and dynamic script execution.
- Keep authenticated responses out of Cache Storage.
- Validate external navigation against an explicit allowlist.
- Do not log health data, tokens, notification payloads, or user profiles.
- Do not persist authentication tokens in Web Storage.
- Enforce authorization on the backend, regardless of frontend route guards.
- Review CSP changes whenever adding an external script, image, font, worker, or
  API host.
