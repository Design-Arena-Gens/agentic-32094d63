"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PromptRow, VideoClip } from "@/types";

type ClipTarget = Pick<PromptRow, "id" | "line" | "prompt">;

export function VideoModule({
  clips,
  prompts,
  apiKey,
  onApiKeyChange,
  onGenerateClip,
  onGenerateAll,
  onTrimClip,
  onRegenerateClip,
}: {
  clips: VideoClip[];
  prompts: PromptRow[];
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onGenerateClip: (target: ClipTarget) => Promise<void>;
  onGenerateAll: () => Promise<void>;
  onTrimClip: (id: string, start: number, end: number) => void;
  onRegenerateClip: (id: string) => Promise<void>;
}) {
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const clipMap = useMemo(() => new Map(clips.map((clip) => [clip.id, clip])), [clips]);

  useEffect(() => {
    if (!clipMap.size) return;
    setStatusMessage(null);
  }, [clipMap]);

  const handlePlayToggle = useCallback(
    (clipId: string) => {
      const video = videoRefs.current[clipId];
      if (!video) return;

      if (activeClipId === clipId) {
        if (!video.paused) {
          video.pause();
        } else {
          void video.play();
        }
      } else {
        if (activeClipId && videoRefs.current[activeClipId]) {
          videoRefs.current[activeClipId]?.pause();
        }
        setActiveClipId(clipId);
        void video.play();
      }
    },
    [activeClipId],
  );

  const handleGenerateAll = useCallback(async () => {
    setIsGenerating(true);
    setStatusMessage("Generating clips for timeline…");
    try {
      await onGenerateAll();
      setStatusMessage("Timeline updated with fresh clips.");
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerateAll]);

  const handleGenerateSingle = useCallback(
    async (row: ClipTarget) => {
      setIsGenerating(true);
      setStatusMessage(`Generating clip for line: ${row.line.slice(0, 40)}…`);
      try {
        await onGenerateClip(row);
        setStatusMessage("Clip generated.");
      } finally {
        setIsGenerating(false);
      }
    },
    [onGenerateClip],
  );

  const handleRegenerate = useCallback(
    async (id: string) => {
      setIsGenerating(true);
      setStatusMessage("Requesting new clip variant…");
      try {
        await onRegenerateClip(id);
        setStatusMessage("Re-generated clip ready.");
      } finally {
        setIsGenerating(false);
      }
    },
    [onRegenerateClip],
  );

  return (
    <section className="card col-span-full">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Video Generation</h2>
            <p className="text-sm text-slate-400">
              Tie prompts to Qwen-powered b-roll clips and manage trims on the timeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="accent-button"
              onClick={handleGenerateAll}
              disabled={!prompts.length || isGenerating}
            >
              {isGenerating ? "Processing…" : "Generate timeline"}
            </button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(260px,0.6fr)_1fr]">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Qwen integration
            </h3>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              <span>API key</span>
              <input
                value={apiKey}
                onChange={(event) => onApiKeyChange(event.target.value)}
                className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                placeholder="Paste your qwen API key here"
              />
            </label>
            <p className="text-xs text-slate-400">
              Keys remain in your browser session. Provide a key to generate real Qwen clips; otherwise, preview footage is used for staging.
            </p>
            {statusMessage ? (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
                {statusMessage}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-200">Timeline</h3>
              <span className="pill border border-slate-700/60 bg-slate-800/60 text-slate-300">
                {clips.length} clips
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {clips.length ? (
                clips.map((clip) => (
                  <article
                    key={clip.id}
                    className="flex min-w-[280px] max-w-[320px] flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4"
                  >
                    <div className="relative h-40 overflow-hidden rounded-xl border border-slate-800/70">
                      <video
                        ref={(element) => {
                          videoRefs.current[clip.id] = element;
                        }}
                        src={clip.videoUrl}
                        poster={clip.thumbnailUrl}
                        className="h-full w-full object-cover"
                        controls={false}
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                      <div className="absolute left-3 top-3 rounded-full border border-slate-700/60 bg-slate-800/70 px-3 py-1 text-xs font-medium text-slate-200">
                        {clip.status === "rendering"
                          ? "Rendering"
                          : clip.status === "error"
                          ? "Error"
                          : "Ready"}
                      </div>
                      <button
                        type="button"
                        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/70 px-3 py-1 text-xs font-medium text-slate-100 shadow"
                        onClick={() => handlePlayToggle(clip.id)}
                      >
                        {activeClipId === clip.id && !videoRefs.current[clip.id]?.paused
                          ? "Pause"
                          : "Play"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 text-xs text-slate-300">
                      <p className="font-medium text-slate-100">{clip.line}</p>
                      <p className="text-slate-400">Prompt: {clip.prompt}</p>
                    </div>

                    <div className="flex flex-col gap-3 text-xs text-slate-300">
                      <label className="flex flex-col gap-1">
                        <span>Trim in ({clip.start.toFixed(1)}s)</span>
                        <input
                          type="range"
                          min={0}
                          max={clip.duration}
                          step={0.5}
                          value={clip.start}
                          onChange={(event) =>
                            onTrimClip(clip.id, Number(event.target.value), clip.end)
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span>Trim out ({clip.end.toFixed(1)}s)</span>
                        <input
                          type="range"
                          min={0}
                          max={clip.duration}
                          step={0.5}
                          value={clip.end}
                          onChange={(event) =>
                            onTrimClip(clip.id, clip.start, Number(event.target.value))
                          }
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="action-button flex-1"
                        onClick={() => handleRegenerate(clip.id)}
                        disabled={isGenerating}
                      >
                        Re-generate
                      </button>
                      <button
                        type="button"
                        className="action-button flex-1"
                        onClick={() => handleGenerateSingle({
                          id: clip.id,
                          line: clip.line,
                          prompt: clip.prompt,
                        })}
                        disabled={isGenerating}
                      >
                        Refresh
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="flex min-h-[220px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/40 text-sm text-slate-500">
                  Generate prompts and clips to populate the timeline.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 text-xs text-slate-400">
              <p>
                Timeline clips align to script lines. Trim ranges persist locally so you can export final cut durations.
              </p>
              <p className="mt-2">
                Regenerate to request a fresh Qwen variant leveraging the same prompt without disrupting the rest of the sequence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
