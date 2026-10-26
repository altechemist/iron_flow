# IronFlow build plan

## Why this project exists

IronFlow is the portfolio project that fills two gaps on the CV:

- **Mobile:** there was no standalone, shipped React Native app on GitHub.
- **Azure:** AZ-900 and DP-900 needed hands-on proof.

The current React web app in this repo is the working prototype. The Expo app reuses its domain rules (`src/lib/utils.ts`, `src/types.ts`), and the screens are rebuilt in React Native.

The repo stays private until milestone 5 is done. Then it goes public, gets pinned, and is added to the CV.

## Product

IronFlow is a pocket strength coach. You open it at the gym and it tells you what to lift today and how heavy. You log your sets, and it adjusts next session's weights.

Core loop:

1. **Onboarding:** goal (strength, hypertrophy or fitness), experience level, units (kg or lb), available equipment, session length, and a starting estimate for each main lift.
2. **Today:** shows the next A/B/C day, with exercises chosen to fit your time and equipment and working weights already calculated.
3. **Session:** log weight and reps per set, with a rest timer sized to the lift and intensity.
4. **Finish:** updates your estimated 1RMs, marks personal records, and moves the rotation on to the next day.
5. **Progress:** 1RM trend per lift, weekly volume, and a bodyweight chart.

Out of scope for v1: social features, AI coaching, wearables, and an iOS store release. iOS still runs in Expo Go for demos.

## Domain rules (from `src/lib/utils.ts`)

| Rule | Source behaviour | v1 decision |
|---|---|---|
| 1RM estimate | Epley: `w × (1 + reps/30)`, with 1 rep = w and 0 reps = 0 | Keep. Cap at 12 reps for estimates, because Epley drifts above that. |
| Working weight | `round(1RM × intensity / 2.5) × 2.5` | Make the rounding increment unit-aware: 2.5 kg, or 5 lb. **Bug in the source:** lb users get rounded in 2.5 steps. |
| Intensity | Per exercise, as a range `[min, max]` of 1RM | Use the min on the first session at a weight, and step towards the max when all sets hit the target reps. |
| Progression | More reps than target means increase, equal means maintain, fewer means reduce | Keep, with explicit steps: +2.5 kg on upper-body compounds, +5 kg on lower, and a 10% deload after 3 missed sessions. |
| Rest | Compound at ≥85%: 180 s; ≥75%: 120 s; otherwise 90 s. Isolation: 60 s. | Keep. |
| Plan generation | Primary compound and secondary compound, then other compounds, then isolations, as time allows (4 min per compound set, 2 min per isolation set) | Keep. **Bug in the source:** `WORKOUT_PLANS` (A = squat/bench/row) disagrees with `generateWorkoutPlan` (A = squat then OHP). Use one source of truth, a rotation table in the domain package. |
| Bodyweight mode | Maps each barbell lift to a bodyweight alternative | Keep the mapping. Progress by reps instead of load. |
| Rotation | A → B → C → A after each completed session | Keep. Skipped days don't advance the rotation. |

All of this lives in a pure TypeScript package with no React and no I/O, so it's fully unit-tested and shared by the app and the API.

## Architecture

```
apps/mobile      Expo (React Native, TypeScript, Expo Router), SQLite via expo-sqlite, offline-first
apps/api         Node.js + Express (TypeScript), REST + OpenAPI 3.1, JWT auth
packages/domain  Pure rules above, shared by mobile and API
infra/           Azure Bicep templates
.github/         CI/CD workflows
```

- **Offline-first:** the phone is the source of truth during a session. Workouts are written to SQLite immediately and synced to the API when online. Sync is push and pull with `updatedAt` timestamps and a per-device change log. Conflicts are rare because each user only writes their own data; the rule is last-write-wins per record.
- **Auth:** email and password, with bcrypt on the API, a short-lived JWT access token, and a refresh token in `expo-secure-store`. The app works fully without an account. Signing in only turns on backup and sync across devices.
- **Database:** PostgreSQL tables `users`, `profiles`, `exercises`, `workouts`, `sets`, `body_weights`, `refresh_tokens`. Migrations use a migration tool such as node-pg-migrate or Drizzle; decide at milestone 3.

## Azure (free or low tiers; set a budget alert of about R200 a month first)

| Need | Service |
|---|---|
| API hosting | Azure App Service, Linux, B1 (or F1 for the demo) |
| Database | Azure Database for PostgreSQL Flexible Server, Burstable B1ms (use the 12-month free-tier hours) |
| Secrets | Key Vault, read by the App Service's managed identity (no secrets in app settings) |
| Monitoring | Application Insights: request traces, failures, and a dashboard screenshot for the README |
| Infrastructure as code | Bicep in `infra/`, deployed from GitHub Actions with OIDC federated credentials (no stored client secret) |

This maps directly onto AZ-900 topics (core services, identity, governance, cost management) and DP-900 topics (relational data on Azure), so it's easy to talk through in interviews.

## CI/CD (GitHub Actions)

- **On every PR:** lint, typecheck, domain unit tests with a coverage gate of at least 90%, and API tests (Jest + Supertest against a Postgres service container).
- **On merge to `main`:** build the API container, deploy to App Service, and run a smoke test against `/health`.
- **On tag `v*`:** EAS Build produces an Android APK and attaches it to the GitHub release. The Play Store internal testing track comes later.

## Milestones

| # | Deliverable | Done when |
|---|---|---|
| 1 | `packages/domain` with all rules above | Every row in the rules table has tests, both source bugs are fixed and covered by a test, and CI is green |
| 2 | Offline Expo app | Onboarding → Today → Session → Finish → Progress works in airplane mode on a real Android phone |
| 3 | API and Postgres | Auth, sync endpoints, OpenAPI spec, Supertest suite, and it runs locally with `docker compose up` |
| 4 | Azure and CI/CD | Bicep deploys a clean environment, merging to `main` deploys the API, a live `/docs` URL is up, and the budget alert is set |
| 5 | Polish and release | README with screenshots, architecture diagram, live API docs, APK download, and a design-decisions section. Then the repo goes public, gets pinned, and goes on the CV. |

Aim for one milestone per week alongside job applications. Each milestone is a reasonable size for a single build session.

## CV line (fill in the real numbers at release)

> **IronFlow:** offline-first strength-training app that calculates working weights and tracks progression. React Native (Expo) app with a Node.js API on Azure App Service and Azure PostgreSQL, deployed through GitHub Actions. *(N tests, APK download)*
