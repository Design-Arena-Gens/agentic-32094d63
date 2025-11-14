"use client";

import { useMemo } from "react";
import type { Idea } from "@/types";

const sentimentPalette: Record<Idea["sentiment"], string> = {
  positive: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  neutral: "text-slate-300 bg-slate-600/20 border-slate-500/30",
  negative: "text-rose-300 bg-rose-500/10 border-rose-400/30",
};

const interestPalette: Record<Idea["interest"], string> = {
  High: "text-emerald-200 bg-emerald-800/40",
  Medium: "text-amber-200 bg-amber-800/30",
  Low: "text-slate-300 bg-slate-800/40",
};

export function IdeaModule({
  ideas,
  loading,
  error,
  onToggle,
  onRefresh,
}: {
  ideas: Idea[];
  loading: boolean;
  error: string | null;
  onToggle: (id: string, approved: boolean) => void;
  onRefresh: () => void;
}) {
  const approvedCount = useMemo(
    () => ideas.filter((idea) => idea.approved).length,
    [ideas],
  );

  return (
    <section className="card relative col-span-full overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-500/20 via-transparent to-transparent blur-3xl" />
      <div className="relative flex flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              Idea Generation
            </h2>
            <p className="text-sm text-slate-400">
              Pulls trending news leads with sentiment and audience appetite.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill bg-slate-800 text-slate-200">
              {approvedCount} approved
            </span>
            <button
              className="action-button"
              type="button"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading && !ideas.length ? (
            <div className="col-span-full flex items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-sm text-slate-400">
              Fetching trending stories…
            </div>
          ) : null}

          {ideas.map((idea) => (
            <article
              key={idea.id}
              className={`flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 transition hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-950/40 ${idea.approved ? "ring-1 ring-sky-500/60" : ""}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-slate-100">
                    {idea.title}
                  </h3>
                  <span
                    className={`pill border ${sentimentPalette[idea.sentiment]}`}
                  >
                    {idea.sentiment}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{idea.summary}</p>
              </div>
              <div className="flex flex-col gap-3 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <a
                    href={idea.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 transition hover:text-sky-200"
                  >
                    {idea.source}
                  </a>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${interestPalette[idea.interest]}`}
                  >
                    {idea.interest} interest
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Signal score</span>
                  <span className="font-medium text-slate-200">
                    {idea.score}
                  </span>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                  <span>{idea.approved ? "Approved" : "Rejected"}</span>
                  <button
                    type="button"
                    className={`relative h-6 w-11 rounded-full border transition ${idea.approved ? "border-sky-400/60 bg-sky-400/40" : "border-slate-700 bg-slate-800"}`}
                    onClick={() => onToggle(idea.id, !idea.approved)}
                    aria-pressed={idea.approved}
                  >
                    <span
                      className={`absolute top-1/2 block h-4 w-4 -translate-y-1/2 transform rounded-full bg-white transition ${idea.approved ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </label>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
