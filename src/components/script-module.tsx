"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Idea, ScriptVersion } from "@/types";

const namePrefixes = [
  "Producer",
  "Editor",
  "Director",
  "Writer",
  "Strategist",
  "Showrunner",
];

function randomName(): string {
  const prefix = namePrefixes[Math.floor(Math.random() * namePrefixes.length)];
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${prefix} #${suffix}`;
}

type Collaborator = {
  id: string;
  name: string;
  active: boolean;
  lastSeen: number;
};

export function ScriptModule({
  approvedIdeas,
  script,
  model,
  history,
  onScriptChange,
  onGenerate,
  onSaveVersion,
  onRestoreVersion,
  onDeleteVersion,
  onModelChange,
}: {
  approvedIdeas: Idea[];
  script: string;
  model: string;
  history: ScriptVersion[];
  onScriptChange: (value: string, source?: "remote" | "local") => void;
  onGenerate: (payload: {
    model: string;
    tone: string;
    audience: string;
    callToAction: string;
  }) => Promise<void>;
  onSaveVersion: (label: string) => void;
  onRestoreVersion: (id: string) => void;
  onDeleteVersion: (id: string) => void;
  onModelChange: (value: string) => void;
}) {
  const [tone, setTone] = useState("insightful and optimistic");
  const [audience, setAudience] = useState("Creators exploring AI video tools");
  const [callToAction, setCallToAction] = useState(
    "Subscribe for weekly AI production playbooks",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isSynced, setIsSynced] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const clientId = useMemo(
    () => (typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString()),
    [],
  );
  const selfName = useMemo(() => randomName(), []);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2600);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      setCollaborators([{ id: clientId, name: "You", active: true, lastSeen: Date.now() }]);
      return;
    }

    const channel = new BroadcastChannel("agentic-script-collab");
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as
        | { type: "update-script"; id: string; content: string }
        | { type: "join"; id: string; name: string }
        | { type: "leave"; id: string }
        | { type: "heartbeat"; id: string }
        | { type: "version"; id: string; label: string };

      if (!payload) return;

      switch (payload.type) {
        case "update-script":
          if (payload.id === clientId) return;
          setIsSynced(false);
          onScriptChange(payload.content, "remote");
          setTimeout(() => setIsSynced(true), 300);
          break;
        case "join":
          if (payload.id === clientId) return;
          setCollaborators((prev) => {
            const exists = prev.some((collab) => collab.id === payload.id);
            const next = exists
              ? prev.map((collab) =>
                  collab.id === payload.id
                    ? { ...collab, active: true, lastSeen: Date.now(), name: payload.name }
                    : collab,
                )
              : [
                  ...prev,
                  {
                    id: payload.id,
                    name: payload.name,
                    active: true,
                    lastSeen: Date.now(),
                  },
                ];
            return next;
          });
          channel.postMessage({ type: "heartbeat", id: clientId });
          break;
        case "leave":
          setCollaborators((prev) =>
            prev.map((collab) =>
              collab.id === payload.id
                ? {
                    ...collab,
                    active: false,
                    lastSeen: Date.now(),
                  }
                : collab,
            ),
          );
          break;
        case "heartbeat":
          if (payload.id === clientId) return;
          setCollaborators((prev) =>
            prev.map((collab) =>
              collab.id === payload.id
                ? { ...collab, active: true, lastSeen: Date.now() }
                : collab,
            ),
          );
          break;
        case "version":
          if (payload.id === clientId) return;
          showFeedback(`${payload.label} was saved by a collaborator.`);
          break;
      }
    };

    channel.addEventListener("message", handleMessage);

    channel.postMessage({ type: "join", id: clientId, name: selfName });

    const heartbeat = setInterval(() => {
      channel.postMessage({ type: "heartbeat", id: clientId });
    }, 5000);

    setCollaborators([{
      id: clientId,
      name: "You",
      active: true,
      lastSeen: Date.now(),
    }]);

    return () => {
      clearInterval(heartbeat);
      channel.postMessage({ type: "leave", id: clientId });
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [clientId, selfName, onScriptChange, showFeedback]);

  const broadcastScript = useCallback(
    (content: string) => {
      if (!channelRef.current) return;
      channelRef.current.postMessage({
        type: "update-script",
        id: clientId,
        content,
      });
    },
    [clientId],
  );

  const handleScriptChange = useCallback(
    (value: string) => {
      setIsSynced(false);
      onScriptChange(value, "local");
      broadcastScript(value);
      setTimeout(() => setIsSynced(true), 300);
    },
    [broadcastScript, onScriptChange],
  );

  const handleGenerate = useCallback(async () => {
    if (!approvedIdeas.length) {
      showFeedback("Approve at least one idea before generating a script.");
      return;
    }
    setIsGenerating(true);
    try {
      await onGenerate({ model, tone, audience, callToAction });
    } finally {
      setIsGenerating(false);
    }
  }, [approvedIdeas.length, onGenerate, model, tone, audience, callToAction, showFeedback]);

  const handleSaveVersion = useCallback(
    (label: string) => {
      if (!script.trim()) {
        showFeedback("Add script content before saving a version.");
        return;
      }
      onSaveVersion(label);
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: "version",
          id: clientId,
          label,
        });
      }
      showFeedback(`Saved version: ${label}`);
    },
    [clientId, onSaveVersion, script, showFeedback],
  );

  const collaboratorChips = useMemo(() => {
    return collaborators.map((collab) => (
      <span
        key={collab.id}
        className={`pill flex items-center gap-2 ${collab.active ? "border-sky-500/40 bg-sky-500/10 text-sky-200" : "border-slate-700/70 bg-slate-800/70 text-slate-400"}`}
      >
        <span className={`h-2 w-2 rounded-full ${collab.active ? "bg-emerald-400" : "bg-slate-600"}`} />
        {collab.name}
      </span>
    ));
  }, [collaborators]);

  return (
    <section className="card col-span-full">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Script Creation</h2>
            <p className="text-sm text-slate-400">
              Draft the narrative, manage revisions, and collaborate in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {collaboratorChips}
            <span
              className={`pill border ${
                isSynced
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-100"
              }`}
            >
              {isSynced ? "Synced" : "Syncing"}
            </span>
          </div>
        </header>

        {feedback ? (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
            {feedback}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-[1.5fr_minmax(220px,0.8fr)]">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">Working script</span>
              <textarea
                value={script}
                onChange={(event) => handleScriptChange(event.target.value)}
                className="min-h-[280px] rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-100 shadow-inner shadow-black/30 focus:border-sky-500 focus:outline-none"
                placeholder="Draft your narrative here or generate from approved ideas."
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="accent-button"
                onClick={() => handleSaveVersion(`Revision ${history.length + 1}`)}
              >
                Save revision
              </button>
              <button
                type="button"
                className="action-button"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating…" : "Generate with AI"}
              </button>
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Generation settings
            </h3>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              <span>Model ID</span>
              <input
                value={model}
                onChange={(event) => onModelChange(event.target.value)}
                placeholder="e.g. qwen2.5-72b"
                className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              <span>Tone</span>
              <input
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              <span>Audience</span>
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              <span>Call to action</span>
              <input
                value={callToAction}
                onChange={(event) => setCallToAction(event.target.value)}
                className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-400">
                Approved ideas powering the next draft:
              </p>
              <ul className="mt-2 space-y-2 text-xs text-slate-300">
                {approvedIdeas.length ? (
                  approvedIdeas.map((idea) => (
                    <li key={idea.id} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                      <span>{idea.title}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">
                    Approve ideas to inform the script.
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Revision history
            </h3>
            <p className="text-xs text-slate-400">
              Restore any saved pass to keep your timeline aligned.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {history.length ? (
                history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/70 bg-slate-900/60 px-3 py-2 text-xs text-slate-300"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-100">
                        {entry.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {entry.timestamp} · {entry.author}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="action-button px-3 py-1 text-xs"
                        onClick={() => onRestoreVersion(entry.id)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-500/40 px-2 py-1 text-[11px] text-rose-300 transition hover:border-rose-400 hover:text-rose-200"
                        onClick={() => onDeleteVersion(entry.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-500">
                  Versions will appear here once saved.
                </li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Collaboration notes
            </h3>
            <p className="text-xs text-slate-400">
              Live updates are broadcast to any open tabs. Invite teammates to collaborate simultaneously.
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <p>Model guidance ensures consistent tone across drafts.</p>
              <p>
                Auto-broadcast keeps revisions synced; presence indicators reveal who is active.
              </p>
              <p>
                Saving a revision instantly pushes version metadata to collaborators via the shared channel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
