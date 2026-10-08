# Tutor App — Design Spec

Date: 2026-10-07

## Purpose

A web app for a single tutor to track students, schedule and mark
tutoring visits (sessions), track payments, and view analytics on
visits and money. There is exactly one user (the tutor); no
multi-tenant support is needed.

## Success Criteria

- The tutor can add/edit/archive students with full profile info.
- The tutor can schedule one-off visits and weekly recurring visits,
  then mark each visit's status (completed / cancelled / no-show).
- The tutor can track whether each completed visit has been paid for.
- The tutor can see revenue-over-time and per-student breakdown
  analytics, with numbers that match the underlying visits exactly.
- The app works on desktop and phone (responsive) and is reachable
  over the internet behind a login.

## Non-Goals

- Multi-tutor / multi-tenant support.
- Invoicing or running balances (payment is tracked per visit).
- Prepayment for future visits.
- Calendar view and external calendar sync (v1 is list views only).
- Payment processing (the app records payments; no money moves).
- Multiple currencies.

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript). UI plus Route
  Handlers for the API; no separate backend service.
- **Database:** PostgreSQL on Neon.
- **ORM:** Prisma.
- **Auth:** Auth.js (NextAuth v5) with the Credentials provider
  (email + bcrypt-hashed password), JWT sessions. Single user.
- **Styling:** Tailwind CSS, mobile-first responsive layouts.
- **Validation:** Zod schemas shared by client forms and Route
  Handlers.
- **Hosting:** Vercel, auto-deploying from the git repository.
- **Scheduled jobs:** Vercel Cron (one daily job, see Recurring
  Visits).

Vercel hosts only application code. Data lives in Neon and is
reachable only through the app's authenticated API.

## Conventions

- **Money:** stored as integer kopecks (`Int`), never floats or
  Decimal. Currency is RUB (₽) only. Formatting to rubles happens in
  the UI layer only.
- **Time:** all timestamps stored in UTC. The tutor's time zone comes
  from the `APP_TIMEZONE` environment variable (default
  `Europe/Moscow`). Every date-based display, grouping (day / week /
  month / year), and recurring-visit generation uses that time zone,
  never the server's (Vercel runs in UTC). Weeks start on Monday.

## Data Model

```prisma
model User {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
  name         String
}

model Student {
  id                  String  @id @default(cuid())
  name                String
  contact             String?
  subject             String?
  hourlyRateKopecks   Int              // current rate, used for new visits
  notes               String?
  guardianContact     String?
  schedulePreferences String?
  active              Boolean @default(true)
  visits              Visit[]
  series              RecurringSeries[]
}

model RecurringSeries {
  id              String    @id @default(cuid())
  studentId       String
  student         Student   @relation(fields: [studentId], references: [id], onDelete: Restrict)
  weekday         Int       // 1 = Monday … 7 = Sunday, in APP_TIMEZONE
  startTime       String    // "HH:MM" local time in APP_TIMEZONE
  durationMinutes Int
  startDate       DateTime  // first eligible local date
  endDate         DateTime? // last eligible local date; null = open-ended
  active          Boolean   @default(true)
  visits          Visit[]
}

model Visit {
  id                String           @id @default(cuid())
  studentId         String
  student           Student          @relation(fields: [studentId], references: [id], onDelete: Restrict)
  seriesId          String?
  series            RecurringSeries? @relation(fields: [seriesId], references: [id], onDelete: SetNull)
  occurrenceDate    DateTime?        // local date this series occurrence belongs to
  scheduledAt       DateTime
  durationMinutes   Int
  status            VisitStatus      @default(scheduled)
  notes             String?
  rateKopecks       Int              // hourly rate snapshotted at creation
  amountDueKopecks  Int              // round(rateKopecks * durationMinutes / 60)
  paid              Boolean          @default(false)
  paidAt            DateTime?

  @@unique([seriesId, occurrenceDate])
  @@index([scheduledAt])
  @@index([studentId])
}

enum VisitStatus {
  scheduled
  completed
  cancelled
  no_show
}
```

Students are archived (`active = false`), never deleted while they
have visits (`onDelete: Restrict`).

## Money Rules

- `rateKopecks` is copied from the student's `hourlyRateKopecks` when
  the visit is created and never changes afterward, so later rate
  changes don't rewrite history.
- `amountDueKopecks = round(rateKopecks × durationMinutes / 60)`.
  It's recalculated whenever `durationMinutes` changes, always using
  the visit's own `rateKopecks`.
- **Only `completed` visits are charged.** Cancelled, no-show, and
  still-scheduled visits count as zero toward owed and earned totals.
- `paid` can be set only on a `completed` visit; setting it stamps
  `paidAt` (now, editable). Unmarking clears `paidAt`.
- A paid visit can't move away from `completed`. The UI requires
  unmarking paid first, and the server rejects the change.
- **Owed** = sum of `amountDueKopecks` over completed, unpaid visits.

## Visit Status Transitions

- `scheduled` → `completed` | `cancelled` | `no_show`
- Any non-scheduled status can be corrected back to `scheduled` or to
  another status, subject to the paid rule above.
- No restriction on marking a future visit (the tutor may correct
  mistakes), but the dashboard highlights past visits still
  `scheduled` as "needs marking".

## Recurring Visits

- A series means "this student, every <weekday> at <startTime> for
  <durationMinutes>", from `startDate` to optional `endDate`.
- **Generation:** visits are materialized as ordinary `Visit` rows
  up to 8 weeks ahead (the horizon). Generation runs when a series is
  created or edited, and daily via a Vercel Cron job that extends
  every active series' horizon.
- **Idempotent:** generation upserts on `(seriesId, occurrenceDate)`,
  so re-running the job never creates duplicates.
- **Single-occurrence edits:** a generated visit is a normal visit
  and can be edited, cancelled, or completed on its own. Cancelling
  one occurrence keeps its row (status `cancelled`), so generation
  doesn't recreate it.
- **Editing a series** (time, weekday, duration): deletes the
  series' future visits that are still `scheduled`, then
  regenerates. Visits in the past or with any other status are kept.
  The UI warns that individual edits to future occurrences will be
  replaced.
- **Ending a series** (set `endDate` or deactivate): deletes future
  `scheduled` visits beyond the end; history is kept.
- The Cron endpoint is protected by Vercel's `CRON_SECRET` bearer
  token.

## Pages / Features

- **Login**: email + password.
- **Dashboard**: upcoming visits (next 7 days), past visits still
  `scheduled` ("needs marking"), total owed, this month's earned and
  received.
- **Students**
  - List: search by name, filter active/archived.
  - Detail: profile + edit, recurring series for the student
    (create/edit/end), visit history, totals (completed visits,
    hours, earned, paid, owed).
- **Visits**
  - List: filter by student, status, date range, paid/unpaid.
  - Create/edit a one-off visit.
  - Quick actions per row: mark completed / cancelled / no-show,
    toggle paid.
- **Analytics**
  - Revenue over time, period selectable (week / month / year),
    showing two series:
    - **Earned**: completed visits' `amountDueKopecks`, grouped by
      `scheduledAt` (local time zone).
    - **Received**: paid visits' `amountDueKopecks`, grouped by
      `paidAt` (local time zone).
  - Per-student table: completed visits, hours taught, earned, paid,
    owed, attendance rate.
  - **Attendance rate** = completed ÷ (completed + no_show). Scheduled
    and cancelled visits are excluded. Shown as "—" when the
    denominator is 0.

## Security

- No sign-up page. The single user is created by a seed script from
  the `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables.
- Middleware requires an authenticated session for every page and
  Route Handler except the login page, auth endpoints, and the Cron
  endpoint (which checks `CRON_SECRET`). Route Handlers re-check the
  session too, so they never rely on middleware alone.
- Login attempts are rate-limited (e.g. 5 failures per 15 minutes per
  IP and per email), tracked in a Postgres table.

## Error Handling

- Zod validation on the client for immediate feedback; identical
  re-validation on the server in every Route Handler.
- Route Handlers return a consistent error shape:
  `{ error: string, fields?: Record<string, string> }`.
- Business-rule violations (e.g. changing a paid visit's status)
  return 409 with a clear message.
- UI shows field errors inline and request failures as toasts.

## Testing Strategy

- **Unit tests (Vitest):** amount calculation and rounding; charge
  and owed rules by status; paid/status rule enforcement; recurring
  occurrence generation (time zone correctness, DST-free Moscow plus
  one DST zone to prove the logic, idempotency, series edit/end);
  analytics aggregation (earned vs. received grouping, local-time-zone
  bucketing at day boundaries, attendance rate including zero
  denominator).
- **Integration tests:** Route Handlers against a real Postgres (a
  local Docker container or a Neon test branch), never mocked, to
  cover validation, auth rejection, and 409 rules.
- **End-to-end (Playwright):** login; create student; create a
  recurring series and see generated visits; complete a visit and
  mark it paid; analytics totals match the seeded data.

## Deployment

- Git remote (e.g. GitHub) connected to a Vercel project; pushes to
  `main` deploy to production, and other branches get preview deploys.
- Neon connection strings as Vercel env vars: `DATABASE_URL` (pooled,
  for the app) and `DIRECT_URL` (direct, for migrations).
- `prisma migrate deploy` runs **only on production builds**
  (`VERCEL_ENV=production`). Preview deploys use a separate Neon
  branch database so they can never touch production data.
- Other env vars: `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  (seed only), `APP_TIMEZONE`, `CRON_SECRET`. None are committed.
- Backups: Neon's built-in point-in-time restore. A CSV export of
  students and visits is a possible later addition, not in v1.
