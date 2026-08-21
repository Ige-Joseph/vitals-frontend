# Frontend File Organization

## Principle

Keep the structure shallow and organize code by the screen or feature that owns
it. A file should be extracted when it represents a meaningful responsibility,
not merely because a component exists.

## Route pages

Small route pages can remain as a single file in `src/pages`. A route should get
its own folder when it mixes several substantial responsibilities or becomes
difficult to scan.

The profile and My Care pages are reference structures:

```text
src/pages/profile/
  ProfilePage.tsx       API orchestration, page state, and composition
  ProfileOverview.tsx   Account, completion, notification, calendar, usage cards
  ProfileDetails.tsx    Health-profile view and edit sections
  ProfileControls.tsx   Controls used only by the profile screen
  profile.types.ts      Profile API and form types
  profile.utils.ts      Pure mapping, formatting, and payload functions

src/pages/my-care/
  MyCarePage.tsx        Route tabs and feature composition
  SymptomChecker.tsx    Symptom check and its history
  DrugDetection.tsx     Image selection, identification, and scan history
  my-care.types.ts      Types shared by those page-owned features

src/pages/mother-baby/
  MotherBabyPage.tsx      Tabs, pregnancy lifecycle, and page-level feedback
  PregnancySection.tsx   Pregnancy setup and timeline presentation
  MoodLogger.tsx         Mood/craving logging and recent history
  BabySection.tsx        Baby setup, reset, and vaccination timeline
  mother-baby.types.ts   Pregnancy, mood, and baby API types
```

These folders deliberately have no barrel file, nested `components` directory,
or one-file-per-control layout. Add those layers only when actual reuse or file
growth makes the extra navigation worthwhile.

## Extraction rules

Extract code when at least one of these is true:

- It is a cohesive section of a large route.
- It has its own meaningful props or behavior.
- It is a pure mapping or formatting concern that can be understood separately.
- It is reused within the same page and would otherwise be duplicated.

Keep code in the parent file when:

- It is a short, one-use fragment.
- Extraction would require passing most of the parent's state through props.
- The resulting file would be a generic wrapper without domain meaning.

Page-specific components stay beside their page. Move something to
`src/components` only when it is genuinely shared across routes. Avoid barrel
files; direct imports make ownership and dependencies easier to follow.

## Page coordinator responsibilities

A route-level page may own:

- initial data loading;
- mutation handlers;
- page-level success and error messages;
- edit/cancel state;
- composition of its sections.

It should not contain large form markup, repeated controls, formatting maps, or
inline asynchronous handlers buried deep inside JSX.

Shared UI wrappers should accept the native attributes of the element they
render. For example, `Card` accepts standard `<div>` attributes so page-owned
dialogs can provide `role` and `aria-*` metadata without weakening the shared
component boundary.
