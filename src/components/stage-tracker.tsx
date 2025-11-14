"use client";

import { useMemo } from "react";
import type { StageProgressState, StageStatus } from "@/types";

const statusCopy: Record<StageStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const stageOrder: {
  key: keyof StageProgressState;
  label: string;
  description: string;
}[] = [
  {
    key: "idea",
    label: "Idea Generation",
    description: "Scrape and select trending story leads.",
  },
  {
    key: "script",
    label: "Script Creation",
    description: "Draft and refine multi-version scripts.",
  },
  {
    key: "broll",
    label: "B-Roll Prompting",
    description: "Generate descriptive b-roll prompts per line.",
  },
  {
    key: "video",
    label: "Video Generation",
    description: "Produce and polish timeline clips.",
  },
];

function statusColor(status: StageStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/90 border-emerald-300/70 text-emerald-50";
    case "in_progress":
      return "bg-sky-500/90 border-sky-300/70 text-sky-50";
    default:
      return "bg-slate-800 border-slate-700 text-slate-300";
  }
}

function statusDot(status: StageStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-400";
    case "in_progress":
      return "bg-sky-400 animate-pulse";
    default:
      return "bg-slate-600";
  }
}

export function StageTracker({
  progress,
}: {
  progress: StageProgressState;
}) {
  const completedCount = useMemo(
    () => Object.values(progress).filter((value) => value === "completed").length,
    [progress],
  );

  const overallPercent = Math.round((completedCount / stageOrder.length) * 100);

  return (
    <section className="card col-span-full">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              Production Pipeline
            </h2>
            <p className="text-sm text-slate-400">
              Track the status of each stage from ideation to final clips.
            </p>
          </div>
          <div className="flex min-w-[160px] flex-col items-end">
            <span className="text-sm font-medium text-slate-300">
              Overall completion
            </span>
            <span className="text-2xl font-semibold text-slate-50">
              {overallPercent}%
            </span>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {stageOrder.map(({ key, label, description }) => {
            const status = progress[key];
            return (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`h-2 w-2 rounded-full ${statusDot(status)}`}>
                    <span className="sr-only">{statusCopy[status]}</span>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusColor(
                      status,
                    )}`}
                  >
                    {statusCopy[status]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    {label}
                  </h3>
                  <p className="text-xs text-slate-400">{description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
