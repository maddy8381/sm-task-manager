# Task Board

A personal, Jira-style weekly kanban board. Three status columns (To Do / In
Progress / Done), each split into Mon–Sun day-sections with today pinned to
the top. Tasks carry a priority (color-coded stripe) and free-form labels.
When a week ends, unfinished tasks roll forward into the new week
automatically (with a banner telling you what moved), and finished weeks
become permanent, browsable archives under `/<workspace>/archive`. Light/dark
theme toggle included.

Two fully separate boards live side by side — **Job** (`/job`) and
**Personal** (`/personal`) — switchable via tabs in the header. Each has its
own columns, weekly rollover, and archive; nothing is shared between them
except the UI chrome. Board data is cached client-side (TanStack Query), so
switching tabs after the first visit is instant instead of re-fetching.

The To Do column also has a **Backlog** — a bucket above the day-sections for
tasks with no specific day yet. Drag one onto a day (or a real day-task back
into the Backlog) whenever you're ready to schedule it. Backlog is To Do
only; it's not part of any week, so it never rolls over and never gets
archived — it just sits there until you give it a day.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Prisma 7 + Postgres (via `@prisma/adapter-pg`)
- TanStack Query for client-side data caching (instant tab switches)
- `@dnd-kit` for drag-and-drop between day-sections/columns/backlog
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
`/job/archive` or `/personal/archive` to browse that workspace's completed
weeks by date range. Rollover runs independently per workspace — a task never
crosses from Job into Personal or vice versa.

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
- `prisma/schema.prisma` — Defines the `Task` table (id, title, description, status, priority, labels, workspace, day, weekStart, createdAt, updatedAt). Also has the `TaskStatus`, `TaskPriority`, and `Workspace` enums.
- `prisma/migrations/` — Schema change history. Every `prisma migrate` creates a new folder here so we can roll back if needed.
- `src/lib/prisma.ts` — Singleton Prisma client. Instantiated once with the PrismaPg adapter and reused across all routes to avoid connection leaks.

**Business Logic:**
- `src/lib/week.ts` — Pure date utilities (no DB calls). Converts between JS `Date` objects and `YYYY-MM-DD` strings, finds Monday of a week, etc. Shared by API and frontend so they never disagree on "today."
- `src/lib/workspace.ts` — Maps the `job`/`personal` URL slugs to the `Workspace` enum (`JOB`/`PERSONAL`) and back. The one place that knows about the slug format.
- `src/lib/rollover.ts` — The lazy week-rollover: when the board loads, this checks if a new week has started. If so, it moves any non-Done tasks from past weeks into today's section of the current week. Returns a count so the frontend can show a "X tasks rolled over" banner.
- `src/lib/task-input.ts` — Input validation (status/priority/workspace enums, labels array, `parseDayField` for the "yyyy-MM-dd" | `null` day shape). Normalizes labels: trims, dedupes case-insensitively, caps 8 per task. Used by both POST and PATCH to prevent garbage in the DB.
- `src/lib/serialize.ts` — Converts Prisma task objects (with `Date` fields) to JSON (with `YYYY-MM-DD` strings). One function, consistent across all endpoints.

**API Routes:**
- `src/app/api/tasks/route.ts`
  - `GET ?today=YYYY-MM-DD&workspace=JOB|PERSONAL` — Fetches current week + triggers rollover, scoped to one workspace. Also fetches that workspace's Backlog tasks (`day: null`) and merges them into the same array. Returns `{ weekStart, rolledOver, tasks }`.
  - `POST` — Creates a task. `day` is either a "yyyy-MM-dd" string or `null` (Backlog). Backlog is only valid when `status` is `TODO`; validated server-side. Returns the created task.
- `src/app/api/tasks/[id]/route.ts`
  - `PATCH` — Updates a task. Validates each field independently (you can update just the priority without touching the title). Fetches the current row first so it can enforce the same Backlog-is-To-Do-only invariant even when only one of `day`/`status` is in the patch. Returns updated task.
  - `DELETE` — Deletes a task. Returns 204 No Content.
- `src/app/api/weeks/route.ts`
  - `GET ?today=YYYY-MM-DD&workspace=JOB|PERSONAL` — Lists all past weeks for that workspace (for the archive). Returns `{ weeks: [{ weekStart, total, done }, ...] }` sorted newest first.
- `src/app/api/weeks/[weekStart]/route.ts`
  - `GET ?workspace=JOB|PERSONAL` — Fetches a specific archived week's tasks for that workspace (read-only board view). Returns `{ weekStart, tasks }`.

### Frontend Integration

- `src/app/providers.tsx` — Wraps the app in a `QueryClientProvider`. One `QueryClient` per browser session, created lazily in `useState` so it lives above the page tree and survives page-level remounts.
- `src/lib/queries.ts` — Query-key builders (`taskQueryKeys.currentWeek(workspace)`, etc.) so fetches, prefetches, and cache writes all agree on the same key shape.
- `src/lib/api.ts` — HTTP client. Wraps `fetch()` calls for all routes, threading `workspace` through every call that needs it. Makes sure errors are parsed and typed.
- `src/app/[workspace]/page.tsx` — Resolves the `job`/`personal` URL segment to a `Workspace` and renders `<Board workspace={...} key={workspace} />`. The `key` still forces a clean remount when you switch tabs, but it's now cheap: TanStack Query's cache lives outside the component and survives the remount, so a workspace you've already visited renders from cache instantly instead of re-fetching.
- `src/components/Board.tsx` — Main board. Uses `useQuery` (keyed by workspace) instead of manual `fetch`-in-`useEffect`, so tab switches are cache-first. Mutations (`create`/`update`/`delete`/drag) write straight into the query cache via `queryClient.setQueryData` for optimistic updates, with the drag path rolling back on failure. Hovering a tab link prefetches that workspace's data ahead of the click. Also renders the Backlog section, the rollover banner, and the theme toggle.
- `src/components/TaskModal.tsx` — Create/edit form. Collects title, description, status, priority, labels, day (or a "Backlog" checkbox in place of a day, shown only when status is To Do). Calls `createTask()` (with the board's `workspace` baked in) or `updateTask()`.
- `src/app/[workspace]/archive/page.tsx` — Lists past weeks for that workspace via `fetchWeeks()` (also on `useQuery`).
- `src/app/[workspace]/archive/[weekStart]/page.tsx` — Displays a past week's board for that workspace (server-rendered, read-only).

### Data Model

```typescript
Task {
  id: string (cuid)
  title: string
  description: string | null
  status: "TODO" | "IN_PROGRESS" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH"
  labels: string[] (up to 8, each ≤24 chars)
  workspace: "JOB" | "PERSONAL"
  day: Date | null (calendar date; null = Backlog; stored as @db.Date)
  weekStart: Date | null (Monday of the week; null in lockstep with day)
  createdAt: DateTime
  updatedAt: DateTime
}
```

The `day` and `weekStart` fields are kept in sync server-side (whenever you create or move a task, if you change `day`, `weekStart` is recalculated). This lets the archive and rollover logic just query by `weekStart` without recalculating it every time.

`day`/`weekStart` are nullable together — that's how a task ends up in the Backlog. A `null` `weekStart` never matches `weekStart: { lt: currentWeekStart }` in Postgres, so Backlog tasks are automatically excluded from rollover and from the past-week archive; they just persist until someone (or a drag) gives them a real day. The one invariant the API enforces on both `POST` and `PATCH`: a task can only have `day: null` while its `status` is `TODO` — trying to set it to In Progress or Done without a day (or the other way around) is a 400.

`workspace` is what makes Job and Personal separate boards — it's just another column on the same `Task` table. Every query (current week, archive list, archived week) filters on it, so a `GET /api/tasks` always takes `?workspace=JOB|PERSONAL` alongside `?today=`. The frontend routes (`/job`, `/personal`) map to it via `src/lib/workspace.ts` (`parseWorkspaceSlug`), and `<Board workspace="JOB" />` is what threads it through the UI. There's no cross-workspace query anywhere — rollover, archiving, and the board fetch all scope to one workspace at a time.

### Why No Auth?

This is a single-user personal tool. If you ever want to share it or deploy it publicly, adding auth is straightforward: just add a session check at the top of each API route (e.g., via a `auth.ts` middleware that reads a cookie). For now, treat the URL as the secret.

## Project structure

- `prisma/schema.prisma` — the `Task` model (title, description, status, priority, labels, workspace, day, weekStart)
- `src/lib/week.ts` — UTC-safe calendar-date math shared by client and server
- `src/lib/workspace.ts` — maps URL slugs (`job`/`personal`) to the `Workspace` enum
- `src/lib/rollover.ts` — the lazy week-rollover logic described above
- `src/app/api/tasks`, `src/app/api/weeks` — REST-ish route handlers, all scoped by `workspace`
- `src/app/[workspace]/page.tsx` — the interactive current-week board (`/job` or `/personal`)
- `src/components/Board.tsx` — the board UI, including the Job/Personal tab switcher
- `src/app/[workspace]/archive/**` — read-only history of past weeks, per workspace

## Deploying

Push to a Git repo and import it on [Vercel](https://vercel.com/new), setting
`DATABASE_URL` as an environment variable there too. No other config needed.
