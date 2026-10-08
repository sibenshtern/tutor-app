# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Single-tutor web app: students, visits (lessons, one-off and weekly recurring), per-visit payments, dashboard and analytics. Next.js 15 App Router + Prisma 6 + Postgres (Neon in prod) + Auth.js v5, deployed on Vercel. Design spec: `docs/superpowers/specs/2026-10-07-tutor-app-design.md`. The UI is entirely in Russian — all user-facing strings (labels, buttons, error messages) should stay in Russian; this file and code comments stay in English.

## Commands

```bash
npm run db:up        # local Postgres in Docker on :5433 (databases: tutor, tutor_test)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # create/update the single user from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev
npm test             # unit tests (pure logic, no DB)
npm run test:int     # integration tests against real Postgres (tutor_test); needs db:up
npm run test:e2e     # Playwright: builds and serves on :3100 against tutor_test (desktop + mobile)
npx vitest run tests/unit/money.test.ts -t "rounds"                              # one unit test
npx vitest run -c vitest.integration.config.ts tests/integration/visits.test.ts  # one integration file
npm run typecheck && npm run lint
```

After changing `prisma/schema.prisma` and running a migration, restart `next dev` — Node does not hot-reload the regenerated Prisma Client under `node_modules`, so a long-running dev server will throw "column does not exist" against the new schema until restarted.

## Architecture

- `src/domain/`: pure business rules with no I/O. `visit-rules.ts` covers charging and paid/status rules, `recurrence.ts` produces weekly occurrences in a time zone, `analytics.ts` does aggregation. Change rules here, with unit tests.
- `src/server/`: Prisma-backed services. Functions take `now` so tests are deterministic. Server-component pages call these directly for reads.
- `src/app/api/**`: mutation endpoints only, each wrapped in `route()` from `src/lib/api.ts`. The wrapper checks the session, parses with Zod and maps errors to 400/401/404/409/500 as `{ error, fields? }`.
- `src/validation/`: Zod schemas shared by client forms and route handlers.
- Auth: `src/auth.config.ts` is edge-safe and used by `src/middleware.ts`. `src/auth.ts` has the Credentials provider, which delegates to `src/server/login.ts` (bcrypt + Postgres-backed rate limit). Pages call `requirePageSession()` and handlers call `requireSession()`.

## Invariants that are easy to break

- Money is integer kopecks everywhere. Format only in the UI via `formatRub`. Parse user input with `parseRubles`, which accepts "1 500,50".
- The DB stores UTC. All local interpretation goes through `src/lib/time.ts` with `APP_TIMEZONE`. Clients send local `YYYY-MM-DD` / `HH:MM` strings and the server converts them. Never use server-local `Date` getters in business logic. Date/month labels (`bucketLabel`, `formatDateTime`) use Luxon's `"ru"` locale.
- Only `completed` visits are charged, and paid implies completed (`planVisitUpdate`). `Visit.rateKopecks` is a snapshot, so changing a student's rate never rewrites existing visits.
- Recurring visits are real `Visit` rows generated 8 weeks ahead, extended by the daily cron. `createMany({ skipDuplicates })` on `(seriesId, occurrenceDate)` makes generation idempotent. Editing a series deletes its future `scheduled` visits and regenerates. Archiving a student ends their series.
- `Student` has no `subject` field — the tutor only teaches math, so there's nothing to record per student.
- Integration tests mock only `@/lib/auth-guard`. Never mock the database.

## Deployment

Vercel runs `npm run vercel-build`, which runs `prisma migrate deploy` only when `VERCEL_ENV=production`. Previews must point at a separate Neon branch. Env vars: `DATABASE_URL` (Neon pooled), `DIRECT_URL` (Neon direct), `AUTH_SECRET`, `APP_TIMEZONE`, `CRON_SECRET`. `ADMIN_EMAIL` / `ADMIN_PASSWORD` are only needed when running the seed. A daily cron hits `/api/cron/generate` (`vercel.json`).
