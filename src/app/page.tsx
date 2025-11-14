"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StageTracker } from "@/components/stage-tracker";
import { IdeaModule } from "@/components/idea-module";
import { ScriptModule } from "@/components/script-module";
import { BrollModule } from "@/components/broll-module";
import { VideoModule } from "@/components/video-module";
import type {
  Idea,
  PromptRow,
  ScriptVersion,
  StageProgressState,
  VideoClip,
} from "@/types";
import { formatTimestamp } from "@/lib/analysis";

function extractScriptLines(script: string): string[] {
  return script
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^\[.+\]$/.test(line))
    .filter((line) => !line.startsWith("//"));
}

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaLoading, setIdeaLoading] = useState<boolean>(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);

  const [script, setScript] = useState<string>("");
  const [model, setModel] = useState<string>("qwen2.5-14b-instruct");
  const [history, setHistory] = useState<ScriptVersion[]>([]);

  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [clips, setClips] = useState<VideoClip[]>([]);

  useEffect(() => {
    setClips((prev) =>
      prev
        .filter((clip) => prompts.some((row) => row.id === clip.id))
        .map((clip) => {
          const target = prompts.find((row) => row.id === clip.id);
          if (!target) return clip;
          return {
            ...clip,
            line: target.line,
            prompt: target.prompt,
          };
        }),
    );
  }, [prompts]);

  const approvedIdeas = useMemo(
    () => ideas.filter((idea) => idea.approved),
    [ideas],
  );

  const scriptLines = useMemo(() => extractScriptLines(script), [script]);

  const loadIdeas = useCallback(async () => {
    setIdeaLoading(true);
    setIdeaError(null);
    try {
      const response = await fetch("/api/trending");
      if (!response.ok) {
        throw new Error("Failed to load trending ideas");
      }
      const data = (await response.json()) as { ideas: Idea[] };
      setIdeas((prev) => {
        const approvals = new Map(prev.map((idea) => [idea.id, idea.approved]));
        return data.ideas.map((idea) => ({
          ...idea,
          approved: approvals.get(idea.id) ?? false,
        }));
      });
    } catch (error) {
      console.error(error);
      setIdeaError(
        "Unable to retrieve trending data. Using cached approvals if available.",
      );
    } finally {
      setIdeaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  const handleToggleIdea = useCallback((id: string, approved: boolean) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === id
          ? {
              ...idea,
              approved,
            }
          : idea,
      ),
    );
  }, []);

  const handleScriptChange = useCallback((value: string) => {
    setScript(value);
  }, []);

  const handleGenerateScript = useCallback(
    async ({
      model: modelId,
      tone,
      audience,
      callToAction,
    }: {
      model: string;
      tone: string;
      audience: string;
      callToAction: string;
    }) => {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          ideas: approvedIdeas,
          tone,
          audience,
          callToAction,
        }),
      });

      if (!response.ok) {
        console.error("Script generation failed", await response.text());
        return;
      }

      const data = (await response.json()) as { script: string };
      setScript(data.script);
    },
    [approvedIdeas],
  );

  const handleSaveVersion = useCallback(
    (label: string) => {
      setHistory((prev) => [
        {
          id:
            typeof crypto !== "undefined"
              ? crypto.randomUUID()
              : `${Date.now()}`,
          label,
          author: "You",
          timestamp: formatTimestamp(new Date()),
          content: script,
        },
        ...prev,
      ]);
    },
    [script],
  );

  const handleRestoreVersion = useCallback((id: string) => {
    const version = history.find((entry) => entry.id === id);
    if (!version) return;
    setScript(version.content);
  }, [history]);

  const handleDeleteVersion = useCallback((id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const handleGeneratePrompts = useCallback(async () => {
    if (!scriptLines.length) return;
    setIsGeneratingPrompts(true);
    try {
      const response = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lines: scriptLines,
        }),
      });

      if (!response.ok) {
        console.error("Prompt generation failed", await response.text());
        return;
      }

      const data = (await response.json()) as { prompts: string[] };
      setPrompts(
        data.prompts.map((prompt, index) => ({
          id: scriptLines[index] ? `${index}-${scriptLines[index].slice(0, 12)}` : `${index}`,
          line: scriptLines[index] ?? "",
          prompt,
        })),
      );
    } finally {
      setIsGeneratingPrompts(false);
    }
  }, [scriptLines]);

  const handlePromptChange = useCallback((id: string, prompt: string) => {
    setPrompts((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              prompt,
            }
          : row,
      ),
    );
  }, []);

  const handleBulkPrompts = useCallback(
    (bulk: string[]) => {
      const padded = scriptLines.map((line, index) => bulk[index] ?? `Visual coverage for: ${line}`);
      setPrompts(
        padded.map((prompt, index) => ({
          id: scriptLines[index] ? `${index}-${scriptLines[index].slice(0, 12)}` : `${index}`,
          line: scriptLines[index] ?? "",
          prompt,
        })),
      );
    },
    [scriptLines],
  );

  const updateClipState = useCallback(
    (id: string, updater: (clip: VideoClip | null) => VideoClip) => {
      setClips((prev) => {
        const existing = prev.find((clip) => clip.id === id) ?? null;
        const updated = updater(existing);
        const next = [...prev.filter((clip) => clip.id !== id), updated];
        const order = new Map(prompts.map((row, index) => [row.id, index]));
        return next.sort((a, b) => {
          const ai = order.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const bi = order.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return ai - bi;
        });
      });
    },
    [prompts],
  );

  const handleGenerateClip = useCallback(
    async (target: { id: string; line: string; prompt: string }) => {
      if (!target.id) {
        target.id =
          typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : `${Date.now()}`;
      }

      updateClipState(target.id, (clip) => ({
        id: target.id,
        line: target.line,
        prompt: target.prompt,
        videoUrl: clip?.videoUrl ?? "",
        thumbnailUrl: clip?.thumbnailUrl ?? "",
        status: "rendering",
        start: clip?.start ?? 0,
        end: clip?.end ?? clip?.duration ?? 8,
        duration: clip?.duration ?? 8,
      }));

      try {
        const response = await fetch("/api/generate-video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: target.prompt,
            line: target.line,
            apiKey,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as {
          clip: {
            videoUrl: string;
            thumbnailUrl: string;
            duration?: number;
            prompt: string;
            line: string;
          };
        };

        const duration = Math.max(data.clip.duration ?? 8, 4);

        updateClipState(target.id, () => ({
          id: target.id,
          line: data.clip.line,
          prompt: data.clip.prompt,
          videoUrl: data.clip.videoUrl,
          thumbnailUrl: data.clip.thumbnailUrl,
          status: "ready",
          start: 0,
          end: duration,
          duration,
        }));
      } catch (error) {
        console.error("Video generation error", error);
        updateClipState(target.id, (clip) => ({
          id: target.id,
          line: clip?.line ?? target.line,
          prompt: clip?.prompt ?? target.prompt,
          videoUrl: clip?.videoUrl ?? "",
          thumbnailUrl: clip?.thumbnailUrl ?? "",
          status: "error",
          start: clip?.start ?? 0,
          end: clip?.end ?? clip?.duration ?? 8,
          duration: clip?.duration ?? 8,
        }));
      }
    },
    [apiKey, updateClipState],
  );

  const handleGenerateAllClips = useCallback(async () => {
    for (const row of prompts) {
      await handleGenerateClip(row);
    }
  }, [handleGenerateClip, prompts]);

  const handleTrimClip = useCallback((id: string, start: number, end: number) => {
    setClips((prev) =>
      prev.map((clip) =>
        clip.id === id
          ? {
              ...clip,
              start: Math.max(0, Math.min(start, clip.duration - 1)),
              end: Math.max(Math.min(Math.max(start + 1, end), clip.duration), 1),
            }
          : clip,
      ),
    );
  }, []);

  const handleRegenerateClip = useCallback(
    async (id: string) => {
      const target = prompts.find((row) => row.id === id);
      if (!target) return;
      await handleGenerateClip(target);
    },
    [handleGenerateClip, prompts],
  );

  const progress: StageProgressState = useMemo(() => {
    const base: StageProgressState = {
      idea: "not_started",
      script: "not_started",
      broll: "not_started",
      video: "not_started",
    };

    if (ideaLoading) {
      base.idea = "in_progress";
    } else if (ideas.length) {
      base.idea = approvedIdeas.length ? "completed" : "in_progress";
    }

    if (approvedIdeas.length && script.trim().length) {
      base.script = history.length ? "completed" : "in_progress";
    } else if (approvedIdeas.length) {
      base.script = "in_progress";
    }

    if (scriptLines.length) {
      base.broll = prompts.length ? "completed" : "in_progress";
    }

    if (prompts.length) {
      base.video = clips.length
        ? clips.every((clip) => clip.status === "ready")
          ? "completed"
          : "in_progress"
        : "in_progress";
    }

    return base;
  }, [
    ideaLoading,
    ideas.length,
    approvedIdeas.length,
    script,
    history.length,
    scriptLines.length,
    prompts.length,
    clips,
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 p-6 md:p-10">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-slate-50">
            Agentic Video Creation Studio
          </h1>
          <a
            className="accent-button"
            href="https://agentic-32094d63.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Deployment
          </a>
        </div>
        <p className="max-w-3xl text-base text-slate-300">
          A multi-stage workflow that turns trending stories into finished video b-roll packages. Collaborate live, manage revisions, and keep every stage aligned.
        </p>
      </header>

      <StageTracker progress={progress} />

      <section className="grid w-full grid-cols-1 gap-8">
        <IdeaModule
          ideas={ideas}
          loading={ideaLoading}
          error={ideaError}
          onToggle={handleToggleIdea}
          onRefresh={loadIdeas}
        />

        <ScriptModule
          approvedIdeas={approvedIdeas}
          script={script}
          model={model}
          history={history}
          onScriptChange={handleScriptChange}
          onGenerate={handleGenerateScript}
          onSaveVersion={handleSaveVersion}
          onRestoreVersion={handleRestoreVersion}
          onDeleteVersion={handleDeleteVersion}
          onModelChange={setModel}
        />

        <BrollModule
          prompts={prompts}
          hasScript={scriptLines.length > 0}
          onGenerate={handleGeneratePrompts}
          onPromptChange={handlePromptChange}
          onBulkApply={handleBulkPrompts}
          isGenerating={isGeneratingPrompts}
        />

        <VideoModule
          clips={clips}
          prompts={prompts}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          onGenerateClip={handleGenerateClip}
          onGenerateAll={handleGenerateAllClips}
          onTrimClip={handleTrimClip}
          onRegenerateClip={handleRegenerateClip}
        />
      </section>
    </main>
  );
}
