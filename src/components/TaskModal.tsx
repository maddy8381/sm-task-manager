"use client";

import { useEffect, useState } from "react";
import { PRIORITY_OPTIONS, STATUS_COLUMNS, type TaskPriorityValue, type TaskStatusValue } from "@/types";

export type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  labels: string[];
  day: string | null; // null = Backlog (To Do only)
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-blue-950";
const labelClass = "mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400";

export function TaskModal({
  mode,
  dayOptions,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: {
  mode: "create" | "edit";
  dayOptions: { value: string; label: string }[];
  initial: TaskFormValues;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [values, setValues] = useState<TaskFormValues>(initial);
  const [labelDraft, setLabelDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function commitLabel() {
    const trimmed = labelDraft.trim().slice(0, 24);
    if (!trimmed) return;
    setValues((v) =>
      v.labels.some((l) => l.toLowerCase() === trimmed.toLowerCase()) || v.labels.length >= 8
        ? v
        : { ...v, labels: [...v.labels, trimmed] }
    );
    setLabelDraft("");
  }

  function removeLabel(label: string) {
    setValues((v) => ({ ...v, labels: v.labels.filter((l) => l !== label) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Title is required");
      return;
    }
    if (values.day === null && values.status !== "TODO") {
      setError("Backlog tasks must stay in To Do — pick a day or switch the status");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Fold in any label still sitting in the draft input so it isn't lost.
      const pending = labelDraft.trim().slice(0, 24);
      const labels =
        pending && !values.labels.some((l) => l.toLowerCase() === pending.toLowerCase())
          ? [...values.labels, pending]
          : values.labels;
      await onSubmit({ ...values, labels });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm("Delete this task?")) return;
    setSubmitting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {mode === "create" ? "New task" : "Edit task"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className={labelClass}>Title</label>
            <input
              autoFocus
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              className={inputClass}
              placeholder="Task title"
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Optional details"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Status</label>
              <select
                value={values.status}
                onChange={(e) => {
                  const status = e.target.value as TaskStatusValue;
                  setValues((v) => ({
                    ...v,
                    status,
                    // Backlog only exists in To Do — leaving it needs a real day.
                    day: status !== "TODO" && v.day === null ? (dayOptions[0]?.value ?? "") : v.day,
                  }));
                }}
                className={inputClass}
              >
                {STATUS_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Priority</label>
              <select
                value={values.priority}
                onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value as TaskPriorityValue }))}
                className={inputClass}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Day</label>
            {values.status === "TODO" ? (
              <label className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={values.day === null}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      day: e.target.checked ? null : (dayOptions[0]?.value ?? ""),
                    }))
                  }
                />
                Backlog (no specific day)
              </label>
            ) : null}
            {values.day === null ? (
              <p className="rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-400 dark:border-zinc-700">
                Sits in the Backlog until you drag it onto a day.
              </p>
            ) : (
              <select
                value={values.day}
                onChange={(e) => setValues((v) => ({ ...v, day: e.target.value }))}
                className={inputClass}
              >
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className={labelClass}>Labels</label>
            {values.labels.length > 0 ? (
              <div className="mb-1.5 flex flex-wrap gap-1">
                {values.labels.map((label) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => removeLabel(label)}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100"
                      aria-label={`Remove ${label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitLabel();
                }
              }}
              onBlur={commitLabel}
              className={inputClass}
              placeholder="Type a label and press Enter"
            />
          </div>

          {error ? <p className="text-xs text-red-500">{error}</p> : null}

          <div className="mt-1 flex items-center justify-between">
            {mode === "edit" && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {mode === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
