"use client";

import { useCallback, useMemo, useState } from "react";
import type { PromptRow } from "@/types";

export function BrollModule({
  prompts,
  hasScript,
  onGenerate,
  onPromptChange,
  onBulkApply,
  isGenerating,
}: {
  prompts: PromptRow[];
  hasScript: boolean;
  onGenerate: () => Promise<void>;
  onPromptChange: (id: string, prompt: string) => void;
  onBulkApply: (bulk: string[]) => void;
  isGenerating: boolean;
}) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkValue, setBulkValue] = useState("");

  const handleToggleBulk = useCallback(() => {
    setBulkMode((prev) => {
      const next = !prev;
      if (!next) setBulkValue("");
      if (next) {
        setBulkValue(prompts.map((row) => row.prompt).join("\n"));
      }
      return next;
    });
  }, [prompts]);

  const handleBulkSave = useCallback(() => {
    const rows = bulkValue
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
    onBulkApply(rows);
    setBulkMode(false);
  }, [bulkValue, onBulkApply]);

  const tableHeaders = useMemo(
    () => ["Script line", "Generated prompt", "Editable prompt"],
    [],
  );

  return (
    <section className="card col-span-full">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              B-Roll Prompting
            </h2>
            <p className="text-sm text-slate-400">
              Auto-generate vivid visual directions for every script line and refine in bulk.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="action-button"
              onClick={handleToggleBulk}
              disabled={!prompts.length}
            >
              {bulkMode ? "Close bulk editor" : "Bulk edit prompts"}
            </button>
            <button
              type="button"
              className="accent-button"
              onClick={onGenerate}
              disabled={!hasScript || isGenerating}
            >
              {isGenerating ? "Generating…" : "Generate from script"}
            </button>
          </div>
        </header>

        {!hasScript ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            Add script content to activate prompt generation.
          </div>
        ) : null}

        {bulkMode ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4">
            <label className="text-sm font-medium text-slate-200">
              Bulk prompt editor
            </label>
            <textarea
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
              className="min-h-[200px] rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              placeholder="Each line becomes a prompt row."
            />
            <button type="button" className="accent-button self-end" onClick={handleBulkSave}>
              Apply prompts
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-800/80">
          <div className="grid grid-cols-1 bg-slate-950/60 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid-cols-[1.2fr_1fr_1fr]">
            {tableHeaders.map((header) => (
              <div key={header} className="border-b border-slate-800/70 px-4 py-3">
                {header}
              </div>
            ))}
          </div>
          <div className="divide-y divide-slate-800/60">
            {prompts.length ? (
              prompts.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 bg-slate-900/40 text-sm text-slate-200 md:grid-cols-[1.2fr_1fr_1fr]"
                >
                  <div className="border-b border-slate-800/60 px-4 py-4 text-slate-200">
                    {row.line}
                  </div>
                  <div className="border-b border-slate-800/60 px-4 py-4 text-slate-400">
                    {row.prompt}
                  </div>
                  <div className="border-b border-slate-800/60 px-4 py-4">
                    <textarea
                      value={row.prompt}
                      onChange={(event) => onPromptChange(row.id, event.target.value)}
                      className="w-full rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                      rows={3}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-16 text-center text-sm text-slate-500">
                Generated prompts will appear here once available.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
