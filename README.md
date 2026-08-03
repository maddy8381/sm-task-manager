# Task Board

A personal, Jira-style weekly kanban board. Three status columns (To Do / In
Progress / Done), each split into Mon–Sun day-sections with today pinned to
the top. When a week ends, unfinished tasks roll forward into the new week
automatically, and finished weeks become permanent, browsable archives under
`/archive`.

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

## Project structure

- `prisma/schema.prisma` — the `Task` model (title, description, status, day, weekStart)
- `src/lib/week.ts` — UTC-safe calendar-date math shared by client and server
- `src/lib/rollover.ts` — the lazy week-rollover logic described above
- `src/app/api/tasks`, `src/app/api/weeks` — REST-ish route handlers
- `src/components/Board.tsx` — the interactive current-week board
- `src/app/archive/**` — read-only history of past weeks

## Deploying

Push to a Git repo and import it on [Vercel](https://vercel.com/new), setting
`DATABASE_URL` as an environment variable there too. No other config needed.
