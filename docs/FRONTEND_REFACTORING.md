# Frontend Refactoring Roadmap

## Objective

Reduce security risk and make features independently testable without replacing
the application in one rewrite. Each phase should remain deployable and preserve
the backend API contract unless the phase explicitly coordinates a contract
change.

## Completed security baseline

- Removed unsanitized article HTML rendering.
- Removed Workbox caching for authenticated API responses.
- Added startup cleanup for the legacy private API cache.
- Restricted notification links to same-origin destinations.
- Removed user and notification payload debug logging.
- Added Vercel browser-security headers.
- Migrated refresh tokens to an HttpOnly cookie.
- Migrated access tokens to memory-only storage.
- Added single-flight token refresh and consistent upload retry behavior.
- Added one-time cleanup and migration of legacy Web Storage sessions.

## Completed Phase 1: authentication contract

The frontend and backend now use secure HttpOnly refresh cookies and in-memory
access tokens. `src/lib/api.ts` and `src/store/auth.store.ts` use a shared session
abstraction with:

- single-flight token refresh;
- consistent refresh behavior for JSON and file-upload requests;
- explicit session-expired events;
- defensive JSON and non-JSON error parsing;
- request cancellation and timeouts where useful;
- no token persistence in Web Storage;
- explicit origin validation on backend cookie-authentication requests.

Backend compatibility with the old response-body refresh token remains
temporary so deployments can migrate safely. Remove it after all supported
frontend versions have adopted cookie transport.

## Phase 2: frontend foundations

Add shared domain types, hooks, and feature-specific API modules when at least
two screens need them or when a route's request lifecycle becomes difficult to
follow. Do not migrate the whole application into a speculative architecture.

Current target shape:

```text
src/
  components/   Components genuinely shared by multiple routes
  hooks/        Shared application hooks
  lib/          API, session, and browser infrastructure
  pages/
    SmallPage.tsx
    large-page/ Cohesive modules owned by one large route
  store/        Application-wide client state only
```

Introduce an error boundary and consistent loading, empty, and error states.
Avoid adding a second global state store for data owned by the server.

## Phase 3: split large screens

Refactor in descending risk and size:

1. **Completed:** `ProfilePage.tsx` is now a page coordinator with separate
   overview, health-details, controls, types, and pure utilities in
   `src/pages/profile`.
2. **Completed:** `MyCarePage.tsx` now coordinates tabs while symptom checking,
   drug identification, their histories, and shared types live in
   `src/pages/my-care`.
3. **Completed:** `MotherBabyPage.tsx` is now a page coordinator with pregnancy,
   mood, and baby workflows in separate page-owned modules. Its baby plan/event
   API boundary no longer uses `any`.
4. `DashboardPage.tsx`: queries, task actions, activity, and summary cards.
5. Medication modals and the AI medication assistant.

Keep route components focused on composition. Move request state into hooks,
validation into schemas or pure functions, and repeated presentation into small
components.

## Phase 4: styling and accessibility

Move repeated inline style objects into the established styling system while
preserving design tokens. This will make a stricter CSP possible by eventually
removing `style-src 'unsafe-inline'`.

Review modal focus trapping, keyboard navigation, semantic buttons and links,
form error association, reduced-motion behavior, and notification permission
messaging.

## Phase 5: quality gates

- Install and configure the ESLint toolchain referenced by `npm run lint`.
- Enable stricter unused-code checks after removing dead files.
- Add unit tests for utilities and hooks.
- Add component tests for forms and destructive actions.
- Add end-to-end coverage for authentication, medication creation, care-event
  completion, pregnancy/baby setup, admin authorization, and article rendering.
- Run production builds and dependency audits in CI.

## Definition of done for each feature

- No `any` at API or domain boundaries.
- API calls are isolated from presentation components.
- Loading, empty, error, and success states are visible and testable.
- Authorization assumptions are documented and enforced by the backend.
- Sensitive responses are not stored by the PWA.
- Tests cover the primary user flow and security regression relevant to the
  feature.
