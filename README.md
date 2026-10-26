# IronFlow

A pocket strength coach. IronFlow tells you what to lift today and how heavy, then updates your numbers from what you actually logged.

## Features

- **Onboarding:** goal (strength, hypertrophy or fitness), experience level, units, session length, available equipment
- **Auto-calculated weights:** estimates your one-rep max (1RM) with the Epley formula and sets working weights at the right intensity, rounded to the nearest 2.5 kg
- **A/B/C rotation:** builds each day's plan to fit your session time and equipment, and moves to the next day after each workout
- **Bodyweight mode:** swaps barbell lifts for bodyweight alternatives
- **Workout session:** set logging, smart rest timer (longer rest for heavy compound lifts), personal-record detection, and sharing a summary
- **Custom workouts and templates:** build your own session and save it as a template
- **Exercise library:** 1RM calculator, intensity zones, form instructions, custom exercises
- **Progress and history:** strength trend and bodyweight charts, plus a log of past workouts
- **Morning routine and stretching** guides
- **Accounts:** Google sign-in, with data stored per user in Firestore and protected by Security Rules

## Stack

React 19, TypeScript, Vite, Tailwind CSS, Recharts, Motion, Firebase Authentication, Cloud Firestore.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # TypeScript type check
npm run build
```

Firebase settings are in `firebase-applet-config.json`. These are web client settings, not secrets. Access is enforced by `firestore.rules`.

## Project layout

```
src/App.tsx         All screens (onboarding, dashboard, session, library, progress, history, settings)
src/lib/utils.ts    Training logic: 1RM, working weight, plan generation, rest times
src/types.ts        Data model, default exercises, A/B/C plans
src/firebase.ts     Firebase setup
firestore.rules     Per-user access rules and field validation
```

## TODO

The plan is to rebuild IronFlow as an Expo (React Native) app with an Azure-hosted API. The full plan is in [docs/build-plan.md](docs/build-plan.md).

### Fixes in the current web app
- [ ] Working weight always rounds to 2.5, even for users who chose lbs (`calculateTrainingWeight`)
- [ ] `WORKOUT_PLANS` in `types.ts` (A = squat, bench, row) disagrees with `generateWorkoutPlan` (A = squat, then OHP). Keep one source of truth.
- [ ] `WorkoutSession` calls `generateWorkoutPlan` without the bodyweight flag, so bodyweight mode can show barbell lifts
- [ ] Remove the unused `@google/genai` dependency and the AI Studio leftovers (`metadata.json`, `GEMINI_API_KEY` in `.env.example`)
- [ ] Split `App.tsx` (about 2,500 lines) into one file per screen
- [ ] Add unit tests for `src/lib/utils.ts` (Vitest)
- [ ] Code-split the bundle (Vite warns about a chunk over 500 kB)
- [ ] Deploy (Firebase Hosting or Vercel) and add the live link here

### Expo port
- [ ] Move `src/lib/utils.ts` and `src/types.ts` into a shared `packages/domain` with tests
- [ ] Create the Expo app (TypeScript, Expo Router) and rebuild the screens with React Native components
- [ ] Offline-first storage with `expo-sqlite`, synced when online
- [ ] Replace popup Google sign-in with native sign-in, and keep tokens in `expo-secure-store`
- [ ] Charts with a React Native chart library (Recharts is web-only)
- [ ] Rest timer that keeps running in the background, with a local notification when rest ends
- [ ] Node.js API on Azure App Service with Azure Database for PostgreSQL (see the build plan)
- [ ] GitHub Actions CI and an EAS Build Android APK attached to each release
- [ ] README screenshots and an APK download link
