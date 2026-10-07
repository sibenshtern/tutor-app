# Tutor App — Design Spec

Date: 2026-10-07

## Purpose

A web app for a single tutor to track students, mark tutoring visits
(sessions), track payments, and view analytics on visits and money
earned. There is exactly one user (the tutor); no multi-tenant support
is needed.

## Success Criteria

- The tutor can add/edit/archive students with full profile info.
- The tutor can schedule visits ahead of time and mark their status
  (completed / cancelled / no-show) after the fact.
- The tutor can track whether each visit has been paid for.
- The tutor can see revenue-over-time and per-student breakdown
  analytics.
- The app is reachable from any device (desktop or phone) over the
  internet, behind a login.

## Non-Goals

- Multi-tutor / multi-tenant support.
- Invoicing or running balances across visits (payment status is
  tracked per-visit, not as an accumulating ledger).
- Calendar sync with external calendar providers.
- Payment processing (no real money moves through the app — it only
  records whether a visit was paid).

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript) — serves both the UI
  and the API via Route Handlers. No separate backend service.
- **Database:** PostgreSQL, hosted on Neon (managed, serverless-friendly
  Postgres).
- **ORM:** Prisma — schema definition, migrations, and query layer.
- **Auth:** NextAuth with the Credentials provider (email + hashed
  password). Single user; no OAuth providers needed.
- **Styling:** Tailwind CSS.
- **Hosting:** Vercel, deployed from the git repository. Every push to
  main triggers a build + deploy.
- **Validation:** Zod schemas shared between client forms and server
  Route Handlers.

Vercel hosts only application code; actual data lives in Neon Postgres
and is reachable only through the app's own authenticated API, so
hosting choice does not affect data privacy.

## Data Model

```
User
  id            String  @id @default(cuid())
  email         String  @unique
  passwordHash  String
  name          String

Student
  id                   String   @id @default(cuid())
  name                 String
  contact              String?   // phone/email
  subject              String?
  hourlyRate           Decimal   // current rate, used for new visits
  notes                String?
  guardianContact      String?
  schedulePreferences  String?
  active               Boolean   @default(true)
  visits               Visit[]

Visit
  id               String    @id @default(cuid())
  studentId        String
  student          Student   @relation(fields: [studentId], references: [id])
  scheduledAt      DateTime
  durationMinutes  Int
  status           VisitStatus @default(scheduled) // scheduled | completed | cancelled | no_show
  notes            String?
  amountDue        Decimal     // snapshotted from student.hourlyRate at creation time
  paid             Boolean     @default(false)
  paidAt           DateTime?
```

`amountDue` is captured on the `Visit` at creation time rather than
computed live from `Student.hourlyRate`. This keeps historical
analytics (past revenue) accurate even if the student's rate changes
later.

## Pages / Features

- **Login** — email + password, single user.
- **Dashboard** — upcoming scheduled visits, total outstanding
  (unpaid) amount, at-a-glance stats.
- **Students**
  - List view: search/filter by active/archived.
  - Detail view: full profile, edit form, visit history for that
    student, totals (visits, paid, owed).
- **Visits**
  - List/calendar view: filter by student, status, date range.
  - Create/edit a visit (student, date/time, duration, notes).
  - Mark status (completed / cancelled / no-show).
  - Toggle paid/unpaid.
- **Analytics**
  - Revenue over time: chart, selectable period (week / month / year).
  - Per-student breakdown: table of total visits, hours, amount paid,
    amount owed, attendance rate (completed vs. scheduled/no-show).

## Error Handling

- All form input is validated with Zod on the client (immediate
  feedback) and re-validated identically on the server inside each
  Route Handler — client-side validation is never trusted alone.
- Route Handlers return a consistent typed error shape
  (`{ error: string, fields?: Record<string, string> }`) on failure.
- The UI surfaces field-level errors inline on forms and
  request-level failures (network/server errors) via toast
  notifications.

## Testing Strategy

- **Unit tests (Vitest):** business logic that is easy to get subtly
  wrong — amount-due calculation/snapshotting, visit status
  transitions, analytics aggregation (revenue rollups, per-student
  totals, attendance rate).
- **End-to-end tests (Playwright):** a small set of tests covering the
  core flows only — login, create a student, schedule and complete a
  visit, mark a visit paid, view analytics and confirm the numbers
  reflect seeded data.
- No exhaustive UI/component unit testing — effort concentrates on
  logic where a bug would silently produce wrong money or stats.

## Deployment

- Repository pushed to a git remote (e.g. GitHub); Vercel project
  connected to that repo, auto-deploying on push to `main`.
- Neon Postgres provisioned separately; connection string stored as a
  Vercel environment variable (`DATABASE_URL`), never committed.
- Prisma migrations run as part of the Vercel build step
  (`prisma migrate deploy`).
