# Frontend Smoke-Test Report

Date: 2026-08-08

## Scope

This pass verified the refactored Profile, My Care, and Mother & Baby routes,
plus the shared authenticated application shell. The production build and PWA
generation were also rerun after the browser checks.

## Environment result

- The Vite development server started and served the application successfully.
- The public login screen rendered meaningful content with no Vite error
  overlay.
- Firebase Admin and Redis connected during backend startup.
- Backend startup was blocked because the configured Supabase pooler rejected
  the database tenant/user. Consequently, real login and API/database
  integration could not be completed with this environment.

Because the configured database is remote, no reset, profile update, mood log,
symptom check, notification registration, or file upload was submitted.
Protected routes were rendered with non-persistent fixtures injected only into
the automated browser. No application files or remote records were used for
those fixtures.

## Verification matrix

| Area | Result | Notes |
| --- | --- | --- |
| Public login shell | Pass | Page content, form controls, and error-overlay check passed. |
| Real seeded-user login | Blocked | Local backend could not start because of the invalid database tenant configuration. |
| Dashboard and application shell | Pass with browser fixtures | Navigation, quick actions, task card, usage, and mood insight rendered. |
| My Care timeline | Pass with browser fixtures | Timeline heading, empty event state, and refresh control rendered. |
| Medications tab | Pass with browser fixtures | Empty state and add-medication controls rendered. |
| Symptom checker | Pass with browser fixtures | New-check validation and history empty state rendered; no check was submitted. |
| Drug identification | Pass with browser fixtures | New-scan and history states rendered. Invalid file type was rejected before upload. |
| Pregnancy timeline | Pass with browser fixtures | Week summary, guidance, milestones, ANC visit, and reset control rendered. |
| Mood logger | Pass with browser fixtures | Mood/craving options rendered and selection enabled the submit control; no log was submitted. |
| Baby profile | Pass with browser fixtures | Setup form rendered; no profile was created. |
| Profile overview | Pass with browser fixtures | Account, completion, collapsible settings, and usage sections rendered. |
| Profile edit/cancel | Pass with browser fixtures | Edit fields rendered and cancel returned to view mode without a request. |
| Notification permission | Not submitted | The settings section and Enable control rendered; browser permission was not requested. |
| Reset confirmations | Not submitted | Destructive reset actions were intentionally not confirmed. |
| Browser page errors | Pass after fix | The final browser error list was empty. |
| Browser console | Pass after fix | The final console check was empty after clearing prior diagnostics and navigating again. |
| Production build | Pass | TypeScript, Vite, and PWA generation completed; 97 modules transformed. |

## Finding corrected during the pass

`AppShell` included an `@media` rule inside a React inline-style object. React
reported it as an unsupported style property on every protected route. The
invalid property was removed; the existing component-level stylesheet already
contains the correct desktop/mobile media rules.

## Required follow-up

Replace or correct the development `DATABASE_URL`, then rerun the real
authentication and API-backed portions of this matrix. Use a dedicated local or
test database before exercising mutations.
