"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchWeeks } from "@/lib/api";
import { formatWeekLabel, localTodayString, parseCalendarDateString } from "@/lib/week";
import { parseWorkspaceSlug } from "@/lib/workspace";
import { WORKSPACES, type WorkspaceValue } from "@/types";

type WeekSummary = { weekStart: string; total: number; done: number };

export default function ArchivePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: slug } = use(params);
  const workspace = parseWorkspaceSlug(slug);
  if (!workspace) notFound();

  return <ArchiveView key={workspace} slug={slug} workspace={workspace} />;
}

function ArchiveView({ slug, workspace }: { slug: string; workspace: WorkspaceValue }) {
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeeks(localTodayString(), workspace)
      .then((res) => setWeeks(res.weeks))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [workspace]);

  const workspaceLabel = WORKSPACES.find((ws) => ws.id === workspace)?.label ?? workspace;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{workspaceLabel} Archive</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href={`/${slug}`}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Back to board
          </Link>
        </div>
      </div>

      {loading ? <p className="text-sm text-zinc-400">Loading…</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {!loading && !error && weeks.length === 0 ? (
        <p className="text-sm text-zinc-400">No past weeks yet.</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {weeks.map((week) => (
          <li key={week.weekStart}>
            <Link
              href={`/${slug}/archive/${week.weekStart}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              <span className="text-zinc-800 dark:text-zinc-200">
                {formatWeekLabel(parseCalendarDateString(week.weekStart))}
              </span>
              <span className="text-xs text-zinc-400">
                {week.done}/{week.total} done
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
