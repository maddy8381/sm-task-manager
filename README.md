# Task Board

A personal, Jira-style weekly kanban board. Three status columns (To Do / In
Progress / Done), each split into Mon–Sun day-sections with today pinned to
the top. Tasks carry a priority (color-coded stripe) and free-form labels.
When a week ends, unfinished tasks roll forward into the new week
automatically (with a banner telling you what moved), and finished weeks
become permanent, browsable archives under `/archive`. Light/dark theme
toggle included.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Prisma 7 + Postgres (via `@prisma/adapter-pg`)
- `@dnd-kit` for drag-and-drop between day-sections/columns
- No auth — this is meant for a single user

## 1. Get a Postgres database

Use a free hosted Postgres instance — [Neon](https://neon.tech) or
[Supabase](https://supabase.com) both work. Create a project and copy the
connection string (it should look like
`postgresql://user:password@host/db?sslmode=require`).

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in `DATABASE_URL`:

```bash
cp .env.example .env
```

## 3. Install dependencies and create the schema

```bash
npm install
npx prisma migrate dev --name init
```

This creates the `Task` table and generates the Prisma client into
`src/generated/prisma` (already gitignored).

## 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How the weekly rollover works

There's no cron job. Every time the board loads, the server compares each
task's stored week against the current week (computed from the date your
browser reports, not the server's, so day boundaries match your local
midnight). Any task not marked Done that belongs to a past week is pulled
forward into today's section of the current week. Done tasks are left where
they are, which is what makes a past week's archive permanent — visit
`/archive` to browse every completed week by date range.

## Architecture

### Why Neon + Prisma?

I went with **Neon** (free hosted Postgres) because I wanted the data to persist
across devices and sessions without running a local database. **Prisma** is my ORM
of choice — type-safe queries, migrations just work, and the generated client
auto-types everything so I don't have to hand-write DB interfaces.

**Prisma 7** requires an explicit driver adapter (`@prisma/adapter-pg`), which
is a bit more setup than old versions but keeps things modular. The build script
handles client generation via `postinstall` and `prisma generate && next build`,
so Vercel always has the generated code even though `src/generated/prisma/` is
gitignored.

### Backend Data Flow

```
Browser (Next.js client)
    ↓ (HTTP: GET /api/tasks?today=2026-08-03)
Next.js API Route (src/app/api/tasks/route.ts)
    ↓ (Prisma query)
Prisma Client (src/lib/prisma.ts) + @prisma/adapter-pg
    ↓ (SQL)
Neon Postgres
    ↓ (result set)
serialize to JSON + return HTTP 200
    ↓ (HTTP response)
Browser renders the board
```

### Key Backend Files

**Database & ORM:**
- `prisma/schema.prisma` — Defines the `Task` table (id, title, description, status, priority, labels, day, weekStart, createdAt, updatedAt). Also has the `TaskStatus` and `TaskPriority` enums.
- `prisma/migrations/` — Schema change history. Every `prisma migrate` creates a new folder here so we can roll back if needed.
- `src/lib/prisma.ts` — Singleton Prisma client. Instantiated once with the PrismaPg adapter and reused across all routes to avoid connection leaks.

**Business Logic:**
- `src/lib/week.ts` — Pure date utilities (no DB calls). Converts between JS `Date` objects and `YYYY-MM-DD` strings, finds Monday of a week, etc. Shared by API and frontend so they never disagree on "today."
- `src/lib/rollover.ts` — The lazy week-rollover: when the board loads, this checks if a new week has started. If so, it moves any non-Done tasks from past weeks into today's section of the current week. Returns a count so the frontend can show a "X tasks rolled over" banner.
- `src/lib/task-input.ts` — Input validation (priority enum, labels array). Normalizes labels: trims, dedupes case-insensitively, caps 8 per task. Used by both POST and PATCH to prevent garbage in the DB.
- `src/lib/serialize.ts` — Converts Prisma task objects (with `Date` fields) to JSON (with `YYYY-MM-DD` strings). One function, consistent across all endpoints.

**API Routes:**
- `src/app/api/tasks/route.ts`
  - `GET ?today=YYYY-MM-DD` — Fetches current week + triggers rollover. Returns `{ weekStart, rolledOver, tasks }`.
  - `POST` — Creates a task. Validates title, status, priority, labels, day. Returns the created task.
- `src/app/api/tasks/[id]/route.ts`
  - `PATCH` — Updates a task. Validates each field independently (you can update just the priority without touching the title). Returns updated task.
  - `DELETE` — Deletes a task. Returns 204 No Content.
- `src/app/api/weeks/route.ts`
  - `GET ?today=YYYY-MM-DD` — Lists all past weeks (for the archive). Returns `{ weeks: [{ weekStart, total, done }, ...] }` sorted newest first.
- `src/app/api/weeks/[weekStart]/route.ts`
  - `GET` — Fetches a specific archived week's tasks (read-only board view). Returns `{ weekStart, tasks }`.

### Frontend Integration

- `src/lib/api.ts` — HTTP client. Wraps `fetch()` calls for all routes. Makes sure errors are parsed and typed.
- `src/components/Board.tsx` — Main board. Calls `fetchCurrentWeek()` on load, handles drag-and-drop by calling `updateTask()`, shows the rollover banner, theme toggle.
- `src/components/TaskModal.tsx` — Create/edit form. Collects title, description, status, priority, labels, day. Calls `createTask()` or `updateTask()`.
- `src/app/archive/page.tsx` — Lists past weeks via `fetchWeeks()`.
- `src/app/archive/[weekStart]/page.tsx` — Displays a past week's board (server-rendered, read-only).

### Data Model

```typescript
Task {
  id: string (cuid)
  title: string
  description: string | null
  status: "TODO" | "IN_PROGRESS" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH"
  labels: string[] (up to 8, each ≤24 chars)
  day: Date (calendar date; stored as @db.Date)
  weekStart: Date (Monday of the week; used for grouping & archive)
  createdAt: DateTime
  updatedAt: DateTime
}
```

The `day` and `weekStart` fields are kept in sync server-side (whenever you create or move a task, if you change `day`, `weekStart` is recalculated). This lets the archive and rollover logic just query by `weekStart` without recalculating it every time.

### Why No Auth?

This is a single-user personal tool. If you ever want to share it or deploy it publicly, adding auth is straightforward: just add a session check at the top of each API route (e.g., via a `auth.ts` middleware that reads a cookie). For now, treat the URL as the secret.

## Project structure

- `prisma/schema.prisma` — the `Task` model (title, description, status, priority, labels, day, weekStart)
- `src/lib/week.ts` — UTC-safe calendar-date math shared by client and server
- `src/lib/rollover.ts` — the lazy week-rollover logic described above
- `src/app/api/tasks`, `src/app/api/weeks` — REST-ish route handlers
- `src/components/Board.tsx` — the interactive current-week board
- `src/app/archive/**` — read-only history of past weeks

## Deploying

Push to a Git repo and import it on [Vercel](https://vercel.com/new), setting
`DATABASE_URL` as an environment variable there too. No other config needed.
